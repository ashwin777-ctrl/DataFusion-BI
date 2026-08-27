/**
 * Shared shape for auth server-action results consumed by useActionState. Kept out
 * of actions.ts because a "use server" module may only export async functions.
 *
 * - fieldErrors: per-field message keyed by input name (email/password/orgName…)
 * - formError:   a form-level message not tied to one field (e.g. bad credentials)
 */
export type FormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
};

export const EMPTY_FORM_STATE: FormState = {};
