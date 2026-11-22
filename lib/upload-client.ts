// Browser-side half of the upload flow: hand it a File, get back the string
// to put in the form field. Replaces reading the file into a base64 data URL
// and posting several megabytes of text through a server action.
export const MAX_UPLOAD_MB = 4;

export type UploadPurpose = "deposit" | "payment" | "transfer" | "forum" | "product";

export async function uploadImageFile(file: File, purpose: UploadPurpose): Promise<string> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`Image must be under ${MAX_UPLOAD_MB} MB.`);
  }

  const body = new FormData();
  body.set("purpose", purpose);
  body.set("file", file);

  const res = await fetch("/api/uploads", { method: "POST", body });
  const data = (await res.json().catch(() => null)) as { ref?: string; error?: string } | null;

  if (!res.ok || !data?.ref) {
    throw new Error(data?.error ?? "Upload failed. Please try again.");
  }
  return data.ref;
}
