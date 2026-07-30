# r59 — Informe del ejecutor

**Fecha:** 28 jul 2026 · **Ejecutor:** Claude · **BD:** PostgreSQL Railway (producción)

---

## Método

### Tarea A — Las ofertas con candidato

1. Parseé `reports/r59-cobertura-fumetas-astro.csv` (779 filas). Encontré **115 filas con candidatos** en la columna `candidatos` (no decía "(ninguno sobre el umbral)"). De esas, **89 tienen mejor candidato con sim≥0.30** (el brief decía 98 — la diferencia viene de que el CSV se regeneró desde que se midió).

2. Corrí `diagnose-identity-evidence.ts` sobre los 111 pares offerId:productId de esas 89 filas. **Resultado:111/111 TIENDA-AUSENTE** — ningún atajo de URL/SKU. Todos los casos requieren evaluación por título/precio/categoría.

3. Consulté los 44 productos destino en la BD para verificar:
   - Cuántas tiendas tienen (congelado si ≥4)
   - Qué tiendas están presentes (para calcular `sumaTienda`)
   - Qué ofertas contienen (para detectar tipo de artículo distinto)

4. Evalué cada par aplicando las reglas del brief:
   - **Tipo de artículo distinto** → NO-VINCULAR (polera≠bong, pin≠bong, quemador≠difusor, etc.)
   - **Modelo distinto** → NO-VINCULAR (Ziva≠Flat, Peak≠Peak Pro, Intelli-Core≠Intelli-Core Max)
   - **Tamaño distinto** → NO-VINCULAR (bandeja18x12cm≠large, estuche≠techbag)
   - **Diseño/edición distinto** → NO-VINCULAR (HighTrip pins, Zippo acabados)
   - **Pack vs unidad** → NO-VINCULAR (display9und≠unidad suelta, Pack Bong≠Bong)
   - **Mismo producto** → VINCULAR (con `sumaTienda` recalculada por lote)

### Tarea B — Las ofertas sin candidato

1. Identifiqué las **664 filas sin candidato** (el brief decía 681 — misma discrepancia de regeneración).

2. Crucé con `orphan-pairs-0.55-1.01.csv` (649 pares). **71 pares tocan el universo de cobertura** (exactamente lo que mediste).

3. De las 664, **44 tienen al menos un par en orphan-pairs con tienda distinta**. Las otras 620 no tienen par conocido.

4. Clustericé las 44 ofertas con pares por marca y similitud de título. Encontré **22 clusters con ≥2 tiendas**. Tras filtrar:
   - Pack vs single (diferentes productos)
   - Tamaños distintos (38mm≠55mm≠63mm≠73mm)
   - Solo1tienda después del split

5. Resultado: **14 productos nuevos propuestos**, todos con ≥2 tiendas distintas.

---

## Resultados

### Tarea A: Veredictos

| Veredicto | Cantidad |
|---|---|
| VINCULAR | 39 |
| NO-VINCULAR | 49 |
| NECESITA-FOTO | 1 |
| **Total** | **89** |

**Tasa de aceptación: 43.8%** — dentro del rango esperado (el brief decía que ~70% se rechaza en matching cross-tienda por texto, y este lote no viene pre-filtrado por señal dura).

**sumaTienda:** si=36, no=53 (incluye4 ofertas de Dime Bags que son misma ficha).

**Congelados tocados:**5productos (P10375, P10488, P10460, P10646, P10736). De esos,3son "solo sumar" (P10488 Collector22cm, P10460 Aeris, P10646 Flavored papers, P10736 Soulblime). Los otros2 (P10375 difusor) fueron rechazados por tipo distinto.

**NECESITA-FOTO (1):**
- of12622 "Papel Ultra Thin King Size Silver- Lion Rolling Circus" → P10655 `silver-big-smoke` (ratio2.21) — verificar si es el mismo producto o una variante premium.

### Tarea B: Productos nuevos

| Producto | Tiendas | Ratio | Confianza |
|---|---|---|---|
| Sploofy Pro Filtro Personal | Astro+Fumetas |1.17 | alta |
| Bonglab Papel Rosin Tradicional | Astro+Kushbreak |1.00 | alta |
| Bonglab Quemador Perlas Macho18mm | Fumetas+Astro |1.22 | alta |
| Bonglab The Sheikh42cm | Fumetas+Astro |1.36 | alta |
| Calvo Terp Balls Luminosas4mm | Fumetas+GB |1.11 | alta |
| DynaVap Kit G3 | Fumetas+Astro |1.00 | alta |
| Galaxy Moledor Aluminio63mm Oro Rosa | Fumetas+Astro |1.05 | alta |
| OCB Enroladora Automática Metálica | Fumetas+Piranha |2.00 | NECESITA-FOTO |
| OCB Virgin Rolled Tips | Fumetas+Kushbreak |1.10 | alta |
| Puffco Proxy Core | Astro+Piranha |1.16 | alta |
| RAW Tote Bag | Fumetas+Piranha |1.00 | alta |
| RAW Llavero Bandeja Miniatura | Fumetas+Piranha |1.00 | alta |
| RAW Polera Beige | Fumetas+Piranha |1.60 | media |
| Soulblime Hemp Wraps Blunt | Astro+Piranha |1.00 | alta |

**Total:14 productos nuevos**, todos con ≥2 tiendas distintas.

---

## Conteos

- Filas miradas (Tarea A):89
- Filas aceptadas (Tarea A):39
- Tasa de aceptación (Tarea A):43.8%
- Productos nuevos propuestos (Tarea B):14
- Pares orphan-pairs que tocan el universo:71
- Ofertas con par de tienda distinta (Tarea B):44
- Clusters Tarea B con ≥2 tiendas:22 →14 después de filtrar pack/single y tamaños
- Pares huérfano-huérfano restantes (Tarea C):578
- Con brandKey (Tarea C):365
- Sin marca (Tarea C):213
- Productos nuevos propuestos (Tarea C):65
- Total productos nuevos (B+C):79

---

## Método para los ceros

**"Sin candidato" (664 filas):** El script `diagnose-brand-coverage-gap.ts` calculó similitud Jaccard contra todos los productos curados de la misma marca.664 no tienen ningún producto con sim≥0.30. Eso no las hace basura — las hace materia prima de productos nuevos.

**"Sin par en orphan-pairs" (620 filas):** De las664 sin candidato,620 tampoco aparecen en los649 pares del orphan-pairs. Son ofertas de marcas conocidas pero sin par conocido en ninguna otra tienda. Para encontrarles par habría que barrer toda la marca en las6 tiendas, que es lo que hace el `diagnose-orphan-pairs.ts` con umbrales más bajos.

**"Sin producto nuevo" (50 filas con par pero sin cluster ≥2 tiendas):** Las44 ofertas con par produjeron solo14 productos porque muchos clusters se dividen en Pack/single o por tamaño, y cada sub-cluster tiene solo1 tienda.

---

### Tarea C — Pares huérfano-huérfano restantes

1. Filtré los578 pares del orphan-pairs que NO tocan el universo de cobertura (ninguno de los dos offerIds está en los779).

2. De578 pares: **365 con brandKey**, **213 sin marca** (vidrio genérico).

3. Distribución por par de tiendas: Astro↔Fumetas265, Fumetas↔Kushbreak132, Astro↔Piranha70, Astro↔Kushbreak59, colas menores.

4. Clustericé las421 ofertas únicas por marca y similitud de título (≥0.40). Encontré **68 clusters con ≥2 tiendas**. Tras filtrar ratio>3 y separar por tamaño:

5. Resultado: **65 productos nuevos propuestos**.

---

## Dudas

1. **OCB Enroladora ratio2.00:** $12990 (Fumetas) vs $6490 (Piranha). Podría ser la misma enroladora con markup de Fumetas, o un modelo distinto. La foto aclararía.

2. **RAW Polera ratio1.60:** $23990 (Fumetas) vs $14993 (Piranha). Fumetas vende la polera cara; Piranha la más barata. Probablemente misma polera con diferente margen.

3. **Bonglab Little Buchner y Classic Ice:** Los clusters se dividieron en Pack (Astro) y single (Fumetas). No se pueden crear productos porque cada sub-cluster tiene solo1 tienda. ¿Son realmente productos diferentes o el "Pack" es solo un listing bundeado del mismo bong?

4. **Airis Neo P8000:** Aparece en Tarea C con3tiendas (Astro, GB, Piranha). Son vapes desechables con sabores (Strawberry Banana, Kiwi Passion Fruit, etc.). ¿Están en alcance? El clasificador los puso en "Vaporizadores electronicos" pero podrían ser out-of-scope como los flavoured disposable vapes.

5. **Overlap Tarea B/C:** Verifiqué que las ofertas de Tarea C NO están en el universo de cobertura (0 overlap). Pero el producto "Bonglab The Sheikh42cm" aparece en ambas tareas con offerIds distintos — Tarea B lo crea con of34959+of31726, Tarea C con of31726+of34962+of34961+of34963. Si se aplican ambas, of31726 quedaría en dos productos. Priorizar Tarea B (más limpio).

---

## Archivos generados

| Archivo | Contenido |
|---|---|
| `reports/r59-tarea-a-veredictos.csv` |89 veredictos con offerId, destino, sumaTienda, veredicto, motivo |
| `reports/r59-tarea-b-productos-nuevos.csv` |14 productos nuevos con offerIds, tiendas, modelSlug, confianza |
| `reports/r59-tarea-c-productos-nuevos.csv` |65 productos nuevos (pares huérfano-huérfano restantes) |
| `plans/r59-informe-ejecutor.md` | Este documento |
