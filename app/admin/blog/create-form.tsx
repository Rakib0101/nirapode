"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createBlogPostAction, updateBlogPostAction, deleteBlogPostAction } from "@/app/actions/admin-blog";

type Category = { id: string; name: string };

export type Post = {
  id: string;
  title: string;
  slug: string;
  categoryId: string | null;
  excerpt: string | null;
  content: string;
  status: string;
};

function PostFormFields({ categories, post }: { categories: Category[]; post?: Post }) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Title</label>
        <input name="title" type="text" required placeholder="Post title" defaultValue={post?.title}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-brand" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Slug</label>
        <input name="slug" type="text" required placeholder="post-url-slug" defaultValue={post?.slug}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-brand font-mono" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Category</label>
        <select name="categoryId" defaultValue={post?.categoryId ?? ""} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-brand bg-white">
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Excerpt</label>
        <textarea name="excerpt" rows={2} placeholder="Short summary…" defaultValue={post?.excerpt ?? ""}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-brand resize-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Content</label>
        <textarea name="content" rows={6} required placeholder="Write the article…" defaultValue={post?.content}
          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-brand resize-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Status</label>
        <select name="status" defaultValue={post?.status ?? "DRAFT"} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-brand bg-white">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Publish now</option>
        </select>
      </div>
    </>
  );
}

export function CreateBlogPostForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(createBlogPostAction, null);

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden sticky top-24">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">New Post</h3>
      </div>
      <form action={action} className="p-5 space-y-3">
        <PostFormFields categories={categories} />
        {state?.error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>}
        {state?.success && <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Post created!</p>}
        <button type="submit" disabled={pending}
          className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60 transition-colors">
          {pending ? "Creating…" : "Create Post"}
        </button>
      </form>
    </div>
  );
}

export function EditBlogPostForm({ post, categories }: { post: Post; categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateBlogPostAction, null);

  // Close the modal once per successful submit (adjusting state during render,
  // not in an effect — see react.dev "You Might Not Need an Effect").
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.success) setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-brand hover:underline"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pb-20 lg:pb-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100vh-6rem)] lg:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-bold text-foreground">Edit Post</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <form action={action} className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
              <input type="hidden" name="postId" value={post.id} />
              <PostFormFields categories={categories} post={post} />

              {state?.error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors"
                >
                  {pending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteBlogPostButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this post? This cannot be undone.")) startTransition(() => deleteBlogPostAction(id));
      }}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? "…" : "Delete"}
    </button>
  );
}
