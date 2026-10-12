import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Project lives on an ExFAT USB volume — Turbopack's persistent dev
    // filesystem cache (default on since Next 16.1) grows to gigabytes of
    // small random-access reads/writes there and corrupts, causing repeated
    // "Next.js package not found" panics and an HMR reload loop.
    serverActions: {
      bodySizeLimit: "10mb",
    },
    turbopackFileSystemCacheForDev: false,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
