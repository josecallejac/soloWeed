# Estado Operativo Del Proyecto

Última revisión local: 31 de agosto de 2026.

## Fuentes De Verdad

- La SHA efectiva no se mantiene como dato manual en este documento. Para
  comprobarla, usa `git rev-parse HEAD`, `git ls-remote origin refs/heads/main`
  y la SHA reportada por `GET /api/health`; así se distinguen checkout, remoto
  y producción aunque el repositorio avance.
- El estado descrito aquí es un corte de auditoría, no un monitor. La release de
  Canasta inteligente fue validada antes de su publicación; su estado posterior
  debe comprobarse con Git, CI, el host y `/api/health`.
- `estado-catalogo.md` y `category_deep_dive.md` son snapshots históricos. Sus
  cifras no deben usarse como métricas actuales sin regenerar una auditoría
  autorizada contra PostgreSQL.
- Los archivos `.db` bajo `prisma/` son respaldos históricos de solo lectura.
  No se consultan ni se eliminan como parte de un deploy normal.

## Gates Locales

La release candidata local pasa `npm run lint`, `npm test` (308 pruebas), `npx tsc
--noEmit`, `npm run build` con `SKIP_DATABASE_STATIC_PARAMS=1`, el audit completo
de dependencias, `git diff --check` y la configuración Compose con variables de
validación. Los scripts Bash pasan sintaxis sobre su representación LF, que es
la almacenada por Git y la usada en Linux. El verificador funcional de release
también está preparado para exigir las landings públicas y el límite de 50 IDs.

La suite Playwright actual lista 56 pruebas en Chromium, móvil Chromium, Firefox y
WebKit. El 31 de agosto pasó 56/56 contra una PostgreSQL efímera creada en WSL y
expuesta únicamente como `127.0.0.1:55990`; se aplicaron las migraciones y el seed
E2E antes de la corrida. Nunca se usó el `.env` productivo. La Canasta y Mi lista
conservan sus enlaces por fragmento con vista previa antes de reemplazar o mezclar
el estado local.

La candidata local también incorpora páginas SEO dinámicas por categoría y marca,
enlaces internos desde los filtros y entradas condicionadas en el sitemap. Estas
rutas requieren la base viva al solicitarse y no inventan categorías cuando el
catálogo está desconectado.

## CI Y Producción

El workflow publicado usa únicamente runners estándar, no tiene ejecución
programada, limita cada job a 20 minutos y retiene reportes solo en fallos o
ejecuciones manuales para reducir el consumo de GitHub Free. La corrección se
publicó en `23a2f20` después de que CI remoto 33415375037 pasara lint, tests,
TypeScript, build, validación Bash y E2E Chromium/móvil. El push y el deploy se
consideran gates distintos: la SHA efectiva se comprobó también desde el host.

El 31 de agosto se verificaron desde esta estación los puertos `22`, `5435` y `8093`.
En el host, el checkout y `/api/health` coinciden en la release publicada
`23a2f202bddf073c8d0a3f2461cc3d4add85973d`; `soloweed-db` y
`soloweed-soloweed-1` están `running/healthy`. El health público informa
`database=ok`, `catalog=fresh` y `staleStores=[]`. El verificador funcional
encontró 14 landings de categorías y 65 de marcas en el sitemap, HTTP 200 para
`/categorias/papelillos` y `/marcas/raw`, y procesamiento de 50 IDs en
`/api/canasta`.

El deploy creó el backup
`/mnt/ollama_models/backups/soloweed/soloweed-20260831T164819Z.sql.gz`. `gzip -t` y
el checksum SHA-256
`1ae361af850be9c9b52c02eb0dddd41643fc50584833492a2f7792780457dfb7` pasaron.
Además, el backup anterior `soloweed-20260831T152458Z.sql.gz` se conservó.

La publicación correctiva pasó backup, swap, health y
`scripts/ops/verify-release.sh` para su SHA concreta. Después se instalaron y
activaron los timers systemd versionados: backup diario, refresco semanal con
reintento, healthcheck cada 15 minutos y alertas Telegram opcionales.

El `.env` ignorado de este checkout apunta al PostgreSQL del servidor casero;
las credenciales permanecen fuera de Git. `prebuild` bloquea URLs externas
heredadas de Railway para evitar consultas accidentales. No se modificó la base
productiva ni se ejecutó una migración sobre ella.

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

## Medición Pública Reciente

El 31 de agosto, después del deploy correctivo, la ruta pública respondió HTTP 200
para `/`, `/api/health`, `/sitemap.xml`, `/categorias/papelillos` y `/marcas/raw`.
`npm run ops:performance -- --strict` pasó sus tres muestras por ruta: portada
265.750 bytes/p50 241 ms, sitemap 176.448 bytes/p50 305 ms y health 219 bytes/p50
241 ms. Es una medición puntual desde esta estación, no monitoreo sostenido.
