import { resolveUploadUrl } from "@/lib/storage";
import { ScreenshotViewerModal } from "@/components/screenshot-modal";
import { ScreenshotViewer } from "@/app/admin/shares/[id]/screenshot-viewer";
import { ProcessPurchaseForm } from "@/app/admin/purchases/process-form";

// Payment screenshots live in a private bucket, so what's in the database is a
// ref, not something an <img> can load — it has to be signed per render. This
// is an async server component rather than a helper call so it can be dropped
// straight into a .map() over rows, which is how every admin list uses it.
//
// Rows written before the storage migration hold an inline data URL and come
// back from resolveUploadUrl untouched, so both kinds render side by side.
export async function StoredScreenshot({
  value,
  label,
}: {
  value: string | null | undefined;
  label: string;
}) {
  const url = await resolveUploadUrl(value);
  if (!url) return null;
  return <ScreenshotViewerModal url={url} label={label} />;
}

// The same resolution for the two admin screens that render their own viewer
// rather than the modal. Async server components, so they can sit inside the
// .map() over rows where a bare await isn't allowed.
export async function StoredScreenshotViewer({ value }: { value: string | null | undefined }) {
  const url = await resolveUploadUrl(value);
  if (!url) return null;
  return <ScreenshotViewer src={url} />;
}

export async function StoredProcessPurchaseForm({
  requestId,
  txId,
  screenshotValue,
}: {
  requestId: string;
  txId: string | null;
  screenshotValue: string | null;
}) {
  return (
    <ProcessPurchaseForm requestId={requestId} txId={txId} screenshotUrl={await resolveUploadUrl(screenshotValue)} />
  );
}
