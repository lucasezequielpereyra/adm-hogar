import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        // El service worker no se cachea y controla todo el sitio.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ]
  },
  experimental: {
    optimizePackageImports: ["pixelarticons"],
  },
}

export default nextConfig
