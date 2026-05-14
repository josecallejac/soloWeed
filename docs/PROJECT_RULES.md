# Reglas Del Proyecto

## Proposito

SoloWeed es un comparador de precios de parafernalia en Chile. La app no vende productos: enlaza a tiendas externas y muestra precios referenciales que deben confirmarse en la tienda fuente.

## Stack

- Next.js 16 App Router.
- TypeScript.
- Tailwind CSS.
- Prisma.
- SQLite local por defecto.
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

## No Cambiar Sin Permiso Explicito

- Estructura publica de URLs.
- Build desde Webpack hacia Turbopack.
- Externalizacion de Prisma en `next.config.ts`.
- Criterio del home `storeCount > 1`.
- Curacion normal `CURATE_MIN_STORES=2`.
- Persistencia manual en `prisma/dev.db`.

## Archivos Generados O Sensibles

No edites manualmente:

- `.next/`
- `node_modules/`
- cliente Prisma generado
- `prisma/dev.db`
- archivos `.env` con secretos reales

## Flujo De Cambios

- UI o rutas Next.js: revisa `src/app/page.tsx`, `src/app/productos/[...slug]/page.tsx` y componentes relacionados; ejecuta `npm run lint` y `npm run build`.
- Scraper: modifica `scripts/scrape.ts`; ejecuta corrida limitada; ejecuta `npm run lint` y `npm run build`.
- Clasificacion, marcas o categorias: actualiza reglas de scraping y constantes del matcher si el detalle depende de esos datos.
- Matching o curacion: verifica que no se creen `Product` innecesarios y que las URLs publicas sigan limpias.
- Slugs, backfill o migraciones: conserva juntos `brandKey`, `modelKey` y `modelSlug`; no edites SQLite manualmente.

## Gotchas

- `searchParams` y `params` de rutas dinamicas estan tipados como Promises en este codebase con Next 16.
- `next.config.ts` define `serverExternalPackages: ["@prisma/client"]`; mantenlo salvo revision intencional.
- Scrapes completos llaman sitios externos y pueden ser lentos.
