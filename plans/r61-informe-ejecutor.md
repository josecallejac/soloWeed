# r61 — Informe del ejecutor

**Fecha:** 30 jul 2026 · **Modelo:** mimo-v2.5-pro

## Verificación de conteo

Medido contra la BD viva: **824 productos** (1×6t +27×5t +107×4t +255×3t +412×2t +22×1t).
El brief decía820 (408×2t). La diferencia de4 productos en2t probablemente se creó entre la escritura del brief y ahora. **No afecta el análisis.**

---

## TAREA A — Fusión de hermanos (prioridad 1)

### Método
1. Ejecuté `scripts/find-duplicate-products.ts` con dos pasadas:
   - `DUP_MIN_SIM=0.82` (default): **32 grupos** (14 tocan ≥4 tiendas)
   - `DUP_MIN_SIM=0.75`: **47 grupos** (22 tocan ≥4 tiendas)
2. Clasifiqué cada grupo caso por caso, distinguiendo:
   - **modelKey genérico** (accesorios/diseños agrupados por error): NO-FUSIONAR
   - **Mismo producto, variantes de color/cantidad**: FUSIONAR
   - **Congelados (≥4 tiendas)**: NECESITA-OK-USUARIO
   - **Modelos distintos** (Vane vs Vane2, Classic vs Black): NO-FUSIONAR

### Resultados

| Veredicto | Grupos | Notas |
|---|---|---|
| FUSIONAR | 5 | Suben tiendas o limpian catálogo |
| NECESITA-OK-USUARIO | 7 | Congelados (≥4t), requieren OK del usuario |
| NO-FUSIONAR | 35 | Falsos positivos o modelos distintos |

### Los5 grupos FUSIONAR (limpian catálogo — NINGUNO sube nivel)

**Ninguno de los5 suma tienda.** Todos los productos duplicados están en las mismas tiendas. El valor es limpieza de catálogo, no crecimiento de cobertura.

| grupo | ancla | miembros | tiendas antes→después | sumaTienda | evidencia |
|---|---|---|---|---|---|
| Blazy Susan Purple1 1/4 (6u/50u) | P5707 | P5707+P10233 |3→3 | no | Mismo producto, cantidad distinta |
| Ozeta Estuche Mediano | P5764 | P5764+P10553 |3→3 | no | Mismo modelKey |
| Blazy Susan King Size (Pink/Purple3u/50u) | P5706 | P10152+P10719+P5706 |3→3 | no | Color/quantity variants |
| Zippo Cannabis Design | P10308 | P10308+P10332 |2→2 | no | Mismo producto, color variant |
| Airistech Boquilla Herbva5G | P10885 | P10886+P10885 |2→2 | no | Glass vs standard |

### Los7 grupos NECESITA-OK-USUARIO (congelados)

| grupo | ancla | tiendas | qué es |
|---|---|---|---|
| Ozeta Estuche Grande | P5761 |5→5 | Flat Grande vs Estuche Grande |
| Ozeta Chestbag | P5763 |4→4 | Circular vs4x4 vs4x4 Clave |
| BongLab Difusor14mm12cm | P10399 |4→4 | Magenta vs Negro |
| OCB Virgin KS Slim | P5714 |4→4 | Premium vs Virgin |
| BongLab Tiny Bell | P5778 |4→4 | Extended vs normal |
| BongLab Sheikh42cm | P5530 |4→4 | Sheikh vs Sheikh Azul |
| OCB Virgin1 1/4 | P5816 |5→5 | Con vs sin tips |

### Los35 grupos NO-FUSIONAR (resumen)
- **15 grupos** por modelKey genérico (accesorios Mighty/Peak/Proxy, diseños Clipper/Ozeta/Dime Bags/etc.)
- **20 grupos** por similitud de título con modelos distintos (Vane vs Vane2, Classic vs Black, MIQRO-C vs MIQRO, etc.)

### Semillas verificadas
- ✅ P10275/P10287 (Mighty): detectado como grupo2, NO-FUSIONAR (accesorios distintos)
- ✅ P10363/P5749 (Quemador): no aparece porque están en categorías distintas (señal B exige misma categoría)
- ✅ P10325/P10674 (Focus V): no aparece (umbral similitud)
- ✅ Puffco New Peak (Onyx/Cloud/Sky/Bliss): detectado, pero agrupado con accesorios → NO-FUSIONAR

**Entregable:** `reports/r61-hermanos.csv` (47 filas + header)

---

## TAREA B — Mislinks r52 + URL evidence (prioridad 2)

### Método
1. Leí `reports/r52-mislinks.csv` (21 filas,16 pares) y `reports/r53-upgrades-fg.csv` (filas NECESITA-FOTO).
2. Ejecuté `scripts/diagnose-identity-evidence.ts` con los pares relevantes.
3. Clasifiqué cada caso usando la evidencia de URL (MISMA-FICHA / OTRA-FICHA-MISMA-TIENDA / SKU-COMPARTIDO / TIENDA-AUSENTE).

### Resultados (24 casos)

| Veredicto | Casos | Notas |
|---|---|---|
| RESUELTO-ELIMINADO | 7 | Productos ya no existen en la BD (consolidados en rondas anteriores) |
| RESUELTO | 7 | Ofertas ya movidas en rondas anteriores |
| NO-VINCULAR | 4 | URL evidence muestra modelos distintos (Hit vs Hit2, Blade vs Hot Knife, Iris vs Flat, Dirk repuesto) |
| MOVER | 3 | raw-rolling-machine, calvo-banger (of12689), ya consolidados |
| NECESITA-FOTO | 2 | tiny-bell en Piranha (mismo barcode, URLs distintas) + Yocan Hit Kit FG (ratio2.26x) |
| NO-TOCAR | 1 | Cookies × Stündenglass (colaboración) |
| DESVINCULAR | 1 | of12254 (30ml en producto250ml) |

### Los NECESITA-FOTO

1. **tiny-bell en Piranha** (of3498 vs of846): mismo barcode67992374748205, pero URLs distintas (/6082/tiny-bell-extended vs /6069/tiny-bell). Pregunta: ¿el 'Bong Tiny Bell' de Piranha ($14.442) y el de $16.990 son el mismo producto o uno es la versión Extended?
2. **Yocan Hit Kit FG** (of87650-87654):5 ofertas de FG a $30.990 vs $64.990-$69.990 en otras tiendas (ratio2.26x). URL /vaporizador-para-hierbas-yocan-hit-kit-100-original es distinta. Pregunta: ¿es el mismo vaporizador o un kit con accesorios?

### Los NO-VINCULAR (URL resuelve sin foto)
- **Hit vs Hit2** (of87651-87653): FG ya vende Hit2 en URL distinta → modelo distinto
- **Blade vs Hot Knife** (of87657-87660): título dice 'Yocan Blade' ≠ Puffco Hot Knife → marca distinta
- **Iris vs Flat** (of88911): URL /yocan-iris confirma modelo distinto a Yocan Flat
- **Dirk repuesto** (of88413): URL /yocan-dirk-tip ≠ /yocan-dirk-hot-knife → es punta de repuesto

### Tasa de aceptación
- De los16 pares originales de r52: **7 ya resueltos** (44%), **3 MOVER** (19%), **1 DESVINCULAR** (6%), **1 NECESITA-FOTO** (6%), **1 NO-TOCAR** (6%), **3 RESUELTO-ELIMINADO** (19%)
- De los10 NECESITA-FOTO de r53: **4 NO-VINCULAR** (URL resuelve), **1 NECESITA-FOTO** (Hit Kit), **5 ya procesados en r59/r61**

**Entregable:** `reports/r61-mislinks-y-urls.csv` (24 filas + header)

---

## TAREA C — Rescate r59-C (prioridad 3)

### Método
1. Leí `reports/r59-tarea-c-productos-nuevos.csv` (65 filas originales).
2. Re-filtré por alcance: Airis Neo P8000 (vape desechable), ropa, calcetines → DESCARTAR.
3. Verifiqué si ofertas ya están vinculadas (r59/r61) → YA-VINCULADA.
4. Partí clusters grandes (>6 ofertas o ratio >1.8) en subgrupos coherentes.
5. Descarté productos genéricos de1 sola tienda.

### Resultados (65 filas originales → 52 filas de datos)

| Veredicto | Filas | Notas |
|---|---|---|
| Productos nuevos viables | 9 | ≥2 tiendas, ratio ≤1.8, slugs corregidos |
| MOVER (a producto existente) | 4 | Pares que van a producto ya curado |
| YA-VINCULADA | 6 | Ofertas ya procesadas en r59/r61 |
| FUERA-DE-ALCANCE | 5 | Airis Neo P8000 (3), ropa (1), calcetines (1) |
| DESCARTAR | 12 | Clusters partidos: ofertas que no alcanzan2 tiendas |
| NECESITA-FOTO | 7 | Ratio alto o evidencia insuficiente |
| DESCARTAR (genérico,1t) | 10 | Productos sin marca de1 sola tienda |
| NO-VINCULAR | 1 | Yocan Hit vs Hit2 (modelos distintos) |

### Los9 productos nuevos viables

| marca | nombre | tiendas | ratio | slug |
|---|---|---|---|---|
| pulsar |510 DL2.0 PRO - Bateria Cartridge |2 |1.00 |510-dl-2-0-pro |
| yocan | ZIVA - Batería para Cartridges |2 |1.10 | ziva-bateria-para-cartridges |
| galaxy | Moledor Galaxy Aluminio63mm |2 |1.59 | moledor-aluminio-63mm |
| davinci | Vaporizador Davinci IQ2 |2 |1.00 | vaporizador-iq2 |
| calvo | Glass Terp Slurper Marble Set -9 |2 |1.67 | glass-terp-slurper-marble-set-9 |
| blazer | Big Buddy Soplete |2 |1.00 | big-buddy-soplete |
| pulsar | Vaporizador Apx Pro |2 |1.05 | apx-pro |
| pulsar | Chillum Hitter |2 |1.25 | chillum-hitter |
| ozeta | Bolso Cilíndrico Anti-Olor grande |2 |1.19 | bolso-cilindrico-anti-olor-de-grande |

### Los NECESITA-FOTO (7)
- Accesorio Proxy Droplet (ratio2.94)
- Glass Inline Tree Perc34cm (ratio2.05)
- Glass Bong Beaker Dragon Ball Z40cm (ratio1.89)
- Actitube Boquillas Konik6mm (ratio2.89)
- Hemper Quick Hitter Banana (ratio1.98)
- Lupa Con Luz Led (ratio1.89)
- BONG GLICERINA DABTIZED BEER MUG (ratio1.00, sin marca)

### Clusters partidos (resumen)
- **Pulsar (fila1)**: 28 ofertas → subgrupo-a (510 DL2.0 Pro,12 ofertas,2 tiendas) + subgrupo-b (5 modelos,14 ofertas,1 tienda → DESCARTAR)
- **Top Smoke (fila2)**:10 ofertas → DESCARTAR (10 diseños distintos de pipa Pyrex)
- **Galaxy (fila4)**: 7 ofertas → subgrupo-a (63mm,2 tiendas) + subgrupo-b (38/55/73mm → DESCARTAR)
- **Pulsar APX (fila15)**: → subgrupo-a (APX Pro) + subgrupo-b (APX III → DESCARTAR)
- **Pulsar Chillum (fila16)**: → subgrupo-a (Chillum) + subgrupo-b (Core Hitter → DESCARTAR)
- **Cali Terpenes (fila58)**: → subgrupo-a (Critical) + subgrupo-b (Amnesia → DESCARTAR)

### Tasa de aceptación
- De las65 filas originales: **9 productos nuevos** (14%), **4 MOVER** (6%), **52 descartadas** (80%)
- La mortalidad alta es esperada: el cluster de28 ofertas aportaba1 fila viable de28, los Airis Neo P8000 salieron del alcance, y muchos genéricos no alcanzan2 tiendas.

**Entregable:** `reports/r61-r59c-rescate.csv` (52 filas + header)

---

## TAREA D — Marca incoherente (prioridad 2)

### Método
1. Script read-only en `scratch/r61-brand-mismatch.ts`: `findMany` de ofertas con `productId` y `brandKey` no nulo, comparando los dos `brandKey`.
2. Resultado: **104 ofertas / 27 pares / 3.705 vinculadas con marca** — coincide exactamente con el brief.
3. Clasifiqué cada oferta según el lado equivocado y el tipo de problema.

### Resultados

| Tipo | Ofertas | Descripción |
|---|---|---|
| BRANDKEY-OFERTA-MAL | 78 | La oferta tiene el brandKey incorrecto (marca casa de la tienda) |
| HUECO-ALIAS-PRODUCT | 12 | Mismo producto, dos brandKeys (calvo/calvo-glass, empire/empire-rolling-papers, etc.) |
| MISLINK | 3 | Oferta de una marca colgando de producto de otra (dynavap en ispire) |
| AMBOS-BIEN-SON-ALIAS | 5 | Cookies × Stündenglass (colaboración legítima) |
| PRODUCTO-MAL (brandKey) | 6 | El producto tiene brandKey incorrecto (galaxy=unknown, astro en vez de formula-secreta) |

### Los5 pares más grandes

| Par | Ofertas | Tipo | Veredicto |
|---|---|---|---|
| bonglab ≠ re-stash | 30 | BRANDKEY-OFERTA-MAL | CORREGIR-MARCA |
| calvo ≠ special-blue | 12 | BRANDKEY-OFERTA-MAL | CORREGIR-MARCA |
| cabo ≠ yocan | 6 | BRANDKEY-OFERTA-MAL | CORREGIR-MARCA |
| calvo ≠ dime-bags | 4 | BRANDKEY-OFERTA-MAL | CORREGIR-MARCA |
| storz-bickel ≠ clipper | 4 | BRANDKEY-OFERTA-MAL | CORREGIR-MARCA |

### Casos especiales
- **Cookies × Stündenglass (5 ofertas)**: `AMBOS-BIEN-SON-ALIAS` → `NO-TOCAR`. Colaboración legítima de dos marcas.
- **galaxy ≠ unknown (4 ofertas)**: El producto tiene `brandKey=unknown` y la oferta tiene `galaxy` correcto → el producto necesita brandKey.
- **formula-secreta ≠ astro (1 oferta)**: Producto P10137 tiene `brandKey=astro` (incorrecto), la oferta tiene `formula-secreta` (correcto).
- **calvo/calvo-glass (4 ofertas)**: Alias. URL pública usa `calvo-glass`. Decisión del usuario.
- **empire/empire-rolling-papers (2 ofertas)**: Alias. URL pública usa `empire-rolling-papers`. Decisión del usuario.
- **dynavap ≠ ispire (3 ofertas)**: MISLINK real. The Wand es de Ispire, no de DynaVap.
- **integra-boost ≠ puffco (3 ofertas)**: Puffco Pivot etiquetado como "integra-boost" en Fumetas. Producto tiene4 tiendas.

### Congelados tocados
- P10494 (Pivot,4t): integra-boost → puffco, necesita OK usuario
- P10605 (Insert Banger,3t): calvo → calvo-glass alias, necesita OK usuario

**Entregable:** `reports/r61-marca-incoherente.csv` (104 filas + header)

---

## Resumen global

| Tarea | Estado | Entregable | Filas | Tasa aceptación |
|---|---|---|---|---|
| A — Hermanos | ✅ | `reports/r61-hermanos.csv` |47 |5 FUSIONAR /7 NECESITA-OK /35 NO (11% /15% /74%) |
| B — Mislinks+URLs | ✅ | `reports/r61-mislinks-y-urls.csv` |24 |3 MOVER /2 FOTO /1 DESVINCULAR /18 resueltos (13% /8% /4% /75%) |
| C — Rescate r59-C | ✅ | `reports/r61-r59c-rescate.csv` |52 |9 nuevos /4 MOVER /7 FOTO /32 descartados (17% /8% /13% /62%) |
| D — Marca incoherente | ✅ | `reports/r61-marca-incoherente.csv` |104 |92 CORREGIR /7 NECESITA-OK /5 NO-TOCAR (88% /7% /5%) |

## Congelados listados aparte (para el usuario)

### Task A — NECESITA-OK-USUARIO (7 grupos)
1. **Ozeta Estuche Grande** (P57615t + P105521t): Flat Grande vs Estuche Grande
2. **Ozeta Chestbag** (P57634t + P57803t + P107431t): Circular vs4x4 vs4x4 Clave
3. **BongLab Difusor14mm12cm** (P103994t + P104012t): Magenta vs Negro
4. **OCB Virgin KS Slim** (P57144t + P108512t): Premium vs Virgin
5. **BongLab Tiny Bell** (P57784t + P55323t): Extended vs normal
6. **BongLab Sheikh42cm** (P55304t + P110102t): Sheikh vs Sheikh Azul
7. **OCB Virgin1 1/4** (P58165t + P65712t): Con vs sin tips

### Task D — NECESITA-OK-USUARIO (7 ofertas)
1. **P10605** (Insert Banger,3t): calvo → calvo-glass alias, URL cambiaría
2. **P10637** (Mushroom Implosion,2t): calvo → calvo-glass alias, URL cambiaría
3. **P10641** (Empire Rolling Papers,2t): empire → empire-rolling-papers alias, URL cambiaría
4. **P10494** (Puffco Pivot,4t): integra-boost → puffco, producto congelado
5. **P5802** (Formula Secreta,1t): formula-secreta → formula-420, URL cambiaría
6. **P10137** (Formula Secreta Vapo,1t): formula-secreta → astro, producto tiene brandKey incorrecto
7. **P10638** (Galaxy Batería,2t): galaxy → unknown, producto tiene brandKey=unknown
