import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button (DESIGN.md §8). Variants map to token roles, not raw colors:
 *   primary     — the near-black action ink (--primary), the one high-emphasis CTA
 *   secondary   — bordered surface button for secondary actions
 *   outline     — border with card surface
 *   ghost       — text-only, for low-emphasis / toolbar actions
 *   destructive — reserved --destructive; only for irreversible actions
 *   link        — inline text link styling
 * No hooks here, so it stays usable from Server Components (shadcn convention).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.975] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] hover:opacity-90",
        secondary:
          "border border-black/[0.08] dark:border-white/[0.12] bg-white/80 dark:bg-white/[0.06] backdrop-blur-md text-foreground hover:bg-white dark:hover:bg-white/10 shadow-sm",
        outline:
          "border border-black/[0.08] dark:border-white/[0.10] bg-transparent text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
        ghost:
          "text-secondary-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        link: "text-link underline-offset-4 hover:underline",
        pill: "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_2px_8px_rgba(0,113,227,0.35)]",
      },
      size: {
        sm: "h-8 px-3.5 text-[12px] min-w-[32px]",
        md: "h-9.5 px-4 text-[13px] min-w-[38px]",
        lg: "h-11 px-5 text-sm min-w-[44px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
