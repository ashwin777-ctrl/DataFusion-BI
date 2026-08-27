import "server-only";
import { hash, verify, type Algorithm } from "@node-rs/argon2";

/**
 * Password hashing (PRD FR-1.2). Argon2id with OWASP-aligned parameters. The salt
 * is generated per-hash by the library and embedded in the returned PHC string, so
 * no separate salt column is needed. Verification is constant-time inside the lib.
 *
 * These parameters (≈19 MiB, 2 passes) target ~50–100 ms on server hardware — high
 * enough to slow offline cracking, low enough not to stall the login path. Tune via
 * the constants below if the deployment profile changes.
 */

// Argon2id is value 2 in @node-rs/argon2's Algorithm enum (and its documented
// default). We reference the value directly because that enum is an ambient
// `const enum`, which Next's isolatedModules forbids accessing by member name.
const ARGON2ID = 2 as Algorithm;

const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456, // KiB (~19 MiB)
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Verify a password against a stored PHC hash. Returns false (never throws) on a
 * malformed/legacy hash so a corrupt row can't 500 the login path — the caller
 * treats false as "invalid credentials".
 */
export async function verifyPassword(
  storedHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
