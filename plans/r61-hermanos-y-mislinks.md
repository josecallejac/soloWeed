# r61 — Encargo al ejecutor: fusión de hermanos, mislinks viejos y el rescate de r59-C

**Fecha:** 29 jul 2026 · **Revisado:** 30 jul 2026 · **Orquestador:** Claude · **BD:** PostgreSQL
Railway (producción)
**Estado del catálogo (re-medido contra la BD viva el 30 jul, es el estado real de ahora):**
**820 productos** (**1×6t** + 27×5t + 107×4t + 255×3t + 408×2t + 22×1t), protección **390**.
11.406 ofertas, **3.793 vinculadas**, **3.347 huérfanas con stock**.

> Los números del encabezado original (830 productos, 28×5t, protección 392) eran una proyección
> equivocada y quedaron obsoletos: los de arriba salen de `scripts/count-by-stores.ts` contra la BD.
> Si tu medición no da 820, **decilo y averiguá por qué antes de seguir**.

---

## 0. Contexto: qué cambió antes de que empieces

**Cerré el hueco de alias de marca** que destapó r60. `src/lib/matching-constants.ts` tiene 3
entradas nuevas en `BRAND_ALIASES`: `airis → airistech`, `da vinci → davinci`,
`santa cruz → santa-cruz-shredder`. Medido: **186 ofertas cambian de `brandKey`** (125 + 32 + 28,
más 1 caja multimarca que es ruido).

**Y ahora la precisión que importa para tu trabajo, para que no te ancles con una idea falsa mía:**
ese hueco cegaba las herramientas que cruzan **ofertas huérfanas** por marca
(`diagnose-brand-coverage-gap`, `find-store-upgrades`). **No cegaba la fusión de hermanos**, porque
los `Product` ya usaban todos la forma canónica (0 productos con `brandKey=airis`, `da-vinci` o
`santa-cruz`; 8 con `airistech`, 5 con `davinci`). No busques hermanos perdidos por alias: no hay.

**r59 y r61 YA ESTÁN APLICADAS.** No hay ninguna ronda en vuelo, así que **ninguna oferta que
mires está esperando a que yo la toque**. Lo que se aplicó, para que sepas qué ya no está
disponible:

- **r61** (el hueco de alias): 3 productos nuevos — `airistech/bateria-vertex-2-0` con **5
  tiendas**, `airistech/quaser` con 3 y `airistech/bateria-mystica-ii` con 2 — más P10681 y P10720
  a 4 tiendas y P10882 a 3.
- **r59**: 70 ofertas vinculadas, **+25 tiendas** en 25 productos existentes y **13 productos
  nuevos** (P11007–P11019). De tu Tarea B entraron 12 de 14: rechacé la **enroladora OCB** (ratio
  2,00; la de Fumetas es la "Automática" y la de Piranha la "Nº1", dos modelos) y la **polera RAW**
  (decisión del usuario: la ropa no es parafernalia). Y te corregí **11 de 14 slugs**.
- **Se dividió P10281** (Capsule Caddy): la versión de Concentrados salió a `P11019` y P10281
  conservó sus 3 tiendas recibiendo la oferta normal de Piranha que estaba huérfana.

**Y lo que pasó DESPUÉS de escribirte este brief (30 jul), que también te cambia el terreno:**

- **r62 y r63 aplicadas.** r63 creó **el primer producto de 6 tiendas** del catálogo:
  `airistech/bateria-vertex-2-0` (P11004). Consecuencia práctica para vos: **el umbral de
  "congelado" ya no es 4-y-tope** — un producto puede tener 5 o 6 tiendas. Nunca asumas que 4 es el
  máximo al contar.
- **La ropa YA SALIÓ** (no está "saliendo"): `classifyProduct` endurecido, 32 ofertas desvinculadas,
  10 productos borrados. Sigue en pie la instrucción: no propongas prendas. Pero **ojo con los
  falsos positivos ya medidos**, que costaron caro: en parafernalia **`cap` es tapa** (80 ofertas,
  21 curadas), `short` es la línea "Shortys", `sujetador` es un soporte. No los toques.
- **Las entidades HTML se limpiaron de raíz** (20 `Product.name` + 241 `Offer.title`) y el scraper
  ya decodifica al guardar. O sea que **el `&amp;` que te rompió el parser en r59 ya no está en los
  títulos de la BD** — pero la regla 5 de abajo sigue vigente igual, porque el problema era el
  parser, no el dato.
- **Friendly Grow hacia productos existentes: FRENTE CERRADO**, medido con 3 métodos (texto, imagen
  y marca) sobre 671 huérfanas contra los 795 productos que no la tienen. No lo reabras.
- **La Tarea C de r60 (cruce huérfana↔huérfana por imagen en FG) ya no está bloqueada: está MEDIDA
  Y DESCARTADA.** El medidor de señal (`measure-image-signal-power.ts`) sobre 630 pares ya
  verificados por humano da **dHash mediana 221** y **CLIP mediana 0,799** → **recall 14%**: FG
  fotografía sus propios productos en vez de reusar el arte del proveedor. **No la rehagas.**

**Aun así, revalidá:** si una oferta que ibas a proponer ya tiene `productId`, **saltala**
(`YA-VINCULADA`), no la re-juzgues ni la muevas.

**Qué es paralelo y qué está bloqueado:**

- **Las CUATRO tareas de este brief son paralelas. Podés empezar las cuatro ya.** Ninguna espera
  nada mío. (En r60 contestaste "listo para revisar resultados cuando lleguen" a tareas que no
  dependían de nada — no vuelvas a esperar.)
- **La Tarea C de r60 (cruce por imagen FG) está descartada con medición**, ver arriba. No la toques.
- **La ronda Brass Knuckles + Honeypuff es mía**, no tuya: son las dos vetas que sobrevivieron al
  análisis de FG del 30 jul y las trabajo yo por foto. No las incluyas en ninguna tarea.
- **La ropa ya salió del catálogo** (decisión del usuario, 29-30 jul, aplicada). **No propongas nada
  que sea una prenda** (polera, polerón, jockey, gorro, calcetines, hoodie…), en ninguna de las
  cuatro tareas.

---

## 1. Reglas del encargo

Las de siempre. Las repito porque cada una salió de un fallo concreto y medido:

1. **No tenés permiso de escritura.** Ni `--apply`, ni `update/create/delete`, ni git (`main` tiene
   auto-deploy a producción). Proponés en CSV; aplico yo. Scripts nuevos, **read-only y en
   `scratch/`**.
2. **`offerId` y `productId` reales en cada fila**, una fila por dato. **El análisis va en el `.md`
   aparte**, nunca en una columna del CSV.
3. **Un producto nuevo exige ≥2 tiendas DISTINTAS.** Contá tiendas, no ofertas. En r59 propusiste
   "Yocan Blade" con 5 ofertas **todas de Friendly Grow**.
4. **Todo efecto de cobertura se mide sobre el LOTE COMPLETO contra el estado previo, nunca fila
   por fila.** En r59 tu CSV decía 36 upgrades y el efecto real eran 24: las filas hermanas del
   mismo lote se "veían" entre ellas. Y **excluí siempre la propia oferta** al medir: comparar una
   oferta ya vinculada contra su propio producto da un falso "esa tienda ya estaba".
5. **Usá un parser de CSV que respete comillas.** En r59 procesaste 89 de 98 filas: las 9 que
   faltaban tenían **`&amp;`** en el título (Storz **&** Bickel), que lleva un `;` y te desplazó
   las columnas en un CSV separado por `;`. Peor que el bug: **lo explicaste** ("el CSV se
   regeneró") en vez de investigarlo, y era falso. Esas 9 valían un upgrade real, un producto
   nuevo y un mislink. **Si un conteo no cuadra, el parser es el primer sospechoso.**
6. **Reconciliá y auditá tu propio resumen contra tu propio CSV.** En r59 el CSV estaba bien y el
   resumen mal ("5 congelados tocados": los 5 tenían 2 tiendas).
7. **Un ratio de precio bueno NO descarta un mislink de tipo.** En r59 propusiste un par con ratio
   1,07 donde uno era papelillo (SKU `SHI-PAC114`) y el otro un cono. Cuando el ratio cuadra,
   mirá igual **qué clase de artículo** es cada uno.
8. **Si el título nombra un modelo y el destino nombra otro, es NO-VINCULAR** aunque coincidan
   precio y función. Tu modo de fallo histórico es emparejar por FUNCIÓN: "Yocan Blade"→hot-knife,
   "Ziva Pro"→kodo-pro, "Vane"→"Vane 2". Hacen lo mismo; son SKUs distintos.
9. **Talla y edición nunca fusionan** (55mm ≠ 63mm, King Size ≠ 1 1/4, Wu-Tang ≠ Tyga). **El color
   sí fusiona.**
10. **Antes de mover una oferta, mirá dónde cuelga HOY.** En 2 de tus 6 mislinks de r52
    (`BLAB-DIF-14N`, `CLIPP-MDEGO`) **las dos ofertas del par ya estaban en el mismo producto** —
    lo contrario de un mislink — y proponías mover una al producto equivocado.
11. **Higiene de `modelSlug`, que es URL pública.** Solo `[a-z0-9-]`, sin espacios ni puntos, sin
    guion final, **acentos transliterados** (`batería` → `bateria`), y **sin repetir la marca, la
    categoría ni el nombre de la tienda**. Bien: `neo-p8000-black-ice`. Mal:
    `vaporizador-airis-neo-p8000-black-ice-5-airistech`, `bater-a-met-lica-piranha`.
12. **Antes de cerrar un caso, preguntate POR QUÉ.** En r60 marcaste `herbva` y `nokiva` como
    tokens dudosos y ahí lo dejaste: eran la punta del hueco de alias, que valía 2 upgrades a 4
    tiendas y 2 productos nuevos. Si un token o un SKU aparece en dos tiendas de forma rara,
    **tirá del hilo**.
13. **Un "cero" hay que verificarlo igual que un "sí"**, y tenés que contar **cómo** lo buscaste.
    Tu cero de r58 resultó correcto y solo se supo porque describiste el método.

---

## 2. TAREA A — Fusión de hermanos, barrido COMPLETO del catálogo (prioridad 1)

**El caso:** el mismo producto curado dos veces, con las tiendas repartidas entre las dos fichas.
Fusionarlos sube niveles **sin scrapear nada**. Es la mejor vía de crecimiento que queda sin
tienda nueva.

**Por qué está sin hacer:** r45 solo revisó los **29 productos que tienen Kushbreak**. El script
barre el catálogo entero desde entonces y nadie miró el resto. Precedente aplicado:
`scripts/link-r45-fusiones-hermanas-reviewed.ts`.

**El universo sale de un script commiteado** (no inventes uno):

```powershell
npx tsx scripts/find-duplicate-products.ts                      # DUP_MIN_SIM=0.82 por defecto
$env:DUP_MIN_SIM="0.75"; npx tsx scripts/find-duplicate-products.ts   # segunda pasada, más laxa
```

Escribe `reports/duplicate-products.json`. Es read-only. Corré **las dos pasadas** y decí cuántos
grupos da cada una.

**Tres límites del script que tenés que conocer** (los leí en el código, no los adivines):

- La señal B (título casi idéntico) **exige misma `Product.category`**. Dos hermanos catalogados en
  categorías distintas no aparecen.
- La señal B **solo deja a cada producto en UN par** (`pairedB`), así que **tríos y cuartetos se
  parten**. Esto importa mucho para el caso Puffco de abajo.
- La señal A (mismo `modelKey`) es la más fuerte, pero `modelKey` genérico produce falsos
  "exactos" — el precedente conocido son las bolsas Ozeta distintas cayendo en `crossbag-5x5` y
  los accesorios Mighty cayendo en el vaporizador Mighty+.

**Semillas ya detectadas** (úsalas como test de que tu método las encuentra; si tu barrido no las
levanta, tu barrido está mal):

| par | qué es |
|---|---|
| **P10275 / P10287** | los dos son "Piezas Desgaste Mighty" |
| **P10363 / P5749** | `quemador-hembra-14mm` (1t) vs `bowl-bowl-14mm` "Quemador Bowl Chico Hembra 14Mm" (3t) |
| **P10325 / P10674** | `focus-v/vidrio-carta-sport` (3t) vs `focus-v/vidrio-carta-2-sport` (2t) |
| **Puffco New Peak** | Bliss / Cloud / Sky / Onyx: la ficha de Astro es "New Peak (Color a elección)" repartida en 4 productos, con ofertas de Astro de **la misma ficha** en varios. Es un **cuarteto**, no un par: mover 3 dejaría las Astro del mismo color partidas entre dos productos. |

**Regla dura de esta tarea:** **fusionar MUEVE vínculos existentes — no es "solo sumar".** Por lo
tanto:

- Si **ningún** miembro del grupo tiene ≥4 tiendas → proponelo normal.
- Si **algún** miembro tiene ≥4 tiendas (congelado) → va en un CSV aparte y marcado, porque
  **exige OK del usuario caso por caso**. No lo mezcles con los demás.
- Para cada grupo, decí qué producto es el **ancla** (el que sobrevive) y por qué. El ancla debe
  ser el que tiene **más tiendas** y el `modelSlug` más correcto; si el slug del ancla es peor que
  el del otro, decilo.
- **Y lo que define la tarea: ¿la fusión suma tiendas?** Un grupo cuyas dos fichas tienen las
  mismas tiendas no sube nivel — sigue valiendo la pena (limpia catálogo duplicado) pero **es otra
  cosa y va en su propia columna**. No infles el conteo de upgrades con eso.

**Entregable A** → `reports/r61-hermanos.csv`:

```
grupoId;productIds;anclaPropuesta;motivoAncla;brandKeys;modelSlugs;nombres;tiendasPorProducto;tiendasUnidas;nTiendasAntes;nTiendasDespues;sumaTienda;algunoCongelado;ratioPrecio;evidencia;confianza;veredicto
```

- `veredicto`: `FUSIONAR` | `NO-FUSIONAR` | `NECESITA-OK-USUARIO` (congelado) | `NECESITA-FOTO`.
- `tiendasUnidas`: la lista de slugs de tienda del grupo unido, no un número solo.
- `nTiendasDespues` es el tamaño del **conjunto** de tiendas, no la suma de las dos.
- Los congelados van también acá pero con `veredicto=NECESITA-OK-USUARIO`; **además** listalos
  aparte en el informe con la evidencia lista para que el usuario decida de un vistazo.

---

## 3. TAREA B — Los 16 mislinks de r52 y los `NECESITA-FOTO` que resuelve la URL (prioridad 2)

Dos pendientes viejos que se cierran con la misma herramienta y **casi sin fotos**.

### B.1 — `reports/r52-mislinks.csv` (21 filas, 16 pares), sin auditar

Son casos donde **el mismo SKU de la misma tienda cuelga de dos productos curados**. Anotado: **8
harían perder una tienda** y **11 vienen marcados `NECESITA-FOTO`**.

**Leelo al derecho, que acá te equivocaste antes.** Un SKU compartido **dentro de una misma
tienda** significa que las dos ofertas **pertenecen al mismo producto** — eso es lo contrario de un
mislink, y en 2 de 6 casos propusiste mover una oferta al producto equivocado. Un SKU/EAN
compartido **entre tiendas distintas** es identidad dura a favor. Distinguí los dos casos
explícitamente en cada fila.

Confirmado aparte y ya sabido: `of12254` (30 ml) está mal pegada a **P10246**
`bonglab/cleaner-250ml` (por eso su ratio es 3,05x).

### B.2 — Los `NECESITA-FOTO` que nunca se resolvieron

- **Los 10 de r53 Fase 2** (`reports/r53-upgrades-fg.csv`): 4 Yocan Blade vs Puffco Hot Knife,
  4 Yocan Hit original vs Hit 2, repuesto Dirk, Iris vs Flat.
- **`of88911` Yocan Iris**, el único que quedó de r56: ratio 2,60 contra P10548 `yocan/flat`, y la
  URL `/yocan-iris` ya sugiere que es otro modelo.
- **Las 5 Yocan Hit de FG** (`of87650`-`of87654`,
  `/vaporizador-para-hierbas-yocan-hit-kit-100-original`): $30.990 contra $64.990 (Fumetas) y
  $69.990 (Kushbreak) = **ratio 2,26**. Quedaron fuera de P10892 a propósito. Puede ser otra
  versión del kit.

**La herramienta, que es mecánica y barata:**

```powershell
$env:EV_PAIRS="88911:10548,87650:10892,..."; npx tsx scripts/diagnose-identity-evidence.ts
```

Emite `MISMA-FICHA` / `SKU-COMPARTIDO` / `OTRA-FICHA-MISMA-TIENDA` / `TIENDA-AUSENTE`. **En r58
esto cerró 21 de 29 casos sin abrir una sola imagen.** El principio: **la URL zanja la identidad
antes que la foto** — si la tienda de la huérfana ya vende el producto destino bajo **otra URL
base**, son dos modelos y no hace falta ver nada.

**Entregable B** → `reports/r61-mislinks-y-urls.csv`:

```
caso;offerIds;productIdsHoy;productIdPropuesto;skuCompartido;ambitoSku;evidenciaURL;ratioPrecio;pierdeTienda;sumaTienda;veredicto;preguntaParaLaFoto
```

- `ambitoSku`: `MISMA-TIENDA` | `CROSS-TIENDA` | `NINGUNO`. Es la columna que evita el error de r52.
- `pierdeTienda`: `si`/`no` — si es `si` y el producto tiene ≥4 tiendas, `veredicto` va a
  `NECESITA-OK-USUARIO`.
- `preguntaParaLaFoto`: **obligatoria** si mandás algo a `NECESITA-FOTO`. La pregunta concreta que
  la imagen debe responder ("¿la cámara del Fenix Pro trae el tubo de 4 cápsulas?"). Ese pase lo
  corro yo y es el caro: sin la pregunta, la fila vuelve.
- Barré **toda la marca** antes de escribir "sin par". En r59 declaraste que `of69173` no tenía par
  y tenía (`of75352`), porque te quedaste en el candidato que ya tenías delante.

---

## 4. TAREA C — Rescate por partes de tu Tarea C de r59 (prioridad 3)

`reports/r59-tarea-c-productos-nuevos.csv` (65 productos propuestos) **quedó inaplicable entero**,
y no por criterio de fondo sino por 4 problemas concretos que medí:

1. **27 slugs repiten la marca** y varios la categoría → regla 11 de arriba.
2. **Clusters gigantes vendidos como un producto**: uno de **28 ofertas** (ratio 2,67), uno de 10
   (ratio 2,00), uno de 8. Ese es exactamente el patrón que obligó a **borrar**
   `clipper/lighter-classic`, que juntaba ~23 diseños, y `vibes/organic`, que mezclaba 4 líneas.
3. **15 filas con ratio real > 1,8.**
4. **6 ofertas compartidas con tu Tarea B**, pese a que tu informe decía "0 overlap verificado".

**PRIMERO DE TODO, RE-FILTRÁ POR ALCANCE.** Ese CSV se generó **antes** del commit
`c73d75c`, que saca del catálogo los códigos de puffs (`P8000`/`P28000`/`P45000`) porque son
**vaporizadores desechables de esencia**, que no van en SoloWeed. Los 5 productos Airis Neo P8000
que propusiste ahí eran correctos según la regla que te di —el bug era del clasificador— pero
**hoy están fuera**. Pasá las 65 filas por `classifyProduct` actual y descartá las que den `null`
antes de juzgar nada; reportá cuántas cayeron. Lo mismo vale para cualquier pod kit recargable de
e-líquido (Vaporesso, Smok, Wotofo). Sí están dentro los vaporizadores de hierba y de
concentrados, y las baterías 510 para cartuchos.

**No lo re-hagas desde cero: rescatalo.** Regla de partición: **más de ~6 ofertas o ratio > 1,8 →
partir en subgrupos coherentes o marcar `DESCARTAR`**, nunca entregar el cluster entero. Un grupo
de 28 ofertas con ratio 2,67 **no es un producto**, son varios modelos o varias tallas.

**Entregable C** → `reports/r61-r59c-rescate.csv`, mismas columnas que el entregable de productos
nuevos de r59, más `origenFilaR59` y `motivoParticion`:

```
offerIds;tiendas;nTiendasDistintas;marca;nombrePropuesto;brandKey;modelSlugPropuesto;categoria;algunaConStock;ratioPrecio;evidencia;confianza;origenFilaR59;motivoParticion
```

Y en el informe: de las 65 filas originales, **cuántas se rescatan, cuántas se parten y cuántas
mueren**, con el criterio. Esperá una mortalidad alta; eso es la tarea saliendo bien, no fallando.

---

## 4-bis. TAREA D — Las 104 ofertas cuya marca contradice a su producto (prioridad 2, empatada con B)

Señal **nueva**, que salió auditando el backfill de marcas. Hay **104 ofertas vinculadas cuyo
`brandKey` no coincide con el `brandKey` del producto del que cuelgan**, en **27 pares de marca**.
**Re-medido contra la BD viva el 30 jul**, después de r59, r61, r62, r63 y el retiro de la ropa, así
que es el estado real de ahora. Universo total de referencia: **3.705 ofertas vinculadas con
`brandKey`**.

| oferta != producto | ofertas | productos |
|---|---|---|
| `bonglab` != `re-stash` | **30** | P10292, P10293, P10294, P10295 |
| `calvo` != `special-blue` | 12 | P10310, P10311, P10483, P10661, P10754 |
| `cabo` != `yocan` | 6 | P10892 |
| `calvo` != `dime-bags` | 4 | P10491 |
| `storz-bickel` != `clipper` | 4 | P10747 |
| `calvo` != `calvo-glass` | 4 | P10605, P10637 |
| `bukket` != `sploofy` | 4 | P10528, P11007 |
| `galaxy` != `unknown` | 4 | P10638 |
| `c-thru` != `lion-rolling-circus` | 3 | P10707, P10708, P10709 |
| `clipper` != `hemper` | 3 | P10229, P10230, P10231 |
| `cookies` != `stundenglass` | 3 | P10722, P10723, P10724 |
| `integra-boost` != `puffco` | 3 | P10494 |
| `dynavap` != `ispire` | 3 | P10405 |
| `cookies` != `g-pen` | 3 | P10541 |
| `stundenglass` != `cookies` | 2 | P10659, P10670 |
| `santa-cruz-shredder` != `zippo` | 2 | P10426 |
| `blunt-wrap` != `platinum` | 2 | P10402 |
| `blunt-wrap` != `lion-rolling-circus` | 2 | P10567, P10568 |
| `empire` != `empire-rolling-papers` | 2 | P10641 |
| 8 pares de 1 oferta | 8 | P5802, P10137, P10311, P10558, P10614, P10765, P10999, P11012 |

**Historia del número, porque te va a servir para auditarte**: cuando lo medí por primera vez eran
**76**; después de r59+r61 dieron **92**; hoy son **104**. Sube porque el backfill unificó marcas y
porque **las rondas nuevas crean vínculos nuevos** — P11007 y P11012 son productos que nacieron en
r59 y ya aportan filas. O sea: **esta señal se regenera**, no es un pozo que se agote.

**Un caso que exige cuidado especial**: `cookies != stundenglass` (3) y `stundenglass != cookies`
(2) aparecen **en los dos sentidos**. Es la colaboración Cookies × Stündenglass, que es
genuinamente de dos marcas: ahí el veredicto probable es `AMBOS-BIEN-SON-ALIAS` o `NO-TOCAR`, no un
mislink. Decidí y justificá cuál es la marca canónica del producto colaborativo antes de proponer
mover nada.

**Son dos cosas distintas mezcladas, y separarlas ES la tarea:**

- **(a) Huecos de alias en `Product.brandKey`**, o sea el mismo problema de hoy pero del lado del
  producto: `calvo`/`calvo-glass`, `empire`/`empire-rolling-papers`, `formula-secreta`/`formula-420`.
  **Ojo, acá no se arregla con un alias**: `Product.brandKey` es **URL pública** y cambiarlo rompe
  la URL viva del producto. Proponé el canónico y decí **qué URL cambiaría**; la decisión es del
  usuario, no tuya ni mía.
- **(b) Mislinks de verdad**: una oferta de una marca colgando de un producto de otra. `bonglab`
  en un producto `re-stash` (30 ofertas), `storz-bickel` en `clipper`, `stundenglass` en `cookies`,
  `dynavap` en `ispire`, `santa-cruz-shredder` en `zippo`. **El caso `bonglab`/`re-stash` con 30
  ofertas es el más gordo y el primero que quiero ver.**

Cuidado con el tercer caso, que no es ninguno de los dos: **el `brandKey` de la oferta puede estar
mal y el producto bien**. `galaxy != unknown` huele a eso. Antes de proponer mover una oferta,
decidí **cuál de los dos lados está equivocado** y justificalo con el título, el SKU y la URL.

**Entregable D** → `reports/r61-marca-incoherente.csv`:

```
offerId;tienda;titulo;brandKeyOferta;productId;brandKeyProducto;modelSlug;lado;tipo;canonicoPropuesto;urlQueCambiaria;pierdeTienda;veredicto;evidencia
```

- `lado`: `OFERTA-MAL` | `PRODUCTO-MAL` | `AMBOS-BIEN-SON-ALIAS`.
- `tipo`: `HUECO-ALIAS-PRODUCT` | `MISLINK` | `BRANDKEY-OFERTA-MAL`.
- `veredicto`: `CORREGIR-MARCA` | `DESVINCULAR` | `MOVER-A-OTRO-PRODUCTO` | `NECESITA-OK-USUARIO`
  (si cambia una URL pública o toca un producto de ≥4 tiendas) | `NO-TOCAR`.

Sacá el universo con una consulta propia read-only en `scratch/` (es un `findMany` de ofertas con
`productId` y `brandKey` no nulo, comparando los dos `brandKey`); no hay script commiteado todavía
para esto. Si el resultado te da distinto de **104 ofertas / 27 pares / 3.705 vinculadas con
marca**, **decilo y averiguá por qué antes de seguir** — no lo expliques con una hipótesis, medilo.

---

## 5. Qué NO hacer

- **No aplicar nada.** Ni vincular, ni crear, ni fusionar, ni borrar, ni editar
  `matching-constants.ts`, ni `git`, ni scrapes.
- **No reabrir el frente de los 27 productos de 5 tiendas.** A 26 les falta exactamente Friendly
  Grow, que no vende esas marcas; el bloqueo estructural es GrowBarato. Cerrado con 5 métodos el
  28 jul. (El producto de 6 tiendas del 30 jul **no desmiente esto**: apareció porque **no existía
  como fila `Product`**, no porque a un 5t le faltara una tienda.)
- **No re-barrer estas marcas de Friendly Grow, que sí están cerradas y medidas**: `phoenix-star`,
  `gorilla-rolling-star`, `baked-bunny` y `doteco`.
  **CORRECCIÓN al brief original:** decía también honeypuff y brass-knuckles y **era falso** —
  verificado marca por marca el 30 jul, brass-knuckles tiene la batería 900mAh 510 en FG, Piranha y
  Kushbreak, y honeypuff tiene los papelillos "100 Dólares" en FG y GrowBarato. Están **fuera de tu
  encargo porque las trabajo yo**, no porque no haya nada. Si en otra tarea te cruzás con una marca
  marcada como "sin par", **tratá esa etiqueta como una hipótesis, no como un hecho**.
- **No asumas que 4 tiendas es el techo** al contar cobertura o al detectar congelados: existen
  productos de 5 y uno de 6.
- **No re-cruzar las 353 huérfanas de FG sin marca contra los `modelSlug` del catálogo**: es la
  Tarea D de r58, dio cero y **el cero es correcto** (lo verifiqué por otro camino).
- **No propongas productos de una sola tienda.**
- **No propongas prendas de ropa** (ver arriba: salen del catálogo).
- **No pegues logs crudos ni CSV enteros en tus respuestas.** Redirigí a archivo y trabajá desde ahí.

---

## 6. Entregables

| archivo | tarea | prioridad |
|---|---|---|
| `reports/r61-hermanos.csv` | A — fusión de hermanos | 1 |
| `reports/r61-mislinks-y-urls.csv` | B — mislinks r52 + URLs | 2 |
| `reports/r61-marca-incoherente.csv` | D — marca oferta != producto | 2 |
| `reports/r61-r59c-rescate.csv` | C — rescate de r59-C | 3 |
| `plans/r61-informe-ejecutor.md` | todas | método, conteos por tarea, **tasa de aceptación por tarea**, cómo buscaste lo que dio cero, y los congelados listados aparte para el usuario |

**Cómo voy a auditar esto** (te lo digo para que te auto-audites primero): voy a re-correr los
scripts que generan tus universos, re-medir mecánicamente cada columna de cobertura contra la BD, y
revisar tu resumen contra tu propio CSV. Los tres fallos que más veces aparecieron son de
**medición, no de criterio** — el nº de tiendas, el `sumaTienda` agregado, y el parser de CSV. Si
esas tres columnas resisten, la ronda entra casi entera.
