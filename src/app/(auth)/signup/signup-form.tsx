"use client";

import { useActionState } from "react";
import { signupAction } from "@/lib/auth/actions";
import { EMPTY_FORM_STATE } from "@/lib/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signupAction,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field label="Your name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          aria-invalid={state.fieldErrors?.name ? true : undefined}
          autoFocus
        />
      </Field>

      <Field
        label="Organization"
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
        />
      </Field>

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 10 characters"
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          required
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
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
