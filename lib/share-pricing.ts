import { prisma } from "@/lib/prisma";
import { SHARE4_AMOUNTS } from "@/lib/share-pricing-utils";

export { sgdToBdt } from "@/lib/share-pricing-utils";

// Always a fixed, admin-set rate — deliberately independent of the general
// currency-converter's rate (lib/currency.ts), which can be switched to a live
// internet-fetched rate. Share pricing must never fluctuate on its own.
export async function getShareSgdRate(): Promise<number> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "share_sgd_rate" } });
    const rate = row ? parseFloat(row.value) : NaN;
    return isNaN(rate) ? 83.5 : rate;
  } catch {
    return 83.5;
  }
}

export async function saveShareSgdRate(rate: number): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: "share_sgd_rate" },
    create: { key: "share_sgd_rate", value: String(rate) },
    update: { value: String(rate) },
  });
}

// Share 4 (buy-request) offer amounts, in BDT — fully admin-configurable.
// Falls back to the original fixed ৳100–৳5,000 list (SHARE4_AMOUNTS) until an
// admin sets their own.
const SHARE4_AMOUNTS_KEY = "share4_amounts";

export async function getShare4Amounts(): Promise<number[]> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: SHARE4_AMOUNTS_KEY } });
    if (!row) return SHARE4_AMOUNTS;
    const parsed = JSON.parse(row.value);
    if (!Array.isArray(parsed) || parsed.length === 0) return SHARE4_AMOUNTS;
    const amounts = parsed.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    return amounts.length > 0 ? [...new Set(amounts)].sort((a, b) => a - b) : SHARE4_AMOUNTS;
  } catch {
    return SHARE4_AMOUNTS;
  }
}

export async function saveShare4Amounts(amounts: number[]): Promise<void> {
  const cleaned = [...new Set(amounts.map(Number).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
  await prisma.siteSetting.upsert({
    where: { key: SHARE4_AMOUNTS_KEY },
    create: { key: SHARE4_AMOUNTS_KEY, value: JSON.stringify(cleaned) },
    update: { value: JSON.stringify(cleaned) },
  });
}

// Share 4 preferred-date picker: admin can close specific weekdays (e.g. every
// Sat/Sun) and/or specific one-off dates (public holidays). Empty by default —
// every date is open until an admin closes some.
const SHARE4_CLOSED_DATES_KEY = "share4_closed_dates";

export type Share4ClosedDatesConfig = {
  closedWeekdays: number[]; // 0 = Sunday … 6 = Saturday
  closedDates: string[]; // "YYYY-MM-DD"
};

const EMPTY_CLOSED_DATES: Share4ClosedDatesConfig = { closedWeekdays: [], closedDates: [] };

export async function getShare4ClosedDates(): Promise<Share4ClosedDatesConfig> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: SHARE4_CLOSED_DATES_KEY } });
    if (!row) return EMPTY_CLOSED_DATES;
    const parsed = JSON.parse(row.value);
    const rawWeekdays: unknown[] = Array.isArray(parsed?.closedWeekdays) ? parsed.closedWeekdays : [];
    const rawDates: unknown[] = Array.isArray(parsed?.closedDates) ? parsed.closedDates : [];
    const closedWeekdays: number[] = Array.from(
      new Set(rawWeekdays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))
    );
    const closedDates: string[] = Array.from(
      new Set(rawDates.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))
    );
    return { closedWeekdays, closedDates };
  } catch {
    return EMPTY_CLOSED_DATES;
  }
}

export async function saveShare4ClosedDates(config: Share4ClosedDatesConfig): Promise<void> {
  const cleaned: Share4ClosedDatesConfig = {
    closedWeekdays: [...new Set(config.closedWeekdays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))],
    closedDates: [...new Set(config.closedDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort(),
  };
  await prisma.siteSetting.upsert({
    where: { key: SHARE4_CLOSED_DATES_KEY },
    create: { key: SHARE4_CLOSED_DATES_KEY, value: JSON.stringify(cleaned) },
    update: { value: JSON.stringify(cleaned) },
  });
}

// Shared check used both server-side (reject a closed date on submit) and to
// hand the client the config it needs to grey out closed dates itself.
export function isShare4DateClosed(date: Date, config: Share4ClosedDatesConfig): boolean {
  const iso = date.toISOString().slice(0, 10);
  if (config.closedDates.includes(iso)) return true;
  return config.closedWeekdays.includes(date.getUTCDay());
}
