"use client";

import { useRef, useState } from "react";
import { MAX_UPLOAD_MB, uploadImageFile, type UploadPurpose } from "@/lib/upload-client";

type Props = {
  name?: string;
  label?: string;
  // Which bucket and folder the file lands in. See app/api/uploads/route.ts.
  purpose?: UploadPurpose;
  // Existing image to show when editing a record. Optional, so every current
  // caller keeps the previous blank-start behaviour.
  defaultPreview?: string | null;
};

export function ImageUploadField({
  name = "imageUrl",
  label = "Add Photo",
  purpose = "forum",
  defaultPreview = null,
}: Props) {
  // `value` is what the form submits — a storage ref, or whatever the record
  // already held. `preview` is only ever for the eye: a local object URL for a
  // freshly picked file, since a storage ref isn't something <img> can render.
  const [value, setValue] = useState<string>(defaultPreview ?? "");
  const [preview, setPreview] = useState<string | null>(defaultPreview);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    // Upload immediately rather than at submit time, so the user finds out
    // now if the file is too big, and the form post stays small.
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    try {
      const ref = await uploadImageFile(file, purpose);
      setValue(ref);
      setPreview(localPreview);
    } catch (err) {
      URL.revokeObjectURL(localPreview);
      setError(err instanceof Error ? err.message : "Upload failed.");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setValue("");
    setPreview(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {preview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview or a signed storage URL; next/image can optimize neither */}
          <img src={preview} alt="Attached" className="max-h-40 rounded-lg border border-border object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-xs leading-none cursor-pointer"
            title="Remove photo"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-dashed border-border hover:bg-muted transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {uploading ? "Uploading…" : label}
        </button>
      )}
      {!error && <p className="sr-only">Maximum {MAX_UPLOAD_MB} MB</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
