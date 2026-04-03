/**
 * src/lib/validation.ts
 *
 * Zod schemas for all auth inputs — used server-side only.
 * Client-side pages do basic UX validation; ALL real validation
 * happens here in the API routes.
 *
 * Zod v4 API notes:
 *  - `required_error` → `error` in z.string()
 *  - `.errors` → `.issues` on ZodError instances
 */
import { z } from "zod";

export const emailSchema = z
  .string({ error: "Email is required" })
  .email("Enter a valid email address")
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must not exceed 100 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const nameSchema = z
  .string({ error: "Name is required" })
  .min(1, "Name is required")
  .max(100, "Name must not exceed 100 characters")
  .trim();

export const registerSchema = z.object({
  name:     nameSchema,
  email:    emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email:    emailSchema,
  // Looser on login — don't leak which rule failed
  password: z.string({ error: "Password is required" }).min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token:    z.string().min(64, "Invalid reset token"),
  password: passwordSchema,
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

export const verifyEmailSchema = z.object({
  token: z.string().min(64, "Invalid verification token"),
});

/** Format Zod v4 errors into a flat user-readable string */
export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(". ");
}
