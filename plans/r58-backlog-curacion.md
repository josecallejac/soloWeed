# r58 — Encargo al ejecutor: cerrar backlog de curación

**Fecha:** 28 jul 2026 · **Orquestador:** Claude · **BD:** PostgreSQL Railway (producción)
**Estado del catálogo al escribir esto:** 804 productos (27×5t + 102×4t + 237×3t + 416×2t + 22×1t), protección 366.

## 0. Reglas del encargo (idénticas a r57, que salieron bien)

1. **NO tenés permiso de escritura.** Nada de `--apply`, nada de `prisma.*.update/create/delete`.
   Lo que creas que debe aplicarse va al CSV; lo aplica el orquestador.
2. **`offerId` en cada fila.** Un título sin offerId no es verificable y se descarta.
3. **Medí contra la BD, no contra tu informe ni contra este documento.** Los números de abajo
   los medí hoy, pero verificalos: en r58 vas a encontrar CSVs viejos con datos podridos.
4. **Lo mecánico va a un script** dry-run en `scripts/`, no a un juicio caso por caso.
5. **Columna obligatoria `sumaTienda`** en toda propuesta de vínculo: `si` / `no` / `pierde`.
   Un vínculo que no suma tienda no es cobertura, es limpieza — etiquetalo como tal.

**Lección de r57 que aplica a todo lo de abajo:** antes de proponer una lista paralela,
preguntate si la fuente de verdad ya lo sabe. La purga de alcance de r57 era correcta pero
inerte, porque `classifyProduct` ya rechazaba las 139. La pregunta útil no era "¿qué está
fuera?" sino "¿quién no está consultando al clasificador?".

## 1. TAREA A — Cerrar r56: desempate por URL (29 casos)

**Insumos que SÍ existen:** `reports/r56-casos-pendientes.csv` (29 filas: offerId, productId,
origen) y `reports/r56-evidencia-identidad.csv` (29 filas con la señal ya medida).
**El brief original de r56 se perdió** (la carpeta `plans/` nunca se commiteó), así que esto
lo reemplaza.

**Verificado hoy:** las 29 ofertas siguen huérfanas, 0 se resolvieron solas, 0 sin stock.

La evidencia ya está medida: **21 `OTRA-FICHA-MISMA-TIENDA` y 8 `TIENDA-AUSENTE`, 0 misma-ficha**.
Eso significa que la mayoría se cierra **sin abrir una sola foto**:

- `OTRA-FICHA-MISMA-TIENDA` → la tienda de la huérfana ya vende el producto destino en otra
  URL base. Dos fichas = dos modelos = **NO-VINCULAR**, salvo que puedas mostrar lo contrario.
- `TIENDA-AUSENTE` → es el único caso que de verdad puede pedir foto.

**Entregable A** → `reports/r58-r56-veredictos.csv`:
`offerId,productId,senal,veredicto,sumaTienda,motivo`

- `veredicto`: `VINCULAR` | `NO-VINCULAR` | `PRODUCTO-NUEVO-CANDIDATO` | `NECESITA-FOTO`
- `PRODUCTO-NUEVO-CANDIDATO` es donde está el crecimiento real: una huérfana que no es el
  destino pero **tiene par en otra tienda**. Si lo marcás, poné el offerId del par.
- `NECESITA-FOTO` solo para `TIENDA-AUSENTE`, y con el motivo de por qué la URL no alcanza.

## 2. TAREA B — Khemo y Shine: productos nuevos

Ambas marcas estuvieron invisibles para el matching hasta que entraron en
`KNOWN_BRAND_PHRASES` el 21 jul, y nadie las trabajó desde entonces.

**Medido hoy** (corrige el "~34" que figuraba en mis notas):

| marca | ofertas | huérfanas | con stock | tiendas |
|---|---|---|---|---|
| khemo | 18 | 12 | 6 | Astro, GrowBarato, Kushbreak |
| shine | 33 | 29 | 1 | Fumetas, Kushbreak |

Hay pares cruzados evidentes que ya detecté de una lectura — **confirmalos y buscá el resto**:

- Wu-Tang 3 papeles: Fumetas `of73973` $35.990 ↔ Kushbreak `of69246` $32.990
- 6 papeles King Size oro: Fumetas `of73951` $49.990 ↔ Kushbreak `of69005` $48.990
- 2 Blunt Wraps oro: Fumetas `of19421` $31.990 ↔ Kushbreak `of69094` $26.990
- Bandeja metálica Khemo: Astro `of12408` $5.990 ↔ Kushbreak `of69306` $5.990 (**precio idéntico**)
- Tips Khemo: GrowBarato `of71212` $450 ↔ Kushbreak `of69314` $850 / `of69240` $1.990

**Prioridad:** los pares donde **al menos una tienda tiene stock** valen más que los que están
descatalogados en las dos. Marcalo en columna aparte, no los descartes — un producto con
historial de precios sigue siendo válido (precedente: P10992 Herbva 5G se creó con 1 de 3
tiendas con stock).

**Entregable B** → `reports/r58-khemo-shine.csv`:
`marca,offerIds,tiendas,nombrePropuesto,brandKey,modelSlugPropuesto,categoria,algunaConStock,ratioPrecio,evidencia`

- `modelSlugPropuesto` **no puede repetir la marca ni la palabra de la categoría**
  (bien: `24k-king-size-6u`; mal: `shine-papelillos-oro-king-size`).
- `evidencia`: sku/ean compartido, misma foto, o el texto que lo sostiene. Sé específico.
- Ojo con **talla y edición**: 1 1/4 ≠ King Size, Wu-Tang ≠ Lil Boosie ≠ Tyga. No fusionar.

## 3. TAREA C — Auditar los mislinks de r52 (el CSV está parcialmente podrido)

`reports/r52-mislinks.csv`: **21 filas / 16 pares** donde el mismo SKU de la misma tienda
cuelga de dos productos curados distintos. Nunca se auditó.

**El paso 1 es revalidarlo, no leerlo.** Medido hoy: de los 30 productos que cita,
**5 YA NO EXISTEN** — `P10694`, `P10288`, `P10698`, `P10699`, `P10674` — borrados o fusionados
en rondas posteriores. Cualquier fila que los mencione está obsoleta y hay que marcarla, no
razonarla.

Del resto: **9 productos citados son congelados hoy** (≥4 tiendas): P5525, P5778, P5761,
P5765, P5799, P7885, P10198, P10105, P10260. El CSV ya trae `perderiaTiendaA` (11 filas en `si`)
y `perderiaTiendaB` (8 en `si`), y 5 filas vienen como `NECESITA-FOTO`.

**Entregable C** → `reports/r58-r52-mislinks-auditado.csv`:
`productA,productB,skuCompartido,offerIdEnA,offerIdEnB,vigente,cualEsElCorrecto,sumaTienda,tocaCongelado,veredicto,motivo`

- `vigente`: `si` / `no` (marca `no` si cualquiera de los dos productos ya no existe; esas
  filas terminan ahí, no las razones).
- `tocaCongelado`: `si` si alguno de los dos tiene ≥4 tiendas **medido hoy**, no según el CSV.
- `veredicto`: `MOVER-A-A` | `MOVER-A-B` | `FUSIONAR` | `DEJAR` | `NECESITA-FOTO`.
- **Los que tocan congelados y los que hacen perder tienda van en un bloque aparte**: requieren
  OK explícito del usuario caso por caso y no se aplican con el resto.

## 4. Trampas que ya nos mordieron

- **Agregado vs individual**: si evaluás ofertas de un mismo lote una por una contra el estado
  actual, cada una "ve" a sus hermanas y te da un falso "esa tienda ya estaba". Evaluá el lote
  completo contra el estado previo.
- **La URL desempata antes que la foto**: si la misma tienda vende el destino en otra URL base,
  son dos modelos. `scripts/diagnose-identity-evidence.ts` lo resuelve mecánicamente
  (`EV_PAIRS="offerId:productId,..."`).
- **Genéricos sin marca no tienen identidad**: "Bong de Pyrex Mini Beaker" no es un Bonglab.
- **Ratio de precio > 1.40** no es rechazo automático, pero exige evidencia extra. En r57 el
  Lady Hornet tenía 1.65 y era correcto — se cerró por foto.

## 5. Qué NO hacer

- No crear productos, no vincular, no editar `matching-constants.ts` (proponé, no edites).
- No correr scrapes.
- **No volver al pozo de Friendly Grow**: cerrado por dos vías independientes en r57 (barrido
  por imagen con 3.430 candidatas y dHash d≤60 en cero pares; 7 de tus 8 marcas eran SOLO-FG).
- No re-barrer las marcas FG sin par: honeypuff, phoenix-star, baked-bunny, brass-knuckles,
  gorilla, doteco.
