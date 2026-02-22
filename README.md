# @itzvenkat/auth-service

> **Production-grade, plug-and-play authentication microservice** built with NestJS, PostgreSQL, and Docker.
> Drop it in front of any app and get every auth feature you'll ever need — out of the box.

[![CI](https://github.com/itzvenkat/auth-service/actions/workflows/ci.yml/badge.svg)](https://github.com/itzvenkat/auth-service/actions)
[![npm](https://img.shields.io/npm/v/@itzvenkat/auth-service)](https://www.npmjs.com/package/@itzvenkat/auth-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 **JWT Auth** | Access tokens (15m) + Refresh tokens (7d) with rotation |
| 📧 **Email Verification** | Token-based, with resend support |
| 🔑 **Password Management** | Forgot / Reset / Change with security alert emails |
| 📱 **TOTP 2FA** | Google Authenticator compatible + 8 one-time backup codes |
| 🌐 **Google OAuth2** | Social login with account linking |
| 👥 **RBAC** | 4-tier role hierarchy: `superadmin` → `admin` → `moderator` → `user` |
| 🛂 **Permission Scopes** | Fine-grained `resource:action` permissions on every role |
| 🗝️ **API Keys** | Machine-to-machine auth via `X-API-Key` header |
| 🛡️ **Brute-force Protection** | Account lockout after N failed attempts |
| 📋 **Audit Logging** | Full trail of every auth event with IP + user agent |
| 🔄 **Session Management** | List and revoke sessions per-device |
| 🏥 **Health Check** | `GET /health` — Docker-compatible |
| 🔍 **Token Introspection** | OIDC-compatible `POST /auth/token/introspect` |
| 📘 **Swagger UI** | Auto-generated API docs at `/api` (dev only) |
| 🌍 **Multi-origin CORS** | `CORS_ORIGINS` supports comma-separated list + `*.domain.com` wildcards |
| 🐳 **Docker Ready** | Multi-stage Dockerfile + dev/prod Compose files |
| 📦 **npm Package** | Publishable as embeddable NestJS module |

---

## 🏗️ Project Structure

```
auth/
├── src/
│   ├── admin/              # Admin: user management, audit logs
│   ├── auth/
│   │   ├── decorators/     # @Public()  @Roles()  @CurrentUser()
│   │   ├── dto/            # Validated request DTOs
│   │   ├── entities/       # RefreshToken, AuditLog, ApiKey, OAuthAccount
│   │   ├── guards/         # JwtAuth, Roles, ApiKey guards
│   │   └── strategies/     # JWT, JWTRefresh, Local, Google, ApiKey
│   ├── config/             # Joi-validated env config factories
│   ├── email/              # Nodemailer + HTML email templates
│   ├── roles/              # Role entity, RBAC seeding, controller
│   └── users/              # User entity + service
├── Dockerfile              # Multi-stage production image
├── docker-compose.yml      # Dev: app + postgres + mailhog
├── docker-compose.prod.yml # Prod: app + postgres (N100 optimised)
├── .env.example            # Base env template
├── .env.development.example
├── .env.production.example
└── .github/workflows/      # CI (lint + build) + npm auto-publish
```

---

## 🚀 Quick Start

### Local Development (Docker)

```bash
# 1. Clone
git clone https://github.com/itzvenkat/auth-service.git
cd auth-service

# 2. Set up env (base + development overrides)
cp .env.example .env
cp .env.development.example .env.development
# Edit both files — most defaults work out of the box locally

# 3. Start everything (app + postgres + mailhog)
docker-compose up --build

# App         → http://localhost:3000
# Swagger UI  → http://localhost:3000/api
# Mailhog UI  → http://localhost:8025  (catch all outbound emails)
```

### Production (Mini PC / N100 / Any Server)

```bash
cp .env.example .env
cp .env.production.example .env.production
# Fill in: real JWT secrets, SMTP creds, Google OAuth IDs

docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f api
```

### Local Development (without Docker)

```bash
npm install

# Needs a running Postgres. Then:
cp .env.example .env && cp .env.development.example .env.development

npm run start:dev   # hot-reload via nodemon
```

---

## ⚙️ Environment Variables

The service loads env files in priority order:
```
.env.{NODE_ENV}   (e.g. .env.development)  ← most specific, wins
.env                                        ← shared base defaults
```

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `production` \| `staging` |
| `PORT` | `3000` | HTTP port |
| `APP_URL` | `http://localhost:3000` | Service base URL (used in email links) |
| `FRONTEND_URL` | `http://localhost:4200` | Fallback CORS origin |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins. Supports `*.domain.com` |
| **Database** | | |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `authuser` | DB user |
| `DB_PASSWORD` | — | DB password |
| `DB_DATABASE` | `authdb` | DB name |
| `DB_SSL` | — | Set `true` for SSL connections |
| **JWT** | | |
| `JWT_ACCESS_SECRET` | — | ⚠️ Required. Generate: `openssl rand -hex 64` |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token TTL |
| `JWT_REFRESH_SECRET` | — | ⚠️ Required. Use a different secret from access |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token TTL |
| **Email (SMTP)** | | |
| `SMTP_HOST` | `localhost` | SMTP server (`localhost` for Mailhog) |
| `SMTP_PORT` | `1025` | `1025` = Mailhog, `587` = Gmail/SendGrid |
| `SMTP_SECURE` | `false` | `true` for TLS (port 465/587) |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password / API key |
| `SMTP_FROM` | — | e.g. `"AuthService" <noreply@yourdomain.com>` |
| **Google OAuth** | | |
| `GOOGLE_CLIENT_ID` | — | From [console.cloud.google.com](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | — | e.g. `https://auth.yourdomain.com/auth/google/callback` |
| **Security** | | |
| `BCRYPT_SALT_ROUNDS` | `12` | Higher = slower but stronger (10 for dev, 12 for prod) |
| `MAX_LOGIN_ATTEMPTS` | `5` | Failed attempts before lockout |
| `LOCK_TIME_MINUTES` | `15` | How long account stays locked |
| `TOTP_APP_NAME` | `AuthService` | App name shown in Google Authenticator |
| **Rate Limiting** | | |
| `THROTTLE_TTL` | `60` | Rate limit window in seconds |
| `THROTTLE_LIMIT` | `100` | Max requests per window |

---

## 📡 API Reference

Base URL: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api` (development only)

---

### 🔓 Auth — Registration & Login

#### `POST /auth/register`
Register a new user. Sends a verification email.

```http
POST /auth/register
Content-Type: application/json

{
  "email": "venkat@example.com",
  "password": "MyStr0ng!Pass",
  "name": "Venkat"
}
```
```json
// 201 Created
{ "message": "Registration successful. Please check your email to verify your account." }
```

---

#### `POST /auth/login`
Login with email and password.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "venkat@example.com",
  "password": "MyStr0ng!Pass"
}
```
```json
// 200 OK — when 2FA is NOT enabled
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "venkat@example.com",
    "name": "Venkat",
    "roles": ["user"],
    "isEmailVerified": true
  }
}

// 200 OK — when 2FA IS enabled (use /auth/2fa/login to complete)
{
  "requiresTwoFactor": true,
  "preAuthToken": "eyJhbGci..."
}
```

---

#### `POST /auth/logout`
Revoke the refresh token for this session.

```http
POST /auth/logout
Authorization: Bearer <accessToken>

{ "refreshToken": "eyJhbGci..." }
```
```json
{ "message": "Logged out successfully" }
```

---

#### `POST /auth/refresh`
Get a new access token. The old refresh token is revoked (rotation).

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJhbGci..." }
```
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."   // New token — save this
}
```

---

### 📧 Email Verification

#### `GET /auth/verify-email?token=<token>`
Verify email address using the token from the verification email.

```http
GET /auth/verify-email?token=550e8400-e29b-41d4-a716-446655440000
```
```json
{ "message": "Email verified successfully. You can now log in." }
```

---

#### `POST /auth/resend-verification`
Resend the verification email (rate limited to 3/min).

```http
POST /auth/resend-verification
{ "email": "venkat@example.com" }
```

---

### 🔑 Password Management

#### `POST /auth/forgot-password`
Request a password reset link (rate limited to 3/min).

```http
POST /auth/forgot-password
{ "email": "venkat@example.com" }
```

---

#### `POST /auth/reset-password`
Reset password using the token from the email. Revokes all existing sessions.

```http
POST /auth/reset-password
{
  "token": "550e8400-...",
  "newPassword": "NewStr0ng!Pass",
  "confirmPassword": "NewStr0ng!Pass"
}
```

---

#### `POST /auth/change-password`
Change password while authenticated. Triggers a security alert email.

```http
POST /auth/change-password
Authorization: Bearer <accessToken>

{
  "currentPassword": "OldPass!",
  "newPassword": "NewStr0ng!Pass",
  "confirmPassword": "NewStr0ng!Pass"
}
```

---

### 📱 Two-Factor Authentication (TOTP)

#### `POST /auth/2fa/enable`
Begin 2FA setup. Returns a QR code to scan in Google Authenticator.

```http
POST /auth/2fa/enable
Authorization: Bearer <accessToken>
```
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "message": "Scan the QR code with your authenticator app, then verify..."
}
```

---

#### `POST /auth/2fa/verify`
Confirm setup by verifying a live TOTP code. Returns 8 backup codes (save them!).

```http
POST /auth/2fa/verify
Authorization: Bearer <accessToken>

{ "code": "123456" }
```
```json
{
  "message": "2FA enabled successfully. Save these backup codes securely.",
  "backupCodes": ["ABCD123456", "EFGH789012", "..."]
}
```

---

#### `POST /auth/2fa/disable`
Disable 2FA by providing a valid TOTP code.

```http
POST /auth/2fa/disable
Authorization: Bearer <accessToken>

{ "code": "123456" }
```

---

#### `POST /auth/2fa/login`
Full login with 2FA. Use instead of `POST /auth/login` when 2FA is enabled.

```http
POST /auth/2fa/login
{
  "email": "venkat@example.com",
  "password": "MyStr0ng!Pass",
  "totpCode": "123456"         // or a one-time backup code
}
```
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": { ... }
}
```

---

### 🌐 Social Login (Google OAuth2)

#### `GET /auth/google`
Redirect user to Google's OAuth2 consent page.

```
GET /auth/google
→ 302 Redirect to https://accounts.google.com/oauth/...
```

#### `GET /auth/google/callback`
Google redirects here after consent. Redirects to frontend with tokens in query params.

```
GET /auth/google/callback?code=...
→ 302 Redirect to {FRONTEND_URL}/auth/callback?accessToken=...&refreshToken=...
```

---

### 👤 Profile & Sessions

#### `GET /auth/me`
Get the current authenticated user's profile.

```http
GET /auth/me
Authorization: Bearer <accessToken>
```
```json
{
  "id": "uuid",
  "email": "venkat@example.com",
  "name": "Venkat",
  "roles": [{ "name": "user", "permissions": ["profile:read", "profile:write"] }],
  "isEmailVerified": true,
  "isTwoFactorEnabled": false,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

#### `PATCH /auth/me`
Update profile name or avatar.

```http
PATCH /auth/me
Authorization: Bearer <accessToken>

{ "name": "Venkat K", "avatar": "https://cdn.example.com/avatar.jpg" }
```

---

#### `GET /auth/sessions`
List all active sessions (refresh tokens) for the current user.

```http
GET /auth/sessions
Authorization: Bearer <accessToken>
```
```json
[
  {
    "id": "uuid",
    "ipAddress": "49.xxx.xxx.xxx",
    "userAgent": "Mozilla/5.0 ...",
    "createdAt": "2026-01-15T10:30:00Z"
  }
]
```

---

#### `DELETE /auth/sessions/:id`
Revoke a specific session (log out a device).

```http
DELETE /auth/sessions/550e8400-...
Authorization: Bearer <accessToken>
```

---

#### `DELETE /auth/sessions`
Revoke all sessions — log out from every device.

```http
DELETE /auth/sessions
Authorization: Bearer <accessToken>
```

---

### 🗝️ API Keys (Machine-to-Machine)

API keys use the `X-API-Key` header for authentication instead of Bearer tokens.

#### `GET /auth/api-keys`
List all API keys for the current user.

```http
GET /auth/api-keys
Authorization: Bearer <accessToken>
```
```json
[
  {
    "id": "uuid",
    "name": "My Backend Service",
    "prefix": "ak_v1_abc1",
    "scopes": ["users:read", "content:read"],
    "lastUsedAt": "2026-01-20T08:00:00Z",
    "expiresAt": null
  }
]
```

---

#### `POST /auth/api-keys`
Create a new API key. **The full key is only shown once — save it immediately.**

```http
POST /auth/api-keys
Authorization: Bearer <accessToken>

{
  "name": "My Backend Service",
  "scopes": ["users:read", "content:read"],
  "expiresAt": "2027-01-01T00:00:00Z"   // optional
}
```
```json
{
  "id": "uuid",
  "name": "My Backend Service",
  "key": "ak_v1_abc1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",  // ⚠️ Only shown once!
  "scopes": ["users:read", "content:read"]
}
```

Usage:
```http
GET /some/protected/route
X-API-Key: ak_v1_abc1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

#### `DELETE /auth/api-keys/:id`
Revoke an API key.

```http
DELETE /auth/api-keys/550e8400-...
Authorization: Bearer <accessToken>
```

---

### 🔍 Token Introspection

OIDC-compatible endpoint for downstream services to validate tokens without needing the JWT secret.

```http
POST /auth/token/introspect
Content-Type: application/json

{ "token": "eyJhbGci..." }
```
```json
// Active token
{
  "active": true,
  "sub": "user-uuid",
  "email": "venkat@example.com",
  "roles": ["user"],
  "exp": 1771234567
}

// Invalid / expired
{ "active": false }
```

---

### 👥 Roles

#### `GET /roles`
List all available roles. Requires authentication.

```http
GET /roles
Authorization: Bearer <accessToken>
```
```json
[
  { "id": "uuid", "name": "superadmin", "permissions": ["*"] },
  { "id": "uuid", "name": "admin", "permissions": ["users:*", "roles:read", "audit:read"] },
  { "id": "uuid", "name": "moderator", "permissions": ["users:read", "content:*"] },
  { "id": "uuid", "name": "user", "permissions": ["profile:read", "profile:write"] }
]
```

---

#### `POST /roles`
Create a custom role. Requires `admin` or `superadmin`.

```http
POST /roles
Authorization: Bearer <accessToken>

{
  "name": "billing-manager",
  "description": "Manages subscriptions and invoices",
  "permissions": ["billing:read", "billing:write", "users:read"],
  "isDefault": false
}
```

---

### 🔒 Admin (requires `admin` or `superadmin` role)

#### `GET /admin/users?page=1&limit=20`
List all users, paginated.

```http
GET /admin/users?page=1&limit=20
Authorization: Bearer <accessToken>
```
```json
{
  "data": [ { "id": "...", "email": "...", "status": "active", "roles": [...] } ],
  "total": 142
}
```

---

#### `PATCH /admin/users/:id/status`
Suspend, activate, or lock a user account.

```http
PATCH /admin/users/uuid/status
Authorization: Bearer <accessToken>

{ "status": "suspended" }   // "active" | "suspended" | "locked" | "pending"
```

---

#### `PATCH /admin/users/:id/roles`
Assign roles to a user.

```http
PATCH /admin/users/uuid/roles
Authorization: Bearer <accessToken>

{ "roles": ["admin", "moderator"] }
```

---

#### `GET /admin/audit-logs?page=1&limit=50&userId=<uuid>`
Paginated audit log. Filter by `userId` to see a specific user's history.

```http
GET /admin/audit-logs?page=1&limit=50
Authorization: Bearer <accessToken>
```
```json
{
  "data": [
    {
      "action": "LOGIN",
      "userId": "uuid",
      "ipAddress": "49.xxx.xxx.xxx",
      "userAgent": "Mozilla/5.0 ...",
      "success": true,
      "createdAt": "2026-02-22T17:00:00Z"
    }
  ],
  "total": 3012
}
```

---

#### `GET /health`
Simple health check (no auth required).

```http
GET /health
```
```json
{ "status": "ok", "timestamp": "2026-02-22T17:30:00.000Z", "service": "auth-service" }
```

---

## 👥 Role & Permission System

Roles use a `resource:action` permission format. Any role can carry any set of permissions.

### Built-in Role Hierarchy

| Role | Permissions | Assigned At |
|---|---|---|
| `superadmin` | `['*']` — full system access | Manually in DB |
| `admin` | `users:*, roles:read, audit:read, content:*, api-keys:*` | Via `/admin/users/:id/roles` |
| `moderator` | `users:read, content:*` | Via `/admin/users/:id/roles` |
| `user` | `profile:read, profile:write` | Automatically at registration |

> **`superadmin` vs `admin`**: `admin` has explicitly scoped permissions so they *cannot* grant themselves or others the `superadmin` role. Only `superadmin` can do that.

### Permission Format: `resource:action`

```
resource : action
users    : read | write | delete | *
roles    : read | write | *
content  : read | write | delete | *
audit    : read
billing  : read | write | *
profile  : read | write
api-keys : read | write | *
*                            ← superadmin wildcard (all resources, all actions)
```

### Common Permission Sets (copy-paste ready)

```jsonc
// Read-only API consumer
"permissions": ["users:read", "content:read"]

// Content editor
"permissions": ["content:read", "content:write"]

// Support agent
"permissions": ["users:read", "audit:read", "content:read"]

// Full user manager (everything except superadmin-tier)
"permissions": ["users:*", "roles:read", "audit:read", "content:*"]

// Billing manager
"permissions": ["billing:read", "billing:write", "users:read"]

// Bot / service account (via API key scopes too)
"permissions": ["users:read", "content:read", "content:write"]
```

---

## 🔒 Security Architecture

| Mechanism | Implementation |
|---|---|
| Password hashing | bcrypt, 12 rounds (configurable) |
| Access tokens | JWT signed with `JWT_ACCESS_SECRET`, 15m TTL |
| Refresh tokens | Stored as **bcrypt hashes** in DB — revocable per-session |
| Token rotation | Old refresh token revoked on every `/auth/refresh` call |
| API keys | Stored as **bcrypt hashes** — only shown once on creation |
| Brute-force | Account locked after N failed attempts for M minutes |
| Security headers | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| Rate limiting | Throttler on all endpoints (configurable via env) |
| CORS | Multi-origin with wildcard subdomain support |
| Audit trail | Every auth event logged with IP, user agent, and result |

---

## 🐳 Docker

```bash
# Build the image
docker build -t auth-service .

# Dev (app + postgres + mailhog)
docker-compose up --build

# Prod (N100 optimised — 512MB limit, real SMTP)
docker-compose -f docker-compose.prod.yml up -d

# Tail logs
docker-compose logs -f api

# Restart just the app
docker-compose restart api
```

---

## 📦 npm — Embedding in Your NestJS App

```bash
npm install @itzvenkat/auth-service
```

```typescript
import { AuthModule, JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '@itzvenkat/auth-service';

@Module({
  imports: [AuthModule],
})
export class AppModule {}
```

```typescript
// Protect a route
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('dashboard')
dashboard(@CurrentUser() user) {
  return `Hello ${user.email}`;
}

// Public route — skip JWT entirely
@Public()
@Get('landing')
landing() {
  return 'No auth needed';
}
```

### Publish to npm

```bash
npm run build
npm publish --access public
```

Or create a GitHub Release — the CI workflow auto-publishes on release.

---

## 📝 License

MIT © [itzvenkat](https://github.com/itzvenkat)
