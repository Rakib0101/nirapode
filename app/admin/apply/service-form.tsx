"use client";

import { useActionState, useState, useEffect, useTransition } from "react";
import { createServiceAction, updateServiceAction, toggleServiceAction, deleteServiceAction } from "@/app/actions/apply";

const INPUT = "w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

export function CreateServiceModal() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createServiceAction, null);

  // Close once per successful submit (adjusted during render, not in an effect)
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
      <button type="button" onClick={() => setOpen(true)}
        className="text-sm font-semibold bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
        + Add Service
      </button>

      {open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pb-20 lg:pb-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-6rem)] lg:max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">Add New Service</h2>
              <button type="button" onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form action={action} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Service Name *</label>
                <input name="name" required placeholder="e.g. Work Permit Renewal, Visa Application..." className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
                <textarea name="description" rows={3} placeholder="What documents are required, what the service includes..." className={`${INPUT} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Price (৳) *</label>
                  <input name="price" type="number" step="0.01" min="0" required placeholder="0.00" className={INPUT} />
                  <p className="text-[11px] text-muted-foreground mt-1">Hidden from applicants</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Sort Order</label>
                  <input name="sortOrder" type="number" defaultValue="0" className={INPUT} />
                </div>
              </div>
              {state?.error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{state.error}</p>}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={pending}
                  className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors">
                  {pending ? "Saving…" : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function EditServiceModal({ service, onClose }: { service: Service; onClose: () => void }) {
  const [state, action, pending] = useActionState(updateServiceAction, null);

  useEffect(() => { if (state?.success) onClose(); }, [state, onClose]);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pb-20 lg:pb-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-6rem)] lg:max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Edit Service</h2>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form action={action} className="px-6 py-5 space-y-4">
          <input type="hidden" name="id" value={service.id} />
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Service Name *</label>
            <input name="name" required defaultValue={service.name} placeholder="e.g. Work Permit Renewal, Visa Application..." className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
            <textarea name="description" rows={3} defaultValue={service.description ?? ""} placeholder="What documents are required, what the service includes..." className={`${INPUT} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Price (৳) *</label>
              <input name="price" type="number" step="0.01" min="0" required defaultValue={service.price} placeholder="0.00" className={INPUT} />
              <p className="text-[11px] text-muted-foreground mt-1">Hidden from applicants</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Sort Order</label>
              <input name="sortOrder" type="number" defaultValue={service.sortOrder} className={INPUT} />
            </div>
          </div>
          {state?.error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{state.error}</p>}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={pending}
              className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors">
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ServiceActions({ service }: { service: Service }) {
  const { id, isActive } = service;
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm("Delete this service?")) return;
    startTransition(async () => {
      const res = await deleteServiceAction(id);
      setDeleteError(res?.error ?? null);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={isPending}
          onClick={() => startTransition(() => toggleServiceAction(id))}
          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
            isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          {isPending ? "…" : isActive ? "Active" : "Inactive"}
        </button>
        <button type="button" onClick={() => setEditOpen(true)}
          className="text-xs text-brand hover:text-brand-dark font-medium">
          Edit
        </button>
        <button type="button" disabled={isPending} onClick={handleDelete}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
          Delete
        </button>
      </div>
      {deleteError && <p className="text-xs text-red-600 mt-1 max-w-55">{deleteError}</p>}
      {editOpen && <EditServiceModal service={service} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
