import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { getLockedShareNumbers } from "@/lib/share-listings";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

async function getSellableShareNumbers(userId: string, projectId: string) {
  const [ownedCerts, lockedNumbers] = await Promise.all([
    prisma.shareCertificate.findMany({
      where: { projectId, ownerId: userId },
      orderBy: { shareNumber: "asc" },
      select: { shareNumber: true },
    }),
    getLockedShareNumbers(userId, projectId),
  ]);
  return ownedCerts.map((c) => c.shareNumber).filter((n) => !lockedNumbers.has(n));
}

// Mirrors app/shares/resell/page.tsx — sellable numbers precomputed for every
// ownership up front, so the mobile project-switcher needs no round-trip.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const ownerships = await prisma.shareOwnership.findMany({
      where: { ownerId: session.userId },
      include: { project: { select: { id: true, name: true, sharePriceSgd: true, status: true } } },
      orderBy: { acquiredAt: "desc" },
    });

    const sellableByOwnership = Object.fromEntries(
      await Promise.all(
        ownerships.map(async (o) => [o.id, await getSellableShareNumbers(session.userId, o.projectId)] as const)
      )
    );

    return Response.json({
      ownerships: ownerships.map((o) => ({
        id: o.id,
        project: o.project.name,
        quantity: o.quantity,
        sellableNumbers: sellableByOwnership[o.id],
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile resell-info error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load your shares." }, { status: 500 });
  }
}

// Mirrors app/actions/shares.ts createShareListingAction exactly.
const resellSchema = z.object({
  ownershipId: z.string().min(1),
  shareNumbers: z.array(z.number().int().positive()).min(1, "Select at least one share number"),
  askingPrice: z.coerce.number().positive("Enter a valid price"),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = resellSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { ownershipId, askingPrice } = parse.data;
    const shareNumbers = [...new Set(parse.data.shareNumbers)];

    const ownership = await prisma.shareOwnership.findUnique({
      where: { id: ownershipId, ownerId: session.userId },
      select: { id: true, quantity: true, projectId: true, project: { select: { name: true } } },
    });
    if (!ownership) return Response.json({ error: "Ownership not found." }, { status: 404 });

    const [ownedCerts, lockedNumbers] = await Promise.all([
      prisma.shareCertificate.findMany({
        where: { projectId: ownership.projectId, ownerId: session.userId, shareNumber: { in: shareNumbers } },
        select: { shareNumber: true },
      }),
      getLockedShareNumbers(session.userId, ownership.projectId),
    ]);

    const ownedSet = new Set(ownedCerts.map((c) => c.shareNumber));
    const notOwned = shareNumbers.filter((n) => !ownedSet.has(n));
    if (notOwned.length > 0) {
      return Response.json(
        { error: `You don't own share number${notOwned.length > 1 ? "s" : ""} ${notOwned.map((n) => `#${String(n).padStart(6, "0")}`).join(", ")}.` },
        { status: 400 }
      );
    }

    const alreadyListed = shareNumbers.filter((n) => lockedNumbers.has(n));
    if (alreadyListed.length > 0) {
      return Response.json(
        {
          error: `Share number${alreadyListed.length > 1 ? "s" : ""} ${alreadyListed.map((n) => `#${String(n).padStart(6, "0")}`).join(", ")} ${alreadyListed.length > 1 ? "are" : "is"} already listed for resale.`,
        },
        { status: 409 }
      );
    }

    const quantity = shareNumbers.length;

    await prisma.shareListing.create({
      data: {
        sellerId: session.userId,
        projectId: ownership.projectId,
        quantity,
        listedShareNumbers: shareNumbers,
        askingPrice,
        status: "PENDING",
      },
    });

    await notifyAdmin({
      subject: `New resell listing — ${ownership.project.name}`,
      heading: "New Resell Listing",
      lines: [
        { label: "Seller", value: `${session.fullName} (${session.email})` },
        { label: "Project", value: ownership.project.name },
        { label: "Shares", value: `${quantity} (#${shareNumbers.map((n) => String(n).padStart(6, "0")).join(", #")})` },
        { label: "Asking Price", value: `৳${askingPrice.toFixed(2)}/share` },
      ],
      actionPath: "/admin/shares",
      module: "SHARE6",
    });

    return Response.json({
      success: true,
      message: `Resell listing for ${quantity} share${quantity > 1 ? "s" : ""} submitted. Admin will review and publish it.`,
    });
  } catch (err: unknown) {
    console.error("Mobile resell-submit error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit listing." }, { status: 500 });
  }
}
