"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSection } from "@/lib/admin-permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionState = { error?: string; success?: boolean } | null;

const postSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens"),
  categoryId: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(10),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function createBlogPostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdminSection("blog");

  const parse = postSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    categoryId: formData.get("categoryId") || undefined,
    excerpt: formData.get("excerpt") || undefined,
    content: formData.get("content"),
    status: formData.get("status"),
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { title, slug, categoryId, excerpt, content, status } = parse.data;

  const existing = await prisma.blog.findUnique({ where: { slug } });
  if (existing) return { error: "A post with this slug already exists." };

  await prisma.blog.create({
    data: {
      title,
      slug,
      content,
      excerpt: excerpt ?? null,
      categoryId: categoryId ?? null,
      authorId: session.userId,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

// ── Update blog post ──────────────────────────────────────────────────────────

async function requireBlogAdmin() {
  const session = await requireAdminSection("blog");
  return session;
}

export async function updateBlogPostAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireBlogAdmin();

  const postId = formData.get("postId") as string;
  if (!postId) return { error: "Missing post id." };

  const parse = postSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    categoryId: formData.get("categoryId") || undefined,
    excerpt: formData.get("excerpt") || undefined,
    content: formData.get("content"),
    status: formData.get("status"),
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { title, slug, categoryId, excerpt, content, status } = parse.data;

  const existing = await prisma.blog.findUnique({ where: { id: postId } });
  if (!existing) return { error: "Post not found." };

  const slugConflict = await prisma.blog.findFirst({ where: { slug, NOT: { id: postId } } });
  if (slugConflict) return { error: "A post with this slug already exists." };

  await prisma.blog.update({
    where: { id: postId },
    data: {
      title,
      slug,
      content,
      excerpt: excerpt ?? null,
      categoryId: categoryId ?? null,
      status,
      publishedAt: status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : null,
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

// ── Delete blog post ──────────────────────────────────────────────────────────

export async function deleteBlogPostAction(id: string): Promise<void> {
  await requireBlogAdmin();
  await prisma.blog.delete({ where: { id } });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}
