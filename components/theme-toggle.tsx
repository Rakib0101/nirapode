"use client";

import { useEffect, useState } from "react";

export function ThemeScript() {
  const scriptContent = `
    (function() {
      try {
        var saved = localStorage.getItem("nirapode-theme");
        if (saved === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />;
}

export function ThemeToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    try {
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
        localStorage.setItem("nirapode-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("nirapode-theme", "light");
      }
    } catch {
      // LocalStorage might be disabled
    }
  }

  if (!mounted) {
    // Avoid layout shift before mount
    return (
      <div
        className={`w-9 h-9 rounded-xl border border-border bg-muted/40 flex items-center justify-center opacity-60 ${className}`}
        aria-hidden="true"
      >
        <span className="w-4 h-4" />
      </div>
    );
  }

  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={`w-9 h-9 rounded-xl border border-border bg-white hover:bg-muted/50 text-foreground flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${className}`}
      >
        {isDark ? (
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-white hover:bg-muted/40 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 ${className}`}
    >
      <span className="flex items-center justify-center">
        {isDark ? (
          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </span>
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
