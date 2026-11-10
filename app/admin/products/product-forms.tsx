"use client";

import { useActionState, useState } from "react";
import { ImageUploadField } from "@/components/image-upload-field";
import {
  addProductAction,
  updateProductAction,
  toggleProductActiveAction,
  deleteProductAction,
  updateProductOrderStatusAction,
} from "@/app/actions/products";

const INPUT =
  "w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  stock: number | null;
  isActive: boolean;
};

export function AddProductForm() {
  const [state, action, pending] = useActionState(addProductAction, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors cursor-pointer shadow-xs"
      >
        + Add Product
      </button>
    );
  }

  return (
    <form action={action} className="bg-white rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">New Product</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-foreground mb-1">Product Name *</label>
          <input name="name" required placeholder="e.g. Premium Rice 5kg" className={INPUT} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Price (৳) *</label>
          <input name="price" type="number" step="0.01" min="0" required placeholder="1200" className={INPUT} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Stock <span className="font-normal text-muted-foreground">(blank = unlimited)</span>
          </label>
          <input name="stock" type="number" min="0" placeholder="Leave blank" className={INPUT} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
          <textarea name="description" rows={3} placeholder="Short description shown on the product page" className={INPUT} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-foreground mb-1.5">Product Photo</label>
          <ImageUploadField name="imageUrl" label="Add Product Photo" />
        </div>
      </div>

      {state?.error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5">Product added!</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Saving…" : "Save Product"}
      </button>
    </form>
  );
}

export function ProductRow({ product }: { product: Product }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateProductAction, null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="flex items-start gap-4 p-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-20 h-20 rounded-xl object-cover border border-border shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-muted border border-border shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{product.name}</p>
              <p className="text-sm text-brand font-bold mt-0.5">৳{product.price.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {product.stock === null ? "Unlimited stock" : product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
              </p>
            </div>
            <span
              className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              {product.isActive ? "Live" : "Hidden"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={() => setEditing((v) => !v)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-muted cursor-pointer">
              {editing ? "Close" : "Edit"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => { setBusy(true); try { await toggleProductActiveAction(product.id); } finally { setBusy(false); } }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50 cursor-pointer"
            >
              {product.isActive ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Delete "${product.name}"? If it already has orders it will be hidden instead, to keep the order history intact.`)) return;
                setBusy(true);
                try { await deleteProductAction(product.id); } finally { setBusy(false); }
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <form action={action} className="border-t border-border bg-muted/30 p-4 space-y-3">
          <input type="hidden" name="id" value={product.id} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Product Name *</label>
              <input name="name" required defaultValue={product.name} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Price (৳) *</label>
              <input name="price" type="number" step="0.01" min="0" required defaultValue={product.price} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Stock <span className="font-normal text-muted-foreground">(blank = unlimited)</span>
              </label>
              <input name="stock" type="number" min="0" defaultValue={product.stock ?? ""} className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
              <textarea name="description" rows={3} defaultValue={product.description ?? ""} className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Product Photo</label>
              <ImageUploadField name="imageUrl" label="Change Photo" defaultPreview={product.imageUrl} />
            </div>
          </div>

          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          {state?.success && <p className="text-xs text-green-700">Saved!</p>}

          <button type="submit" disabled={pending} className="bg-brand text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-brand-dark disabled:opacity-60 cursor-pointer">
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </form>
      )}
    </div>
  );
}

export function OrderStatusButtons({ orderId, status }: { orderId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const next: { label: string; value: "IN_PROGRESS" | "COMPLETED" | "REJECTED"; cls: string }[] = [
    { label: "Processing", value: "IN_PROGRESS", cls: "border-border hover:bg-muted" },
    { label: "Completed", value: "COMPLETED", cls: "border-green-200 text-green-700 hover:bg-green-50" },
    { label: "Reject", value: "REJECTED", cls: "border-red-200 text-red-600 hover:bg-red-50" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {next
        .filter((n) => n.value !== status)
        .map((n) => (
          <button
            key={n.value}
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await updateProductOrderStatusAction(orderId, n.value); } finally { setBusy(false); }
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-50 cursor-pointer ${n.cls}`}
          >
            {n.label}
          </button>
        ))}
    </div>
  );
}
