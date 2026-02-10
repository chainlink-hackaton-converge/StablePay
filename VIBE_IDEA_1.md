# StablePay — Cursor AI Session Prompt

> **Use this document as the initial prompt/context for a new Cursor AI session to build the StablePay MVP.**

---

## Project Overview

**Name:** StablePay
**Tagline:** "Pay anyone, anywhere, in stablecoins — privately and instantly"
**Hackathon:** Chainlink Convergence (Feb 6 – Mar 1, 2026)
**Category:** DeFi / Onchain Finance
**Deadline:** March 1, 2026 (submission), demo video required (< 5 min)

### What We're Building

A cross-border payroll and invoice settlement platform deployed on Arc chain that uses Chainlink CRE workflows to automate scheduled payments with real-time FX rate conversion. Arc's opt-in privacy keeps salary amounts confidential. The entire platform is USDC-denominated.

### Core User Flows

1. **Employer creates payroll:** Register a company, add employees with wallet addresses and salary amounts in local currency (EUR, MXN, GBP, etc.)
2. **Automated payroll execution:** CRE cron trigger fires on schedule → fetches live FX rates from multiple APIs with consensus verification → calculates USDC amounts → executes batch payment on Arc
3. **Invoice settlement:** Create B2B invoices with milestone-based escrow → counterparty approves → funds released from escrow
4. **Employee portal:** View payment history, download receipts, see FX rate used for each payment
5. **Privacy:** Salary/invoice amounts are shielded using Arc's opt-in privacy — only parties with view keys can see amounts

---

## Repository Strategy: Monorepo

**Use a monorepo.** All code lives in a single repository, opened as a single Cursor workspace.

### Why Monorepo (not multi-repo)
- **Cursor AI context** — With everything in one workspace, Cursor can see your Solidity ABIs when writing frontend code, your DB schema when building API routes, and your CRE workflow when debugging the smart contract integration. Split repos fragment the AI's context and make it far less effective.
- **Shared artifacts** — Hardhat compiles contract ABIs to `contracts/artifacts/`. Both the frontend (wagmi/viem) and the CRE workflow (viem) import them directly. No manual copying between repos.
- **Single Docker Compose** — One `docker-compose.yml` at the root spins up Postgres, runs migrations, and can build the backend. One command, everything up.
- **Hackathon submission** — Judges expect one repo link with one README. One repo = one story.
- **No overhead** — No submodules, no cross-repo version pinning, no multi-repo CI. You have 3 weeks; spend them building, not wiring repos together.

### Monorepo Structure
```
stablepay/
├── docker-compose.yml            # Postgres + dev services
├── .env.example                  # Shared env vars template
├── README.md                     # Project overview for judges
├── package.json                  # Root workspace (npm workspaces)
├── contracts/                    # Solidity smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── PayrollVault.sol
│   │   └── InvoiceEscrow.sol
│   ├── test/
│   ├── scripts/
│   ├── hardhat.config.ts
│   └── package.json
├── cre-workflow/                  # Chainlink CRE TypeScript workflow
│   ├── src/
│   │   └── workflow.ts
│   ├── cre.config.ts
│   ├── .secrets
│   └── package.json
├── frontend/                     # React Router v7 + shadcn/ui
│   ├── app/
│   │   ├── root.tsx
│   │   ├── routes.ts
│   │   ├── components/
│   │   │   └── ui/               # shadcn/ui components
│   │   └── lib/
│   │       └── contracts.ts      # Imports ABIs from ../contracts/artifacts
│   ├── react-router.config.ts
│   ├── components.json           # shadcn/ui config
│   └── package.json
├── backend/                      # Rust Axum API server
│   ├── src/
│   ├── migrations/
│   ├── Cargo.toml
│   └── .env
└── .cursor/
    └── rules/                    # Cursor rules for AI context
        └── project.mdc           # Project-wide conventions
```

### npm Workspaces (root `package.json`)
The root `package.json` links the TypeScript packages so they can share dependencies and contract artifacts:
```json
{
  "name": "stablepay",
  "private": true,
  "workspaces": [
    "contracts",
    "cre-workflow",
    "frontend"
  ],
  "scripts": {
    "contracts:compile": "npm run compile -w contracts",
    "contracts:deploy": "npm run deploy -w contracts",
    "cre:simulate": "cd cre-workflow && cre workflow simulate",
    "frontend:dev": "npm run dev -w frontend",
    "db:up": "docker compose up -d postgres",
    "db:down": "docker compose down"
  }
}
```

---

## Docker Compose (Local Development)

Create a `docker-compose.yml` at the project root for all infrastructure services:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: stablepay-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: stablepay
      POSTGRES_PASSWORD: stablepay_dev
      POSTGRES_DB: stablepay
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stablepay"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Optional: pgAdmin for DB inspection during development
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: stablepay-pgadmin
    restart: unless-stopped
    ports:
      - "5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@stablepay.dev
      PGADMIN_DEFAULT_PASSWORD: admin
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

### Docker Commands
```bash
# Start all services
docker compose up -d

# Start only Postgres
docker compose up -d postgres

# View logs
docker compose logs -f postgres

# Stop everything
docker compose down

# Stop and wipe database (fresh start)
docker compose down -v
```

### Environment Variables (`.env.example`)
```env
# Database
DATABASE_URL=postgres://stablepay:stablepay_dev@localhost:5432/stablepay

# Backend
JWT_SECRET=dev-secret-change-in-production
BACKEND_PORT=3001

# Arc Testnet
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_EXPLORER_URL=https://testnet.arcscan.app

# Contract Addresses (filled after deployment)
PAYROLL_VAULT_ADDRESS=
INVOICE_ESCROW_ADDRESS=

# CRE
CRE_FX_API_KEY=your-api-key-here
```

---

## MCP Servers (Cursor Configuration)

Configure these MCP servers in your Cursor settings for an enhanced development experience:

### shadcn/ui MCP Server
Gives Cursor direct access to the shadcn/ui component registry — it can look up components, their props, variants, and installation commands without you having to paste docs.

Add to your Cursor MCP settings (`.cursor/mcp.json` in the project root or global settings):
```json
{
  "mcpServers": {
    "shadcn-ui": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/shadcn-mcp@latest"]
    }
  }
}
```

**How to use it:** When you ask Cursor to build a UI component, it will automatically query the shadcn registry for the right component, its API, and install it properly. For example: "Create a data table for employees using shadcn" — Cursor will look up the DataTable component, its dependencies, and generate correct code.

### Docker MCP Server
Lets Cursor manage Docker containers directly — start/stop services, view logs, inspect container state.

```json
{
  "mcpServers": {
    "shadcn-ui": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/shadcn-mcp@latest"]
    },
    "docker": {
      "command": "docker",
      "args": ["run", "-i", "--rm",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "mcp/docker"
      ]
    }
  }
}
```

**How to use it:** Ask Cursor things like "start the database", "show me postgres logs", "is the database healthy?" and it can interact with Docker directly.

### Browser MCP (already available)
You already have `cursor-ide-browser` configured. Use it to test the frontend during development — Cursor can navigate to `localhost:5173`, take snapshots, click buttons, and verify the UI works.

---

## Tech Stack & Architecture

| Layer | Technology | Version |
|---|---|---|
| **Smart Contracts** | Solidity on Arc chain (EVM) | Solidity ^0.8.24 |
| **Contract Tooling** | Hardhat | Latest |
| **Oracle/Automation** | Chainlink CRE TypeScript SDK | v1.0.7+ |
| **CRE CLI** | `cre` CLI tool | v1.0.7+ |
| **Frontend** | React Router v7 + TypeScript | v7.13+ |
| **UI Components** | shadcn/ui + Tailwind CSS v4 | Latest |
| **Backend** | Rust + Axum + SQLx + PostgreSQL | Rust 2024 edition |
| **Database** | PostgreSQL 17 (Docker) | 17-alpine |
| **Chain** | Arc Testnet | Chain ID: 5042002 |
| **Wallet Integration** | viem + wagmi | Latest |

### Architecture Diagram

```
User (Browser)
    │
    ▼
┌─────────────────────────────────┐
│  Frontend (React Router v7)     │
│  - Employer Dashboard           │
│  - Employee Portal              │
│  - Invoice Management           │
│  - Wallet connect (wagmi)       │
└──────────┬──────────────────────┘
           │ REST API + WebSocket
           ▼
┌─────────────────────────────────┐
│  Backend (Rust Axum)            │
│  - Auth (JWT)                   │
│  - Company/Employee CRUD        │
│  - Payroll scheduling           │
│  - Invoice lifecycle            │
│  - Payment history indexing     │
│  - WebSocket hub for live data  │
│  - Chain event listener         │
│  ┌────────────────────────┐     │
│  │  PostgreSQL (SQLx)     │     │
│  │  - users, companies    │     │
│  │  - employees, invoices │     │
│  │  - payments, fx_rates  │     │
│  └────────────────────────┘     │
└──────────┬──────────────────────┘
           │ ethers / viem (read events)
           ▼
┌─────────────────────────────────┐
│  Arc Chain (Testnet)            │
│  RPC: rpc.testnet.arc.network   │
│  Chain ID: 5042002              │
│  Gas: USDC (~$0.01/tx)          │
│                                 │
│  ┌───────────────────────────┐  │
│  │ PayrollVault.sol          │  │
│  │ - deposit(amount)         │  │
│  │ - executeBatchPayment()   │  │
│  │ - withdraw()              │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ InvoiceEscrow.sol         │  │
│  │ - createInvoice()         │  │
│  │ - approveInvoice()        │  │
│  │ - releaseMilestone()      │  │
│  │ - disputeInvoice()        │  │
│  └───────────────────────────┘  │
└──────────┬──────────────────────┘
           │ CRE writes via Forwarder
           ▼
┌─────────────────────────────────┐
│  Chainlink CRE (DON)           │
│  TypeScript Workflow            │
│                                 │
│  Trigger: Cron (every 10 min)  │
│  Callback:                      │
│    1. HTTP fetch FX rates       │
│       (3+ APIs, consensus)      │
│    2. EVM Read: pending payrolls│
│    3. Calculate USDC amounts    │
│    4. EVM Write: batch payment  │
└─────────────────────────────────┘
```

---

## Smart Contracts (Solidity on Arc)

### `PayrollVault.sol`
- Employer deposits USDC into the vault
- `executeBatchPayroll(address[] recipients, uint256[] amounts)` — callable only by CRE forwarder
- `getVaultBalance(address employer)` — read function for CRE to check available funds
- `getPendingPayrolls()` — returns payrolls scheduled for execution (CRE reads this)
- Events: `PayrollExecuted(address indexed employer, uint256 totalAmount, uint256 timestamp)`
- Access control: only CRE forwarder contract can call execution functions

### `InvoiceEscrow.sol`
- `createInvoice(address payer, uint256 amount, uint256[] milestones)` — lock USDC
- `approveMilestone(uint256 invoiceId, uint256 milestoneIndex)` — release partial payment
- `disputeInvoice(uint256 invoiceId)` — flag for dispute resolution
- Events: `InvoiceCreated`, `MilestoneReleased`, `InvoiceDisputed`

### Best Practices for Solidity on Arc
- Arc is EVM-compatible, use standard Solidity patterns
- Gas token is USDC (18 decimals on Arc), not ETH — keep this in mind for gas estimation
- Use OpenZeppelin contracts for access control (`Ownable`, `AccessControl`), `ReentrancyGuard`
- Keep contracts simple — this is an MVP. Avoid over-engineering
- Write comprehensive events for every state change (the backend will index these)
- Use `error` custom errors instead of `require` strings for gas efficiency
- Test with Hardhat on a local fork of Arc testnet if possible, or deploy directly to Arc testnet
- Use the CRE Forwarder Directory to authorize CRE writes: https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory

---

## Chainlink CRE Workflow (TypeScript)

### CRE Setup
```bash
# Install CLI (macOS/Linux)
curl -sSfL https://raw.githubusercontent.com/smartcontractkit/cre-cli/main/install.sh | bash

# Create account first at https://cre.chain.link

# Login
cre auth login

# Initialize project
cre project init --template typescript

# Simulate locally
cre workflow simulate
```

### CRE TypeScript SDK Patterns & Best Practices

**Key SDK versions:** CLI v1.0.7+, TS SDK v1.0.7+

**Import style — use direct imports (recommended as of SDK v1.0.3+):**
```typescript
import {
  handler,
  Runtime,
  HTTPClient,
  EVMClient,
  CronTrigger,
} from "@chainlink/cre-sdk";
```

**Trigger-and-callback model:**
```typescript
// The atom of execution: handler(trigger, callback)
handler(
  CronTrigger.trigger({ schedule: "0 */10 * * * *" }), // every 10 minutes
  onPayrollTrigger
);

function onPayrollTrigger(runtime: Runtime): Record<string, unknown> {
  // 1. Create clients
  const httpClient = new HTTPClient(runtime);
  const evmClient = new EVMClient(runtime);

  // 2. Invoke capabilities (returns Promises)
  // 3. Await results
  // 4. Process and write back
  return {};
}
```

**Key CRE rules to follow:**
- Callbacks are **stateless** — no persistent state between executions
- Each trigger fire = fresh, independent execution
- Capability calls are async, return Promises — `.result()` to await
- Use `runtime.getSecret("key")` for API keys (never hardcode secrets)
- You can have up to 10 triggers per workflow
- Max 3 concurrent capability calls per workflow
- Max 5 HTTP requests per workflow execution
- Max 10 EVM read calls per execution
- HTTP response max size: 100 KB
- Execution timeout: 5 minutes
- Cron minimum interval: 30 seconds
- Use `runtime.now()` for current timestamp (not `Date.now()`)

**Fetching FX rates (HTTP capability with consensus):**
```typescript
// Multiple API calls — each independently verified by DON consensus
const rateApi1 = httpClient.fetch("https://api.exchangerate-api.com/v4/latest/USD", {
  method: "GET",
  headers: { "Accept": "application/json" },
});

const rateApi2 = httpClient.fetch("https://open.er-api.com/v6/latest/USD", {
  method: "GET",
  headers: { "Accept": "application/json" },
});

// Await results
const result1 = await rateApi1.result();
const result2 = await rateApi2.result();

// Process — average rates from multiple sources for extra reliability
const eurRate1 = result1.body.rates.EUR;
const eurRate2 = result2.body.rates.EUR;
const avgEurRate = (eurRate1 + eurRate2) / 2;
```

**EVM Read (check pending payrolls):**
```typescript
// Use viem ABI for type-safe reads
const pendingPayrolls = evmClient.read({
  address: PAYROLL_VAULT_ADDRESS,
  abi: payrollVaultAbi,
  functionName: "getPendingPayrolls",
  chainId: 5042002, // Arc testnet
});

const payrolls = await pendingPayrolls.result();
```

**EVM Write (execute payments):**
```typescript
// CRE writes go through the Forwarder contract
// Use the WriteReport pattern from the SDK
const writeResult = evmClient.write({
  address: PAYROLL_VAULT_ADDRESS,
  abi: payrollVaultAbi,
  functionName: "executeBatchPayroll",
  args: [recipientAddresses, usdcAmounts],
  chainId: 5042002,
});

await writeResult.result();
```

**Secrets management:**
```typescript
// For simulation: create a .secrets file
// For deployment: use `cre secrets set`
const apiKey = runtime.getSecret("FX_API_KEY");
```

**Simulation:**
```bash
# Run simulation (compiles to WASM, executes locally with real API calls)
cre workflow simulate

# Simulation makes REAL calls to APIs and blockchains
# Use testnet addresses and free API tiers during development
```

### CRE Workflow File Structure
```
cre-workflow/
├── src/
│   └── workflow.ts        # Main workflow file with handlers
├── cre.config.ts          # CRE configuration
├── package.json           # Dependencies (@chainlink/cre-sdk)
├── tsconfig.json          # TypeScript config
└── .secrets               # Local secrets (gitignored)
```

---

## Frontend (React Router v7 + TypeScript)

### Setup
```bash
npx create-react-router@latest frontend
cd frontend
npm install
```

### React Router v7 Best Practices

**Route configuration (`app/routes.ts`):**
```typescript
import { type RouteConfig, route, index, layout, prefix } from "@react-router/dev/routes";

export default [
  index("./home.tsx"),
  route("login", "./auth/login.tsx"),
  route("register", "./auth/register.tsx"),

  // Employer routes
  layout("./employer/layout.tsx", [
    ...prefix("employer", [
      index("./employer/dashboard.tsx"),
      route("employees", "./employer/employees.tsx"),
      route("employees/:id", "./employer/employee-detail.tsx"),
      route("payroll", "./employer/payroll.tsx"),
      route("payroll/new", "./employer/payroll-create.tsx"),
      route("payroll/:id", "./employer/payroll-detail.tsx"),
      route("invoices", "./employer/invoices.tsx"),
      route("invoices/new", "./employer/invoice-create.tsx"),
      route("settings", "./employer/settings.tsx"),
    ]),
  ]),

  // Employee routes
  layout("./employee/layout.tsx", [
    ...prefix("employee", [
      index("./employee/dashboard.tsx"),
      route("payments", "./employee/payments.tsx"),
      route("payments/:id", "./employee/payment-detail.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
```

**Route modules with loaders and actions:**
```typescript
// app/routes/employer/dashboard.tsx
import type { Route } from "./+types/dashboard";

// Server-side data loading
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (!session) throw redirect("/login");

  const [company, recentPayments, pendingPayrolls] = await Promise.all([
    api.getCompany(session.companyId),
    api.getRecentPayments(session.companyId),
    api.getPendingPayrolls(session.companyId),
  ]);

  return { company, recentPayments, pendingPayrolls };
}

// Form submissions
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "trigger-payroll") {
    await api.triggerPayroll(formData.get("payrollId"));
    return { success: true };
  }
}

// Component renders with type-safe loaderData
export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { company, recentPayments, pendingPayrolls } = loaderData;

  return (
    <div>
      <h1>{company.name} Dashboard</h1>
      {/* ... */}
    </div>
  );
}

// Error boundary
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <div>Something went wrong: {error.message}</div>;
}
```

**Key React Router v7 patterns to follow:**
- Use `loader` for data fetching (runs server-side or on navigation)
- Use `action` for mutations (form submissions)
- Use the generated `Route` type from `./+types/` for type safety
- Use `<Outlet />` in layout routes for nested rendering
- Use `redirect()` for navigation in loaders/actions
- Use `ErrorBoundary` exports for per-route error handling
- Use `useNavigation()` for pending UI states
- Use `useFetcher()` for non-navigation data mutations
- Use `useRevalidator()` to refresh data after WebSocket events

**Wallet integration (wagmi + viem):**
```bash
npm install wagmi viem @tanstack/react-query
```

```typescript
// Define Arc testnet chain
import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
});
```

### shadcn/ui Setup & Best Practices

**shadcn/ui** is the UI layer. It's not a dependency — it copies component source code into your project, giving you full control. Combined with Tailwind CSS v4, it's the fastest way to build a professional-looking UI during a hackathon.

**Setup (after creating the React Router project):**
```bash
cd frontend
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Zinc** (looks great for fintech dark theme)
- CSS variables: **Yes**

**Install the components you'll need upfront:**
```bash
# Core layout & navigation
npx shadcn@latest add sidebar button card badge separator

# Data display (payroll tables, payment history)
npx shadcn@latest add table data-table

# Forms (create payroll, add employee, invoices)
npx shadcn@latest add form input label select textarea dialog sheet

# Feedback & status
npx shadcn@latest add alert toast sonner skeleton

# Charts (FX rate history, payment analytics)
npx shadcn@latest add chart
```

**shadcn/ui best practices for this project:**
- Use the **shadcn MCP server** — when you ask Cursor to "build a data table for employees", it will query the component registry automatically and generate correct code with proper imports
- Use the `<Sidebar>` component for the employer/employee layouts — it gives you a professional app shell instantly
- Use `<DataTable>` (built on TanStack Table) for payroll lists and payment history — it handles sorting, filtering, pagination out of the box
- Use `<Card>` for dashboard metric cards (total paid, pending payrolls, vault balance)
- Use `<Badge>` for status indicators (payroll: pending/executing/completed/failed)
- Use `<Dialog>` for confirmations (trigger payroll, approve invoice)
- Use `<Sonner>` (toast) for real-time notifications (payment confirmed, new payment received)
- Use `<Chart>` (built on Recharts) for FX rate history charts
- **Dark mode by default** — it looks better in demo videos. Set `darkMode: "class"` in Tailwind config and add `dark` class to `<html>` in `root.tsx`
- Keep custom styling minimal — shadcn defaults look professional out of the box

**Key shadcn/ui components and where they map:**

| Component | Used In | Purpose |
|---|---|---|
| `Sidebar` | Employer layout, Employee layout | App shell navigation |
| `DataTable` | Employees list, Payroll list, Payment history | Sortable/filterable tables |
| `Card` | Dashboard | Metric cards (balance, pending, total paid) |
| `Badge` | Payroll status, Invoice status | Status indicators with color coding |
| `Dialog` | Trigger payroll, Approve invoice | Confirmation modals |
| `Form` + `Input` | Add employee, Create payroll, Create invoice | All form interactions |
| `Select` | Currency picker, Schedule frequency | Dropdown selections |
| `Chart` | FX rate dashboard | Historical rate line charts |
| `Sonner` | Global | Toast notifications for real-time events |
| `Skeleton` | All pages | Loading states |
| `Sheet` | Mobile nav, Quick actions | Slide-over panels |

### Frontend File Structure
```
frontend/
├── app/
│   ├── root.tsx                  # Root layout (html, body, providers, dark mode)
│   ├── routes.ts                 # Route configuration
│   ├── home.tsx                  # Landing page
│   ├── auth/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── employer/
│   │   ├── layout.tsx            # Employer layout with <Sidebar>
│   │   ├── dashboard.tsx         # Dashboard with <Card> metrics
│   │   ├── employees.tsx         # <DataTable> of employees
│   │   ├── employee-detail.tsx
│   │   ├── payroll.tsx           # <DataTable> of payroll runs
│   │   ├── payroll-create.tsx    # <Form> to create payroll
│   │   ├── payroll-detail.tsx    # Payroll details + entries
│   │   ├── invoices.tsx          # <DataTable> of invoices
│   │   ├── invoice-create.tsx    # <Form> to create invoice
│   │   └── settings.tsx          # Company settings
│   ├── employee/
│   │   ├── layout.tsx            # Employee layout with <Sidebar>
│   │   ├── dashboard.tsx         # Payment summary cards
│   │   ├── payments.tsx          # <DataTable> of received payments
│   │   └── payment-detail.tsx    # Payment receipt with FX audit trail
│   ├── components/
│   │   ├── ui/                   # shadcn/ui generated components (auto-managed)
│   │   ├── wallet-connect.tsx    # Wallet connect button (wagmi)
│   │   ├── payment-table.tsx     # Reusable payment DataTable config
│   │   ├── fx-rate-badge.tsx     # Inline FX rate display with source
│   │   ├── payroll-status.tsx    # Status <Badge> with color mapping
│   │   └── vault-balance.tsx     # On-chain vault balance display
│   └── lib/
│       ├── api.ts                # Backend API client (fetch wrapper)
│       ├── chains.ts             # Arc testnet chain definition
│       ├── contracts.ts          # ABI imports from ../../contracts/artifacts
│       ├── wagmi.ts              # Wagmi config + providers
│       └── utils.ts              # cn() helper, formatters
├── components.json               # shadcn/ui configuration
├── react-router.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Backend (Rust + Axum + SQLx + PostgreSQL)

### Setup
```bash
cargo init backend
cd backend
cargo add axum tokio serde serde_json sqlx tower-http jsonwebtoken uuid chrono dotenvy tracing tracing-subscriber thiserror
cargo add axum --features ws
cargo add sqlx --features runtime-tokio-rustls,postgres,uuid,chrono,migrate
cargo add tower-http --features cors
cargo add tokio --features full
cargo add tracing-subscriber --features env-filter
```

> **Database:** The backend connects to the PostgreSQL instance from `docker compose`.
> Make sure `docker compose up -d postgres` is running before starting the backend.
> Connection string: `DATABASE_URL=postgres://stablepay:stablepay_dev@localhost:5432/stablepay`

### Rust Axum Best Practices

**Project structure:**
```
backend/
├── src/
│   ├── main.rs                   # Entry point, server setup
│   ├── config.rs                 # Environment config
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── auth.rs               # Login, register, JWT
│   │   ├── companies.rs          # Company CRUD
│   │   ├── employees.rs          # Employee CRUD
│   │   ├── payrolls.rs           # Payroll management
│   │   ├── invoices.rs           # Invoice lifecycle
│   │   ├── payments.rs           # Payment history
│   │   └── fx_rates.rs           # FX rate cache/history
│   ├── models/
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   ├── company.rs
│   │   ├── employee.rs
│   │   ├── payroll.rs
│   │   ├── invoice.rs
│   │   └── payment.rs
│   ├── db/
│   │   ├── mod.rs
│   │   └── migrations/           # SQLx migrations
│   ├── middleware/
│   │   ├── mod.rs
│   │   └── auth.rs               # JWT extraction middleware
│   ├── services/
│   │   ├── mod.rs
│   │   ├── chain_listener.rs     # Listen for Arc chain events
│   │   └── notifications.rs      # WebSocket broadcast
│   └── error.rs                  # Unified error types
├── migrations/
│   └── 001_initial.sql
├── Cargo.toml
└── .env
```

**Axum application setup (`main.rs`):**
```rust
use axum::{Router, routing::{get, post, put}};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::CorsLayer;
use std::sync::Arc as StdArc;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub jwt_secret: String,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    sqlx::migrate!().run(&pool).await.expect("Migration failed");

    let state = AppState {
        db: pool,
        jwt_secret: std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret".into()),
    };

    let app = Router::new()
        .nest("/api/auth", routes::auth::router())
        .nest("/api/companies", routes::companies::router())
        .nest("/api/employees", routes::employees::router())
        .nest("/api/payrolls", routes::payrolls::router())
        .nest("/api/invoices", routes::invoices::router())
        .nest("/api/payments", routes::payments::router())
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

**Handler pattern (example: payroll routes):**
```rust
use axum::{
    extract::{State, Path, Json},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_payrolls).post(create_payroll))
        .route("/{id}", get(get_payroll))
        .route("/{id}/execute", post(trigger_payroll))
}

#[derive(Serialize)]
struct PayrollResponse {
    id: uuid::Uuid,
    company_id: uuid::Uuid,
    status: String,
    total_amount_usdc: String,
    scheduled_at: chrono::NaiveDateTime,
    executed_at: Option<chrono::NaiveDateTime>,
}

async fn list_payrolls(
    State(state): State<AppState>,
    claims: AuthClaims,  // extracted via middleware
) -> Result<Json<Vec<PayrollResponse>>, AppError> {
    let payrolls = sqlx::query_as!(
        PayrollResponse,
        "SELECT id, company_id, status, total_amount_usdc, scheduled_at, executed_at
         FROM payrolls WHERE company_id = $1 ORDER BY scheduled_at DESC",
        claims.company_id
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(payrolls))
}
```

**Key Rust/Axum best practices:**
- Use `sqlx::query_as!` macro for compile-time checked SQL queries
- Use `thiserror` for custom error types, implement `IntoResponse` for unified error handling
- Extract JWT claims via a custom extractor middleware
- Use `tower_http::cors` for CORS — set to permissive during development
- Use `tokio::spawn` for background tasks (chain event listener)
- Use `axum::extract::ws` for WebSocket connections (live payment updates)
- Keep handlers thin — business logic in service layer
- Use database transactions for multi-step operations (create payroll + entries)
- Use `chrono` for timestamps, `uuid` for IDs
- Run migrations automatically on startup with `sqlx::migrate!()`

**Database schema (`migrations/001_initial.sql`):**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employer', -- employer, employee
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    vault_address VARCHAR(42), -- PayrollVault contract address
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID REFERENCES users(id),
    wallet_address VARCHAR(42) NOT NULL,
    name VARCHAR(255) NOT NULL,
    salary_amount DECIMAL(18,2) NOT NULL, -- in local currency
    salary_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, executing, completed, failed
    total_amount_usdc DECIMAL(18,6),
    fx_rates JSONB, -- { "EUR": 1.08, "MXN": 17.2 }
    scheduled_at TIMESTAMP NOT NULL,
    executed_at TIMESTAMP,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES payrolls(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    amount_local DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    amount_usdc DECIMAL(18,6),
    fx_rate DECIMAL(18,6),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    payer_address VARCHAR(42) NOT NULL,
    payee_address VARCHAR(42) NOT NULL,
    total_amount_usdc DECIMAL(18,6) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, pending, partial, completed, disputed
    escrow_address VARCHAR(42),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE fx_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(18,6) NOT NULL,
    source VARCHAR(100) NOT NULL,
    fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Implementation Plan (Priority Order)

Build in this order to have a working demo at each step:

### Phase 1: Foundation (Days 1-3)
1. **Smart contracts** — Write and deploy `PayrollVault.sol` to Arc testnet
2. **Backend scaffold** — Axum project with PostgreSQL, migrations, basic CRUD for companies + employees
3. **Frontend scaffold** — React Router v7 project with Tailwind + shadcn/ui, basic routing and layout
4. **Wallet connection** — wagmi setup with Arc testnet chain

### Phase 2: Core Flow (Days 4-8)
5. **CRE workflow** — Build the cron-triggered payroll workflow (HTTP fetch FX rates → EVM write batch payment)
6. **Payroll creation UI** — Employer creates payroll runs with employee list + amounts
7. **Backend payroll API** — Payroll CRUD, link to on-chain vault
8. **Chain event indexer** — Background task in Axum to listen for `PayrollExecuted` events and update DB

### Phase 3: Polish (Days 9-14)
9. **Employee portal** — View payments, receipts
10. **Invoice escrow** — `InvoiceEscrow.sol` + UI for creating and approving invoices
11. **FX rate dashboard** — Show historical rates, rate at time of each payment
12. **WebSocket live updates** — Push payment confirmations to UI in real-time

### Phase 4: Demo Prep (Days 15-17)
13. **End-to-end testing** — Full flow from payroll creation to payment settlement
14. **UI polish** — Loading states, error messages, empty states
15. **Record demo video** (< 5 min)

---

## Hackathon Success Guidelines

### What Judges Look For
1. **Working demo** — #1 priority. A working MVP beats a polished slide deck every time
2. **CRE usage** — The hackathon is about Chainlink CRE. Make sure CRE is central to the product, not an afterthought
3. **Real problem** — Show why this matters. Cross-border payments cost 3-7% and take days. Your solution: instant, $0.01, private
4. **Arc chain leverage** — Don't just deploy on Arc and ignore its features. USE the USDC gas, USE the privacy, USE the finality
5. **Frontend matters** — "Projects with a frontend are looked at more favorably" — direct from the FAQ
6. **Code quality** — Clean, readable code. Judges will look at the repo
7. **Demo video** — Must be under 5 minutes. Rehearse. Show the end-to-end flow, don't just show slides

### Common Hackathon Mistakes to Avoid
- **Over-engineering** — Don't build a production system. Build an MVP that demonstrates the concept
- **No working demo** — If it doesn't work, it doesn't win. Cut scope aggressively to have something working
- **Ignoring the sponsor tech** — CRE must be integral, not bolted on at the end
- **Too many features** — Pick 2-3 core flows and nail them. Don't build 10 half-finished features
- **Bad demo video** — Practice the demo. Use screen recording (OBS). Show the flow, not the code
- **No error handling** — Even in an MVP, gracefully handle the happy path and the most obvious failure

### Demo Video Script Outline
1. **[0:00-0:30] Problem statement** — "Cross-border payroll is slow, expensive, and exposes private data..."
2. **[0:30-1:30] Show the employer flow** — Create company → add employees → fund vault → schedule payroll
3. **[1:30-3:00] Show CRE in action** — Trigger fires → FX rates fetched from multiple APIs → consensus verified → batch payment executed on Arc
4. **[3:00-4:00] Show employee receiving payment** — Instant USDC deposit, privacy-shielded amount, receipt with FX rate audit trail
5. **[4:00-4:30] Show the Arc advantages** — Sub-second confirmation, $0.01 fee, no volatile token needed
6. **[4:30-5:00] Wrap up** — Architecture diagram, future vision, team

### Resources & Links
- **CRE Docs:** https://docs.chain.link/cre
- **CRE TS SDK Reference:** https://docs.chain.link/cre/reference/sdk/core-ts
- **CRE Getting Started (TS):** https://docs.chain.link/cre/getting-started/overview
- **CRE Full TS Docs (LLM-friendly):** https://docs.chain.link/cre/llms-full-ts.txt
- **CRE GitHub (TS SDK):** https://github.com/smartcontractkit/cre-sdk-typescript
- **Arc Docs:** https://docs.arc.network/arc/concepts/welcome-to-arc
- **Arc Testnet RPC:** https://rpc.testnet.arc.network (Chain ID: 5042002)
- **Arc Faucet (USDC):** https://faucet.circle.com
- **Arc Explorer:** https://testnet.arcscan.app
- **React Router v7 Docs:** https://reactrouter.com/start/framework/routing
- **Axum Docs:** https://docs.rs/axum/latest/axum/
- **SQLx Docs:** https://docs.rs/sqlx/latest/sqlx/
- **wagmi Docs:** https://wagmi.sh
- **viem Docs:** https://viem.sh
- **shadcn/ui:** https://ui.shadcn.com
- **Chainlink Discord:** https://discord.com/invite/chainlink
- **Chainlink Faucet (LINK):** https://chain.link/faucets

---

## Cursor AI Accelerators

This section covers every Cursor feature and tool that can speed up development and improve AI output quality. Set these up **before you start coding**.

### 1. Cursor Rules (`.cursor/rules/`) — Persistent AI Context

Cursor Rules are markdown files that automatically inject instructions into the AI's context based on file patterns. They ensure the AI follows your project conventions **every time**, without you repeating yourself.

Create `.cursor/rules/` in the project root with these files:

**`.cursor/rules/project.mdc`** — Global project context:
```markdown
---
description: Global project conventions for StablePay
globs: ["**/*"]
---

# StablePay Project

You are working on StablePay, a cross-border payroll and invoice settlement platform for the Chainlink Convergence Hackathon.

## Tech Stack
- Smart Contracts: Solidity ^0.8.24 on Arc chain (EVM, USDC gas, chain ID 5042002)
- Oracle/Automation: Chainlink CRE TypeScript SDK v1.0.7+
- Frontend: React Router v7 + TypeScript + shadcn/ui + Tailwind CSS v4
- Backend: Rust + Axum + SQLx + PostgreSQL 17
- Wallet: wagmi + viem

## Key Conventions
- This is a HACKATHON MVP. Prioritize working features over perfect code.
- Always use TypeScript strict mode in TS files.
- Use shadcn/ui components for all UI — never write raw HTML for forms, tables, buttons, etc.
- All money amounts are in USDC (6 decimals on standard ERC-20, 18 decimals as Arc native gas).
- Arc testnet RPC: https://rpc.testnet.arc.network, Chain ID: 5042002
- Error handling: always handle errors gracefully, show user-friendly messages.
```

**`.cursor/rules/frontend.mdc`** — Frontend-specific rules:
```markdown
---
description: Frontend conventions for React Router v7 + shadcn/ui
globs: ["frontend/**/*.{ts,tsx}"]
---

# Frontend Rules

- Use React Router v7 route modules with `loader`, `action`, and `ErrorBoundary` exports.
- Use the generated `Route` type from `./+types/` for type safety on loader/action args.
- Use `<Outlet />` in layout routes for nested rendering.
- Use `useFetcher()` for mutations that don't navigate.
- All UI components must use shadcn/ui from `~/components/ui/`.
- Use the `cn()` utility from `~/lib/utils` for conditional class names.
- Use `<Sonner />` toasts for success/error feedback, never `alert()`.
- Dark mode is the default — all components should look good on dark backgrounds.
- Backend API base URL: `http://localhost:3001/api`
```

**`.cursor/rules/backend.mdc`** — Backend-specific rules:
```markdown
---
description: Backend conventions for Rust Axum + SQLx
globs: ["backend/**/*.rs"]
---

# Backend Rules

- Use Axum extractors (`State`, `Path`, `Json`, `Query`) for all handler parameters.
- Use `sqlx::query_as!` macro for compile-time checked SQL queries.
- Define custom error types with `thiserror`, implement `IntoResponse`.
- All routes return `Result<Json<T>, AppError>`.
- Use `uuid::Uuid` for all IDs, `chrono::NaiveDateTime` for timestamps.
- Use database transactions (`pool.begin()`) for multi-table writes.
- Log with `tracing::info!`, `tracing::error!`, etc. — never `println!`.
- All API responses use consistent JSON shape: `{ "data": ... }` or `{ "error": "..." }`.
```

**`.cursor/rules/contracts.mdc`** — Solidity-specific rules:
```markdown
---
description: Smart contract conventions for Solidity on Arc
globs: ["contracts/**/*.sol"]
---

# Solidity Rules

- Target Solidity ^0.8.24.
- Use custom `error` definitions instead of `require` with string messages.
- Use OpenZeppelin for access control and reentrancy guards.
- Emit events for every state-changing function.
- All amounts are uint256 representing USDC with appropriate decimals.
- Use NatSpec comments on all public/external functions.
- Keep contracts simple — this is an MVP. Avoid premature optimization.
```

**`.cursor/rules/cre-workflow.mdc`** — CRE workflow rules:
```markdown
---
description: Chainlink CRE workflow conventions
globs: ["cre-workflow/**/*.ts"]
---

# CRE Workflow Rules

- Use direct imports: `import { handler, Runtime, HTTPClient, EVMClient } from "@chainlink/cre-sdk"`
- Callbacks are STATELESS — no persistent state between executions.
- Use `runtime.getSecret()` for API keys, never hardcode secrets.
- Use `runtime.now()` for timestamps, not `Date.now()`.
- Max 5 HTTP requests per execution, max 3 concurrent capability calls.
- Max 10 EVM read calls per execution.
- Cron minimum interval: 30 seconds.
- Arc testnet chain ID: 5042002
- Always handle errors in capability calls.
```

### 2. MCP Servers — Full Configuration

Complete `.cursor/mcp.json` for the project root:

```json
{
  "mcpServers": {
    "shadcn-ui": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/shadcn-mcp@latest"]
    },
    "docker": {
      "command": "docker",
      "args": ["run", "-i", "--rm",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "mcp/docker"
      ]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

**What each MCP server does:**

| MCP Server | What It Does | When to Use |
|---|---|---|
| **shadcn-ui** | Queries the shadcn/ui component registry for components, props, variants, and install commands | When building any UI — "create a data table for employees", "add a sidebar" |
| **docker** | Manages Docker containers — start/stop, view logs, inspect state | "Start the database", "show postgres logs", "is the DB healthy?" |
| **context7** | Fetches up-to-date documentation for 4000+ libraries directly into AI context | Add `use context7` to your prompt when working with any library — "use context7 how does axum extract state work?" |
| **playwright** | Runs real browser sessions, takes snapshots, clicks elements, fills forms | End-to-end testing — "test the login flow", "verify the payroll creation form works" |
| **cursor-ide-browser** | (Already built-in) Navigate and interact with web pages from Cursor | Quick UI checks during development |

### 3. Cursor Docs Indexing — Teach Cursor Your Libraries

Cursor can index external documentation so the AI has accurate, up-to-date knowledge of your specific libraries. Go to **Cursor Settings > Features > Docs** and add these:

| Doc URL | Why |
|---|---|
| `https://docs.chain.link/cre/llms-full-ts.txt` | Complete CRE TypeScript SDK docs in LLM-friendly format — this is the single most important doc to index |
| `https://docs.arc.network` | Arc chain docs (features, deployment, references) |
| `https://reactrouter.com` | React Router v7 (routing, loaders, actions) |
| `https://docs.rs/axum/latest/axum` | Axum web framework |
| `https://docs.rs/sqlx/latest/sqlx` | SQLx database library |
| `https://wagmi.sh` | Wagmi React hooks for Ethereum |
| `https://viem.sh` | Viem TypeScript Ethereum library |
| `https://ui.shadcn.com` | shadcn/ui components |

After indexing, you can reference them in prompts with `@Docs` — for example: `@CRE Docs how do I write an EVM read in TypeScript?`

### 4. Cursor @ Mentions — Inject Context On Demand

Use `@` mentions in your prompts to give Cursor precise context:

| Mention | What It Does | Example |
|---|---|---|
| `@filename` | Includes a specific file in context | `@PayrollVault.sol add a function to check pending payrolls` |
| `@foldername` | Includes all files in a folder | `@contracts/ generate the ABI type for the frontend` |
| `@Docs` | References indexed documentation | `@CRE Docs how do cron triggers work?` |
| `@Web` | Searches the web for current info | `@Web latest Arc testnet status` |
| `@Codebase` | Searches your entire codebase semantically | `@Codebase where do we handle payroll execution?` |
| `@Git` | References git history | `@Git what changed in the last 3 commits?` |

**Pro tip for this project:** When working on the CRE workflow, always `@contracts/artifacts/` so Cursor can see the compiled ABIs and generate type-safe EVM read/write calls.

### 5. Notepads — Reusable Context Snippets

Cursor Notepads (accessible from the sidebar) let you save reusable context that you can `@mention` in any prompt. Create these notepads:

| Notepad Name | Contents |
|---|---|
| `arc-chain` | Arc testnet details: RPC URL, chain ID, currency, explorer URL, faucet link, viem chain definition |
| `api-contracts` | Summary of all REST API endpoints the backend exposes (method, path, request/response shape) |
| `db-schema` | Copy of the SQL migration — full table definitions for quick reference |
| `cre-quotas` | Key CRE service quotas (max 5 HTTP calls, 3 concurrent capabilities, 30s cron min, 5min timeout) |

Then in prompts: `@arc-chain create a wagmi config for this chain` or `@db-schema add a new table for audit logs`.

### 6. Effective Prompt Patterns for This Project

**Pattern: Full-stack feature (use Agent mode):**
```
Build the "Add Employee" feature end-to-end:
1. Backend: POST /api/employees endpoint in @backend/src/routes/employees.rs
2. Frontend: Form using shadcn Form + Input + Select components at @frontend/app/employer/employees.tsx
3. Use the existing @db-schema for the employees table
Wire up the frontend form to call the backend API and show a success toast.
```

**Pattern: CRE workflow iteration:**
```
@cre-workflow/src/workflow.ts @CRE Docs
Update the payroll workflow to:
1. Read pending payrolls from the contract using EVM Read
2. For each payroll, fetch FX rates for the currencies needed
3. Calculate USDC amounts and write batch payment via EVM Write
Follow CRE best practices: use direct imports, handle errors, respect quotas.
```

**Pattern: UI component with shadcn MCP:**
```
Create a payroll status dashboard card using shadcn components.
It should show: vault balance, pending payrolls count, last execution time, next scheduled run.
Use Card, Badge for status, and Skeleton for loading state.
Dark theme, clean layout.
```

**Pattern: Debug with context:**
```
@terminal The payroll execution is failing. Here's the error from the CRE simulation.
@cre-workflow/src/workflow.ts
@contracts/contracts/PayrollVault.sol
What's going wrong and how do I fix it?
```

---

## Quick Start Checklist

### 1. Monorepo & Infrastructure
- [ ] Create project directory: `mkdir stablepay && cd stablepay && git init`
- [ ] Create root `package.json` with workspaces (see monorepo section above)
- [ ] Create `docker-compose.yml` (see Docker section above)
- [ ] Create `.env.example` and copy to `.env`
- [ ] Start infrastructure: `docker compose up -d`
- [ ] Verify Postgres: `docker compose logs postgres` (should show "ready to accept connections")

### 2. Cursor Setup (Rules + MCP + Docs)
- [ ] Create `.cursor/mcp.json` in project root with all 4 MCP servers (shadcn, docker, context7, playwright)
- [ ] Create `.cursor/rules/` with `project.mdc`, `frontend.mdc`, `backend.mdc`, `contracts.mdc`, `cre-workflow.mdc`
- [ ] Restart Cursor to load MCP servers and rules
- [ ] Go to Cursor Settings > Features > Docs and index: CRE llms-full-ts.txt, Arc docs, React Router, Axum, shadcn/ui
- [ ] Create Notepads: `arc-chain`, `api-contracts`, `db-schema`, `cre-quotas`
- [ ] Verify MCP: ask Cursor "list shadcn components" — it should query the registry

### 3. Accounts & Tools
- [ ] Create CRE account at https://cre.chain.link
- [ ] Install CRE CLI: `curl -sSfL https://raw.githubusercontent.com/smartcontractkit/cre-cli/main/install.sh | bash`
- [ ] `cre auth login`
- [ ] Get Arc testnet USDC from https://faucet.circle.com
- [ ] Add Arc testnet to MetaMask (RPC: `https://rpc.testnet.arc.network`, Chain ID: `5042002`)

### 4. Scaffold Sub-projects
- [ ] Smart contracts: `mkdir contracts && cd contracts && npx hardhat init` (TypeScript template)
- [ ] CRE workflow: `cd .. && cre project init --template typescript --dir cre-workflow`
- [ ] Frontend: `npx create-react-router@latest frontend`
- [ ] Frontend shadcn: `cd frontend && npx shadcn@latest init && npx shadcn@latest add button card table form input sidebar badge dialog sonner chart skeleton`
- [ ] Backend: `cd .. && cargo init backend`
- [ ] Run `npm install` at the root to link workspaces

### 5. Build & Iterate
- [ ] Write and deploy `PayrollVault.sol` to Arc testnet
- [ ] Build CRE workflow → `cre workflow simulate`
- [ ] Backend: create migrations → `cargo run` (auto-runs migrations)
- [ ] Frontend: `npm run dev -w frontend`
- [ ] Connect all pieces end-to-end
- [ ] Record demo video (< 5 min)
