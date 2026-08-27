import { z } from "zod";

/**
 * Auth input validation (PRD FR-1.2). Shared by the server actions (authoritative)
 * and safe to import into client forms. Email is normalized to lowercase so the
 * users.email UNIQUE index treats "A@x.com" and "a@x.com" as one account.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(320, "Email is too long")
  .email("Enter a valid email address")
  .toLowerCase();

// Signup enforces a real floor; login only checks non-empty so we never leak the
// policy to an attacker probing existing accounts. 200-char ceiling bounds the
// argon2 work (defense against a hash-flooding DoS).
export const newPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200, "Password is too long");

export const nameSchema = z
  .string()
  .trim()
  .max(120, "Name is too long")
  .transform((v) => (v.length > 0 ? v : null));

export const orgNameSchema = z
  .string()
  .trim()
  .min(2, "Organization name is required")
  .max(80, "Organization name is too long");

export const signupSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  name: nameSchema,
  orgName: orgNameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Derive a URL-safe slug base from a display name. Uniqueness is NOT guaranteed
 * here — the caller resolves collisions against the DB (see accounts.ts), because
 * the organizations table is RLS-scoped and can't be enumerated from app code.
 *
 * NFKD + a strict [a-z0-9] filter folds accented letters to their base form where
 * the decomposition allows ("Ölfäß" → "olfass"-ish) and drops anything else; the
 * separator collapse keeps the result clean. Exact transliteration isn't a goal —
 * a readable, stable, URL-safe token is.
 */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // any non-alphanumeric run → single separator
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, ""); // the slice may have cut mid-separator
  return base || "org";
}
