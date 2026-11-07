import type { SelectHTMLAttributes } from "react";

// A plain native <select> (keeps full accessibility/keyboard/mobile-picker
// behavior, zero new JS dependency) with better styling than the raw
// browser default: a custom chevron, truncation for long option labels in a
// narrow column, and the same border/focus-ring treatment as the rest of
// this app's form inputs.
export function SelectField({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full min-w-0 appearance-none truncate text-xs pl-3 pr-8 py-2 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand ${className}`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
