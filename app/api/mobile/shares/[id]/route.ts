import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { effectiveShareCertPrice } from "@/lib/share-pricing-utils";

// Mirrors app/shares/[id]/page.tsx. Shares are individually numbered — a
// purchase selects specific ShareCertificate.shareNumber values, not just a
// quantity, since each certificate can carry its own price override.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id, status: "ACTIVE" },
      include: {
        createdBy: { select: { fullName: true } },
        shares: { include: { owner: { select: { fullName: true } } }, orderBy: { quantity: "desc" } },
      },
    });
    if (!project) return Response.json({ error: "Project not found or no longer active." }, { status: 404 });

    const [myOwnership, pendingRequest, availableCerts, sharer] = await Promise.all([
      prisma.shareOwnership.findUnique({
        where: { projectId_ownerId: { projectId: id, ownerId: session.userId } },
        select: { quantity: true, purchasePrice: true },
      }),
      prisma.sharePurchaseRequest.findFirst({
        where: { projectId: id, buyerId: session.userId, status: "PENDING" },
        select: { id: true, quantity: true, totalAmount: true, createdAt: true },
      }),
      prisma.shareCertificate.findMany({
        where: { projectId: id, ownerId: null },
        orderBy: { shareNumber: "asc" },
        select: { shareNumber: true, priceSgd: true },
      }),
      // Only agents get a referral code baked into a shared link.
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { isAgent: true, referralCode: true },
      }),
    ]);

    const projectSharePrice = Number(project.sharePriceSgd);

    return Response.json({
      id: project.id,
      name: project.name,
      description: project.description,
      imageUrl: project.imageUrl,
      createdBy: project.createdBy.fullName,
      referralCode: sharer?.isAgent ? sharer.referralCode : null,
      sharePrice: projectSharePrice,
      totalShares: project.totalShares,
      availableShares: project.availableShares,
      soldPct: Math.round(((project.totalShares - project.availableShares) / project.totalShares) * 100),
      holders: project.shares.map((s) => ({ name: s.owner?.fullName ?? "Shareholder", quantity: s.quantity })),
      myOwnership: myOwnership
        ? { quantity: myOwnership.quantity, purchasePrice: Number(myOwnership.purchasePrice) }
        : null,
      pendingRequest: pendingRequest
        ? { quantity: pendingRequest.quantity, totalAmount: Number(pendingRequest.totalAmount), date: pendingRequest.createdAt.toISOString() }
        : null,
      availableNumbers: availableCerts.map((c) => ({
        shareNumber: c.shareNumber,
        price: effectiveShareCertPrice(c.priceSgd != null ? Number(c.priceSgd) : null, projectSharePrice),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile share-detail error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load project." }, { status: 500 });
  }
}
