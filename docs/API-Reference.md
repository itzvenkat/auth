# API Reference

Base URL: `http://localhost:3000`
Swagger UI: `http://localhost:3000/api` *(development builds only)*

**Authentication:** Add `Authorization: Bearer <accessToken>` to protected endpoints.

---

## Auth — Register & Login

### `POST /auth/register`
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

// 409 Conflict
{ "message": "Email already registered" }
```

---

### `POST /auth/login`
Login with email and password *(rate limited: 10/min)*.

```http
POST /auth/login
Content-Type: application/json

{ "email": "venkat@example.com", "password": "MyStr0ng!Pass" }
```
```json
// 200 OK — 2FA disabled
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

// 200 OK — 2FA enabled (proceed to POST /auth/2fa/login)
{ "requiresTwoFactor": true, "preAuthToken": "eyJhbGci..." }
```

---

### `POST /auth/logout`
Revoke the current session's refresh token.

```http
POST /auth/logout
Authorization: Bearer <accessToken>

{ "refreshToken": "eyJhbGci..." }
```
```json
{ "message": "Logged out successfully" }
```

---

### `POST /auth/refresh`
Exchange a refresh token for a new token pair. Old refresh token is immediately revoked.

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJhbGci..." }
```
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."   // ← New token — update your stored value
}
```

---

## Email Verification

### `GET /auth/verify-email?token=<token>`
Verify email from the link in the verification email.

```http
GET /auth/verify-email?token=550e8400-e29b-41d4-a716-446655440000
```
```json
{ "message": "Email verified successfully. You can now log in." }
```

---

### `POST /auth/resend-verification`
Resend the verification email *(rate limited: 3/min)*.

```http
POST /auth/resend-verification
{ "email": "venkat@example.com" }
```

---

## Password Management

### `POST /auth/forgot-password`
Request a password reset link *(rate limited: 3/min)*.

```http
POST /auth/forgot-password
{ "email": "venkat@example.com" }
```

---

### `POST /auth/reset-password`
Reset password using token from email. Revokes **all existing sessions**.

```http
POST /auth/reset-password
{
  "token": "550e8400-...",
  "newPassword": "NewStr0ng!Pass",
  "confirmPassword": "NewStr0ng!Pass"
}
```

---

### `POST /auth/change-password`
Change password while authenticated. Sends a security alert email.

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

## Two-Factor Authentication (TOTP)

### `POST /auth/2fa/enable`
Begin 2FA setup. Returns a QR code to scan in Google Authenticator.

```http
POST /auth/2fa/enable
Authorization: Bearer <accessToken>
```
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "message": "Scan the QR code, then call /auth/2fa/verify with a live code."
}
```

---

### `POST /auth/2fa/verify`
Complete 2FA setup by confirming a live TOTP code. Returns **8 one-time backup codes** — save them immediately.

```http
POST /auth/2fa/verify
Authorization: Bearer <accessToken>

{ "code": "123456" }
```
```json
{
  "message": "2FA enabled. Save these backup codes securely.",
  "backupCodes": ["ABCD123456", "EFGH789012", "..."]
}
```

---

### `POST /auth/2fa/disable`
Disable 2FA by providing a valid TOTP code.

```http
POST /auth/2fa/disable
Authorization: Bearer <accessToken>

{ "code": "123456" }
```

---

### `POST /auth/2fa/login`
Full login when 2FA is enabled. Accepts a TOTP code **or** a backup code.

```http
POST /auth/2fa/login
{
  "email": "venkat@example.com",
  "password": "MyStr0ng!Pass",
  "totpCode": "123456"
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

## Social Login (Google OAuth2)

### `GET /auth/google`
Redirect to Google's OAuth2 consent page. Use this as the login button URL.

```
GET /auth/google
→ 302 → https://accounts.google.com/oauth/...
```

### `GET /auth/google/callback`
Google redirects here after consent. Redirects to your frontend with tokens in query params.

```
GET /auth/google/callback?code=...
→ 302 → {FRONTEND_URL}/auth/callback?accessToken=...&refreshToken=...
```

---

## Profile & Sessions

### `GET /auth/me`
Get the current user's profile.

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

### `PATCH /auth/me`
Update display name or avatar URL.

```http
PATCH /auth/me
Authorization: Bearer <accessToken>

{ "name": "Venkat K", "avatar": "https://cdn.example.com/avatar.jpg" }
```

---

### `GET /auth/sessions`
List all active sessions (one per device / login).

```http
GET /auth/sessions
Authorization: Bearer <accessToken>
```
```json
[
  {
    "id": "uuid",
    "ipAddress": "49.xxx.xxx.xxx",
    "userAgent": "Mozilla/5.0 (Macintosh) ...",
    "createdAt": "2026-02-22T12:00:00Z"
  }
]
```

---

### `DELETE /auth/sessions/:id`
Revoke a specific session (remote logout of one device).

```http
DELETE /auth/sessions/550e8400-...
Authorization: Bearer <accessToken>
```

---

### `DELETE /auth/sessions`
Revoke all sessions — logout from every device.

```http
DELETE /auth/sessions
Authorization: Bearer <accessToken>
```

---

## API Keys (Machine-to-Machine)

Use `X-API-Key` header instead of `Authorization: Bearer` for server-to-server calls.

### `GET /auth/api-keys`
List all API keys (shows metadata only — never the key itself again).

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

### `POST /auth/api-keys`
Create a new API key. ⚠️ **The full key is shown only once — copy it immediately.**

```http
POST /auth/api-keys
Authorization: Bearer <accessToken>

{
  "name": "Analytics Service",
  "scopes": ["users:read", "content:read"],
  "expiresAt": "2027-01-01T00:00:00Z"
}
```
```json
{
  "id": "uuid",
  "name": "Analytics Service",
  "key": "ak_v1_abc1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "scopes": ["users:read", "content:read"]
}
```

Using the key:
```http
GET /some/protected/route
X-API-Key: ak_v1_abc1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### `DELETE /auth/api-keys/:id`
Revoke an API key.

```http
DELETE /auth/api-keys/550e8400-...
Authorization: Bearer <accessToken>
```

---

## Token Introspection (OIDC)

Downstream services can validate a token without needing the JWT secret.

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

## Roles

### `GET /roles`
List all roles. Requires authentication.

```http
GET /roles
Authorization: Bearer <accessToken>
```

### `POST /roles`
Create a custom role. Requires `admin` or `superadmin`.

```http
POST /roles
Authorization: Bearer <accessToken>

{
  "name": "billing-manager",
  "description": "Manages subscriptions",
  "permissions": ["billing:read", "billing:write", "users:read"]
}
```

---

## Admin Endpoints

> All `/admin` routes require `admin` or `superadmin` role.

### `GET /admin/users?page=1&limit=20`
List users, paginated.

```json
{ "data": [...], "total": 142 }
```

### `GET /admin/users/:id`
Get a specific user by ID.

### `PATCH /admin/users/:id/status`
Change user status.

```http
{ "status": "suspended" }   // "active" | "suspended" | "locked" | "pending"
```

### `PATCH /admin/users/:id/roles`
Assign roles to a user.

```http
{ "roles": ["admin", "moderator"] }
```

### `GET /admin/audit-logs?page=1&limit=50&userId=<uuid>`
Paginated audit trail. Filter by `userId` to view a specific user's history.

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

## Health Check

```http
GET /health
```
```json
{ "status": "ok", "timestamp": "2026-02-22T17:30:00.000Z", "service": "auth-service" }
```
