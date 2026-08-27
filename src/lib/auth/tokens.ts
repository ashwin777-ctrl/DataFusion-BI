import "server-only";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

/**
 * Opaque session tokens (PRD FR-1.3).
 *
 * The client holds a high-entropy random token; the database stores only its
 * keyed HMAC-SHA256 digest. Two properties fall out of this:
 *   - A database read alone yields no usable tokens (the AUTH_SECRET key is not in
 *     the DB), so leaked session rows can't be replayed.
 *   - Lookups are by digest, so we never store the raw token anywhere.
 *
 * The token is 32 random bytes, base64url-encoded. The digest is hex.
 */

const TOKEN_BYTES = 32;

/** Generate a fresh opaque token (give to the client) + its digest (store in DB). */
export function newSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

/** Keyed digest of a token, for storage and lookup. */
export function hashToken(token: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(token).digest("hex");
}

/**
 * Constant-time comparison of two hex digests. Lookups are already by digest, but
 * this is available for any direct compare so timing can't leak a match.
 */
export function digestsEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
