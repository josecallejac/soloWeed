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
  // `Product.brandKey` es parte de la URL publica, asi que corregir una marca mal
  // puesta mueve una pagina viva. Cada correccion deja su redirect permanente aqui:
  // sin el, la URL vieja cae en not-found (que ademas responde 200 + noindex por la
  // limitacion de Next con searchParams, o sea un soft-404 silencioso).
  // Ver scripts/fix-product-brandkeys.ts para el porque de cada una.
  async redirects() {
    return [
      {
        // "astro" es una TIENDA, no una marca; el producto es de Fórmula Secreta.
        source: "/productos/astro/cleaner-vaporizer-250ml",
        destination: "/productos/formula-secreta/cleaner-vaporizer-250ml",
        permanent: true,
      },
      {
        // "unknown" no es una marca; sus 4 ofertas son Galaxy.
        source: "/productos/unknown/bateria-galaxy-510",
        destination: "/productos/galaxy/bateria-510",
        permanent: true,
      },
    ];
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
