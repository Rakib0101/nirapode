import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { getReferredByAgentId } from "@/lib/commission";
import { getShareSgdRate, getShare4Amounts, getShare4ClosedDates, isShare4DateClosed } from "@/lib/share-pricing";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

// "Share 4" — a separate, simple buy-request flow unrelated to
// ShareOwnership/ShareCertificate. GET returns the admin-configured form
// inputs: the live SGD rate, the allowed BDT amount tiers, and which
// weekdays/dates are closed for the preferred-date picker.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const [sgdRate, amounts, closedDates] = await Promise.all([
      getShareSgdRate(),
      getShare4Amounts(),
      getShare4ClosedDates(),
    ]);

    return Response.json({ sgdRate, amounts, closedDates });
  } catch (err: unknown) {
    console.error("Mobile buy-request-info error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load buy request info." }, { status: 500 });
  }
}

// Mirrors app/actions/shares.ts createShareBuyRequestAction exactly.
const buyRequestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  shareNumber: z
    .string()
    .regex(/^\d{4}$/, "Share number must be exactly 4 digits")
    .refine((v) => v !== "0000", "0000 is not a valid share number"),
  size: z.enum(["SMALL", "BIG"]),
  price: z.coerce.number().positive("Enter a valid amount"),
  preferredDate: z.coerce.date({ message: "Enter a valid date" }),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = buyRequestSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { name, shareNumber, size, price: offeredBdt, preferredDate } = parse.data;

    const allowedAmounts = await getShare4Amounts();
    if (!allowedAmounts.includes(offeredBdt)) {
      return Response.json(
        { error: `Choose one of the available amounts: ${allowedAmounts.map((a) => `৳${a.toLocaleString()}`).join(", ")}.` },
        { status: 400 }
      );
    }

    const closedDatesConfig = await getShare4ClosedDates();
    if (isShare4DateClosed(preferredDate, closedDatesConfig)) {
      return Response.json({ error: "That date is closed for buy requests. Please choose a different date." }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId }, select: { balance: true } });
    if (!wallet || Number(wallet.balance) < offeredBdt) {
      return Response.json(
        {
          error: `Insufficient platform wallet balance. You have ৳${Number(wallet?.balance ?? 0).toFixed(2)}, but this request requires at least ৳${offeredBdt.toFixed(2)}. Please deposit funds to your platform wallet first.`,
        },
        { status: 400 }
      );
    }

    const existingPending = await prisma.shareBuyRequest.findFirst({
      where: { buyerId: session.userId, shareNumber, status: "PENDING" },
    });
    if (existingPending) {
      return Response.json(
        { error: `You already have a pending buy request for share #${shareNumber}. Please wait for admin review.` },
        { status: 409 }
      );
    }

    const referredById = await getReferredByAgentId(session.userId);

    await prisma.shareBuyRequest.create({
      data: {
        buyerId: session.userId,
        name,
        shareNumber,
        size,
        price: offeredBdt,
        sgdRate: await getShareSgdRate(),
        preferredDate,
        referredById,
        status: "PENDING",
      },
    });

    await notifyAdmin({
      subject: `New share buy request — #${shareNumber}`,
      heading: "New Share Buy Request",
      lines: [
        { label: "Buyer", value: `${name} (${session.email})` },
        { label: "Share #", value: shareNumber },
        { label: "Size", value: size },
        { label: "Offered Price", value: `৳${offeredBdt.toFixed(2)}` },
        { label: "Preferred Date", value: preferredDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
      ],
      actionPath: "/admin/purchases",
      module: "SHARE4",
    });

    return Response.json({
      success: true,
      message: `Your request to buy share #${shareNumber} has been submitted. Admin will review it shortly.`,
    });
  } catch (err: unknown) {
    console.error("Mobile buy-request-submit error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit buy request." }, { status: 500 });
  }
}
