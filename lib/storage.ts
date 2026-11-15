// Supabase Storage, used for everything a user uploads.
//
// These images used to be base64 data URLs stored directly in Postgres rows —
// a 4 MB photo becomes ~5.4 MB of text, in every row, loaded on every query
// that touches the table. (An uploadScreenshot() helper existed for this but
// was never called, and read an env var that was never set.)
//
// Two buckets, because the two kinds of image have different audiences:
//   receipts — PRIVATE. Deposit and payment screenshots: someone's bank app,
//              their balance, their transaction IDs. Only ever rendered on
//              admin pages, which mint a short-lived signed URL per render.
//   media    — PUBLIC. Forum photos. Public content on cacheable pages, where
//              an expiring URL would simply break the image.
export const RECEIPTS_BUCKET = "receipts";
export const MEDIA_BUCKET = "media";

// Matches the buckets' own server-side limit, which is the real enforcement —
// this is here so we can fail with a sentence instead of a 413.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]);

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function config() {
  const url = process.env.SUPABASE_URL;
  // SUPABASE_SERVICE_ROLE_KEY is what the Supabase/Vercel integration actually
  // sets; SUPABASE_SECRET_KEY is the newer name for the same thing.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url, key };
}

function randomName(contentType: string): string {
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

export type UploadResult = { bucket: string; path: string };

export async function uploadImage(
  bucket: string,
  folder: string,
  bytes: ArrayBuffer | Uint8Array,
  contentType: string
): Promise<UploadResult> {
  const { url, key } = config();

  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error("Only JPG, PNG, WEBP, GIF and HEIC images can be uploaded.");
  }
  const size = bytes instanceof Uint8Array ? bytes.byteLength : bytes.byteLength;
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error(`Image must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  }

  const path = `${folder}/${randomName(contentType)}`;
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": contentType,
      "Cache-Control": "max-age=31536000",
    },
    body: bytes as BodyInit,
  });

  if (!res.ok) {
    console.error("Storage upload failed:", res.status, await res.text().catch(() => ""));
    throw new Error("Could not save the image. Please try again.");
  }

  return { bucket, path };
}

// What goes in the database: bucket and path, not a URL, so the URL scheme can
// change without a migration. Legacy rows hold a data: or https: URL instead
// and are passed through untouched by resolveUploadUrl.
export function storageRef({ bucket, path }: UploadResult): string {
  return `storage:${bucket}/${path}`;
}

function parseRef(value: string): UploadResult | null {
  if (!value.startsWith("storage:")) return null;
  const rest = value.slice("storage:".length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

// Turns a stored value into something an <img src> can use.
//
// Passes through anything that isn't a storage ref, so the base64 data URLs
// already in the database keep rendering exactly as before — there is no
// backfill and no cutover.
export async function resolveUploadUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;

  const ref = parseRef(value);
  if (!ref) return value; // legacy data: URL, or an external https: URL

  const { url, key } = config();

  if (ref.bucket === MEDIA_BUCKET) {
    return `${url}/storage/v1/object/public/${ref.bucket}/${ref.path}`;
  }

  // Private bucket: mint a short-lived signed URL for this render.
  const res = await fetch(`${url}/storage/v1/object/sign/${ref.bucket}/${ref.path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
  });
  if (!res.ok) {
    console.error("Signed URL failed:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${url}/storage/v1${signedURL}`;
}

// Accepts the value a client submits for an image field. Storage refs and the
// legacy data: URLs are both valid; anything else is rejected so a caller
// can't point an <img> at an arbitrary host.
export function isValidImageRef(value: string): boolean {
  return value.startsWith("storage:") || value.startsWith("data:image/");
}

// Synchronous counterpart to resolveUploadUrl for the public bucket, so
// server components rendering forum and product photos don't have to await
// inside a .map(). Returns null for a private ref — those must be signed.
export function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const ref = parseRef(value);
  if (!ref) return value; // legacy data: URL, or an external https: URL
  if (ref.bucket !== MEDIA_BUCKET) return null;

  const base = process.env.SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${ref.bucket}/${ref.path}`;
}
