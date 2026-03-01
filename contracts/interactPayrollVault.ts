/**
 * StablePay — PayrollVault interaction script
 * Arc Testnet (Chain ID 5042002). Uses viem, dotenv, and contract ABI from artifacts.
 *
 * Usage:
 *   npx ts-node interactPayrollVault.ts deposit <amount>
 *   npx ts-node interactPayrollVault.ts execute [payrollId]
 *   npx ts-node interactPayrollVault.ts summary
 */

import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env from project root (parent of contracts/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// --- Arc Testnet chain definition ---
const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
});

// --- Config and clients ---
const rpcUrl = process.env.ARC_RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const vaultAddress = process.env.PAYROLL_VAULT_ADDRESS;

if (!rpcUrl || !privateKey || !vaultAddress) {
  console.error("Missing required env: ARC_RPC_URL, PRIVATE_KEY, PAYROLL_VAULT_ADDRESS");
  process.exit(1);
}

const account = privateKeyToAccount(privateKey as `0x${string}`);

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  account,
  chain: arcTestnet,
  transport: http(rpcUrl),
});

// Load ABI from Hardhat artifact
const artifactPath = path.join(
  __dirname,
  "artifacts/contracts/PayrollVault.sol/PayrollVault.json"
);

function loadPayrollVaultAbi(): readonly unknown[] {
  try {
    const raw = fs.readFileSync(artifactPath, "utf-8");
    const artifact = JSON.parse(raw) as { abi: unknown[] };
    if (!Array.isArray(artifact.abi)) throw new Error("Invalid ABI in artifact");
    return artifact.abi;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    throw new Error(`Failed to load PayrollVault ABI from ${artifactPath}: ${err.message}`);
  }
}

const PAYROLL_VAULT_ABI = loadPayrollVaultAbi();

// --- Result types for structured returns ---
export type DepositResult = {
  success: boolean;
  txHash: string;
  blockNumber: bigint;
  gasUsed: bigint;
  amount: bigint;
};

export type ExecuteBatchResult = {
  success: boolean;
  txHash: string;
  blockNumber: bigint;
  gasUsed: bigint;
  payrollId: bigint;
};

export type PayrollSummary = {
  vaultBalance: bigint;
  pendingPayrollIds: readonly bigint[];
  payrollDetails: Array<{
    payrollId: bigint;
    employer: string;
    totalAmount: bigint;
    status: number;
    recipientCount: number;
  }>;
};

/**
 * Deposit USDC (native on Arc) into the vault.
 * On Arc, USDC is the native gas token; value is sent as msg.value.
 */
export async function depositUSDC(amount: bigint): Promise<DepositResult> {
  try {
    const hash = await walletClient.writeContract({
      address: vaultAddress as `0x${string}`,
      abi: PAYROLL_VAULT_ABI,
      functionName: "deposit",
      args: [amount],
      value: amount,
      account,
    });

    if (!hash) {
      throw new Error("No transaction hash returned");
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Deposit successful");
    console.log("  Transaction hash:", receipt.transactionHash);
    console.log("  Block number:", receipt.blockNumber);
    console.log("  Gas used:", receipt.gasUsed);
    console.log("  Amount deposited:", amount.toString());

    return {
      success: receipt.status === "success",
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      amount,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("depositUSDC error:", err.message);
    throw err;
  }
}

/**
 * Execute a batch payroll run by ID.
 * Requires the account to be the CRE forwarder or owner.
 */
export async function executeBatchPayroll(payrollId: bigint): Promise<ExecuteBatchResult> {
  try {
    const hash = await walletClient.writeContract({
      address: vaultAddress as `0x${string}`,
      abi: PAYROLL_VAULT_ABI,
      functionName: "executeBatchPayroll",
      args: [payrollId],
      account,
    });

    if (!hash) {
      throw new Error("No transaction hash returned");
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Execute batch payroll successful");
    console.log("  Transaction hash:", receipt.transactionHash);
    console.log("  Block number:", receipt.blockNumber);
    console.log("  Gas used:", receipt.gasUsed);
    console.log("  Payroll ID:", payrollId.toString());

    return {
      success: receipt.status === "success",
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      payrollId,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("executeBatchPayroll error:", err.message);
    throw err;
  }
}

/**
 * Read payroll summary: vault balance for the signer, pending payroll IDs, and their details.
 */
export async function readPayrollSummary(): Promise<PayrollSummary> {
  try {
    const [vaultBalance, pendingIds] = await Promise.all([
      publicClient.readContract({
        address: vaultAddress as `0x${string}`,
        abi: PAYROLL_VAULT_ABI,
        functionName: "getVaultBalance",
        args: [account.address],
      }),
      publicClient.readContract({
        address: vaultAddress as `0x${string}`,
        abi: PAYROLL_VAULT_ABI,
        functionName: "getPendingPayrolls",
      }),
    ]);

    const payrollDetails: PayrollSummary["payrollDetails"] = [];
    for (const id of pendingIds) {
      const details = await publicClient.readContract({
        address: vaultAddress as `0x${string}`,
        abi: PAYROLL_VAULT_ABI,
        functionName: "getPayrollDetails",
        args: [id],
      });
      const [employer, , , totalAmount, status] = details;
      const recipients = details[1] as unknown[];
      payrollDetails.push({
        payrollId: id,
        employer: employer as string,
        totalAmount: totalAmount as bigint,
        status: status as number,
        recipientCount: recipients?.length ?? 0,
      });
    }

    console.log("Payroll summary");
    console.log("  Vault balance (this account):", vaultBalance.toString());
    console.log("  Pending payroll IDs:", pendingIds.map(String).join(", ") || "none");
    payrollDetails.forEach((p) => {
      console.log(`  Payroll ${p.payrollId}: employer=${p.employer}, total=${p.totalAmount}, recipients=${p.recipientCount}, status=${p.status}`);
    });

    return {
      vaultBalance,
      pendingPayrollIds: pendingIds,
      payrollDetails,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("readPayrollSummary error:", err.message);
    throw err;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0]?.toLowerCase();

  if (!cmd) {
    console.log(`
Usage:
  node interactPayrollVault.ts deposit <amount>   # Deposit USDC (e.g. 1000000 for 1 USDC with 6 decimals, or 1e18 for 18)
  node interactPayrollVault.ts execute [id]      # Execute pending payroll (optional id; if omitted, first pending is used)
  node interactPayrollVault.ts summary            # Read vault balance and pending payrolls
`);
    process.exit(1);
  }

  try {
    if (cmd === "deposit") {
      const amountStr = args[1];
      if (!amountStr) {
        console.error("Missing amount. Example: node interactPayrollVault.ts deposit 1000000");
        process.exit(1);
      }
      const amount = BigInt(amountStr);
      await depositUSDC(amount);
    } else if (cmd === "execute") {
      let payrollId: bigint;
      if (args[1] !== undefined) {
        payrollId = BigInt(args[1]);
      } else {
        const summary = await readPayrollSummary();
        if (summary.pendingPayrollIds.length === 0) {
          console.error("No pending payrolls. Create one or pass payrollId: node interactPayrollVault.ts execute <payrollId>");
          process.exit(1);
        }
        payrollId = summary.pendingPayrollIds[0];
        console.log("No payrollId provided, using first pending:", payrollId.toString());
      }
      await executeBatchPayroll(payrollId);
    } else if (cmd === "summary") {
      await readPayrollSummary();
    } else {
      console.error("Unknown command:", cmd);
      process.exit(1);
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}

main();
