# Runbook

Comandos reproducibles para operar el proyecto. Los ejemplos usan PowerShell porque el entorno principal es Windows.

## Entornos

El proyecto usa dos direcciones distintas para el mismo PostgreSQL:

- Desde el notebook/host: `192.168.100.2:5435` (puerto publicado por Docker).
- Desde el contenedor web: `db:5432` (DNS y puerto internos de Compose; el
  contenedor se llama `soloweed-db`).

No intercambies estas URLs. El servidor casero que publica `soloweed.store`
ejecuta Next.js con `NODE_ENV=production`; estar alojado en casa no lo convierte
en modo de desarrollo.

## Setup Local En El Notebook

```powershell
npm install
Copy-Item .env.example .env.development.local
```

Edita solamente la copia ignorada por Git:

```text
DATABASE_URL="postgresql://soloweed:<password-url-encoded>@192.168.100.2:5435/soloweed"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

La base local ya contiene las migraciones y los datos migrados. No ejecutes
`npm run db:migrate` ni comandos de restauración durante un deploy normal.

## Desarrollo

```powershell
npm run dev
```

El proyecto debe seguir usando Webpack. Reinicia por completo `npm run dev`
después de cambiar variables: Next.js no recarga el entorno con hot reload.

La preview simulada está disponible en desarrollo en
`/precios/friendlygrow-preview`. Sus datos y enlaces están aislados de
PostgreSQL; las fichas reales `/productos/...` sí requieren la base.

La canasta inteligente (`/canasta`) es deliberadamente local al navegador: conserva
la clave v1 de productos, agrega cantidades de 1 a 99 y guarda el despacho bajo
`soloweed:basket-shipping:v1`. El botón Compartir genera un fragmento `#v=1` con
IDs, cantidades y valores de despacho; no envía esa información en la query ni la
persiste en PostgreSQL. Al abrir un enlace se muestra una vista previa y el usuario
debe elegir `Reemplazar local` o `Mezclar con local`.

Las alertas también permanecen locales, pero vuelven a consultar los precios al
abrir la página y cuando la pestaña recupera el foco (con una espera de 30 segundos
para no duplicar peticiones). No hay notificaciones push ni una cuenta remota: para
recibir una señal debes volver a SoloWeed.

Las páginas públicas indexables de crecimiento usan rutas canónicas separadas de los
filtros temporales del home:

- `/categorias/<slug>` para una categoría curada (el slug elimina acentos y conserva
  palabras legibles como `filtros-y-boquillas`).
- `/marcas/<brandKey>` para una marca cuyo `brandKey` ya forma parte de sus URLs de
  producto.

Ambas rutas muestran solo comparaciones con ofertas activas en dos o más tiendas,
incluyen metadata/JSON-LD y reutilizan la paginación del catálogo. `/sitemap.xml`
las agrega únicamente cuando existen productos comparables en la base viva; no se
generan rutas durante el build seguro sin PostgreSQL.

## Docker En El Servidor Casero

Docker se versiona en `Dockerfile` y `docker-compose.yml`. Antes del primer uso,
confirma la imagen y el volumen que ya utiliza la base existente:

```bash
docker inspect soloweed-db --format '{{.Config.Image}}'
docker inspect soloweed-db --format '{{range .Mounts}}{{println .Name .Destination}}{{end}}'
```

Copia la plantilla y completa la contraseña, la imagen exacta y el nombre del
volumen existente. El volumen está declarado como `external`, por lo que Compose
fallará en vez de crear silenciosamente una base vacía.

```bash
cp .env.docker.example .env.docker.local
```

Dentro de `.env.docker.local`, `DATABASE_URL` debe apuntar a `db:5432` y
`NEXT_PUBLIC_SITE_URL` a `https://soloweed.store`.
La contraseña incluida en la URL debe estar codificada para URL.

Valida sin imprimir el entorno resuelto y despliega con el script dedicado:

```bash
docker compose --env-file .env.docker.local config --quiet
DEPLOY_ENV_FILE=.env.docker.local bash deploy.sh
docker compose --env-file .env.docker.local ps
curl -fsS http://127.0.0.1:8093/api/health
```

`deploy.sh` ejecuta `npm ci` y `npm run build` en el host, adaptando `db:5432` a
`127.0.0.1:5435`. Construye solo la imagen web, crea antes del swap un backup
comprimido con checksum en `/mnt/ollama_models/backups/soloweed/` y conserva las
7 copias mas recientes. Si el build, el swap o el healthcheck falla, mantiene la
base existente y restaura la imagen anterior. No hace `git checkout`, no ejecuta
Prisma migrate y no recrea el servicio PostgreSQL. No uses `docker compose restart`
para cambiar variables: un restart no recrea el contenedor.

Cada imagen lleva `SOLOWEED_RELEASE_SHA` y `SOLOWEED_BUILD_TIME`. El script toma
la SHA del árbol actual (o `EXPECTED_RELEASE_SHA` si el webhook la fija), exige
que `/api/health` reporte esa misma SHA y valida `/`, `/sitemap.xml` y, si se
define, `SMOKE_PRODUCT_URL`. El healthcheck espera hasta 90 segundos por defecto.
Si falla una de esas comprobaciones restaura la imagen anterior; el rollback
solo exige que la aplicación vuelva a estar sana.

El webhook del servidor debe invocar la entrada versionada
`bash scripts/deploy-webhook.sh <sha-completa>`. El wrapper toma un lock antes de
`fetch`/checkout, delega en `deploy.sh` y, si el deploy falla, restaura el checkout
a la SHA previa. El script asume que la base existente ya está ejecutándose y que
el volumen externo está presente.

Opcionalmente, `PRICING_DEMO_TOKEN=<token-largo-y-aleatorio>` habilita la preview
simulada dentro del Docker productivo en `/precios/<token>`. Si no se define, la
preview permanece deshabilitada en producción.

## Build Y Verificacion

```powershell
npm run lint
npm run build
```

El `prebuild` bloquea URLs de Railway heredadas antes de que Next consulte
PostgreSQL. Para un build deliberadamente sin acceso a la base, define
`SKIP_DATABASE_STATIC_PARAMS=1`; esa opción omite los static params de productos.

`npm run dev` usa `scripts/dev.mjs` para iniciar Next con Webpack y mantener
`AGENTS.md` intacto aunque el entorno detecte un agente de código.

## Tests

```powershell
npm run test
```

Las pruebas unitarias no consultan PostgreSQL. Las pruebas de integración se
ejecutan explícitamente con `npm run test:integration`; nunca las apuntes a la
base productiva.

## E2E

Las pruebas Playwright requieren una PostgreSQL efímera o local. La configuración
bloquea la ejecución si `E2E_DATABASE=1` no está definido, si `DATABASE_URL` no
existe o si apunta fuera de `localhost`/`127.0.0.1`. Tampoco reutiliza un servidor
Next.js ya iniciado, para evitar heredar una base productiva.

En una máquina con PostgreSQL local en el puerto `5432`:

```powershell
$env:E2E_DATABASE="1"
$env:DATABASE_URL="postgresql://soloweed:ci@127.0.0.1:5432/soloweed"
npx prisma migrate deploy
npx tsx scripts/seed-e2e.ts
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

El workflow de GitHub Actions crea su propio servicio PostgreSQL, ejecuta las
migraciones y el seed antes de correr Chromium. No uses la `DATABASE_URL` del
`.env` productivo para este flujo.

## Healthcheck

El deploy nuevo exige siempre `/api/health` completo y la SHA esperada. Si debe
revertir, valida que la imagen anterior vuelva a servir una portada `2xx`; la
frescura puede seguir fallando por una causa de datos externa a ambas imágenes.

El contenedor puede verificar disponibilidad real de la app y PostgreSQL con:

```text
GET /api/health
```

Responde `200` solo cuando la base está disponible y el catálogo está fresco;
responde `503` si la base falla, el catálogo está vacío o alguna tienda activa
supera la ventana de frescura. El `docker-compose.yml` versionado ya usa este
endpoint como healthcheck de readiness de la app.

El JSON incluye `release.sha` y `release.builtAt` para confirmar qué commit está
sirviendo el host. La respuesta usa `Cache-Control: no-store` y
`X-Robots-Tag: noindex, nofollow`, por lo que no se debe cachear ni indexar.

Para auditar qué evidencia sigue rastreada en Git sin borrar nada, ejecuta
`npm run ops:reports`. El modo `--strict` se reserva para después de respaldar y
autorizar la limpieza; los reportes históricos deben permanecer en el volumen
operativo `catalog-audit-data`.

## Monitoreo Y Backups Del Servidor

Estos scripts se ejecutan **en el host Linux** que tiene el `docker-compose.yml`;
no los ejecutes desde una estación de trabajo contra producción.

```bash
# Instalación reproducible para el usuario que ejecuta Docker.
bash scripts/ops/install-systemd-user.sh

# Inspección de los tres timers y sus próximas ejecuciones.
systemctl --user list-timers --all soloweed-backup.timer soloweed-catalog.timer soloweed-healthcheck.timer

# Ejecuciones manuales (el runner semanal escribe en la base productiva).
bash scripts/ops/run-backup-scheduled.sh
bash scripts/ops/run-weekly-catalog-scheduled.sh
bash scripts/ops/check-health.sh
```

Para fijar qué release debe responder el monitor, exporta
`EXPECTED_RELEASE_SHA=<sha-completa>` junto con `HEALTH_URL`. El monitor puede
notificar por `HEALTHCHECK_WEBHOOK_URL` y, si se configuran los secretos del host,
por Telegram. Las alertas Telegram tienen deduplicación por estado y un aviso de
recuperación; el estado queda en `reports/ops/` y nunca contiene el token.

El chequeo de rendimiento público es de solo lectura:
`npm run ops:performance`. Usa `PERF_URL` para revisar otro host y `--strict`
solo cuando el entorno tenga los límites esperados. `PERF_TIMEOUT_MS` limita cada
petición (15 s por defecto) para que un host caído no deje el monitor colgado.

Variables opcionales:

```bash
BACKUP_DIR=/mnt/backups/soloweed RETENTION_DAYS=30 COMPOSE_ENV_FILE=.env sudo scripts/ops/backup-postgres.sh
# El deploy usa el mismo script con retención por cantidad:
BACKUP_DIR=/mnt/ollama_models/backups/soloweed RETENTION_COUNT=7 COMPOSE_ENV_FILE=.env sudo scripts/ops/backup-postgres.sh
HEALTHCHECK_WEBHOOK_URL='https://<webhook>' scripts/ops/check-health.sh
```

Telegram usa la Bot API. Crea el bot con `@BotFather`, guarda el token solo en el
`.env` del servidor, envía `/start` al bot y define el chat numérico obtenido en:

```text
SOLOWEED_TELEGRAM_BOT_TOKEN=<token-del-bot>
SOLOWEED_TELEGRAM_CHAT_ID=<chat-id>
```

El token no se necesita para construir ni publicar la aplicación. Si falta, los
timers siguen funcionando y dejan el detalle en el journal.

El backup usa un lock, comprueba que `db` esté corriendo, ejecuta `pg_dump` con
`pipefail`, valida gzip y escribe el dump y su `.sha256` de forma atómica. Para
probar una restauración sin tocar producción, usa un dump copiado a una carpeta
temporal del notebook o del host:

```bash
scripts/ops/restore-postgres-test.sh /ruta/soloweed-20260813T120000Z.sql.gz
```

Si existe el archivo hermano `.sha256`, el script valida el checksum antes de
abrir el contenedor temporal.

El comando crea un contenedor PostgreSQL efímero, valida tablas y cuenta
`Store`, `Product` y `Offer`, y lo elimina incluso si la restauración falla.

Los timers versionados sustituyen a cron: el backup corre diariamente a las 03:15,
el healthcheck arranca cinco minutos después del boot y se repite cada 15 minutos,
y el catálogo corre los lunes a las 11:00 (hora local del host). Los timers tienen
`Persistent=true`, por lo que una ejecución perdida mientras el servidor estaba
apagado se recupera al volver a encenderlo. El catálogo reintenta una vez después
de 30 minutos y avisa por Telegram si ambos intentos fallan.

El healthcheck de Docker expone el estado `healthy`/`unhealthy`, pero Docker
Compose no reinicia automáticamente un contenedor solo por quedar `unhealthy`.
Usa el monitor anterior para alertar y define cualquier reinicio automático de
forma explícita en la operación del servidor.

`CATALOG_FRESHNESS_HOURS` controla la frescura exigida por `/api/health`; por defecto
son 192 horas. Un healthcheck con PostgreSQL disponible pero con una tienda activa sin
ofertas recientes responde `503` para que el monitor no confunda una base viva con un
catálogo actualizado.

## Informe B2B

El panel privado para growshops está en `/interno/inteligencia-precios`. Desde allí un
administrador puede generar, rotar o desactivar un token de solo lectura para
`/precios/<token>`. Solo se muestran tiendas habilitadas y rotar el token invalida el
enlace anterior.

El informe compartible incluye posición frente a la mediana, alertas de rebajas,
brecha de surtido y tráfico referido a la tienda desde `/ir`. Los clics son agregados
y no representan ventas. Los botones de contacto pueden medirse en Umami con el evento
`b2b-contacto`; configura `NEXT_PUBLIC_CONTACT_EMAIL` y, opcionalmente,
`NEXT_PUBLIC_CONTACT_WHATSAPP` en el entorno del servidor.

La analítica pública usa eventos agregados (`busqueda-enviada`, `clic-tienda`,
`favorito-agregado`, `canasta-agregada`, `lista-compartida` y `lista-importada`) para
medir el embudo sin enviar la consulta ni los IDs de una lista compartida. Umami es
opcional: si falta el script o un bloqueador lo intercepta, las acciones siguen
funcionando y `/ir` conserva el registro server-side del clic.

Los CSV de `reports/catalog-audit` se guardan en el volumen Docker
`soloweed-catalog-audit` y sobreviven a la recreación del contenedor web. Puedes
personalizar el nombre con `CATALOG_AUDIT_VOLUME_NAME` en `.env.docker.local`.

`npm run test` ejecuta todos los archivos `tests/*.test.ts` mediante `tsx --test`,
incluidos los checks de password, exportacion de catalogo, matching y catalogo.

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
- `SCRAPE_STORE_CONCURRENCY`: tiendas simultáneas (3 por defecto, máximo 6).
- `SCRAPE_SAVE_BATCH_SIZE`: ofertas por lote de persistencia (100 por defecto).

## Catálogo semanal combinado

`npm run catalog:weekly` combina el descubrimiento y el refresco de ofertas
vinculadas. Mantiene una petición activa por tienda y procesa hasta tres tiendas
en paralelo; `REFRESH_LIMIT` puede limitar páginas de refresco para una prueba.

```bash
SCRAPE_STORE_CONCURRENCY=3 npm run catalog:weekly
```

En el servidor casero se ejecuta desde el checkout del host, no dentro de la
imagen web (la imagen productiva no incluye `tsx` ni los scripts de operación).
`run-weekly-catalog-scheduled.sh` es la entrada del timer: llama al runner,
reintenta una vez a los 30 minutos y registra los cambios de estado en Telegram.

El runner usa `flock`, crea un backup PostgreSQL, guarda un snapshot temporal de
los enlaces de productos de 4+ tiendas, ejecuta el comando y verifica el snapshot
antes de devolver éxito. No instala dependencias ni ejecuta migraciones.

## Verificación funcional de release

Además del healthcheck, `deploy.sh` ejecuta `scripts/ops/verify-release.sh`. El
verificador consulta la SHA y frescura, exige al menos una landing de categoría y
una de marca en el sitemap, prueba ambas rutas con HTTP 200 y confirma que
`/api/canasta` procese 50 IDs. Así un commit antiguo no puede declararse correcto
solo porque el contenedor esté `healthy`.

## Scrape Completo Frugal (Tokens)

Un scrape completo + sus diagnosticos generan mucho output (logs de MB, cientos de
warnings, decenas de fotos). Para no fundir el presupuesto de tokens, **el output crudo
nunca debe entrar al contexto del hilo principal**: se procesa en un subagente (que
tiene su propia ventana) o via scripts que emiten un resumen de pocas lineas.

Reglas duras: nunca `Read`/`cat`/`tail` de `reports/catalog-audit/*.log` ni de logs de
scrape crudos; nunca un `Monitor` que vuelque el cuerpo del log (solo grep de `Done.` +
`tasklist node.exe`); nunca `Read` de imagenes en lote fuera de un subagente.

### Patron desacoplado del harness

Los procesos largos (scrape completo, `match:image`/`match:embedding`) mueren si se
corren como tarea background del harness. Se lanzan desacoplados escribiendo a un log en
el scratchpad y se vigilan con la herramienta Monitor:

```powershell
Start-Process -FilePath "cmd.exe" -ArgumentList '/c npm run scrape > "<scratchpad>\scrape-<tienda>.log" 2>&1' -WindowStyle Hidden
```

Para vigilarlo, **una tarea background del hilo principal** (NO de un subagente) con un
loop que grepea el fin y sale, dando una sola notificacion (NO volcar el log):

```bash
LOG="<scratchpad>/scrape-<tienda>.log"
for i in $(seq 1 90); do
  grep -qE "^Done\." "$LOG" 2>/dev/null && { echo "FIN OK"; exit 0; }
  grep -qiE "npm ERR|Cannot find module|FATAL" "$LOG" 2>/dev/null && { echo "FIN ERROR"; exit 1; }
  sleep 10
done
echo "TIMEOUT"; exit 2
```

**El vigia NO puede vivir dentro de un subagente** (ensayado 16 jul 2026): el subagente
arma el watch, su turno se da por completado y la notificacion de fin no re-invoca a
nadie — el scrape termina bien pero el resultado queda colgado. El scrape en si
(`Start-Process` desacoplado) nunca muere; lo que se pierde es quien lo recoge.
Tampoco lo rescata darle al subagente un wait fijo (ej. 5 min): Monitor es asincrono
por diseño (no bloquea el turno), el sleep en foreground esta bloqueado y cada Bash
capea a 10 min — menos de lo que dura un scrape completo. Y con el digest el log ya
no entra al contexto de nadie, asi que delegar el scrape no ahorra tokens.

**El vigia debe grepear el marcador de fin REAL de cada proceso** (mirar los ultimos
`console.log` del script antes de armarlo): scrape → `^Done\.`; `match:image` →
`Revisar siempre titulo` (su leyenda final); `match:embedding` → `alta certeza sem`.
Un vigia armado con el marcador equivocado espera su timeout completo en vano.

**Siempre redirigir dentro de `cmd.exe /c ...`, nunca con `>` directo de PowerShell**:
PS 5.1 escribe UTF-16 LE en la redireccion nativa y los digests (que leen UTF-8) no
parsean ninguna linea — fallan ruidosamente (exit 1) pero es mejor evitarlo.

El scrape completo de 4 tiendas no cabe en la ventana de kill: correr **por tienda**
(`$env:SCRAPE_STORES="astrogrowshop"`), una a la vez, **con un nombre de log distinto
por tienda** (`scrape-astrogrowshop.log`, `scrape-fumetas.log`, ...) — reusar el mismo
path trunca el log anterior y el digest solo ve la ultima tienda corrida.

### Digest del scrape (en vez de leer el log)

```powershell
npx tsx scripts/scrape-digest.ts snapshot                        # ANTES del scrape (para el delta)
# ... correr el scrape por tienda, un log por tienda ...
npx tsx scripts/scrape-digest.ts "<scratchpad>\scrape-<tienda>.log" # digest: saved/skipped/failed + warnings contados + ofertas nuevas
```

Si el digest no reconoce ninguna linea, sale con exit 1 y NO imprime el delta (para no
sugerir falsamente "0 ofertas nuevas") — revisar el path del log y su encoding.

### Triage de matching (en vez de leer el log de MB)

`scripts/triage-matches.ts` parsea un log de `match:image` o `match:embedding`, aplica
los filtros de rechazo estandar (reutiliza `scoreSuggestion`; ademas categoria distinta,
tienda-ya-en-el-producto, congelado 4t, ratio de precio, foto-wildcard) contra el estado
ACTUAL de la BD y escribe un CSV compacto de candidatos, imprimiendo solo conteos + los
ambiguos a foto:

```powershell
$env:MATCH_IMG_MAX_DIST="60"; Start-Process cmd.exe -ArgumentList '/c npm run match:image > "<scratchpad>\img.log" 2>&1' -WindowStyle Hidden
Start-Process cmd.exe -ArgumentList '/c npm run match:embedding > "<scratchpad>\emb.log" 2>&1' -WindowStyle Hidden  # despues de match:image (puebla cache)
npx tsx scripts/triage-matches.ts "<scratchpad>\emb.log"
```

Env de triage: `TRIAGE_RATIO_MAX` (1.40), `TRIAGE_STRONG` (0.70), `TRIAGE_FREQ_MAX` (3),
`TRIAGE_FROZEN` (4).

**El bucket "fuerte" (score >= `TRIAGE_STRONG`) NO es un pase libre sin foto.**
`scoreSuggestion` veta marca/tipo/modelo RAW/cantidad, pero el conflicto de color solo
esta cubierto en Papelillos, el de mm solo en Moledores/Repuestos/Filtros, y no hay veto
de ml/mAh ni de "quemador generico" (el motor historico de r15/r16 si los tenia — puerto
pendiente). Para Bongs/Pipas/Moledores/baterias con mm o color en el titulo, revisar por
foto tambien los "fuertes", no solo los ambiguos — sigue aplicando "la imagen propone, el
texto decide" de la seccion Matching Por Imagen mas abajo.

Los pares **huerfana-huerfana** (sin producto ancla en ningun lado) no se pueden scorear
con `scoreSuggestion` (asume un lado ya vinculado) — se escriben sin scorear a un CSV
aparte (`triage-<log>-orphan-orphan.csv`) para revision manual; son la materia prima de
productos nuevos (ver rondas r19-r29).

### Flujo recomendado

**El scrape lo corre el hilo principal** (es barato: 4 tool calls chicos por tienda y
unas pocas lineas de salida). Solo se delega a subagentes lo verdaderamente ruidoso:
los logs de MB del matching y la comparacion de fotos.

1. Hilo principal: `scrape-digest.ts snapshot` + `protect-multistore-links --save`.
2. Hilo principal, por tienda: `Start-Process` desacoplado -> vigia background -> `scrape-digest.ts <log>`.
   Despues `diagnose-stale-prestashop-offers --apply` + `prices:refresh`.
3. Subagente "diagnostico+triage": `match:image` -> `match:embedding` + `triage-matches.ts`;
   devuelve conteos + candidatos filtrados + cuantos ambiguos (pide salida COMPACTA).
4. Subagente foto (o el mismo): compara las fotos de los `<=~15` ambiguos y devuelve
   veredictos razonados; las imagenes se quedan en su contexto.
5. Hilo principal + usuario: aprobar; escribir `link-r*-reviewed.ts`; aplicar; `protect --verify`/`--save`;
   `catalog:short-desc --apply`; lint + build; commit.

Tiempos de referencia (limitado a 20 URLs/tienda): Astro 3m25s, Fumetas 3m54s.

Separar **datos** (scrape/precios/short-desc — casi gratis, todo delegado) de **juicio**
(la ronda de matching por foto — lo caro) en turnos distintos, y correr el matching por
categoria en lotes chicos (`MATCH_IMG_CATEGORIES=Bongs,Pipas`).

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

## Matching Por Imagen (Diagnostico)

Encuentra pares de ofertas de tiendas distintas con la misma foto de fabricante (dHash 512 bits con recorte de margenes). Solo imprime candidatos, nunca escribe en la BD:

```powershell
npm run match:image                                          # todas las categorias
$env:MATCH_IMG_CATEGORIES="Bongs,Pipas"; npm run match:image # categorias concretas
$env:MATCH_IMG_MAX_DIST="60"; npm run match:image            # solo alta certeza
```

Distancia <= 60 es casi siempre el mismo arte de fabricante; la banda 60-140 exige mirar las fotos. **La imagen propone, el texto decide**: las tiendas reusan la misma foto para medidas distintas (14 vs 18mm), displays 24U/50U y variantes de color, asi que cada par se confirma contra titulo/precio/medidas y se aplica con un script dirigido (patron `scripts/apply-image-matching-r*.ts`, con guardia que nunca mueve ofertas ya vinculadas). Las imagenes se cachean por offerId en `MATCH_IMG_CACHE` (default `scratch/img/cache`).

## Potencial De Cobertura Total

El diagnóstico de cobertura busca ofertas huérfanas en cada tienda faltante y
clusters partidos por EAN o referencia de fabricante. Es estrictamente de solo
lectura y no admite `--apply`:

```powershell
npm run catalog:six-store
```

Genera `reports/six-store-potential.json` y `.csv`. Revisa primero los registros
`reachesAllStores=true`, confirma marca, modelo, variante, medida y cantidad, y
aplica únicamente los aprobados mediante un `link-r*-reviewed.ts` dirigido. Una
oferta vinculada nunca se mueve y un producto de 4 o más tiendas solo puede
recibir ofertas de una tienda que todavía no tenga.

Variables opcionales: `SIX_MIN_CURRENT_STORES` (default 2),
`SIX_MIN_TEXT_SCORE` (default 0.62), `SIX_TOP_PER_STORE` (default 3) y
`SIX_INCLUDE_OUT_OF_STOCK` (default 1, porque el stock no cambia la identidad).

## Crecimiento Seguro

Los diagnósticos de upgrades son solo lectura. Antes de preparar una ronda, respalda
los vinculos de productos con 3 o mas tiendas:

```powershell
npx tsx scripts/protect-multistore-links.ts --save
$env:UPGRADE_STORES="friendlygrow"; $env:UPGRADE_LEVELS="2,3,4,5"; npx tsx scripts/find-store-upgrades.ts
```

Despues de revisar manualmente cada candidato, crea un JSON explicito con esta forma:

```json
{
  "links": [
    { "offerId": 123, "productId": 456, "evidence": "EAN exacto ..." }
  ]
}
```

Validalo contra el estado actual antes de escribir mediante
`npm run catalog:growth:validate -- reports/growth-reviewed.json`. El validador no
modifica PostgreSQL, rechaza ofertas ya vinculadas, tiendas repetidas, tiendas
deshabilitadas y productos sin una tienda faltante. Los productos con 4 o mas tiendas
solo pueden recibir una oferta de una tienda nueva; nunca se mueven sus vinculos
existentes.

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
