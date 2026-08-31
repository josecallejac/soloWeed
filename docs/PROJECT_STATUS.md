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
ejecuciones manuales para reducir el consumo de GitHub Free. En esta revisión,
`main` y `origin/main` estaban en `5841969` en el corte inicial; la candidata de
landings, lista compartible y límite de 50 IDs aún no estaba en ese commit.
Cualquier SHA posterior debe tener su propia comprobación remota y no debe
presentarse como desplegada solo porque el push o CI hayan terminado.

El 31 de agosto se verificaron desde esta estación los puertos `22`, `5435` y `8093`.
En el host, el checkout y `/api/health` coincidían en la release publicada
`5841969a5edf787dfe7f3317ce38120be7a85d04`; `soloweed-db` y
`soloweed-soloweed-1` estaban `running/healthy`. La portada y el sitemap
respondían HTTP 200, y el health público informaba `database=ok` y
`catalog=fresh`. La auditoría funcional de esa release encontró que
`/categorias/papelillos` y `/marcas/raw` respondían 404, el sitemap no incluía
landings y `/api/canasta` recortaba una consulta de 50 IDs a 20. Por eso `5841969`
se considera saludable pero incompleta para las funcionalidades anunciadas.

Se creó el backup
`/mnt/ollama_models/backups/soloweed/soloweed-20260831T145653Z.sql.gz` sin podar las
siete copias existentes. `gzip -t` y el checksum SHA-256
`375198991c1d7ce10b84ef499c306a591c28b1487dfaa84bfe45cff26a57f13b` pasaron. La
restauración aislada confirmó 9 tablas, 6 tiendas, 889 productos y 11.554 ofertas;
el contenedor temporal fue eliminado al terminar.

La publicación correctiva debe pasar backup, swap, health y
`scripts/ops/verify-release.sh` para su SHA concreta antes de considerarse
completa. Después se instalarán los timers systemd versionados para backup,
refresco semanal con reintento, healthcheck y alertas Telegram.

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

El 31 de agosto la ruta pública volvió a responder HTTP 200 para `/`, `/api/health`
y `/sitemap.xml`. `npm run ops:performance -- --strict` pasó sus tres muestras por
ruta: portada 265.059 bytes/p50 237 ms, sitemap 163.389 bytes/p50 259 ms y health
219 bytes/p50 188 ms. Es una medición puntual desde esta estación, no monitoreo
sostenido.
