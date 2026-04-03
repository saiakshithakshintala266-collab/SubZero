# SubZero Security Guide

> Last updated: 2026-03-22  
> Environment: Next.js 16 (App Router) · Auth.js v5 (NextAuth beta)

---

## Implemented Security Measures

### 1. Password Hashing
- **Library:** `bcryptjs`
- **Cost factor:** 12 salt rounds (OWASP recommended minimum)
- **Storage:** Only the bcrypt hash (`passwordHash`) is ever written to the user store — never plaintext
- **Verification:** `bcrypt.compare()` is always called, even for unknown users, to prevent timing-based user enumeration attacks
- **Files:** `src/lib/user-store.ts`, `src/auth.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/auth/reset-password/route.ts`

### 2. Session Security
- **Strategy:** JWT
- **maxAge:** 7 days (604 800 s) for both the session and the JWT
- **updateAge:** 24 h (JWT is reissued once per day)
- **Cookie flags:**
  - `httpOnly: true` — JS cannot read the session cookie
  - `secure: true` in production — cookie only sent over HTTPS
  - `sameSite: "lax"` — protects against most CSRF vectors
  - `path: "/"` — scoped to the whole app
- **Cookie name:** `__Secure-next-auth.session-token` in production; `next-auth.session-token` in dev
- **No sensitive fields in JWT:** Only `id`, `name`, `email`, `picture`, `emailVerified` — never `passwordHash`, `verificationTokenHash`, or `resetTokenHash`
- **File:** `src/auth.ts`

### 3. Email Verification
- **Enforcement:** Proxy redirects any unverified user hitting `/dashboard/*` to `/verify-email?notice=...`
- **Token generation:** `crypto.randomBytes(32).toString("hex")` — 256 bits of entropy
- **Token storage:** Only `SHA-256(rawToken)` stored in the user record — never the raw token
- **Token expiry:** 24 hours
- **Single use:** Token fields are cleared immediately after successful verification
- **Resend rate limit:** Max 3 resends / hour / email (enforced at both the API route and `user-store` level)
- **Files:** `src/lib/user-store.ts`, `src/app/api/auth/verify-email/route.ts`, `src/app/(auth)/verify-email/page.tsx`

### 4. Password Reset
- **Token generation:** `crypto.randomBytes(32).toString("hex")`
- **Token storage:** Only `SHA-256(rawToken)` stored — never the raw token
- **Token expiry:** 1 hour
- **Single use:** Token and expiry fields cleared immediately after use
- **No user enumeration:** API always returns HTTP 200 with the same body regardless of whether the email is registered
- **Session invalidation:** By forcing re-login after reset the old JWT is naturally abandoned (implement active session kill list when adding a real DB)
- **Rate limit:** Max 3 reset requests / hour / email
- **Files:** `src/lib/user-store.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`

### 5. Rate Limiting
- **Library:** `rate-limiter-flexible` (in-memory; swap for `RateLimiterRedis` in production)

| Route | Limit | Window | Key |
|-------|-------|--------|-----|
| `POST /api/auth/signin` | 5 attempts | 15 min | IP |
| `POST /api/auth/register` | 3 attempts | 1 hour | IP |
| `POST /api/auth/forgot-password` | 3 attempts | 1 hour | IP + email |
| `POST /api/auth/verify-email` (resend) | 3 attempts | 1 hour | IP + email |

- Exceeding limits returns **HTTP 429** with `Retry-After` header
- Violations logged to console with IP and timestamp
- **File:** `src/lib/rate-limit.ts`

### 6. Environment Variables
- `.env.local` — never committed (covered by `.env*` in `.gitignore`)
- `.env.example` — committed; contains keys with empty values
- All env vars validated at startup using Zod in `src/lib/env.ts`
- **No `process.env` reads in any `"use client"` component**
- Minimum `AUTH_SECRET` length enforced: 32 characters

### 7. Input Validation & Sanitization
- **Library:** `zod`
- All auth API routes validate with Zod schemas **server-side**
- Email normalised: `.toLowerCase().trim()`
- Password rules (server-enforced): min 8 chars, uppercase, number, special character
- Name: trimmed, max 100 chars
- Generic error messages returned — internal field names never exposed
- **File:** `src/lib/validation.ts`

### 8. Security Response Headers (applied to every response)
| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | Restrictive policy — `frame-ancestors 'none'`, external scripts limited to Google |

- **File:** `src/proxy.ts`

### 9. Route Protection
| Path pattern | Rule |
|-------------|------|
| `/dashboard/*`, `/agent/*`, `/settings/*` | Session **and** verified email required |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Redirect to `/dashboard` if already authenticated |
| `/verify-email` | Public, but shows notice banner if redirected from proxy |
| `/`, `/scan` | Always public |
| `/_next/*`, `/api/auth/*` | Always public (Next.js internals + auth handlers) |

- **File:** `src/proxy.ts`

### 10. API Route Security
- Every sensitive route validates `Content-Type: application/json`
- Password hashes, tokens, expiry dates are **never** returned in API responses
- Consistent JSON error format: `{ error: string }`
- HTTP status codes used correctly (400, 401, 409, 410, 415, 422, 429)

---

## Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_SECRET` | 32+ char random string for JWT signing | **Yes** |
| `NEXTAUTH_URL` | Full URL of the app (e.g. `https://subzero.ai`) | In production |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For Google login |
| `DATABASE_URL` | Full DB connection string | When using a real DB |
| `EMAIL_SERVER_HOST` | SMTP hostname | For email sending |
| `EMAIL_SERVER_PORT` | SMTP port (usually 587) | For email sending |
| `EMAIL_SERVER_USER` | SMTP username | For email sending |
| `EMAIL_SERVER_PASSWORD` | SMTP password | For email sending |
| `EMAIL_FROM` | Sender address, e.g. `SubZero <noreply@subzero.ai>` | For email sending |

### Generating `AUTH_SECRET`
```bash
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## How to Rotate Secrets

### Rotating `AUTH_SECRET`
1. Generate a new secret: `openssl rand -base64 32`
2. Update `.env.local` (and your production secret manager)
3. Redeploy — **all existing sessions will be immediately invalidated**; users must log in again

### Rotating Google OAuth credentials
1. Create new credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Redeploy — Google sessions will require re-authorisation

---

## End-to-End Auth Flow (Development)

### Sign Up → Verify → Access Dashboard
1. Go to `/signup`
2. Fill form (password must have uppercase + number + symbol)
3. After submitting, check the **dev server console** for the verification URL:
   ```
   📧  [DEV] Verification link for email@example.com:
       http://localhost:3001/verify-email?token=<64-char-hex>
   ```
4. Open the link — page auto-verifies and redirects to `/dashboard`

### Log In
1. Go to `/login`
2. Use demo credentials: `demo@subzero.ai` / `D3m0User!`
   (shown only in development mode)

### Forgot Password
1. Go to `/forgot-password`
2. Enter your email
3. Check the **dev server console** for the reset URL:
   ```
   📧  [DEV] Password reset link for email@example.com:
       http://localhost:3001/reset-password?token=<64-char-hex>
   ```
4. Open the link, set a new password
5. Log in with the new password

---

## Production Readiness Checklist

- [ ] Replace in-memory user store (`src/lib/user-store.ts`) with Prisma + PostgreSQL
- [ ] Replace in-memory rate limiter with `RateLimiterRedis` (e.g. Upstash)
- [ ] Implement `sendVerificationEmail()` using Nodemailer / Resend / SendGrid
- [ ] Implement `sendPasswordResetEmail()` using the same email provider
- [ ] Set `AUTH_SECRET` to a real 32+ char random secret in production
- [ ] Set `NEXTAUTH_URL` to the production domain
- [ ] Configure Google OAuth redirect URIs for the production domain
- [ ] Enable HTTPS — `Strict-Transport-Security` is already set in headers
- [ ] Add active session revocation (store JWT `jti` in DB; check on each request)
- [ ] Add audit logging for all auth events (sign-in, sign-up, password reset, etc.)
- [ ] Set up monitoring/alerts for rate-limit breaches

---

## Security Contact

Report vulnerabilities privately to: **security@subzero.ai**
