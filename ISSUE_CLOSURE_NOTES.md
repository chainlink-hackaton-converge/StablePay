# Issue Closure Notes (Hackathon)

Este archivo resume los avances listos para reportar/cerrar.

## #1 Electrobun MVP

- Se agrego un MVP desktop en `desktop/electrobun-stablepay`.
- Abre StablePay como app de escritorio apuntando a `http://127.0.0.1:5173` (configurable con `STABLEPAY_WEB_URL`).
- Incluye scripts de desarrollo, build y package con Electrobun.

## #6 Frontend MVP & Deployment

- Se elimino el hardcode de API y se paso a `VITE_API_BASE_URL`.
- Se agrego `frontend/.env.example` para configuracion reproducible.
- Se documento flujo de build/deploy Docker en `frontend/README.md`.
- Se incorporo ruta de demo tecnica `/sandbox` para mostrar valor agregado en frontend.

## #8 electrobun + viem + rainbow sandbox

- Integracion real de RainbowKit + wagmi en el root del frontend.
- Integracion viem/wagmi con:
  - lectura de ultimo bloque Arc,
  - balance de wallet conectada,
  - firma de mensaje,
  - lectura de contrato PayrollVault con ABI tipada.
- Componente `WalletConnect` reutilizable en portales Employer/Employee.

