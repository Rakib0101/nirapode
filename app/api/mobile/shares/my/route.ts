import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/shares/my/page.tsx — note purchase history here is primary-
// market SharePurchaseRequest only, NOT merged with ShareTrade (unlike the
// Wallet History "shares" tab, which does merge both).
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const userId = session.userId;

    const [ownerships, purchases, listings, certificates, buyRequests] = await Promise.all([
      prisma.shareOwnership.findMany({
        where: { ownerId: userId },
        orderBy: { acquiredAt: "desc" },
        include: { project: { select: { name: true, sharePriceSgd: true, status: true } } },
      }),
      prisma.sharePurchaseRequest.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: "desc" },
        include: { project: { select: { name: true } } },
      }),
      prisma.shareListing.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: "desc" },
        include: { project: { select: { name: true } } },
      }),
      prisma.shareCertificate.findMany({
        where: { ownerId: userId },
        select: { id: true, projectId: true, shareNumber: true, code: true },
      }),
      prisma.shareBuyRequest.findMany({ where: { buyerId: userId }, orderBy: { createdAt: "desc" } }),
    ]);

    const certsByProject = new Map<string, { id: string; shareNumber: number; code: string | null }[]>();
    for (const c of certificates) {
      const list = certsByProject.get(c.projectId) ?? [];
      list.push({ id: c.id, shareNumber: c.shareNumber, code: c.code });
      certsByProject.set(c.projectId, list);
    }

    const totalValue = ownerships.reduce((sum, o) => sum + Number(o.purchasePrice) * o.quantity, 0);
    const totalShares = ownerships.reduce((sum, o) => sum + o.quantity, 0);
    const pendingCount = purchases.filter((p) => p.status === "PENDING").length;

    return Response.json({
      totalValue,
      totalShares,
      pendingCount,
      ownerships: ownerships.map((o) => ({
        id: o.id,
        project: o.project.name,
        quantity: o.quantity,
        purchasePrice: Number(o.purchasePrice),
        certificateIds: (certsByProject.get(o.projectId) ?? []).map((c) => c.id),
      })),
      purchases: purchases.map((p) => ({
        id: p.id,
        project: p.project.name,
        quantity: p.quantity,
        amount: Number(p.totalAmount),
        status: p.status,
        date: p.createdAt.toISOString(),
      })),
      listings: listings.map((l) => ({
        id: l.id,
        project: l.project.name,
        quantity: l.quantity,
        askingPrice: Number(l.askingPrice),
        status: l.status,
        date: l.createdAt.toISOString(),
      })),
      buyRequests: buyRequests.map((r) => ({
        id: r.id,
        name: r.name,
        shareNumber: r.shareNumber,
        size: r.size,
        price: Number(r.price),
        status: r.status,
        adminNote: r.adminNote,
        date: r.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile my-shares error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load your investments." }, { status: 500 });
  }
}
