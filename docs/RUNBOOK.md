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

No existe script de tests en `package.json`.

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

## Backfills

```powershell
npm run brand:backfill
npm run model:backfill
```

Si cambias slugs o keys, verifica que `brandKey`, `modelKey` y `modelSlug` sigan sincronizados.

## Checklist Por Tipo De Cambio

- App/UI/rutas: `npm run lint`; `npm run build`.
- Scraper: corrida limitada; `npm run lint`; `npm run build`.
- Matching/curacion: dry-run; apply si corresponde; verificar slugs; `npm run lint`; `npm run build`.
- Datos derivados: no editar SQLite manualmente; usar scripts o migraciones.
