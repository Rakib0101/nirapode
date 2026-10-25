import { prisma } from "@/lib/prisma";

export type CurrencySource = "internet" | "manual";

export type CurrencySettings = {
  source: CurrencySource;
  manualRate: number; // 1 SGD = X BDT (Dollar to Taka)
  manualPhpRate: number | null; // 1 BDT = X PHP (Taka to Pesos) — null until admin sets one
  showBar: boolean;
};

export async function getCurrencySettings(): Promise<CurrencySettings> {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: ["currency_source", "currency_bdt_rate", "currency_php_rate", "currency_show_bar"] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const phpRaw = map["currency_php_rate"] ? parseFloat(map["currency_php_rate"]) : NaN;
    // Normalize: if admin entered e.g. 48.4 (per 100 BDT), normalize to per 1 BDT: 0.484
    const normalizedPhp = isNaN(phpRaw) ? null : phpRaw > 5 ? phpRaw / 100 : phpRaw;
    return {
      source: (map["currency_source"] ?? "internet") as CurrencySource,
      manualRate: parseFloat(map["currency_bdt_rate"] ?? "83.5"),
      manualPhpRate: normalizedPhp,
      showBar: (map["currency_show_bar"] ?? "true") === "true",
    };
  } catch {
    return { source: "internet", manualRate: 83.5, manualPhpRate: null, showBar: true };
  }
}

export async function getBdtToPhpRate(): Promise<number | null> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "currency_php_rate" } });
    if (!row?.value) return null;
    const val = parseFloat(row.value);
    if (isNaN(val) || val <= 0) return null;
    return val > 5 ? val / 100 : val;
  } catch {
    return null;
  }
}

export async function getLiveBdtRate(): Promise<number | null> {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/SGD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.rates?.BDT === "number" ? data.rates.BDT : null;
  } catch {
    return null;
  }
}

export type RateResult = {
  rate: number;
  source: CurrencySource;
  isLive: boolean; // false when internet fetch failed and fell back
};

export async function getEffectiveBdtRate(): Promise<RateResult> {
  const settings = await getCurrencySettings();

  if (settings.source === "manual") {
    return { rate: settings.manualRate, source: "manual", isLive: false };
  }

  const live = await getLiveBdtRate();
  if (live !== null) {
    return { rate: live, source: "internet", isLive: true };
  }
  // internet fetch failed — use manual as fallback silently
  return { rate: settings.manualRate, source: "internet", isLive: false };
}
