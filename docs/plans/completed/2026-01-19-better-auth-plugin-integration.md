---
type: plan
title: "Better-Auth Plugin Integration Plan"
status: active
created: 2026-01-19
last_updated: 2026-01-19
lifecycle: active
reviewed: 2026-01-19
related_code:
  - apps/backend/src/lib/auth.ts
  - apps/backend/src/middleware/auth.ts
  - packages/database/prisma/schema.prisma
  - apps/backend/src/routes/
ai:
  priority: high
  context_load: always
  triggers: [better-auth, admin-plugin, api-key, rfid-login, rbac, authentication]
  token_budget: 3000
---

# Better-Auth Plugin Integration Plan

> **IMPLEMENTATION INSTRUCTION:** Implement this entire plan without stopping or interruption. Complete all phases sequentially from Phase 2.2 through Phase 3. Do not ask for confirmation between steps. Only pause if a critical blocker is encountered that requires user input.

**Goal**: Integrate Better-Auth Admin and API Key plugins with RFID badge authentication for offline naval base deployment

**Date**: 2026-01-19
**Status**: Active Implementation
**Target**: Phase 2.2-3 (11-17 hours)
**Timeline**: Complete by end of sprint

---

## Executive Summary

Based on your specific interests (Admin, API Key, Organization) and the critical **offline/closed system requirement**, here's what each plugin provides and whether it fits Sentinel:

| Plugin | Fits Sentinel? | Why / Why Not |
|--------|---------------|---------------|
| **Admin Plugin** | ✅ **YES** | Perfect for offline user management, session control, audit logs |
| **API Key Plugin** | ⚠️ **MAYBE** | Custom implementation already 90% done; plugin adds management UI |
| **Organization Plugin** | ❌ **NO** | Designed for multi-tenant SaaS, not single-unit RBAC |

**Key Finding**: You mentioned Organization for "role-based permissions", but that plugin is for **multi-tenant organizations** (e.g., multiple companies in a SaaS app), not role management. Better-Auth has built-in role support that's simpler and more appropriate for Sentinel.

---

## Current Implementation Status

### What's Already Built

**File**: [apps/backend/src/lib/auth.ts](../apps/backend/src/lib/auth.ts)
- better-auth v1.0.0 configured
- Email/password authentication enabled
- Session management (7-day expiry, 24-hour refresh)
- Prisma adapter connected
- **No plugins currently configured**

**File**: [apps/backend/src/middleware/auth.ts](../apps/backend/src/middleware/auth.ts)
- Session validation: ✅ Working (lines 94-126)
- API key extraction: ✅ Working (lines 61-74)
- API key validation: ❌ **Stubbed** (lines 141-143)
- Scope enforcement: ✅ Ready (lines 220-238)

**File**: [packages/database/prisma/schema.prisma](../packages/database/prisma/schema.prisma)
- `ApiKey` table: ✅ Created (lines 594-609)
  - Fields: `id`, `userId`, `key`, `name`, `scopes`, `expiresAt`, `lastUsed`
  - Relations: Links to `User` with cascade delete
  - Indexes: Optimized for lookups

**Gap**: Only API key validation logic missing (~10 lines of code at line 141-143)

---

## Plugin Analysis

### 1. Admin Plugin ✅ **RECOMMENDED**

**Official Description**: "Administrative capabilities for Better Auth"

**What It Provides**:

#### User Management (Offline-Compatible)
- `createUser()` - Create admin accounts without email verification
- `listUsers()` - View all admin accounts with pagination
- `updateUser()` - Modify user details, email, role
- `deleteUser()` - Remove admin accounts
- `banUser(reason)` / `unbanUser()` - Disable accounts with audit trail
- `setPassword()` - Admin password resets without email

#### Session Management (Offline-Compatible)
- `listSessions(userId?)` - View active sessions per user or globally
- `revokeSession(sessionId)` - Force logout specific session
- `revokeSessions(userId)` - Force logout all user sessions (e.g., after password reset)

#### User Impersonation (Support/Debugging)
- `impersonateUser(targetUserId)` - Admin becomes another user
- `stopImpersonation()` - Return to admin account
- Audit trail: Tracks who impersonated whom

#### Access Control
- Configurable: Limit admin functions to specific roles
- Example: Only "developer" role can impersonate users

**How It Works Offline**:
```typescript
// Server-side plugin config
import { admin } from "better-auth/plugins/admin"

export const auth = betterAuth({
  plugins: [
    admin({
      // Only allow admin/developer roles to use admin functions
      impersonationSessionDuration: 60 * 60, // 1 hour
    })
  ]
})

// Client-side usage (offline admin panel)
await authClient.admin.createUser({
  email: "newadmin@sentinel.mil",
  password: "SecurePassword123!",
  name: "LT Smith",
  data: { role: "quartermaster" }
})

await authClient.admin.listUsers({ limit: 50 })

await authClient.admin.revokeSession({ sessionId: "abc123" })
```

**Database Changes**:
- No new tables required
- Uses existing `User` and `Session` tables

**Offline Considerations**:
- ✅ All operations local (no external API calls)
- ✅ Works without internet connection
- ✅ No email dependency (manual account creation)
- ✅ Session management via database queries

**Benefits for Sentinel**:
1. **User Management**: Create quartermaster/admin/developer accounts without SSH access to server
2. **Security**: Ban compromised accounts immediately
3. **Audit Trail**: Track who impersonated whom (critical for military compliance)
4. **Session Control**: Revoke sessions if device stolen/lost
5. **Support**: IT staff can debug user issues by impersonating

**Implementation Complexity**: ⭐ Simple
- Add plugin to config: 5 lines
- Build admin UI: 2-4 hours (user list, create/edit forms, session viewer)
- Testing: 1-2 hours

**Recommended for Phase 2.2**: ✅ **YES** - Solves immediate admin task needs

---

### 2. API Key Plugin ⚠️ **EVALUATE vs CUSTOM**

**Official Description**: "API key-based authentication"

**What It Provides**:

#### Official Plugin Features
- API key generation with cryptographically secure random strings
- Built-in key hashing (stores hash, not plaintext)
- Expiration management
- Scope/permission support
- Automatic validation middleware

#### Your Custom Implementation (Current)
- ✅ Database table exists (schema.prisma lines 594-609)
- ✅ Key extraction from headers (middleware.ts lines 61-74)
- ✅ Scope enforcement logic ready (middleware.ts lines 220-238)
- ❌ Validation logic missing (middleware.ts lines 141-143)

**Comparison**:

| Feature | Custom (Current) | Official Plugin |
|---------|------------------|-----------------|
| Database schema | ✅ Already exists | Requires migration |
| Key extraction | ✅ Implemented | Included |
| Key validation | ❌ 10 lines missing | ✅ Built-in |
| Scope enforcement | ✅ Implemented | ✅ Built-in |
| Key generation API | ❌ Not built | ✅ Endpoints included |
| Key rotation API | ❌ Not built | ✅ Endpoints included |
| Key listing API | ❌ Not built | ✅ Endpoints included |
| Hashing algorithm | Must implement | ✅ Built-in (SHA-256) |

**Custom Implementation** (Complete the TODO):

```typescript
// Replace lines 141-143 in middleware/auth.ts
if (apiKey) {
  try {
    // Hash the provided key for lookup (if storing hashed)
    // For now, assume keys stored as-is for simplicity
    const keyData = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true }
    })

    if (!keyData) {
      authLogger.warn('API key not found')
    } else if (keyData.expiresAt < new Date()) {
      authLogger.warn('API key expired', { keyId: keyData.id })
    } else {
      // Valid API key - set request context
      req.apiKey = {
        id: keyData.id,
        name: keyData.name ?? null,
        scopes: keyData.scopes
      }

      // Update last used timestamp (async, don't await)
      prisma.apiKey.update({
        where: { id: keyData.id },
        data: { lastUsed: new Date() }
      }).catch(err => authLogger.error('Failed to update API key lastUsed', { err }))

      authLogger.debug('API key authenticated', { keyId: keyData.id })
      return next()
    }
  } catch (error) {
    authLogger.error('API key validation error', { error })
  }
}
```

**Official Plugin Implementation**:

```typescript
// In auth.ts
import { apiKey } from "better-auth/plugins/api-key"

export const auth = betterAuth({
  plugins: [
    apiKey({
      // Plugin handles validation automatically
    })
  ]
})

// Generate key via API
POST /api/auth/api-key/create
{
  "name": "Kiosk #1",
  "expiresIn": 31536000, // 1 year in seconds
  "scopes": ["read:attendance", "write:checkin"]
}

Response:
{
  "id": "key_abc123",
  "key": "sk_live_xyz789...",  // Only returned once!
  "name": "Kiosk #1",
  "scopes": ["read:attendance", "write:checkin"],
  "expiresAt": "2027-01-19T00:00:00Z"
}
```

**Migration Consideration**:
- Official plugin may use different schema than your current `ApiKey` table
- Would require data migration or schema changes
- Risk: Breaking existing kiosk setup

**DECISION: Use Official API Key Plugin** ✅

**Action Required**:
1. Remove custom `ApiKey` table from schema
2. Install official `better-auth/plugins/api-key` plugin
3. Run migration to create official API key schema
4. Migrate any existing API keys to new schema (if applicable)
5. Update middleware to use official plugin validation

**Note**: Previous custom implementation will be replaced with official plugin for better long-term maintainability and feature support.

---

### 3. Organization Plugin ❌ **NOT RECOMMENDED**

**Official Description**: "Manage your organization's members and teams"

**What It Provides**:

#### Multi-Tenant Features
- Multiple organizations per installation (e.g., Company A, Company B, Company C)
- User membership in multiple organizations
- Organization-level settings and branding
- Organization invitations via email
- Organization billing/subscription management

#### Team Features (within organization)
- Subdivide organization into teams (e.g., Engineering, Sales, Marketing)
- Team-specific permissions
- Team member management

#### Role-Based Access Control (RBAC)
- Default roles: Owner, Admin, Member
- Custom roles with dynamic creation
- Permission checking per organization
- Role hierarchy enforcement

**Example Use Case** (SaaS app):
```
Organization: Acme Corp
  - Owner: CEO (full access)
  - Admin: CTO (manage users)
  - Members: Developers (read-only)
  - Teams:
    - Engineering (has its own roles)
    - Sales (has its own roles)

Organization: XYZ Industries
  - Owner: Founder
  - Members: Staff
  - Teams: ...
```

**Why It Doesn't Fit Sentinel**:

| Organization Plugin Feature | Sentinel Reality |
|----------------------------|------------------|
| Multiple organizations | Only 1 unit (HMCS Chippawa) |
| User invitations via email | Offline system, no email |
| Organization billing | Not applicable |
| Teams (Engineering, Sales) | Divisions are personnel structure, not access control |
| Cross-organization users | Only one organization exists |

**What You Actually Need**: Simple role-based permissions

Better-Auth has **built-in role support** without the Organization plugin:

```typescript
// Simple RBAC (no Organization plugin needed)
export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "quartermaster",
        required: true,
        input: true  // Allow setting role on signup
      },
      badgeId: {
        type: "string",
        required: false,
        input: true,
        unique: true  // One badge per user
      }
    }
  }
})

// Sentinel Roles (5 total)
enum Role {
  DEVELOPER = "developer",      // Full system access
  ADMIN = "admin",              // User management, settings, audit logs
  QUARTERMASTER = "quartermaster", // Daily operations, check-ins
  EXECUTIVE = "executive",      // High-level access (TBD permissions)
  DUTY_WATCH = "duty_watch"     // Watch duties (TBD permissions)
}

// Usage in middleware
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(true)(req, res, () => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      if (!allowedRoles.includes(req.user.role || '')) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Requires one of: ${allowedRoles.join(', ')}`
        })
      }

      next()
    })
  }
}

// Apply to routes (based on corrected hierarchy)
router.post('/members', requireRole(['admin', 'developer']), createMember)
router.patch('/members/:id', requireRole(['admin', 'developer']), updateMember)
router.delete('/members/:id', requireRole(['admin', 'developer']), deleteMember)
router.get('/members', requireRole(['all']), listMembers) // All roles can view

router.post('/checkins', requireRole(['developer', 'admin', 'duty_watch', 'quartermaster']), createCheckin)
router.get('/checkins', requireRole(['all']), listCheckins)

router.post('/badges/assign', requireRole(['developer', 'admin', 'duty_watch']), assignBadge)
router.post('/badges/unassign', requireRole(['developer', 'admin', 'duty_watch']), unassignBadge)

router.post('/admin/users', requireRole(['admin', 'developer']), createAdminUser)
router.patch('/admin/users/:id', requireRole(['admin', 'developer', 'duty_watch']), updateAdminUser)
router.delete('/admin/users/:id', requireRole(['admin', 'developer']), deleteAdminUser)

router.get('/audit-logs', requireRole(['developer', 'admin', 'executive']), getAuditLogs)
router.get('/reports', requireRole(['developer', 'admin', 'executive', 'duty_watch']), getReports)

router.post('/api-keys', requireRole(['developer']), createApiKey) // Developer only
router.delete('/api-keys/:id', requireRole(['developer']), deleteApiKey)
```

**Recommendation**: ❌ **Do NOT use Organization plugin**
- Use: Built-in `user.additionalFields.role` instead
- Why: Simpler, offline-compatible, no email dependency, fits single-unit deployment

---

## RFID Authentication Exploration

You mentioned: "Users should be able to scan their Tag when they manually check someone in or out if they're logged into the Admin Panel with a positional account"

### Three Possible Approaches

#### **Option A: RFID as Primary Login** (Badge = Password)
```
User Flow:
1. Navigate to admin panel login page
2. Scan RFID badge on reader
3. System looks up badge → finds Member → creates session
4. User logged in as themselves

Implementation:
- Add RFID reader to admin workstation
- POST /api/auth/rfid-login { badge: "B12345" }
- Look up badge → get memberId → get linked User → create session
- Requires: Badge linked to User account (new database relation)
```

**Pros**:
- Fast authentication (1-2 seconds)
- No password to remember
- Native to naval workflow

**Cons**:
- Badge theft = instant access
- No second factor
- Requires Badge ↔ User linkage

#### **Option B: RFID for Action Attribution** (Shared Account + Badge Scan)
```
User Flow:
1. Shared account logged in (e.g., "quartermaster_station_1")
2. User needs to check in a member
3. System prompts: "Scan your badge to confirm"
4. User scans badge
5. Action recorded with both account AND individual identity

Implementation:
- Shared account stays logged in all day
- Before sensitive actions: Modal "Scan your badge"
- POST /api/checkins { ... } with header X-Operator-Badge: "B12345"
- Audit log records: performedBy account + actualOperator badge

Audit trail:
{
  "action": "checkin_created",
  "account": "quartermaster_station_1",
  "operator": "AB Smith (Badge B12345)",
  "timestamp": "2026-01-19T14:30:00Z"
}
```

**Pros**:
- No individual accounts needed (simpler management)
- Full audit trail (who really did it)
- Shared workstations work naturally
- Badge theft still requires physical access to logged-in terminal

**Cons**:
- Extra step per action (scan badge each time)
- Requires RFID reader at each admin workstation

#### **Option C: RFID as Second Factor** (2FA-style)
```
User Flow:
1. Enter email/password (or username/password)
2. System prompts: "Scan your badge to complete login"
3. User scans badge
4. System verifies badge matches user → creates session

Implementation:
- Use better-auth 2FA plugin (TOTP)
- Replace TOTP with RFID verification
- Badge number stored in User.rfidBadge field
- Verification: Compare scanned badge to User.rfidBadge

POST /api/auth/sign-in/email { email, password }
Response: { requiresBadge: true }

POST /api/auth/verify-badge { sessionToken, badge }
Response: { session: {...} }
```

**Pros**:
- Strong security (something you know + something you have)
- Individual accountability
- Badge theft alone can't access system

**Cons**:
- Requires every member to have a User account
- Complex account management
- Slower login (two steps)

### **DECISION: Option A** (Badge = Login) ✅

**Requirements**:
- ✅ Individual User accounts for all personnel
- ✅ RFID badge linked to User account (Badge ↔ User relation)
- ✅ Badge scan = instant login (no password)
- ✅ Five roles: Developer, Admin, Quartermaster, Executive, Duty Watch
- ✅ Requires Admin plugin for account management

**Implementation** (Phase 2.2):
1. Database: Add `badgeId` field to User table (link User ↔ Badge)
2. Auth endpoint: POST /api/auth/rfid-login { badgeNumber }
3. Lookup: Badge → Member → User → Create session
4. Frontend: Badge scan interface for login
5. Admin UI: Link/unlink badges to User accounts

**Security Considerations**:
- Badge theft = immediate access (same as password theft)
- Mitigation: Ability to disable User account remotely
- Mitigation: Badge can be unlinked from User via Admin panel
- Audit trail: All badge logins logged with timestamp and badge number

---

## Recommended Plugin Plan

### Phase 2.2 (Immediate) - 8-12 hours

#### 1. Install Official API Key Plugin (2-3 hours)
- **Remove** custom ApiKey table from schema.prisma
- **Install** better-auth API Key plugin
- **Configure** plugin in auth.ts
- **Run migration** to create official schema
- **Update middleware** to use official validation
- **Test** API key creation, validation, scope enforcement
- **Document** migration from custom to official

#### 2. Add Admin Plugin (2-3 hours)
- **Config** (15 min):
  ```typescript
  // In apps/backend/src/lib/auth.ts
  import { admin } from "better-auth/plugins/admin"

  export const auth = betterAuth({
    // ... existing config
    plugins: [
      admin({
        // Optional: Restrict impersonation to developer role only
      })
    ]
  })
  ```

- **Client Setup** (30 min):
  ```typescript
  // In admin frontend
  import { createAuthClient } from "better-auth/client"
  import { adminClient } from "better-auth/client/plugins"

  export const authClient = createAuthClient({
    baseURL: "http://localhost:3000",
    plugins: [adminClient()]
  })
  ```

- **Admin UI** (2-3 hours):
  - User list page (table with search, pagination)
  - Create user form (email, password, name, role dropdown)
  - Edit user modal (change role, reset password, ban/unban)
  - Session viewer (list active sessions per user, revoke button)
  - Audit log viewer (impersonation history)

- **Testing** (1 hour):
  - Create admin user
  - Update user role
  - Ban/unban user
  - Revoke sessions
  - Test impersonation (if using)

#### 3. Implement RFID Badge Login (3-4 hours)
- **Database** (30 min):
  - Add `badgeId` field to User table (unique, nullable)
  - Migration to add column

- **Auth Endpoint** (1 hour):
  ```typescript
  POST /api/auth/rfid-login
  {
    "badgeNumber": "B12345"
  }

  Response:
  {
    "session": { ... },
    "user": { id, email, name, role }
  }
  ```
  - Lookup: Badge → Member → User (via badgeId match)
  - Create session using better-auth
  - Return session token

- **Admin UI** (1.5 hours):
  - Badge linking interface (select user, input badge number, save)
  - Badge unlinking (remove badge from user)
  - Badge validation (verify badge exists in Member table)

- **Frontend Login** (1 hour):
  - Badge scan input (text field or RFID reader integration)
  - Call /api/auth/rfid-login
  - Store session token
  - Redirect to dashboard

- **Testing** (30 min):
  - Link badge to user
  - Login with badge
  - Verify session created
  - Test badge unlinking
  - Test non-existent badge error

#### 4. Implement 5-Role RBAC (1-2 hours)
- **Config** (30 min):
  - Add role field with 5 values
  - Create Role enum

- **Middleware** (30 min):
  - Implement requireRole() function

- **Route Protection** (30 min):
  - Apply role middleware to all routes
  - Document permission matrix

- **Admin UI** (30 min):
  - Role dropdown in user create/edit forms
  - Role badges in user list

**Deliverables**:
- ✅ Official API Key plugin working (kiosks can authenticate)
- ✅ Admin plugin integrated (user management, session control)
- ✅ RFID badge login functional
- ✅ Badge ↔ User linking in admin panel
- ✅ 5 roles implemented (Developer, Admin, Quartermaster, Executive, Duty Watch)
- ✅ Role-based route protection applied
- ✅ User management UI functional
- ✅ Session management UI functional
- ✅ Offline operation verified (no internet calls)

### Phase 3 (Next Sprint) - 3-5 hours

#### 5. API Key Management UI (2-3 hours)
- **Admin Panel Pages**:
  - List API keys (table with name, scopes, expiry, last used)
  - Create API key form (name, scopes checkboxes, expiry date)
  - Revoke/delete API key button
  - Key rotation workflow (create new, deprecate old)

- **Security**:
  - Show full key only once on creation (copy-to-clipboard)
  - Hash keys in database (official plugin handles this)
  - Audit log: Track key creation/revocation

#### 6. Permission Matrix Documentation (1 hour)
- Document what each role can access
- Create table: Role × Endpoint = Allow/Deny
- Example:
  | Endpoint | Developer | Admin | Quartermaster | Executive | Duty Watch |
  |----------|-----------|-------|---------------|-----------|------------|
  | POST /members | ✅ | ✅ | ❌ | ❌ | ❌ |
  | GET /members | ✅ | ✅ | ✅ | ✅ | ✅ |
  | DELETE /members | ✅ | ❌ | ❌ | ❌ | ❌ |
  | GET /audit-logs | ✅ | ✅ | ❌ | ✅ | ❌ |

#### 7. RFID Reader Integration (1-2 hours, optional)
- Research RFID reader hardware compatibility
- Implement USB RFID reader input handling
- Auto-submit badge number on scan
- Test with physical RFID reader

**Deliverables**:
- ✅ API key management UI complete
- ✅ Permission matrix documented
- ✅ (Optional) Physical RFID reader integration

### Phase 4+ (Future Enhancements)

#### Additional Security Features
- Audit logging for all badge logins
- Failed login attempt tracking
- Automatic account lockout after N failed attempts
- Session timeout warnings
- Password reset flow (for emergency email/password login)

---

## Critical Files

### Files to Modify (Phase 2.2)

1. **[packages/database/prisma/schema.prisma](../packages/database/prisma/schema.prisma)**
   - Lines 594-609: **REMOVE** custom ApiKey model
   - User model: **ADD** `badgeId` field (unique, nullable)
   - Action: Prepare for official API Key plugin schema

2. **[apps/backend/src/lib/auth.ts](../apps/backend/src/lib/auth.ts)**
   - Line 1: **ADD** imports for `admin` and `apiKey` plugins
   - Line 23: **ADD** plugins configuration:
     ```typescript
     plugins: [
       admin(),
       apiKey()
     ]
     ```
   - Line 30: **ADD** `user.additionalFields`:
     ```typescript
     user: {
       additionalFields: {
         role: { type: "string", defaultValue: "quartermaster", required: true },
         badgeId: { type: "string", required: false, unique: true }
       }
     }
     ```

3. **[apps/backend/src/middleware/auth.ts](../apps/backend/src/middleware/auth.ts)**
   - Lines 61-144: **REPLACE** custom API key extraction/validation with official plugin
   - Line 249: **ADD** `requireRole(allowedRoles: string[])` function

4. **New file**: `apps/backend/src/routes/auth-rfid.ts`
   - Action: Create RFID login endpoint
   - POST /api/auth/rfid-login { badgeNumber }
   - Lookup Badge → Member → User → Create session

5. **New file**: `apps/backend/src/routes/admin.ts`
   - Action: Admin routes for user/session/key management
   - GET /api/admin/users
   - POST /api/admin/users
   - PATCH /api/admin/users/:id
   - DELETE /api/admin/users/:id
   - GET /api/admin/sessions
   - DELETE /api/admin/sessions/:id
   - POST /api/admin/api-keys
   - GET /api/admin/api-keys
   - DELETE /api/admin/api-keys/:id

6. **New file**: `apps/backend/src/middleware/roles.ts`
   - Action: Role enum and permission helpers
   - Export Role enum (5 values)
   - Export role hierarchy logic

7. **All route files** (`apps/backend/src/routes/*.ts`)
   - Action: Add `requireRole()` middleware to protected endpoints

8. **New file**: `apps/backend/tests/integration/auth/rfid-login.test.ts`
   - Action: Test RFID badge login flow
   - Tests: Valid badge, invalid badge, unlinked badge, session creation

9. **New file**: `apps/backend/tests/integration/auth/admin-plugin.test.ts`
   - Action: Test admin plugin functionality
   - Tests: Create user, ban user, revoke session, list users

10. **New file**: `apps/backend/tests/integration/auth/api-key-plugin.test.ts`
    - Action: Test official API Key plugin
    - Tests: Create key, validate key, scope enforcement, expiry

---

## Plugin Compatibility Summary

| Plugin | Offline? | Email-Free? | Fits Sentinel? | Phase |
|--------|----------|-------------|----------------|-------|
| **Admin** | ✅ Yes | ✅ Yes | ✅ **PERFECT** | 2.2 |
| **API Key** (custom) | ✅ Yes | ✅ Yes | ✅ **RECOMMENDED** | 2.2 |
| **API Key** (official) | ✅ Yes | ✅ Yes | ⚠️ Consider later | 4+ |
| **Organization** | ✅ Yes | ❌ No (invites) | ❌ **WRONG FIT** | Never |
| Built-in RBAC | ✅ Yes | ✅ Yes | ✅ **PERFECT** | 3 |
| Magic Link | ❌ No email | ❌ Requires email | ❌ Can't use | Never |
| Email OTP | ❌ No email | ❌ Requires email | ❌ Can't use | Never |
| Passkey | ⚠️ Maybe | ✅ Yes | ⚠️ Needs testing | 4+ |
| JWT | ✅ Yes | ✅ Yes | ✅ Useful | 3 |

---

## ✅ DECISIONS CONFIRMED

### 1. RFID Authentication Pattern
**DECISION**: Option A (Badge = Login)
- Individual User accounts for all personnel
- Badge ↔ User linkage via `badgeId` field
- Badge scan = instant login (no password required)

### 2. Account Strategy
**DECISION**: Individual accounts (not positional)
- Every personnel member who needs system access gets a User account
- Admin plugin required for account management
- Better audit trail (know exactly who performed each action)

### 3. Role Hierarchy (5 Roles) - **CORRECTED**

**Hierarchy** (highest to lowest authority):
1. Developer
2. Admin
3. Executive (CO, XO, Coxswain, Staff Officer)
4. Duty Watch
5. Quartermaster (temp workers)

**CONFIRMED PERMISSIONS**:

1. **Developer** (Highest - Full system access)
   - Everything including DELETE operations
   - System configuration and debugging
   - API key management (create, rotate, revoke) ✅
   - Impersonation capabilities ✅
   - User management (all operations)
   - Audit log access

2. **Admin** (System management)
   - User CRUD (create, read, update, delete **all** admin accounts)
   - System settings configuration
   - Session management (view, revoke sessions)
   - **NO API key management** ❌ (Developer only)
   - **NO impersonation** ❌ (Developer only)
   - Audit log access
   - All data operations

3. **Executive** (Officers - Read-only oversight)
   - CO, XO, Coxswain, Staff Officer positions
   - View all data (members, check-ins, divisions, badges)
   - View **all logs** (including audit logs)
   - Run all reports
   - **Cannot manage or change anything** (strict read-only)
   - Oversight and reporting only

4. **Duty Watch** (Active watch operators)
   - Check-in/check-out (create, view) ✅
   - Badge management (when issues occur) ✅
   - User management: **Update** user info ✅, **NO create/delete** ❌
   - Run reports ✅
   - View data (members, divisions, etc.) ✅
   - **NO audit logs** ❌

5. **Quartermaster** (Lowest - Temp workers)
   - Check-in/check-out only ✅
   - View member details (lookup) ✅
   - **NO user management** ❌
   - **NO reports** ❌
   - **NO badge management** ❌
   - **NO audit logs** ❌
   - Minimal access - operational only

### 4. API Key Strategy
**DECISION**: Use official better-auth API Key plugin
- Remove custom implementation
- Migrate to official plugin schema
- Leverage official key management features

---

## Next Steps (After Confirmation)

1. **Confirm** RFID authentication approach (A, B, or C)
2. **Confirm** account strategy (individual vs positional)
3. **Implement** Phase 2.2 plan (4-6 hours):
   - Complete API key validation
   - Add Admin plugin
   - Build user management UI
4. **Test** offline operation (disconnect network, verify all features work)
5. **Document** admin workflows (how to create users, rotate keys, revoke sessions)

---

## Conclusion

**Recommended Plugins for Sentinel**:
- ✅ **Admin Plugin** - Essential for offline user management
- ✅ **Custom API Key** - Complete existing implementation (10 lines)
- ✅ **Built-in RBAC** - Simpler than Organization plugin
- ❌ **Organization Plugin** - Wrong tool (multi-tenant, not RBAC)

**Total Implementation**: 11-17 hours across Phase 2.2-3

**Offline-Compatible**: All recommendations work without internet

**Implementation Ready**: ✅ All decisions confirmed, ready to proceed with Phase 2.2

**Permission Matrix** (Hierarchy: Developer > Admin > Executive > Duty Watch > Quartermaster):

| Permission | Developer | Admin | Executive | Duty Watch | Quartermaster |
|------------|-----------|-------|-----------|------------|---------------|
| **Data Access** | | | | | |
| View all data | ✅ | ✅ | ✅ | ✅ | ✅ |
| View member details | ✅ | ✅ | ✅ | ✅ | ✅ |
| View audit logs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Run reports | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Member Management** | | | | | |
| Create members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete members | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Check-in/Check-out** | | | | | |
| Create check-ins | ✅ | ✅ | ❌ | ✅ | ✅ |
| View check-ins | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Badge Management** | | | | | |
| Assign/unassign badges | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage badge issues | ✅ | ✅ | ❌ | ✅ | ❌ |
| **User Management** | | | | | |
| Create admin users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update admin users | ✅ | ✅ | ❌ | ✅ | ❌ |
| Delete admin users | ✅ | ✅ | ❌ | ❌ | ❌ |
| **System Operations** | | | | | |
| Session management | ✅ | ✅ | ❌ | ❌ | ❌ |
| API key management | ✅ | ❌ | ❌ | ❌ | ❌ |
| System settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Impersonation | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Authority Level** | **5** | **4** | **3** | **2** | **1** |

**Key Differences**:
- **Developer**: Only role with API keys and impersonation
- **Admin**: Full user management but no API keys or impersonation
- **Executive**: Officers with complete read access, zero write access
- **Duty Watch**: Operational role with limited user updates, badge fixes
- **Quartermaster**: Minimal access - check-ins and member lookup only

**Remaining Clarification**:
- Confirm RFID reader hardware model (for Phase 3 physical integration)