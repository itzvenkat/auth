# Auth Service — Home

> **Production-grade, plug-and-play authentication microservice** built with NestJS, PostgreSQL, and Docker.

[![CI](https://github.com/itzvenkat/auth-service/actions/workflows/ci.yml/badge.svg)](https://github.com/itzvenkat/auth-service/actions)
[![npm](https://img.shields.io/npm/v/@itzvenkat/auth-service)](https://www.npmjs.com/package/@itzvenkat/auth-service)

## Features

| Feature | Details |
|---|---|
| 🔐 JWT Auth | Access tokens (15m) + Refresh tokens (7d) with rotation |
| 📧 Email Verification | Token-based, with resend support |
| 🔑 Password Management | Forgot / Reset / Change with security alert emails |
| 📱 TOTP 2FA | Google Authenticator compatible + 8 backup codes |
| 🌐 Google OAuth2 | Social login with account linking |
| 👥 RBAC | 4-tier role hierarchy: `superadmin` › `admin` › `moderator` › `user` |
| 🛂 Permissions | Fine-grained `resource:action` scopes on every role |
| 🗝️ API Keys | Machine-to-machine auth via `X-API-Key` header |
| 🛡️ Brute-force Protection | Account lockout after N failed attempts |
| 📋 Audit Logging | Full trail: every auth event with IP + user agent |
| 🔄 Session Management | List and revoke sessions per-device |
| 🏥 Health Check | `GET /health` — Docker-native |
| 🔍 Token Introspection | OIDC-compatible `POST /auth/token/introspect` |
| 📘 Swagger UI | Auto-generated docs at `/api` (dev builds) |
| 🌍 Multi-origin CORS | Comma-separated list + `*.domain.com` wildcards |
| 🐳 Docker Ready | Multi-stage Dockerfile + dev/prod Compose files |

## Wiki Pages

- [[Quick Start]]
- [[Environment Variables]]
- [[API Reference]]
- [[Roles and Permissions]]
- [[Docker Deployment]]
- [[Security]]

## Project Structure

```
auth/
├── src/
│   ├── admin/           # Admin: user management, audit logs
│   ├── auth/
│   │   ├── decorators/  # @Public  @Roles  @CurrentUser
│   │   ├── dto/         # Validated request DTOs
│   │   ├── entities/    # RefreshToken, AuditLog, ApiKey, OAuthAccount
│   │   ├── guards/      # JwtAuth, Roles, ApiKey guards
│   │   └── strategies/  # JWT, JWTRefresh, Local, Google, ApiKey
│   ├── config/          # Joi-validated env config factories
│   ├── email/           # Nodemailer + HTML email templates
│   ├── roles/           # Role entity, RBAC seeding, controller
│   └── users/           # User entity + service
├── Dockerfile
├── docker-compose.yml       # Dev: app + postgres + mailhog
├── docker-compose.prod.yml  # Prod: N100 optimised
└── .env.*.example           # Env templates per environment
```
