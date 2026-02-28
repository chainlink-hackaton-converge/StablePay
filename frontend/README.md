# StablePay Frontend

Frontend principal de StablePay (React Router v7 + TypeScript + Tailwind + wagmi/viem).

## MVP incluido

- Landing + portales Employer/Employee.
- Integracion wallet con RainbowKit.
- Sandbox Web3 (`/sandbox`) para demo tecnica de `viem + wagmi`.
- Configuracion por variables de entorno (sin hardcode de API).

## Variables de entorno

Copia `frontend/.env.example` a `frontend/.env`:

```bash
cp .env.example .env
```

Variables:

- `VITE_API_BASE_URL`: URL del backend (`http://localhost:3001/api` en local).
- `VITE_WALLETCONNECT_PROJECT_ID`: Project ID de WalletConnect Cloud.

## Desarrollo local

Desde la raiz del monorepo:

```bash
npm install
npm run frontend:dev
```

App en `http://localhost:5173`.

## Validacion

```bash
npm run typecheck -w frontend
npm run build -w frontend
```

## Deployment (Docker)

Build:

```bash
docker build -t stablepay-frontend ./frontend
```

Run:

```bash
docker run --rm -p 3000:3000 stablepay-frontend
```

## Demo rapida para hackathon

1. Abre `http://localhost:5173/sandbox`.
2. Conecta wallet con RainbowKit.
3. Muestra:
   - bloque actual Arc testnet,
   - balance wallet,
   - firma de mensaje,
   - lectura del contrato `PayrollVault` (si hay direccion configurada).

