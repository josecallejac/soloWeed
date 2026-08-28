# Estado Operativo Del Proyecto

Última revisión local: 28 de agosto de 2026.

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

La release candidata pasa `npm run lint`, `npm test` (299 pruebas), `npx tsc
--noEmit`, `npm run build` con `SKIP_DATABASE_STATIC_PARAMS=1`, el audit completo
de dependencias, `git diff --check` y la configuración Compose con variables de
validación. Los scripts Bash pasan sintaxis sobre su representación LF, que es
la almacenada por Git y la usada en Linux.

Las pruebas E2E se ejecutaron 48/48 en Chromium, móvil Chromium, Firefox y
WebKit contra PostgreSQL efímero en `127.0.0.1:55432`; el contenedor fue detenido
al terminar y nunca se utilizó el `.env` productivo. La Canasta candidata agrega
cantidades, despacho y umbral gratis, tres estrategias y enlaces por fragmento
con vista previa antes de reemplazar o mezclar el estado local.

## CI Y Producción

El workflow publicado usa únicamente runners estándar, no tiene ejecución
programada, limita cada job a 20 minutos y retiene reportes solo en fallos o
ejecuciones manuales para reducir el consumo de GitHub Free. Al comenzar esta
revisión, `main` y `origin/main` estaban en `4247881` con CI correcta. Cualquier
SHA posterior debe tener su propia comprobación remota y no debe presentarse
como desplegada solo porque el push o CI hayan terminado.

El 28 de agosto la portada pública y `/api/health` respondieron HTTP 530. El host
`192.168.100.2` tampoco respondió por SSH, por lo que no existe evidencia actual
de checkout, contenedor, catálogo ni backup del servidor. El despliegue queda
prohibido hasta recuperar el host; entonces debe crearse el backup obligatorio y
verificarse por separado SHA local, `origin/main`, checkout del host, contenedor,
health, frescura y checksum.

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

No hay una medición de rendimiento válida mientras el origen responda HTTP 530.
Un error de Cloudflare demuestra indisponibilidad pública, pero no permite
inferir qué SHA, contenedor o estado de catálogo existe en el host.
