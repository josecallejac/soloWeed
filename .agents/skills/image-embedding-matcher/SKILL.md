---
name: image-embedding-matcher
description: "Flujo para encontrar y validar matches visuales semánticos de ofertas usando Inteligencia Artificial local (CLIP)."
---

# Flujo de Matching Semántico de Imágenes

Cuando el usuario pida mejorar el matching visual o buscar matches ocultos por IA:

1. **Ejecutar el Escáner Semántico:**
   Ejecuta `npm run match:embedding`. Este script puede demorar si hay nuevas imágenes sin calcular en caché.

2. **Analizar los Resultados:**
   Lee la salida del script. Busca los pares con similitud `>88%` (especialmente los marcados con `*` >95%).

3. **Filtrar Falsos Positivos de Volumen (CRÍTICO):**
   La IA semántica considera que "Un papelillo OCB" y "Una caja display de 50 OCB" son la misma entidad conceptual. 
   **Debes descartar** manualmente cualquier match donde una oferta sea la unidad y la otra el pack/display, verificando los títulos y precios.

4. **Aplicar los Matches Validados:**
   Una vez confirmados los matches verdaderos por texto/precio, **nunca escribas en Prisma manualmente**. Crea un script dirigido (ej. `scripts/apply-ai-matches.ts`) que actualice el `productId` de las ofertas huérfanas al producto correspondiente y ejecútalo con `npx tsx`.
