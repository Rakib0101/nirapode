import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { getListingRemainingCount } from "@/lib/share-listings";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

// Mirrors app/actions/shares.ts requestShareTradeAction exactly. Unlike a
// primary purchase or a resell listing, a secondary-market buy only takes a
// quantity — admin assigns the specific traded share numbers at approval
// time from whichever of the listing's numbers aren't already claimed.
const tradeSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = tradeSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { listingId, quantity } = parse.data;

    const listing = await prisma.shareListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        quantity: true,
        listedShareNumbers: true,
        askingPrice: true,
        sellerId: true,
        status: true,
        project: { select: { name: true } },
        trades: { where: { status: "APPROVED" }, select: { status: true, tradedShareNumbers: true } },
      },
    });

    if (!listing || listing.status !== "APPROVED") {
      return Response.json({ error: "This listing is no longer available." }, { status: 404 });
    }
    if (listing.sellerId === session.userId) {
      return Response.json({ error: "You cannot buy your own listing." }, { status: 400 });
    }
    const remaining = getListingRemainingCount(listing);
    if (quantity > remaining) {
      return Response.json({ error: `Only ${remaining} share${remaining === 1 ? "" : "s"} available in this listing.` }, { status: 400 });
    }

    const totalAmount = quantity * Number(listing.askingPrice);

    await prisma.shareTrade.create({
      data: { listingId, buyerId: session.userId, quantity, totalAmount, paymentMethod: "WALLET", status: "PENDING" },
    });

    await notifyAdmin({
      subject: `New secondary market trade — ${listing.project.name}`,
      heading: "New Secondary Market Trade",
      lines: [
        { label: "Buyer", value: `${session.fullName} (${session.email})` },
        { label: "Project", value: listing.project.name },
        { label: "Quantity", value: String(quantity) },
        { label: "Total", value: `৳${totalAmount.toFixed(2)}` },
        { label: "Payment", value: "Platform Wallet" },
      ],
      actionPath: "/admin/shares",
      module: "SHARE6",
    });

    return Response.json({
      success: true,
      message: `Trade request for ${quantity} share${quantity > 1 ? "s" : ""} submitted. Admin will process it shortly.`,
    });
  } catch (err: unknown) {
    console.error("Mobile share-trade error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit trade request." }, { status: 500 });
  }
}
