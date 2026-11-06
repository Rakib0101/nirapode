import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { notifyAdmin } from "@/lib/notifications";
import { resolvePickPutRate, todayDate } from "@/lib/pick-put";
import { DIRECTION_LABELS, formatTravelDate, roundKg } from "@/lib/pick-put-utils";
import { z } from "zod";

// Mirrors app/pick-put/page.tsx (GET) and app/actions/pick-put.ts
// createTripAction (POST).
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { searchParams } = new URL(req.url);
    const rawDirection = searchParams.get("direction");
    const direction = rawDirection === "SG_TO_BD" || rawDirection === "BD_TO_SG" ? rawDirection : undefined;

    const trips = await prisma.pickPutTrip.findMany({
      where: {
        status: "OPEN",
        travelDate: { gte: todayDate() },
        ...(direction ? { direction } : {}),
      },
      orderBy: { travelDate: "asc" },
      include: { traveler: { select: { fullName: true } } },
    });

    return Response.json({
      trips: trips.map((t) => ({
        id: t.id,
        direction: t.direction,
        traveler: t.traveler.fullName,
        travelDate: t.travelDate.toISOString(),
        flightInfo: t.flightInfo,
        notes: t.notes,
        totalKg: Number(t.totalKg),
        bookedKg: Number(t.bookedKg),
        ratePerKg: Number(t.ratePerKg),
        isMine: t.travelerId === session.userId,
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile pick-put list error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load trips." }, { status: 500 });
  }
}

const tripSchema = z.object({
  direction: z.enum(["SG_TO_BD", "BD_TO_SG"], { message: "Choose a travel direction" }),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select your travel date"),
  flightInfo: z.string().trim().max(100).optional(),
  totalKg: z.coerce.number().min(1, "Offer at least 1 kg").max(100, "Maximum 100 kg"),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = tripSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { direction, flightInfo, notes } = parse.data;
    const travelDate = new Date(parse.data.travelDate);
    const totalKg = roundKg(parse.data.totalKg);
    if (travelDate < todayDate()) return Response.json({ error: "Travel date can't be in the past." }, { status: 400 });

    const ratePerKg = (await resolvePickPutRate(travelDate, direction)) ?? 0;

    await prisma.pickPutTrip.create({
      data: {
        travelerId: session.userId,
        direction,
        travelDate,
        flightInfo: flightInfo ?? null,
        totalKg,
        ratePerKg,
        notes: notes ?? null,
      },
    });

    await notifyAdmin({
      subject: `New Pick & Put trip — ${formatTravelDate(travelDate)}`,
      heading: "New Pick & Put Trip",
      lines: [
        { label: "Traveler", value: `${session.fullName} (${session.email})` },
        { label: "Route", value: DIRECTION_LABELS[direction] },
        { label: "Date", value: formatTravelDate(travelDate) },
        { label: "Space", value: `${totalKg} kg` },
        { label: "Rate", value: ratePerKg > 0 ? `৳${ratePerKg.toFixed(2)}/kg` : "Not set — set it on approval" },
      ],
      actionPath: "/admin/pick-put",
    });

    return Response.json({
      success: true,
      message: "Your trip has been submitted. It will be listed once admin approves it.",
    });
  } catch (err: unknown) {
    console.error("Mobile pick-put create error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit trip." }, { status: 500 });
  }
}
