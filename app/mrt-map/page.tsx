import { MRTMapViewer } from "@/components/mrt-map-viewer";

export const metadata = {
  title: "Singapore MRT Map — Nirapode",
  description: "Zoomable Singapore MRT & LRT system map.",
};

// Full screen, deliberately. This is a pan-and-zoom canvas, and the page used
// to spend its top half on a breadcrumb, a title and a paragraph explaining
// that you can pinch to zoom — on a phone that left a letterbox of actual map.
// The site chrome is dropped for this route too (see components/shell.tsx);
// the viewer carries its own Back button.
export default function MrtMapPage() {
  return (
    <div className="fixed inset-0 h-[100dvh]">
      <MRTMapViewer />
    </div>
  );
}
