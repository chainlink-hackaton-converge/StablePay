import {
  Runner,
  bytesToHex,
  consensusMedianAggregation,
  cre,
  encodeCallMsg,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  ok,
  json,
  sendErrorResponse,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import {
  decodeFunctionResult,
  encodeFunctionData,
  isAddress,
  zeroAddress,
  type Address,
} from "viem";

const PAYROLL_VAULT_ABI = [
  {
    inputs: [],
    name: "getPendingPayrolls",
    outputs: [{ name: "ids", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "getPayrollDetails",
    outputs: [
      { name: "employer", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "totalAmount", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "createdAt", type: "uint256" },
      { name: "executedAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

type WorkflowConfig = {
  schedule: string;
  chainSelectorName: string;
  payrollVaultAddress?: string;
  quoteCurrency: string;
  maxDeviationBps: number;
  dryRun: boolean;
};

const DEFAULT_CONFIG: WorkflowConfig = {
  schedule: "0 */10 * * * *",
  chainSelectorName: "arc-testnet",
  quoteCurrency: "COP",
  maxDeviationBps: 200,
  dryRun: true,
};

const FX_SOURCES = [
  {
    name: "exchangerate-api",
    url: "https://api.exchangerate-api.com/v4/latest/USD",
  },
  {
    name: "open-er-api",
    url: "https://open.er-api.com/v6/latest/USD",
  },
] as const;

type PayrollSnapshot = {
  payrollId: string;
  employer: string;
  recipients: number;
  totalAmountBaseUnits: string;
  createdAt: string;
};

type SourceRate = {
  source: string;
  rate: number;
};

type CronExecutionResult = {
  timestamp: string;
  chainSelectorName: string;
  vaultAddress: string;
  pendingPayrollCount: number;
  samplePendingPayrolls: PayrollSnapshot[];
  quoteCurrency: string;
  fxSources: SourceRate[];
  spreadBps: number;
  maxDeviationBps: number;
  isConsensusAccepted: boolean;
  consensusRate: number;
  shouldExecutePayroll: boolean;
};

function parseConfig(raw: Uint8Array): WorkflowConfig {
  let parsed: Record<string, unknown> = {};
  const text = Buffer.from(raw).toString().trim();
  if (text.length > 0) {
    parsed = JSON.parse(text) as Record<string, unknown>;
  }

  const schedule =
    typeof parsed.schedule === "string" && parsed.schedule.trim().length > 0
      ? parsed.schedule.trim()
      : DEFAULT_CONFIG.schedule;

  const chainSelectorName =
    typeof parsed.chainSelectorName === "string" &&
    parsed.chainSelectorName.trim().length > 0
      ? parsed.chainSelectorName.trim()
      : DEFAULT_CONFIG.chainSelectorName;

  const payrollVaultAddress =
    typeof parsed.payrollVaultAddress === "string"
      ? parsed.payrollVaultAddress.trim()
      : undefined;

  const quoteCurrency =
    typeof parsed.quoteCurrency === "string" && parsed.quoteCurrency.length === 3
      ? parsed.quoteCurrency.toUpperCase()
      : DEFAULT_CONFIG.quoteCurrency;

  const maxDeviationBps =
    typeof parsed.maxDeviationBps === "number" &&
    Number.isFinite(parsed.maxDeviationBps) &&
    parsed.maxDeviationBps >= 0
      ? Math.floor(parsed.maxDeviationBps)
      : DEFAULT_CONFIG.maxDeviationBps;

  const dryRun =
    typeof parsed.dryRun === "boolean" ? parsed.dryRun : DEFAULT_CONFIG.dryRun;

  return {
    schedule,
    chainSelectorName,
    payrollVaultAddress,
    quoteCurrency,
    maxDeviationBps,
    dryRun,
  };
}

function resolveVaultAddress(
  runtime: Runtime<WorkflowConfig>,
  config: WorkflowConfig
): Address {
  const configuredAddress = config.payrollVaultAddress;
  if (configuredAddress && isAddress(configuredAddress)) {
    return configuredAddress;
  }

  const secret = runtime.getSecret({ id: "PAYROLL_VAULT_ADDRESS" }).result();
  if (!secret.value || !isAddress(secret.value)) {
    throw new Error(
      "PAYROLL_VAULT_ADDRESS is missing or invalid. Provide it in config or secrets."
    );
  }

  return secret.value as Address;
}

function readPendingPayrollIds(
  runtime: Runtime<WorkflowConfig>,
  config: WorkflowConfig,
  vaultAddress: Address
): readonly bigint[] {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  });
  if (!network) {
    throw new Error(`Unsupported chainSelectorName: ${config.chainSelectorName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  const pendingCallData = encodeFunctionData({
    abi: PAYROLL_VAULT_ABI,
    functionName: "getPendingPayrolls",
  });

  const pendingResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: vaultAddress,
        data: pendingCallData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  return decodeFunctionResult({
    abi: PAYROLL_VAULT_ABI,
    functionName: "getPendingPayrolls",
    data: bytesToHex(pendingResult.data),
  });
}

function readPayrollSnapshot(
  runtime: Runtime<WorkflowConfig>,
  config: WorkflowConfig,
  vaultAddress: Address,
  payrollId: bigint
): PayrollSnapshot {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  });
  if (!network) {
    throw new Error(`Unsupported chainSelectorName: ${config.chainSelectorName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);
  const detailsCallData = encodeFunctionData({
    abi: PAYROLL_VAULT_ABI,
    functionName: "getPayrollDetails",
    args: [payrollId],
  });

  const detailsResult = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: vaultAddress,
        data: detailsCallData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const details = decodeFunctionResult({
    abi: PAYROLL_VAULT_ABI,
    functionName: "getPayrollDetails",
    data: bytesToHex(detailsResult.data),
  });

  return {
    payrollId: payrollId.toString(),
    employer: details[0],
    recipients: details[1].length,
    totalAmountBaseUnits: details[3].toString(),
    createdAt: details[5].toString(),
  };
}

function fetchFxRate(
  runtime: Runtime<WorkflowConfig>,
  sourceUrl: string,
  quoteCurrency: string
): number {
  const httpClient = new cre.capabilities.HTTPClient();

  const fetchWithConsensus = httpClient.sendRequest(
    runtime,
    (
      sendRequester: HTTPSendRequester,
      requestUrl: string,
      requestQuote: string
    ) => {
      const response = sendRequester
        .sendRequest({
          url: requestUrl,
          method: "GET",
          headers: { accept: "application/json" },
        })
        .result();

      if (!ok(response)) {
        throw new Error(
          `HTTP request failed (${response.statusCode}) for ${requestUrl}`
        );
      }

      const payload = json(response) as Record<string, unknown>;
      const rates = payload.rates as Record<string, unknown> | undefined;
      const rate = rates?.[requestQuote];
      if (typeof rate !== "number" || !Number.isFinite(rate)) {
        throw new Error(`Rate ${requestQuote} not found in ${requestUrl}`);
      }

      return rate;
    },
    consensusMedianAggregation<number>()
  );

  return fetchWithConsensus(sourceUrl, quoteCurrency).result();
}

function deviationBps(values: number[]): number {
  if (values.length < 2) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mid = (max + min) / 2;
  if (mid === 0) return 0;
  return Math.round(((max - min) / mid) * 10_000);
}

function onCronTrigger(runtime: Runtime<WorkflowConfig>): CronExecutionResult {
  const config = runtime.config;
  const vaultAddress = resolveVaultAddress(runtime, config);
  const pendingPayrollIds = readPendingPayrollIds(runtime, config, vaultAddress);

  const samples = pendingPayrollIds
    .slice(0, 3)
    .map((id) => readPayrollSnapshot(runtime, config, vaultAddress, id));

  const sourceRates: SourceRate[] = FX_SOURCES.map((source) => ({
    source: source.name,
    rate: fetchFxRate(runtime, source.url, config.quoteCurrency),
  }));

  const rates = sourceRates.map((s) => s.rate);
  const spreadBps = deviationBps(rates);
  const isConsensusAccepted = spreadBps <= config.maxDeviationBps;
  const consensusRate = rates.reduce((sum, value) => sum + value, 0) / rates.length;

  runtime.log(
    `StablePay CRE run | pending=${pendingPayrollIds.length} | ${config.quoteCurrency}/USD=${consensusRate.toFixed(
      6
    )} | spreadBps=${spreadBps}`
  );

  return {
    timestamp: runtime.now().toISOString(),
    chainSelectorName: config.chainSelectorName,
    vaultAddress,
    pendingPayrollCount: pendingPayrollIds.length,
    samplePendingPayrolls: samples,
    quoteCurrency: config.quoteCurrency,
    fxSources: sourceRates,
    spreadBps,
    maxDeviationBps: config.maxDeviationBps,
    isConsensusAccepted,
    consensusRate,
    shouldExecutePayroll: !config.dryRun && isConsensusAccepted,
  };
}

function initWorkflow(config: WorkflowConfig) {
  const cron = new cre.capabilities.CronCapability();
  const trigger = cron.trigger({ schedule: config.schedule });

  return [cre.handler(trigger, onCronTrigger)];
}

export async function main() {
  const runner = await Runner.newRunner<WorkflowConfig>({
    configParser: parseConfig,
  });
  await runner.run(initWorkflow);
}

main().catch(sendErrorResponse);
