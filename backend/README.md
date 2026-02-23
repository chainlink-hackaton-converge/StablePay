# StablePay Backend

## Bruno YAML smoke tests

Minimal Bruno OpenCollection tests are in [stablepay-api](stablepay-api) and target:
- `POST /api/auth/register`
- `POST /api/auth/login`
- unauthorized and authorized `GET /api/companies`
- `POST /api/companies`

Default base URL is `http://localhost:3001`.

Run with Bruno CLI (from this backend folder):

```bash
npx @usebruno/cli@latest run ./stablepay-api
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
