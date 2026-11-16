"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global root error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans antialiased text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Temporary Connection Issue</h1>
          <p className="text-sm text-slate-500 mb-6">
            The server encountered a temporary glitch. Please try reloading the page.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => reset()}
              className="bg-emerald-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
            >
              Reload Page
            </button>
            {/* A full page load on purpose: the root layout just crashed, so don't
                client-navigate through the broken React tree with <Link>. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="border border-slate-200 text-slate-700 text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Go to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
