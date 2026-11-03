"use client";

import { useActionState, useState } from "react";
import { savePlatformCutSettingsAction } from "@/app/actions/admin-settings";
import { COMMISSION_MODULES, type CommissionModule, type CommissionMode, type CommissionSetting } from "@/lib/commission-types";

type Props = { settings: Record<CommissionModule, CommissionSetting> };

export function PlatformCutForm({ settings }: Props) {
  const [state, action, pending] = useActionState(savePlatformCutSettingsAction, null);
  const [modes, setModes] = useState<Record<CommissionModule, CommissionMode>>(
    () =>
      Object.fromEntries(
        COMMISSION_MODULES.map(({ module }) => [module, settings[module].mode])
      ) as Record<CommissionModule, CommissionMode>
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-4">
        {COMMISSION_MODULES.map(({ module, label }) => {
          const key = module.toLowerCase();
          const mode = modes[module];
          return (
            <div
              key={module}
              className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
            >
              <p className="text-sm font-medium text-foreground sm:w-32 shrink-0">{label}</p>

              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setModes((m) => ({ ...m, [module]: "PERCENTAGE" }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    mode === "PERCENTAGE" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Percentage
                </button>
                <button
                  type="button"
                  onClick={() => setModes((m) => ({ ...m, [module]: "FIXED" }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    mode === "FIXED" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Fixed ৳
                </button>
              </div>
              <input type="hidden" name={`platform_${key}_mode`} value={mode} />

              <div className="relative max-w-35">
                <input
                  name={`platform_${key}_value`}
                  type="number"
                  step="0.1"
                  min={0}
                  max={mode === "PERCENTAGE" ? 100 : undefined}
                  defaultValue={settings[module].value}
                  className="w-full pl-3.5 pr-9 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground font-semibold text-sm"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">
                  {mode === "PERCENTAGE" ? "%" : "৳"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-lg">
          Platform commission rates saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Rates"}
      </button>
    </form>
  );
}
