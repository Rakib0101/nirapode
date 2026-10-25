"use client";

import { useActionState, useState } from "react";
import { registerAction } from "@/app/actions/auth";
import Link from "next/link";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

function inputClass(error?: string) {
  return `w-full px-3.5 py-2.5 rounded-lg border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 text-sm transition-colors bg-white ${
    error
      ? "border-red-400 focus:ring-red-200 focus:border-red-500"
      : "border-border focus:ring-brand/30 focus:border-brand"
  }`;
}

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fields, setFields] = useState({ email: "", phone: "", password: "", confirmPassword: "" });
  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  const fe = state?.fieldErrors ?? {};

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">Create account</h1>
      <p className="text-sm text-muted-foreground mb-6">Join the Nirapode community</p>

      {/* Google sign-up */}
      <a
        href="/api/auth/google"
        className="flex items-center justify-center gap-3 w-full border border-border rounded-lg py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors mb-5"
      >
        <GoogleIcon />
        Sign up with Google
      </a>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or sign up with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form action={action} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Email */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={fields.email}
              onChange={set("email")}
              className={inputClass(fe.email)}
            />
            <FieldError message={fe.email} />
          </div>

          {/* Phone */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+65 or +880"
              value={fields.phone}
              onChange={set("phone")}
              className={inputClass(fe.phone)}
            />
            <FieldError message={fe.phone} />
          </div>

          {/* Password */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={fields.password}
                onChange={set("password")}
                className={inputClass(fe.password) + " pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <FieldError message={fe.password} />
          </div>

          {/* Confirm Password */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={fields.confirmPassword}
                onChange={set("confirmPassword")}
                className={inputClass(fe.confirmPassword) + " pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showConfirmPassword} />
              </button>
            </div>
            <FieldError message={fe.confirmPassword} />
          </div>
        </div>

        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
