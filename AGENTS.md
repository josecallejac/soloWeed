# AGENTS.md

## Comandos
- **Inicio y Cierre de Sesión**: Si el usuario escribe exactamente "Inicio soloweed", detén tus tareas y ejecuta estrictamente el flujo definido en `.claude/commands/iniciar.md`. Si escribe exactamente "Cerrar soloweed", ejecuta el flujo de `.claude/commands/cerrar.md`. Trata estas frases como comandos de sistema absolutos.
- Usa `npm`; `package-lock.json` es el lockfile. `npm install` ejecuta `prisma generate` mediante `postinstall`.
- Desarrollo y build deben usar los scripts existentes con Webpack: `npm run dev` y `npm run build`. No cambies a Turbopack sin resolver primero la externalizacion de Prisma.
- Verifica cambios de app con `npm run lint` y `npm run build`. Los tests se ejecutan con `npm run test` (corre `tests/password.test.ts`, `tests/export-catalog-audit.test.ts`, `tests/matching.test.ts` y `tests/catalog.test.ts` via `tsx --test`). Para un solo archivo: `npx tsx --test tests/matching.test.ts`.
- Setup de Prisma: copia `.env.example` a `.env` y luego ejecuta `npm run db:migrate`. La base SQLite por defecto es `prisma/dev.db` con `DATABASE_URL="file:./dev.db"`.
- **La base ACTIVA es la que diga `DATABASE_URL` en `.env`**: desde la migración del 12 jul 2026 es el **PostgreSQL de Railway (producción)**, por su URL pública, y `schema.prisma` declara `provider = "postgresql"`. Scraping y curación corren desde el PC contra producción: **todo script que ejecutes toca datos vivos**. Los `.db` de `prisma/` son respaldos históricos de solo lectura; nunca los consultes ni asumas SQLite. Los snapshots son dumps JSON vía `pg-snapshot.ts` (`snapshot-save.ps1`/`snapshot-restore.ps1`).
- Scraping: `npm run scrape`. Para una corrida rapida en PowerShell usa `$env:SCRAPE_LIMIT_PER_STORE="20"; $env:SCRAPE_DELAY_MS="100"; npm run scrape`; agrega `$env:SCRAPE_STORES="astrogrowshop"` para apuntar a tiendas especificas.
- Auto-match de ofertas: `$env:AUTO_MATCH_MIN_STORES=2; $env:AUTO_MATCH_CATEGORIES="Bongs,Pipas"` ejecuta el matcher.
- Curacion de productos: `CURATE_MAX_PRODUCTS_PER_CATEGORY=20; CURATE_MIN_STORES=2` controla los umbrales de creacion de productos.
- Expansion de ofertas curadas: `EXPAND_MIN_SCORE=0.86` define el umbral de fuzzy matching.

## Arquitectura
- Esta es una app Next.js App Router. El catalogo home esta en `src/app/page.tsx`; el detalle comparativo esta en `src/app/productos/[...slug]/page.tsx` y soporta `/productos/<slug>` y `/productos/<brandKey>/<modelSlug>`.
- Prisma es la capa de datos: `Store -> Offer -> PriceHistory`, con `Offer.productId -> Product` opcional. Usa el singleton de `src/lib/prisma.ts`.
- `scripts/scrape.ts` concentra configuracion de tiendas, descubrimiento de URLs candidatas, clasificacion de productos, persistencia y creacion de historial de precios.
- El scraper actualmente apunta a Astro Growshop, Fumetas, Piranha y GrowBarato Chile. Piranha/GrowBarato son PrestaShop y solo deben persistir URLs de producto `.html`; URLs de categoria o marca deben limpiarse como ofertas obsoletas.

## Flujo Por Tipo De Cambio
- Cambios UI o rutas Next.js: revisa `src/app/page.tsx`, `src/app/productos/[...slug]/page.tsx` y componentes relacionados; verifica con `npm run lint` y `npm run build`.
- Cambios de scraper: modifica `scripts/scrape.ts`, ejecuta una corrida limitada con `SCRAPE_LIMIT_PER_STORE`, `SCRAPE_DELAY_MS` y, si aplica, `SCRAPE_STORES`; luego verifica `npm run lint` y `npm run build`.
- Cambios de clasificacion, marcas o categorias: actualiza las reglas de scraping y las constantes del matcher si el detalle de producto depende de esos datos.
- Cambios de matching o curacion: revisa que no se creen `Product` innecesarios, que las ofertas equivalentes sigan agrupandose y que las URLs publicas conserven la forma esperada.
- Cambios de slugs, backfill o migraciones de datos: conserva juntos `brandKey`, `modelKey` y `modelSlug`; no edites `prisma/dev.db` manualmente.

## Scraper
- `SCRAPE_LIMIT_PER_STORE`, `SCRAPE_DELAY_MS`, `SCRAPE_TIMEOUT_MS` y `SCRAPE_STORES` controlan alcance y velocidad. Los scrapes completos llaman sitios externos y pueden ser lentos.
- Las URLs candidatas se agrupan por categoria y familia/firma de producto antes de intercalarse para que limites bajos no dejen sin cobertura secciones pequenas como `Pipas`.
- Despues de scrapear una tienda, las ofertas existentes de esa tienda se reclasifican desde titulo, URL y `sourceCategory` guardados para que fixes de categoria y marca reparen datos antiguos.
- `PriceHistory` solo se agrega cuando cambia precio, precio original o stock.
- No persistas URLs de categorias, marcas, busquedas o paginaciones como productos. En PrestaShop, Piranha/GrowBarato deben conservar solo URLs `.html` de producto.
- Si una pagina no tiene precio util, stock interpretable o senales suficientes de producto, evita crear una oferta dudosa salvo que exista una regla explicita para esa tienda.

## Matching Y Productos
- Las filas `Product` representan productos curados con identidad clara; pueden tener una o varias ofertas asociadas.
- Crea o conserva un `Product` cuando exista una identidad de producto clara: misma marca/modelo/variante/tamano. Si por ahora solo hay una tienda, igualmente debe poder abrir detalle y mostrar la grilla de comparacion con esa oferta.
- **IMPORTANTE**: Al vincular ofertas manualmente a productos, ejecuta el vinculado DESPUÉS de la curación, nunca antes. El script de curación (`curate-comparable-products.ts`) desvincula ofertas durante el proceso de matching fuzzy, por lo que cualquier vinculado manual previo se perderá. El orden correcto es: 1) ejecutar curación, 2) vincular ofertas manualmente, 3) ejecutar auditoría sin volver a curar.
- **REGLA ESTRICTA 4 TIENDAS**: Los productos que ya alcanzaron 4 tiendas son **ESTRICTAMENTE INTOCABLES** ya que están verificados y aprobados. Sus ofertas y URLs jamás deben cambiar o reevaluarse. Todo nuevo desarrollo, algoritmo o curación manual debe enfocarse **exclusivamente en optimizar y agrupar productos de 1, 2 y 3 tiendas**. Excepción "solo sumar" (17 jul 2026, ampliada 24 jul 2026): pueden recibir la oferta de una tienda nueva (ej. Kushbreak la 5ª, Friendly Grow la 6ª) y subir a 5 o 6 tiendas — jamás perder ni cambiar las existentes. Protégelos con `scripts/protect-multistore-links.ts`: `--save` antes de curar (respalda producto→ofertas de los de >=3 tiendas a `reports/protected-links.json`), `--verify` después de linkear y `--restore` si algo se rompió.
- Las listas de marcas y aliases viven SOLO en `src/lib/matching-constants.ts` (`KNOWN_BRAND_PHRASES`, `BRAND_ALIASES`); `scripts/scrape.ts` y `scripts/backfill-brand-keys.ts` las importan. No dupliques listas.
- `npm run brand:backfill` es no destructivo: nunca pisa un `brandKey` existente con null (hay marcas asignadas por scripts puntuales que no son inferibles) y jamás cambia `Product.brandKey` existente (es parte de la URL pública).
- Los dry-runs de expand/link proponen falsos positivos con `modelKey` genérico (ej.: bolsos Ozeta distintos → crossbag-5x5, accesorios Mighty → vaporizador Mighty+). Revisa CADA propuesta contra el producto destino antes de aplicar; si hay dudas, vincula de forma dirigida con un script tipo `link-ronda*-reviewed.ts` en vez de aplicar el script completo.
- Los reportes de `diagnose-*-gaps.ts` también listan ofertas YA vinculadas como candidatas. Un script de vinculado dirigido jamás debe mover una oferta con `productId` no nulo (la guarda está en `link-ronda3-reviewed.ts` como patrón): mover una oferta de un producto de 4 tiendas lo rompe.
- `npm run match:image` (`scripts/match-by-image.ts`) encuentra pares de ofertas de tiendas distintas con la misma foto de fabricante exacta (dHash 512 bits con recorte de margenes blancos; un dHash de 64 bits sin recorte da cientos de falsos positivos). Es solo diagnostico: nunca escribe en la BD. Distancia <= 60 es casi siempre el mismo arte; la banda 60-140 exige mirar las fotos. **La imagen propone, el texto decide**: las tiendas reusan la misma foto para medidas distintas (14 vs 18mm), displays 24U/50U con foto de la unidad y variantes de color/edicion; confirma cada par contra titulo/precio/medidas y aplica con un script dirigido (patron `scripts/apply-image-matching-r*.ts`).
- `npm run match:embedding` (`scripts/match-by-embedding.ts`) encuentra similitud visual semántica usando IA local (CLIP). Esto captura productos idénticos con distinto fondo o ángulo (>88% de similitud). **Atención:** La IA agrupa unidades con displays (ej. 1u vs 50u); es obligatorio descartar estos pares por la regla de no mezclar packs con unidades sueltas antes de aplicar los links.
- La normalizacion y busqueda de modelos debe ser especifica por categoria. No reutilices ciegamente las reglas de una categoria en otra: `Papelillos` prioriza linea/variante/color/tamano/tips; `Pipas` prioriza modelo, forma, material, marca y senales distintivas evitando colores o ruido de tienda; `Moledores` prioriza marca, linea/modelo, material, tamano y numero de partes, ignorando colores y ruido comercial.
- En `Bandejas y ceniceros`, el home debe mostrar solo grupos curados con `productId` compartido. La curacion prioriza familia (`tray`, `ashtray`), marca real, linea/modelo (`deluxe`, `neon-led`, `ash-holder`, `brazilian-girl`, `girl`, `classic`, etc.), material y tamano. No mezcles bandejas RAW con `tamano a eleccion` con tamanos concretos, ni bandejas/ceniceros de cultivo o accesorios como tapas magneticas.
- En `Contenedores y estuches`, el home debe mostrar solo grupos curados con `productId` compartido. La curacion prioriza familia (`jar`, `extract-container`, `case`, `bag`, `tube-case`, `baggie`, `concealment-can`), marca real (`ozeta`, `bonglab`, `raw`, `aku`, `soulblime`, etc.), linea/modelo (`mason`, `miron`, `restash`, `antiolor`, `chestbag-circular`, `crossbag-5x5`, `banano`, `ywiwis`) y tamano/cantidad (`small`, `medium`, `large`, `xl`, `4ml`, `120ml`, `250ml`, `473ml`, `9u`) cuando distinguen el producto. No mezcles bolsos, estuches, frascos y contenedores de extractos entre si, ni kits antiolor, kits nectar, latas de ocultacion genericas o packs con unidades sueltas solo para aumentar conteo.
- En `Filtros y boquillas`, el home no debe agrupar por fuzzy si no existe `Product`: muestra solo grupos curados con `productId` compartido para evitar falsos positivos y asegurar boton `Comparar`. La curacion prioriza familia (`paper-tip`, `paper-filter`, `gummed-tip`, `pre-rolled-tip`, `glass-tip`, `carbon`), linea (`classic`, `wide`, `gummed`, `premium`, `premium-slim`, `virgin`, `slim-red`, `metal-case`), tamano y cantidad cuando distinguen el producto.
- En `Encendedores y sopletes`, el home tampoco debe agrupar por fuzzy si no existe `Product`: muestra solo grupos curados con `productId` compartido. La curacion prioriza familia (`lighter`, `torch-lighter`, `metal-lighter`, `gas`, `wick`), linea/modelo (`classic`, `jet-flame`, `metal`, `zippo-wick`, `zl-12`, `high-polish-teal`, etc.), volumen y cantidad para separar unidades, recargas y packs. No agregues productos de una sola tienda al home ni mezcles Zippo High Polish de colores/disenos distintos solo para aumentar conteo.
- En `Vaporizadores herbales`, el home debe mostrar solo grupos curados con `productId` compartido. La curacion prioriza marca real y modelo exacto (`iq3`, `miqro-c`, `m7`, `m7-xl`, `crafty-plus`, `mighty-plus`, `venty`, `volcano-classic`, `volcano-hybrid`, `volcano-hybrid-onyx`, etc.). No mezcles variantes Plus/no Plus, Onyx/no Onyx, XL/no XL, Classic/Hybrid ni accesorios como baterias, boquillas, cases o repuestos.
- En `Repuestos para bongs y vaporizadores`, el home debe mostrar solo grupos curados con `productId` compartido. La curacion prioriza familia (`bowl`, `diffuser`, `ash-catcher`, `screen-set`, `dosing-capsules`, `cooling-unit`, `mouthpiece`, `charger`, `tip`, `volcano-part`), marca real, modelo/linea (`honeycomb`, `perlas`, `screen`, `saber-tip`, `flat-mouthpiece`, `crafty-car-charger`, `mighty-plus-usb-c-supercharger`, etc.), medidas (`14mm`, `18mm`, angulo, largo) y cantidad (`1u`, `2u`, `3u`, `40u`). No mezcles repuestos con bongs/pipas/vaporizadores completos, ni packs con unidades sueltas, ni variantes como `con tampon` con capsulas normales.
- Para mejorar comparables, prioriza buscar coincidencias multi-tienda dentro de una categoria concreta antes de relajar reglas globales. Ejemplo: en `Pipas`, busca primero marcas/modelos presentes en 2, 3 o 4 growshops y solo luego ajusta normalizacion o seeds para esos candidatos seguros.
- Si solo hay una tienda u oferta equivalente, el detalle debe mostrar igualmente el comparador con esa oferta; no ocultes la grilla por falta de una segunda tienda.
- El matcher fuzzy en `src/app/productos/[...slug]/page.tsx` usa marcas conocidas, compatibilidad de categorias, descriptores, tamanos, variantes e identificadores. Actualiza esas constantes al agregar marcas o categorias nuevas.
- `Otros parafernalia` puede matchear categorias concretas solo con senales fuertes de score; esto compensa clasificaciones scrapeadas imperfectas.

## URLs Y Slugs
- La forma actual de URLs esta aprobada y debe considerarse estable. No la cambies, no la simplifiques y no propongas otra estructura salvo que el usuario lo pida explicitamente.
- Las URLs de producto deben ser simples y legibles: `/productos/<brandKey>/<modelSlug>` cuando existe marca.
- No construyas slugs publicos concatenando `brandKey + raw modelKey + category`.
- `brandKey` ocupa el primer segmento de URL, por lo que `modelSlug` no debe repetir la marca.
- `modelSlug` debe derivarse de un concepto de modelo limpio: remueve prefijos tecnicos como `paper`, tokens de tamano duplicados, palabras de categoria y palabras genericas.
- Para `Papelillos`, el segmento de modelo no debe incluir la palabra `papelillos` ni quedar solo como un tamano. Prioriza linea, color o modelo; omite tamanos default ruidosos como `1-1-4` si existe una variante real, y conserva tamanos distintivos como `king-size-slim` cuando sean necesarios.

## Ejemplos De URLs
- Bueno: `/productos/blazy-susan/pink`
- Bueno: `/productos/raw/classic-king-size-slim`
- Bueno: `/productos/ocb/bamboo`
- Bueno si tips/boquillas son parte del comparable: `/productos/blazy-susan/1-1-4-con-tips`
- Malo: `/productos/blazy-susan/blazy-susan-paper-1-1-4-papelillos`
- Malo: `/productos/raw/raw-classic-papelillos-1-1-4`
- Malo: `/productos/blazy-susan/papelillos-1-1-4` para `Papelillos`, porque repite la categoria en el segmento de modelo.

## Checklist Antes De Terminar
- Ejecuta `npm run lint` y `npm run build` para cambios de app, scraper, matching o datos derivados.
- Si cambiaste scraper, haz al menos una corrida limitada con variables de entorno para validar que no persista URLs incorrectas.
- Si cambiaste matching o curacion, verifica que los `Product` creados tengan identidad clara y slugs publicos limpios, aunque tengan una sola oferta.
- Si cambiaste URLs o slugs, confirma que `brandKey`, `modelKey` y `modelSlug` sigan sincronizados.
- Verifica que no editaste manualmente `.next/`, `node_modules/`, clientes Prisma generados ni `prisma/dev.db`.

## Gotchas
- `searchParams` y los `params` de rutas dinamicas estan tipados como Promises en este codebase con Next 16; conserva ese patron.
- `next.config.ts` define `serverExternalPackages: ["@prisma/client"]`; mantenlo salvo que se revise intencionalmente el bundling de Prisma.
- Evita editar `.next/`, `node_modules/`, archivos generados del cliente Prisma o `prisma/dev.db` manualmente; usa scripts, migraciones o scraping segun corresponda.
