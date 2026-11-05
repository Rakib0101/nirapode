import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { getReferredByAgentId } from "@/lib/commission";
import { effectiveShareCertPrice } from "@/lib/share-pricing-utils";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

// Mirrors app/actions/shares.ts requestSharePurchaseAction exactly.
const purchaseSchema = z.object({
  shareNumbers: z.array(z.number().int().positive()).min(1, "Select at least one share number"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id: projectId } = await params;
    const body = await req.json();
    const parse = purchaseSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const shareNumbers = [...new Set(parse.data.shareNumbers)];
    const quantity = shareNumbers.length;

    const project = await prisma.project.findUnique({
      where: { id: projectId, status: "ACTIVE" },
      select: { id: true, name: true, sharePriceSgd: true, availableShares: true },
    });
    if (!project) return Response.json({ error: "Project not found or no longer active." }, { status: 404 });
    if (project.availableShares < quantity) {
      return Response.json({ error: `Only ${project.availableShares} shares available.` }, { status: 400 });
    }

    const availableCerts = await prisma.shareCertificate.findMany({
      where: { projectId, shareNumber: { in: shareNumbers }, ownerId: null },
      select: { shareNumber: true, priceSgd: true },
    });
    if (availableCerts.length < shareNumbers.length) {
      const availableSet = new Set(availableCerts.map((c) => c.shareNumber));
      const unavailable = shareNumbers.filter((n) => !availableSet.has(n));
      return Response.json(
        {
          error: `Share number${unavailable.length > 1 ? "s" : ""} ${unavailable.map((n) => `#${String(n).padStart(4, "0")}`).join(", ")} ${unavailable.length > 1 ? "are" : "is"} no longer available. Please refresh and pick again.`,
        },
        { status: 409 }
      );
    }

    const projectSharePriceSgd = Number(project.sharePriceSgd);
    const totalAmount = availableCerts.reduce(
      (sum, c) => sum + effectiveShareCertPrice(c.priceSgd != null ? Number(c.priceSgd) : null, projectSharePriceSgd),
      0
    );

    const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId }, select: { balance: true } });
    if (!wallet || Number(wallet.balance) < totalAmount) {
      return Response.json(
        { error: `Insufficient wallet balance. Need ৳${totalAmount.toFixed(2)}. Please deposit funds to your wallet first.` },
        { status: 400 }
      );
    }

    const referredById = await getReferredByAgentId(session.userId);

    await prisma.sharePurchaseRequest.create({
      data: {
        buyerId: session.userId,
        projectId,
        quantity,
        requestedShareNumbers: shareNumbers,
        totalAmount,
        paymentMethod: "WALLET",
        status: "PENDING",
        referredById,
      },
    });

    await notifyAdmin({
      subject: `New share purchase request — ${project.name}`,
      heading: "New Share Purchase Request",
      lines: [
        { label: "Buyer", value: `${session.fullName} (${session.email})` },
        { label: "Project", value: project.name },
        { label: "Shares", value: `${quantity} (#${shareNumbers.map((n) => String(n).padStart(4, "0")).join(", #")})` },
        { label: "Total", value: `৳${totalAmount.toFixed(2)}` },
        { label: "Payment", value: "Platform Wallet" },
      ],
      actionPath: "/admin/purchases",
      module: "SHARE6",
    });

    return Response.json({
      success: true,
      message: `Purchase request for ${quantity} share${quantity > 1 ? "s" : ""} submitted successfully. You will be notified once approved.`,
    });
  } catch (err: unknown) {
    console.error("Mobile share-purchase error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit purchase request." }, { status: 500 });
  }
}
