# Incorporar una tienda nueva a SoloWeed

Procedimiento estandar para que una tienda recien scrapeada quede **acoplada al
catalogo**, o sea con sus ofertas vinculadas a los `Product` que correspondan.

Consolidado el 30 jul 2026 despues de aplicarlo entero a **Friendly Grow**
(6a tienda, ~940 ofertas) y a **Kushbreak**. Los numeros de esas dos corridas
estan aqui como referencia de que esperar.

> Nada de esto escribe en la BD. Todos los barridos son diagnosticos que emiten
> CSV para revisar caso por caso; lo aprobado se aplica siempre por un
> `scripts/link-r<N>*-reviewed.ts` con `--apply`, nunca por el auto-linker.

---

## Fase 0 — Antes de barrer

```powershell
npx tsx scripts/protect-multistore-links.ts --verify   # debe salir limpio
npm run brand:backfill                                 # marcas consistentes
npx tsx scripts/diagnose-brand-alias-gaps.ts           # huecos de alias
```

**El `brand:backfill` va PRIMERO y no es opcional.** Casi todos los metodos de
abajo agrupan por marca: si la tienda nueva escribe una marca distinto del resto,
o peor, si su campo `brand` esta mal, los barridos quedan ciegos justo donde hay
señal.

### El campo `brand` de la tienda es la fuente MENOS fiable

Medido tres veces en dos dias (r68 y r69). De las tres fuentes de marca
—titulo, URL y campo `brand`— la que declara la tienda es la que mas miente:

| oferta | la tienda declara | lo real (titulo + URL) |
|---|---|---|
| `of88381` | `GALAXY` | Dazzleaf Spaceman |
| `of87769` | (titulo con `"AKU Tribal"`) | Phoenix Star (sku PHX433, url phoenix-star) |
| `of69270` y 4 mas | `GRAV®` | MJ Arsenal |

**Cuando el campo `brand` contradice al titulo Y a la URL, gana el titulo.** El
arreglo va SIEMPRE por precedencia en `BRAND_ALIASES` de
`src/lib/matching-constants.ts`, nunca con un `UPDATE` a mano: `brand:backfill`
re-deriva el brandKey en cada corrida y pisaria la correccion (leccion de la
Tarea D de r61). Ver [[mecanismo-brandkey]]: **la prioridad de marca es el ORDEN
de la lista, no la logica**.

Sin ese fix, 3 de los 4 productos de r69 no habrian existido.

---

## Las 5 palancas, en orden de rendimiento observado

Corrolas todas: son independientes y cada una ve algo que las otras no.

### 1. Mapa de marcas — la que mas rinde

Cruza cada marca de la tienda nueva contra **todas** las ofertas de las demas,
vinculadas o no, con stock o sin el. Clasifica cada marca en:

- `>>> SIN PRODUCTO CURADO` — la marca existe en varias tiendas y **no tiene ni
  un `Product`**. Es el mejor filon y **ninguna otra herramienta lo ve**, porque
  el worklist solo mira "huerfana -> producto de esa marca" y aqui no hay
  producto que mirar. Asi salieron r64 (Brass Knuckles), r65 (Honeypuff) y r69
  (MJ Arsenal: **62 ofertas en el catalogo y cero productos**).
- `producto existe sin la tienda` — va a la palanca 2.
- `CERRADA` — nadie mas vende la marca. No volver a barrerla.

No hay script unico todavia; se arma cruzando `Offer.brandKey` por tienda contra
`Product.brandKey` (ver la cabecera de `link-r69` para el detalle). **Candidato a
convertirse en script commiteado la proxima vez que se use.**

### 2. Worklist por marca

```powershell
$env:WORKLIST_STORE="<slug>"; npx tsx scripts/find-store-brand-worklist.ts
```

Huerfana de la tienda -> productos curados de **su misma marca**, con el nivel de
tiendas de cada destino. La marca acota el espacio a puñados; el titulo, la talla
y la foto deciden.

**Filtra la salida por solape de tokens no genericos >= 2.** Sin eso son cientos
de filas con solape 1, donde el unico token comun es la marca. Con el filtro:
FG paso de 410 filas a 3, Kushbreak de 427 a 4.

### 3. Cruce por tokens IDF

```powershell
$env:TOKENS_STORE="<slug>"; npx tsx scripts/find-store-upgrades-by-tokens.ts
$env:TOKENS_SAME_BRAND="1"; ...   # subconjunto de alta precision
```

Huerfana -> producto **sin banda de precio, sin reja de categoria y sin reja de
marca**. Cubre los huecos de las otras dos:

- `find-store-upgrades` acota por banda de precio ±50%, y una tienda
  sistematicamente mas barata se cae de la banda de sus propios matches.
- El worklist exige `brandKey` en ambos lados, asi que **las huerfanas sin marca
  nunca se comparan contra el catalogo** (en FG eran 351, el 54%).
- `diagnose-orphan-pairs` cruza huerfana con huerfana, no huerfana con producto.

Poder medido: **46% en el puesto 1, 96% en el top 5**. Por eso emite varios
candidatos por huerfana y no solo el mejor.

### 4. Upgrades por texto y por imagen

```powershell
$env:UPGRADE_STORES="<slug>"; $env:UPGRADE_LEVELS="2,3,4,5"; npx tsx scripts/find-store-upgrades.ts
$env:IMGUP_STORE="<slug>"; $env:IMGUP_LEVELS="2,3,4"; npx tsx scripts/find-store-upgrades-by-image.ts
```

**Antes de creerle a un cero del de imagen, medir la señal:**

```powershell
$env:SIGNAL_STORE="<slug>"; npx tsx scripts/measure-image-signal-power.ts
```

En FG dio **14% de recall** porque fotografia sus propios productos en vez de
reusar el arte del proveedor —y ademas mezcla renders generados por IA, con
filename `ChatGPT_*.png`, inservibles como evidencia—. Con 14% el cero no
significa nada. **Con el recall bajo, saltarse el barrido por imagen y confiar en
las otras palancas.**

### 5. Huerfana ↔ huerfana (productos que aun no existen)

```powershell
$env:PAIR_STORE="<slug>"; $env:PAIR_REQUIRE_CATEGORY="0"; npx tsx scripts/diagnose-orphan-pairs.ts
$env:SIGNAL_STORE="<slug>"; npx tsx scripts/measure-image-signal-power.ts   # medir primero
$env:ORPHIMG_STORE="<slug>"; npx tsx scripts/find-orphan-pairs-by-image.ts
```

`PAIR_REQUIRE_CATEGORY="0"` importa: `Offer.category` se queda **stale** y
exigirla escondia el 67% de los pares de FG.

---

## Señales de identidad dura, antes de mirar fotos

```powershell
$env:EV_PAIRS="offerId:productId,..."; npx tsx scripts/diagnose-identity-evidence.ts
npx tsx scripts/diagnose-sku-identity.ts
```

Por orden de fuerza:

1. **SKU/EAN compartido ENTRE tiendas** = identidad dura. Ojo: puede no existir.
   En FG solo el **12%** de las huerfanas trae SKU siquiera, y **ninguna**
   coincidia con otra tienda.
2. **SKU o URL base compartida DENTRO de una tienda** = las dos ofertas son el
   mismo producto (es lo contrario de un mislink). Detecta las **variantes
   sueltas**: una ficha cuyas hermanas ya estan vinculadas y a la que le quedo
   un color huerfano. En FG aparecieron 2 asi.
3. **La URL zanja antes que la foto**: si la tienda ya vende el producto destino
   bajo OTRA URL base, son dos modelos y no hace falta foto. El script lo emite
   como `MISMA-FICHA` / `SKU-COMPARTIDO` / `OTRA-FICHA-MISMA-TIENDA` /
   `TIENDA-AUSENTE`.

---

## Reglas de decision (no negociables)

- **"¿Suma tienda?"** se mide sobre el estado PREVIO y sobre el lote completo,
  nunca oferta por oferta: si varias ofertas de la misma tienda vienen del mismo
  lote, cada una ve a sus hermanas ya vinculadas y reporta un falso "esa tienda
  ya estaba".
- **La talla y la edicion nunca fusionan; el color si.** 55mm != 63mm,
  Wu-Tang != Tyga, 250cc != 500cc. Rojo y Negro son el mismo producto.
- **Un pack nunca es la unidad.**
- **Productos de 4+ tiendas estan congelados**: solo pueden RECIBIR la oferta de
  una tienda que les falta. Cualquier otra cosa necesita OK explicito.
- **No se crean productos de 1 tienda** (incidente r55: 99 revertidos).
- **Ratio de precio > 2** es casi siempre otra pieza, no una diferencia real.
  Contrastar contra el comportamiento de la tienda: si es la mas barata en la
  mayoria de sus comparables, un 4x en un repuesto suelto es inverosimil.

---

## Cierre de ronda

```powershell
npx tsx scripts/protect-multistore-links.ts --verify   # limpio antes Y despues
npm run brand:backfill
npm run catalog:short-desc -- --apply                  # requiere `ollama serve`
npx tsx scripts/protect-multistore-links.ts --save     # solo con el diff intencional
npm run lint; npm run test; npm run build
```

**Revisar la `shortDescription` de los productos nuevos.** No se puede confiar a
ciegas: en r68 salieron tres frascos diciendo "1000 ml" —incluidos el de 250cc y
el de 500cc— porque la tienda publica **la misma descripcion en todas sus
variantes de tamaño** y el resumen heredo la medida equivocada. Es texto
PUBLICO: alimenta la ficha y el JSON-LD.

`model:backfill` **no va** en este cierre: tarda ~50 min contra la BD remota y
deja el `modelKey` en null donde no puede derivarlo (lo normal en 287 de 853
productos). No afecta a las URLs, que las manda `modelSlug`.

---

## Que esperar

| | Friendly Grow | Kushbreak |
|---|---|---|
| ofertas | 942 | 441 |
| huerfanas en alcance con stock | 650 | 146 |
| ...sin marca | 351 (54%) | 65 (45%) |
| resultado | **1 vinculo** | **4 productos nuevos, 22 ofertas** |

**La diferencia no es el metodo, es el surtido.** Kushbreak vende marcas que el
resto tambien vende. FG tiene el 54% de su inventario en genericos de importacion
—pipas, bongs y moledores sin marca—, y ahi **no hay identidad cruzada posible**:
el catalogo entero tiene **0 productos sin marca** en sus 16 categorias, porque un
molde de importacion sin marca no es el mismo producto en dos tiendas. Confirmado
empiricamente: los pares que salen son "Pipa Silicona Clon" contra "Contenedor
silicona", donde el token compartido es la palabra *silicona*.

**Si una tienda nueva tiene mucho generico, su techo de vinculacion es bajo y no
es culpa del barrido.** Para esas, el valor comercial esta en la **brecha de
surtido** del informe de precios (`getAssortmentGap`), que no necesita identidad
producto a producto.
