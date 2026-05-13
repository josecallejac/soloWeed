# SoloWeed

Comparador de precios de parafernalia en Chile, inspirado en el flujo de SoloTodo y enfocado en productos como bongs, pipas, moledores, papelillos, contenedores, limpieza y vaporizadores herbales.

## Stack

- Next.js 16 + TypeScript + Tailwind CSS
- Prisma + SQLite
- Cheerio para scraping HTML/JSON-LD

## Comandos

```bash
npm install
npm run db:migrate
npm run scrape
npm run dev
```

## Scraping

El scraper usa sitemaps y paginas publicas de categorias, evitando rutas de carrito, checkout, usuario, busqueda y administracion. Por defecto intenta guardar hasta 35 productos por tienda.

```bash
npm run scrape
```

Variables opcionales:

```bash
SCRAPE_LIMIT_PER_STORE=25 npm run scrape
SCRAPE_DELAY_MS=500 npm run scrape
SCRAPE_TIMEOUT_MS=20000 npm run scrape
```

En PowerShell:

```powershell
$env:SCRAPE_LIMIT_PER_STORE="25"; npm run scrape
```

## Fuentes Iniciales

- Astro Growshop
- Fumetas
- Piranha
- GrowBarato Chile

## Notas

- SoloWeed no vende productos; enlaza a la tienda original.
- Los precios son referenciales y deben confirmarse en la tienda fuente.
- El historial de precios se registra solo cuando cambia precio, precio original o stock.
- El modo dev y el build usan Webpack porque Turbopack actualmente falla al externalizar Prisma en este proyecto.
