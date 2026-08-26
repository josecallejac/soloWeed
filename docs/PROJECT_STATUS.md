# Estado Operativo Del Proyecto

Última revisión local: 25 de agosto de 2026.

## Fuentes De Verdad

- La SHA efectiva no se mantiene como dato manual en este documento. Para
  comprobarla, usa `git rev-parse HEAD`, `git ls-remote origin refs/heads/main`
  y la SHA reportada por `GET /api/health`; así se distinguen checkout, remoto
  y producción aunque el repositorio avance.
- El ciclo de estabilización ya está publicado en GitHub; todavía no se ha
  desplegado en el servidor casero.
- `estado-catalogo.md` y `category_deep_dive.md` son snapshots históricos. Sus
  cifras no deben usarse como métricas actuales sin regenerar una auditoría
  autorizada contra PostgreSQL.
- Los archivos `.db` bajo `prisma/` son respaldos históricos de solo lectura.
  No se consultan ni se eliminan como parte de un deploy normal.

## Gates Locales

El ciclo actual pasa `npm run lint`, `npm test` (254 pruebas), `npx tsc
--noEmit`, `npm run build` con una URL PostgreSQL aislada, el audit de
dependencias (producción y desarrollo) y la sintaxis de los scripts Bash. Las
pruebas E2E se ejecutaron 24/24 en Chromium, móvil, Firefox y WebKit contra
PostgreSQL efímero; nunca deben apuntar al `.env` productivo.
`npm audit --audit-level=high` y su variante de producción devuelven 0
vulnerabilidades después de actualizar los overrides transitivos.
La portada ahora serializa las tarjetas iniciales con el mismo payload mínimo de
la carga incremental y la consulta de productos selecciona solo los campos que
necesita el comparador.

## CI Y Producción

El workflow publicado usa únicamente runners estándar, no tiene ejecución
programada, limita cada job a 20 minutos y retiene reportes solo en fallos o
ejecuciones manuales para reducir el consumo de GitHub Free. La ejecución remota
anterior sobre `876aa50` quedó bloqueada antes de comenzar
los steps por el estado de facturación de GitHub. No se considera una regresión
de código; el resultado de la nueva release debe comprobarse cuando GitHub
permita iniciar CI. La producción conserva la release actualmente desplegada
hasta que se confirme un backup y se ejecute `deploy.sh` con una SHA explícita.
El `.env` ignorado de este checkout apunta al PostgreSQL del servidor casero;
las credenciales permanecen fuera de Git. `prebuild` bloquea URLs externas
heredadas de Railway para evitar consultas accidentales. No se modificó la base
ni se ejecutó una migración.

## Regeneración

`npm run ops:reports` audita el peso y los archivos históricos rastreados sin
modificar el árbol. Usa `--strict` solo después de respaldar y aprobar una
limpieza.

`npm run ops:performance` mide tres muestras de la portada, sitemap y health sin
escribir datos. `--strict` aplica los objetivos de 300 KB/800 ms y está pensado
para CI o una revisión posterior al despliegue; una medición pública aislada no
debe confundirse con un benchmark sostenido.

Para actualizar métricas, usa `npm run catalog:audit:export` y conserva el
resultado en el volumen `catalog-audit-data`. La restauración debe probarse con
`scripts/ops/restore-postgres-test.sh`; nunca se ejecuta una migración o una
curación productiva como parte de esta documentación.

## Medicion Publica Reciente

La comprobacion informativa de dos muestras registro portada de 548 KB con p50
de 497 ms, sitemap de 163 KB con p50 de 194 ms y `/api/health` con HTTP 404.
Describe la produccion actualmente publicada, no el arbol local pendiente de
desplegar.
