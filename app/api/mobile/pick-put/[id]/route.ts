import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { todayDate } from "@/lib/pick-put";
import { roundKg } from "@/lib/pick-put-utils";

// Mirrors app/pick-put/[id]/page.tsx.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id } = await params;
    const trip = await prisma.pickPutTrip.findUnique({
      where: { id },
      include: { traveler: { select: { fullName: true } } },
    });
    if (!trip || trip.status !== "OPEN") return Response.json({ error: "Trip not found." }, { status: 404 });

    const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId }, select: { balance: true } });
    const remainingKg = roundKg(Number(trip.totalKg) - Number(trip.bookedKg));
    const bookable = remainingKg > 0 && trip.travelDate >= todayDate() && trip.travelerId !== session.userId;

    return Response.json({
      trip: {
        id: trip.id,
        direction: trip.direction,
        traveler: trip.traveler.fullName,
        travelDate: trip.travelDate.toISOString(),
        flightInfo: trip.flightInfo,
        notes: trip.notes,
        remainingKg,
        ratePerKg: Number(trip.ratePerKg),
        isMine: trip.travelerId === session.userId,
        bookable,
      },
      balance: wallet ? Number(wallet.balance) : 0,
    });
  } catch (err: unknown) {
    console.error("Mobile pick-put detail error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load trip." }, { status: 500 });
  }
}
