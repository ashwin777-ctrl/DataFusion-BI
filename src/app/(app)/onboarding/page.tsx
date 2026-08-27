import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Create organization - BI Platform" };
export const dynamic = "force-dynamic";

/**
 * Reached only when a signed-in user belongs to no organization (requireOrg sends
 * them here). Common signup always creates an org, so this is the recovery path for
 * a user removed from all of theirs. Creating one here activates it and returns to
 * the app.
 */
export default async function OnboardingPage() {
  const session = await requireUser();
  if (session.memberships.length > 0) redirect("/app");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-plane px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-5">
          <h1 className="text-[22px] font-semibold leading-tight text-foreground">
            Create an organization
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            You&apos;re signed in as {session.user.email} but don&apos;t belong to an
            organization yet. Create one to continue.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-elev-1">
          <OnboardingForm />
        </div>

        <form action={logoutAction} className="mt-4 text-center">
          <Button type="submit" variant="link" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
