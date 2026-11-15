"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { submitServiceRequestAction } from "@/app/actions/service-requests";

type Service = { id: string; name: string; description: string | null; price: number };

const INPUT = "w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white";

function FileUpload({ name, label, required }: { name: string; label: string; required?: boolean }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) { alert("File too large. Max 4MB."); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (hiddenRef.current) hiddenRef.current.value = result;
      if (file.type.startsWith("image/")) setPreview(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input ref={hiddenRef} type="hidden" name={name} />
      <div
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-dashed border-border hover:border-brand cursor-pointer transition-colors group"
      >
        {preview ? (
          <img src={preview} alt={label} className="w-10 h-10 object-cover rounded-md shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-muted-foreground group-hover:text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{fileName ?? "Click to upload"}</p>
          <p className="text-xs text-muted-foreground">JPG, PNG, PDF · max 4MB</p>
        </div>
        {fileName && (
          <button type="button" onClick={(e) => { e.stopPropagation(); setFileName(null); setPreview(null); if (hiddenRef.current) hiddenRef.current.value = ""; if (fileRef.current) fileRef.current.value = ""; }}
            className="text-muted-foreground hover:text-red-500 shrink-0 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
    </div>
  );
}

export function ServiceRequestForm({ services }: { services: Service[] }) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitServiceRequestAction, null);

  useEffect(() => {
    if (state?.success) { setOpen(false); setSelectedService(null); }
  }, [state]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl border border-border p-6 flex flex-col hover:shadow-md hover:border-brand/30 transition-all">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-foreground text-lg mb-1">{s.name}</h3>
            {s.description && <p className="text-sm text-muted-foreground mb-4 flex-1">{s.description}</p>}
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Service Fee</p>
                <p className="text-xl font-bold text-brand">৳{s.price.toFixed(2)}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedService(s); setOpen(true); }}
                className="bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
              >
                Apply Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {open && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-bold text-foreground">Apply for Service</h2>
                <p className="text-xs text-muted-foreground">{selectedService.name} · ৳{selectedService.price.toFixed(2)}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form action={action} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <input type="hidden" name="serviceId" value={selectedService.id} />

              {/* Contact info */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Information</p>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input name="fullName" type="text" required placeholder="e.g. Mohammad Rahman" className={INPUT} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Phone <span className="text-red-500">*</span></label>
                    <input name="phone" type="tel" required placeholder="+65 9000 0000" className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Email <span className="text-red-500">*</span></label>
                    <input name="email" type="email" required placeholder="you@email.com" className={INPUT} />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Documents to Upload</p>
                <FileUpload name="passportUrl"   label="Passport Copy" required />
                <FileUpload name="nidUrl"        label="NID / National ID" required />
                <FileUpload name="photoUrl"      label="Passport Size Photo" />
                <FileUpload name="workPermitUrl" label="Work Permit / EP" />
                <FileUpload name="otherUrl"      label="Other Document" />
              </div>

              {state?.error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{state.error}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={pending}
                  className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors">
                  {pending ? "Submitting…" : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {state?.success && (
        <div className="fixed bottom-20 xl:bottom-6 right-6 z-50 bg-green-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Application submitted! We will contact you soon.
        </div>
      )}
    </>
  );
}
