"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAccount, authenticate, markLoggedIn, createOrganization } from "./accounts";
import {
  createSession,
  revokeSessionByToken,
  setActiveOrg,
  listUserOrgs,
} from "./session";
import { getSession } from "./current-user";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  clearCookieOptions,
} from "./cookies";
import { signupSchema, loginSchema, orgNameSchema } from "./validation";
import type { FormState } from "./form-state";

/**
 * Auth server actions (PRD FR-1.2/1.4). These are the ONLY place the session cookie
 * is written, because Server Components may read but not mutate cookies. Each action
 * validates input, calls the account/session services, sets the cookie, and then
 * redirect()s — the redirect throws NEXT_REDIRECT and must stay OUTSIDE any catch so
 * it propagates. Expected failures (bad input, taken email) come back as state for
 * useActionState to render; genuine faults are left to throw (→ 500).
 */

/** Collapse a ZodError's issues into a flat { field: firstMessage } map. */
function fieldErrorsFrom(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Best-effort client metadata for the session row (audit / device list later). */
async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : (h.get("x-real-ip") ?? null);
  return { ip, userAgent: h.get("user-agent") };
}

async function issueSession(userId: string, activeOrgId: string | null) {
  const { ip, userAgent } = await requestMeta();
  const { token } = await createSession({ userId, activeOrgId, ip, userAgent });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function signupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    orgName: formData.get("orgName"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const result = await createAccount(parsed.data);
  if (!result.ok) {
    return { fieldErrors: { email: "An account with this email already exists" } };
  }

  // A brand-new account has exactly one org — make it active immediately.
  await issueSession(result.userId, result.orgId);
  redirect("/app");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const auth = await authenticate(parsed.data.email, parsed.data.password);
  if (!auth.ok) {
    // One generic message — never reveal whether the email exists.
    return { formError: "Incorrect email or password" };
  }

  // Default the active org to the user's first (alphabetical) org, if any.
  const orgs = await listUserOrgs(auth.userId);
  await issueSession(auth.userId, orgs[0]?.id ?? null);
  await markLoggedIn(auth.userId);
  redirect("/app");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSessionByToken(token);
  store.set(SESSION_COOKIE, "", clearCookieOptions());
  redirect("/login");
}

/**
 * Switch the active org. Verified server-side against the user's real membership
 * (setActiveOrg returns false for a non-member), so a forged org id is a no-op.
 */
export async function switchOrgAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const orgId = String(formData.get("orgId") ?? "");
  if (orgId && orgId !== session.activeOrg?.id) {
    await setActiveOrg({
      sessionId: session.sessionId,
      userId: session.user.id,
      orgId,
    });
  }
  redirect("/app");
}

/** Create a new org for a user who has none (onboarding), then activate it. */
export async function createOrgAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = orgNameSchema.safeParse(formData.get("orgName"));
  if (!parsed.success) {
    return { fieldErrors: { orgName: parsed.error.issues[0]!.message } };
  }

  const { orgId } = await createOrganization({
    userId: session.user.id,
    name: parsed.data,
  });
  await setActiveOrg({
    sessionId: session.sessionId,
    userId: session.user.id,
    orgId,
  });
  redirect("/app");
}
