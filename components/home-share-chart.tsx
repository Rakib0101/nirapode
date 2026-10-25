"use client";

import { useState } from "react";
import Link from "next/link";
import { ShareholdersChart } from "./shareholders-chart";

export type ProjectShareData = {
  id: string;
  name: string;
  sharePriceSgd: number;
  availableShares: number;
  totalShares: number;
  holders: { name: string; quantity: number }[];
};

export function HomeShareChart({ projects }: { projects: ProjectShareData[] }) {
  const [selectedId, setSelectedId] = useState<string>(projects[0]?.id || "");

  if (projects.length === 0) return null;

  const current = projects.find((p) => p.id === selectedId) || projects[0];
  const soldShares = current.totalShares - current.availableShares;
  const soldPct = current.totalShares > 0 ? Math.round((soldShares / current.totalShares) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl border border-border p-6 sm:p-7 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3 className="font-bold text-foreground text-base sm:text-lg">Shareholder Breakdown</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transparent real-time community ownership distribution
          </p>
        </div>

        {projects.length > 1 && (
          <select
            value={current.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-xs font-semibold text-foreground bg-muted border border-border rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Project Overview Card */}
      <div className="bg-muted/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand/20">
            {current.name}
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            Price: <strong className="text-foreground">৳{Number(current.sharePriceSgd).toFixed(2)}</strong> / share
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {current.availableShares} of {current.totalShares} available ({soldPct}% sold)
          </p>
          <div className="w-28 sm:w-36 h-2 bg-border rounded-full overflow-hidden mt-1.5 ml-auto">
            <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${soldPct}%` }} />
          </div>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="py-2">
        <ShareholdersChart holders={current.holders} availableShares={current.availableShares} />
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {current.holders.length} active shareholder{current.holders.length !== 1 ? "s" : ""}
        </span>
        <Link
          href={`/shares/${current.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark transition-colors"
        >
          View Share Details & Invest
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
