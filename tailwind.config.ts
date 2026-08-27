import type { Config } from "tailwindcss";

/**
 * Tailwind theme wired to the DESIGN.md token system (§3). Chrome tokens only —
 * chart (`--viz-*`) tokens live in globals.css and are consumed directly by the
 * chart layer, never through Tailwind utilities, to keep chrome and marks separate
 * (DESIGN.md P1).
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1536px" },
    },
    extend: {
      colors: {
        // shadcn semantic surface mapped onto DESIGN.md neutrals
        plane: "hsl(var(--plane))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface-1))",
          raised: "hsl(var(--surface-2))",
          sunken: "hsl(var(--surface-sunken))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Status palette (DESIGN.md §3.3) — fixed, never themed as a series
        status: {
          good: "hsl(var(--status-good))",
          warning: "hsl(var(--status-warning))",
          serious: "hsl(var(--status-serious))",
          critical: "hsl(var(--status-critical))",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        hero: ["3rem", { lineHeight: "1", fontWeight: "600" }],
        kpi: ["1.875rem", { lineHeight: "1.1", fontWeight: "600" }],
        xs: ["0.75rem", { lineHeight: "1.4" }],
      },
      boxShadow: {
        "elev-1": "var(--elev-1)",
        "elev-2": "var(--elev-2)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.2s linear infinite",
        "fade-in": "fade-in 150ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
