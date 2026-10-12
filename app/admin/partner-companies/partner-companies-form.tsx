"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addPartnerCompanyAction,
  updatePartnerCompanyAction,
  togglePartnerCompanyAction,
  deletePartnerCompanyAction,
} from "@/app/actions/partner-companies";

type CompanyRow = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  isActive: boolean;
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function LogoPicker({ initial, onChange }: { initial?: string | null; onChange: (dataUrl: string) => void }) {
  const [preview, setPreview] = useState<string | null>(initial ?? null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Logo must be under 2 MB."); return; }
    const dataUrl = await readAsDataUrl(file);
    setPreview(dataUrl);
    onChange(dataUrl);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-16 h-16 rounded-xl border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted hover:bg-border/40 transition-colors shrink-0"
        title="Upload logo"
      >
        {preview ? (
          <img src={preview} alt="Logo preview" className="w-full h-full object-contain p-1" />
        ) : (
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="text-[10px] text-red-600 mt-1 max-w-16">{error}</p>}
    </div>
  );
}

function EditRow({ company, onDone }: { company: CompanyRow; onDone: () => void }) {
  const [state, action, pending] = useActionState(updatePartnerCompanyAction, null);
  const [logoUrl, setLogoUrl] = useState(company.logoUrl);

  if (state?.success) {
    onDone();
    return null;
  }

  return (
    <form action={action} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
      <input type="hidden" name="id" value={company.id} />
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <LogoPicker initial={company.logoUrl} onChange={setLogoUrl} />
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-2">
        <input
          name="name"
          defaultValue={company.name}
          placeholder="Company name"
          className="flex-1 min-w-0 text-sm px-2.5 py-1.5 rounded-lg border border-border focus:outline-none focus:border-brand"
        />
        <input
          name="websiteUrl"
          defaultValue={company.websiteUrl ?? ""}
          placeholder="https:// (optional)"
          className="flex-1 min-w-0 text-sm px-2.5 py-1.5 rounded-lg border border-border focus:outline-none focus:border-brand"
        />
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2 shrink-0">
        <button type="submit" disabled={pending} className="flex-1 sm:flex-none text-xs px-3 py-1.5 bg-brand text-white rounded-lg font-medium hover:bg-brand/90 disabled:opacity-50">
          {pending ? "…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="flex-1 sm:flex-none text-xs px-2.5 py-1.5 border border-border rounded-lg text-muted-foreground hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PartnerCompaniesForm({ companies: initial }: { companies: CompanyRow[] }) {
  const [companies, setCompanies] = useState<CompanyRow[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addState, addAction, addPending] = useActionState(addPartnerCompanyAction, null);
  const [addLogoUrl, setAddLogoUrl] = useState("");
  const [addKey, setAddKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (addState?.success) {
      setAddLogoUrl("");
      setAddKey((k) => k + 1); // remounts the add form, clearing its uncontrolled text inputs
    }
  }, [addState]);

  function handleToggle(id: string, current: boolean) {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: !current } : c)));
    startTransition(() => togglePartnerCompanyAction(id, !current));
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this partner company?")) return;
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deletePartnerCompanyAction(id));
  }

  return (
    <div className="space-y-4">
      {companies.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
          No partner companies added yet. Add one below — it'll appear near the bottom of the homepage.
        </p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {companies.map((company) => (
            <div key={company.id} className="px-4">
              {editingId === company.id ? (
                <EditRow company={company} onDone={() => setEditingId(null)} />
              ) : (
                <div className={`flex items-center gap-3 py-3 transition-colors ${company.isActive ? "" : "opacity-50"}`}>
                  <div className="w-12 h-12 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{company.name}</p>
                    {company.websiteUrl && (
                      <p className="text-xs text-muted-foreground truncate">{company.websiteUrl}</p>
                    )}
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={company.isActive}
                      onChange={() => handleToggle(company.id, company.isActive)}
                      disabled={isPending}
                    />
                    <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-brand transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  </label>

                  <button
                    type="button"
                    onClick={() => setEditingId(company.id)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(company.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form
        key={addKey}
        action={addAction}
        className="border border-dashed border-border rounded-xl p-4 space-y-3"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Partner Company</p>
        <input type="hidden" name="logoUrl" value={addLogoUrl} />
        <div className="flex flex-col sm:flex-row gap-3">
          <LogoPicker onChange={setAddLogoUrl} />
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            <input
              name="name"
              required
              placeholder="e.g. Acme Logistics"
              className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:border-brand placeholder:text-muted-foreground"
            />
            <input
              name="websiteUrl"
              placeholder="https:// (optional)"
              className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:border-brand placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={addPending || !addLogoUrl}
            className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand/90 disabled:opacity-50 shrink-0"
          >
            {addPending ? "…" : "+ Add"}
          </button>
        </div>
        {addState?.error && <p className="text-xs text-red-600">{addState.error}</p>}
      </form>
    </div>
  );
}
