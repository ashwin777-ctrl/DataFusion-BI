"use client";

import { ThemeProvider as NextThemes } from "next-themes";

/**
 * Theme provider (DESIGN.md §10). Follows the OS `prefers-color-scheme` unless the
 * user toggles; dark mode is a selected palette (globals.css .dark), not an invert.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
