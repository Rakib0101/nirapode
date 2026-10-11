import { prisma } from "@/lib/prisma";

export type CurrencySource = "internet" | "manual";

export type CurrencySettings = {
  source: CurrencySource;
  manualRate: number; // 1 SGD = X BDT
  manualPhpRate: number | null; // 1 SGD = X PHP (Pesos) — null until admin sets one
  showBar: boolean;
};

export async function getCurrencySettings(): Promise<CurrencySettings> {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: ["currency_source", "currency_bdt_rate", "currency_php_rate", "currency_show_bar"] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const phpRaw = map["currency_php_rate"] ? parseFloat(map["currency_php_rate"]) : NaN;
    return {
      source: (map["currency_source"] ?? "internet") as CurrencySource,
      manualRate: parseFloat(map["currency_bdt_rate"] ?? "83.5"),
      manualPhpRate: isNaN(phpRaw) ? null : phpRaw,
      showBar: (map["currency_show_bar"] ?? "true") === "true",
    };
  } catch {
    return { source: "internet", manualRate: 83.5, manualPhpRate: null, showBar: true };
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
