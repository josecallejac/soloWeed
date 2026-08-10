# Runbook

Comandos reproducibles para operar el proyecto. Los ejemplos usan PowerShell porque el entorno principal es Windows.

## Entornos

El proyecto usa dos direcciones distintas para el mismo PostgreSQL:

- Desde el notebook/host: `192.168.100.2:5435` (puerto publicado por Docker).
- Desde el contenedor web: `soloweed-db:5432` (DNS y puerto internos de Compose).

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

Dentro de `.env.docker.local`, `DATABASE_URL_INTERNAL` debe apuntar a
`soloweed-db:5432` y `NEXT_PUBLIC_SITE_URL` a `https://soloweed.store`.
La contraseña incluida en la URL debe estar codificada para URL.

Valida sin imprimir el entorno resuelto y luego despliega:

```bash
docker compose --env-file .env.docker.local config --quiet
docker compose --env-file .env.docker.local up -d --build
docker compose --env-file .env.docker.local ps
curl -fsS http://127.0.0.1:8093/api/health
```

No uses `docker compose restart` para cambiar variables: un restart no recrea
el contenedor. No ejecutes Prisma migrate durante este flujo.

Opcionalmente, `PRICING_DEMO_TOKEN=<token-largo-y-aleatorio>` habilita la preview
simulada dentro del Docker productivo en `/precios/<token>`. Si no se define, la
preview permanece deshabilitada en producción.

## Build Y Verificacion

```powershell
npm run lint
npm run build
```

## Tests

```powershell
npm run test
```

Las pruebas unitarias no consultan PostgreSQL. Las pruebas de integración se
ejecutan explícitamente con `npm run test:integration`; nunca las apuntes a la
base productiva.

## Healthcheck

El contenedor puede verificar disponibilidad real de la app y PostgreSQL con:

```text
GET /api/health
```

Responde `200` cuando la base está disponible y `503` cuando no lo está. El
`docker-compose.yml` versionado ya usa este endpoint como healthcheck de la app.

## Monitoreo Y Backups Del Servidor

Estos scripts se ejecutan **en el host Linux** que tiene el `docker-compose.yml`;
no los ejecutes desde una estación de trabajo contra producción.

```bash
chmod +x scripts/ops/*.sh

# Backup lógico comprimido, conserva 14 días en /var/backups/soloweed.
sudo scripts/ops/backup-postgres.sh

# Valida app + PostgreSQL por la URL pública.
scripts/ops/check-health.sh
```

Variables opcionales:

```bash
BACKUP_DIR=/mnt/backups/soloweed RETENTION_DAYS=30 COMPOSE_ENV_FILE=.env.docker.local sudo scripts/ops/backup-postgres.sh
HEALTHCHECK_WEBHOOK_URL='https://<webhook>' scripts/ops/check-health.sh
```

Programa ambas tareas con `crontab -e` del usuario que puede ejecutar Docker:

```cron
# Backup diario a las 03:15 UTC; errores quedan en el log del sistema.
15 3 * * * /ruta/soloWeed/scripts/ops/backup-postgres.sh

# Healthcheck cada 5 minutos; retorna error y envía webhook si fue configurado.
*/5 * * * * /ruta/soloWeed/scripts/ops/check-health.sh
```

El healthcheck de Docker expone el estado `healthy`/`unhealthy`, pero Docker
Compose no reinicia automáticamente un contenedor solo por quedar `unhealthy`.
Usa el monitor anterior para alertar y define cualquier reinicio automático de
forma explícita en la operación del servidor.

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
