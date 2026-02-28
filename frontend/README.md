# StablePay Frontend

Main StablePay frontend (React Router v7 + TypeScript + Tailwind + wagmi/viem).

## Included MVP Scope

- Landing page + Employer and Employee portals.
- RainbowKit wallet connection.
- Web3 Sandbox (`/sandbox`) for live `viem + wagmi` demos.
- Guided onboarding modal and quick navigation menu for presentation flow.
- Environment-based configuration (no hardcoded API URLs).

## Environment Variables

Copy `frontend/.env.example` to `frontend/.env`.

```bash
cp .env.example .env
```

Variables:

- `VITE_API_BASE_URL`: backend URL (`http://localhost:3001/api` locally).
- `VITE_WALLETCONNECT_PROJECT_ID`: WalletConnect Cloud project id.
- `VITE_PAYROLL_VAULT_ADDRESS`: deployed payroll contract address.
- `VITE_INVOICE_ESCROW_ADDRESS`: deployed invoice escrow address.

## Local Development

From repository root:

```bash
npm install
npm run frontend:dev
```

App URL: `http://localhost:5173`.

## Validation

```bash
npm run typecheck -w frontend
npm run build -w frontend
```

## Docker Deployment

Build:

```bash
docker build -t stablepay-frontend ./frontend
```

Run:

```bash
docker run --rm -p 3000:3000 stablepay-frontend
```

## Hackathon Demo Flow

1. Open `http://localhost:5173`.
2. Click **Demo Guide** and follow the steps.
3. Open `/sandbox` and show:
   - wallet connection,
   - Arc testnet block read,
   - message signing,
   - `PayrollVault` contract read.
4. Open `/employer/payroll` and show the **CRE Decision Log** section.
