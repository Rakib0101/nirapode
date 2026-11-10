import Link from "next/link";
import { MRTMapViewer } from "@/components/mrt-map-viewer";

export const metadata = {
  title: "Singapore MRT Map — Nirapode",
  description: "Zoomable Singapore MRT & LRT system map, with a downloadable PDF for offline use.",
};

// The MRT map used to be the entire homepage hero. It's a genuinely useful
// tool but not what most people open the app for, so it now lives on its own
// page, reachable from the More menu (see components/bottom-nav.tsx).
export default function MrtMapPage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-brand transition-colors">Home</Link>
            <span>/</span>
            <span className="text-foreground">MRT Map</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Singapore MRT Map</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pinch, scroll, or use the buttons to zoom. Download the PDF to keep it offline on your phone.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <MRTMapViewer />
        </div>
      </div>
    </div>
  );
}
