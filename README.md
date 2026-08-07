# SoloWeed

Comparador de precios de parafernalia en Chile, inspirado en el flujo de SoloTodo y enfocado en productos como bongs, pipas, moledores, papelillos, contenedores, limpieza y vaporizadores herbales.

## Stack

- Next.js 16 + TypeScript + Tailwind CSS
- Prisma + PostgreSQL
- Cheerio para scraping HTML/JSON-LD

## Antes De Modificar El Proyecto

Si tomas este proyecto como modelo, agente o colaborador nuevo, lee primero:

- `AGENTS.md`
- `docs/HANDOFF.md`
- `docs/PROJECT_RULES.md`

La documentacion operativa completa esta en `docs/`:

- `docs/RUNBOOK.md`
- `docs/SCRAPER_RULES.md`
- `docs/MATCHING_AND_SLUGS.md`
- `docs/DATA_MODEL.md`

## Comandos

```bash
npm install
npm run scrape
npm run dev
```

La base productiva ya está migrada en el servidor casero. Configura `DATABASE_URL`
en el entorno de despliegue antes de iniciar la app; no ejecutes migraciones ni
recrees datos como parte de un deploy normal.

## Operación

- Healthcheck de aplicación y PostgreSQL: `GET /api/health` responde `200` con
  `{ "ok": true, "database": "ok" }`; responde `503` si la base no está disponible.
- `npm run test` ejecuta pruebas unitarias sin acceder a producción.
- `npm run test:integration` ejecuta las pruebas que consultan PostgreSQL; úsalo
  solo desde un entorno autorizado contra una base de pruebas.

## Scraping

El scraper usa sitemaps y paginas publicas de categorias, evitando rutas de carrito, checkout, usuario, busqueda y administracion. Por defecto intenta guardar hasta 35 productos por tienda.

```bash
npm run scrape
```

Variables opcionales:

```bash
SCRAPE_LIMIT_PER_STORE=25 npm run scrape
SCRAPE_DELAY_MS=500 npm run scrape
SCRAPE_TIMEOUT_MS=20000 npm run scrape
```

En PowerShell:

```powershell
$env:SCRAPE_LIMIT_PER_STORE="25"; npm run scrape
```

## Fuentes Iniciales

- Astro Growshop
- Fumetas
- Piranha
- GrowBarato Chile

## Notas

- SoloWeed no vende productos; enlaza a la tienda original.
- Los precios son referenciales y deben confirmarse en la tienda fuente.
- El historial de precios se registra solo cuando cambia precio, precio original o stock.
- El modo dev y el build usan Webpack porque Turbopack actualmente falla al externalizar Prisma en este proyecto.
