/**
 * StablePay — InvoiceEscrow interaction script
 * Arc Testnet (Chain ID 5042002). Uses viem, dotenv, and contract ABI from artifacts.
 *
 * CLI usage:
 *   node interactInvoiceEscrow.ts create <address> <amount>
 *   node interactInvoiceEscrow.ts fund <invoiceId>
 *   node interactInvoiceEscrow.ts release <invoiceId>
 *   node interactInvoiceEscrow.ts read <invoiceId>
 */

import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// --- Arc Testnet ---
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

const rpcUrl = process.env.ARC_RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const escrowAddress = process.env.INVOICE_ESCROW_ADDRESS;

if (!rpcUrl || !privateKey || !escrowAddress) {
  console.error("Missing required env: ARC_RPC_URL, PRIVATE_KEY, INVOICE_ESCROW_ADDRESS");
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

const artifactPath = path.join(
  __dirname,
  "artifacts/contracts/InvoiceEscrow.sol/InvoiceEscrow.json"
);

function loadInvoiceEscrowAbi(): readonly unknown[] {
  try {
    const raw = fs.readFileSync(artifactPath, "utf-8");
    const artifact = JSON.parse(raw) as { abi: unknown[] };
    if (!Array.isArray(artifact.abi)) throw new Error("Invalid ABI in artifact");
    return artifact.abi;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    throw new Error(`Failed to load InvoiceEscrow ABI from ${artifactPath}: ${err.message}`);
  }
}

const INVOICE_ESCROW_ABI = loadInvoiceEscrowAbi();

// --- Structured result types ---
export type InvoiceStruct = {
  id: bigint;
  payer: string;
  payee: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  description: string;
  status: number;
  createdAt: bigint;
  completedAt: bigint;
};

export type MilestoneStruct = {
  amount: bigint;
  description: string;
  status: number;
};

export type CreateInvoiceResult = {
  success: boolean;
  invoiceId: bigint;
  txHash: string;
  blockNumber: bigint;
  gasUsed: bigint;
};

export type FundEscrowResult = {
  success: boolean;
  txHash: string;
  blockNumber: bigint;
  gasUsed: bigint;
  invoiceId: bigint;
};

export type ReleaseMilestoneResult = {
  success: boolean;
  txHash: string;
  blockNumber: bigint;
  gasUsed: bigint;
  invoiceId: bigint;
  milestoneIndex: number;
};

export type GetInvoiceResult = {
  invoice: InvoiceStruct;
  milestones: MilestoneStruct[];
};

/**
 * Create an invoice: caller is payee, recipient is payer. Single milestone of `amount`.
 */
export async function createInvoice(
  recipient: `0x${string}`,
  amount: bigint
): Promise<CreateInvoiceResult> {
  try {
    const hash = await walletClient.writeContract({
      address: escrowAddress as `0x${string}`,
      abi: INVOICE_ESCROW_ABI,
      functionName: "createInvoice",
      args: [
        recipient,
        [amount],
        ["Milestone 1"],
        "Invoice",
      ],
      account,
    });

    if (!hash) throw new Error("No transaction hash returned");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    // Infer new invoice ID: we are payee, so our last invoice is the one just created
    const payeeInvoices = await publicClient.readContract({
      address: escrowAddress as `0x${string}`,
      abi: INVOICE_ESCROW_ABI,
      functionName: "getPayeeInvoices",
      args: [account.address],
    }) as bigint[];
    const invoiceId = payeeInvoices.length > 0 ? payeeInvoices[payeeInvoices.length - 1]! : 0n;

    console.log("Invoice created");
    console.log("  Transaction hash:", receipt.transactionHash);
    console.log("  Block number:", receipt.blockNumber);
    console.log("  Gas used:", receipt.gasUsed);
    console.log("  Payer:", recipient);
    console.log("  Amount:", amount.toString());
    if (invoiceId) console.log("  Invoice ID:", invoiceId.toString());

    return {
      success: receipt.status === "success",
      invoiceId,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("createInvoice error:", err.message);
    throw err;
  }
}

/**
 * Fund an invoice (payer deposits full amount into escrow). On Arc, value must equal invoice total.
 */
export async function fundEscrow(invoiceId: bigint): Promise<FundEscrowResult> {
  try {
    const invoice = await publicClient.readContract({
      address: escrowAddress as `0x${string}`,
      abi: INVOICE_ESCROW_ABI,
      functionName: "getInvoice",
      args: [invoiceId],
    }) as InvoiceStruct;

    if (invoice.id === 0n) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    if (invoice.status !== 0) {
      throw new Error(`Invoice not in Draft status (status=${invoice.status})`);
    }

    const amount = invoice.totalAmount;

    const hash = await walletClient.writeContract({
      address: escrowAddress as `0x${string}`,
      abi: INVOICE_ESCROW_ABI,
      functionName: "fundInvoice",
      args: [invoiceId],
      value: amount,
      account,
    });

    if (!hash) throw new Error("No transaction hash returned");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log("Escrow funded");
    console.log("  Transaction hash:", receipt.transactionHash);
    console.log("  Block number:", receipt.blockNumber);
    console.log("  Gas used:", receipt.gasUsed);
    console.log("  Invoice ID:", invoiceId.toString());
    console.log("  Amount:", amount.toString());

    return {
      success: receipt.status === "success",
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      invoiceId,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("fundEscrow error:", err.message);
    throw err;
  }
}

/**
 * Release an approved milestone. Payer or payee can call. Default milestoneIndex 0.
 */
export async function releaseMilestone(
  invoiceId: bigint,
  milestoneIndex: number = 0
): Promise<ReleaseMilestoneResult> {
  try {
    const hash = await walletClient.writeContract({
      address: escrowAddress as `0x${string}`,
      abi: INVOICE_ESCROW_ABI,
      functionName: "releaseMilestone",
      args: [invoiceId, BigInt(milestoneIndex)],
      account,
    });

    if (!hash) throw new Error("No transaction hash returned");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log("Milestone released");
    console.log("  Transaction hash:", receipt.transactionHash);
    console.log("  Block number:", receipt.blockNumber);
    console.log("  Gas used:", receipt.gasUsed);
    console.log("  Invoice ID:", invoiceId.toString());
    console.log("  Milestone index:", milestoneIndex);

    return {
      success: receipt.status === "success",
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      invoiceId,
      milestoneIndex,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("releaseMilestone error:", err.message);
    throw err;
  }
}

/**
 * Get invoice and milestones as structured JSON.
 */
export async function getInvoice(invoiceId: bigint): Promise<GetInvoiceResult> {
  try {
    const [invoice, milestones] = await Promise.all([
      publicClient.readContract({
        address: escrowAddress as `0x${string}`,
        abi: INVOICE_ESCROW_ABI,
        functionName: "getInvoice",
        args: [invoiceId],
      }) as Promise<InvoiceStruct>,
      publicClient.readContract({
        address: escrowAddress as `0x${string}`,
        abi: INVOICE_ESCROW_ABI,
        functionName: "getMilestones",
        args: [invoiceId],
      }) as Promise<MilestoneStruct[]>,
    ]);

    const result: GetInvoiceResult = { invoice, milestones };

    console.log("Invoice:", JSON.stringify(invoice, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
    console.log("Milestones:", JSON.stringify(milestones, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

    return result;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("getInvoice error:", err.message);
    throw err;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0]?.toLowerCase();

  if (!cmd) {
    console.log(`
Usage:
  node interactInvoiceEscrow.ts create <address> <amount>
  node interactInvoiceEscrow.ts fund <invoiceId>
  node interactInvoiceEscrow.ts release <invoiceId>
  node interactInvoiceEscrow.ts read <invoiceId>
`);
    process.exit(1);
  }

  try {
    if (cmd === "create") {
      const payer = args[1];
      const amountStr = args[2];
      if (!payer || !amountStr) {
        console.error("Usage: node interactInvoiceEscrow.ts create <address> <amount>");
        process.exit(1);
      }
      await createInvoice(payer as `0x${string}`, BigInt(amountStr));
    } else if (cmd === "fund") {
      const idStr = args[1];
      if (!idStr) {
        console.error("Usage: node interactInvoiceEscrow.ts fund <invoiceId>");
        process.exit(1);
      }
      await fundEscrow(BigInt(idStr));
    } else if (cmd === "release") {
      const idStr = args[1];
      const indexStr = args[2];
      if (!idStr) {
        console.error("Usage: node interactInvoiceEscrow.ts release <invoiceId> [milestoneIndex]");
        process.exit(1);
      }
      const milestoneIndex = indexStr !== undefined ? parseInt(indexStr, 10) : 0;
      await releaseMilestone(BigInt(idStr), milestoneIndex);
    } else if (cmd === "read") {
      const idStr = args[1];
      if (!idStr) {
        console.error("Usage: node interactInvoiceEscrow.ts read <invoiceId>");
        process.exit(1);
      }
      await getInvoice(BigInt(idStr));
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
