# Quick Start

## Docker (Recommended)

```bash
# 1. Clone
git clone https://github.com/itzvenkat/auth-service.git
cd auth-service

# 2. Set up env files
cp .env.example .env
cp .env.development.example .env.development
# Edit both — most defaults work locally out of the box

# 3. Start everything
docker-compose up --build

# App        → http://localhost:3000
# Swagger    → http://localhost:3000/api
# Mailhog    → http://localhost:8025   (catches all sent emails)
```

## Local (without Docker)

You'll need a running PostgreSQL instance.

```bash
npm install
cp .env.example .env && cp .env.development.example .env.development

npm run start:dev   # hot-reload
```

## Production (Mini PC / N100 / Any Server)

```bash
cp .env.example .env
cp .env.production.example .env.production
# Fill in: JWT secrets, SMTP credentials, Google OAuth IDs

docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f api
```

## Multi-Environment Support

The service automatically loads the right env file based on `NODE_ENV`:

```
.env.{NODE_ENV}  → loaded first (most specific, wins on conflicts)
.env             → loaded second (shared base defaults)
```

| File | Purpose | Commit? |
|---|---|---|
| `.env` | Shared defaults (no real secrets) | ✅ Safe |
| `.env.development` | Local overrides (Mailhog, loose limits) | ❌ gitignored |
| `.env.production` | Prod secrets (SMTP, JWT keys) | ❌ gitignored |
| `.env.*.example` | Templates for each env | ✅ Safe |
