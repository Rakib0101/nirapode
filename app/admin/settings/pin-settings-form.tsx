"use client";

import { useActionState } from "react";
import { savePinAuthSettingsAction } from "@/app/actions/admin-settings";

export function PinAuthSettingsForm({
  settings,
}: {
  settings: {
    googlePinPromptEnabled: boolean;
    pinLockGlobalEnabled: boolean;
  };
}) {
  const [state, action, pending] = useActionState(savePinAuthSettingsAction, null);

  return (
    <form action={action} className="space-y-6">
      {/* Google Login PIN Prompt Switch */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🔐</span>
            <label htmlFor="googlePinPromptEnabled" className="text-sm font-semibold text-foreground cursor-pointer">
              Google Account PIN Setup Prompt
            </label>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              OAuth Onboarding
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When enabled, users signing in with Google who haven&apos;t created a 4-digit PIN will be directed to <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">/set-pin</code>.
            When <strong>disabled</strong>, Google users go directly to <code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">/dashboard</code> without being asked to set a PIN.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            id="googlePinPromptEnabled"
            type="checkbox"
            name="googlePinPromptEnabled"
            defaultChecked={settings.googlePinPromptEnabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
        </label>
      </div>

      {/* Global 4-Digit App-Lock System Switch */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <label htmlFor="pinLockGlobalEnabled" className="text-sm font-semibold text-foreground cursor-pointer">
              Global 4-Digit PIN Lock Security System
            </label>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              App Gate
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Master switch for the 4-digit app-lock verification screen (<code className="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">/verify-pin</code>).
            When disabled, no user will be gated by a PIN lock when opening the platform, even if they have a PIN set in their profile.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            id="pinLockGlobalEnabled"
            type="checkbox"
            name="pinLockGlobalEnabled"
            defaultChecked={settings.pinLockGlobalEnabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
        </label>
      </div>

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          {state.error}
        </p>
      )}

      {state?.success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5 font-medium">
          PIN Security settings updated successfully!
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
      >
        {pending ? "Saving Changes…" : "Save PIN Security Settings"}
      </button>
    </form>
  );
}
