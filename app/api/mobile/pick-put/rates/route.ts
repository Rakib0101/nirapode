import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { todayDate } from "@/lib/pick-put";

// Mirrors app/pick-put/new/page.tsx — upcoming admin rates so the mobile new-trip
// form can preview the rate for the chosen date/direction the same way trip-form.tsx does.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const rates = await prisma.pickPutRate.findMany({
      where: { endDate: { gte: todayDate() } },
      orderBy: { createdAt: "desc" },
      select: { direction: true, startDate: true, endDate: true, ratePerKg: true },
    });

    return Response.json({
      rates: rates.map((r) => ({
        direction: r.direction,
        startDate: r.startDate.toISOString().slice(0, 10),
        endDate: r.endDate.toISOString().slice(0, 10),
        ratePerKg: Number(r.ratePerKg),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile pick-put rates error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load rates." }, { status: 500 });
  }
}
