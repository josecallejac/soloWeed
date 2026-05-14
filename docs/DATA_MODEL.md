# Modelo De Datos

## Resumen

Prisma es la capa de datos. El flujo principal es:

```text
Store -> Offer -> PriceHistory
             \
              -> Product opcional
```

## Store

Representa una tienda externa.

Uso esperado:

- identificar origen de ofertas
- mostrar nombre y URL base
- agrupar comparaciones por tienda

## Offer

Representa una oferta scrapeada desde una tienda.

Campos conceptuales importantes:

- tienda asociada
- titulo
- URL fuente
- precio
- precio original
- stock
- categoria
- marca y `brandKey`
- modelo y `modelKey`
- imagen
- `productId` opcional

Reglas:

- Una oferta puede existir sin `Product`.
- Una oferta no debe apuntar a categoria, marca, busqueda ni paginacion.
- Si cambia precio, precio original o stock, se registra historial.

## PriceHistory

Historial de cambios relevantes de una oferta.

Reglas:

- No crear filas repetidas si no cambio precio, precio original ni stock.
- Usar el scraper o scripts para mantenerlo, no ediciones manuales.

## Product

Representa un producto curado con identidad clara.

Reglas:

- Puede tener una o varias ofertas asociadas.
- No representa cualquier oferta scrapeada.
- Debe tener `brandKey`, `modelKey` y `modelSlug` coherentes cuando aplique.
- Su URL publica debe ser estable y limpia.
- Productos huerfanos pueden limpiarse si no tienen ofertas asociadas.

## Asociacion Offer -> Product

`Offer.productId` es opcional.

Asociar cuando:

- la oferta corresponde claramente al producto
- marca/modelo/variante/tamano son compatibles
- no hay conflicto de tips o atributos relevantes
- no hay outlier de precio que sugiera producto distinto

No asociar cuando:

- el match depende solo de palabras genericas
- el precio sugiere otra escala de producto
- hay conflicto de variante/tamano/tips
- la categoria esta demasiado dudosa sin senales fuertes

## Operaciones Sobre Datos

- Setup: `npm run db:migrate`.
- Scraping: `npm run scrape`.
- Curacion: `npx tsx scripts/curate-comparable-products.ts --apply`.
- Backfill de marcas: `npm run brand:backfill`.
- Backfill de modelos: `npm run model:backfill`.

## Prohibiciones

- No editar `prisma/dev.db` manualmente.
- No tocar cliente Prisma generado.
- No modificar migraciones historicas sin entender el estado de la base.
- No borrar datos ajenos o cambios concurrentes sin permiso explicito.
