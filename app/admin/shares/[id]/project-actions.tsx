"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProjectAction, deleteProjectAction } from "@/app/actions/admin-shares";

const INPUT = "w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

type Project = {
  id: string;
  name: string;
  description: string;
  sharePriceSgd: number;
  totalShares: number;
  status: string;
};

export function ProjectActions({ project }: { project: Project }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [editState, editAction, editPending] = useActionState(updateProjectAction, null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteProjectAction, null);

  function handleDeleteSubmit(e: React.FormEvent) {
    if (!confirm(`Delete "${project.name}" permanently? This cannot be undone.`)) {
      e.preventDefault();
    }
  }

  useEffect(() => {
    if (editState?.success) {
      setEditOpen(false);
      router.refresh();
    }
  }, [editState, router]);

  useEffect(() => {
    if (deleteState?.success) {
      router.push("/admin/shares");
      router.refresh();
    }
  }, [deleteState, router]);

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:border-brand hover:text-brand transition-colors"
      >
        Edit Project
      </button>

      <form action={deleteAction} onSubmit={handleDeleteSubmit}>
        <input type="hidden" name="projectId" value={project.id} />
        <button
          type="submit"
          disabled={deletePending}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          {deletePending ? "Deleting…" : "Delete Project"}
        </button>
      </form>
      {deleteState?.error && (
        <p className="text-[11px] text-red-600 max-w-56">{deleteState.error}</p>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pb-20 lg:pb-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[calc(100vh-6rem)] lg:max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Edit Project</h2>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form action={editAction} className="p-6 space-y-4">
              <input type="hidden" name="projectId" value={project.id} />

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Project Name</label>
                <input name="name" type="text" required defaultValue={project.name} className={INPUT} />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <textarea name="description" required rows={3} defaultValue={project.description} className={`${INPUT} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Price per Share (BDT ৳)</label>
                  <input name="sharePriceSgd" type="number" required min={0.01} step={0.01} defaultValue={project.sharePriceSgd} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Total Shares</label>
                  <input name="totalShares" type="number" required min={1} step={1} defaultValue={project.totalShares} className={INPUT} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                <select name="status" required defaultValue={project.status} className={INPUT}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {editState?.error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editState.error}</p>
              )}

              <button
                type="submit"
                disabled={editPending}
                className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60"
              >
                {editPending ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
