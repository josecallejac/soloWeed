# r57 — Encargo al ejecutor: sanear y mapear el pozo de Friendly Grow

**Fecha:** 28 jul 2026 · **Orquestador:** Claude · **BD:** PostgreSQL Railway (producción)

## 0. Reglas del encargo (no negociables)

1. **NO tienes permiso de escritura.** Nada de `--apply`, nada de `prisma.*.update/create/delete`,
   nada de scripts que muevan `productId`. Si crees que algo debe aplicarse, lo escribes en el CSV
   y lo aplica el orquestador. (Incidente del 28 jul: se creó una "r55" no encargada, 99 productos,
   revertida entera.)
2. **Entrega siempre `offerId`** en cada fila. Un título sin offerId no es verificable y se descarta.
3. **Mide contra la BD, no contra tu informe.** Cada número que reportes tiene que salir de una
   consulta que dejes escrita en el CSV o en el script. No repitas cifras de memoria.
4. **Lo mecánico va a un script**, no a un juicio caso por caso. Si la regla se puede expresar como
   patrón de título/URL, escríbela como script en `scripts/` (dry-run, read-only) y entrega su salida.
5. Trabajás sobre **Friendly Grow (storeId = 24)**. El orquestador está corriendo en paralelo el
   barrido por imagen (`find-store-upgrades-by-image.ts` con `IMGUP_STORE=friendlygrow`) sobre
   **productos ya curados**. No toques ese frente: tus dos tareas son disjuntas de él.

## 1. Contexto medido hoy (para que no lo re-midas)

- FG: **942 ofertas**, solo **51 vinculadas** → **831 huérfanas con stock**. Aparece en apenas
  **16 productos de 802**. Es el growshop más invisible del sitio.
- **FG no vende el núcleo mainstream**: 0 ofertas de RAW, OCB, Ozeta, Bonglab, SLX, Storz&Bickel,
  Soulblime y LRC. Verificado por brandKey, por barrido de títulos sin marca y por su propio
  buscador ("honeypuff" → 192 apariciones, "yocan" → 255, pero "raw"/"ocb"/"ozeta" → 12-13 = solo
  el eco del template). **No vuelvas a barrer ese frente.**
- Marcas de FG ya medidas **sin par en otra tienda** (r53, no re-barrer): honeypuff 83,
  phoenix-star 73, baked-bunny 46, brass-knuckles 38, gorilla 6, doteco 31.
- Composición de las 831 huérfanas por categoría (total / de marcas-sin-par / fuera de alcance / resto):

  | categoría | total | sin par | fuera | resto |
  |---|---|---|---|---|
  | Otros parafernalia | 147 | 7 | 0 | 140 |
  | Pipas | 104 | 6 | 0 | 98 |
  | Accesorios de extracción | 96 | 12 | 0 | 84 |
  | Moledores | 89 | 30 | 0 | 59 |
  | Repuestos bongs/vaporizadores | 88 | 29 | 0 | 59 |
  | Bongs | 102 | 60 | 0 | 42 |
  | Vaporizadores herbales | 38 | 8 | 0 | 30 |
  | Contenedores y estuches | 30 | 12 | 0 | 18 |
  | Bandejas y ceniceros | 31 | 17 | 0 | 14 |
  | Filtros y boquillas | 40 | 33 | 0 | 7 |
  | Papelillos | 11 | 10 | 0 | 1 |
  | Conos y blunts | 21 | 21 | 0 | 0 |
  | Vaporizadores electrónicos | 30 | 0 | 30 | 0 |

## 2. TAREA A — Purga de alcance (mecánica, va a script)

El "fuera de alcance" de la tabla (30) está **mal medido**: solo cuenta `brandKey = oxbar`. En los
464 títulos sin marca aparecen `vaporizador desechable` ×75, `000 puffs` ×52, `desechable gremlin`
×18, `gremlin phantom` ×18, `desechable nexbar` ×14, `vaporizador vaporesso` ×12. Es decir hay
**~100+ ofertas fuera de alcance repartidas en otras categorías**.

Regla vigente ([[alcance-catalogo-vapes]]): **fuera** los desechables de sabores y los **pod kits
recargables de e-líquido** (Vaporesso, Smok, Wotofo). **Dentro** los herbales, los de concentrados
y las **baterías 510 para cartuchos**.

**Entregable A** → `reports/r57-fg-fuera-de-alcance.csv` con columnas:
`offerId,title,category,brandKey,price,motivo,confianza`

- `motivo`: `desechable-sabores` | `pod-kit-eliquido` | `duda`
- `confianza`: `alta` (patrón inequívoco: "X puffs", "desechable", marca de vapeo) | `media` | `baja`
- Ojo con los **falsos positivos**: una batería 510 para cartucho SÍ va dentro aunque diga
  "vaporizador"; un vaporizador de concentrados también. Marca esos como fuera del CSV.
- Escribe la regla como `scripts/diagnose-fg-scope.ts` (read-only, dry-run) y entrega su salida.

## 3. TAREA B — Qué marcas de FG pueden dar par (la tarea que decide el techo)

Esta es la que importa. De las **464 huérfanas sin `brandKey`**, hay frases de marca reales que el
matching no ve porque no están en `KNOWN_BRAND_PHRASES`: `mr joint` ×25, `banger bros` ×13,
`stoner kitty` ×12, `alien x og labs`, `lady hornet`, `ownsbox`, `stash-pro`, `dazzleaf`,
`amsterdam`. Puede haber más.

Para cada marca candidata que detectes, **la pregunta decisiva es si alguna de las otras 5 tiendas
la vende** (Astro 1, Fumetas 2, Piranha 3, GrowBarato 4, Kushbreak 8). Si no la vende nadie más,
esa marca **no puede producir un producto comparable** y no vale la pena tocarla.

**Entregable B** → `reports/r57-fg-marcas-candidatas.csv` con columnas:
`frase,ofertasFG,offerIdsFG,existeEnOtraTienda,tiendasQueLaVenden,offerIdEjemploOtraTienda,veredicto`

- `offerIdsFG`: hasta 5 offerIds de ejemplo, separados por `|`.
- `existeEnOtraTienda`: `si` / `no`, medido con una consulta sobre `Offer.title` de las otras 5
  tiendas (case-insensitive), **no por intuición**.
- `veredicto`: `AGREGAR-A-CONSTANTES` (la vende otra tienda → puede dar productos comparables) |
  `SOLO-FG` (nadie más la vende → no tocar) | `DUDA`.
- Recordá que las marcas/aliases viven **solo** en `src/lib/matching-constants.ts`
  (`KNOWN_BRAND_PHRASES`, `BRAND_ALIASES`). **No las edites**: propónelas en el CSV.

## 4. Trampas conocidas que te van a morder

- **El filtro "¿suma tienda?"**: cualquier vínculo que propongas debe decir explícitamente si la
  tienda ya estaba en el producto destino. Un vínculo que no suma tienda no es cobertura, es
  limpieza — y hay que etiquetarlo como tal, no colarlo como upgrade.
- **Trampa agregado-vs-individual**: si evalúas ofertas de un mismo lote **una por una** contra el
  estado actual, cada una "ve" a sus hermanas y te da un falso "esa tienda ya estaba". Evalúa el
  lote completo contra el estado *previo*.
- **Talla y edición no se fusionan**: 55mm ≠ 63mm, un diseño ≠ otro diseño. Color a elección sí.
- **Genéricos**: "Bong de Pyrex Mini Beaker" de FG NO es un Bonglab. Sin marca real, no hay identidad.

## 5. Qué NO hacer

- No crear productos. No vincular. No editar `matching-constants.ts`. No correr scrapes.
- No proponer vínculos contra productos **congelados** (≥4 tiendas) sin marcarlos en columna aparte:
  esos requieren OK explícito del usuario y solo admiten la regla "solo sumar".
- No re-barrer las marcas ya medidas sin par (§1).
