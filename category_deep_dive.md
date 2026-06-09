# Análisis Profundo por Categorías (Deep Dive)

Este documento registra los hallazgos de las revisiones manuales profundas sobre las ofertas "sueltas" (no vinculadas a productos curados). El objetivo es entender por qué el sistema de matching deja ofertas en 1 sola tienda y confirmar que no sean falsos negativos de productos de 2, 3 o 4 tiendas.

## Checklist de Monitoreo
- [x] Bongs
- [x] Papelillos
- [x] Moledores
- [x] Contenedores y estuches
- [x] Pipas
- [x] Repuestos para bongs y vaporizadores
- [x] Vaporizadores herbales
- [x] Accesorios de extraccion
- [x] Bandejas y ceniceros
- [x] Conos y blunts
- [x] Filtros y boquillas
- [x] Limpieza
- [x] Encendedores y sopletes
- [x] Otros parafernalia
- [x] Vaporizadores electrónicos

## 1. Categoría: Bongs
**Estado:** Excelente precisión de agrupación.
**Análisis:**
- Se revisaron las ofertas sueltas de la marca principal (Bonglab).
- **Hallazgo:** Las ofertas no vinculadas **no son** errores del matcher. Corresponden a modelos genuinamente distintos o variantes de color exclusivas que actualmente solo vende 1 tienda en todo el catálogo.
- **Ejemplos de exclusividades de 1 tienda:**
  - *Fumetas:* Modelos Kraken KC47, Moon K104.
  - *Astro Growshop:* Double Shot, Dream Rig X4.
  - *GrowBarato:* Octopus K99, K30, línea de glicerina (Glycerin Black Ice).
- **Acción:** Ninguna requerida. Las agrupaciones actuales de 2+ tiendas son correctas y sólidas.

## 2. Categoría: Papelillos
**Estado:** Muy buena precisión con alta concentración de marcas por tienda.
**Análisis:**
- Se consolidaron algunas agrupaciones faltantes manualmente (ej. RAW Black Connoisseur, Futurola x Mike Tyson), pero el gran volumen de ofertas sueltas obedece a decisiones comerciales de inventario de las tiendas.
- **Hallazgo:** Existen más de 60 ofertas sueltas porque las tiendas tienen marcas o líneas que trabajan de manera casi exclusiva.
- **Ejemplos de exclusividades de 1 tienda:**
  - *Gizeh:* Prácticamente todo su catálogo lo trabaja solo **Fumetas**.
  - *Lion Rolling Circus (línea Sabores):* Concentrado mayoritariamente en **Piranha**.
  - *GB The Green Brand:* Marca propia exclusiva de **GrowBarato**.
- **Acción:** Se asume como comportamiento normal del mercado local. No es necesario forzar agrupaciones.

## 3. Categoría: Moledores
**Estado:** Muy buena precisión, identificamos una variante suelta y confirmamos exclusividades.
**Análisis:**
- Al enfrentar los 10 productos de 2 tiendas contra 168 ofertas sueltas, identificamos que Clipper domina las ofertas sueltas (93) y no tiene productos en 2+ tiendas.
- **Hallazgo:** Descubrimos un producto curado faltante que había quedado separado por diferencias de nombre y lo creamos. El resto de ofertas sueltas de marcas como The Bulldog, Lion Rolling Circus o G-Rollz, corresponden a modelos o medidas específicas que no comparten tiendas.
- **Ejemplo de producto rescatado:** *Moledor Metálico Bulldog Swing Giratorio* (GrowBarato + Fumetas).

## 4. Categoría: Contenedores y Estuches
**Estado:** Precisión impecable. No existen falsos negativos.
**Análisis:**
- Revisamos las 46 ofertas sueltas contra los 11 productos curados de 2 tiendas (principalmente marcas Ozeta y RAW).
- **Hallazgo:** Ninguna de las ofertas sueltas es compatible con los productos existentes de 2 tiendas. Las ofertas no agrupadas son exclusividades absolutas de 1 tienda o bien duplicados dentro de la misma tienda (ej. Astro tiene 2 publicaciones distintas para su "Bolso 4x4 con clave", donde una ya forma parte del producto de 2 tiendas).
- **Acción:** Ninguna requerida. El agrupamiento es sólido.

## 5. Categoría: Pipas
**Estado:** Precisión impecable. Extrema exclusividad por tienda.
**Análisis:**
- Revisamos las 178 ofertas sueltas contra los 8 productos de 2 tiendas.
- **Hallazgo:** Ninguna oferta suelta corresponde a los productos de 2 tiendas. El gran volumen de ofertas sueltas (178) se explica por una exclusividad de marca-tienda asombrosa: **Astro Growshop tiene 74 pipas exclusivas de la marca Top Smoke** que no existen en ninguna otra tienda. Otras marcas como MJ Arsenal, Pulsar, Grav, y American Helix están diseminadas en modelos únicos por tienda.
- **Acción:** Ninguna requerida. Refleja fielmente el mercado de pipas (mucha variedad de diseños únicos, poco catálogo compartido).

## 6. Categoría: Repuestos para bongs y vaporizadores
**Estado:** Muy buena precisión. Disparidad en el formato de empaque.
**Análisis:**
- Revisamos 62 ofertas sueltas contra los 15 productos de 2 tiendas (Storz & Bickel, Bonglab, Calvo).
- **Hallazgo:** No hay matches cruzados válidos. Sin embargo, se identificó un comportamiento de inventario: tiendas como GrowBarato agrupan repuestos en publicaciones genéricas (ej. "Piezas Desgaste Mighty Storz & Bickel"), mientras que Astro o Fumetas venden la pieza específica ("Unidad De Enfriamiento", "Cápsulas Monodosis"). Además, repuestos de Bonglab son en su mayoría tamaños o formas exclusivas de cada tienda (Atrapacenizas Tree vs Triple Percolador).
- **Acción:** El sistema está haciendo lo correcto al no agrupar repuestos genéricos con piezas específicas. No se recomienda alterar las agrupaciones actuales.

## 7. Categoría: Vaporizadores herbales
**Estado:** Muy buena precisión, encontramos 1 producto rescatable.
**Análisis:**
- Al enfrentar los 6 vaporizadores de 2 tiendas contra las 13 ofertas sueltas, notamos que la inmensa mayoría de las ofertas sueltas son exclusividades muy marcadas (ej. Arizer Argo Black o Weecke Fenix Pro solo en Fumetas).
- **Hallazgo:** Identificamos que el **Vaporizador Dynavap M7 XL** estaba suelto porque GrowBarato lo tiene catalogado como "Vaporizador Dynavap M7 XL | Versión extendida" y Fumetas como "Dynavap Vaporizador Mecánico M7 XL". Lo agrupamos manualmente para crear un nuevo producto de 2 tiendas.
- **Acción:** Producto Dynavap M7 XL creado y vinculado exitosamente.

## 8. Categoría: Accesorios de extraccion
**Estado:** Precisión impecable. Fuerte especialización por tienda.
**Análisis:**
- Revisamos 38 ofertas sueltas contra los 7 productos de 2 tiendas.
- **Hallazgo:** Cero coincidencias cruzadas. En esta categoría, la exclusividad se da por **especialización de catálogo**. Por ejemplo, Fumetas tiene todo el surtido de bangers de cuarzo "Calvo Glass" con medidas y ángulos muy específicos (ej. *Flat Bucket 45° Macho 10mm*), mientras que GrowBarato vende "Inserts" y "Marble Sets" de la misma marca pero no compiten en el banger principal. Lo mismo sucede con Pulsar, donde Fumetas concentra toda la línea de Nectar Collectors ("Dab Straws").
- **Acción:** Ninguna requerida. El sistema agrupa correctamente los pocos accesorios genéricos compartidos y deja sueltos los ultra-especializados.

## 9. Categoría: Bandejas y ceniceros
**Estado:** Muy buena precisión, encontramos 1 producto rescatable y mejoramos otro.
**Análisis:**
- Revisamos las 41 ofertas sueltas contra los 5 productos de 2 tiendas.
- **Hallazgo:** Identificamos que el producto "Bandeja RAW metálica Girl" estaba correctamente agrupado, pero tenía una oferta de Piranha suelta por no especificar el tamaño en el título. Además, agrupamos las publicaciones de la "Bandeja RAW Metálica Classic Mediana" que estaban sueltas en 3 tiendas (Fumetas, Piranha, GrowBarato). El resto de ofertas sueltas corresponden a diseños únicos o a merchandising específico (ej. Ceniceros de vidrio).
- **Acción:** Se creó el producto de 3 tiendas para la Bandeja RAW Classic y se vinculó la oferta suelta de Piranha al producto RAW Girl.

## 10. Categoría: Conos y blunts
**Estado:** Excelente precisión en agrupamiento por cantidad/variante.
**Análisis:**
- Revisamos 46 ofertas sueltas contra los 11 productos de 2 tiendas (principalmente RAW y Blazy Susan).
- **Hallazgo:** Descubrimos que las ofertas sueltas representan estrictamente variaciones de *cantidad* por empaque. Por ejemplo, el sistema correctamente **no agrupó** los packs de 3u o 6u de Piranha con el frasco de 50u de Astro y Fumetas (Blazy Susan). En otras marcas como Soulblime y G-Rollz, cada tienda vende un conteo de unidades o color distinto (ej. 20u vs 6u, Pink vs Organic Green Hemp). Los conos de RAW sueltos son versiones gigantes de utilería (1,8 mts), cajas de 32 unidades o combos "Rawket".
- **Acción:** Ninguna requerida. Validamos que la regla de "priorizar tamaño/cantidad cuando distinguen el producto" está funcionando a la perfección.

## 11. Categoría: Filtros y boquillas
**Estado:** Precisión del 100%. Exclusividad de catálogo por tienda.
**Análisis:**
- Revisamos 44 ofertas sueltas contra los 3 productos de 2 tiendas.
- **Hallazgo:** No hubo ninguna coincidencia ni falso negativo. Al revisar las ofertas sueltas por marca, descubrimos que Gizeh domina con 17 ofertas (todas exclusivas de Fumetas) y Strabe Glass tiene 9 (exclusivas de otra tienda). Las ofertas de RAW o OCB que quedan sueltas son variantes muy de nicho (ej. pre-enrolados de ciertos milímetros que solo trae una tienda).
- **Acción:** Ninguna requerida.

## 12. Categoría: Limpieza
**Estado:** Categoría de nicho muy pequeña (OCULTA TEMPORALMENTE).
**Análisis:**
- **Hallazgo:** Esta categoría entera consta de solo 5 ofertas en toda la base de datos, y ninguna coincide con otra en una segunda tienda. 
- **Acción:** Como no tiene productos agrupados de más de 1 tienda, se decidió comentarla/ocultarla temporalmente de la aplicación. El sistema agrupará correctamente cuando una segunda tienda ingrese exactamente el mismo limpiador en esta categoría en el futuro.

## 13. Categoría: Encendedores y sopletes
**Estado:** Excelente precisión y respeto por las variantes de colección.
**Análisis:**
- Revisamos 35 ofertas sueltas contra los 4 productos de 2 tiendas (principalmente Clipper y Zippo).
- **Hallazgo:** Descubrimos que el sistema dejó sueltos encendedores Zippo como el "High Polish Green Chameleon", "High Polish Green Logo" y "High Polish Rose". Al compararlos con el producto curado "Zippo Classic High Polish Teal", confirmamos que el algoritmo obedeció la regla de oro: *No mezclar diseños/colores distintos de Zippo*. Dado que son artículos de colección, es perfecto que queden separados.
- **Acción:** Ninguna requerida. Funcionamiento impecable.

## 14. Categoría: Otros parafernalia
**Estado:** Precisión del 100%.
**Análisis:**
- Revisamos las 19 ofertas sueltas contra los 3 productos de 2 tiendas.
- **Hallazgo:** Cero coincidencias. Esta categoría de "cajón de sastre" contiene desde básculas hasta merch aleatoria (como poleras o jockeys) de marcas como RAW o Lion Rolling Circus. Ninguno se repite exactamente entre tiendas.
- **Acción:** Ninguna requerida.

## 15. Categoría: Vaporizadores electrónicos
**Estado:** Categoría en desarrollo (OCULTA TEMPORALMENTE).
**Análisis:**
- **Hallazgo:** Esta categoría contiene exactamente 4 productos y todos corresponden a artículos exclusivos de 1 sola tienda (como vaporizadores desechables Oxbar o Airis de Piranha). No existe ningún producto con stock compartido o agrupable.
- **Acción:** Dado que no aporta valor comparativo actualmente, se bloqueó por código para que no aparezca en el menú lateral de categorías hasta que existan agrupaciones de 2 o más tiendas.

---
**CONCLUSIÓN GENERAL DE LA AUDITORÍA:**
Tras auditar el 100% de las categorías, concluimos que **no existen problemas sistémicos de falsos negativos**. Las ofertas que están quedando en 1 sola tienda son exclusividades reales de catálogo o variantes únicas. La estrategia es sólida.
