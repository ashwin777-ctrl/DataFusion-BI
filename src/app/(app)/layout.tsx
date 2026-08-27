import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/current-user";

// Everything under this group requires a signed-in user; cookie-dependent.
export const dynamic = "force-dynamic";

/**
 * Authenticated-area guard. requireUser() redirects to /login when there is no valid
 * session, so every nested route (the app shell AND onboarding) can assume a user.
 * Org selection is enforced one level deeper, in the /app shell, so onboarding can
 * run for a user who has no org yet.
 */
export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return <>{children}</>;
}
