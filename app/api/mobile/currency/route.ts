import { prisma } from "@/lib/prisma";
import { getCurrencySettings, getLiveBdtRate } from "@/lib/currency";

// Mirrors app/currency/page.tsx. Public — no login required.
export async function GET() {
  try {
    const [settings, liveRate, banks] = await Promise.all([
      getCurrencySettings(),
      getLiveBdtRate(),
      prisma.bankRate
        .findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })
        .catch(() => []),
    ]);

    const isManual = settings.source === "manual";
    const effectiveRate = isManual ? settings.manualRate : (liveRate ?? settings.manualRate);

    return Response.json({
      effectiveRate,
      isManual,
      manualPhpRate: settings.manualPhpRate,
      banks: banks.map((b) => ({ id: b.id, bankName: b.bankName, rate: Number(b.rate) })),
    });
  } catch (err: unknown) {
    console.error("Mobile currency error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load currency rates." }, { status: 500 });
  }
}
