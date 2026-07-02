# Estado del Catálogo

Último cierre: 1 de julio de 2026, commit fd79102

Este documento mantiene la memoria del estado de curación del catálogo entre sesiones.

## Resumen Actual

- **Productos curados con ofertas:** 627
- **Ofertas Totales:** 4530

### Distribución de Productos por Número de Tiendas

- **4 tiendas:** 69
- **3 tiendas:** 186
- **2 tiendas:** 356
- **1 tienda:** 16 (exclusivos de tienda)

## Sesión 1 jul 2026 (vuelta a Claude tras Antigravity)

Saneamiento completo en 6 commits (d2df575..fd79102): deps reparadas (clsx, tsx,
@huggingface/transformers), 3 tests de matching arreglados (GENERIC_TOKENS),
scraper con precio/sku/stock por variante Jumpseller, redirect 308 de URLs
legacy, hardening (allowlist next/image, headers, throttle login, SQL
parametrizado, caches acotados, CI + Dependabot), 81 scripts one-shot
archivados en scripts/archive (quedan 31 activos), y fix de variantes fantasma
que ocultaban tiendas en el detalle (afectaba 7 productos, ej.
clipper/lighter-classic mostraba 1/4). Tests 124/124, E2E 5/5.

## Tareas Pendientes

- **Node local:** actualizar a 22 LTS (está en 20.11, bajo el engine de varias deps; el CI ya usa 22).
- **Scraper:** quinta tienda (en pausa por solicitud del usuario).
- **npm audit:** quedan 2 moderadas del postcss embebido en Next; se resuelven cuando Next actualice.
