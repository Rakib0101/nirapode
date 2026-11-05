import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/forum/[id]/page.tsx.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id } = await params;

    const topic = await prisma.forumTopic.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true, role: true } },
        replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { fullName: true, role: true } } } },
      },
    });
    if (!topic) return Response.json({ error: "Topic not found." }, { status: 404 });

    return Response.json({
      id: topic.id,
      category: topic.category,
      title: topic.title,
      content: topic.content,
      imageUrl: topic.imageUrl,
      author: topic.user.fullName,
      authorRole: topic.user.role,
      date: topic.createdAt.toISOString(),
      replies: topic.replies.map((r) => ({
        id: r.id,
        content: r.content,
        imageUrl: r.imageUrl,
        author: r.user.fullName,
        authorRole: r.user.role,
        date: r.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile forum-detail error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load topic." }, { status: 500 });
  }
}
