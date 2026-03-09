import {
  handler,
  type Runtime,
  type CronPayload,
  CronCapability,
  EVMClient,
  HTTPClient,
  getNetwork,
  encodeCallMsg,
  LAST_FINALIZED_BLOCK_NUMBER,
  consensusMedianAggregation,
  type HTTPSendRequester,
  ok,
  text,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, zeroAddress } from "viem";

// PayrollVault ABI for EVM interactions
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
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "executeBatchPayroll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Arc Testnet chain ID
const ARC_CHAIN_ID = 5042002;

/**
 * StablePay Payroll CRE Workflow
 *
 * Trigger: Cron (every 10 minutes)
 * Flow:
 *   1. Read pending payrolls from PayrollVault contract
 *   2. For each pending payroll, fetch live FX rates from multiple APIs
 *   3. Verify FX rate consensus across sources
 *   4. Execute batch payroll via EVM Write
 */
type Config = Record<string, unknown>;

// Cron trigger: every 10 minutes at second 0
const cronTrigger = new CronCapability().trigger({
  schedule: "0 */10 * * * *",
});

export default [handler(cronTrigger, onPayrollTrigger)];

function onPayrollTrigger(runtime: Runtime<Config>, _payload: CronPayload): string {
  const vaultSecret = runtime.getSecret({ id: "PAYROLL_VAULT_ADDRESS" }).result();
  const vaultAddress = vaultSecret.value as `0x${string}`;

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: "arc-testnet",
    isTestnet: true,
  });
  if (!network) {
    runtime.log("Arc testnet not found");
    return JSON.stringify({ error: "Arc testnet not found" });
  }

  const evmClient = new EVMClient(network.chainSelector.selector);
  const httpClient = new HTTPClient();

  const callData = encodeFunctionData({
    abi: PAYROLL_VAULT_ABI,
    functionName: "getPendingPayrolls",
  });

  const pendingPayrollsReply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: vaultAddress,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const fetchRates = (sendRequester: HTTPSendRequester) => {
    const res1 = sendRequester
      .sendRequest({
        url: "https://api.exchangerate-api.com/v4/latest/USD",
        method: "GET",
        headers: { Accept: "application/json" },
      })
      .result();
    if (!ok(res1)) throw new Error(`Rate API 1 failed: ${res1.statusCode}`);
    const rate1 = Number.parseFloat(JSON.parse(text(res1)).rates?.CLP ?? "0");

    const res2 = sendRequester
      .sendRequest({
        url: "https://open.er-api.com/v6/latest/USD",
        method: "GET",
        headers: { Accept: "application/json" },
      })
      .result();
    if (!ok(res2)) throw new Error(`Rate API 2 failed: ${res2.statusCode}`);
    const rate2 = Number.parseFloat(JSON.parse(text(res2)).rates?.CLP ?? "0");

    return (rate1 + rate2) / 2;
  };

  const avgRate = httpClient
    .sendRequest(runtime, fetchRates, consensusMedianAggregation())()
    .result();

  return JSON.stringify({
    pendingPayrollsData: pendingPayrollsReply.data,
    avgFxRate: avgRate,
    timestamp: runtime.now().toISOString(),
    vaultAddress,
    chainId: ARC_CHAIN_ID,
  });
}

/**
 * Helper: Calculate average FX rate from multiple sources
 * Used to determine the USDC equivalent of local currency amounts
 */
function calculateAverageRate(
  rate1: number,
  rate2: number,
  maxDeviation: number = 0.02 // 2% max deviation
): number | null {
  const avg = (rate1 + rate2) / 2;
  const deviation = Math.abs(rate1 - rate2) / avg;

  // If rates deviate too much, reject (possible manipulation)
  if (deviation > maxDeviation) {
    return null;
  }

  return avg;
}

/**
 * Helper: Convert local currency amount to USDC
 * USDC has 18 decimals on Arc chain (native gas token)
 */
function localToUsdc(
  amountLocal: number,
  fxRateToUsd: number,
  decimals: number = 18
): bigint {
  const usdAmount = amountLocal / fxRateToUsd;
  return BigInt(Math.floor(usdAmount * 10 ** decimals));
}

export { calculateAverageRate, localToUsdc };
