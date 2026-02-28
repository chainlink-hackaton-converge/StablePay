import { appEnv } from "./env";

// Contract ABIs - simplified versions for the frontend
// After compiling contracts, these can be imported from ../../contracts/artifacts

export const PAYROLL_VAULT_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    name: "createPayroll",
    outputs: [{ name: "payrollId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "employer", type: "address" }],
    name: "getVaultBalance",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
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

export const INVOICE_ESCROW_ABI = [
  {
    inputs: [
      { name: "payer", type: "address" },
      { name: "milestoneAmounts", type: "uint256[]" },
      { name: "milestoneDescriptions", type: "string[]" },
      { name: "description", type: "string" },
    ],
    name: "createInvoice",
    outputs: [{ name: "invoiceId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "invoiceId", type: "uint256" }],
    name: "fundInvoice",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "invoiceId", type: "uint256" },
      { name: "milestoneIndex", type: "uint256" },
    ],
    name: "approveMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "invoiceId", type: "uint256" },
      { name: "milestoneIndex", type: "uint256" },
    ],
    name: "releaseMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "invoiceId", type: "uint256" }],
    name: "getInvoice",
    outputs: [
      {
        components: [
          { name: "id", type: "uint256" },
          { name: "payer", type: "address" },
          { name: "payee", type: "address" },
          { name: "totalAmount", type: "uint256" },
          { name: "releasedAmount", type: "uint256" },
          { name: "description", type: "string" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "completedAt", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Contract addresses - loaded from env or hardcoded after deployment
export const CONTRACT_ADDRESSES = {
  payrollVault: appEnv.payrollVaultAddress,
  invoiceEscrow: appEnv.invoiceEscrowAddress,
} as const;
