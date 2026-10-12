"use client";

import { useRef, useState } from "react";

type Props = {
  name?: string;
  maxSizeMB?: number;
  label?: string;
};

export function ImageUploadField({ name = "imageUrl", maxSizeMB = 2, label = "Add Photo" }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be under ${maxSizeMB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clear() {
    setPreview(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <input type="hidden" name={name} value={preview ?? ""} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {preview ? (
        <div className="relative inline-block">
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-dashed border-border hover:bg-muted transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {label}
        </button>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
