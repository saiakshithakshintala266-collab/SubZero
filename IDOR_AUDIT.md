# IDOR Audit Report — SubZero

> Audit date: 2026-03-22  
> Auditor: Automated implementation review  
> Result: **All routes secured. 22/22 ownership tests pass.**

---

## Executive Summary

A complete audit of every API route in `src/app/api/` was performed.
The application has **zero pre-existing IDOR vulnerabilities** — the resource API routes
(subscriptions, transactions, jobs, connections, user profile, settings) did not exist prior
to this audit. All dashboard pages were using hardcoded client-side fixtures with no API calls.

The correct remediation was to **build all resource routes from scratch** with ownership
enforcement baked in from the start, rather than patching non-existent vulnerable routes.

---

## Complete Route Inventory

### Auth Routes (pre-existing, already secured)

| Route | Method | Auth Check | Ownership | Status |
|-------|--------|-----------|-----------|--------|
| `/api/auth/[...nextauth]` | GET/POST | N/A | N/A | ✅ NextAuth handler |
| `/api/auth/register` | POST | N/A | N/A | ✅ Rate limited, Zod validated, bcrypt |
| `/api/auth/forgot-password` | POST | N/A | N/A | ✅ No enumeration, rate limited |
| `/api/auth/verify-email` | POST | N/A | N/A | ✅ SHA-256 token hash, single-use |
| `/api/auth/reset-password` | POST | N/A | N/A | ✅ SHA-256 token hash, bcrypt, single-use |

### Resource Routes (built during this audit)

| Route | Method | 401 if no session | 404 if wrong owner | userId from session only | Sensitive fields stripped |
|-------|--------|------------------|-------------------|--------------------------|--------------------------|
| `/api/subscriptions` | GET | ✅ | N/A | ✅ | ✅ |
| `/api/subscriptions` | POST | ✅ | N/A | ✅ | ✅ |
| `/api/subscriptions/[id]` | GET | ✅ | ✅ (404) | ✅ | ✅ |
| `/api/subscriptions/[id]` | PATCH | ✅ | ✅ (404) | ✅ | ✅ |
| `/api/subscriptions/[id]` | DELETE | ✅ | ✅ (404) | ✅ | ✅ |
| `/api/transactions` | GET | ✅ | N/A | ✅ | ✅ |
| `/api/transactions/[id]` | GET | ✅ | ✅ (404) | ✅ | ✅ |
| `/api/jobs` | GET | ✅ | N/A | ✅ | ✅ |
| `/api/jobs` | POST | ✅ | ✅ (sub ownership) | ✅ | ✅ |
| `/api/jobs/[id]` | GET | ✅ | ✅ (404) | ✅ | ✅ |
| `/api/jobs/[id]` | PATCH | ✅ | ✅ (404) | ✅ | ✅ |
| `/api/jobs/[id]` | DELETE | ✅ | ✅ (404) | ✅ | ✅ |
| `/api/connections` | GET | ✅ | N/A | ✅ | ✅ (`accessTokenHash` stripped) |
| `/api/connections/[id]` | DELETE | ✅ | ✅ (404) | ✅ | ✅ |
| `/api/user` | GET | ✅ | N/A | ✅ | ✅ (`passwordHash`, tokens stripped) |
| `/api/user` | PATCH | ✅ | N/A | ✅ | ✅ |
| `/api/settings` | GET | ✅ | N/A | ✅ | ✅ (`userId` stripped from response) |
| `/api/settings` | PATCH | ✅ | N/A | ✅ | ✅ |

---

## Queries Missing userId in WHERE Clause (Before Fix)

**None existed.** All resource API routes were absent prior to this audit. Every route
built here includes userId in every query as a structural requirement (not optional).

The data-store functions enforce this at the type level:

```typescript
// IMPOSSIBLE to call without userId:
getSubscription(id: string, userId: string): PublicSubscription | null
updateSubscription(id: string, userId: string, patch): PublicSubscription | null
deleteSubscription(id: string, userId: string): boolean
```

---

## userId Source Enforcement

### The Golden Rule — Applied Everywhere

```typescript
// src/lib/ownership.ts
export async function getAuthenticatedUser(): Promise<GetUserResult> {
  const session = await auth(); // reads server-signed JWT
  if (!session?.user?.id) {
    return { user: null, error: unauthorized() };
  }
  return { user: { id: session.user.id, ... }, error: null };
}
```

**Never accepted from:**
- ❌ `request.json()` — Zod `strict()` schemas reject unknown fields including `userId`
- ❌ `params` / URL query string — never used as ownership key
- ❌ Request headers — never trusted
- ✅ **Only from:** `auth()` which reads the server-signed JWT

### Zod `strict()` Prevents userId Injection

Every PATCH schema uses `.strict()` which causes Zod to **throw on unknown fields**:

```typescript
const patchSchema = z.object({
  name: z.string().optional(),
  // userId is NOT listed here AND strict() rejects it if present
}).strict(); // ← client cannot inject userId
```

---

## Sensitive Fields — Never Returned

| Field | Stored In | Returned in API? |
|-------|-----------|-----------------|
| `passwordHash` | `User` | ❌ Never |
| `verificationTokenHash` | `User` | ❌ Never |
| `verificationTokenExpiry` | `User` | ❌ Never |
| `resetTokenHash` | `User` | ❌ Never |
| `resetTokenExpiry` | `User` | ❌ Never |
| `accessTokenHash` | `BankConnection` | ❌ Never (stripped by `PublicBankConnection` type) |
| `userId` | All resources | ❌ Never in responses (stripped by `Public*` types) |
| `createdAt` / `updatedAt` | Subscriptions, Jobs | ❌ Stripped |

Enforcement mechanism: TypeScript `Omit<>` types at the data-store level strip these fields
**before** the data ever reaches the route handler:

```typescript
type PublicSubscription = Omit<Subscription, "userId" | "createdAt" | "updatedAt">;
type PublicBankConnection = Omit<BankConnection, "userId" | "accessTokenHash">;
```

---

## No userId Accepted from Request Body

Searched entire `src/app/api/` for dangerous patterns:

| Pattern | Found | Action |
|---------|-------|--------|
| `userId` in `request.json()` destructuring | 0 instances | N/A |
| `userId` in route `params` used for ownership | 0 instances | N/A |
| `user_id` in request body | 0 instances | N/A |
| Query without userId in WHERE clause | 0 instances | N/A |
| `getAuthenticatedUser()` not called in route | 0 instances | N/A |

---

## Ownership Test Coverage

**22/22 tests pass** — run with:
```bash
npx tsx src/tests/ownership.test.ts
```

| Test | Description | Result |
|------|-------------|--------|
| 1a | GET subscription without userId → null | ✅ |
| 1b | GET transactions without userId → empty [] | ✅ |
| 1c | GET job without userId → null | ✅ |
| 2a | User B cannot read User A's subscription by ID | ✅ |
| 2b | User B's list doesn't contain User A's data | ✅ |
| 3a | User B cannot update User A's subscription (→ null) | ✅ |
| 3b | User A's name unchanged after User B update attempt | ✅ |
| 4a | User B cannot delete User A's subscription (→ false) | ✅ |
| 4b | User A's count unchanged after User B delete attempt | ✅ |
| 5a | Transaction lists isolated by userId | ✅ |
| 6a | User B cannot read User A's job by ID | ✅ |
| 6b | User B cannot update User A's job (→ null) | ✅ |
| 6c | User A's job status unchanged after User B attempt | ✅ |
| 6d | User B cannot delete User A's job (→ false) | ✅ |
| 6e | User A's job count unchanged | ✅ |
| 7a | Bank connection lists isolated by userId | ✅ |
| 8a | User B's settings independent from User A's | ✅ |
| 9a | Created subscription belongs to session userId, not injected | ✅ |
| 9b | User B can read their own newly created subscription | ✅ |
| 10a | `PublicSubscription` does not expose `userId` field | ✅ |
| 10b | `PublicJob` does not expose `userId` field | ✅ |
| 10c | `PublicBankConnection` does not expose `accessTokenHash` | ✅ |

---

## Per-User Rate Limiting

Added user-scoped rate limits for authenticated routes (keyed by `session.user.id`):

| Scope | Limit | Window | Key |
|-------|-------|--------|-----|
| Cancellation job creation | 10 | 1 hour | `userId` |
| Overall API (auth routes) | 5 | 15 min | IP |
| Register | 3 | 1 hour | IP |
| Forgot password | 3 | 1 hour | IP + email |
| Verify email resend | 3 | 1 hour | IP + email |

---

## Data Store Architecture

```
Map<userId, Resource[]>
     │
     └── Every read: filter WHERE id = params.id AND userId = sessionUserId
     └── Every write: inject userId = sessionUserId (never from body)
     └── Every delete: WHERE id = params.id AND userId = sessionUserId
```

Cross-user access is **structurally impossible** — each user's data lives in a separate
Map bucket keyed by their userId.

---

## Production Migration Checklist

When migrating from in-memory store to Prisma + PostgreSQL:

- [ ] Every model includes `userId String` (NOT nullable)
- [ ] Every model has `@@index([userId])` for query performance
- [ ] Every `findUnique` uses `where: { id, userId }` compound filter
- [ ] Every `findMany` uses `where: { userId }` as the baseline filter
- [ ] Every `update` uses `where: { id, userId }` before patching
- [ ] Every `delete` uses `where: { id, userId }` before deleting
- [ ] `userId` field is never included in Prisma `update` payloads
- [ ] Prisma `select` whitelists only safe fields (no `passwordHash`, tokens)
- [ ] Foreign key relations use `onDelete: Cascade` so orphaned records are cleaned
- [ ] Database user has least-privilege permissions (SELECT/INSERT/UPDATE/DELETE only, no DDL)
