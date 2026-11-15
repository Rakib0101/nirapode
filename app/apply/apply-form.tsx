"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { submitApplicationAction } from "@/app/actions/apply";

type Service = { id: string; name: string; description: string | null };

const INPUT = "w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white";

function FileUploadField({
  name,
  label,
  required,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      alert("File too large. Max 4MB.");
      return;
    }
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
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input ref={hiddenRef} type="hidden" name={name} />
      <div
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-dashed border-border hover:border-brand cursor-pointer transition-colors group"
      >
        {preview ? (
          <img src={preview} alt={label} className="w-10 h-10 object-cover rounded-md" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-muted-foreground group-hover:text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {fileName ?? "Click to upload"}
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, PDF · max 4MB</p>
        </div>
        {fileName && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              setFileName(null);
              if (hiddenRef.current) hiddenRef.current.value = "";
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

export function ApplyForm({ services }: { services: Service[] }) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitApplicationAction, null);

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      setSelectedService(null);
    }
  }, [state]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-muted-foreground text-sm">No services available right now. Check back later.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-2xl border border-border p-5 hover:shadow-sm hover:border-brand/30 transition-all">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedService(service); setOpen(true); }}
                className="shrink-0 text-xs font-semibold bg-brand text-white px-3.5 py-1.5 rounded-lg hover:bg-brand-dark transition-colors"
              >
                Apply Now
              </button>
            </div>
            <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
            {service.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">{service.description}</p>
            )}
          </div>
        ))}
      </div>

      {open && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-bold text-foreground">Apply for Service</h2>
                <p className="text-xs text-muted-foreground">{selectedService.name}</p>
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

              <div className="bg-brand-50 border border-brand/20 rounded-xl px-4 py-3 text-sm text-brand">
                Upload your documents below. At least Resume or ePassport is required.
              </div>

              <FileUploadField name="resumeUrl" label="Resume / CV" required />
              <FileUploadField name="ePassportUrl" label="ePassport / Passport" required />
              <FileUploadField name="permitUrl" label="Work Permit" />
              <FileUploadField name="oldPassportUrl" label="Old Passport" />
              <FileUploadField name="otherFileUrl" label="Other Document" />

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
        <div className="fixed bottom-20 xl:bottom-6 right-6 z-50 bg-green-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">
          Application submitted successfully!
        </div>
      )}
    </>
  );
}
