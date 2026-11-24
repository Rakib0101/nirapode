"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isValidImageRef } from "@/lib/storage";
import { hasAdminSection } from "@/lib/admin-permissions";

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// New uploads arrive as a short "storage:bucket/path" ref (see lib/storage.ts);
// the size limit is enforced by the upload endpoint and the bucket itself.
// Posts made before that still hold a base64 data URL inline, so those are
// still accepted — and still capped, since base64 inflates size ~33% and a
// malicious client could skip the browser-side check entirely.
const MAX_IMAGE_DATA_URL_LENGTH = 3_000_000;

function parseImageUrl(raw: FormDataEntryValue | null): { imageUrl: string | null; error?: string } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { imageUrl: null };
  if (!isValidImageRef(value)) return { imageUrl: null, error: "Invalid image." };
  if (value.startsWith("data:") && value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return { imageUrl: null, error: "Image is too large." };
  }
  return { imageUrl: value };
}

const topicSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(150),
  category: z.string().min(2, "Select a category"),
  content: z.string().min(10, "Content must be at least 10 characters"),
});

export async function createTopicAction(
  _prev: { error?: string; success?: boolean; topicId?: string } | null,
  formData: FormData
) {
  const session = await requireUser();

  const parse = topicSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    content: formData.get("content"),
  });

  if (!parse.success) {
    return { error: parse.error.issues[0].message };
  }

  const { imageUrl, error: imageError } = parseImageUrl(formData.get("imageUrl"));
  if (imageError) return { error: imageError };

  const topic = await prisma.forumTopic.create({
    data: {
      userId: session.userId,
      title: parse.data.title,
      category: parse.data.category,
      content: parse.data.content,
      imageUrl,
    },
  });

  revalidatePath("/forum");
  redirect(`/forum/${topic.id}`);
}

const replySchema = z.object({
  topicId: z.string().min(1),
  content: z.string().min(2, "Reply cannot be empty"),
});

export async function createReplyAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const session = await requireUser();

  const parse = replySchema.safeParse({
    topicId: formData.get("topicId"),
    content: formData.get("content"),
  });

  if (!parse.success) {
    return { error: parse.error.issues[0].message };
  }

  const { imageUrl, error: imageError } = parseImageUrl(formData.get("imageUrl"));
  if (imageError) return { error: imageError };

  await prisma.forumReply.create({
    data: {
      userId: session.userId,
      topicId: parse.data.topicId,
      content: parse.data.content,
      imageUrl,
    },
  });

  revalidatePath(`/forum/${parse.data.topicId}`);
  revalidatePath("/forum");
  return { success: true };
}

// ── Deleting ─────────────────────────────────────────────────────────────────
// The author can delete their own post or reply; staff with the community
// moderation section ("pickPut" in lib/admin-sections.ts) can delete anyone's.

export async function deleteTopicAction(topicId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const topic = await prisma.forumTopic.findUnique({ where: { id: topicId }, select: { userId: true } });
  if (!topic) return { error: "Post not found." };
  if (topic.userId !== session.userId && !(await hasAdminSection("pickPut"))) {
    return { error: "You can only delete your own posts." };
  }
  // Replies go with it (onDelete: Cascade on ForumReply.topic).
  await prisma.forumTopic.delete({ where: { id: topicId } });
  revalidatePath("/forum");
  redirect("/forum");
}

export async function deleteReplyAction(replyId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const reply = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { userId: true, topicId: true } });
  if (!reply) return { error: "Reply not found." };
  if (reply.userId !== session.userId && !(await hasAdminSection("pickPut"))) {
    return { error: "You can only delete your own replies." };
  }
  await prisma.forumReply.delete({ where: { id: replyId } });
  revalidatePath(`/forum/${reply.topicId}`);
  revalidatePath("/forum");
  return {};
}
