const FALLBACK_WALLETCONNECT_PROJECT_ID = "f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function readEnv(name: string, fallback: string): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }
  return value.trim();
}

export const appEnv = {
  apiBaseUrl: readEnv("VITE_API_BASE_URL", "http://localhost:3001/api"),
  walletConnectProjectId: readEnv(
    "VITE_WALLETCONNECT_PROJECT_ID",
    FALLBACK_WALLETCONNECT_PROJECT_ID
  ),
  payrollVaultAddress: readEnv("VITE_PAYROLL_VAULT_ADDRESS", ZERO_ADDRESS),
  invoiceEscrowAddress: readEnv("VITE_INVOICE_ESCROW_ADDRESS", ZERO_ADDRESS),
} as const;
