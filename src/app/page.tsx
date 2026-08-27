import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/current-user";

// Reads the session cookie, so it can never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Root entry. Sends authenticated users to the workspace and everyone else to
 * login. If the session lookup fails (e.g. DB unreachable) we treat the request as
 * unauthenticated and fall through to /login rather than 500 the front door.
 *
 * redirect() throws NEXT_REDIRECT, so it stays OUTSIDE the try/catch.
 */
export default async function RootPage() {
  let authed = false;
  try {
    authed = (await getSession()) !== null;
  } catch {
    authed = false;
  }
  redirect(authed ? "/app" : "/login");
}
