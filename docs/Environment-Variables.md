# Environment Variables

Env files are loaded in priority order — the most specific file wins:

```
.env.development   (or .env.production)  ← wins on conflicts
.env                                     ← shared base
```

## Application

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `production` \| `staging` |
| `PORT` | `3000` | HTTP port |
| `APP_URL` | `http://localhost:3000` | Service base URL (used in email links) |
| `FRONTEND_URL` | `http://localhost:4200` | Fallback single CORS origin |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins. Supports `*.domain.com` wildcards |

## Database (PostgreSQL)

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | Host (use `postgres` in Docker) |
| `DB_PORT` | `5432` | Port |
| `DB_USERNAME` | `authuser` | Username |
| `DB_PASSWORD` | — | Password |
| `DB_DATABASE` | `authdb` | Database name |
| `DB_SSL` | — | Set `true` to enable SSL |

## JWT

| Variable | Default | Description |
|---|---|---|
| `JWT_ACCESS_SECRET` | — | ⚠️ **Required.** Generate: `openssl rand -hex 64` |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token TTL |
| `JWT_REFRESH_SECRET` | — | ⚠️ **Required.** Use a **different** value from access secret |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token TTL |

## Email (SMTP)

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | `localhost` | SMTP server (`localhost` = Mailhog for dev) |
| `SMTP_PORT` | `1025` | `1025` = Mailhog · `587` = Gmail/SendGrid |
| `SMTP_SECURE` | `false` | Set `true` for TLS (port 465/587) |
| `SMTP_USER` | — | Username / API key name |
| `SMTP_PASS` | — | Password / API key value |
| `SMTP_FROM` | — | e.g. `"Auth Service" <noreply@yourdomain.com>` |

## Google OAuth2

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | From [console.cloud.google.com](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_CALLBACK_URL` | e.g. `https://auth.yourdomain.com/auth/google/callback` |

## Security & Rate Limiting

| Variable | Default | Description |
|---|---|---|
| `BCRYPT_SALT_ROUNDS` | `12` | Password hashing cost (10 dev / 12 prod) |
| `MAX_LOGIN_ATTEMPTS` | `5` | Failed attempts before lockout |
| `LOCK_TIME_MINUTES` | `15` | Lockout duration |
| `TOTP_APP_NAME` | `AuthService` | Name shown in Google Authenticator |
| `THROTTLE_TTL` | `60` | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | `100` | Max requests per window |
