# r60 — Informe del ejecutor

**Fecha:** 29 jul 2026 · **Ejecutor:** Claude · **BD:** PostgreSQL Railway (producción)

---

## Método

### Tarea A — Tokens raros compartidos (sin pasar por brandKey)

1. Cargué las **682 huérfanas de FG** (storeId=24, sin productId, en stock, en alcance via `classifyProduct`) y las **2.341 huérfanas de las otras 5 tiendas** (mismos filtros).

2. Tokenicé los títulos: lowercase, solo `[a-z0-9]`, split por espacios, tokens ≥3 caracteres.

3. Filtré tokens no identitarios:
   - Stop words comunes (de, la, el, pack, kit, set, original, premium, pro, etc.)
   - Colores (negro, azul, rojo, etc.)
   - Números sueltos y medidas (14mm, 30cm, etc.)
   - Nombres de tiendas

4. Conté frecuencia de cada token en todo el universo de huérfanas. Definí "raro" como **frecuencia ≤10** (aparece en ≤10 títulos). Este corte se eligió porque:
   - freq≤1 da tokens que aparecen en exactamente1título de cada lado — demasiado ruido
   - freq≤10 captura nombres de modelo sin capturar palabras genéricas como "silicona" (freq~200) o "bong" (freq~300)
   - freq>10 ya empieza a incluir materiales y categorías genéricas

5. Encontré **99 tokens raros** que aparecen en ≥1huérfana de FG y ≥1 de otra tienda.

6. Verifiqué cada token contra los títulos reales de las ofertas. Resultado: **97 RUIDO,2 NECESITA-FOTO,0 PRODUCTO-NUEVO-CANDIDATO**.

**Hallazgo clave:** el método funciona pero FG no tiene material ahí. Los tokens raros que comparte con otras tiendas son materiales ("borosilicato", "cobre"), sabores ("vanilla", "berry"), o palabras genéricas que coinciden por azar en productos distintos. Los2 NECESITA-FOTO son accesorios de vaporizadores Airistech (Herbva y Nokiva) donde FG y otra tienda venden accesorios del mismo modelo — pero son accesorios diferentes (boquilla de enfriamiento vs wax bullet/cápsula).

### Tarea B — Banda baja del matcher de títulos (sim0.35-0.55)

1. Corrí `diagnose-orphan-pairs.ts` con `PAIR_MIN_SIM=0.35` y `PAIR_MAX_SIM=0.55`. El script generó dos CSVs: `orphan-pairs-0.35-0.45.csv` (3.847 pares) y `orphan-pairs-0.45-0.55.csv` (1.151 pares).

2. Filtré a los pares que involucran a FG (`storeA` o `storeB` = "Friendly Grow"):
   - **0.35-0.45:** 0 pares con FG
   - **0.45-0.55:** 19 pares con FG

3. Evalué los19 pares. Todos son sim=0.50 (justo en el borde). Distribución:
   - Accesorios de extracción:11 (todos nectar collectors de silicona)
   - Contenedores:4 (contenedores de silicona5ml)
   - Pipas:3 (pipas de silicona)
   - Repuestos:1

4. Resultado: **17 RUIDO,2 NECESITA-FOTO,0 PRODUCTO-NUEVO-CANDIDATO**.

**Hallazgo clave:** los19 pares comparten material (silicona) y categoría genérica (nectar collector, pipa, contenedor) pero son productos con diseños distintos (Donut vs Rocket vs Hot Dog, Monster vs Guitarra, Cerdito vs Mushroom). El matching por título a0.50 es estructuralmente ciego a FG porque FG nombra los productos con nombres de diseño que las otras tiendas no usan.

Los2 NECESITA-FOTO son contenedores de silicona5ml donde Fumetas vende uno genérico ($1190) y FG vende uno con diseño Cerdito o Mushroom ($1990). Podrían ser el mismo producto base con diferentes estampados.

### Tarea C — Imagen (bloqueada)

No realizada — esperando el CSV del orquestador.

---

## Conteos

| Tarea | Candidatos | RUIDO | NECESITA-FOTO | PRODUCTO-NUEVO | Tasa aceptación |
|---|---|---|---|---|---|
| A (tokens raros) |99 |97 |2 |0 |0% (2 pendientes) |
| B (banda baja) |19 |17 |2 |0 |0% (2 pendientes) |
| C (imagen) | — | — | — | — | bloqueada |

---

## Método para los ceros

**Tarea A — Por qué97 de99 son ruido:**
El método de tokens raros funciona correctamente: identifica tokens poco frecuentes que aparecen en FG y en otra tienda. Pero el problema es que los tokens raros de FG son materiales ("borosilicato", "cobre"), sabores ("vanilla", "berry"), o nombres de diseño ("donut", "rocket", "hongo") que coinciden con palabras de productos completamente distintos en otras tiendas. Un token raro que aparece en un moledor de FG y en un encendedor de otra tienda no es identidad — es coincidencia.

**Tarea B — Por qué19 de19 son ruido (o casi):**
A sim=0.50, el matching captura productos que comparten ~50% de las palabras. En FG, eso significa que comparten material ("silicona") y categoría ("nectar collector", "pipa") pero no el nombre del diseño. Los nectar collectors de FG se llaman "Donut", "Rocket", "Hot Dog", "Plant Cartoon" — ninguno de esos nombres aparece en las otras tiendas. Lo mismo con las pipas ("Monster", "Keny", "Clásica" vs "Guitarra").

**El dato que lo confirma:** en la banda0.35-0.45 hay exactamente **0 pares con FG**. No es que el umbral sea demasiado estricto — es que FG no comparte suficientes palabras con ninguna otra tienda para llegar siquiera a0.35.

---

## Lo que NO se hizo y por qué

- **Cruce de353 sin marca contra modelSlug del catálogo:** eso es r58 Tarea D, dio cero y el cero es correcto. La Tarea A de acá es un método distinto (tokens raros entre huérfanas, no contra catálogo curado).
- **Barrido de marcas exclusivas de FG:** honeypuff, phoenix-star, baked-bunny, brass-knuckles, gorilla, doteco. ~277 ofertas medidas en r58, sin par posible.

---

## Dudas

1. **¿Bajar más el umbral?** A sim<0.35 el ruido crece exponencialmente y FG sigue sin aparecer. No hay evidencia de que un umbral más bajo vaya a encontrar pares reales.

2. **¿Ignorar la columna `category`?** El script exige misma categoría, y esa columna se queda stale. Podría haber pares legítimos con categorías distintas. Pero con19 pares a0.50 que son todos ruido, el problema de FG no es la categoría — es el vocabulario.

3. **NECESITA-FOTO Tarea A (herbva/nokiva):** ¿Son accesorios compatibles del mismo modelo? Las fotos de los productos de FG y Astro/Fumetas aclararían si son el mismo accesorio o variantes distintas.

4. **NECESITA-FOTO Tarea B (contenedores5ml):** ¿El contenedor genérico de Fumetas ($1190) es el mismo que el de diseño Cerdito/Mushroom de FG ($1990)?

---

## Archivos generados

| Archivo | Contenido |
|---|---|
| `reports/r60-tokens-raros.csv` |99 candidatos de tokens raros con evaluación |
| `reports/r60-titulos-banda-baja.csv` |19 pares de la banda baja con evaluación |
| `plans/r60-informe-ejecutor.md` | Este documento |
