# Roles and Permissions

## Role Hierarchy

Roles are seeded automatically at startup. Custom roles can be created via the API.

| Role | Default Permissions | Assigned |
|---|---|---|
| `superadmin` | `*` (everything) | Manually in DB — never via API |
| `admin` | `users:*, roles:read, audit:read, content:*, api-keys:*` | Via `PATCH /admin/users/:id/roles` |
| `moderator` | `users:read, content:*` | Via `PATCH /admin/users/:id/roles` |
| `user` | `profile:read, profile:write` | Automatically at registration |

> **`superadmin` vs `admin`:** `admin` has *explicitly scoped* permissions and **cannot** create, view, or assign the `superadmin` role. Only a superadmin can manage other superadmins. This prevents privilege escalation.

## Permission Format: `resource:action`

```
resource : action
──────────────────────────────
users    : read | write | delete | *
roles    : read | write | *
content  : read | write | delete | *
audit    : read
billing  : read | write | *
profile  : read | write
api-keys : read | write | *

*  ←  wildcard — all resources & all actions (superadmin only)
```

### Action Meanings

| Action | HTTP Methods |
|---|---|
| `read` | GET |
| `write` | POST, PUT, PATCH |
| `delete` | DELETE |
| `*` | All of the above |

## Copy-Paste Permission Sets

```jsonc
// Read-only API consumer (e.g. data pipeline, analytics)
["users:read", "content:read"]

// Content editor
["content:read", "content:write"]

// Support agent (can view users and audit trail, cannot modify)
["users:read", "audit:read", "content:read"]

// Content moderator (built-in role)
["users:read", "content:*"]

// Full user & content manager (built-in admin, minus escalation rights)
["users:*", "roles:read", "audit:read", "content:*"]

// Billing manager
["billing:read", "billing:write", "users:read"]

// Bot / service account (used with API Key scopes)
["users:read", "content:read", "content:write"]
```

## Creating a Custom Role

```http
POST /roles
Authorization: Bearer <admin_or_superadmin_token>

{
  "name": "billing-manager",
  "description": "Manages subscriptions and invoices",
  "permissions": ["billing:read", "billing:write", "users:read"],
  "isDefault": false
}
```

## Assigning Roles to a User

```http
PATCH /admin/users/:id/roles
Authorization: Bearer <admin_or_superadmin_token>

{ "roles": ["billing-manager", "user"] }
```

## Protecting Routes (NestJS Integration)

```typescript
import { Roles } from './auth/decorators/roles.decorator';
import { RolesGuard } from './auth/guards/roles.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { Public } from './auth/decorators/public.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';

// Require a specific role
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin/dashboard')
adminDashboard(@CurrentUser() user) {
  return user;
}

// Require one of multiple roles
@Roles('admin', 'moderator')
@Get('content/review')
reviewQueue() { ... }

// Skip auth entirely (public endpoint)
@Public()
@Get('landing')
landing() { ... }
```

## How Roles Appear in JWT Tokens

Every access token payload includes:

```json
{
  "sub": "user-uuid",
  "email": "venkat@example.com",
  "roles": ["user"],
  "permissions": ["profile:read", "profile:write"],
  "iat": 1740000000,
  "exp": 1740000900
}
```

Downstream services can verify the JWT and read `roles` / `permissions` without calling the auth service — making RBAC checks fast and stateless.
