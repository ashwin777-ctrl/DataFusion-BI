import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Form field wrapper: label + control + optional error message, wired for
 * accessibility. The label is associated via htmlFor/id; when `error` is set it is
 * exposed through aria-describedby and announced (role="alert"), and the caller
 * should pass aria-invalid on the control. No hooks — safe in any component.
 */
export function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-secondary-foreground"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
