import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { getListingRemainingCount } from "@/lib/share-listings";

// Mirrors app/shares/page.tsx: active projects (primary market) + approved
// secondary-market listings filtered to remaining > 0 (a listing can stay
// APPROVED in the DB after all its numbers have traded away).
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const [projects, listings] = await Promise.all([
      prisma.project.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
      prisma.shareListing.findMany({
        where: { status: "APPROVED" },
        include: {
          seller: { select: { fullName: true } },
          project: { select: { name: true, sharePriceSgd: true } },
          trades: { where: { status: "APPROVED" }, select: { status: true, tradedShareNumbers: true } },
        },
      }),
    ]);

    const secondaryMarket = listings
      .map((l) => ({
        id: l.id,
        project: l.project.name,
        marketPrice: Number(l.project.sharePriceSgd),
        seller: l.seller.fullName,
        quantity: l.quantity,
        listedShareNumbers: l.listedShareNumbers,
        remaining: getListingRemainingCount(l),
        askingPrice: Number(l.askingPrice),
      }))
      .filter((l) => l.remaining > 0);

    return Response.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        sharePrice: Number(p.sharePriceSgd),
        totalShares: p.totalShares,
        availableShares: p.availableShares,
        soldPct: Math.round(((p.totalShares - p.availableShares) / p.totalShares) * 100),
      })),
      secondaryMarket,
    });
  } catch (err: unknown) {
    console.error("Mobile shares-browse error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load shares." }, { status: 500 });
  }
}
