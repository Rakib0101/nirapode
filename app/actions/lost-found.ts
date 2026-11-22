"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasAdminSection } from "@/lib/admin-permissions";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function resolveLostFoundPostAction(id: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const post = await prisma.lostFoundPost.findUnique({ where: { id }, select: { userId: true } });
  if (!post) return;

  const isAdmin = await hasAdminSection("pickPut");
  const isOwner = post.userId === session.userId;
  if (!isAdmin && !isOwner) return;

  await prisma.lostFoundPost.update({ where: { id }, data: { status: "RESOLVED" } });
  revalidatePath("/lost-found");
  revalidatePath("/lost-found/my");
  revalidatePath("/admin/lost-found");
}

export async function removeLostFoundPostAction(id: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const post = await prisma.lostFoundPost.findUnique({ where: { id }, select: { userId: true } });
  if (!post) return;

  const isAdmin = await hasAdminSection("pickPut");
  const isOwner = post.userId === session.userId;
  if (!isAdmin && !isOwner) return;

  await prisma.lostFoundPost.update({ where: { id }, data: { status: "REMOVED" } });
  revalidatePath("/lost-found");
  revalidatePath("/lost-found/my");
  revalidatePath("/admin/lost-found");
}

// Hard delete — permanently removes the post (and its DB row), unlike
// removeLostFoundPostAction above which only soft-hides it via status.
// Available regardless of current status so admins can clean up spam/
// inappropriate posts even after they've been resolved or already removed.
export async function deleteLostFoundPostAction(id: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const post = await prisma.lostFoundPost.findUnique({ where: { id }, select: { userId: true } });
  if (!post) return;

  const isAdmin = await hasAdminSection("pickPut");
  const isOwner = post.userId === session.userId;
  if (!isAdmin && !isOwner) return;

  await prisma.lostFoundPost.delete({ where: { id } });
  revalidatePath("/lost-found");
  revalidatePath("/lost-found/my");
  revalidatePath("/admin/lost-found");
}

type ActionState = { error?: string; success?: boolean } | null;

const postSchema = z.object({
  type: z.enum(["LOST", "FOUND"]),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Please add more details"),
  location: z.string().optional(),
});

export async function createLostFoundPostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parse = postSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location") || undefined,
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { type, title, description, location } = parse.data;

  await prisma.lostFoundPost.create({
    data: {
      userId: session.userId,
      type,
      title,
      description,
      location: location ?? null,
      images: [],
    },
  });

  revalidatePath("/lost-found");
  redirect("/lost-found");
}

// ── Admin edit (any post, regardless of status) ──────────────────────────────

const updatePostSchema = z.object({
  postId: z.string().min(1, "Missing post id"),
  type: z.enum(["LOST", "FOUND"]),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Please add more details"),
  location: z.string().optional(),
});

export async function updateLostFoundPostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };

  const isAdmin = await hasAdminSection("pickPut");
  if (!isAdmin) return { error: "You don't have permission to edit this post." };

  const parse = updatePostSchema.safeParse({
    postId: formData.get("postId"),
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location") || undefined,
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  const { postId, type, title, description, location } = parse.data;

  const existing = await prisma.lostFoundPost.findUnique({ where: { id: postId }, select: { id: true } });
  if (!existing) return { error: "Post not found." };

  await prisma.lostFoundPost.update({
    where: { id: postId },
    data: { type, title, description, location: location ?? null },
  });

  revalidatePath("/lost-found");
  revalidatePath("/admin/lost-found");
  return { success: true };
}
