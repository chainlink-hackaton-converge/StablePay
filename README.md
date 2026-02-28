# StablePay

Pay anyone, anywhere, in stablecoins.

Chainlink Convergence Hackathon 2026 | DeFi / Onchain Finance

## Overview

StablePay is a cross-border payroll and invoice settlement platform deployed on Arc chain. It uses Chainlink CRE workflows for scheduled automation and FX conversion, with USDC-denominated settlement.

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity ^0.8.24 on Arc |
| Oracle/Automation | Chainlink CRE TypeScript SDK |
| Frontend | React Router v7 + Tailwind + shadcn/ui |
| Backend | Rust + Axum + SQLx + PostgreSQL |
| Wallet | RainbowKit + wagmi + viem |
| Desktop MVP | Electrobun |

## Quick Start

### Prerequisites

- Node.js 20+
- Rust stable
- Docker + Docker Compose
- Bun 1.3+ (optional, only for Electrobun desktop MVP)
- CRE CLI

### Install

```bash
npm install
cp .env.example .env
```

### Run

```bash
docker compose up -d postgres
cd backend && cargo run
npm run frontend:dev
npm run cre:simulate
```

### Access

- Frontend: `http://localhost:5173`
- Web3 Sandbox: `http://localhost:5173/sandbox`
- Backend API: `http://localhost:3001`
- pgAdmin: `http://localhost:5050`

## Desktop MVP (Electrobun)

```bash
npm run desktop:dev
```

Desktop project location:

- `desktop/electrobun-stablepay`

## Core Features

1. Automated payroll via CRE.
2. Invoice escrow flows.
3. Privacy-aware Arc settlement.
4. FX auditability.
5. Web3 sandbox with RainbowKit + viem.
6. Desktop wrapper MVP for local demos.

