import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/lost-found/my/page.tsx — all statuses, grouped client-side.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const posts = await prisma.lostFoundPost.findMany({
      where: { userId: session.userId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return Response.json({
      posts: posts.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        description: p.description,
        location: p.location,
        status: p.status,
        date: p.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile my-lost-found error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load your posts." }, { status: 500 });
  }
}
