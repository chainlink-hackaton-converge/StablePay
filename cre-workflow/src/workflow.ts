import {
  handler,
  type Runtime,
  HTTPClient,
  EVMClient,
  CronTrigger,
} from "@chainlink/cre-sdk";

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
handler(
  CronTrigger.trigger({ schedule: "0 */10 * * * *" }), // every 10 minutes
  onPayrollTrigger
);

function onPayrollTrigger(runtime: Runtime): Record<string, unknown> {
  const httpClient = new HTTPClient(runtime);
  const evmClient = new EVMClient(runtime);

  // Get the PayrollVault contract address from secrets
  const vaultAddress = runtime.getSecret("PAYROLL_VAULT_ADDRESS");

  // Step 1: Read pending payrolls from the contract
  const pendingPayrollsCall = evmClient.read({
    address: vaultAddress as `0x${string}`,
    abi: PAYROLL_VAULT_ABI,
    functionName: "getPendingPayrolls",
    chainId: ARC_CHAIN_ID,
  });

  // Step 2: Fetch FX rates from multiple free APIs (consensus via DON)
  // Using two free FX rate APIs that don't require API keys
  const rateApi1 = httpClient.fetch(
    "https://api.exchangerate-api.com/v4/latest/USD",
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  const rateApi2 = httpClient.fetch(
    "https://open.er-api.com/v6/latest/USD",
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  // Await all results
  // Note: In a real execution, these would resolve via the CRE runtime
  // For now, we structure the workflow to demonstrate the pattern

  return {
    pendingPayrolls: pendingPayrollsCall,
    rateSource1: rateApi1,
    rateSource2: rateApi2,
    timestamp: runtime.now(),
    vaultAddress,
    chainId: ARC_CHAIN_ID,
  };
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
