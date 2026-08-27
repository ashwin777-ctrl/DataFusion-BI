"use client";

import { useActionState } from "react";
import { createOrgAction } from "@/lib/auth/actions";
import { EMPTY_FORM_STATE } from "@/lib/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createOrgAction,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field
        label="Organization name"
        htmlFor="orgName"
        error={state.fieldErrors?.orgName}
      >
        <Input
          id="orgName"
          name="orgName"
          type="text"
          autoComplete="organization"
          placeholder="Acme Analytics"
          aria-invalid={state.fieldErrors?.orgName ? true : undefined}
          required
          autoFocus
        />
      </Field>

      {state.formError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {state.formError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating..." : "Create organization"}
      </Button>
    </form>
  );
}
