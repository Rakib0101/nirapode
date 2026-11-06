import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

// Mirrors app/actions/pick-put.ts closeTripAction.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id: tripId } = await params;
    const trip = await prisma.pickPutTrip.findUnique({ where: { id: tripId }, select: { travelerId: true } });
    if (!trip) return Response.json({ error: "Trip not found." }, { status: 404 });
    if (trip.travelerId !== session.userId && !ADMIN_ROLES.includes(session.role)) return unauthorizedJson();

    await prisma.pickPutTrip.update({ where: { id: tripId }, data: { status: "CLOSED" } });
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile pick-put close error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to close trip." }, { status: 500 });
  }
}
