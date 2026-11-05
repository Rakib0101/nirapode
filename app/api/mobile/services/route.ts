import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/services/page.tsx's getServices() — the one real ApplyService
// catalog shared by both the Services screen (public ServiceRequest form)
// and the Apply screen (authenticated ApplyApplication form with uploads).
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const services = await prisma.applyService.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, description: true, price: true },
    });

    return Response.json({ services: services.map((s) => ({ ...s, price: Number(s.price) })) });
  } catch (err: unknown) {
    console.error("Mobile services-list error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load services." }, { status: 500 });
  }
}
