# Reglas Del Proyecto

## Proposito

SoloWeed es un comparador de precios de parafernalia en Chile. La app no vende productos: enlaza a tiendas externas y muestra precios referenciales que deben confirmarse en la tienda fuente.

## Stack

- Next.js 16 App Router.
- TypeScript.
- Tailwind CSS.
- Prisma.
- PostgreSQL en el servidor casero.
- Cheerio para scraping HTML/JSON-LD.

## Arquitectura

- Home/catalogo: `src/app/page.tsx`.
- Detalle comparativo: `src/app/productos/[...slug]/page.tsx`.
- Prisma singleton: `src/lib/prisma.ts`.
- Scraper principal: `scripts/scrape.ts`.
- Curacion de productos comparables: `scripts/curate-comparable-products.ts`.
- Auto-match de ofertas: `scripts/auto-match-offers.ts`.
- Expansion de ofertas curadas: `scripts/expand-curated-product-offers.ts`.

## Invariantes

- Las URLs publicas actuales son estables.
- Las rutas de producto soportadas son `/productos/<slug>` y `/productos/<brandKey>/<modelSlug>`.
- Si existe marca, la URL preferida es `/productos/<brandKey>/<modelSlug>`.
- `brandKey`, `modelKey` y `modelSlug` deben conservarse sincronizados.
- El catalogo home debe mostrar comparables multi-tienda: `storeCount > 1`.
- El detalle de producto puede mostrar una sola oferta si esa oferta pertenece a un `Product` curado.
- `Product` debe representar identidad clara de producto: misma marca/modelo/variante/tamano.
- `PriceHistory` solo se agrega cuando cambia precio, precio original o stock.
- **REGLA ESTRICTA**: Los productos que han alcanzado 4 tiendas son **ESTRICTAMENTE INTOCABLES**. Ya están verificados. No modificar sus ofertas, ni URLs ni slugs. Todo esfuerzo y algoritmo debe enfocarse exclusivamente en mejorar o agrupar productos de 1, 2 y 3 tiendas.
  - **Excepción "solo sumar" (aprobada 17 jul 2026, ampliada 24 jul 2026)**: un producto congelado de 4 tiendas SÍ puede recibir ofertas de tiendas NUEVAS (ej. Kushbreak la 5ª, Friendly Grow la 6ª) y subir a 5 o 6. Lo prohibido sigue siendo quitar, cambiar o reasignar sus ofertas existentes y su URL. `protect --verify` debe mostrar solo esas adiciones intencionales.

## No Cambiar Sin Permiso Explicito

- Estructura publica de URLs.
- Build desde Webpack hacia Turbopack.
- Externalizacion de Prisma en `next.config.ts`.
- Criterio del home `storeCount > 1`.
- Curacion normal `CURATE_MIN_STORES=2`.
- Migraciones o restauraciones de la base productiva sin autorización explícita.

## Archivos Generados O Sensibles

No edites manualmente:

- `.next/`
- `node_modules/`
- cliente Prisma generado
- bases de datos y respaldos históricos en `prisma/`
- archivos `.env` con secretos reales

## Flujo De Cambios

- UI o rutas Next.js: revisa `src/app/page.tsx`, `src/app/productos/[...slug]/page.tsx` y componentes relacionados; ejecuta `npm run lint` y `npm run build`.
- Scraper: modifica `scripts/scrape.ts`; ejecuta corrida limitada; ejecuta `npm run lint` y `npm run build`.
- Clasificacion, marcas o categorias: actualiza reglas de scraping y constantes del matcher si el detalle depende de esos datos.
- Matching o curacion: verifica que no se creen `Product` innecesarios y que las URLs publicas sigan limpias.
- Slugs, backfill o migraciones: conserva juntos `brandKey`, `modelKey` y `modelSlug`; no edites PostgreSQL manualmente ni ejecutes migraciones en un deploy normal.

## Gotchas

- `searchParams` y `params` de rutas dinamicas estan tipados como Promises en este codebase con Next 16.
- `next.config.ts` define `serverExternalPackages: ["@prisma/client"]`; mantenlo salvo revision intencional.
- Scrapes completos llaman sitios externos y pueden ser lentos.
