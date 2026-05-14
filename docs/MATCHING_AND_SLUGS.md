# Matching, Productos Y Slugs

## Conceptos

- `Offer`: oferta scrapeada desde una tienda.
- `Product`: producto curado con identidad clara.
- `Offer.productId`: asociacion opcional desde una oferta hacia un producto curado.
- El catalogo home agrupa ofertas comparables.
- El detalle de producto muestra la grilla de comparacion para un `Product`.

## Estado Aprobado

- Home/catalogo: mostrar solo comparables multi-tienda con `storeCount > 1`.
- Curacion normal: usar `CURATE_MIN_STORES=2`.
- Detalle: puede mostrar una sola oferta si existe un `Product` con esa oferta.
- No crear `Product` para ofertas sin identidad clara.

## Cuando Crear O Conservar Un Product

Crea o conserva un `Product` cuando exista identidad clara:

- misma marca
- mismo modelo o linea
- misma variante relevante
- mismo tamano cuando el tamano diferencia el producto
- misma presencia/ausencia de tips cuando aplique

No crees un `Product` solo porque dos titulos se parecen. Debe haber senales concretas de equivalencia.

## Reglas Por Categoria

### Papelillos

Priorizar:

- linea
- variante
- color cuando identifica el producto
- tamano
- tips/boquillas cuando son parte del comparable

Evitar:

- usar `papelillos` en `modelSlug`
- dejar el slug solo como un tamano generico
- conservar tamanos default ruidosos como `1-1-4` si existe una variante real mejor

Conservar tamanos distintivos como `king-size-slim` cuando sean necesarios para distinguir.

### Pipas

Priorizar:

- modelo
- forma
- material
- marca
- senales distintivas del producto

Evitar:

- colores aleatorios
- ruido comercial de tienda
- terminos demasiado genericos

### Moledores

Priorizar:

- marca
- linea/modelo
- material
- tamano
- numero de partes

Evitar:

- colores aleatorios
- ruido comercial
- nombres genericos que mezclen productos distintos

### Conos y blunts

Priorizar:

- marca real aunque falte `brandKey` scrapeado
- familia del producto: `pre-roll`, `wrap` o `gold-cone`
- linea o variante clara: `pink`, `purple`, `rose`, `tea-leaf`, `virgin`, `mike-tyson`, `platinum`, `shorty`
- tamano: `1-1-4`, `king-size`, `king-size-slim`, `53mm`, `109mm`, gramos cuando distinguen
- cantidad del pack: `2u`, `3u`, `6u`, `12u`, `20u`, `50u`

Evitar:

- mezclar packs de distinta cantidad
- mezclar wraps con conos pre-enrolados
- persistir accesorios como ceniceros, containers, flotadores, kits rellenadores o maquinas enroladoras como productos comparables de esta categoria
- usar colores aleatorios si no aparecen como variante clara en ambas tiendas

Normalizaciones aprobadas:

- `109mm` en OCB Virgin equivale a `king-size-slim`.
- `Shorty` de Blazy Susan equivale a `53mm` cuando una tienda omite el tamano.
- `Bulldog Reefer 1 1/4 6u` puede compararse con `Bulldog 6 Conos Pre-enrolados 1 1/4`.

### Filtros y boquillas

En el home, esta categoria solo debe agruparse por `Product` curado. No uses el fuzzy del catalogo para mostrar grupos sin `productId`, porque genera falsos positivos y tarjetas sin boton `Comparar`.

Priorizar:

- marca real aunque el `brandKey` scrapeado venga contaminado por la tienda
- familia del producto: `paper-tip`, `paper-filter`, `gummed-tip`, `pre-rolled-tip`, `glass-tip` o `carbon`
- linea clara: `classic`, `wide`, `gummed`, `premium`, `premium-slim`, `virgin`, `slim-red`, `metal-case`
- tamano cuando distingue el producto: `6mm`, `7mm`, `7.5mm`, `8mm`, `15mm`, `23mm`
- cantidad cuando cambia el producto: `100u`, `150u`, etc.

Evitar:

- mezclar filtros de carbon con tips de carton
- mezclar `premium` con `premium-slim`
- mezclar cajitas metalicas de tips pre-enrolados con tips simples
- mezclar packs de distinta cantidad cuando la cantidad sea parte del producto
- persistir filtros de reemplazo, rolls con tips, filtros grandes tipo cultivo/extraccion o accesorios ajenos como comparables de esta categoria

Normalizaciones aprobadas:

- RAW `Original`, `Classic` y `Tips Original de carton` son el mismo comparable de tips clasicos.
- RAW `Perforated Wide`, `Wide pre-picadas` y `Perforated Wide Tips` son el mismo comparable wide.
- RAW `Gummed Tips`, `Perforated Gummed Tips` y boquillas con pegamento son el mismo comparable gummed.
- RAW cajetilla/cajita metalica de 100 tips pre-enrolados se normaliza como `pre-rolled-tip-metal-case-6mm-100u` cuando una tienda omite `6mm`.
- OCB `Filtro Premium` y `Filtros de carton OCB Premium` comparan entre si, separado de `Premium Slim`.
- OCB `Filtro Virgin` y `Filtro de carton OCB Virgin` comparan entre si.
- Gizeh `Slim Rojo con pegamento 120+30` se normaliza como `150u`.

### Encendedores y sopletes

En el home, esta categoria solo debe agruparse por `Product` curado. No uses el fuzzy del catalogo para mostrar grupos sin `productId`, porque mezcla modelos como Zippo High Polish o packs de Clipper con unidades y deja tarjetas sin boton `Comparar`.

Priorizar:

- marca real aunque el `brandKey` venga contaminado por la tienda
- familia del producto: `lighter`, `torch-lighter`, `metal-lighter`, `gas` o `wick`
- linea/modelo: `classic`, `jet-flame`, `metal`, `zippo-wick`, `zl-12`, `big-shot`, `high-polish-*`
- volumen cuando distingue recargas: `16ml`, `100ml`, `300ml`, etc.
- cantidad cuando cambia el producto: unidades sueltas vs packs `24u`

Evitar:

- mezclar Clipper clasico con Clipper Jet Flame
- mezclar Clipper Jet Flame unidad con packs `24u`
- mezclar Clipper metalico con Clipper plastico clasico
- mezclar recargas de gas de distinto volumen
- mezclar accesorios Zippo distintos como mecha, piedras, bencina y encendedores
- persistir o curar como comparable productos que son kits, packs de coleccion o pipas-encendedor
- agregar productos de una sola tienda al home solo para aumentar conteo
- mezclar Zippo High Polish de colores o disenos distintos, por ejemplo `green chameleon` con `green logo`

Normalizaciones aprobadas:

- Clipper regular de disenos surtidos se normaliza como `lighter-classic` cuando es unidad.
- Clipper Jet Flame de disenos surtidos se normaliza como `torch-lighter-jet-flame` cuando es unidad.
- Clipper metalico de disenos surtidos se normaliza como `metal-lighter-metal`.
- Clipper gas butano bolsillo `16ml` compara entre tiendas como `gas-classic-16ml`.
- Zippo mecha/repuesto de mecha compara como `wick-zippo-wick`.
- Zippo `High Polish Teal` compara como `lighter-high-polish-teal` cuando ambas tiendas comparten color/modelo; otros colores/disenos deben separarse.
- Zengaz debe conservar modelo real como `zl-12`; no mezclar `zl-12`, `zl-3` y genericos sin modelo.

### Bandejas y ceniceros

En el home, esta categoria solo debe agruparse por `Product` curado. No uses fuzzy para mostrar grupos sin `productId`, porque puede mezclar bandejas con `tamano a eleccion`, tamanos concretos o accesorios sin identidad comparable.

Priorizar:

- familia del producto: `tray` o `ashtray`
- marca real aunque el `brandKey` venga ausente o contaminado por la tienda
- linea/modelo: `deluxe`, `neon-led`, `ash-holder`, `brazilian-girl`, `girl`, `classic`, `mike-tyson`, `bamboo`, etc.
- material cuando distingue: `metal`, `glass`, `silicone`, `hemp`
- tamano cuando distingue: `mini`, `small`, `medium`, `large` o dimensiones explicitas

Evitar:

- mezclar bandejas RAW `tamano a eleccion` con tamanos concretos
- mezclar bandejas y ceniceros aunque compartan marca
- mezclar modelos distintos de RAW Girl, RAW Brazilian Girl y RAW Classic
- curar bandejas de cultivo, cubos de lana de roca, cupulas propagadoras, cajas con bandeja o tapas magneticas como comparables de esta categoria

Normalizaciones aprobadas:

- Blazy Susan `Cenicero Deluxe` compara como `ashtray-deluxe`.
- Bonglab `Neon Tray LED` compara como `tray-neon-led`.
- Galaxy `Ash Holder` compara como `ashtray-ash-holder` aunque una tienda agregue `Glow in the Dark`.
- RAW `Brazilian Girl Mediana` puede usar el tamano desde la URL cuando el titulo de una tienda lo omite.
- RAW `Girl Mediana` compara como `tray-girl-metal-medium`.

### Bongs

Priorizar marcas y modelos reales. El matcher puede normalizar marcas como BongLab, PieceMaker, Calvo, Cabo, Hemper o Eyce desde titulo/modelo cuando la tienda no las clasifica bien.

### Vaporizadores herbales

En el home, esta categoria solo debe agruparse por `Product` curado. No uses fuzzy para mostrar grupos sin `productId`, porque puede mezclar modelos caros con variantes incompatibles.

Priorizar:

- marca real aunque el `brandKey` venga ausente o contaminado por la tienda
- modelo exacto del vaporizador
- variantes que cambian identidad: `plus`, `xl`, `onyx`, `hybrid`, `classic`
- nombres normalizados de marca como `storz-bickel`, `davinci`, `dynavap`, `airistech`, `arizer`, `weecke`

Evitar:

- mezclar `Mighty` con `Mighty+`
- mezclar `Crafty` con `Crafty+`
- mezclar `DynaVap M7` con `M7 XL`
- mezclar `Volcano Classic` con `Volcano Hybrid`
- mezclar `Volcano Hybrid` con `Volcano Hybrid Onyx`
- curar accesorios como baterias 510, boquillas, cases, unidades de enfriamiento o repuestos como vaporizadores herbales

Normalizaciones aprobadas:

- DaVinci `IQ3` compara como `iq3` aunque una tienda lo escriba `Da Vinci`.
- DaVinci `Miqro-C` compara como `miqro-c`.
- DynaVap `The New M7`, `New The M 7` y `M7` comparan como `m7`; `M7 XL` debe ir separado.
- Storz & Bickel `Crafty+`, `Crafty Plus` y `Crafty+ Plus` comparan como `crafty-plus`.
- Storz & Bickel `Mighty+` y `Mighty Plus` comparan como `mighty-plus`; `Mighty V2` debe ir separado.
- Storz & Bickel `Volcano Hybrid Onyx Edition` compara como `volcano-hybrid-onyx` y no con `volcano-hybrid` normal.

### Repuestos para bongs y vaporizadores

En el home, esta categoria solo debe agruparse por `Product` curado. No uses fuzzy para mostrar grupos sin `productId`, porque la categoria mezcla repuestos de bong, repuestos de vaporizador y productos completos mal clasificados.

Priorizar:

- familia del repuesto: `bowl`, `diffuser`, `ash-catcher`, `screen-set`, `dosing-capsules`, `cooling-unit`, `mouthpiece`, `charger`, `tip`, `volcano-part`
- marca real: `bonglab`, `calvo`, `focus-v`, `pax`, `storz-bickel`, etc.
- modelo/linea: `honeycomb`, `perlas`, `screen`, `saber-tip`, `flat-mouthpiece`, `small`, `venty`, `crafty-car-charger`, `mighty-plus-usb-c-supercharger`
- medidas funcionales: `10mm`, `14mm`, `18mm`, angulos `45`/`90`, largos como `10cm`, `12cm`, `1m`
- cantidad cuando distingue el producto: `1u`, `2u`, `3u`, `40u`

Evitar:

- mezclar repuestos con bongs, pipas o vaporizadores completos mal clasificados
- mezclar quemadores simples con quemadores con rejilla, perlas, honeycomb o bowl chico
- mezclar `14mm` con `18mm`
- mezclar Focus V Saber Tip unidad con pack `3u`
- mezclar cooling unit Crafty unidad con pack `3u`
- mezclar capsulas monodosis normales con variantes `con tampon`
- curar baterias 510, charging cases, porta capsulas, kits de inicio, Dynakit o Enigma Box como comparables de esta categoria

Normalizaciones aprobadas:

- Bonglab `Quemador Honeycomb Macho 14mm` compara como `bowl-honeycomb-14mm`.
- Bonglab `Quemador Honeycomb Macho 18mm` compara como `bowl-honeycomb-18mm`.
- Bonglab `Quemador con rejilla` y `Quemador Rejilla Pyrex Cono` comparan como `bowl-screen-14mm`.
- Calvo `Quemador Perlas 18mm` compara como `bowl-perlas-18mm`, separado de perlas `14mm`.
- Focus V `Saber Tip` unidad compara como `tip-saber-tip-1u`, separado del pack `3u`.
- Pax `Flat Mouthpiece 2 unidades` y `Boquilla Plana Pax 2/3 2 unidades` comparan como `mouthpiece-2u`.
- Storz & Bickel `Cargador Crafty para auto 12V` compara como `charger-crafty-car-charger`.
- Storz & Bickel `Cargador Supercarga Tipo C Mighty+` compara como `charger-mighty-plus-usb-c-supercharger`.
- Storz & Bickel `Unidad de enfriamiento Crafty` compara como `cooling-unit-crafty`, separado del pack `3u`.
- Storz & Bickel `Capsulas Monodosis 40 unidades` compara como `dosing-capsules-monodosis-40u`.
- Storz & Bickel `Juego de Mallas Venty` compara como `screen-set-venty`.

### Otros Parafernalia

Puede matchear categorias concretas solo con senales fuertes de score. Esta flexibilidad compensa clasificaciones scrapeadas imperfectas, pero no debe relajar identidades dudosas.

## Estrategia De Mejora

- Mejorar comparables dentro de una categoria concreta antes de relajar reglas globales.
- Buscar primero marcas/modelos presentes en 2, 3 o 4 growshops.
- Ajustar normalizacion o seeds solo para candidatos seguros.
- Evitar cambios globales que unan productos distintos.

## URLs Publicas

La forma actual de URLs esta aprobada y debe considerarse estable.

Buenas formas:

- `/productos/<brandKey>/<modelSlug>` cuando existe marca.
- `/productos/<slug>` para compatibilidad con rutas existentes.

Reglas:

- `brandKey` ocupa el primer segmento de URL.
- `modelSlug` no debe repetir la marca.
- `modelSlug` debe derivarse de un concepto de modelo limpio.
- Remover prefijos tecnicos como `paper`.
- Remover tokens de tamano duplicados.
- Remover palabras de categoria y palabras genericas.
- No construir slugs concatenando `brandKey + raw modelKey + category`.

## Ejemplos Buenos

- `/productos/blazy-susan/pink`
- `/productos/raw/classic-king-size-slim`
- `/productos/ocb/bamboo`
- `/productos/blazy-susan/1-1-4-con-tips`

## Ejemplos Malos

- `/productos/blazy-susan/blazy-susan-paper-1-1-4-papelillos`
- `/productos/raw/raw-classic-papelillos-1-1-4`
- `/productos/blazy-susan/papelillos-1-1-4`

## Verificacion

Despues de cambios de matching, curacion o slugs:

```powershell
npm run catalog:curate
npm run lint
npm run build
```

Si aplicas curacion normal:

```powershell
$env:CURATE_MIN_STORES="2"; npx tsx scripts/curate-comparable-products.ts --apply
```

Confirma que:

- los `Product` tengan identidad clara
- no existan slugs con marca duplicada
- no existan slugs con categoria redundante
- `brandKey`, `modelKey` y `modelSlug` sigan sincronizados
