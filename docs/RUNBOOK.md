# Runbook

Comandos reproducibles para operar el proyecto. Los ejemplos usan PowerShell porque el entorno principal es Windows.

## Setup Local

```powershell
npm install
Copy-Item .env.example .env
npm run db:migrate
```

La base SQLite por defecto usa:

```text
DATABASE_URL="file:./dev.db"
```

## Desarrollo

```powershell
npm run dev
```

El proyecto debe seguir usando Webpack.

## Build Y Verificacion

```powershell
npm run lint
npm run build
```

## Tests

```powershell
npm run test
```

Ejecuta `tsx --test` sobre `tests/password.test.ts`, `tests/export-catalog-audit.test.ts`, `tests/matching.test.ts` y `tests/catalog.test.ts`.

Para correr un solo archivo:

```powershell
npx tsx --test tests/matching.test.ts
```

## Scraping

Scrape normal:

```powershell
npm run scrape
```

Scrape limitado recomendado para validar cambios:

```powershell
$env:SCRAPE_LIMIT_PER_STORE="20"; $env:SCRAPE_DELAY_MS="100"; npm run scrape
```

Scrape de una tienda especifica:

```powershell
$env:SCRAPE_STORES="astrogrowshop"; $env:SCRAPE_LIMIT_PER_STORE="20"; $env:SCRAPE_DELAY_MS="100"; npm run scrape
```

Variables utiles:

- `SCRAPE_LIMIT_PER_STORE`: limita productos por tienda.
- `SCRAPE_DELAY_MS`: pausa entre requests.
- `SCRAPE_TIMEOUT_MS`: timeout de requests.
- `SCRAPE_STORES`: filtra tiendas por slug/configuracion.

## Curacion De Catalogo

Antes de curar, respalda los vinculos de los productos multi-tienda (los de 4 tiendas no deben cambiar jamas):

```powershell
npx tsx scripts/protect-multistore-links.ts --save
```

Dry-run con reglas normales:

```powershell
npm run catalog:curate
```

Aplicar reglas normales aprobadas:

```powershell
$env:CURATE_MIN_STORES="2"; npx tsx scripts/curate-comparable-products.ts --apply
```

Variables:

- `CURATE_MIN_STORES=2`: minimo aprobado para curacion normal.
- `CURATE_MAX_PRODUCTS_PER_CATEGORY=20`: maximo base por categoria.

Nota: si `npm run catalog:curate -- --apply` no pasa argumentos correctamente en tu shell, usa `npx tsx scripts/curate-comparable-products.ts --apply`.

## Auto-Match

Ejemplo por categorias:

```powershell
$env:AUTO_MATCH_MIN_STORES="2"; $env:AUTO_MATCH_CATEGORIES="Bongs,Pipas"; npm run match:auto
```

## Expansion De Ofertas Curadas

```powershell
$env:EXPAND_MIN_SCORE="0.86"; npm run catalog:expand
```

## Proteccion De Productos Multi-Tienda

Despues de curar y linkear, verifica que los productos protegidos conserven sus ofertas; restaura si algo se rompio:

```powershell
npx tsx scripts/protect-multistore-links.ts --verify
npx tsx scripts/protect-multistore-links.ts --restore
```

Variables: `PROTECT_MIN_STORES` (default 3) controla que productos se respaldan.

## Backfills

```powershell
npm run brand:backfill
npm run model:backfill
```

`brand:backfill` es no destructivo: no pisa `brandKey` existentes con null ni cambia `Product.brandKey` (parte de la URL publica). Las listas de marcas/aliases viven en `src/lib/matching-constants.ts`.

Si cambias slugs o keys, verifica que `brandKey`, `modelKey` y `modelSlug` sigan sincronizados.

## Checklist Por Tipo De Cambio

- App/UI/rutas: `npm run lint`; `npm run build`.
- Scraper: corrida limitada; `npm run lint`; `npm run build`.
- Matching/curacion: dry-run; apply si corresponde; verificar slugs; `npm run lint`; `npm run build`.
- Datos derivados: no editar SQLite manualmente; usar scripts o migraciones.
