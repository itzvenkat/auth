# Postman Setup Guide

## 1. Import Files

1. Open Postman → click **Import**
2. Drag and drop **both files** from this folder:
   - `Auth Service.postman_collection.json`
   - `Auth Service - Local.postman_environment.json`
3. Select **Auth Service - Local** from the environment dropdown (top-right)

---

## 2. Start the Services

```bash
docker-compose up --build

# App        → http://localhost:3000
# Swagger    → http://localhost:3000/api
# Mailhog    → http://localhost:8025   ← catches all outbound emails
```

---

## 3. Mailhog — Local Email Testing

Mailhog intercepts every email the service sends during development. No real email is ever delivered — everything lands in the Mailhog inbox at **http://localhost:8025**.

### How to use it

```
Register a user → auth service sends a verification email
                       ↓
              Open http://localhost:8025
                       ↓
         Click the verification email in the inbox
                       ↓
        Copy the token from the link in the email body
        (e.g. ?token=550e8400-e29b-41d4-a716-446655440000)
                       ↓
     Paste into Postman → Environments → emailVerificationToken
```

### Step-by-step for email verification

1. **POST `/auth/register`** — returns `{ "message": "Registration successful..." }`
2. Go to **http://localhost:8025** → open the inbox
3. Click the email titled **"Verify your email"**
4. In the email body, find the verification link:
   ```
   http://localhost:3000/auth/verify-email?token=YOUR_TOKEN_HERE
   ```
5. Copy `YOUR_TOKEN_HERE`
6. In Postman → **Environments** → set `emailVerificationToken` = `YOUR_TOKEN_HERE`
7. Run **GET `/auth/verify-email`** — the token is inserted automatically via `{{emailVerificationToken}}`

### Step-by-step for password reset

1. **POST `/auth/forgot-password`** with your email
2. Go to **http://localhost:8025** → open "Reset your password" email
3. Copy the token from the reset link
4. In Postman → **Environments** → set `passwordResetToken`
5. Run **POST `/auth/reset-password`**

### Emails sent by the service

| Trigger | Email Subject |
|---|---|
| Register | Verify your email address |
| Email verified | Welcome to Auth Service |
| Forgot password | Reset your password |
| Password changed | Security alert: password changed |
| 2FA enabled | Security alert: 2FA enabled |
| 2FA disabled | Security alert: 2FA disabled |
| Password reset | Security alert: password was reset |

---

## 4. Happy Path (full flow)

Run these in order to test the entire auth lifecycle:

```
1. POST /auth/register
2. [Mailhog] copy emailVerificationToken → paste in environment
3. GET  /auth/verify-email          ← verifies account
4. POST /auth/login                 ← accessToken + refreshToken auto-saved
5. GET  /auth/me                    ← confirm profile
6. POST /auth/2fa/enable            ← get QR code
7. [Authenticator app] scan QR
8. POST /auth/2fa/verify            ← confirm TOTP code, backupCodes saved
9. POST /auth/logout
```

---

## 5. Auto-Populated Variables Reference

These variables are set automatically by test scripts — no copy-paste needed:

| Variable | Set by |
|---|---|
| `accessToken` | Login, 2FA Login, Refresh Token |
| `refreshToken` | Login, 2FA Login, Refresh Token |
| `userId` | Login |
| `sessionId` | List Sessions |
| `apiKey` | Create API Key *(shown only once)* |
| `apiKeyId` | Create / List API Keys |
| `targetUserId` | List Users |
| `backupCodes` | Verify 2FA Setup |

**Must paste manually** (from Mailhog):
- `emailVerificationToken`
- `passwordResetToken`
