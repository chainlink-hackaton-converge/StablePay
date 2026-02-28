import {
  Runner,
  bytesToHex,
  consensusIdenticalAggregation,
  consensusMedianAggregation,
  cre,
  encodeCallMsg,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  json,
  ok,
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
  backendApiBaseUrl?: string;
  backendWebhookSecret?: string;
  backendPendingLimit: number;
};

const DEFAULT_CONFIG: WorkflowConfig = {
  schedule: "0 */10 * * * *",
  chainSelectorName: "arc-testnet",
  quoteCurrency: "COP",
  maxDeviationBps: 200,
  dryRun: true,
  backendApiBaseUrl: undefined,
  backendWebhookSecret: undefined,
  backendPendingLimit: 25,
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

type DecisionSyncResult = {
  enabled: boolean;
  attempted: number;
  posted: number;
  failed: number;
  payrollIds: string[];
  errors: string[];
  skippedReason?: string;
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
  decisionSync: DecisionSyncResult;
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

  const backendApiBaseUrl =
    typeof parsed.backendApiBaseUrl === "string"
      ? normalizeBaseUrl(parsed.backendApiBaseUrl)
      : DEFAULT_CONFIG.backendApiBaseUrl;

  const backendWebhookSecret =
    typeof parsed.backendWebhookSecret === "string"
      ? parsed.backendWebhookSecret.trim()
      : DEFAULT_CONFIG.backendWebhookSecret;

  const backendPendingLimit =
    typeof parsed.backendPendingLimit === "number" &&
    Number.isFinite(parsed.backendPendingLimit)
      ? Math.max(1, Math.min(200, Math.floor(parsed.backendPendingLimit)))
      : DEFAULT_CONFIG.backendPendingLimit;

  return {
    schedule,
    chainSelectorName,
    payrollVaultAddress,
    quoteCurrency,
    maxDeviationBps,
    dryRun,
    backendApiBaseUrl,
    backendWebhookSecret,
    backendPendingLimit,
  };
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function getOptionalSecret(runtime: Runtime<WorkflowConfig>, id: string): string | undefined {
  try {
    const result = runtime.getSecret({ id }).result();
    const value = result.value?.trim();
    return value && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
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

function resolveBackendTarget(runtime: Runtime<WorkflowConfig>, config: WorkflowConfig): {
  baseUrl?: string;
  webhookSecret?: string;
} {
  const baseUrl =
    config.backendApiBaseUrl ||
    getOptionalSecret(runtime, "STABLEPAY_BACKEND_API_BASE_URL");

  const webhookSecret =
    config.backendWebhookSecret ||
    getOptionalSecret(runtime, "STABLEPAY_CRE_WEBHOOK_SECRET");

  return {
    baseUrl: baseUrl ? normalizeBaseUrl(baseUrl) : undefined,
    webhookSecret,
  };
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

function listPendingBackendPayrollIds(
  runtime: Runtime<WorkflowConfig>,
  baseUrl: string,
  webhookSecret: string,
  limit: number
): string[] {
  const httpClient = new cre.capabilities.HTTPClient();
  const fetchPendingIds = httpClient.sendRequest(
    runtime,
    (
      sendRequester: HTTPSendRequester,
      requestUrl: string,
      requestSecret: string
    ) => {
      const response = sendRequester
        .sendRequest({
          url: requestUrl,
          method: "GET",
          headers: {
            accept: "application/json",
            "x-cre-webhook-secret": requestSecret,
          },
        })
        .result();

      if (!ok(response)) {
        throw new Error(
          `Failed to list backend pending payrolls: HTTP ${response.statusCode}`
        );
      }

      const payload = json(response) as { payroll_ids?: unknown };
      if (!Array.isArray(payload.payroll_ids)) {
        return [] as string[];
      }

      return payload.payroll_ids.filter((id): id is string => typeof id === "string");
    },
    consensusIdenticalAggregation<string[]>()
  );

  return fetchPendingIds(
    `${baseUrl}/api/payrolls/cre/pending?limit=${limit}`,
    webhookSecret
  ).result();
}

function postDecisionToBackend(
  runtime: Runtime<WorkflowConfig>,
  baseUrl: string,
  webhookSecret: string,
  payrollId: string,
  body: Record<string, unknown>
): void {
  const httpClient = new cre.capabilities.HTTPClient();
  const postDecision = httpClient.sendRequest(
    runtime,
    (
      sendRequester: HTTPSendRequester,
      requestUrl: string,
      requestSecret: string,
      requestBody: string
    ) => {
      const response = sendRequester
        .sendRequest({
          url: requestUrl,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-cre-webhook-secret": requestSecret,
          },
          body: Buffer.from(requestBody, "utf-8").toString("base64"),
        })
        .result();

      if (!ok(response)) {
        throw new Error(
          `Failed to write decision for payroll ${payrollId}: HTTP ${response.statusCode}`
        );
      }

      return true;
    },
    consensusIdenticalAggregation<boolean>()
  );

  postDecision(
    `${baseUrl}/api/payrolls/${payrollId}/decision`,
    webhookSecret,
    JSON.stringify(body)
  ).result();
}

function syncDecisionsToBackend(
  runtime: Runtime<WorkflowConfig>,
  config: WorkflowConfig,
  payload: {
    timestamp: string;
    vaultAddress: string;
    pendingPayrollCount: number;
    samplePendingPayrolls: PayrollSnapshot[];
    quoteCurrency: string;
    fxSources: SourceRate[];
    spreadBps: number;
    maxDeviationBps: number;
    isConsensusAccepted: boolean;
    consensusRate: number;
  }
): DecisionSyncResult {
  const backend = resolveBackendTarget(runtime, config);
  if (!backend.baseUrl || !backend.webhookSecret) {
    return {
      enabled: false,
      attempted: 0,
      posted: 0,
      failed: 0,
      payrollIds: [],
      errors: [],
      skippedReason:
        "Missing STABLEPAY_BACKEND_API_BASE_URL and/or STABLEPAY_CRE_WEBHOOK_SECRET",
    };
  }

  let payrollIds: string[] = [];
  try {
    payrollIds = listPendingBackendPayrollIds(
      runtime,
      backend.baseUrl,
      backend.webhookSecret,
      config.backendPendingLimit
    );
  } catch (error) {
    return {
      enabled: true,
      attempted: 0,
      posted: 0,
      failed: 0,
      payrollIds: [],
      errors: [error instanceof Error ? error.message : "Unknown backend list error"],
    };
  }

  let posted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const payrollId of payrollIds) {
    try {
      postDecisionToBackend(runtime, backend.baseUrl, backend.webhookSecret, payrollId, {
        decision: payload.isConsensusAccepted ? "accepted" : "blocked",
        reason: payload.isConsensusAccepted
          ? "Consensus spread within allowed threshold"
          : `Spread ${payload.spreadBps} bps exceeds ${payload.maxDeviationBps} bps threshold`,
        spread_bps: payload.spreadBps,
        max_deviation_bps: payload.maxDeviationBps,
        consensus_rate: payload.consensusRate,
        quote_currency: payload.quoteCurrency,
        source_rates: payload.fxSources,
        metadata: {
          triggered_at: payload.timestamp,
          chain_selector_name: config.chainSelectorName,
          vault_address: payload.vaultAddress,
          pending_onchain_count: payload.pendingPayrollCount,
          sample_onchain_payrolls: payload.samplePendingPayrolls,
        },
      });
      posted += 1;
    } catch (error) {
      failed += 1;
      errors.push(error instanceof Error ? error.message : `Unknown error for ${payrollId}`);
    }
  }

  return {
    enabled: true,
    attempted: payrollIds.length,
    posted,
    failed,
    payrollIds,
    errors,
  };
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

  const timestamp = runtime.now().toISOString();

  const decisionSync = syncDecisionsToBackend(runtime, config, {
    timestamp,
    vaultAddress,
    pendingPayrollCount: pendingPayrollIds.length,
    samplePendingPayrolls: samples,
    quoteCurrency: config.quoteCurrency,
    fxSources: sourceRates,
    spreadBps,
    maxDeviationBps: config.maxDeviationBps,
    isConsensusAccepted,
    consensusRate,
  });

  runtime.log(
    `StablePay CRE run | pending=${pendingPayrollIds.length} | ${config.quoteCurrency}/USD=${consensusRate.toFixed(
      6
    )} | spreadBps=${spreadBps} | decisionSync=${decisionSync.posted}/${decisionSync.attempted}`
  );

  return {
    timestamp,
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
    decisionSync,
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
