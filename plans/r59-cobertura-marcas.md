# r59 — Encargo al ejecutor: cobertura por marca en Fumetas y Astro (la r55 que nunca se trabajó)

**Fecha:** 28 jul 2026 · **Orquestador:** Claude · **BD:** PostgreSQL Railway (producción)
**Estado del catálogo al escribir esto (medido hoy contra la BD):** 814 productos
(27×5t + 102×4t + 238×3t + 425×2t + 22×1t), protección 367.

---

## 0. Reglas del encargo

Las cinco de siempre:

1. **NO tenés permiso de escritura.** Nada de `--apply`, nada de `prisma.*.update/create/delete`,
   nada de editar `matching-constants.ts`. Lo que creas que debe aplicarse va al CSV; lo aplica
   el orquestador. Si te parece que algo es urgente, ponelo en el `.md` de resumen — no lo apliques.
2. **`offerId` en cada fila.** Un título sin offerId no es verificable y se descarta sin leerlo.
3. **Medí contra la BD, no contra tu informe ni contra este documento.** Los números de abajo los
   medí hoy y podés reproducirlos con los comandos que van al lado de cada uno. Si te da distinto,
   el que manda es tu medición — pero decilo en el resumen.
4. **Lo mecánico va a un script** dry-run en `scripts/` (o en `scratch/`, que está gitignorado),
   no a un juicio caso por caso. Si estás por revisar 200 filas a ojo para comprobar algo que es
   una consulta, escribí la consulta.
5. **Columna `sumaTienda` obligatoria** en toda propuesta de vínculo: `si` / `no` / `pierde`.

Y cinco más que salen de tus últimas cinco entregas (r57/r58). Ninguna es un reproche: cuatro de
las cinco tareas salieron bien y con volumen real. Estos son los modos de fallo que quedaron:

6. **Un producto nuevo exige ofertas de ≥2 tiendas DISTINTAS.** En r58 propusiste "Yocan Blade"
   como producto nuevo con `sumaTienda=si` sobre 5 ofertas que eran **todas de Friendly Grow**.
   Un producto de una sola tienda es invisible en el sitio (el home exige `storeCount>1`) y es
   exactamente lo que provocó la reversión de r55. **Contá las tiendas distintas, no las ofertas.**
7. **Un ratio de precio bueno no descarta un mislink de tipo.** Propusiste `of13676`+`of69003`
   con ratio 1,07: uno es SKU `SHI-PAC114`, un **papelillo**, y el otro un **cono**. El precio
   parecido escondía el error. Cuando el ratio te dé bien, mirá igual **qué clase de artículo es**.
8. **Antes de mover una oferta, mirá dónde cuelga HOY.** En 2 de los 6 mislinks de r52
   (`BLAB-DIF-14N`, `CLIPP-MDEGO`) las dos ofertas del par **ya estaban en el mismo producto** —
   que es lo contrario de un mislink — y la propuesta habría creado dos mislinks nuevos.
9. **Antes de escribir "sin par", barré TODA la marca.** Declaraste que `of69173` no tenía par y
   sí lo tenía (`of75352`). Un "cero resultados" es la afirmación más fácil de falsear con un
   filtro estricto: si vas a entregar un cero, entregá también **cómo lo buscaste**, para que se
   pueda re-medir. (Tu cero de la Tarea D de r58 era correcto y lo verifiqué; se supo porque
   describiste el método.)
10. **El CSV lleva datos, una fila por dato; el análisis va en un `.md` aparte.** En r58 pusiste
    párrafos dentro de la columna `offerId`.

**Qué está bloqueado y qué no:** nada de este encargo depende de mí. Las tres tareas son
paralelas entre sí y podés empezar por la que quieras. No esperes resultados de nadie.

---

## 1. Qué es esta ronda

La r55 original ("cobertura Fumetas/Astro") **nunca se trabajó**: lo que se aplicó bajo ese
nombre el 28 jul fue el incidente que se revirtió entero. Su brief se perdió porque `plans/` no
estaba trackeado antes de r58. **Este documento lo reemplaza y la ronda pasa a llamarse r59.**

**Corrección importante, y va contra lo que yo mismo tenía anotado:** mis notas decían que había
que regenerar el universo porque "las 350 ofertas liberadas y las 31 desvinculadas volvieron al
pozo". **Lo regeneré hoy y no es así:** de las 779 filas nuevas, **773 son las mismas ofertas que
tenía el CSV viejo**, 8 salieron (se resolvieron o perdieron stock) y solo **6 son material
fresco**. El universo estaba prácticamente intacto. Aun así usá el CSV nuevo: el viejo trae
candidatos calculados contra un catálogo de hace días.

También arreglé el script: **`diagnose-brand-coverage-gap.ts` no filtraba por alcance**. Ahora
llama a `classifyProduct` como el resto de los diagnósticos y descarta 99 huérfanas fuera de
alcance (vapes de sabores, pod kits de e-líquido). Ese filtro es la única fuente de verdad del
alcance: **`Offer.category` se queda stale** cuando una oferta sale de alcance, así que no filtres
nunca por esa columna.

---

## 2. El universo, medido hoy

**Insumo principal:** `reports/r59-cobertura-fumetas-astro.csv` — **779 filas**. Cada fila es una
huérfana **con stock**, **dentro de alcance**, **con `brandKey`**, de Fumetas o Astro, cuya marca
tiene al menos un producto curado **al que le falta esa tienda**. Es decir: un upgrade de
cobertura es posible ahí por definición.

Regeneralo cuando quieras (si te da menos filas, soy yo aplicando — no es un error tuyo; tus
veredictos van contra el CSV congelado que te llevaste):

```powershell
$env:GAP_STORES="fumetas,astrogrowshop"; $env:GAP_OUT="r59-cobertura-fumetas-astro.csv"; npx tsx scripts/diagnose-brand-coverage-gap.ts
```

Columnas: `offerId;tienda;brandKey;titulo;precio;categoria;productosSinEstaTienda;candidatos;lastSeenAt;url`.
En `candidatos` cada entrada viene ya medida: `P<id>:<modelSlug>(<n>t[C] sim=<jaccard> ratio=<precio/mediana>)`.
La `C` marca **congelado (≥4 tiendas)**.

Lo que dice el reparto, y es la clave de cómo está partido el encargo:

| | filas | qué son |
|---|---|---|
| **con al menos un candidato sobre sim≥0,30** | **98** | upgrade a un producto existente → **Tarea A** |
| sin ningún candidato sobre el umbral | 681 | el pozo de **productos nuevos** → **Tarea B** |

Por tienda: **Fumetas 525, Astro 254**. Solo **1 de las 98** toca un producto congelado.

Marcas con más material (filas en el CSV): calvo 159, bonglab 130, galaxy 49, raw 49, clipper 46,
the-bulldog 41, ozeta 30, lion-rolling-circus 29, airistech 26, zengaz 21, storz-bickel 20,
piecemaker 18, dime-bags 17, puffco 16.

---

## 3. TAREA A — Las 98 filas con candidato: ¿upgrade o mislink?

Son las 98 filas del CSV cuya columna `candidatos` **no** dice `(ninguno sobre el umbral)`. Bajo
volumen y alta densidad: acá es donde una hora rinde tiendas.

**El sesgo que tenés que compensar:** el candidato ya viene ordenado por similitud de título, y un
candidato mal ordenado **no es ruido neutro, ancla el juicio**. La similitud alta es una razón para
mirar, nunca una razón para vincular. Mirá estos cuatro casos reales del propio CSV, que son las
cuatro trampas del lote:

- **`of19862` "Bonglab Polera Prisma" $21.990 → P10108 `prisma` (sim 0,67, ratio 1,28).** Es una
  **polera**. El destino es un bong. Y `of37077` "Pins BongLab - Pin Prisma" es un **pin**. Misma
  marca, mismo modelo en el nombre, artículo distinto: **NO-VINCULAR**. Este es el fallo nº 7 de
  arriba en su forma más pura — el ratio 1,28 no salva nada.
- **`of2525` "Papelillos Classic King Size Slim 50 Ud" $49.990 → P5418 (4tC, ratio 40,15).** Es la
  **caja display de 50 librillos** contra el librillo suelto. Pack ≠ unidad. Además el destino es
  **congelado**: aunque fuera el mismo artículo, tocarlo exige OK explícito del usuario. Es la
  única fila del lote que toca un congelado.
- **Dime Bags, `of23561` / `of32289` / `of32290` / `of78257` → P10491 `the-boss-20cm`.** Cuatro
  ofertas de Astro (Negro/Verde/Rojo/RED) que son **la misma ficha con variantes de color**. Aquí
  vive la **trampa agregado-vs-individual**: si evaluás una por una contra el estado actual, cada
  una "ve" a sus hermanas y te da un falso "esa tienda ya estaba". Y si las evaluás contra el
  estado previo, cada una dice "suma Astro" — pero **el lote entero suma UNA tienda, no cuatro**.
  En el CSV: la primera va `sumaTienda=si`, las otras tres `sumaTienda=no (misma ficha)`. Son
  igual de aplicables (limpian huérfanas), pero no son cobertura. Y ojo: `of78257` "RED" y
  `of32290` "Rojo" huelen a duplicado de la misma variante — decilo si lo confirmás.
- **`of20226` "Juego de Mallas Finas Solid Valve" → P10372 `solid-valve-mallas-normales`
  (sim 0,70).** Mallas **finas** contra mallas **normales**. Es el rechazo canónico del catálogo
  (r36). Formato/talla nunca fusiona; el color sí.

**Antes de proponer un `VINCULAR`, comprobá las tres cosas que definen la fase:**

1. **¿El destino ya tiene esa tienda?** No debería (el script solo lista productos a los que les
   falta), pero re-medilo: el catálogo se mueve.
2. **¿El destino tiene ≥4 tiendas?** Entonces está **congelado**: solo puede *recibir* la oferta
   de una tienda que le falta ("solo sumar"), nunca perder ni cambiar una existente, y este caso
   necesita OK del usuario caso por caso. Va en bloque aparte.
3. **¿La URL base ya desempata?** Si la tienda de la huérfana **ya vende el producto destino en
   otra URL base**, son dos modelos y no hace falta foto:
   ```powershell
   $env:EV_PAIRS="19862:10108,2525:5418"; npx tsx scripts/diagnose-identity-evidence.ts
   ```
   Devuelve `MISMA-FICHA` / `SKU-COMPARTIDO` / `OTRA-FICHA-MISMA-TIENDA` / `TIENDA-AUSENTE`.
   **`OTRA-FICHA-MISMA-TIENDA` es NO-VINCULAR** salvo que puedas mostrar lo contrario. Corré esto
   sobre las 98 de una vez: es el filtro más barato que tenés y en r58 cerró 21 casos sin foto.
   Un SKU/EAN compartido **entre tiendas distintas** es identidad dura y cierra el caso a favor.

**Entregable A** → `reports/r59-tarea-a-veredictos.csv`, separador `;`:

```
offerId;tienda;brandKey;productIdDestino;slugDestino;tiendasDestino;congelado;senalIdentidad;ratioPrecio;sumaTienda;veredicto;motivo
```

- `veredicto`: `VINCULAR` | `NO-VINCULAR` | `PRODUCTO-NUEVO-CANDIDATO` | `NECESITA-FOTO`
- `senalIdentidad`: lo que devolvió `diagnose-identity-evidence`, o `sku:<valor>` / `ean:<valor>`
  si encontraste identidad dura, o `titulo` si es lo único que tenés.
- `congelado`: `si`/`no` **medido hoy**, no copiado del CSV de entrada.
- `sumaTienda`: **recalculada por vos**, contra el estado previo y midiendo el lote completo
  (ver la trampa Dime Bags). No la copies de ningún lado.
- `NECESITA-FOTO` solo si la URL y el SKU no alcanzan, y **con la pregunta concreta que la imagen
  tiene que responder** ("¿la cámara de la Fenix Pro trae el tubo de 4 cápsulas o no?"). La foto la
  miro yo; es la parte cara.
- Los que tocan congelados y los que hacen perder tienda: **bloque aparte al final del CSV**, no
  mezclados. No se aplican con el resto.

**Calibración esperada:** el histórico del catálogo rechaza ~70% en matching cross-tienda por
texto. Una tasa de aceptación del 90% en este lote sería una alarma, no una eficiencia — este
lote **no** viene pre-filtrado por señal dura, viene por similitud de título, que es la señal
débil. Si aun así te da alto y podés sostenerlo, sostenelo con datos y lo verifico.

---

## 4. TAREA B — Las 681 sin candidato: el pozo de productos nuevos

Estas 681 huérfanas tienen marca conocida pero **ningún producto curado de su marca se les
parece**. Eso no las hace basura: las hace **materia prima de productos nuevos**. La pregunta
cambia de "¿a qué producto va?" a "**¿tiene par en otra tienda?**".

**Ya te dejé medido el cruce.** Corrí el diagnóstico de pares huérfano-huérfano sobre las 6
tiendas con similitud alta:

```powershell
$env:PAIR_MIN_SIM="0.55"; $env:PAIR_MAX_SIM="1.01"; npx tsx scripts/diagnose-orphan-pairs.ts
```

→ **649 pares candidatos** sobre 6.939 huérfanas (778 descartadas por alcance), en
`reports/catalog-audit/orphan-pairs-0.55-1.01.csv`. El script ya filtra por alcance, exige tiendas
distintas, exige misma categoría y misma `brandKey` cuando ambas la tienen, y descarta ratio >3.

**De esos 649, exactamente 71 tocan una oferta del universo de la Tarea A.** Ese es tu lote de
arranque: mismo brandKey, similitud ≥0,55, dos tiendas distintas, y ya sabemos que la marca tiene
huecos de cobertura. Marcas de esos 71: bonglab 25, galaxy 12, puffco 6, calvo 6, raw 5, sploofy 3,
ocb 3, ozeta 3, yocan 2, storz-bickel 2, soulblime 2, dynavap 1, focus-v 1.

**Después de los 71, seguí por marca.** Estas son las marcas donde hay huérfanas **en las dos
tiendas a la vez**, que es la condición para que salga un producto de 2 tiendas sin salir del
universo (los números son huérfanas sin candidato; la última columna es cuántos productos curados
ya existen de esa marca, para que no dupliques):

| marca | huérfanas Fumetas | huérfanas Astro | productos curados ya existentes |
|---|---|---|---|
| bonglab | 63 | 60 | 112 (4×1t, 41×2t, 37×3t, 30×4t+) |
| galaxy | 22 | 22 | 16 (7×2t, 5×3t, 4×4t+) |
| calvo | 125 | 13 | 44 (21×2t, 16×3t, 7×4t+) |
| clipper | 38 | 8 | 34 (25×2t, 8×3t, 1×4t+) |
| ozeta | 10 | 13 | 44 (5×1t, 10×2t, 12×3t, 17×4t+) |
| airistech | 8 | 18 | 8 (4×2t, 3×3t, 1×4t+) |
| raw | 40 | — | 54 (19×2t, 24×3t, 11×4t+) |
| the-bulldog | 37 | — | 8 (5×2t, 3×3t) |
| lion-rolling-circus | 24 | — | 22 (12×2t, 6×3t, 4×4t+) |
| zengaz | 21 | — | 4 (2×2t, 1×3t, 1×4t+) |
| piecemaker | — | 17 | 9 (5×2t, 4×3t) |
| kush-hemp | 14 | — | 1 (1×2t) |

Las marcas con huérfanas en una sola de las dos tiendas (raw, the-bulldog, zengaz, kush-hemp,
piecemaker…) **no están perdidas**: su par puede estar en Piranha, GrowBarato, Kushbreak o Friendly
Grow, y el CSV de `orphan-pairs` cubre las 6 tiendas. `the-bulldog` con 37 huérfanas y 8 productos,
y `zengaz` con 21 y 4, son las dos marcas peor cubiertas de la tabla: ahí es donde esperaría
encontrar productos nuevos de verdad.

**Reglas duras de esta tarea:**

- **≥2 tiendas DISTINTAS o no es un producto.** (Regla 6 de arriba. Es la que más veces se saltó.)
- **Barré toda la marca antes de escribir "sin par"** (regla 9).
- **Talla y edición nunca fusionan; el color sí.** 55mm ≠ 63mm, King Size ≠ 1 1/4, Wu-Tang ≠ Tyga.
  Pero "color a elección" y variantes de color del mismo modelo van juntas.
- **Genéricos sin marca no tienen identidad.** "Bong de Pyrex Mini Beaker" no es un Bonglab por
  parecerse a uno. Si el título no nombra un modelo, no es un producto curable: dejalo huérfano.
  Con calvo y bonglab (que son vidrio con muchísimos modelos) esto va a pasar seguido.
- **`modelSlug` no puede repetir la marca ni la palabra de la categoría.** Bien: `prisma-14mm`.
  Mal: `bonglab-bong-prisma`. Solo minúsculas, números y guiones — **sin espacios ni puntos**
  (92 slugs inválidos fueron parte de lo que se revirtió en el incidente de r55).
- **Un producto sin stock en ninguna tienda sigue siendo válido** (precedente: P10992 Herbva 5G),
  pero marcalo: los que tienen stock valen más y se aplican primero.

**Entregable B** → `reports/r59-tarea-b-productos-nuevos.csv`, separador `;`:

```
offerIds;tiendas;nTiendasDistintas;marca;nombrePropuesto;brandKey;modelSlugPropuesto;categoria;algunaConStock;ratioPrecio;evidencia;confianza
```

- `offerIds`: separados por `|`. `tiendas`: los slugs, separados por `|`.
- `nTiendasDistintas`: contalo. Si da 1, la fila no va.
- `evidencia`: sku/ean compartido, misma foto (URL del archivo si el nombre coincide), o el texto
  exacto que lo sostiene. "Se parecen" no es evidencia.
- `confianza`: `alta` / `media` / `NECESITA-FOTO` (con la pregunta concreta, igual que en A).

---

## 5. TAREA C — El resto de los pares huérfano-huérfano (opcional, al final)

Los otros **578 pares** del CSV de `orphan-pairs` no tocan el universo de cobertura. Valen menos y
tienen un riesgo concreto: **una parte ya se revisó y se rechazó en r41**, que consumió la señal
huérfana-huérfana de los logs del 17 jul. No tengo la lista de rechazos de r41 en forma
consultable, así que no puedo pre-filtrarlos por vos.

Por eso: **hacela solo si terminaste A y B**, y priorizá por par de tiendas. El reparto es
Astro↔Fumetas 307, Fumetas↔Kushbreak 132, Astro↔Piranha 75, Astro↔Kushbreak 63, Fumetas↔Piranha 25,
Fumetas↔GB 15, Astro↔GB 12, y colas menores. **213 de los 649 no tienen marca en ninguno de los
dos lados** — esos son casi todos vidrio genérico y esperaría que rindan cero; empezá por los que
sí tienen `brandKey`.

Mismo entregable que B, en `reports/r59-tarea-c-productos-nuevos.csv`.

---

## 6. Trampas que ya nos mordieron (todas con caso real)

- **Agregado vs individual.** Medir oferta por oferta contra el estado actual da un falso "esa
  tienda ya estaba" cuando todas las ofertas de esa tienda vienen del mismo lote. Y auditar una
  oferta **ya vinculada** la compara **consigo misma**. Excluí siempre la propia oferta y medí el
  efecto del lote completo. Costó 57 vínculos inútiles en la Fase 3 de r54.
- **La URL desempata antes que la foto.** En r58 esto cerró 21 de 29 casos sin abrir una imagen.
  Un grupo "mixto" casi nunca pide foto: pide comparar las URL base.
- **Emparejar por FUNCIÓN en vez de por MODELO.** "Yocan Blade"→`dirk-hot-knife`,
  "Ziva Pro"→`kodo-pro`, "Vane"→`vane-2`: todos hacen lo mismo y el precio calza, y todos son SKUs
  distintos. **Si el título nombra un modelo y el destino nombra otro, es NO-VINCULAR aunque
  coincida todo lo demás.**
- **Ratio > 1,40 no es rechazo automático, pero exige evidencia extra.** En r57 el Lady Hornet
  tenía 1,65 y era correcto (se cerró por foto). Ratio < 0,55 o > 1,8 sin explicación es rechazo.
- **Un mismo SKU repetido dentro de UNA tienda** significa que esas dos ofertas pertenecen al
  mismo producto — es lo contrario de un mislink. Compartido **entre** tiendas es identidad dura.

---

## 7. Qué NO hacer

- No crear productos, no vincular, no editar `matching-constants.ts` (proponé marcas nuevas en el
  `.md`, no las escribas).
- No correr scrapes. No tocar `reports/r58-*` ni `scripts/link-r5*-reviewed.ts`.
- **No volver al pozo de Friendly Grow.** Cerrado el 28 jul con **cinco métodos independientes**
  (conteo por brandKey, barrido de títulos, su propio buscador, barrido por imagen nivel 5 con
  umbrales laxos → dHash d≤60 en CERO, y enumeración del catálogo de Piranha). A 26 de los 27
  productos de 5 tiendas les falta exactamente FG y FG no vende esas marcas.
- **No re-barrer las marcas FG sin par**: honeypuff, phoenix-star, baked-bunny, brass-knuckles,
  gorilla, doteco. Ya está medido: ~277 ofertas que no pueden dar upgrades.
- No propongas productos de una sola tienda. (Sí, es la regla 6 otra vez.)

---

## 8. Entregables, resumidos

| archivo | qué |
|---|---|
| `reports/r59-tarea-a-veredictos.csv` | las 98 con candidato, con veredicto y `sumaTienda` recalculada |
| `reports/r59-tarea-b-productos-nuevos.csv` | productos nuevos desde las 681 + los 71 pares cruzados |
| `reports/r59-tarea-c-productos-nuevos.csv` | opcional, el resto de los pares huérfano-huérfano |
| `plans/r59-informe-ejecutor.md` | tu análisis en prosa: método, conteos, dudas, y **cómo buscaste** lo que dio cero |

En el informe quiero explícito: cuántas filas miraste, cuántas aceptaste, **tu tasa de aceptación
por tarea**, y qué método usaste para cada "no encontré nada". Los números del informe tienen que
salir de tus propios CSV: en r54 el CSV estaba bien en las 176 filas y el resumen decía "17
congelados" cuando eran 3.
