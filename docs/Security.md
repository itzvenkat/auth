# Security

## Architecture Overview

| Layer | Mechanism |
|---|---|
| **Passwords** | bcrypt, 12 rounds (configurable). Never stored in plain text |
| **Access Tokens** | JWT signed with `JWT_ACCESS_SECRET`. Short-lived (15m default) |
| **Refresh Tokens** | Stored as **bcrypt hashes** in DB. Revocable per-session |
| **Token Rotation** | Old refresh token is revoked on every `/auth/refresh` call |
| **API Keys** | Stored as **bcrypt hashes**. Full key shown only once at creation |
| **Brute-force** | Account locked after N failed logins for M minutes |
| **HTTP Headers** | Helmet: CSP, HSTS, X-Frame-Options, X-XSS-Protection |
| **Rate Limiting** | Throttler on all endpoints. Tighter limits on auth-sensitive routes |
| **CORS** | Multi-origin with wildcard subdomain support via `CORS_ORIGINS` |
| **Audit Trail** | Every auth event logged with action, IP, user agent, and outcome |

## Token Lifecycle

```
Register → Email Verification → Login
                                  │
                         ┌────────┴─────────┐
                    No 2FA              2FA enabled
                         │                  │
                   accessToken       preAuthToken
                   refreshToken            │
                                   POST /auth/2fa/login
                                    (TOTP or backup code)
                                           │
                                    accessToken
                                    refreshToken
```

**Access token** — short-lived JWT (15m). Attached to every API request via `Authorization: Bearer`.

**Refresh token** — long-lived (7d). Stored only as a bcrypt hash in the DB. Used *only* to get new token pairs. Rotated on every use — prevents replay attacks.

## Brute-Force Protection

- Failed login counter incremented on every bad password attempt
- After `MAX_LOGIN_ATTEMPTS` (default: 5) failures, account status → `locked`
- `lockedUntil` timestamp set to `now + LOCK_TIME_MINUTES`
- On successful login: counter resets, status restored to `active`

## 2FA Backup Codes

- 8 random 10-character backup codes generated at 2FA setup
- Stored as **bcrypt hashes** in DB
- Each code can only be used **once** (consumed and removed after use)
- If all backup codes are used: disable + re-enable 2FA to generate new ones

## Audit Log Actions

Every event is recorded:

| Action | When |
|---|---|
| `REGISTER` | New user signs up |
| `LOGIN` | Successful login |
| `LOGIN_FAILED` | Bad credentials |
| `LOGOUT` | User logs out |
| `REFRESH_TOKEN` | Token rotation |
| `PASSWORD_CHANGE` | Password changed (authenticated) |
| `PASSWORD_RESET_REQUEST` | Forgot password requested |
| `PASSWORD_RESET` | Password reset completed |
| `EMAIL_VERIFICATION` | Email verified |
| `TWO_FACTOR_ENABLED` | 2FA turned on |
| `TWO_FACTOR_DISABLED` | 2FA turned off |
| `TWO_FACTOR_LOGIN` | Logged in with TOTP/backup code |
| `ACCOUNT_LOCKED` | Brute-force lockout |
| `OAUTH_LOGIN` | Social login (Google) |
| `API_KEY_CREATED` | New API key generated |
| `API_KEY_REVOKED` | API key revoked |
| `SESSION_REVOKED` | Single session revoked |
| `ALL_SESSIONS_REVOKED` | All sessions wiped |

## Rate Limits on Sensitive Endpoints

| Endpoint | Limit |
|---|---|
| `POST /auth/register` | 5 requests / 60s |
| `POST /auth/login` | 10 requests / 60s |
| `POST /auth/forgot-password` | 3 requests / 60s |
| `POST /auth/resend-verification` | 3 requests / 60s |
| `POST /auth/2fa/login` | 10 requests / 60s |
| All other endpoints | `THROTTLE_LIMIT` / `THROTTLE_TTL` (env configurable) |

## Production Checklist

- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are unique 64-byte random strings (`openssl rand -hex 64`)
- [ ] `BCRYPT_SALT_ROUNDS=12` (never lower than 10 in production)
- [ ] `CORS_ORIGINS` is set to your specific frontend domains (not `*`)
- [ ] `NODE_ENV=production` (disables Swagger UI, enables DB SSL etc.)
- [ ] SMTP is configured with a real provider (not Mailhog)
- [ ] DB password is strong and unique
- [ ] Docker containers are **not** exposing Postgres port publicly (`expose:` not `ports:`)
