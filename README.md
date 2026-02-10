# StablePay

> Pay anyone, anywhere, in stablecoins — privately and instantly

**Chainlink Convergence Hackathon 2026** | DeFi / Onchain Finance

## Overview

StablePay is a cross-border payroll and invoice settlement platform deployed on Arc chain that uses Chainlink CRE workflows to automate scheduled payments with real-time FX rate conversion. Arc's opt-in privacy keeps salary amounts confidential. The entire platform is USDC-denominated.

## Architecture

```
User (Browser)  →  Frontend (React Router v7 + shadcn/ui)
                      ↓ REST API
                   Backend (Rust Axum + PostgreSQL)
                      ↓ Chain Events
                   Arc Chain (Testnet, Chain ID: 5042002)
                   ├── PayrollVault.sol
                   └── InvoiceEscrow.sol
                      ↑ CRE Writes
                   Chainlink CRE (DON)
                   └── Cron trigger → FX rates → Batch payment
```

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity ^0.8.24 on Arc (EVM) |
| Oracle/Automation | Chainlink CRE TypeScript SDK |
| Frontend | React Router v7 + shadcn/ui + Tailwind v4 |
| Backend | Rust + Axum + SQLx + PostgreSQL 17 |
| Chain | Arc Testnet (Chain ID: 5042002, USDC gas) |
| Wallet | wagmi + viem |

## Quick Start

### Prerequisites

- Node.js 20+
- Rust (stable)
- Docker & Docker Compose
- CRE CLI (`curl -sSfL https://raw.githubusercontent.com/smartcontractkit/cre-cli/main/install.sh | bash`)

### 1. Clone & Setup

```bash
git clone <repo-url>
cd stablepay
cp .env.example .env
```

### 2. Start Database

```bash
docker compose up -d postgres
```

### 3. Install Dependencies

```bash
# Root workspace (links contracts, frontend, CRE workflow)
npm install

# Backend (Rust)
cd backend && cargo build
```

### 4. Deploy Contracts

```bash
# Compile
npm run contracts:compile

# Deploy to Arc testnet (update .env with deployed addresses)
npm run contracts:deploy
```

### 5. Start Development

```bash
# Terminal 1: Backend
cd backend && cargo run

# Terminal 2: Frontend
npm run frontend:dev

# Terminal 3: CRE Simulation
npm run cre:simulate
```

### 6. Access

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **pgAdmin:** http://localhost:5050

## Project Structure

```
stablepay/
├── contracts/          # Solidity smart contracts (Hardhat)
├── cre-workflow/       # Chainlink CRE TypeScript workflow
├── frontend/           # React Router v7 + shadcn/ui
├── backend/            # Rust Axum API server
├── docker-compose.yml  # PostgreSQL + pgAdmin
└── .cursor/            # Cursor AI rules & MCP config
```

## Core Features

1. **Automated Payroll** — CRE cron trigger fetches live FX rates → calculates USDC amounts → executes batch payment on Arc
2. **Invoice Escrow** — Create B2B invoices with milestone-based escrow
3. **Privacy** — Arc's opt-in privacy shields salary/invoice amounts
4. **FX Rate Audit Trail** — Every payment records the FX rate used, sourced from multiple APIs with consensus verification

## Team

Built for the Chainlink Convergence Hackathon (Feb 6 – Mar 1, 2026)
