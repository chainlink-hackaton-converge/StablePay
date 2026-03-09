# StablePay

Pay anyone, anywhere, in stablecoins - privately and instantly.

StablePay is a cross-border payroll and invoice settlement platform for Arc Testnet. Employers manage teams, schedule payroll runs, and create escrow-backed invoices from a web UI or a Windows desktop shell. A Chainlink CRE workflow reads pending payroll state from Arc, fetches live FX data from external APIs, and produces a verifiable simulation result for payroll automation.

## Stack

- Frontend: React Router v7, TypeScript, shadcn/ui, wagmi, viem
- Backend: Rust, Axum, SQLx, PostgreSQL 17
- Contracts: Solidity, Hardhat, Arc Testnet
- Automation: Chainlink CRE SDK + CRE CLI
- Desktop demo shell: Electrobun on Windows

## Chainlink Usage

These are the primary Chainlink CRE files in this repository:

- `stablepay-cre/stablepay-payroll/main.ts`
- `stablepay-cre/stablepay-payroll/src/workflow.ts`
- `stablepay-cre/stablepay-payroll/workflow.yaml`
- `stablepay-cre/project.yaml`

The workflow:

- reads pending payroll IDs from the `PayrollVault` contract on Arc Testnet
- fetches FX data from external APIs
- aggregates the rate result through CRE HTTP consensus helpers
- returns a simulation payload that can be demonstrated from the CLI

## Local Run

### Prerequisites

- Node.js 20+
- Bun 1.3+
- Rust stable
- PostgreSQL 17
- CRE CLI 1.3+

### Environment

Create `.env` in the repo root and set:

```env
DATABASE_URL=postgres://stablepay:stablepay_dev@localhost:5432/stablepay
JWT_SECRET=dev-secret-change-in-production
BACKEND_PORT=3001
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_EXPLORER_URL=https://testnet.arcscan.app
PAYROLL_VAULT_ADDRESS=0xb096d1d2615d48c0B89724563798DcBe89065Bb3
INVOICE_ESCROW_ADDRESS=0x23599da9826e06cBc963b695959fb70711823015
```

### Install

```bash
npm install
cd backend && cargo build
```

### Run

Terminal 1:

```bash
npm run backend:dev
```

Terminal 2:

```bash
npm run frontend:dev
```

Terminal 3:

```bash
cre login
npm run cre:simulate
```

### Contracts

Compile:

```bash
npm run contracts:compile
```

Deploy to Arc Testnet after setting `PRIVATE_KEY` or `DEPLOYER_PRIVATE_KEY` in `.env`:

```bash
npm run contracts:deploy
```

## Demo Notes

- Web app: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`
- Windows desktop shell: `desktop/electrobun-stablepay/build/dev-win-x64/StablePayDesktop-dev/bin/launcher.exe`
- CRE demo command: `cre workflow simulate ./stablepay-payroll -T dev --trigger-index 0 --project-root ./stablepay-cre`
- CRE login is required once per machine before running the simulation

## Project Structure

```text
backend/                         Rust API and PostgreSQL access
contracts/                       PayrollVault and InvoiceEscrow contracts
frontend/                        Employer and employee UI
desktop/electrobun-stablepay/    Windows desktop wrapper for the frontend
stablepay-cre/                   Chainlink CRE workflow project
```
