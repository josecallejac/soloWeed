# Reglas Del Scraper

## Fuente Principal

El scraper vive en `scripts/scrape.ts`. Ahi se concentran:

- configuracion de tiendas
- descubrimiento de URLs candidatas
- clasificacion de productos
- extraccion de datos
- persistencia de `Offer`
- historial de precios
- limpieza de ofertas obsoletas

## Tiendas Actuales

- Astro Growshop (Jumpseller)
- Fumetas (Jumpseller)
- Piranha (PrestaShop)
- GrowBarato Chile (PrestaShop)
- Kushbreak (Jumpseller, agregada 17 jul 2026)
- Friendly Grow (Jumpseller, agregada 24 jul 2026)

## URLs Permitidas

- Paginas de producto con senales suficientes de producto real.
- URLs con precio util.
- URLs con stock interpretable o regla explicita de tienda.
- URLs descubiertas desde sitemaps o categorias publicas siempre que pasen los filtros.

## URLs Rechazadas

No persistir como productos:

- categorias
- marcas
- busquedas
- paginaciones
- carrito
- checkout
- usuario/cuenta
- administracion
- tags o filtros sin producto concreto

## Reglas PrestaShop

Piranha y GrowBarato Chile son PrestaShop. Para estas tiendas:

- Solo persistir URLs de producto `.html`.
- Limpiar ofertas obsoletas que apunten a categorias, marcas o paginas no producto.
- No aceptar URLs de categoria aunque tengan nombres parecidos a productos.
- Sus sitemaps envuelven cada `<loc>` en `CDATA`; `decodeXml` debe desenvolverlo. Sin
  eso las URLs no parsean y **el camino sitemap queda muerto** para ambas tiendas (bug
  encontrado el 21 jul 2026: GrowBarato tenia 232 fichas de parafernalia sin scrapear).

## Candidatos Y Cobertura

- Las URLs candidatas se agrupan por categoria y familia/firma de producto antes de intercalarse.
- Esto evita que limites bajos de scraping dejen sin cobertura secciones pequenas como `Pipas`.
- Si agregas nuevas categorias, revisa que la intercalacion siga cubriendo categorias chicas.

### Medir la cobertura de una tienda

`scripts/diagnose-store-coverage.ts` (solo lectura) compara el sitemap con la BD y
clasifica cada URL ausente con los filtros REALES del scraper:

```powershell
$env:COVERAGE_STORE="growbarato"; npx tsx scripts/diagnose-store-coverage.ts
$env:COVERAGE_TITLES="0"; ...   # sin red: solo el reparto por filtros de URL
```

Solo `deberia-estar` es hueco accionable. Los demas motivos son ruido esperado:
`sin-senal` (el scraper ni la visita), `no-es-ficha` (og:type != product: el sitemap
lista categorias y CMS), `no-carga` (sitemap obsoleto), `excluida` (cultivo/semillas).

Trampas medidas el 21 jul 2026, tenerlas en cuenta antes de creerle a un numero:

- **Comparar la URL literal no sirve en PrestaShop**: sirve la misma ficha bajo varias
  rutas (Piranha por id `/inicio/38-slug.html` vs `/inicio/7787/slug.html`; GB con la
  categoria variable). La identidad es el id (Piranha) o el slug final (GB).
- **El sitemap de Piranha esta obsoleto**: sus URLs redirigen a 404, no son cobertura
  perdida. Cuestan ~104 fetches fallidos por corrida y no ensucian la BD.
- Un titulo de categoria ("BONGS") clasifica como categoria valida sin ser un producto:
  por eso el motivo se decide con `og:type`, no con `classifyProduct`.

## Clasificacion Y Reparacion

- Despues de scrapear una tienda, las ofertas existentes de esa tienda se reclasifican desde titulo, URL y `sourceCategory` guardados.
- Los fixes de categoria y marca deben reparar datos antiguos cuando sea posible.
- Si cambias reglas de clasificacion, revisa si tambien debes actualizar matching o constantes del detalle.

## Persistencia

- No crear una oferta dudosa si la pagina no tiene precio util, stock interpretable o senales suficientes de producto.
- Solo crear excepciones cuando exista regla explicita para esa tienda.
- `PriceHistory` solo se agrega cuando cambia precio, precio original o stock.
- No editar `prisma/dev.db` manualmente para corregir scraping; usa scripts, migraciones o el propio scraper.

## Validacion Recomendada

Para cambios de scraper, ejecuta al menos una corrida limitada:

```powershell
$env:SCRAPE_LIMIT_PER_STORE="20"; $env:SCRAPE_DELAY_MS="100"; npm run scrape
```

Para aislar una tienda:

```powershell
$env:SCRAPE_STORES="piranha"; $env:SCRAPE_LIMIT_PER_STORE="20"; $env:SCRAPE_DELAY_MS="100"; npm run scrape
```

Luego ejecuta:

```powershell
npm run lint
npm run build
```
