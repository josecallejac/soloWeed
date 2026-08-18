# Handoff Para Nuevos Agentes

Este archivo es el punto de entrada para cualquier modelo, agente o persona que tome el proyecto. No dependas del historial de chat: usa estas reglas versionadas como fuente de verdad operativa.

## Orden De Lectura

1. `README.md` para contexto general del producto.
2. `AGENTS.md` para instrucciones operativas resumidas.
3. `docs/PROJECT_RULES.md` para invariantes del proyecto.
4. `docs/RUNBOOK.md` para comandos exactos.
5. `docs/SCRAPER_RULES.md` si vas a tocar scraping o fuentes.
6. `docs/MATCHING_AND_SLUGS.md` si vas a tocar matching, catalogo, productos o URLs.
7. `docs/DATA_MODEL.md` si vas a tocar Prisma, migraciones o persistencia.

## Reglas No Negociables

- Usa `npm`; `package-lock.json` es el lockfile.
- Desarrollo y build usan Webpack: `npm run dev` y `npm run build`.
- No cambies a Turbopack sin resolver primero la externalizacion de Prisma.
- Para cambios de app, scraper, matching o datos derivados, ejecuta `npm run lint` y `npm run build` antes de terminar.
- No edites manualmente la base PostgreSQL ni ejecutes migraciones durante un deploy normal: la base del servidor casero ya está migrada y poblada.
- No edites `.next/`, `node_modules/`, clientes Prisma generados ni otros artefactos generados.
- No cambies la estructura publica de URLs salvo solicitud explicita.
- No reviertas cambios ajenos sin permiso explicito.

## Estado Aprobado Del Catalogo

- El catalogo home muestra comparables multi-tienda: `storeCount > 1`.
- La curacion normal usa `CURATE_MIN_STORES=2`.
- El detalle de producto puede mostrar la grilla de comparacion aunque el producto tenga una sola oferta asociada.
- `Product` representa una identidad clara de producto, no una fila generica para cualquier oferta.

## Comandos Principales

```powershell
npm install
npm run scrape
npm run lint
npm run build
```

Las migraciones solo se ejecutan explícitamente sobre una base de pruebas autorizada
(por ejemplo, el PostgreSQL efímero de CI); no forman parte del deploy normal.

Curacion normal aprobada:

```powershell
$env:CURATE_MIN_STORES="2"; npx tsx scripts/curate-comparable-products.ts --apply
```

Scrape limitado para validar cambios:

```powershell
$env:SCRAPE_LIMIT_PER_STORE="20"; $env:SCRAPE_DELAY_MS="100"; npm run scrape
```

## Antes De Terminar

- Explica que cambiaste y por que.
- Menciona comandos ejecutados y resultado.
- Si no pudiste ejecutar una verificacion, dilo explicitamente.
- Si tocaste scraper, valida con corrida limitada.
- Si tocaste matching o curacion, revisa que los `Product` creados tengan identidad clara y slugs publicos limpios.
