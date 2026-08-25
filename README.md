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
- `docs/PROJECT_STATUS.md`
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

Las plantillas separan explícitamente ambos contextos:

- `.env.example` → desarrollo desde el notebook, usando `192.168.100.2:5435`.
- `.env.docker.example` → Docker en el servidor, usando `db:5432` (DNS interno
  de Compose; el servicio conserva el contenedor `soloweed-db`).

El flujo versionado usa `deploy.sh`: construye Next.js en el host, empaqueta la
imagen Docker, espera `/api/health` y revierte la imagen anterior si falla.

El despliegue reproducible está en `Dockerfile` y `docker-compose.yml`. Consulta
`docs/RUNBOOK.md` antes de recrear el contenedor de PostgreSQL: Compose exige el
nombre del volumen existente para evitar levantar una base vacía por accidente.

## Operación

- Healthcheck de aplicación, PostgreSQL y frescura del catálogo: `GET /api/health`
  responde `200` cuando incluye `{ "ok": true, "database": "ok", "catalog": "fresh" }`.
  Responde `503` si la base no está disponible, el catálogo está vacío o alguna tienda
  activa no tiene ofertas vistas dentro de `CATALOG_FRESHNESS_HOURS` (72 por defecto).
  También informa `release.sha` y `release.builtAt` para distinguir el código local,
  CI y la imagen realmente desplegada.
- `npm run test` ejecuta pruebas unitarias sin acceder a producción.
- `npm run build` valida primero que `DATABASE_URL` no sea una URL heredada de
  Railway; usa `SKIP_DATABASE_STATIC_PARAMS=1` solo cuando el build no deba
  consultar PostgreSQL.
- `npm run test:integration` ejecuta las pruebas que consultan PostgreSQL; úsalo
  solo desde un entorno autorizado contra una base de pruebas.
- En el host Docker, `scripts/ops/backup-postgres.sh` crea backups comprimidos de
  PostgreSQL con checksum y retención; falla si `pg_dump` falla. La restauración
  aislada se valida con `scripts/ops/restore-postgres-test.sh`.
  PostgreSQL y aplica retención; `scripts/ops/check-health.sh` monitorea la URL
  pública y puede notificar un webhook opcional.
- GitHub Actions valida `lint`, pruebas unitarias, E2E y build en cada push o pull
  request a `main`, usando PostgreSQL efímero y migraciones aisladas de producción.

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
