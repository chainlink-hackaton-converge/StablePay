# Chainlink Convergence Hackathon - Ideas & Planning

## Hackathon Overview

**Name:** Convergence: A Chainlink Hackathon
**Dates:** February 6 – March 1, 2026
**Prize Pool:** $100K+
**Format:** Virtual, global
**Submission deadline:** March 1, 2026
**Closing ceremony & winners:** March 20, 2026

> **Important dates:**
> - Feb 6: Hackathon kicks off
> - Feb 9-17: Workshops
> - Feb 17-27: Office hours & mentorship
> - Mar 1: Submission deadline
> - Mar 20: Winners announcement

---

## Rules & Requirements

- **Team size:** 1–5 participants per team
- **Eligibility:** Anyone from anywhere in the world
- **Originality:** Projects must be built during the hackathon period. Pre-existing projects are only eligible if a **relevant update** was made during the hack period
- **Demo video:** Required, must be under 5 minutes
- **Frontend:** Not required, but **projects with a frontend are looked at more favorably**
- **Hosting:** Local hosting is fine — just need a live demo
- **IP:** Team owns the project IP
- **KYC:** Required for prize distribution
- **Submission platform:** Airtable form (link on hackathon page)
- **Support:** Discord for discussions, YouTube workshops, Chainlink Developer Experts available

---

## Prize Tracks & Categories

### 1. DeFi / Onchain Finance
**Example ideas from organizers:**
- Stablecoin issuance
- Tokenized asset servicing and lifecycle management
- Custom Proof of Reserve Data Feed

### 2. AI Agents
**Example ideas from organizers:**
- AI agents consuming CRE workflows with x402 payments
- AI agent blockchain abstraction
- AI-assisted CRE workflow generation

### 3. Prediction Markets
**Example ideas from organizers:**
- AI-powered prediction market settlement
- Event-driven market resolution using offchain data

### 4. Risk Monitoring & Safeguards
**Example ideas from organizers:**
- Automated risk monitoring
- Real-time reserve health checks
- Protocol safeguard triggers

### 5. Privacy / Confidential Computing
**Example ideas from organizers:**
- Selective disclosure & proofs from Web2 data
- Fetch confidential API data and prove specific conditions (eligibility, thresholds, balances) without revealing private data
- Privacy-preserving identity & compliance checks
- Confidential data-driven automation
- Secure API integrations for dApps and services
- Controlled data distribution & auditability

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Blockchain** | [Arc Network](https://docs.arc.network) (L1) | USDC-native gas, sub-second deterministic finality, opt-in privacy, EVM compatible |
| **Oracle / Automation** | [Chainlink CRE](https://docs.chain.link/cre) (TypeScript SDK) | Trigger-and-callback workflows, HTTP/cron/EVM log triggers, consensus-verified data, EVM read/write |
| **Frontend** | React Router v7 + TypeScript | Modern SSR/SPA framework, nested routes, data loaders |
| **Backend** | Rust + Axum + SQLx | High performance API server, type-safe SQL queries, async runtime |

### Arc Chain Key Features
- **USDC as gas token** — No volatile tokens needed, predictable ~$0.01 fees per transaction
- **Deterministic sub-second finality** — Transactions are instantly and irreversibly final once committed. No reorgs, no "probably final" state
- **Opt-in privacy** — Confidential transfers (encrypted amounts), selective disclosure with view keys, compliance-ready auditability
- **EVM compatible** — Deploy standard Solidity smart contracts, use familiar tooling (Hardhat, Foundry, ethers.js)
- **Cross-chain via Circle CCTP** — Native USDC bridging across chains
- **Account Abstraction** — Smart accounts for better UX (gasless transactions, session keys, batched operations)

**Arc Testnet:**
- RPC: `https://rpc.testnet.arc.network`
- WebSocket: `wss://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Currency: USDC
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com

### Chainlink CRE Key Features
- **Trigger-and-callback model** — `handler(trigger, callback)` pairs as the atoms of execution
- **Trigger types:** Cron (scheduled), HTTP (request-driven), EVM Log (onchain event-driven)
- **Capabilities:** HTTP fetch (GET/POST to external APIs), EVM Read (read from smart contracts), EVM Write (write to smart contracts)
- **Built-in consensus** — Every capability execution is automatically verified by multiple independent nodes via BFT consensus
- **TypeScript SDK** — Write workflows in TypeScript, compiled to WASM, runs on Chainlink DON
- **Simulation** — Test locally with real API calls and real blockchain reads before deployment

---

## MVP Ideas

---

### Idea 1: StablePay — Cross-Border Payroll & Invoice Settlement

**Category:** DeFi / Onchain Finance
**Tagline:** _"Pay anyone, anywhere, in stablecoins — privately and instantly"_

#### Problem
Cross-border payroll and B2B invoice payments are slow (2-5 days via SWIFT), expensive (3-7% fees), and expose sensitive salary/payment information on public blockchains.

#### Solution
A payroll and invoice platform deployed on Arc that uses CRE workflows to automate scheduled payments with real-time FX rate conversion, leveraging Arc's opt-in privacy to keep salary amounts confidential.

#### How It Uses the Stack

| Component | Usage |
|---|---|
| **Arc Chain** | USDC-native payments (no volatile token overhead), opt-in privacy to hide salary/invoice amounts, sub-second finality for instant settlement, account abstraction for employer-sponsored gas |
| **CRE Workflow** | **Cron trigger** fires on payroll schedule (e.g., every 2 weeks). **HTTP capability** fetches live FX rates from multiple APIs (e.g., exchangeratesapi.io, openexchangerates.org) with consensus-verified results. **EVM Write** executes batch payments on Arc with converted amounts |
| **Rust Axum Backend** | Company/employee management, payroll scheduling, invoice CRUD, payment history, webhook notifications, FX rate caching |
| **React Router v7 Frontend** | Employer dashboard (manage employees, create payroll runs, view history), Employee portal (view payments, download receipts), Invoice management with approval workflows |

#### Smart Contracts (Solidity on Arc)
- `PayrollVault.sol` — Holds employer funds, executes batch payments via CRE-authorized calls
- `InvoiceEscrow.sol` — Escrow for B2B invoices with milestone-based release

#### MVP Scope
1. Employer creates a payroll schedule with employee wallet addresses + amounts in local currency
2. CRE cron trigger fires, fetches FX rates, calculates USDC amounts
3. CRE writes batch payment transaction to Arc
4. Employees see instant USDC deposits with privacy-shielded amounts
5. Dashboard shows payment history and FX rate audit trail

#### Why It's Appealing
- Directly maps to Arc's stated vision: _"cross-border payments and payouts"_ and _"payroll systems"_
- Showcases CRE's cron + HTTP + EVM write pipeline end-to-end
- Privacy angle (hidden salary amounts) is a strong differentiator
- Real-world problem with a clear demo narrative

---

### Idea 2: OracleMarkets — AI-Powered Prediction Market with CRE Settlement

**Category:** Prediction Markets + AI Agents
**Tagline:** _"Bet on anything real-world — settled by decentralized oracle consensus"_

#### Problem
Prediction markets struggle with trustworthy resolution. Centralized resolution is a single point of failure. Existing oracle solutions require custom integration per market. There's no easy way to create markets on arbitrary real-world events with automated, trustworthy settlement.

#### Solution
A prediction market platform on Arc where market outcomes are automatically resolved by CRE workflows that fetch and verify real-world data from multiple sources, achieving consensus-verified truth for settlement.

#### How It Uses the Stack

| Component | Usage |
|---|---|
| **Arc Chain** | USDC-denominated betting (no need to buy a separate token to participate), ~$0.01 fees make micro-bets feasible (bet $0.50 on weather outcomes), sub-second finality for instant bet confirmation |
| **CRE Workflow** | **Cron trigger** for scheduled market checks (e.g., check sports scores every 5 min). **HTTP capability** fetches outcome data from multiple APIs (sports APIs, weather APIs, election APIs) — consensus across nodes ensures no single API can be manipulated. **EVM Read** to check current market state. **EVM Write** to settle markets and distribute winnings |
| **Rust Axum Backend** | Market catalog and metadata, order matching engine, user portfolio management, AI-powered market suggestion engine (analyzes trending topics to suggest new markets), historical analytics |
| **React Router v7 Frontend** | Market browser with categories (sports, politics, crypto, weather), betting interface with real-time odds, portfolio tracker, market creation wizard, live resolution feed |

#### Smart Contracts (Solidity on Arc)
- `MarketFactory.sol` — Creates new prediction markets with configurable parameters
- `BinaryMarket.sol` — Yes/No market with USDC collateral, AMM-based pricing
- `MarketResolver.sol` — Accepts CRE settlement reports, distributes winnings

#### MVP Scope
1. Users browse and bet on markets using USDC on Arc
2. CRE cron workflow periodically fetches results from real-world APIs
3. When an event outcome is known, CRE writes settlement to the market contract
4. Winners are automatically paid out in USDC
5. AI component suggests interesting new markets based on trending API data

#### Why It's Appealing
- Prediction markets are explicitly listed in **both** Arc's and Chainlink's example use cases
- Showcases CRE's killer feature: consensus-verified offchain data → onchain settlement
- USDC micro-betting on Arc is a unique angle (no other chain has stablecoin-native gas)
- AI market suggestion adds the AI agent flavor judges are looking for

---

### Idea 3: CreditVault — Privacy-Preserving Credit Scoring & Micro-Lending

**Category:** DeFi + Privacy / Confidential Computing
**Tagline:** _"Prove your creditworthiness without revealing your data"_

#### Problem
DeFi lending is almost entirely over-collateralized because there's no trustworthy way to assess borrower creditworthiness on-chain. Traditional credit scores require exposing sensitive financial data. Under-served markets (SMBs, gig workers, emerging economies) lack access to credit entirely.

#### Solution
A micro-lending protocol on Arc where CRE workflows fetch borrower financial signals from offchain APIs (bank statements, payment history, revenue data) and produce a consensus-verified credit attestation — without ever revealing the raw data on-chain. Arc's opt-in privacy hides loan amounts from public view.

#### How It Uses the Stack

| Component | Usage |
|---|---|
| **Arc Chain** | Opt-in privacy hides loan amounts and credit scores from public ledger. View keys allow auditors/regulators to verify when needed. USDC-native loans — borrowers receive and repay in stablecoins. Deterministic finality for instant loan disbursement |
| **CRE Workflow** | **HTTP trigger** initiated when a borrower requests a credit check. **HTTP capability** calls financial APIs (e.g., Plaid, bank open banking APIs) with secrets management for API keys. Consensus across DON nodes ensures the credit signal is verified by multiple independent evaluations. **EVM Write** posts a credit attestation hash on-chain (not the raw data) |
| **Rust Axum Backend** | Borrower profiles and KYC state machine, loan lifecycle management (application → approval → disbursement → repayment → default), risk scoring algorithms, lender pool management, repayment scheduling |
| **React Router v7 Frontend** | Borrower: apply for loans, connect financial accounts, view credit score, track repayments. Lender: browse lending pools, deposit USDC, view yield and risk metrics. Admin: compliance dashboard with view-key access |

#### Smart Contracts (Solidity on Arc)
- `CreditAttestation.sol` — Stores hashed credit scores, only CRE-authorized writes
- `LendingPool.sol` — USDC lending pool with risk-tiered interest rates
- `LoanManager.sol` — Individual loan lifecycle, repayment tracking, liquidation logic

#### MVP Scope
1. Borrower connects financial data source via the app
2. CRE workflow (HTTP trigger) fetches financial signals from external API
3. DON nodes independently verify and reach consensus on a credit tier (A/B/C/D)
4. CRE writes credit attestation to Arc (hash only, no raw data on-chain)
5. Borrower can borrow from lending pool at tier-appropriate rates
6. Loan amounts are privacy-shielded on Arc

#### Why It's Appealing
- Directly matches Arc's vision: _"Identity-based lending protocols"_ and _"SMB and consumer credit apps serving under-served markets"_
- Hits the Convergence **Privacy / Confidential Computing** track perfectly
- Shows CRE's power for confidential API data verification
- Real humanitarian angle: financial inclusion for the unbanked

---

### Idea 4: SentinelFi — Real-Time DeFi Protocol Health Monitor & Circuit Breaker

**Category:** Risk Monitoring & Safeguards
**Tagline:** _"Your DeFi protocol's immune system — powered by decentralized oracles"_

#### Problem
DeFi protocols are vulnerable to cascading failures: oracle manipulation, flash loan attacks, sudden liquidity drains, and depeg events. By the time a human notices, millions can be lost. Existing monitoring tools are centralized and can be a single point of failure themselves.

#### Solution
A decentralized protocol health monitoring system where CRE workflows continuously monitor multiple risk signals (TVL, liquidity ratios, price deviations, reserve levels) and automatically trigger circuit breakers on Arc when risk thresholds are breached.

#### How It Uses the Stack

| Component | Usage |
|---|---|
| **Arc Chain** | Deterministic finality ensures circuit breaker transactions execute instantly and irreversibly. USDC gas means predictable operational costs for continuous monitoring. Smart contracts serve as the enforcement layer for pause/unpause mechanisms |
| **CRE Workflow** | **Cron trigger** runs health checks every N minutes. **HTTP capability** fetches data from multiple DeFi data APIs (DeFiLlama, DeFi Pulse, CoinGecko) with consensus verification. **EVM Read** checks on-chain reserve levels, collateralization ratios, and pool balances directly from smart contracts. **EVM Write** triggers circuit breakers when risk thresholds are breached |
| **Rust Axum Backend** | Protocol registry (which protocols to monitor and their risk parameters), historical risk data storage and trending, alert management and notification dispatch (email, Telegram, Discord webhooks), incident post-mortem reports, customizable risk threshold configuration |
| **React Router v7 Frontend** | Real-time dashboard with protocol health scores (green/yellow/red), live charts for monitored metrics (TVL, collateral ratio, liquidity depth), alert configuration UI, incident timeline with automatic root cause analysis, historical risk analytics |

#### Smart Contracts (Solidity on Arc)
- `ProtocolRegistry.sol` — Registers protocols to monitor with their risk parameters
- `CircuitBreaker.sol` — Accepts CRE reports and executes pause/unpause based on risk scores
- `AlertLog.sol` — Immutable on-chain log of all risk events for auditability

#### MVP Scope
1. Register a DeFi protocol (e.g., a lending pool) with risk parameters (min collateral ratio, max TVL drop)
2. CRE cron workflow runs every 5 minutes, fetches protocol metrics from APIs and on-chain reads
3. Dashboard shows real-time health scores with historical charts
4. When a metric breaches threshold → CRE writes circuit breaker transaction → protocol paused
5. Alert sent to configured channels (Discord/Telegram webhook via CRE HTTP POST)

#### Why It's Appealing
- **Exact match** to the "Automated risk monitoring, Real-time reserve health checks, Protocol safeguard triggers" category
- Demonstrates CRE's full capability suite: cron + HTTP GET + EVM Read + EVM Write + HTTP POST
- Highly practical — every serious DeFi protocol needs this
- Strong demo potential: simulate a risk event live and show the circuit breaker firing

---

### Idea 5: AgentBazaar — Agentic Commerce Marketplace for AI Service Agents

**Category:** AI Agents
**Tagline:** _"An on-chain marketplace where AI agents hire each other and get paid in USDC"_

#### Problem
AI agents are becoming capable of performing complex tasks (data analysis, content generation, code review, research), but there's no decentralized marketplace for them to offer services, negotiate prices, and settle payments trustlessly. Current agent-to-agent interactions require centralized intermediaries.

#### Solution
A marketplace deployed on Arc where AI agents register their capabilities, post tasks, bid on work, and settle payments automatically in USDC. CRE workflows orchestrate the task lifecycle: verifying task completion by cross-referencing multiple data sources before releasing payment.

#### How It Uses the Stack

| Component | Usage |
|---|---|
| **Arc Chain** | USDC payments for agent-to-agent transactions (no token price risk). Sub-second finality for real-time agent interactions. Account abstraction for smart agent wallets (session keys, spending limits, automated approvals) |
| **CRE Workflow** | **HTTP trigger** for agent task submission. **HTTP capability** calls AI/LLM APIs to verify task outputs (e.g., verify a generated report by cross-checking facts via multiple APIs). Consensus ensures verification is decentralized. **EVM Read** to check escrow state and agent reputation scores. **EVM Write** to release escrow payments and update reputation |
| **Rust Axum Backend** | Agent registry with capability descriptions, task posting and matching engine, escrow state management, reputation algorithm, agent authentication (API keys / JWT), task result caching and verification queue |
| **React Router v7 Frontend** | Marketplace: browse agent capabilities, post tasks, track progress. Agent dashboard: manage registered agents, view earnings, reputation history. Live activity feed showing agent-to-agent transactions in real-time. Analytics: marketplace volume, top agents, popular task categories |

#### Smart Contracts (Solidity on Arc)
- `AgentRegistry.sol` — Register agents with capabilities, staking requirements, and reputation scores
- `TaskEscrow.sol` — Holds USDC in escrow per task, releases on CRE-verified completion
- `ReputationOracle.sol` — On-chain reputation scores updated by CRE based on verified task outcomes

#### MVP Scope
1. Register AI agents with their capabilities and pricing
2. Post a task (e.g., "Summarize the top 10 DeFi protocols by TVL with risk analysis")
3. Agent bids on and accepts the task, USDC locked in escrow
4. Agent submits result, CRE workflow verifies output quality via multiple API cross-references
5. CRE writes verification result → escrow releases USDC to agent → reputation updated

#### Why It's Appealing
- Maps directly to Arc's _"Agentic Commerce"_ vision and _"AI-mediated marketplaces where agents buy, sell, and execute transactions"_
- Combines AI + DeFi + CRE in a novel way
- USDC-native payments on Arc make agent micropayments economically viable ($0.01 gas)
- Strong x402 payment protocol angle (AI agents paying for CRE workflow invocations)

---

### Idea 6: GreenLedger — Tokenized Carbon Credit Marketplace with Verified Environmental Data

**Category:** DeFi / Tokenization (RWA)
**Tagline:** _"Trade verified carbon credits on-chain — backed by real environmental data, not trust"_

#### Problem
The voluntary carbon credit market is plagued by fraud, double-counting, and lack of transparency. Companies buying credits can't verify their authenticity. Existing registries (Verra, Gold Standard) are siloed and opaque. Credits are illiquid and hard to trade.

#### Solution
A tokenized carbon credit marketplace on Arc where CRE workflows continuously verify credit validity by cross-referencing multiple environmental registries and satellite data APIs. Each credit is minted as a token only after consensus-verified proof of its authenticity.

#### How It Uses the Stack

| Component | Usage |
|---|---|
| **Arc Chain** | USDC-denominated credit trading (stable pricing for corporate procurement). Privacy features for corporate carbon portfolio positions (competitive advantage). Deterministic finality for instant settlement of credit trades |
| **CRE Workflow** | **HTTP trigger** when a new credit is submitted for verification. **HTTP capability** fetches data from environmental registries (Verra API, Gold Standard API), satellite imagery APIs (Sentinel Hub), and climate databases — consensus ensures no single data source can be spoofed. **Cron trigger** for periodic re-verification of existing credits. **EVM Write** to mint verified credits or flag disputed ones |
| **Rust Axum Backend** | Credit submission pipeline, verification status tracking, marketplace order book, corporate portfolio management, ESG reporting engine, registry data caching and normalization |
| **React Router v7 Frontend** | Marketplace: browse and trade credits with filtering by type/region/vintage. Verification: real-time status of credit verification pipeline. Portfolio: corporate holdings, retirement tracking, ESG report generation. Map view: geographic visualization of credit-linked projects |

#### Smart Contracts (Solidity on Arc)
- `CarbonCreditToken.sol` — ERC-1155 tokens representing verified carbon credits (one token type per project/vintage)
- `CreditVerifier.sol` — Accepts CRE verification reports, gates minting
- `CreditMarketplace.sol` — Order book for trading credits in USDC
- `RetirementRegistry.sol` — Permanent on-chain record of retired credits (prevents double-counting)

#### MVP Scope
1. Submit a carbon credit for verification (project ID, registry reference, vintage year)
2. CRE workflow fetches verification data from 2-3 environmental APIs with consensus
3. If verified → CRE writes mint authorization → credit token minted on Arc
4. Users can buy/sell credits on the marketplace in USDC
5. Credits can be "retired" (permanently burned) with an on-chain retirement certificate

#### Why It's Appealing
- Tokenized carbon credits are explicitly mentioned in the hackathon's Tokenization track examples
- ESG/climate is a hot topic that appeals to judges with an institutional background
- Showcases CRE's multi-source verification with consensus — perfect for preventing carbon credit fraud
- Privacy feature for corporate portfolios adds Arc differentiation

---

### Idea 7: StableSwap FX — Multi-Currency Stablecoin Aggregator with Live Oracle Rates

**Category:** DeFi / Onchain Finance
**Tagline:** _"Swap between any stablecoins with consensus-verified real-time FX rates"_

#### Problem
As more fiat-backed stablecoins emerge (USDC, EURC, USDT, MXNB), users and businesses need to swap between them at fair rates. Current DEXs use AMM pricing which can deviate significantly from real FX rates. There's no stablecoin-native swap that uses verified real-world exchange rates.

#### Solution
A stablecoin FX swap protocol on Arc that uses CRE workflows to fetch live FX rates from multiple data providers, achieving consensus-verified rates that mirror the real forex market. Swaps execute at fair rates with minimal slippage.

#### How It Uses the Stack

| Component | Usage |
|---|---|
| **Arc Chain** | Native stablecoin support (USDC gas, upcoming EURC/USDT). Stable ~$0.01 fees make small swaps economical. Deterministic finality for instant swap confirmation |
| **CRE Workflow** | **Cron trigger** updates on-chain FX rates every N minutes. **HTTP capability** fetches rates from multiple FX APIs (ExchangeRatesAPI, Fixer, CurrencyLayer, Open Exchange Rates) — consensus ensures accurate rates even if one provider is stale or manipulated. **EVM Write** updates on-chain rate oracle. **HTTP trigger** for on-demand rate requests from the swap UI |
| **Rust Axum Backend** | Rate history and analytics, swap routing optimization, liquidity pool management, volume tracking, treasury management tools for businesses |
| **React Router v7 Frontend** | Clean swap interface (select from/to stablecoin, amount, see rate + fee). Rate charts with historical FX data. Liquidity provider dashboard. Business treasury tools (schedule recurring swaps, multi-currency balances) |

#### Smart Contracts (Solidity on Arc)
- `FXOracle.sol` — On-chain FX rate storage, updated by CRE, with TWAP (time-weighted average price)
- `StableSwapPool.sol` — Liquidity pools for stablecoin pairs, swap execution at oracle rates
- `SwapRouter.sol` — Routes multi-hop swaps (e.g., MXNB → USDC → EURC) optimally

#### MVP Scope
1. CRE cron workflow fetches USD/EUR, USD/MXN, EUR/MXN rates from 3+ APIs every 5 min
2. Consensus-verified rates are written to the FX Oracle contract on Arc
3. Users swap between USDC/EURC at the verified FX rate via the swap UI
4. LP providers deposit stablecoins into pools and earn swap fees
5. Dashboard shows live rates, swap history, and rate deviation alerts

#### Why It's Appealing
- Directly maps to Arc's _"Stablecoin FX"_ category and _"Swap APIs for programmatic stablecoin-to-stablecoin conversion"_
- Unique because it uses CRE consensus for FX rates instead of AMM-based pricing
- Strong institutional appeal (treasury management, cross-border business payments)
- Clean, demonstrable demo: swap stablecoins and see the oracle rate update in real-time

---

### Idea 8: HedgePort — Onchain Financial Instruments & Risk Hedging Platform

**Category:** DeFi / Onchain Finance
**Tagline:** _"Institutional-grade hedging instruments, accessible to everyone, settled on stablecoins"_

#### Problem
Businesses and DeFi participants are constantly exposed to financial risks — currency fluctuations, interest rate changes, commodity price swings, and volatile crypto asset prices — but hedging tools are locked behind institutional walls. Traditional derivatives require prime brokerage accounts, high minimums, and opaque OTC deals. On-chain alternatives lack reliable price feeds and are priced via AMMs that diverge from real markets.

#### Solution
A platform on Arc that lets users create, buy, and settle financial hedging instruments (options, forwards, swaps) denominated in USDC, with pricing and settlement driven by CRE consensus-verified market data. Think of it as a self-service Bloomberg Terminal for hedging, but on-chain and open to anyone.

#### Supported Instruments (MVP picks 2-3)

| Instrument | Description | Use Case |
|---|---|---|
| **FX Forwards** | Lock in a future exchange rate for a stablecoin pair (e.g., USDC/EURC at 1.08 in 30 days) | A business receiving EUR revenue wants to lock in their USD conversion rate |
| **Covered Call Options** | Right (not obligation) to buy/sell an asset at a strike price by expiry | A crypto treasury wants downside protection on ETH holdings |
| **Interest Rate Swaps** | Swap a variable DeFi yield for a fixed rate, or vice versa | A lending protocol wants to offer fixed-rate loans but earns variable |
| **Commodity Price Hedges** | Settle based on commodity index prices (gold, oil, agricultural) | An agri-business wants to lock in grain prices for next quarter |
| **Volatility Insurance** | Pay a premium now, receive a payout if asset volatility exceeds a threshold | A market maker wants protection against black-swan vol spikes |

#### How It Uses the Stack

| Component | Usage |
|---|---|
| **Arc Chain** | USDC-denominated instruments — all collateral, premiums, and settlements are in stablecoins (no volatile token risk on the platform itself). Sub-second deterministic finality for instant trade confirmation and settlement. Opt-in privacy for institutional positions (hide notional amounts and counterparty details from public view). Stable ~$0.01 gas fees make it viable to create small-size hedges (a farmer hedging $500 of grain is economically feasible) |
| **CRE Workflow** | **Cron trigger** runs on configurable schedules: every 5 min for price feeds, daily for instrument mark-to-market, at expiry for settlement. **HTTP capability** fetches prices from multiple financial data APIs (e.g., Alpha Vantage, Twelve Data, CoinGecko, commodity APIs) — consensus across DON nodes ensures no single feed can manipulate settlement prices. **EVM Read** checks instrument state: collateral levels, expiry dates, exercise conditions, margin requirements. **EVM Write** executes critical actions: mark-to-market updates, margin calls, option exercises, forward settlements, and liquidations |
| **Rust Axum Backend** | Instrument creation wizard with risk parameter validation. Position management and portfolio aggregation. Risk analytics engine: calculate Greeks (delta, gamma, theta, vega) for options, VaR (Value at Risk) for portfolios. Margin monitoring with automated alerts. Historical price and settlement data for backtesting. Notification dispatch for margin calls, expiry reminders, settlement confirmations |
| **React Router v7 Frontend** | **Trading desk:** Create/browse instruments, view order book, execute trades. **Portfolio dashboard:** Open positions with real-time P&L, aggregated risk exposure, margin health bars. **Analytics:** Price charts with historical overlays, implied volatility surfaces, hedging efficiency metrics. **Settlement feed:** Live log of CRE-triggered settlements with verified price sources. **Risk calculator:** Input a position or portfolio, see projected P&L under different price scenarios (fan charts) |

#### Smart Contracts (Solidity on Arc)

- `InstrumentFactory.sol` — Creates new hedging instruments with configurable parameters (underlying asset, strike, expiry, collateral requirements, settlement type)
- `CollateralVault.sol` — Holds USDC collateral for both sides of a trade, handles margin calls and liquidations
- `OptionContract.sol` — European-style options: tracks premium, strike, expiry; CRE writes exercise/settle based on verified prices at expiry
- `ForwardContract.sol` — FX forwards and commodity forwards: two parties lock in a future price, CRE settles the difference at maturity
- `PriceOracle.sol` — On-chain price storage updated by CRE with TWAP and last-price for each tracked asset
- `SettlementEngine.sol` — Receives CRE settlement reports, calculates payoffs, distributes USDC from CollateralVault to winners

#### MVP Scope
1. Users create a hedging instrument (e.g., "USDC/EURC FX forward, 1000 USDC notional, rate 1.08, 14 days to expiry")
2. Counterparty accepts the trade, both sides post USDC collateral to the vault
3. CRE cron workflow fetches live FX/asset prices from 3+ APIs every 5 minutes with consensus verification
4. Prices are written to the on-chain PriceOracle; dashboard shows live mark-to-market P&L for both parties
5. If collateral drops below maintenance margin → CRE triggers a margin call or auto-liquidation
6. At expiry → CRE fetches final settlement price → writes to SettlementEngine → USDC distributed to the in-the-money party
7. All settlements are auditable on-chain with the verified price sources logged

#### Example Demo Flow (under 5 min)
1. **[0:00]** Show a business that receives EUR payments but has USD expenses — they need to hedge FX risk
2. **[0:30]** Create a USDC/EURC forward on the platform, counterparty accepts
3. **[1:00]** Show CRE workflow fetching live FX rates from 3 APIs, consensus verified
4. **[1:30]** Dashboard shows real-time mark-to-market as rates move
5. **[2:30]** Fast-forward to expiry: CRE triggers settlement, USDC redistributed based on final rate
6. **[3:30]** Show the option instrument: create a covered call, exercise it when price crosses strike
7. **[4:30]** Portfolio view with aggregated risk metrics, margin health, settlement history

#### Why It's Appealing
- **Institutional judges will love this** — hedging is the backbone of traditional finance, bringing it on-chain in a clean way is exactly what "convergence" means
- **Showcases CRE's strongest value prop:** consensus-verified financial data driving real settlement logic (not just displaying prices — actually executing payoffs based on them)
- **Arc's USDC-native design is perfect** — no one wants a derivatives platform where the settlement currency itself is volatile. USDC collateral + USDC gas = the entire platform is denominated in stable value
- **Privacy matters here** — institutional players won't show their hedge positions publicly. Arc's opt-in privacy with view keys for auditors is a genuine differentiator
- **Low fees unlock new markets** — traditional FX forwards have $100K+ minimums. With $0.01 gas on Arc, a small business can hedge a $500 invoice
- **Multiple CRE capabilities in one flow:** Cron (scheduled price feeds + expiry checks), HTTP (multi-source price data), EVM Read (instrument state), EVM Write (settlements, margin calls, liquidations)
- **Rich demo potential** — live price feeds updating, a settlement firing at expiry, margin call triggering automatically — all visible in real-time on the dashboard

---

## Idea Comparison Matrix

| # | Idea | Track | Arc Features Used | CRE Features Used | Complexity | Demo Impact |
|---|---|---|---|---|---|---|
| 1 | **StablePay** (Payroll) | DeFi | Privacy, USDC gas, Finality | Cron, HTTP, EVM Write | Medium | High |
| 2 | **OracleMarkets** (Prediction) | Prediction + AI | USDC micro-bets, Finality | Cron, HTTP, EVM R/W | High | Very High |
| 3 | **CreditVault** (Lending) | DeFi + Privacy | Privacy, USDC, View Keys | HTTP Trigger, HTTP, EVM Write | High | High |
| 4 | **SentinelFi** (Risk Monitor) | Risk / Safeguards | Finality, USDC gas | Cron, HTTP, EVM R/W | Medium | Very High |
| 5 | **AgentBazaar** (AI Agents) | AI Agents | USDC, Account Abstraction | HTTP Trigger, HTTP, EVM R/W | High | High |
| 6 | **GreenLedger** (Carbon Credits) | Tokenization / RWA | Privacy, USDC, Finality | HTTP Trigger, Cron, HTTP, EVM Write | High | High |
| 7 | **StableSwap FX** | DeFi | USDC/EURC native, Finality | Cron, HTTP, EVM Write | Medium | High |
| 8 | **HedgePort** (Risk Hedging) | DeFi | Privacy, USDC, Finality, Low fees | Cron, HTTP, EVM R/W | High | Very High |

## Recommended Pick

**For maximum impact with a manageable scope in 3 weeks, consider prioritizing:**

### Top Pick: Idea 4 — SentinelFi (Risk Monitor)
- **Why:** Medium complexity, very high demo impact. It uses every CRE capability (cron + HTTP + EVM Read + EVM Write). The live demo of a circuit breaker firing is dramatic and memorable. Judges from the DeFi/institutional world will immediately see the value. The risk monitoring category has potentially less competition than DeFi or AI tracks.

### Strong Alternate: Idea 2 — OracleMarkets (Prediction Market)
- **Why:** Prediction markets are the darling of crypto right now. Using CRE for consensus-verified event resolution is a perfect product-market fit. USDC micro-betting on Arc is novel. Higher complexity but stronger narrative.

### Wildcard: Idea 5 — AgentBazaar (AI Agent Marketplace)
- **Why:** If AI/agents are where the hype and judge attention goes, this is the play. Combines the AI agent trend with real on-chain payments. Harder to build in 3 weeks but could stand out in the AI track.

---

## Architecture Template (applies to all ideas)

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│              React Router v7 + TypeScript                        │
│         (SSR/SPA, nested routes, data loaders)                   │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Dashboard   │  │  Forms/CRUD  │  │  Real-time updates     │  │
│  │  (charts,    │  │  (create,    │  │  (WebSocket from       │  │
│  │   metrics)   │  │   edit)      │  │   Axum backend)        │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘  │
│         │                │                       │               │
└─────────┼────────────────┼───────────────────────┼───────────────┘
          │ REST API       │ REST API              │ WebSocket
          ▼                ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND (Rust)                              │
│              Axum + SQLx + PostgreSQL                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  API Routes  │  │  Background  │  │  WebSocket Hub         │ │
│  │  (handlers,  │  │  Workers     │  │  (broadcast state      │ │
│  │   auth)      │  │  (indexer,   │  │   changes to UI)       │ │
│  │              │  │   notifier)  │  │                        │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────────┘ │
│         │                 │                                      │
│         ▼                 ▼                                      │
│  ┌──────────────────────────────┐                                │
│  │       PostgreSQL (SQLx)      │                                │
│  │  - Users, entities, history  │                                │
│  │  - Event log from chain      │                                │
│  │  - Cached offchain data      │                                │
│  └──────────────────────────────┘                                │
└──────────────────────────────────────────────────────────────────┘
          │                                        ▲
          │ ethers.js / viem                        │ EVM Read/Write
          ▼                                        │
┌──────────────────────────────────────────────────────────────────┐
│                     ARC CHAIN (L1)                               │
│           EVM-compatible • USDC gas • Sub-second finality        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Smart       │  │  CRE         │  │  Cross-chain           │ │
│  │  Contracts   │  │  Forwarder   │  │  (Circle CCTP)         │ │
│  │  (Solidity)  │  │  (receives   │  │                        │ │
│  │              │  │   CRE writes)│  │                        │ │
│  └──────────────┘  └──────┬───────┘  └────────────────────────┘ │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                   CHAINLINK CRE (DON)                            │
│           TypeScript SDK • WASM compiled • Consensus             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Triggers    │  │  Callbacks   │  │  Capabilities          │ │
│  │  - Cron      │  │  (business   │  │  - HTTP Fetch          │ │
│  │  - HTTP      │  │   logic in   │  │  - EVM Read            │ │
│  │  - EVM Log   │  │   TypeScript)│  │  - EVM Write           │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  External APIs (fetched with consensus verification)         ││
│  │  - FX rates, sports scores, climate data, DeFi metrics, etc ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Pick an idea** — Decide which MVP to build based on team strengths and interests
2. **Set up Arc testnet** — Add network to MetaMask, get USDC from faucet
3. **Set up CRE** — Create account at cre.chain.link, install CLI, scaffold TypeScript project
4. **Smart contracts** — Write and deploy Solidity contracts to Arc testnet (Hardhat or Foundry)
5. **CRE workflow** — Build trigger + callback workflow in TypeScript, simulate locally
6. **Backend** — Scaffold Rust Axum project with SQLx + PostgreSQL
7. **Frontend** — Scaffold React Router v7 project with TypeScript
8. **Integrate** — Connect frontend → backend → chain → CRE
9. **Record demo** — Under 5 minutes, show the end-to-end flow
10. **Submit** — Before March 1, 2026

---

## References

- **Hackathon page:** https://chain.link/hackathon
- **CRE Docs:** https://docs.chain.link/cre
- **CRE TypeScript SDK:** https://docs.chain.link/cre/reference/sdk
- **Arc Docs:** https://docs.arc.network/arc/concepts/welcome-to-arc
- **Arc Testnet Explorer:** https://testnet.arcscan.app
- **Arc Faucet (USDC):** https://faucet.circle.com
- **Chainlink Discord:** https://discord.com/invite/chainlink
- **Chainlink Developer Hub:** https://dev.chain.link
- **CRE Getting Started:** https://docs.chain.link/cre/getting-started/overview
