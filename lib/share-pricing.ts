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
