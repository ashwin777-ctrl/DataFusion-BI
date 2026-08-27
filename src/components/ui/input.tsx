import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text input (DESIGN.md §8). Uses the --input border token, raised surface, and the
 * shared focus ring. `aria-invalid` swaps the border/ring to the destructive token
 * so an invalid field reads as an error without relying on color alone (the Field
 * wrapper also renders the message text).
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-surface-raised px-3 py-2 text-sm text-foreground shadow-elev-1 transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
