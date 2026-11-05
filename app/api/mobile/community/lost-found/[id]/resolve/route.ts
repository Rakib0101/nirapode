import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/actions/lost-found.ts resolveLostFoundPostAction — owner or
// admin/moderator only.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id } = await params;
    const post = await prisma.lostFoundPost.findUnique({ where: { id }, select: { userId: true } });
    if (!post) return Response.json({ error: "Post not found." }, { status: 404 });

    const isAdmin = ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(session.role);
    if (!isAdmin && post.userId !== session.userId) return unauthorizedJson();

    await prisma.lostFoundPost.update({ where: { id }, data: { status: "RESOLVED" } });
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile lost-found-resolve error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to update post." }, { status: 500 });
  }
}
