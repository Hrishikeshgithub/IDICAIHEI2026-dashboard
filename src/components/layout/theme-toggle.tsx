"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// <html class="dark"> is the single source of truth (set before first paint by the inline script in the root layout).
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch { /* private mode: applies for this visit */ }
}

export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "segmented" }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  if (variant === "segmented") {
    return (
      <div role="radiogroup" aria-label="Appearance" className="relative grid grid-cols-2 rounded-2xl bg-slate-900/[0.06] p-1 dark:bg-white/[0.06]">
        <span
          aria-hidden
          className={cn(
            "glass-strong absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
            dark && "translate-x-full",
          )}
        />
        {[
          { label: "Light", value: false, Icon: Sun },
          { label: "Dark", value: true, Icon: Moon },
        ].map(({ label, value, Icon }) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={dark === value}
            onClick={() => setTheme(value)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium transition-colors",
              dark === value ? "text-slate-900" : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Icon className="size-3.5" aria-hidden /> {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(!dark)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="glass grid size-10 place-items-center rounded-full text-slate-700 transition-transform active:scale-95"
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
