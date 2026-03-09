import {
  bytesToHex,
  consensusMedianAggregation,
  CronCapability,
  EVMClient,
  encodeCallMsg,
  handler,
  HTTPClient,
  LAST_FINALIZED_BLOCK_NUMBER,
  type CronPayload,
  type HTTPSendRequester,
  ok,
  text,
  type Runtime,
} from "@chainlink/cre-sdk";
import { decodeFunctionResult, encodeFunctionData, zeroAddress } from "viem";

const PAYROLL_VAULT_ABI = [
  {
    inputs: [],
    name: "getPendingPayrolls",
    outputs: [{ name: "ids", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ARC_CHAIN_ID = 5042002;
const ARC_CHAIN_SELECTOR = 5042002n;

export type WorkflowConfig = {
  schedule: string;
  vaultAddress: `0x${string}`;
  localCurrency: string;
};

export function initWorkflow(config: WorkflowConfig) {
  const cronTrigger = new CronCapability().trigger({
    schedule: config.schedule,
  });
  const handleTrigger = (
    runtime: Runtime<WorkflowConfig>,
    payload: CronPayload
  ) => onPayrollTrigger(runtime, payload, config);

  return [handler(cronTrigger, handleTrigger)];
}

function onPayrollTrigger(
  runtime: Runtime<WorkflowConfig>,
  _payload: CronPayload,
  config: WorkflowConfig
): string {
  const evmClient = new EVMClient(ARC_CHAIN_SELECTOR);
  const httpClient = new HTTPClient();
  const callData = encodeFunctionData({
    abi: PAYROLL_VAULT_ABI,
    functionName: "getPendingPayrolls",
  });

  const pendingPayrollsReply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: config.vaultAddress,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const pendingPayrollIds = decodeFunctionResult({
    abi: PAYROLL_VAULT_ABI,
    functionName: "getPendingPayrolls",
    data: bytesToHex(pendingPayrollsReply.data),
  }) as bigint[];

  const avgRate = httpClient
    .sendRequest(runtime, fetchRates, consensusMedianAggregation())(config.localCurrency)
    .result();

  runtime.log(
    `StablePay workflow simulated with ${pendingPayrollIds.length} pending payroll(s)`
  );

  return JSON.stringify({
    pendingPayrollCount: pendingPayrollIds.length,
    pendingPayrollIds: pendingPayrollIds.map((id) => id.toString()),
    avgFxRate: avgRate,
    localCurrency: config.localCurrency,
    timestamp: runtime.now().toISOString(),
    vaultAddress: config.vaultAddress,
    chainId: ARC_CHAIN_ID,
  });
}

function fetchRates(sendRequester: HTTPSendRequester, localCurrency: string): number {
  const responseA = sendRequester
    .sendRequest({
      url: "https://api.exchangerate-api.com/v4/latest/USD",
      method: "GET",
      headers: { Accept: "application/json" },
    })
    .result();
  if (!ok(responseA)) {
    throw new Error(`Rate API 1 failed: ${responseA.statusCode}`);
  }

  const responseB = sendRequester
    .sendRequest({
      url: "https://open.er-api.com/v6/latest/USD",
      method: "GET",
      headers: { Accept: "application/json" },
    })
    .result();
  if (!ok(responseB)) {
    throw new Error(`Rate API 2 failed: ${responseB.statusCode}`);
  }

  const rateA = Number.parseFloat(JSON.parse(text(responseA)).rates?.[localCurrency] ?? "0");
  const rateB = Number.parseFloat(JSON.parse(text(responseB)).rates?.[localCurrency] ?? "0");

  return (rateA + rateB) / 2;
}
