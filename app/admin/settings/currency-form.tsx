"use client";

import { useActionState, useState } from "react";
import { saveCurrencySettingsAction } from "@/app/actions/admin-settings";
import type { CurrencySettings } from "@/lib/currency";

type Props = {
  settings: CurrencySettings;
  liveRate: number | null;
};

export function CurrencySettingsForm({ settings, liveRate }: Props) {
  const [state, action, pending] = useActionState(saveCurrencySettingsAction, null);
  const [source, setSource] = useState<"internet" | "manual">(settings.source);
  const [showBar, setShowBar] = useState(settings.showBar);
  const [manualRate, setManualRate] = useState(String(settings.manualRate));
  const [manualPhpRate, setManualPhpRate] = useState(settings.manualPhpRate != null ? String(settings.manualPhpRate) : "");

  return (
    <form action={action} className="space-y-6">
      {/* Source toggle */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-3">Rate Source</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSource("internet")}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-colors text-left ${
              source === "internet"
                ? "border-brand bg-brand-50 text-brand"
                : "border-border text-muted-foreground hover:border-brand/30"
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <div>
              <p>Live Internet</p>
              <p className={`text-xs font-normal mt-0.5 ${source === "internet" ? "text-brand/70" : "text-muted-foreground"}`}>
                Auto-updated every hour
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSource("manual")}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-colors text-left ${
              source === "manual"
                ? "border-brand bg-brand-50 text-brand"
                : "border-border text-muted-foreground hover:border-brand/30"
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <div>
              <p>Manual Rate</p>
              <p className={`text-xs font-normal mt-0.5 ${source === "manual" ? "text-brand/70" : "text-muted-foreground"}`}>
                You set the rate
              </p>
            </div>
          </button>
        </div>
        <input type="hidden" name="source" value={source} />
      </div>

      {/* Live rate info */}
      {source === "internet" && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
          <div>
            <p className="text-sm text-green-800 font-medium">
              Current live rate: 1 SGD ={" "}
              <strong>{liveRate !== null ? liveRate.toFixed(2) : "—"} ৳ BDT</strong>
            </p>
            <p className="text-xs text-green-700 mt-0.5">Refreshed every hour from exchangerate-api.com</p>
          </div>
        </div>
      )}

      {/* Manual rate input */}
      {source === "manual" && (
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Manual Rate <span className="text-muted-foreground font-normal">(1 SGD = ? BDT)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              1 SGD =
            </span>
            <input
              name="manualRate"
              type="number"
              step="0.01"
              min="0.01"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              placeholder="83.50"
              className="w-full pl-20 pr-16 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground font-semibold"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              ৳ BDT
            </span>
          </div>
          {manualRate && !isNaN(parseFloat(manualRate)) && parseFloat(manualRate) > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Preview: 1 SGD = {parseFloat(manualRate).toFixed(2)} ৳ BDT
            </p>
          )}
        </div>
      )}

      {/* Hidden rate always sent */}
      {source === "internet" && (
        <input type="hidden" name="manualRate" value={manualRate} />
      )}

      {/* Taka to Pesos rate for Withdrawal (GCash / Philippines payout) */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1">
          Taka to Pesos Withdrawal Rate <span className="text-muted-foreground font-normal">(1 BDT = ? Pesos, for GCash payout)</span>
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Sets the payout rate when users withdraw their BDT balance to GCash / Philippines Pesos. (e.g. enter <span className="font-mono font-semibold">0.484</span> for 1 BDT = 0.484 PHP, or <span className="font-mono font-semibold">48.4</span> for ৳100 = ₱48.40)
        </p>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
            1 BDT =
          </span>
          <input
            name="manualPhpRate"
            type="number"
            step="0.0001"
            min="0.0001"
            value={manualPhpRate}
            onChange={(e) => setManualPhpRate(e.target.value)}
            placeholder="e.g. 0.484"
            className="w-full pl-20 pr-16 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground font-semibold"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
            ₱ PHP
          </span>
        </div>
        {manualPhpRate && !isNaN(parseFloat(manualPhpRate)) && parseFloat(manualPhpRate) > 0 && (() => {
          const val = parseFloat(manualPhpRate);
          const perBdt = val > 5 ? val / 100 : val;
          return (
            <p className="text-xs text-muted-foreground mt-1.5">
              Preview: ৳ 1,000 BDT = ₱ {(1000 * perBdt).toFixed(2)} PHP (Rate: 1 BDT = {perBdt.toFixed(4)} PHP)
            </p>
          );
        })()}
      </div>

      {/* Show on website toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">Show rate bar on website</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Displays a thin live rate strip below the navigation bar
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
          <input
            type="checkbox"
            name="showBar"
            className="sr-only peer"
            checked={showBar}
            onChange={(e) => setShowBar(e.target.checked)}
          />
          <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-brand transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
        </label>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-lg">
          Settings saved successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
