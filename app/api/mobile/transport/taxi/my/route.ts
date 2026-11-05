import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/taxi/my/page.tsx. Assignee can be either a TaxiVendor (has a
// phone, for the WhatsApp link) or an internal manager (no phone exposed).
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const requests = await prisma.taxiRequest.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        assignedVendor: { select: { name: true, phone: true } },
        assignedManager: { select: { fullName: true } },
        checkoutItem: { include: { checkout: { select: { token: true, status: true, totalAmount: true } } } },
      },
    });

    return Response.json({
      requests: requests.map((r) => ({
        id: r.id,
        pickup: r.pickupLocation,
        destination: r.destination,
        date: r.date.toISOString(),
        vehicleType: r.vehicleType,
        passengers: r.passengerCount,
        status: r.status,
        assignee: r.assignedVendor?.name ?? r.assignedManager?.fullName ?? null,
        assigneePhone: r.assignedVendor?.phone ?? null,
        price: r.price != null ? Number(r.price) : null,
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
    console.error("Mobile my-taxi error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load your requests." }, { status: 500 });
  }
}
