# SubZero — Deployment Guide

> Last updated: 2026-03-22

---

## Pre-Deployment Checklist

Before every production deployment, verify all of these:

### Secrets & Configuration
- [ ] All environment variables set in Railway/Render dashboard (see list below)
- [ ] `.env.local` confirmed NOT committed to git (`git status` shows it clean)  
- [ ] `DATABASE_URL` contains `?sslmode=require`
- [ ] `AUTH_SECRET` is minimum 32 random characters (`openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` matches production domain exactly (e.g., `https://app.subzero.ai`)
- [ ] No `NEXT_PUBLIC_` variables contain secrets

### OAuth & External Services
- [ ] Google OAuth redirect URIs updated for production domain:
  - `https://your-domain.com/api/auth/callback/google`
- [ ] All API keys are production keys (not development/sandbox)
- [ ] Teller webhook signing secret matches production environment

### Build & Security
- [ ] `npm run build` passes with **zero errors**
- [ ] `npm run security:audit` shows **no moderate/high/critical** vulnerabilities
- [ ] `npm run test:ownership` — **22/22 tests pass**

### Database
- [ ] Database URL uses SSL: append `?sslmode=require` to connection string
- [ ] Database firewall restricts access to app server IPs only
- [ ] Database user has minimum permissions (see below)
- [ ] Connection pool configured (PgBouncer or Prisma Accelerate)

---

## Environment Variables

Set ALL of these in your Railway/Render project settings.  
**Never** commit real values to git.

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | ✅ | 32+ char random secret. Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Full public URL, e.g., `https://app.subzero.ai` |
| `DATABASE_URL` | ✅ prod | PostgreSQL connection string with `?sslmode=require` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `EMAIL_SERVER_HOST` | ✅ prod | SMTP host (e.g., `smtp.resend.com`) |
| `EMAIL_SERVER_PORT` | ✅ prod | SMTP port (usually `465` or `587`) |
| `EMAIL_SERVER_USER` | ✅ prod | SMTP username |
| `EMAIL_SERVER_PASSWORD` | ✅ prod | SMTP password |
| `EMAIL_FROM` | ✅ prod | Sender address, e.g., `noreply@subzero.ai` |
| `TELLER_API_KEY` | Optional | Teller bank data API key |
| `TELLER_APPLICATION_ID` | Optional | Teller application ID |
| `TELLER_SIGNING_SECRET` | Optional | Teller webhook signing secret |
| `AWS_ACCESS_KEY_ID` | Optional | AWS IAM key (for S3 audit screenshots) |
| `AWS_SECRET_ACCESS_KEY` | Optional | AWS IAM secret |
| `AWS_REGION` | Optional | AWS region (e.g., `us-east-1`) |
| `AWS_S3_BUCKET` | Optional | S3 bucket name for audit screenshots |
| `NEXT_PUBLIC_APP_URL` | Optional | Public app URL for client-side links |
| `LOG_LEVEL` | Optional | `info` (default). Options: `debug/info/warn/error/silent` |
| `NODE_ENV` | Auto | Set to `production` by Railway/Render automatically |

---

## Database Security Checklist

```sql
-- Create a dedicated application user (never use superuser)
CREATE USER subzero_app WITH PASSWORD 'strong-random-password';

-- Grant only what the app needs
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO subzero_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO subzero_app;

-- Revoke public schema access
REVOKE ALL ON SCHEMA public FROM public;

-- Apply to future tables automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO subzero_app;
```

Additional database hardening:
- Enable SSL on database connection (`ssl: { rejectUnauthorized: true }`)
- Restrict database firewall to allow only your app server IP range
- Never expose port 5432 to the public internet (`0.0.0.0/0`)
- Enable database audit logging (PostgreSQL `log_statement = 'ddl'` at minimum)
- Rotate database password every 90 days
- Use PgBouncer or Prisma Accelerate for connection pooling

---

## Deploying to Railway

1. **Connect repo**: Link your GitHub repository to a Railway project
2. **Add PostgreSQL plugin**: Railway → New → Database → PostgreSQL
3. **Set environment variables**: Railway → Variables → add all from table above
4. **Set start command** (or use `railway.json`): `npm run start`
5. **Custom domain**: Railway → Settings → Domains → add your domain
6. **Verify healthcheck**: Railway will hit `/api/health` every 30s

`railway.json` at the project root handles build + deploy configuration automatically.

---

## Deploying with Docker

```bash
# Build
docker build -t subzero:latest .

# Run (pass all secrets as env vars — never bake into image)
docker run \
  -e AUTH_SECRET="<your-secret>" \
  -e DATABASE_URL="<your-db-url>" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -p 3000:3000 \
  subzero:latest
```

Or use `docker-compose`:

```yaml
version: "3.9"
services:
  app:
    image: subzero:latest
    ports:
      - "3000:3000"
    env_file: .env.local   # on server — never commit this
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Post-Deployment Verification

Run through every item after deploying:

- [ ] `https://` enforced — `http://` redirects to `https://` with 301
- [ ] `/api/health` returns `{ "status": "healthy" }` with HTTP 200
- [ ] Response headers include:
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=63072000...`
  - `X-Content-Type-Options: nosniff`
  - No `X-Powered-By` header
- [ ] Login flow works end-to-end (credentials)
- [ ] Google OAuth works with production domain
- [ ] Email verification email sends and link works
- [ ] Password reset email sends and link works
- [ ] `/dashboard` redirects to `/login` when not authenticated
- [ ] Logs appearing in Railway/Render log viewer (structured JSON)
- [ ] No secrets visible in browser dev tools (Network tab → cookies, responses)
- [ ] No secrets visible in page source (`<script>` tags)
- [ ] `/api/subscriptions` returns 401 without auth
- [ ] `npm run test:ownership` — **22/22 pass**

---

## Secret Rotation Procedures

### Rotating `AUTH_SECRET`
> ⚠️ All existing sessions are invalidated. Users must log in again.

1. Generate new secret: `openssl rand -base64 32`
2. Update in Railway/Render environment variables
3. Redeploy the application
4. Optionally notify users that they need to re-authenticate

### Rotating Database Password
1. Create new password: `openssl rand -base64 32`
2. Update in your database provider's dashboard
3. Update `DATABASE_URL` in Railway/Render with new password
4. Redeploy (the new connection string takes effect immediately)
5. Delete old password

### Rotating Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway/Render
4. Redeploy
5. Delete old credentials from Google Cloud Console

### Rotating Teller API Key
1. Generate a new API key from the [Teller dashboard](https://teller.io)
2. Update `TELLER_API_KEY` in Railway/Render
3. Redeploy
4. Revoke the old key

### Rotating AWS IAM Keys
1. Go to IAM → Users → subzero-app-user → Security credentials
2. Create new access key
3. Update `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Railway/Render
4. Redeploy
5. Deactivate and delete the old key (allow 24h buffer for propagation)

---

## Monitoring Alerts to Configure

Set up the following alerts in your log aggregator (Datadog, Logtail, etc.):

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| Error rate spike | `level: error` rate > 1% over 5min | 🔴 High | Investigate immediately |
| Auth failures | `event: auth.signin.failed` > 10/min | 🟠 Medium | Check for brute force |
| Brute force | `event: security.brute_force.critical` | 🔴 Critical | Block IP, review logs |
| Rate limit abuse | `event: security.rate_limit.exceeded` > 50/min | 🟠 Medium | Review IP patterns |
| Health check fail | `/api/health` returns non-200 | 🔴 Critical | Check DB connection |
| DB failures | `event: health.check.fail` | 🔴 Critical | Check DATABASE_URL |
| IDOR attempts | `event: security.unauthorized_access.attempt` | 🟠 Medium | Review userId patterns |

---

## Security Headers Verification

Use [securityheaders.com](https://securityheaders.com) to verify headers after deployment.

Expected grade: **A or A+**

All of these should appear in every response:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: on
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
Content-Security-Policy: default-src 'self'; ...
```

These should NOT appear:
```
X-Powered-By        ← removed by poweredByHeader: false
Server: ...         ← Railway/Render strips this
```
