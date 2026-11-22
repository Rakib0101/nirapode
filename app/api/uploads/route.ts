import { getSession } from "@/lib/session";
import { getMobileSession } from "@/lib/mobile-session";
import {
  MAX_UPLOAD_BYTES,
  MEDIA_BUCKET,
  RECEIPTS_BUCKET,
  storageRef,
  uploadImage,
} from "@/lib/storage";

// Where an upload is allowed to land. A caller picks a purpose, not a bucket
// and not a path — otherwise the first thing anyone would try is writing into
// someone else's folder.
const PURPOSES = {
  deposit: { bucket: RECEIPTS_BUCKET, folder: "deposits" },
  payment: { bucket: RECEIPTS_BUCKET, folder: "payments" },
  transfer: { bucket: RECEIPTS_BUCKET, folder: "gcash-transfers" },
  forum: { bucket: MEDIA_BUCKET, folder: "forum" },
  product: { bucket: MEDIA_BUCKET, folder: "products" },
} as const;

type Purpose = keyof typeof PURPOSES;

function isPurpose(value: string | null): value is Purpose {
  return value !== null && value in PURPOSES;
}

// Shared by the website and the app: the site sends a session cookie, the app
// sends a Bearer token. Either way an upload requires a signed-in user, so
// the endpoint can't be used as free image hosting.
export async function POST(req: Request) {
  try {
    const session = (await getSession()) ?? (await getMobileSession(req));
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const purpose = form.get("purpose");
    if (typeof purpose !== "string" || !isPurpose(purpose)) {
      return Response.json({ error: "Unknown upload purpose." }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No file was uploaded." }, { status: 400 });
    }
    if (file.size === 0) return Response.json({ error: "That file is empty." }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json(
        { error: `Image must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` },
        { status: 400 }
      );
    }

    const { bucket, folder } = PURPOSES[purpose];
    const result = await uploadImage(bucket, folder, await file.arrayBuffer(), file.type);

    // The caller stores this string verbatim in whatever field it belongs to.
    return Response.json({ ref: storageRef(result) });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
