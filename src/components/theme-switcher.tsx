"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Laptop } from "lucide-react";

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`flex items-center rounded-full border border-border bg-card/60 p-0.5 shadow-sm ${className}`}>
        <div className="h-7 w-20" />
      </div>
    );
  }

  const modes = [
    { key: "light", label: "Light", icon: Sun },
    { key: "system", label: "System", icon: Laptop },
    { key: "dark", label: "Dark", icon: Moon },
  ] as const;

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode selection"
      className={`flex items-center rounded-full border border-border bg-card/70 p-0.5 backdrop-blur shadow-sm ${className}`}
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = theme === mode.key;
        return (
          <button
            key={mode.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${mode.label} theme`}
            title={`Switch to ${mode.label} theme`}
            onClick={() => setTheme(mode.key)}
            className={`relative flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium transition-all ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[11px]">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
