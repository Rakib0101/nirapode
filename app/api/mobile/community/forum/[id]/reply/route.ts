import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { z } from "zod";

const MAX_IMAGE_DATA_URL_LENGTH = 3_000_000;

function validateImageUrl(raw: unknown): { imageUrl: string | null; error?: string } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { imageUrl: null };
  if (!value.startsWith("data:image/")) return { imageUrl: null, error: "Invalid image." };
  if (value.length > MAX_IMAGE_DATA_URL_LENGTH) return { imageUrl: null, error: "Image is too large." };
  return { imageUrl: value };
}

// Mirrors app/actions/forum.ts createReplyAction.
const replySchema = z.object({
  content: z.string().min(2, "Reply cannot be empty"),
  imageUrl: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id: topicId } = await params;
    const body = await req.json();
    const parse = replySchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { imageUrl, error: imageError } = validateImageUrl(parse.data.imageUrl);
    if (imageError) return Response.json({ error: imageError }, { status: 400 });

    const topic = await prisma.forumTopic.findUnique({ where: { id: topicId }, select: { id: true } });
    if (!topic) return Response.json({ error: "Topic not found." }, { status: 404 });

    await prisma.forumReply.create({
      data: { userId: session.userId, topicId, content: parse.data.content, imageUrl },
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile forum-reply error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to post reply." }, { status: 500 });
  }
}
