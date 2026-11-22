"use server";

import { prisma } from "@/lib/prisma";
import { checkAdminSection } from "@/lib/admin-permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";


async function requireAdmin() {
  const session = await checkAdminSection("islamic");
  if (!session) throw new Error("Unauthorized");
  return session;
}

type State = { error?: string; success?: boolean } | null;

// ── Duas ──────────────────────────────────────────────────────────────────────

const duaSchema = z.object({
  title: z.string().min(3),
  arabic: z.string().min(3),
  transliteration: z.string().optional(),
  translation: z.string().min(5),
  category: z.string().min(2),
  source: z.string().optional(),
});

export async function createDuaAction(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();

  const parse = duaSchema.safeParse({
    title: formData.get("title"),
    arabic: formData.get("arabic"),
    transliteration: formData.get("transliteration") || undefined,
    translation: formData.get("translation"),
    category: formData.get("category"),
    source: formData.get("source") || undefined,
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  await prisma.dua.create({ data: parse.data });
  revalidatePath("/islamic-center/duas");
  revalidatePath("/admin/islamic");
  return { success: true };
}

export async function updateDuaAction(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();

  const duaId = formData.get("duaId") as string;
  if (!duaId) return { error: "Missing dua id." };

  const parse = duaSchema.safeParse({
    title: formData.get("title"),
    arabic: formData.get("arabic"),
    transliteration: formData.get("transliteration") || undefined,
    translation: formData.get("translation"),
    category: formData.get("category"),
    source: formData.get("source") || undefined,
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  await prisma.dua.update({ where: { id: duaId }, data: parse.data });
  revalidatePath("/islamic-center/duas");
  revalidatePath("/admin/islamic");
  return { success: true };
}

export async function deleteDuaAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.dua.delete({ where: { id } });
  revalidatePath("/islamic-center/duas");
  revalidatePath("/admin/islamic");
}

// ── Articles ──────────────────────────────────────────────────────────────────

const articleSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(20),
  excerpt: z.string().optional(),
  status: z.enum(["PUBLISHED", "DRAFT"]).default("PUBLISHED"),
});

export async function createArticleAction(_prev: State, formData: FormData): Promise<State> {
  const session = await requireAdmin();

  const parse = articleSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") || undefined,
    status: formData.get("status") || "PUBLISHED",
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  await prisma.islamicArticle.create({
    data: { ...parse.data, authorId: session.userId },
  });
  revalidatePath("/islamic-center/articles");
  revalidatePath("/admin/islamic");
  return { success: true };
}

export async function updateArticleAction(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();

  const articleId = formData.get("articleId") as string;
  if (!articleId) return { error: "Missing article id." };

  const parse = articleSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") || undefined,
    status: formData.get("status") || "PUBLISHED",
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  await prisma.islamicArticle.update({
    where: { id: articleId },
    data: parse.data,
  });
  revalidatePath("/islamic-center/articles");
  revalidatePath("/admin/islamic");
  return { success: true };
}

export async function deleteArticleAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.islamicArticle.delete({ where: { id } });
  revalidatePath("/islamic-center/articles");
  revalidatePath("/admin/islamic");
}

export async function toggleArticleStatusAction(id: string, currentStatus: string): Promise<void> {
  await requireAdmin();
  const next = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  await prisma.islamicArticle.update({ where: { id }, data: { status: next } });
  revalidatePath("/islamic-center/articles");
  revalidatePath("/admin/islamic");
}
