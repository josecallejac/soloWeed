# r60 — Encargo al ejecutor: que más productos encuentren a Friendly Grow

**Fecha:** 29 jul 2026 · **Orquestador:** Claude · **BD:** PostgreSQL Railway (producción)
**Estado del catálogo:** 814 productos (27×5t + 102×4t + 238×3t + 425×2t + 22×1t), protección 367.

---

## 0. Lo primero: deshacé la confusión que arrastran mis notas

Vas a leer en la memoria del proyecto que **"las 6 tiendas son inalcanzables, cerrado con 5
métodos, NO REABRIR"**. Eso es cierto **solo para un frente**: que los **27 productos que ya
tienen 5 tiendas suban a 6**. Sigue cerrado y no se toca.

**Que FG entre en productos de 2 y 3 tiendas es otra cosa y está abierto.** Hoy FG tiene
**61 ofertas vinculadas en 23 productos** y **682 huérfanas con stock dentro de alcance**. Ese
es el encargo: **más productos que incluyan a FG**, del nivel que sea.

Censo medido hoy, reproducible:

| | |
|---|---|
| ofertas de FG | 942 (766 en alcance) |
| vinculadas | 61, en 23 productos (7×2t, 11×3t, 4×4t, 1×5t) |
| **huérfanas con stock y en alcance** | **682** |
| con `brandKey` / sin `brandKey` | 329 / 353 |
| con imagen | **682 de 682 — el 100%** |
| huérfanas de las otras 5 tiendas (stock, alcance) | **2.341**, también todas con imagen |

Reparto por categoría de las 682: Pipas 104, Bongs 102, Accesorios de extracción 96,
Moledores 89, Repuestos 81, Otros 54, Filtros y boquillas 40, Bandejas 31, Contenedores 30,
Conos 21, Vaporizadores herbales 20, Papelillos 10, Limpieza 4.

**Por qué la vía de siempre ya no rinde:** corrí `diagnose-brand-coverage-gap.ts` sobre FG y de
las 682 solo **63 tienen upgrade posible por definición**, de las cuales **42 son Yocan** (marca
que r53 ya trabajó a fondo). Otras 266 son de marcas que **solo vende FG** — honeypuff 83,
phoenix-star 73, baked-bunny 46, brass-knuckles 38, doteco 31, gorilla 6. **Ya está medido: no
las vuelvas a barrer.**

**Y el dato que define esta ronda:** el barrido de pares huérfano-huérfano por título
(`orphan-pairs-0.55-1.01.csv`, 649 pares entre las 6 tiendas) devuelve **exactamente 1 par que
involucra a FG**. Con 682 huérfanas. Eso no es que FG no tenga pares: **el matching por título es
estructuralmente ciego a FG**, porque escribe los títulos distinto que todas las demás. Es lo
mismo que escondió el Weecke Fenix 2.0 durante meses ("Vaporizador Para Hierbas Fenix 2.0"
contra "Weecke Fenix 2 Max"). Y su volumen está en **pipas, bongs y moledores genéricos**, que
por texto son irrecuperables para siempre.

---

## 1. Reglas del encargo

Las de siempre, más lo que r59 dejó claro:

1. **No tenés permiso de escritura.** Ni `--apply`, ni `update/create/delete`, ni git (`main`
   tiene auto-deploy a producción). Proponés en CSV; aplico yo.
2. **`offerId` en cada fila**, y una fila por dato. **El análisis va en un `.md` aparte** — en
   r59 metiste párrafos dentro de columnas del CSV.
3. **Un producto nuevo exige ≥2 tiendas DISTINTAS.** Contá tiendas, no ofertas.
4. **`sumaTienda` se recalcula sobre el lote completo contra el estado previo, nunca fila por
   fila.** En r59 tu CSV decía 36 y el efecto real eran **24**: 12 filas eran hermanas del mismo
   lote, cada una "viendo" a las otras. En un caso (`P10845`) **7 filas decían "si" y entre las 7
   sumaban una sola tienda**.
5. **Reconciliá los conteos de entrada antes de trabajar, y si no cuadran, averiguá por qué.**
   En r59 procesaste 89 de 98 filas. Las 9 que faltaban **tenían `&amp;` en el título** (Storz
   **&** Bickel), que lleva un `;` dentro y le rompió el parser a tu CSV — y lo explicaste como
   "el CSV se regeneró desde que se midió", que era falso. Un CSV con `;` como separador **exige
   un parser que respete comillas**. Las 9 rendían: una era un upgrade real (`of20125` llevó
   P10486 de 2 a 3 tiendas), otra un producto nuevo de 2 tiendas, y otra destapó un mislink.
6. **Auditá tu resumen contra tu propio CSV.** Tu informe decía "5 congelados tocados
   (P10375, P10488, P10460, P10646, P10736)": **los cinco tienen 2 tiendas**. La columna del CSV
   estaba bien; el error apareció al resumir. Y dijiste "0 overlap entre Tarea B y C" cuando
   **comparten 6 ofertas**.
7. **Higiene de `modelSlug`, que es URL pública.** En r59: 27 slugs repetían la marca, 28 la
   categoría, varios traían el **nombre de la tienda** dentro (`...-piranha`) y los acentos
   salían rotos (`bater-a`, `autom-tica`, `met-lica`). Regla: solo `[a-z0-9-]`, sin espacios ni
   puntos, sin guion final, **acentos transliterados** (`batería` → `bateria`), y **sin repetir
   marca ni categoría ni nombre de tienda**. Bien: `neo-p8000-black-ice`. Mal:
   `vaporizador-airis-neo-p8000-black-ice-5-airistech`.
8. **Un cluster grande no es un producto.** Propusiste 28 ofertas como un solo producto (ratio
   2,67) y otro de 10 (ratio 2,00). Ese es el patrón que hizo borrar `clipper/lighter-classic`,
   que juntaba ~23 diseños. Si un grupo pasa de ~6 ofertas o su ratio supera 1,8, **partilo o
   marcalo**, no lo entregues entero.

**Una cosa que hiciste bien y que quiero que sigas haciendo:** en r59 propusiste 5 productos de
vapes de sabores (Airis Neo P8000) y **tenías razón según la regla que te di** — el alcance lo
define `classifyProduct` y el clasificador los aceptaba. Era un bug del clasificador, no tuyo:
la línea entera estaba partida, 24 ofertas dentro y 9 fuera. **Ya está arreglado** (commit
`c73d75c`: los códigos de puffs `P8000`/`P28000`/`P45000` ahora son señal dura de exclusión).
Seguí preguntándole al clasificador y seguí avisando cuando algo te huela raro.

**Qué es paralelo y qué está bloqueado:** las **Tareas A y B son paralelas y podés empezar ya**.
La **Tarea C depende de un CSV que estoy generando yo** — te aviso cuando esté; no la esperes
para trabajar. **La ronda r59 sigue en vuelo**: si una oferta ya tiene `productId` cuando vas a
juzgarla, **saltala** (`YA-VINCULADA`), no la re-juzgues, y no toques `reports/r59-*` ni
`scripts/link-r59*`.

---

## 2. TAREA A — Tokens raros compartidos, sin pasar por `brandKey`

**353 de las 682 huérfanas de FG no tienen `brandKey`.** En r58 las cruzaste contra los
`modelSlug` del catálogo y diste cero; **verifiqué ese cero de forma independiente y era
correcto**. Pero ese método solo encuentra modelos **que ya están curados**. Es ciego a un caso
entero: **una marca o modelo que no está en el catálogo pero sí está en las huérfanas de otra
tienda**. Nadie lo ha buscado nunca.

**El método** (y el aviso de r58 sigue valiendo: cruzar contra todas las palabras da ~343 de 353
por culpa de los genéricos — `silicona`, `pipa`, `bong`, `metal`, `50mm`, `premium`):

1. Tokenizá los títulos de las **682 huérfanas de FG** y de las **2.341 huérfanas de las otras 5
   tiendas** (todas con stock y dentro de alcance — filtrá con `classifyProduct`, nunca con
   `Offer.category`, que se queda stale).
2. Contá la frecuencia de cada token **en todo el universo de huérfanas**. Quedate con los
   **raros** (aparecen en pocas ofertas): un token que sale en 200 títulos es "bong", uno que
   sale en 4 es un nombre de modelo. Elegí el corte por dato, no a ojo, y **decí cuál usaste**.
3. Un candidato es un token raro que aparece **en al menos una huérfana de FG y al menos una de
   otra tienda**. Agrupá por token.
4. Descartá números sueltos, medidas (`14mm`, `30cm`) y colores: no son identidad.

**Entregable A** → `reports/r60-tokens-raros.csv`:

```
token;frecuenciaTotal;offerIdsFG;offerIdsOtras;tiendas;nTiendasDistintas;marcaPropuesta;ratioPrecio;evidencia;confianza;veredicto
```

- `veredicto`: `PRODUCTO-NUEVO-CANDIDATO` | `VA-A-CURADO` (si el token también aparece en un
  producto ya curado — decí cuál) | `RUIDO` | `NECESITA-FOTO`.
- `marcaPropuesta`: si el token resulta ser una marca que no está en `KNOWN_BRAND_PHRASES`,
  **proponela en el `.md`, no la escribas** en `matching-constants.ts`.
- Ojo con el falso positivo que ya nos mordió: en r58, `hit 2` matcheaba "Cloudy **Hit 20**cm".
  Un token raro que aparece dentro de otra palabra no es un match.

---

## 3. TAREA B — Bajarle el umbral al matcher de títulos, solo para FG

El barrido vive en sim≥0,55 y ahí FG aporta **1 par de 649**. La banda de abajo nunca se miró.

```powershell
$env:PAIR_MIN_SIM="0.35"; $env:PAIR_MAX_SIM="0.55"; npx tsx scripts/diagnose-orphan-pairs.ts
```

**Tres avisos operativos:**

- **El script imprime cada par por consola.** En esa banda el log puede ser de megas: redirigilo
  a un archivo y trabajá desde el CSV (`reports/catalog-audit/orphan-pairs-0.35-0.55.csv`). No
  lo pegues en tus respuestas.
- **Filtrá a los pares que involucren FG** (`storeA` o `storeB` = Friendly Grow) antes de juzgar
  nada. El resto de la banda no es este encargo.
- **Limitación conocida del script**: exige que ambas ofertas tengan la **misma `category`**, y
  esa columna **se queda stale** (nunca se repara cuando una oferta cambia de categoría). Un par
  legítimo con categorías distintas no aparece. Si te parece que ahí hay material, escribí tu
  propia variante read-only en `scratch/` que ignore la categoría y decilo — pero primero
  trabajá lo que sí sale.

**Entregable B** → `reports/r60-titulos-banda-baja.csv`, mismas columnas que el entregable de
productos nuevos de r59:

```
offerIds;tiendas;nTiendasDistintas;marca;nombrePropuesto;brandKey;modelSlugPropuesto;categoria;algunaConStock;ratioPrecio;evidencia;confianza
```

Esperá una tasa de rechazo alta: bajar el umbral compra ruido a propósito. **Un 80% de descarte
en esta tarea es señal de que la estás haciendo bien**, no de que fracasó.

---

## 4. TAREA C — Triage de los candidatos por imagen (BLOQUEADA, te aviso)

Es la apuesta fuerte y la parte cara la hago yo: estoy escribiendo el script que cruza las **682
huérfanas de FG contra las 2.341 de las otras 5 tiendas por dHash + CLIP** (1,6M de pares). Es el
único método que puede tocar las 206 pipas y bongs genéricos, porque las tiendas comparten las
fotos del proveedor. **Lo que se hizo por imagen hasta ahora fue siempre huérfana de FG → producto
ya curado; nunca huérfana contra huérfana.**

Cuando te pase `reports/r60-fg-imagen.csv`, tu trabajo **no es mirar fotos** — es **desempatar por
texto lo que la imagen ya sugirió**, que es más barato y cierra la mayoría de los casos:

- **¿La URL base ya decide?** Si la tienda de una ya vende el modelo de la otra en otra ficha, son
  dos modelos. En r58 esto cerró 21 de 29 casos sin abrir una sola imagen.
- **¿SKU o EAN compartido entre tiendas?** Identidad dura, cierra el caso a favor.
- **¿Ratio de precio coherente?** >1,8 o <0,55 sin explicación es rechazo. Pero **un ratio bueno
  no descarta un mislink de tipo**: en r59 propusiste un par con ratio 1,07 donde uno era
  papelillo (SKU `SHI-PAC114`) y el otro un cono.
- **¿Talla o edición distinta?** Nunca fusionan (55mm ≠ 63mm, King Size ≠ 1 1/4, Wu-Tang ≠ Tyga).
  El color sí fusiona.

**Entregable C** → `reports/r60-fg-imagen-veredictos.csv`, columnas que te daré con el CSV. Lo que
mandes a `NECESITA-FOTO` tiene que traer **la pregunta concreta que la imagen debe responder**
("¿la cámara del Fenix Pro trae el tubo de 4 cápsulas?"), porque ese pase lo corro yo y es el caro.

---

## 5. Qué NO hacer

- **No reabrir el frente 5t→6t.** Cerrado con 5 métodos independientes el 28 jul.
- **No re-barrer las marcas exclusivas de FG**: honeypuff, phoenix-star, baked-bunny,
  brass-knuckles, gorilla, doteco. ~277 ofertas medidas, sin par posible.
- **No re-cruzar las 353 sin marca contra los `modelSlug` del catálogo**: eso es r58 Tarea D, dio
  cero y el cero es correcto. La Tarea A de acá es un método distinto, no el mismo con otro
  nombre.
- No crear productos, no vincular, no editar `matching-constants.ts`, no correr scrapes, no git.
- No propongas productos de una sola tienda.

---

## 6. Entregables

| archivo | tarea | estado |
|---|---|---|
| `reports/r60-tokens-raros.csv` | A | podés empezar ya |
| `reports/r60-titulos-banda-baja.csv` | B | podés empezar ya |
| `reports/r60-fg-imagen-veredictos.csv` | C | bloqueada, te aviso |
| `plans/r60-informe-ejecutor.md` | todas | método, conteos, **tasa de aceptación por tarea**, y cómo buscaste lo que dio cero |

En el informe quiero explícito el **método de cada cero**. Tu cero de r58 resultó correcto y se
supo solo porque describiste cómo lo buscaste — esa clase de detalle es lo que lo hace auditable.
