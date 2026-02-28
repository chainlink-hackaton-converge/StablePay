# StablePay Electrobun MVP

Desktop shell para StablePay usando Electrobun, pensado para demo local en hackathon.

## Requisitos

- Bun 1.3+
- Frontend de StablePay corriendo localmente

## Ejecucion en desarrollo

1. En una terminal, inicia el frontend:

```bash
npm run frontend:dev
```

2. En otra terminal, desde este directorio:

```bash
bun install
bun run dev
```

Por defecto abre `http://127.0.0.1:5173`. Para otro target:

```bash
STABLEPAY_WEB_URL=https://tu-frontend-url bun run dev
```

## Build desktop

```bash
bun run build
```

## Package instalable

```bash
bun run package
```

