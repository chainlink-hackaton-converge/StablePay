import { appEnv } from "./env";

const API_BASE = appEnv.apiBaseUrl;

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("stablepay_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

// Auth
export const api = {
  register: (walletAddress: string, role: string = "employer") =>
    fetchApi<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ wallet_address: walletAddress, role }),
    }),

  login: (walletAddress: string) =>
    fetchApi<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ wallet_address: walletAddress }),
    }),

  // Companies
  getCompanies: () => fetchApi<any[]>("/companies"),
  createCompany: (data: { name: string; vault_address?: string }) =>
    fetchApi<any>("/companies", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCompany: (id: string) => fetchApi<any>(`/companies/${id}`),
  updateCompany: (id: string, data: any) =>
    fetchApi<any>(`/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Employees
  getEmployees: () => fetchApi<any[]>("/employees"),
  createEmployee: (data: {
    wallet_address: string;
    name: string;
    salary_amount: number;
    salary_currency?: string;
  }) =>
    fetchApi<any>("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getEmployee: (id: string) => fetchApi<any>(`/employees/${id}`),
  updateEmployee: (id: string, data: any) =>
    fetchApi<any>(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteEmployee: (id: string) =>
    fetchApi<any>(`/employees/${id}`, { method: "DELETE" }),

  // Payrolls
  getPayrolls: () => fetchApi<any[]>("/payrolls"),
  createPayroll: (data: { scheduled_at: string; employee_ids: string[] }) =>
    fetchApi<any>("/payrolls", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getPayroll: (id: string) => fetchApi<any>(`/payrolls/${id}`),
  executePayroll: (id: string, data: any) =>
    fetchApi<any>(`/payrolls/${id}/execute`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getPayrollDecisions: (id: string) =>
    fetchApi<any[]>(`/payrolls/${id}/decisions`),

  // Invoices
  getInvoices: () => fetchApi<any[]>("/invoices"),
  createInvoice: (data: {
    payer_address: string;
    payee_address: string;
    total_amount_usdc: number;
    description?: string;
  }) =>
    fetchApi<any>("/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getInvoice: (id: string) => fetchApi<any>(`/invoices/${id}`),
  updateInvoice: (id: string, data: any) =>
    fetchApi<any>(`/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Payments
  getPayments: (params?: { employee_id?: string; payroll_id?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.employee_id) searchParams.set("employee_id", params.employee_id);
    if (params?.payroll_id) searchParams.set("payroll_id", params.payroll_id);
    const qs = searchParams.toString();
    return fetchApi<any[]>(`/payments${qs ? `?${qs}` : ""}`);
  },
};
