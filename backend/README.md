# StablePay Backend

## Simple curl smoke tests

Prerequisites:
- backend is running (default: `http://localhost:3001`)
- `curl` and `jq` installed

Run:

```bash
bash scripts/smoke_routes.sh
```

Optional custom base URL:

```bash
BASE_URL=http://localhost:3001 bash scripts/smoke_routes.sh
```

## Docker

```bash
docker build -t StablePay-backend .

# below lines are for me
# it is hour to publish some interesting projects
# and test some ARM machines

# docker build --platform=linux/amd64 -t StablePay-backend .}
# docker push myregistry.com/StablePay-backend
```
