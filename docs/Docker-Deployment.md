# Docker Deployment

## Images & Services

The service runs as three Docker containers:

| Container | Image | Purpose |
|---|---|---|
| `auth-api` | Built from `Dockerfile` | NestJS app |
| `auth-postgres` | `postgres:16-alpine` | Primary database |
| `auth-mailhog` | `mailhog/mailhog` | Dev email catcher (dev only) |

## Development

Starts the app, Postgres, and Mailhog. Hot-reload is **not** enabled in Docker — use `npm run start:dev` locally for that.

```bash
docker-compose up --build         # build + start all services
docker-compose up -d              # run in background
docker-compose logs -f api        # stream app logs
docker-compose down               # stop all
docker-compose down -v            # stop + wipe volumes (resets DB)
```

Email is caught by Mailhog — view it at **http://localhost:8025**.

## Production (Intel N100 / Any Linux host)

No Mailhog. Uses your real SMTP. Resource limits tuned for the N100 (4-core, 16GB RAM).

```bash
# First time
cp .env.example .env
cp .env.production.example .env.production
# Fill in .env.production with real secrets

docker-compose -f docker-compose.prod.yml up -d

# Useful commands
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml restart api
docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d   # upgrade
```

### Resource Limits (docker-compose.prod.yml)

| Container | CPU Limit | Memory Limit |
|---|---|---|
| `auth-api` | 1.5 cores | 512 MB |
| `auth-postgres` | 0.5 cores | 256 MB |

## Dockerfile

Multi-stage build — keeps the final image lean:

```
Stage 1 (builder): node:20-alpine
  └── npm ci --include=dev
  └── nest build
  └── npm prune --production

Stage 2 (production): node:20-alpine
  └── Non-root user (nestjs:1001)
  └── Only: dist/ + node_modules/ + package.json
  └── HEALTHCHECK via wget
```

Build the image manually:

```bash
docker build -t auth-service:latest .
docker run -p 3000:3000 --env-file .env auth-service:latest
```

## Healthcheck

The container has a built-in healthcheck:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

Docker will mark the container `unhealthy` if `/health` doesn't respond, and the `depends_on` condition will block dependent services from starting.
