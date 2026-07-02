import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // El catálogo de imágenes de las tiendas es estable: 30 días de cache
    // evita reoptimizar las mismas variantes en cada ciclo.
    minimumCacheTTL: 2_592_000,
    // Solo los CDNs de las 4 tiendas scrapeadas: un wildcard convierte
    // /_next/image en un proxy abierto de imágenes para terceros.
    remotePatterns: [
      { protocol: "https", hostname: "cdnx.jumpseller.com" },
      { protocol: "https", hostname: "images.jumpseller.com" },
      { protocol: "https", hostname: "www.growbaratochile.cl" },
      { protocol: "https", hostname: "piranha.cl" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
