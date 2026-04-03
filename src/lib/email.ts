/**
 * src/lib/email.ts — Transactional email via Resend
 *
 * Three email types:
 *  - sendVerificationEmail  → account sign-up
 *  - sendPasswordResetEmail → forgot password
 *  - sendResendVerification → resend verification code
 *
 * Security:
 *  - Raw tokens NEVER logged or returned in API responses
 *  - All links use NEXTAUTH_URL (never localhost in production)
 *  - Fails silently in dev if RESEND_API_KEY is not set (keeps console.log fallback)
 */
import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM    = process.env.EMAIL_FROM    ?? "SubZero <onboarding@resend.dev>";
const APP_URL = process.env.NEXTAUTH_URL  ?? "http://localhost:3000";
const APP_NAME = "SubZero";

// ── Shared HTML helpers ───────────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d4f3c 0%,#1a6b52 100%);padding:32px 40px;text-align:center;">
            <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
              ❄ ${APP_NAME}
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafb;padding:24px 40px;border-top:1px solid #e8ecf0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#8a9bb0;line-height:1.6;">
              This email was sent by ${APP_NAME} · Subscription management made simple.<br/>
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function primaryButton(href: string, text: string): string {
  return `<a href="${href}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:linear-gradient(135deg,#0d4f3c,#1a6b52);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">${text}</a>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#0d1b2a;letter-spacing:-0.5px;">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.7;">${text}</p>`;
}

function fallback(url: string): string {
  return `<p style="margin:16px 0 0;font-size:12px;color:#8a9bb0;">
    Or paste this link in your browser:<br/>
    <span style="color:#0d4f3c;word-break:break-all;">${url}</span>
  </p>`;
}

// ── Email senders ─────────────────────────────────────────────────────────────

export interface EmailResult {
  sent: boolean;
  error?: string;
}

/**
 * Send account verification email after sign-up.
 * @param email   Recipient email
 * @param name    User's display name
 * @param token   Raw verification token (included in URL — never stored raw in DB)
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<EmailResult> {
  const url = `${APP_URL}/verify-email?token=${token}`;

  if (!resend) {
    // Dev fallback — logs to console when Resend not configured
    console.log(`\n📧  [DEV] Verification link for ${email}:\n    ${url}\n`);
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const html = baseTemplate("Verify your SubZero email", `
    ${heading("Verify your email address")}
    ${para(`Hi ${name || "there"}, welcome to ${APP_NAME}! Please confirm your email address to activate your account.`)}
    ${primaryButton(url, "Verify Email Address")}
    ${para("This link expires in <strong>24 hours</strong>.")}
    ${fallback(url)}
  `);

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Verify your ${APP_NAME} account`,
    html,
  });

  if (error) {
    console.error("[email] sendVerificationEmail error:", error);
    return { sent: false, error: error.message };
  }
  return { sent: true };
}

/**
 * Send verification email again (resend flow).
 * Identical template to sign-up — avoids confusion.
 */
export async function sendResendVerificationEmail(
  email: string,
  token: string
): Promise<EmailResult> {
  const url = `${APP_URL}/verify-email?token=${token}`;

  if (!resend) {
    console.log(`\n📧  [DEV] Resent verification link for ${email}:\n    ${url}\n`);
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const html = baseTemplate("Verify your SubZero email", `
    ${heading("New verification link")}
    ${para(`You requested a new verification email. Click below to confirm your address.`)}
    ${primaryButton(url, "Verify Email Address")}
    ${para("This link expires in <strong>24 hours</strong>.")}
    ${fallback(url)}
  `);

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Verify your ${APP_NAME} account`,
    html,
  });

  if (error) {
    console.error("[email] sendResendVerificationEmail error:", error);
    return { sent: false, error: error.message };
  }
  return { sent: true };
}

/**
 * Send password reset link.
 * @param email    Recipient email
 * @param token    Raw reset token (valid for 1 hour)
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<EmailResult> {
  const url = `${APP_URL}/reset-password?token=${token}`;

  if (!resend) {
    console.log(`\n📧  [DEV] Password reset link for ${email}:\n    ${url}\n`);
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const html = baseTemplate("Reset your SubZero password", `
    ${heading("Reset your password")}
    ${para("We received a request to reset the password for your account. Click the button below to choose a new password.")}
    ${primaryButton(url, "Reset Password")}
    ${para("This link expires in <strong>1 hour</strong>. If you didn't request a reset, no action is needed — your password remains unchanged.")}
    ${fallback(url)}
  `);

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Reset your ${APP_NAME} password`,
    html,
  });

  if (error) {
    console.error("[email] sendPasswordResetEmail error:", error);
    return { sent: false, error: error.message };
  }
  return { sent: true };
}
