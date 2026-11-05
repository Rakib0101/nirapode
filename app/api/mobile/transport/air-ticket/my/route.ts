import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/air-ticket/my/page.tsx.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const requests = await prisma.airTicketRequest.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        assignedManager: { select: { fullName: true, phone: true } },
        checkoutItem: { include: { checkout: { select: { token: true, status: true, totalAmount: true } } } },
      },
    });

    return Response.json({
      requests: requests.map((r) => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        departDate: r.departDate.toISOString(),
        returnDate: r.returnDate ? r.returnDate.toISOString() : null,
        airline: r.preferredAirline,
        passengers: r.passengers,
        status: r.status,
        assignee: r.assignedManager?.fullName ?? null,
        assigneePhone: r.assignedManager?.phone ?? null,
        price: r.price != null ? Number(r.price) : null,
        ticketUrl: r.ticketUrl,
        checkout: r.checkoutItem?.checkout
          ? {
              token: r.checkoutItem.checkout.token,
              status: r.checkoutItem.checkout.status,
              totalAmount: Number(r.checkoutItem.checkout.totalAmount),
            }
          : null,
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile my-air-ticket error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load your requests." }, { status: 500 });
  }
}
