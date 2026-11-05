import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { z } from "zod";

// Mirrors app/forum/page.tsx. `category` is a free string (not a DB enum) —
// the fixed category pill list is purely a web UI convention.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const url = new URL(req.url);
    const category = url.searchParams.get("category") || undefined;
    const q = url.searchParams.get("q") || undefined;

    const topics = await prisma.forumTopic.findMany({
      where: {
        category,
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { fullName: true, role: true } }, _count: { select: { replies: true } } },
    });

    return Response.json({
      topics: topics.map((t) => ({
        id: t.id,
        category: t.category,
        title: t.title,
        content: t.content,
        imageUrl: t.imageUrl,
        author: t.user.fullName,
        authorRole: t.user.role,
        date: t.createdAt.toISOString(),
        replies: t._count.replies,
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile forum-list error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load forum." }, { status: 500 });
  }
}

const MAX_IMAGE_DATA_URL_LENGTH = 3_000_000;

function validateImageUrl(raw: unknown): { imageUrl: string | null; error?: string } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { imageUrl: null };
  if (!value.startsWith("data:image/")) return { imageUrl: null, error: "Invalid image." };
  if (value.length > MAX_IMAGE_DATA_URL_LENGTH) return { imageUrl: null, error: "Image is too large." };
  return { imageUrl: value };
}

// Mirrors app/actions/forum.ts createTopicAction.
const topicSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(150),
  category: z.string().min(2, "Select a category"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  imageUrl: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = topicSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { imageUrl, error: imageError } = validateImageUrl(parse.data.imageUrl);
    if (imageError) return Response.json({ error: imageError }, { status: 400 });

    const topic = await prisma.forumTopic.create({
      data: {
        userId: session.userId,
        title: parse.data.title,
        category: parse.data.category,
        content: parse.data.content,
        imageUrl,
      },
    });

    return Response.json({ success: true, id: topic.id });
  } catch (err: unknown) {
    console.error("Mobile forum-create error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to post discussion." }, { status: 500 });
  }
}
