# Curation and Matching Difference Report

Generated: 2026-06-09T18:12:08.909Z

## Executive Summary

| Metric | dev_recovered.db | baseline.db | test.db |
| --- | --- | --- | --- |
| **Total Products** | 220 | 206 | 206 |
| **Unlinked Offers** | 822 | 856 | 856 |
| **Total Offers** | 1444 | 1444 | 1444 |

### baseline.db vs test.db Comparison
✅ **No differences found between baseline.db and test.db.** Both databases have identical product groupings and unlinked offers.

## test.db vs dev_recovered.db Detailed Differences

### 1. Newly Grouped / Merged Products & Offers (24 instances)
Offers that are grouped in `test.db` but were either unlinked or grouped differently in `dev_recovered.db`.

#### Product: raw/classic-king-size-slim (Papelillos)
- **Name**: Papelillos RAW Classic King Size Slim - Sabanas
- **Offers**: 3
- **Offer list**:
  - **ID 213**: [Fumetas] "Papelillos RAW Classic King Size Slim - Sabanas" (Papelillos) — *Dev Status: linked to raw/classic-king-size-slim*
    URL: https://fumetas.cl/papelillos-raw-classic-king-size-slim-sabanas
  - **ID 499**: [Piranha] "Papelillos RAW Classic King Size Slim | PIRANHA" (Papelillos) — *Dev Status: linked to raw/classic-king-size-slim*
    URL: https://piranha.cl/inicio/7312/papelillos-raw-classic-king-size.html
  - **ID 2235**: [GrowBarato Chile] "RAW King Size Slim, papel de fumar" (Papelillos) — *Dev Status: linked to raw/classic-king-size-slim*
    URL: https://www.growbaratochile.cl/papelillos/raw-classic-king-size-slim.html
- **Pairwise Scores & Reasons**:
  - Match between [fumetas] "Papelillos RAW Classic King Size Slim - Sabanas" and [piranha] "Papelillos RAW Classic King Size Slim | PIRANHA": Score = 1.34 (misma marca, mismo tamano, 5 tokens clave, 1 tokens modelo, 1 descriptores, nombre similar, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos RAW Classic King Size Slim - Sabanas" and [growbarato] "RAW King Size Slim, papel de fumar": Score = 1.34 (misma marca, mismo tamano, 5 tokens clave, 1 tokens modelo, 1 descriptores, nombre similar, precio cercano, modelo classic)

---

#### Product: ocb/x-pert (Papelillos)
- **Name**: Papelillos OCB X-Pert 1 1/4
- **Offers**: 3
- **Offer list**:
  - **ID 217**: [Fumetas] "Papelillos OCB X-Pert 1 1/4" (Papelillos) — *Dev Status: linked to ocb/x-pert*
    URL: https://fumetas.cl/papelillos-ocb-x-pert-1-14
  - **ID 295**: [Piranha] "Papelillo OCB Xpert 1 ¼" (Papelillos) — *Dev Status: linked to ocb/x-pert*
    URL: https://piranha.cl/inicio/671/papelillo-ocb-organico-1-14.html
  - **ID 316**: [GrowBarato Chile] "OCB X-Pert 1 1/4 papel de fumar ultrafino" (Papelillos) — *Dev Status: linked to ocb/x-pert*
    URL: https://www.growbaratochile.cl/papelillos/ocb-x-pert-114.html
- **Pairwise Scores & Reasons**:
  - Match between [fumetas] "Papelillos OCB X-Pert 1 1/4" and [piranha] "Papelillo OCB Xpert 1 ¼": Score = 0.64 (misma marca, mismo tamano, 1 tokens clave, precio cercano)
  - Match between [fumetas] "Papelillos OCB X-Pert 1 1/4" and [growbarato] "OCB X-Pert 1 1/4 papel de fumar ultrafino": Score = 0.89 (misma marca, mismo tamano, 3 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Product: bonglab/dream-rig (Bongs)
- **Name**: Dream Rig-Bonglab
- **Offers**: 3
- **Offer list**:
  - **ID 842**: [Piranha] "Bong Dream Rig" (Bongs) — *Dev Status: linked to bonglab/dream-rig*
    URL: https://piranha.cl/inicio/6063/bong-dream-rig-bonglab-color-a-eleccion.html
  - **ID 2551**: [Astro Growshop] "Dream Rig X4 -Bonglab" (Bongs) — *Dev Status: unlinked*
    URL: https://astrogrowshop.cl/dream-rig-x4-bonglab
  - **ID 2606**: [Astro Growshop] "Dream Rig-Bonglab" (Bongs) — *Dev Status: linked to bonglab/dream-rig*
    URL: https://astrogrowshop.cl/dream-rig-bonglab
- **Pairwise Scores & Reasons**:
  - Match between [piranha] "Bong Dream Rig" and [astrogrowshop] "Dream Rig X4 -Bonglab": Score = 0.89 (misma marca, 2 tokens clave, 1 modelo conocido, 1 tokens modelo, nombre parcialmente similar, precio cercano)
  - Match between [piranha] "Bong Dream Rig" and [astrogrowshop] "Dream Rig-Bonglab": Score = 0.89 (misma marca, 2 tokens clave, 1 modelo conocido, 1 tokens modelo, nombre parcialmente similar, precio cercano)

---

#### Product: raw/girl-metal-medium (Bandejas y ceniceros)
- **Name**: Bandeja RAW metálica Girl - Mediana
- **Offers**: 2
- **Offer list**:
  - **ID 77**: [Astro Growshop] "Bandeja Metálica Girl Mediana-Raw" (Bandejas y ceniceros) — *Dev Status: linked to raw/girl-metal-medium*
    URL: https://astrogrowshop.cl/bandeja-metalica-girl-mediana-raw
  - **ID 2065**: [Fumetas] "Bandeja RAW metálica Girl - Mediana" (Bandejas y ceniceros) — *Dev Status: linked to raw/girl-metal-medium*
    URL: https://fumetas.cl/bandeja-raw-metalica-girl-mediana
- **Pairwise Scores & Reasons**:
  - Match between [astrogrowshop] "Bandeja Metálica Girl Mediana-Raw" and [fumetas] "Bandeja RAW metálica Girl - Mediana": Score = 1.32 (misma marca, mismo material, mismo tamano, 1 tokens clave, 1 tokens modelo, 1 descriptores, nombre similar, precio cercano, modelo girl)

---

#### Product: dynavap/m7 (Vaporizadores herbales)
- **Name**: Vaporizador Mecánico Dynavap M7
- **Offers**: 3
- **Offer list**:
  - **ID 1304**: [Piranha] "Vaporizador DynaVap New The M 7 | PIRANHA" (Vaporizadores herbales) — *Dev Status: linked to dynavap/m7*
    URL: https://piranha.cl/inicio/8510/vaporizador-dynavap-new-the-m-7.html
  - **ID 2035**: [Fumetas] "Vaporizador Mecánico Dynavap M7" (Vaporizadores herbales) — *Dev Status: linked to dynavap/m7*
    URL: https://fumetas.cl/vaporizador-dynavap-m7
  - **ID 2553**: [Astro Growshop] "Vaporizador The New M7-Dynavap" (Vaporizadores herbales) — *Dev Status: linked to dynavap/m7*
    URL: https://astrogrowshop.cl/vaporizador-the-m7-dynavap
- **Pairwise Scores & Reasons**:
  - Match between [piranha] "Vaporizador DynaVap New The M 7 | PIRANHA" and [fumetas] "Vaporizador Mecánico Dynavap M7": Score = 0.52 (misma marca, 2 tokens clave, precio cercano)
  - Match between [piranha] "Vaporizador DynaVap New The M 7 | PIRANHA" and [astrogrowshop] "Vaporizador The New M7-Dynavap": Score = 0.69 (misma marca, 3 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Product: calvo/bowl-14mm (Repuestos para bongs y vaporizadores)
- **Name**: Calvo Glass Quemador Pyrex - Macho 14mm
- **Offers**: 3
- **Offer list**:
  - **ID 834**: [Piranha] "Quemador Macho 14mm" (Repuestos para bongs y vaporizadores) — *Dev Status: linked to calvo/bowl-14mm*
    URL: https://piranha.cl/inicio/2834/quemador-macho-calvo-14mm-color-a-eleccion.html
  - **ID 1381**: [GrowBarato Chile] "Quemador Calvo Glass 14mm Cuerno | Bowl vidrio bong verde amarillo morado" (Repuestos para bongs y vaporizadores) — *Dev Status: unlinked*
    URL: https://www.growbaratochile.cl/parafernalia/quemador-cuerno-14mm-calvo-glass.html
  - **ID 2949**: [Fumetas] "Calvo Glass Quemador Pyrex - Macho 14mm" (Repuestos para bongs y vaporizadores) — *Dev Status: linked to calvo/bowl-14mm*
    URL: https://fumetas.cl/calvo-glass-quemador-pyrex-macho-14mm
- **Pairwise Scores & Reasons**:
  - Match between [piranha] "Quemador Macho 14mm" and [growbarato] "Quemador Calvo Glass 14mm Cuerno | Bowl vidrio bong verde amarillo morado": Score = 0.72 (misma marca, mismo tamano, 2 tokens clave, precio cercano)
  - Match between [piranha] "Quemador Macho 14mm" and [fumetas] "Calvo Glass Quemador Pyrex - Macho 14mm": Score = 0.85 (misma marca, mismo tamano, 2 tokens clave, 1 tokens modelo, nombre parcialmente similar)

---

#### Product: ozeta/case-antiolor-small (Contenedores y estuches)
- **Name**: Estuche Anti Olor OZeta Pequeño (Color a elección)
- **Offers**: 2
- **Offer list**:
  - **ID 833**: [Piranha] "Estuche Anti Olor OZeta Pequeño (Color a elección)" (Contenedores y estuches) — *Dev Status: linked to ozeta/case-antiolor-small*
    URL: https://piranha.cl/inicio/1657/estuche-anti-olor-ozeta-pequeno-color-a-eleccion.html
  - **ID 1281**: [Fumetas] "Ozeta Estuche pequeño 2022 - Anti-olor" (Contenedores y estuches) — *Dev Status: linked to ozeta/case-antiolor-small*
    URL: https://fumetas.cl/ozeta-estuche-pequeno-2022-anti-olor
- **Pairwise Scores & Reasons**:
  - Match between [piranha] "Estuche Anti Olor OZeta Pequeño (Color a elección)" and [fumetas] "Ozeta Estuche pequeño 2022 - Anti-olor": Score = 0.73 (misma marca, 4 tokens clave, 1 descriptores, nombre parcialmente similar, precio cercano)

---

#### Product: bonglab/classic-ice (Bongs)
- **Name**: Classic Ice 26Cm-Bonglab
- **Offers**: 2
- **Offer list**:
  - **ID 80**: [Astro Growshop] "Classic Ice 26Cm-Bonglab" (Bongs) — *Dev Status: linked to bonglab/classic-ice*
    URL: https://astrogrowshop.cl/classic-ice-bonglab
  - **ID 489**: [Piranha] "Bong Classic Ice" (Bongs) — *Dev Status: linked to bonglab/classic-ice*
    URL: https://piranha.cl/inicio/6068/bong-classic-ice-bonglab-color-a-eleccion.html
- **Pairwise Scores & Reasons**:
  - Match between [astrogrowshop] "Classic Ice 26Cm-Bonglab" and [piranha] "Bong Classic Ice": Score = 0.93 (misma marca, 2 tokens clave, 1 modelo conocido, 1 tokens modelo, 1 descriptores, nombre parcialmente similar, precio cercano)

---

#### Product: ocb/eco (Moledores)
- **Name**: Moledor OCB Eco Hemp 55mm
- **Offers**: 2
- **Offer list**:
  - **ID 4634**: [Fumetas] "Moledor OCB Eco Hemp 55mm" (Moledores) — *Dev Status: linked to ocb/eco*
    URL: https://fumetas.cl/moledor-ocb-eco-hemp-55mm
  - **ID 4710**: [Astro Growshop] "Moledor Eco Mix-Ocb" (Moledores) — *Dev Status: linked to ocb/eco*
    URL: https://astrogrowshop.cl/moledor-eco-mix-ocb
- **Pairwise Scores & Reasons**:
  - Match between [fumetas] "Moledor OCB Eco Hemp 55mm" and [astrogrowshop] "Moledor Eco Mix-Ocb": Score = 0.71 (misma marca, 2 tokens clave, 1 tokens modelo, nombre parcialmente similar, precio cercano)

---

#### Product: calvo/hitter (Pipas)
- **Name**: Pipa Hitter 12mm Calvo | One Hitter color rosa y negro Chile
- **Offers**: 2
- **Offer list**:
  - **ID 3166**: [GrowBarato Chile] "Pipa Hitter 12mm Calvo | One Hitter color rosa y negro Chile" (Pipas) — *Dev Status: linked to calvo/hitter*
    URL: https://www.growbaratochile.cl/parafernalia/hitter-calvo-.html
  - **ID 8124**: [Fumetas] "Calvo Pipa Hitter 12mm" (Pipas) — *Dev Status: linked to calvo/hitter*
    URL: https://fumetas.cl/calvo-pipa-hitter-12mm
- **Pairwise Scores & Reasons**:
  - Match between [growbarato] "Pipa Hitter 12mm Calvo | One Hitter color rosa y negro Chile" and [fumetas] "Calvo Pipa Hitter 12mm": Score = 0.83 (misma marca, mismo tamano, 3 tokens clave, nombre parcialmente similar)

---

#### Product: raw/artesano (Papelillos)
- **Name**: Papelillos RAW Artesano 1 1/4
- **Offers**: 2
- **Offer list**:
  - **ID 220**: [Fumetas] "Papelillos RAW Artesano 1 1/4" (Papelillos) — *Dev Status: linked to raw/artesano*
    URL: https://fumetas.cl/papelillos-raw-artesano-1-14
  - **ID 3376**: [Piranha] "Papelillos RAW Artesano 1 1/4" (Papelillos) — *Dev Status: linked to raw/artesano*
    URL: https://piranha.cl/inicio/6460/papelillos-raw-artesano-1-1-4.html
- **Pairwise Scores & Reasons**:
  - Match between [fumetas] "Papelillos RAW Artesano 1 1/4" and [piranha] "Papelillos RAW Artesano 1 1/4": Score = 1.13 (misma marca, mismo tamano, 2 tokens clave, 1 tokens modelo, nombre parcialmente similar, precio cercano, modelo artesano)

---

#### Product: cabo/gear-heavy (Pipas)
- **Name**: Pipa De Mano Heavy Gear
- **Offers**: 3
- **Offer list**:
  - **ID 1278**: [Fumetas] "Cabo Pipa Heavy Gear Black 20mm" (Pipas) — *Dev Status: linked to cabo/gear-heavy*
    URL: https://fumetas.cl/cabo-pipa-heavy-gear-black-20mm
  - **ID 1401**: [GrowBarato Chile] "Pipa De Mano Heavy Gear" (Pipas) — *Dev Status: linked to cabo/gear-heavy*
    URL: https://www.growbaratochile.cl/cabo/pipa-de-mano-heavy-gear.html
  - **ID 9006**: [Astro Growshop] "Heavy Gear -Cabo" (Pipas) — *Dev Status: linked to cabo/gear-heavy*
    URL: https://astrogrowshop.cl/heavy-gear-cabo
- **Pairwise Scores & Reasons**:
  - Match between [fumetas] "Cabo Pipa Heavy Gear Black 20mm" and [growbarato] "Pipa De Mano Heavy Gear": Score = 0.69 (misma marca, 4 tokens clave, nombre parcialmente similar, precio cercano)
  - Match between [fumetas] "Cabo Pipa Heavy Gear Black 20mm" and [astrogrowshop] "Heavy Gear -Cabo": Score = 0.69 (misma marca, 3 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Product: focus-v/tip-saber-tip-1u (Repuestos para bongs y vaporizadores)
- **Name**: Repuesto Saber Replacement Tip Focus V | PIRANHA
- **Offers**: 3
- **Offer list**:
  - **ID 762**: [Astro Growshop] "REPUESTO SABER TIP-FOCUS V" (Repuestos para bongs y vaporizadores) — *Dev Status: linked to focus-v/tip-saber-tip-1u*
    URL: https://astrogrowshop.cl/repuesto-saber-tip-focus-v
  - **ID 3392**: [Piranha] "Repuesto Saber Replacement Tip Focus V | PIRANHA" (Repuestos para bongs y vaporizadores) — *Dev Status: linked to focus-v/tip-saber-tip-1u*
    URL: https://piranha.cl/inicio/8719/repuesto-saber-replacement-tip-focus-v-1u3u.html
  - **ID 3620**: [Astro Growshop] "REPUESTO SABER TIP 3U-FOCUS V" (Repuestos para bongs y vaporizadores) — *Dev Status: unlinked*
    URL: https://astrogrowshop.cl/repuesto-saber-tip-3u-focus-v
- **Pairwise Scores & Reasons**:
  - Match between [astrogrowshop] "REPUESTO SABER TIP-FOCUS V" and [piranha] "Repuesto Saber Replacement Tip Focus V | PIRANHA": Score = 0.78 (misma marca, 5 tokens clave, nombre similar, precio cercano)
  - Match between [astrogrowshop] "REPUESTO SABER TIP-FOCUS V" and [astrogrowshop] "REPUESTO SABER TIP 3U-FOCUS V": Score = 0.72 (misma marca, 6 tokens clave, nombre similar)

---

#### Product: storz-bickel/volcano-classic (Vaporizadores herbales)
- **Name**: Vaporizador Volcano Classi
- **Offers**: 4
- **Offer list**:
  - **ID 496**: [Piranha] "Vaporizador Volcano Classi" (Vaporizadores herbales) — *Dev Status: linked to storz-bickel/volcano-classic*
    URL: https://piranha.cl/inicio/172/vaporizador-volcano-classic-color-a-eleccion.html
  - **ID 1243**: [Fumetas] "Vaporizador Volcano Classic Gold 24K" (Vaporizadores herbales) — *Dev Status: unlinked*
    URL: https://fumetas.cl/vaporizador-storz-bickel-volcano-classic-gold-24k
  - **ID 1442**: [GrowBarato Chile] "Vaporizador Volcano Classic Onyx de Storz y Bickel" (Vaporizadores herbales) — *Dev Status: linked to storz-bickel/volcano-classic*
    URL: https://www.growbaratochile.cl/vaporizadores/vaporizador-volcano-classic-onyx.html
  - **ID 2261**: [GrowBarato Chile] "Volcano Classic y Digital Vaporizador" (Vaporizadores herbales) — *Dev Status: linked to storz-bickel/volcano-classic*
    URL: https://www.growbaratochile.cl/vaporizadores/volcano-classic.html
- **Pairwise Scores & Reasons**:
  - Match between [piranha] "Vaporizador Volcano Classi" and [fumetas] "Vaporizador Volcano Classic Gold 24K": Score = 0.44 (3 tokens clave, 1 tokens modelo, 1 descriptores, precio cercano)
  - Match between [piranha] "Vaporizador Volcano Classi" and [growbarato] "Vaporizador Volcano Classic Onyx de Storz y Bickel": Score = 0.00 (Atributo incompatible)
  - Match between [piranha] "Vaporizador Volcano Classi" and [growbarato] "Volcano Classic y Digital Vaporizador": Score = 0.53 (3 tokens clave, 1 tokens modelo, 1 descriptores, nombre parcialmente similar, precio cercano)

---

#### Product: raw/classic-con-tips (Papelillos)
- **Name**: RAW Connoisseur 1.1/4+ Tips de RAW para armar
- **Offers**: 6
- **Offer list**:
  - **ID 211**: [Fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" (Papelillos) — *Dev Status: linked to raw/classic-con-tips*
    URL: https://fumetas.cl/papelillos-raw-connoisseur-1-14-tips
  - **ID 558**: [GrowBarato Chile] "RAW Connoisseur 1.1/4+ Tips de RAW para armar" (Papelillos) — *Dev Status: linked to raw/classic-con-tips*
    URL: https://www.growbaratochile.cl/papelillos/raw-connoisseur-114-tips.html
  - **ID 1041**: [Piranha] "Papelillo RAW Classic Connoisseur 1 1/4 + Boquilla | PIRANHA" (Papelillos) — *Dev Status: linked to raw/classic-con-tips*
    URL: https://piranha.cl/inicio/7267/papelillos-raw-classic-connoisseur-1-1-4-con-boquillas.html
  - **ID 1042**: [Piranha] "Papelillo RAW Classic 1 1/4 + Filtros Pre-Enrolados | PIRANHA" (Papelillos) — *Dev Status: linked to raw/classic-con-tips*
    URL: https://piranha.cl/inicio/7268/papelillos-raw-classic-1-1-4-filtros-pre-enrolados.html
  - **ID 2292**: [GrowBarato Chile] "RAW Connoisseur 1.1/4+ Tips es kit de fumador" (Papelillos) — *Dev Status: linked to raw/classic-con-tips*
    URL: https://www.growbaratochile.cl/papelillos/raw-connoisseur-114-pre-rolled-tips.html
  - **ID 2434**: [Fumetas] "Papelillos Raw Connoisseur 1 1/4 + Pre Rolled Tips" (Papelillos) — *Dev Status: linked to raw/classic-con-tips*
    URL: https://fumetas.cl/papelillos-raw-connoisseur-1-14-pre-rolled-tips
- **Pairwise Scores & Reasons**:
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [growbarato] "RAW Connoisseur 1.1/4+ Tips de RAW para armar": Score = 1.20 (misma marca, mismo tamano, 4 tokens clave, nombre similar, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [piranha] "Papelillo RAW Classic Connoisseur 1 1/4 + Boquilla | PIRANHA": Score = 1.11 (misma marca, mismo tamano, 3 tokens clave, nombre parcialmente similar, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [piranha] "Papelillo RAW Classic 1 1/4 + Filtros Pre-Enrolados | PIRANHA": Score = 0.94 (misma marca, mismo tamano, 2 tokens clave, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [growbarato] "RAW Connoisseur 1.1/4+ Tips es kit de fumador": Score = 1.20 (misma marca, mismo tamano, 4 tokens clave, nombre similar, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Pre Rolled Tips": Score = 1.20 (misma marca, mismo tamano, 5 tokens clave, nombre similar, precio cercano, modelo classic)

---

#### Product: blazy-susan/purple-king-size-slim (Papelillos)
- **Name**: Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos
- **Offers**: 5
- **Offer list**:
  - **ID 1436**: [GrowBarato Chile] "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos" (Papelillos) — *Dev Status: linked to blazy-susan/purple-king-size-slim*
    URL: https://www.growbaratochile.cl/papelillos/blazy-susan-papelillos-king-size-slim-purple.html
  - **ID 2037**: [Fumetas] "Blazy Susan Papelillos King Size Purple" (Papelillos) — *Dev Status: linked to blazy-susan/purple-king-size-slim*
    URL: https://fumetas.cl/blazy-susan-papelillo-king-size-purple
  - **ID 2468**: [Fumetas] "Blazy Susan Deluxe Rolling Kit Purple King Size" (Papelillos) — *Dev Status: linked to blazy-susan/purple-king-size-slim-con-tips*
    URL: https://fumetas.cl/blazy-susan-deluxe-rolling-kit-purple-king-size
  - **ID 2557**: [Astro Growshop] "Papelillo Purple King Size Slim -Blazy Susan" (Papelillos) — *Dev Status: linked to blazy-susan/purple-king-size-slim*
    URL: https://astrogrowshop.cl/papelillo-purple-king-size-slim-blazy-susan
  - **ID 3532**: [Piranha] "Papelillo King Size Slim Blazy Susan Purple | PIRANHA" (Papelillos) — *Dev Status: linked to blazy-susan/purple-king-size-slim*
    URL: https://piranha.cl/inicio/7413/papelillo-king-size-slim-blazy-susan-purple.html
- **Pairwise Scores & Reasons**:
  - Match between [growbarato] "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos" and [fumetas] "Blazy Susan Papelillos King Size Purple": Score = 0.92 (misma marca, mismo tamano, 7 tokens clave, nombre similar)
  - Match between [growbarato] "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos" and [fumetas] "Blazy Susan Deluxe Rolling Kit Purple King Size": Score = 0.00 (Atributo incompatible)
  - Match between [growbarato] "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos" and [astrogrowshop] "Papelillo Purple King Size Slim -Blazy Susan": Score = 0.98 (misma marca, mismo tamano, 7 tokens clave, nombre similar, precio cercano)
  - Match between [growbarato] "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos" and [piranha] "Papelillo King Size Slim Blazy Susan Purple | PIRANHA": Score = 0.92 (misma marca, mismo tamano, 8 tokens clave, nombre similar)

---

#### Product: blazy-susan/pink-king-size-slim (Papelillos)
- **Name**: Papelillo Pink King Size Slim- Blazy Susan
- **Offers**: 4
- **Offer list**:
  - **ID 699**: [Piranha] "Papelillo King Size Slim Blazy Susan Pink | PIRANHA" (Papelillos) — *Dev Status: linked to blazy-susan/pink-king-size-slim*
    URL: https://piranha.cl/inicio/7412/papelillo-king-size-slim-blazy-susan-pink.html
  - **ID 2036**: [Fumetas] "Blazy Susan Papelillos King Size Pink" (Papelillos) — *Dev Status: linked to blazy-susan/pink-king-size-slim*
    URL: https://fumetas.cl/blazy-susan-papelillo-king-size-pink
  - **ID 2467**: [Fumetas] "Blazy Susan Deluxe Rolling Kit Pink King Size" (Papelillos) — *Dev Status: linked to blazy-susan/pink-king-size-slim-con-tips*
    URL: https://fumetas.cl/blazy-susan-deluxe-rolling-kit-pink-king-size
  - **ID 2556**: [Astro Growshop] "Papelillo Pink King Size Slim- Blazy Susan" (Papelillos) — *Dev Status: linked to blazy-susan/pink-king-size-slim*
    URL: https://astrogrowshop.cl/papelillo-pink-king-size-slim-blazy-susan
- **Pairwise Scores & Reasons**:
  - Match between [piranha] "Papelillo King Size Slim Blazy Susan Pink | PIRANHA" and [fumetas] "Blazy Susan Papelillos King Size Pink": Score = 0.98 (misma marca, mismo tamano, 7 tokens clave, nombre similar, precio cercano)
  - Match between [piranha] "Papelillo King Size Slim Blazy Susan Pink | PIRANHA" and [fumetas] "Blazy Susan Deluxe Rolling Kit Pink King Size": Score = 0.00 (Atributo incompatible)
  - Match between [piranha] "Papelillo King Size Slim Blazy Susan Pink | PIRANHA" and [astrogrowshop] "Papelillo Pink King Size Slim- Blazy Susan": Score = 0.92 (misma marca, mismo tamano, 8 tokens clave, nombre similar)

---

#### Product: ocb/premium-con-tips (Papelillos)
- **Name**: OCB Premium 1.1/4 + Tips
- **Offers**: 3
- **Offer list**:
  - **ID 292**: [Piranha] "Papelillo OCB Negro Premium 1 ¼ + Boquilla" (Papelillos) — *Dev Status: linked to ocb/premium-con-tips*
    URL: https://piranha.cl/inicio/6100/papelillo-ocb-negro-premium-1-14-boquilla.html
  - **ID 311**: [GrowBarato Chile] "OCB Premium 1.1/4 + Tips" (Papelillos) — *Dev Status: linked to ocb/premium-con-tips*
    URL: https://www.growbaratochile.cl/papelillos/ocb-premium-114-tips.html
  - **ID 1252**: [Fumetas] "OCB Papelillos Premium 1 1/4 + Tips" (Papelillos) — *Dev Status: linked to ocb/premium-con-tips*
    URL: https://fumetas.cl/papelilos-ocb-premium-1-14-tips
- **Pairwise Scores & Reasons**:
  - Match between [piranha] "Papelillo OCB Negro Premium 1 ¼ + Boquilla" and [growbarato] "OCB Premium 1.1/4 + Tips": Score = 0.72 (misma marca, mismo tamano, 2 tokens clave, precio cercano)
  - Match between [piranha] "Papelillo OCB Negro Premium 1 ¼ + Boquilla" and [fumetas] "OCB Papelillos Premium 1 1/4 + Tips": Score = 0.72 (misma marca, mismo tamano, 2 tokens clave, precio cercano)

---

#### Product: the-bulldog/plastic-3-partes-63mm (Moledores)
- **Name**: Moledor Plástico Bulldog 3 Partes 60mm | Grinder The Bulldog
- **Offers**: 4
- **Offer list**:
  - **ID 24**: [Astro Growshop] "Moledor Plastico 3 Partes - Bulldog" (Moledores) — *Dev Status: linked to the-bulldog/plastic-3-partes-63mm*
    URL: https://astrogrowshop.cl/moledor-plastico-3-partes-bulldog
  - **ID 2024**: [Fumetas] "Moledor plástico Bulldog 3 partes 60mm" (Moledores) — *Dev Status: linked to the-bulldog/plastic-3-partes-63mm*
    URL: https://fumetas.cl/moledor-plastico-bulldog-3-partes
  - **ID 5623**: [Piranha] "Moledor Plástico Bulldog 6cm 2 Partes" (Moledores) — *Dev Status: unlinked*
    URL: https://piranha.cl/inicio/223/moledor-plastico-bulldog.html
  - **ID 9444**: [GrowBarato Chile] "Moledor Plástico Bulldog 3 Partes 60mm | Grinder The Bulldog" (Moledores) — *Dev Status: linked to the-bulldog/plastic-3-partes-63mm*
    URL: https://www.growbaratochile.cl/parafernalia/moledor-plastico-transparente-bulldog-amsterdam.html
- **Pairwise Scores & Reasons**:
  - Match between [astrogrowshop] "Moledor Plastico 3 Partes - Bulldog" and [fumetas] "Moledor plástico Bulldog 3 partes 60mm": Score = 0.92 (misma marca, mismo material, 5 tokens clave, nombre similar, precio cercano)
  - Match between [astrogrowshop] "Moledor Plastico 3 Partes - Bulldog" and [piranha] "Moledor Plástico Bulldog 6cm 2 Partes": Score = 0.00 (Atributo incompatible)
  - Match between [astrogrowshop] "Moledor Plastico 3 Partes - Bulldog" and [growbarato] "Moledor Plástico Bulldog 3 Partes 60mm | Grinder The Bulldog": Score = 0.83 (misma marca, mismo material, 4 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Product: calvo/banger-flat-bucket-macho-90-14mm (Accesorios de extraccion)
- **Name**: Banger Calvo Flat Bucket 90° - Macho 14mm
- **Offers**: 3
- **Offer list**:
  - **ID 1410**: [GrowBarato Chile] "Flat Bucket Banger 90° 14mm | Calvo Glass de Cuarzo Durabilidad y Calor Uniforme" (Accesorios de extraccion) — *Dev Status: linked to calvo/banger-flat-bucket-macho-90-14mm*
    URL: https://www.growbaratochile.cl/pipas-bongs-y-cachimbas/banger-flat-bucket-90-14mm-calvo-glass.html
  - **ID 2149**: [Fumetas] "Banger Calvo Flat Bucket 45° - Macho 14mm" (Accesorios de extraccion) — *Dev Status: unlinked*
    URL: https://fumetas.cl/banger-calvo-flat-bucket-45-macho-14mm
  - **ID 2151**: [Fumetas] "Banger Calvo Flat Bucket 90° - Macho 14mm" (Accesorios de extraccion) — *Dev Status: linked to calvo/banger-flat-bucket-macho-90-14mm*
    URL: https://fumetas.cl/banger-calvo-flat-bucket-90-macho-14mm
- **Pairwise Scores & Reasons**:
  - Match between [growbarato] "Flat Bucket Banger 90° 14mm | Calvo Glass de Cuarzo Durabilidad y Calor Uniforme" and [fumetas] "Banger Calvo Flat Bucket 45° - Macho 14mm": Score = 1.01 (misma marca, mismo tamano, 2 tokens clave, 2 tokens modelo, nombre parcialmente similar, precio cercano)
  - Match between [growbarato] "Flat Bucket Banger 90° 14mm | Calvo Glass de Cuarzo Durabilidad y Calor Uniforme" and [fumetas] "Banger Calvo Flat Bucket 90° - Macho 14mm": Score = 1.01 (misma marca, mismo tamano, 2 tokens clave, 3 tokens modelo, nombre parcialmente similar, precio cercano)

---

#### Product: calvo/banger-simple-macho-90-14mm (Accesorios de extraccion)
- **Name**: Banger Regular Full Weld 14 mm Calvo Glass
- **Offers**: 3
- **Offer list**:
  - **ID 1432**: [GrowBarato Chile] "Banger Regular Full Weld 14 mm Calvo Glass" (Accesorios de extraccion) — *Dev Status: linked to calvo/banger-simple-macho-90-14mm*
    URL: https://www.growbaratochile.cl/bho-extracciones/banger-calvo-classic-full-weld.html
  - **ID 2993**: [Fumetas] "Calvo Glass Banger Full Weld Regular Macho 14mm" (Accesorios de extraccion) — *Dev Status: linked to calvo/banger-simple-macho-90-14mm*
    URL: https://fumetas.cl/calvo-glass-banger-full-weld-macho-14mm
  - **ID 2994**: [Fumetas] "Calvo Glass Banger Quarzo 45° Macho 14mm" (Accesorios de extraccion) — *Dev Status: unlinked*
    URL: https://fumetas.cl/calvo-glass-banger-quarzo-45-macho-14mm
- **Pairwise Scores & Reasons**:
  - Match between [growbarato] "Banger Regular Full Weld 14 mm Calvo Glass" and [fumetas] "Calvo Glass Banger Full Weld Regular Macho 14mm": Score = 1.24 (misma marca, mismo material, mismo tamano, 2 tokens clave, 3 tokens modelo, nombre similar, precio cercano)
  - Match between [growbarato] "Banger Regular Full Weld 14 mm Calvo Glass" and [fumetas] "Calvo Glass Banger Quarzo 45° Macho 14mm": Score = 0.00 (Modelo incompatible)

---

#### Product: cabo/clear-gear-heavy (Pipas)
- **Name**: CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA
- **Offers**: 2
- **Offer list**:
  - **ID 8102**: [Fumetas] "Cabo Pipa Heavy Gear Clear 20mm" (Pipas) — *Dev Status: linked to cabo/clear-gear-heavy*
    URL: https://fumetas.cl/cabo-pipa-heavy-gear-clear-20mm
  - **ID 8959**: [Piranha] "CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA" (Pipas) — *Dev Status: linked to cabo/gear-heavy*
    URL: https://piranha.cl/inicio/7456/cabo-heavy-gear-20mm-clearblack.html
- **Pairwise Scores & Reasons**:
  - Match between [fumetas] "Cabo Pipa Heavy Gear Clear 20mm" and [piranha] "CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA": Score = 0.96 (misma marca, mismo tamano, 3 tokens clave, 1 descriptores, nombre similar)

---

#### Product: ocb/premium-king-size-slim (Papelillos)
- **Name**: OCB Premium Slim King Size 32 hojas
- **Offers**: 2
- **Offer list**:
  - **ID 296**: [Piranha] "Papelillo OCB Negro King Size Slim" (Papelillos) — *Dev Status: linked to ocb/premium-king-size-slim*
    URL: https://piranha.cl/inicio/1171/papelillo-ocb-negro-king-size-slim.html
  - **ID 307**: [GrowBarato Chile] "OCB Premium Slim King Size 32 hojas" (Papelillos) — *Dev Status: linked to ocb/premium-king-size-slim*
    URL: https://www.growbaratochile.cl/papelillos/ocb-premium-slim-king-size.html
- **Pairwise Scores & Reasons**:
  - Match between [piranha] "Papelillo OCB Negro King Size Slim" and [growbarato] "OCB Premium Slim King Size 32 hojas": Score = 0.89 (misma marca, mismo tamano, 4 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Product: ocb/ultimate-king-size-slim (Papelillos)
- **Name**: Papelillo Slim Ultimate King Size- Ocb
- **Offers**: 3
- **Offer list**:
  - **ID 508**: [Piranha] "Papelillo OCB Ultimate Rolls Slim | PIRANHA" (Papelillos) — *Dev Status: unlinked*
    URL: https://piranha.cl/inicio/8380/ocb-ultimate-rolls-slim.html
  - **ID 2040**: [Fumetas] "OCB Papelillos Ultimate Slim King Size" (Papelillos) — *Dev Status: linked to ocb/ultimate-king-size-slim*
    URL: https://fumetas.cl/ocb-papelillos-ultimate-slim-king-size
  - **ID 2566**: [Astro Growshop] "Papelillo Slim Ultimate King Size- Ocb" (Papelillos) — *Dev Status: linked to ocb/ultimate-king-size-slim*
    URL: https://astrogrowshop.cl/papelillo-slim-ultimate-king-size-ocb
- **Pairwise Scores & Reasons**:
  - Match between [piranha] "Papelillo OCB Ultimate Rolls Slim | PIRANHA" and [fumetas] "OCB Papelillos Ultimate Slim King Size": Score = 0.00 (Atributo incompatible)
  - Match between [piranha] "Papelillo OCB Ultimate Rolls Slim | PIRANHA" and [astrogrowshop] "Papelillo Slim Ultimate King Size- Ocb": Score = 0.00 (Atributo incompatible)

---

### 2. Lost / Split Groupings (37 instances)
Offers that were grouped together in `dev_recovered.db` but are now split or unlinked in `test.db`.

#### Original Product: raw/classic-king-size-slim (Papelillos)
- **Name**: Papelillos RAW Classic King Size Slim - Sabanas
- **Offers**: 4
- **Offer list**:
  - **ID 213**: [Fumetas] "Papelillos RAW Classic King Size Slim - Sabanas" (Papelillos) — *Test Status: linked to raw/classic-king-size-slim*
    URL: https://fumetas.cl/papelillos-raw-classic-king-size-slim-sabanas
  - **ID 499**: [Piranha] "Papelillos RAW Classic King Size Slim | PIRANHA" (Papelillos) — *Test Status: linked to raw/classic-king-size-slim*
    URL: https://piranha.cl/inicio/7312/papelillos-raw-classic-king-size.html
  - **ID 2235**: [GrowBarato Chile] "RAW King Size Slim, papel de fumar" (Papelillos) — *Test Status: linked to raw/classic-king-size-slim*
    URL: https://www.growbaratochile.cl/papelillos/raw-classic-king-size-slim.html
  - **ID 2525**: [Astro Growshop] "Papelillos Classic King Size Slim 50 Ud-Raw" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillos-classic-king-size-slim-50-ud-raw
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [fumetas] "Papelillos RAW Classic King Size Slim - Sabanas" and [piranha] "Papelillos RAW Classic King Size Slim | PIRANHA": Score = 1.34 (misma marca, mismo tamano, 5 tokens clave, 1 tokens modelo, 1 descriptores, nombre similar, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos RAW Classic King Size Slim - Sabanas" and [growbarato] "RAW King Size Slim, papel de fumar": Score = 1.34 (misma marca, mismo tamano, 5 tokens clave, 1 tokens modelo, 1 descriptores, nombre similar, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos RAW Classic King Size Slim - Sabanas" and [astrogrowshop] "Papelillos Classic King Size Slim 50 Ud-Raw": Score = 0.00 (Cantidad o formato distinto)

---

#### Original Product: ocb/x-pert (Papelillos)
- **Name**: Papelillos OCB X-Pert 1 1/4
- **Offers**: 4
- **Offer list**:
  - **ID 217**: [Fumetas] "Papelillos OCB X-Pert 1 1/4" (Papelillos) — *Test Status: linked to ocb/x-pert*
    URL: https://fumetas.cl/papelillos-ocb-x-pert-1-14
  - **ID 295**: [Piranha] "Papelillo OCB Xpert 1 ¼" (Papelillos) — *Test Status: linked to ocb/x-pert*
    URL: https://piranha.cl/inicio/671/papelillo-ocb-organico-1-14.html
  - **ID 316**: [GrowBarato Chile] "OCB X-Pert 1 1/4 papel de fumar ultrafino" (Papelillos) — *Test Status: linked to ocb/x-pert*
    URL: https://www.growbaratochile.cl/papelillos/ocb-x-pert-114.html
  - **ID 787**: [Astro Growshop] "Papelillo Xpert 1 1/4 Ud-Ocb" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillo-xpert-1-14-ud-ocb
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [fumetas] "Papelillos OCB X-Pert 1 1/4" and [piranha] "Papelillo OCB Xpert 1 ¼": Score = 0.64 (misma marca, mismo tamano, 1 tokens clave, precio cercano)
  - Match between [fumetas] "Papelillos OCB X-Pert 1 1/4" and [growbarato] "OCB X-Pert 1 1/4 papel de fumar ultrafino": Score = 0.89 (misma marca, mismo tamano, 3 tokens clave, nombre parcialmente similar, precio cercano)
  - Match between [fumetas] "Papelillos OCB X-Pert 1 1/4" and [astrogrowshop] "Papelillo Xpert 1 1/4 Ud-Ocb": Score = 0.64 (misma marca, mismo tamano, 1 tokens clave, precio cercano)

---

#### Original Product: bonglab/dream-rig (Bongs)
- **Name**: Dream Rig-Bonglab
- **Offers**: 2
- **Offer list**:
  - **ID 842**: [Piranha] "Bong Dream Rig" (Bongs) — *Test Status: linked to bonglab/dream-rig*
    URL: https://piranha.cl/inicio/6063/bong-dream-rig-bonglab-color-a-eleccion.html
  - **ID 2606**: [Astro Growshop] "Dream Rig-Bonglab" (Bongs) — *Test Status: linked to bonglab/dream-rig*
    URL: https://astrogrowshop.cl/dream-rig-bonglab
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [piranha] "Bong Dream Rig" and [astrogrowshop] "Dream Rig-Bonglab": Score = 0.89 (misma marca, 2 tokens clave, 1 modelo conocido, 1 tokens modelo, nombre parcialmente similar, precio cercano)

---

#### Original Product: raw/girl-metal-medium (Bandejas y ceniceros)
- **Name**: Bandeja RAW metálica Girl - Mediana
- **Offers**: 3
- **Offer list**:
  - **ID 77**: [Astro Growshop] "Bandeja Metálica Girl Mediana-Raw" (Bandejas y ceniceros) — *Test Status: linked to raw/girl-metal-medium*
    URL: https://astrogrowshop.cl/bandeja-metalica-girl-mediana-raw
  - **ID 494**: [Piranha] "Bandeja Metálica RAW Girl | PIRANHA" (Bandejas y ceniceros) — *Test Status: unlinked*
    URL: https://piranha.cl/inicio/7282/bandeja-metalica-raw-girl-tamano-a-eleccion.html
  - **ID 2065**: [Fumetas] "Bandeja RAW metálica Girl - Mediana" (Bandejas y ceniceros) — *Test Status: linked to raw/girl-metal-medium*
    URL: https://fumetas.cl/bandeja-raw-metalica-girl-mediana
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [astrogrowshop] "Bandeja Metálica Girl Mediana-Raw" and [piranha] "Bandeja Metálica RAW Girl | PIRANHA": Score = 0.84 (misma marca, mismo material, 1 tokens clave, 1 tokens modelo, modelo girl)
  - Match between [astrogrowshop] "Bandeja Metálica Girl Mediana-Raw" and [fumetas] "Bandeja RAW metálica Girl - Mediana": Score = 1.32 (misma marca, mismo material, mismo tamano, 1 tokens clave, 1 tokens modelo, 1 descriptores, nombre similar, precio cercano, modelo girl)

---

#### Original Product: dynavap/m7 (Vaporizadores herbales)
- **Name**: Vaporizador Mecánico Dynavap M7
- **Offers**: 4
- **Offer list**:
  - **ID 1304**: [Piranha] "Vaporizador DynaVap New The M 7 | PIRANHA" (Vaporizadores herbales) — *Test Status: linked to dynavap/m7*
    URL: https://piranha.cl/inicio/8510/vaporizador-dynavap-new-the-m-7.html
  - **ID 1382**: [GrowBarato Chile] "Vaporizador DynaVap The M7 | Vaporizador Herbal sin Batería – GrowBaratoChile" (Vaporizadores herbales) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/vaporizadores/vaporizador-dynavap-the-m7.html
  - **ID 2035**: [Fumetas] "Vaporizador Mecánico Dynavap M7" (Vaporizadores herbales) — *Test Status: linked to dynavap/m7*
    URL: https://fumetas.cl/vaporizador-dynavap-m7
  - **ID 2553**: [Astro Growshop] "Vaporizador The New M7-Dynavap" (Vaporizadores herbales) — *Test Status: linked to dynavap/m7*
    URL: https://astrogrowshop.cl/vaporizador-the-m7-dynavap
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [piranha] "Vaporizador DynaVap New The M 7 | PIRANHA" and [growbarato] "Vaporizador DynaVap The M7 | Vaporizador Herbal sin Batería – GrowBaratoChile": Score = 0.00 (Atributo incompatible)
  - Match between [piranha] "Vaporizador DynaVap New The M 7 | PIRANHA" and [fumetas] "Vaporizador Mecánico Dynavap M7": Score = 0.52 (misma marca, 2 tokens clave, precio cercano)
  - Match between [piranha] "Vaporizador DynaVap New The M 7 | PIRANHA" and [astrogrowshop] "Vaporizador The New M7-Dynavap": Score = 0.69 (misma marca, 3 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Original Product: calvo/bowl-14mm (Repuestos para bongs y vaporizadores)
- **Name**: Calvo Glass Quemador Pyrex - Macho 14mm
- **Offers**: 2
- **Offer list**:
  - **ID 834**: [Piranha] "Quemador Macho 14mm" (Repuestos para bongs y vaporizadores) — *Test Status: linked to calvo/bowl-14mm*
    URL: https://piranha.cl/inicio/2834/quemador-macho-calvo-14mm-color-a-eleccion.html
  - **ID 2949**: [Fumetas] "Calvo Glass Quemador Pyrex - Macho 14mm" (Repuestos para bongs y vaporizadores) — *Test Status: linked to calvo/bowl-14mm*
    URL: https://fumetas.cl/calvo-glass-quemador-pyrex-macho-14mm
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [piranha] "Quemador Macho 14mm" and [fumetas] "Calvo Glass Quemador Pyrex - Macho 14mm": Score = 0.85 (misma marca, mismo tamano, 2 tokens clave, 1 tokens modelo, nombre parcialmente similar)

---

#### Original Product: ozeta/case-antiolor-small (Contenedores y estuches)
- **Name**: Estuche Anti Olor OZeta Pequeño (Color a elección)
- **Offers**: 3
- **Offer list**:
  - **ID 543**: [GrowBarato Chile] "Estuche Anti-Olor perfecto para el día a día" (Contenedores y estuches) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/ozeta/estuche-anti-olor.html
  - **ID 833**: [Piranha] "Estuche Anti Olor OZeta Pequeño (Color a elección)" (Contenedores y estuches) — *Test Status: linked to ozeta/case-antiolor-small*
    URL: https://piranha.cl/inicio/1657/estuche-anti-olor-ozeta-pequeno-color-a-eleccion.html
  - **ID 1281**: [Fumetas] "Ozeta Estuche pequeño 2022 - Anti-olor" (Contenedores y estuches) — *Test Status: linked to ozeta/case-antiolor-small*
    URL: https://fumetas.cl/ozeta-estuche-pequeno-2022-anti-olor
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Estuche Anti-Olor perfecto para el día a día" and [piranha] "Estuche Anti Olor OZeta Pequeño (Color a elección)": Score = 0.60 (misma marca, 4 tokens clave, precio cercano)
  - Match between [growbarato] "Estuche Anti-Olor perfecto para el día a día" and [fumetas] "Ozeta Estuche pequeño 2022 - Anti-olor": Score = 0.69 (misma marca, 4 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Original Product: bonglab/classic-ice (Bongs)
- **Name**: Classic Ice 26Cm-Bonglab
- **Offers**: 3
- **Offer list**:
  - **ID 80**: [Astro Growshop] "Classic Ice 26Cm-Bonglab" (Bongs) — *Test Status: linked to bonglab/classic-ice*
    URL: https://astrogrowshop.cl/classic-ice-bonglab
  - **ID 489**: [Piranha] "Bong Classic Ice" (Bongs) — *Test Status: linked to bonglab/classic-ice*
    URL: https://piranha.cl/inicio/6068/bong-classic-ice-bonglab-color-a-eleccion.html
  - **ID 2317**: [GrowBarato Chile] "Bong Pyrex Classic resistente y de calidad" (Bongs) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/bonglab/bong-pyrex-classic.html
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [astrogrowshop] "Classic Ice 26Cm-Bonglab" and [piranha] "Bong Classic Ice": Score = 0.93 (misma marca, 2 tokens clave, 1 modelo conocido, 1 tokens modelo, 1 descriptores, nombre parcialmente similar, precio cercano)
  - Match between [astrogrowshop] "Classic Ice 26Cm-Bonglab" and [growbarato] "Bong Pyrex Classic resistente y de calidad": Score = 0.52 (misma marca, 1 tokens clave, 1 tokens modelo, 1 descriptores)

---

#### Original Product: ocb/eco (Moledores)
- **Name**: Moledor OCB Eco Hemp 55mm
- **Offers**: 3
- **Offer list**:
  - **ID 1053**: [Piranha] "Moledor OCB Plant Composite Biodegradable 5,5cm 2 Partes | PIRANHA" (Moledores) — *Test Status: unlinked*
    URL: https://piranha.cl/inicio/8385/moledor-ocb-plant-composite-biodegradable-55cm-2-partes-color-aleatorio.html
  - **ID 4634**: [Fumetas] "Moledor OCB Eco Hemp 55mm" (Moledores) — *Test Status: linked to ocb/eco*
    URL: https://fumetas.cl/moledor-ocb-eco-hemp-55mm
  - **ID 4710**: [Astro Growshop] "Moledor Eco Mix-Ocb" (Moledores) — *Test Status: linked to ocb/eco*
    URL: https://astrogrowshop.cl/moledor-eco-mix-ocb
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [piranha] "Moledor OCB Plant Composite Biodegradable 5,5cm 2 Partes | PIRANHA" and [fumetas] "Moledor OCB Eco Hemp 55mm": Score = 0.00 (Atributo incompatible)
  - Match between [piranha] "Moledor OCB Plant Composite Biodegradable 5,5cm 2 Partes | PIRANHA" and [astrogrowshop] "Moledor Eco Mix-Ocb": Score = 0.52 (misma marca, 2 tokens clave, precio cercano)

---

#### Original Product: calvo/hitter (Pipas)
- **Name**: Pipa Hitter 12mm Calvo | One Hitter color rosa y negro Chile
- **Offers**: 3
- **Offer list**:
  - **ID 3166**: [GrowBarato Chile] "Pipa Hitter 12mm Calvo | One Hitter color rosa y negro Chile" (Pipas) — *Test Status: linked to calvo/hitter*
    URL: https://www.growbaratochile.cl/parafernalia/hitter-calvo-.html
  - **ID 8124**: [Fumetas] "Calvo Pipa Hitter 12mm" (Pipas) — *Test Status: linked to calvo/hitter*
    URL: https://fumetas.cl/calvo-pipa-hitter-12mm
  - **ID 9052**: [Astro Growshop] "Hitter Signature- Calvo Glass" (Pipas) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/hitter-signature-calvo-glass
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Pipa Hitter 12mm Calvo | One Hitter color rosa y negro Chile" and [fumetas] "Calvo Pipa Hitter 12mm": Score = 0.83 (misma marca, mismo tamano, 3 tokens clave, nombre parcialmente similar)
  - Match between [growbarato] "Pipa Hitter 12mm Calvo | One Hitter color rosa y negro Chile" and [astrogrowshop] "Hitter Signature- Calvo Glass": Score = 0.46 (misma marca, 2 tokens clave)

---

#### Original Product: raw/artesano (Papelillos)
- **Name**: Papelillos RAW Artesano 1 1/4
- **Offers**: 3
- **Offer list**:
  - **ID 220**: [Fumetas] "Papelillos RAW Artesano 1 1/4" (Papelillos) — *Test Status: linked to raw/artesano*
    URL: https://fumetas.cl/papelillos-raw-artesano-1-14
  - **ID 2687**: [Astro Growshop] "PAPELILLOS ARTESANO 1 1/4 15U-RAW" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillos-artesano-1-14-15u-raw
  - **ID 3376**: [Piranha] "Papelillos RAW Artesano 1 1/4" (Papelillos) — *Test Status: linked to raw/artesano*
    URL: https://piranha.cl/inicio/6460/papelillos-raw-artesano-1-1-4.html
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [fumetas] "Papelillos RAW Artesano 1 1/4" and [astrogrowshop] "PAPELILLOS ARTESANO 1 1/4 15U-RAW": Score = 0.00 (Cantidad o formato distinto)
  - Match between [fumetas] "Papelillos RAW Artesano 1 1/4" and [piranha] "Papelillos RAW Artesano 1 1/4": Score = 1.13 (misma marca, mismo tamano, 2 tokens clave, 1 tokens modelo, nombre parcialmente similar, precio cercano, modelo artesano)

---

#### Original Product: cabo/gear-heavy (Pipas)
- **Name**: Pipa De Mano Heavy Gear
- **Offers**: 4
- **Offer list**:
  - **ID 1278**: [Fumetas] "Cabo Pipa Heavy Gear Black 20mm" (Pipas) — *Test Status: linked to cabo/gear-heavy*
    URL: https://fumetas.cl/cabo-pipa-heavy-gear-black-20mm
  - **ID 1401**: [GrowBarato Chile] "Pipa De Mano Heavy Gear" (Pipas) — *Test Status: linked to cabo/gear-heavy*
    URL: https://www.growbaratochile.cl/cabo/pipa-de-mano-heavy-gear.html
  - **ID 8959**: [Piranha] "CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA" (Pipas) — *Test Status: linked to cabo/clear-gear-heavy*
    URL: https://piranha.cl/inicio/7456/cabo-heavy-gear-20mm-clearblack.html
  - **ID 9006**: [Astro Growshop] "Heavy Gear -Cabo" (Pipas) — *Test Status: linked to cabo/gear-heavy*
    URL: https://astrogrowshop.cl/heavy-gear-cabo
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [fumetas] "Cabo Pipa Heavy Gear Black 20mm" and [growbarato] "Pipa De Mano Heavy Gear": Score = 0.69 (misma marca, 4 tokens clave, nombre parcialmente similar, precio cercano)
  - Match between [fumetas] "Cabo Pipa Heavy Gear Black 20mm" and [piranha] "CABO Heavy Gear 20mm (Clear/Black) - CABO | PIRANHA": Score = 0.96 (misma marca, mismo tamano, 3 tokens clave, 1 descriptores, nombre similar)
  - Match between [fumetas] "Cabo Pipa Heavy Gear Black 20mm" and [astrogrowshop] "Heavy Gear -Cabo": Score = 0.69 (misma marca, 3 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Original Product: focus-v/tip-saber-tip-1u (Repuestos para bongs y vaporizadores)
- **Name**: Repuesto Saber Replacement Tip Focus V | PIRANHA
- **Offers**: 2
- **Offer list**:
  - **ID 762**: [Astro Growshop] "REPUESTO SABER TIP-FOCUS V" (Repuestos para bongs y vaporizadores) — *Test Status: linked to focus-v/tip-saber-tip-1u*
    URL: https://astrogrowshop.cl/repuesto-saber-tip-focus-v
  - **ID 3392**: [Piranha] "Repuesto Saber Replacement Tip Focus V | PIRANHA" (Repuestos para bongs y vaporizadores) — *Test Status: linked to focus-v/tip-saber-tip-1u*
    URL: https://piranha.cl/inicio/8719/repuesto-saber-replacement-tip-focus-v-1u3u.html
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [astrogrowshop] "REPUESTO SABER TIP-FOCUS V" and [piranha] "Repuesto Saber Replacement Tip Focus V | PIRANHA": Score = 0.78 (misma marca, 5 tokens clave, nombre similar, precio cercano)

---

#### Original Product: storz-bickel/volcano-classic (Vaporizadores herbales)
- **Name**: Vaporizador Volcano Classi
- **Offers**: 3
- **Offer list**:
  - **ID 496**: [Piranha] "Vaporizador Volcano Classi" (Vaporizadores herbales) — *Test Status: linked to storz-bickel/volcano-classic*
    URL: https://piranha.cl/inicio/172/vaporizador-volcano-classic-color-a-eleccion.html
  - **ID 1442**: [GrowBarato Chile] "Vaporizador Volcano Classic Onyx de Storz y Bickel" (Vaporizadores herbales) — *Test Status: linked to storz-bickel/volcano-classic*
    URL: https://www.growbaratochile.cl/vaporizadores/vaporizador-volcano-classic-onyx.html
  - **ID 2261**: [GrowBarato Chile] "Volcano Classic y Digital Vaporizador" (Vaporizadores herbales) — *Test Status: linked to storz-bickel/volcano-classic*
    URL: https://www.growbaratochile.cl/vaporizadores/volcano-classic.html
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [piranha] "Vaporizador Volcano Classi" and [growbarato] "Vaporizador Volcano Classic Onyx de Storz y Bickel": Score = 0.00 (Atributo incompatible)
  - Match between [piranha] "Vaporizador Volcano Classi" and [growbarato] "Volcano Classic y Digital Vaporizador": Score = 0.53 (3 tokens clave, 1 tokens modelo, 1 descriptores, nombre parcialmente similar, precio cercano)

---

#### Original Product: puffco/vaporizer-peak-pro (Vaporizadores herbales)
- **Name**: Puffco Vaporizador Peak Pro
- **Offers**: 3
- **Offer list**:
  - **ID 2086**: [Fumetas] "Puffco Vaporizador New Peak Pro + Chamber 3D XL" (Vaporizadores herbales) — *Test Status: unlinked*
    URL: https://fumetas.cl/puffco-vaporizador-new-peak-pro
  - **ID 2263**: [GrowBarato Chile] "Puffco Peak Pro vaporizador" (Vaporizadores herbales) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/vaporizadores/puffco-peak-pro.html
  - **ID 2481**: [Fumetas] "Puffco Vaporizador Peak Pro" (Vaporizadores herbales) — *Test Status: unlinked*
    URL: https://fumetas.cl/vaporizador-puffco-peak-pro
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [fumetas] "Puffco Vaporizador New Peak Pro + Chamber 3D XL" and [growbarato] "Puffco Peak Pro vaporizador": Score = 0.00 (Atributo incompatible)
  - Match between [fumetas] "Puffco Vaporizador New Peak Pro + Chamber 3D XL" and [fumetas] "Puffco Vaporizador Peak Pro": Score = 0.00 (Atributo incompatible)

---

#### Original Product: puffco/vaporizer-peak (Vaporizadores herbales)
- **Name**: Vaporizador Puffco New Peak | PIRANHA
- **Offers**: 2
- **Offer list**:
  - **ID 657**: [Fumetas] "Vaporizador Puffco Peak 2024" (Vaporizadores herbales) — *Test Status: unlinked*
    URL: https://fumetas.cl/puffco-peak-vaporizador-extractos
  - **ID 678**: [Piranha] "Vaporizador Puffco New Peak | PIRANHA" (Vaporizadores herbales) — *Test Status: unlinked*
    URL: https://piranha.cl/inicio/7665/vaporizador-puffco-new-peak-color-a-eleccion.html
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [fumetas] "Vaporizador Puffco Peak 2024" and [piranha] "Vaporizador Puffco New Peak | PIRANHA": Score = 0.60 (misma marca, 3 tokens clave, precio cercano)

---

#### Original Product: raw/classic-con-tips (Papelillos)
- **Name**: RAW Connoisseur 1.1/4+ Tips de RAW para armar
- **Offers**: 7
- **Offer list**:
  - **ID 211**: [Fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" (Papelillos) — *Test Status: linked to raw/classic-con-tips*
    URL: https://fumetas.cl/papelillos-raw-connoisseur-1-14-tips
  - **ID 558**: [GrowBarato Chile] "RAW Connoisseur 1.1/4+ Tips de RAW para armar" (Papelillos) — *Test Status: linked to raw/classic-con-tips*
    URL: https://www.growbaratochile.cl/papelillos/raw-connoisseur-114-tips.html
  - **ID 793**: [Astro Growshop] "PAPELILLOS CONNOISSEUR + TIPS PREENROLADOS 1 1/4 24U-RAW" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillos-connoisseur-tips-preenrolados-1-14-24u-raw
  - **ID 1041**: [Piranha] "Papelillo RAW Classic Connoisseur 1 1/4 + Boquilla | PIRANHA" (Papelillos) — *Test Status: linked to raw/classic-con-tips*
    URL: https://piranha.cl/inicio/7267/papelillos-raw-classic-connoisseur-1-1-4-con-boquillas.html
  - **ID 1042**: [Piranha] "Papelillo RAW Classic 1 1/4 + Filtros Pre-Enrolados | PIRANHA" (Papelillos) — *Test Status: linked to raw/classic-con-tips*
    URL: https://piranha.cl/inicio/7268/papelillos-raw-classic-1-1-4-filtros-pre-enrolados.html
  - **ID 2292**: [GrowBarato Chile] "RAW Connoisseur 1.1/4+ Tips es kit de fumador" (Papelillos) — *Test Status: linked to raw/classic-con-tips*
    URL: https://www.growbaratochile.cl/papelillos/raw-connoisseur-114-pre-rolled-tips.html
  - **ID 2434**: [Fumetas] "Papelillos Raw Connoisseur 1 1/4 + Pre Rolled Tips" (Papelillos) — *Test Status: linked to raw/classic-con-tips*
    URL: https://fumetas.cl/papelillos-raw-connoisseur-1-14-pre-rolled-tips
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [growbarato] "RAW Connoisseur 1.1/4+ Tips de RAW para armar": Score = 1.20 (misma marca, mismo tamano, 4 tokens clave, nombre similar, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [astrogrowshop] "PAPELILLOS CONNOISSEUR + TIPS PREENROLADOS 1 1/4 24U-RAW": Score = 0.00 (Cantidad o formato distinto)
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [piranha] "Papelillo RAW Classic Connoisseur 1 1/4 + Boquilla | PIRANHA": Score = 1.11 (misma marca, mismo tamano, 3 tokens clave, nombre parcialmente similar, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [piranha] "Papelillo RAW Classic 1 1/4 + Filtros Pre-Enrolados | PIRANHA": Score = 0.94 (misma marca, mismo tamano, 2 tokens clave, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [growbarato] "RAW Connoisseur 1.1/4+ Tips es kit de fumador": Score = 1.20 (misma marca, mismo tamano, 4 tokens clave, nombre similar, precio cercano, modelo classic)
  - Match between [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Tips" and [fumetas] "Papelillos Raw Connoisseur 1 1/4 + Pre Rolled Tips": Score = 1.20 (misma marca, mismo tamano, 5 tokens clave, nombre similar, precio cercano, modelo classic)

---

#### Original Product: blazy-susan/purple-king-size-slim (Papelillos)
- **Name**: Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos
- **Offers**: 4
- **Offer list**:
  - **ID 1436**: [GrowBarato Chile] "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos" (Papelillos) — *Test Status: linked to blazy-susan/purple-king-size-slim*
    URL: https://www.growbaratochile.cl/papelillos/blazy-susan-papelillos-king-size-slim-purple.html
  - **ID 2037**: [Fumetas] "Blazy Susan Papelillos King Size Purple" (Papelillos) — *Test Status: linked to blazy-susan/purple-king-size-slim*
    URL: https://fumetas.cl/blazy-susan-papelillo-king-size-purple
  - **ID 2557**: [Astro Growshop] "Papelillo Purple King Size Slim -Blazy Susan" (Papelillos) — *Test Status: linked to blazy-susan/purple-king-size-slim*
    URL: https://astrogrowshop.cl/papelillo-purple-king-size-slim-blazy-susan
  - **ID 3532**: [Piranha] "Papelillo King Size Slim Blazy Susan Purple | PIRANHA" (Papelillos) — *Test Status: linked to blazy-susan/purple-king-size-slim*
    URL: https://piranha.cl/inicio/7413/papelillo-king-size-slim-blazy-susan-purple.html
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos" and [fumetas] "Blazy Susan Papelillos King Size Purple": Score = 0.92 (misma marca, mismo tamano, 7 tokens clave, nombre similar)
  - Match between [growbarato] "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos" and [astrogrowshop] "Papelillo Purple King Size Slim -Blazy Susan": Score = 0.98 (misma marca, mismo tamano, 7 tokens clave, nombre similar, precio cercano)
  - Match between [growbarato] "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos" and [piranha] "Papelillo King Size Slim Blazy Susan Purple | PIRANHA": Score = 0.92 (misma marca, mismo tamano, 8 tokens clave, nombre similar)

---

#### Original Product: blazy-susan/pink-king-size-slim (Papelillos)
- **Name**: Papelillo Pink King Size Slim- Blazy Susan
- **Offers**: 3
- **Offer list**:
  - **ID 699**: [Piranha] "Papelillo King Size Slim Blazy Susan Pink | PIRANHA" (Papelillos) — *Test Status: linked to blazy-susan/pink-king-size-slim*
    URL: https://piranha.cl/inicio/7412/papelillo-king-size-slim-blazy-susan-pink.html
  - **ID 2036**: [Fumetas] "Blazy Susan Papelillos King Size Pink" (Papelillos) — *Test Status: linked to blazy-susan/pink-king-size-slim*
    URL: https://fumetas.cl/blazy-susan-papelillo-king-size-pink
  - **ID 2556**: [Astro Growshop] "Papelillo Pink King Size Slim- Blazy Susan" (Papelillos) — *Test Status: linked to blazy-susan/pink-king-size-slim*
    URL: https://astrogrowshop.cl/papelillo-pink-king-size-slim-blazy-susan
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [piranha] "Papelillo King Size Slim Blazy Susan Pink | PIRANHA" and [fumetas] "Blazy Susan Papelillos King Size Pink": Score = 0.98 (misma marca, mismo tamano, 7 tokens clave, nombre similar, precio cercano)
  - Match between [piranha] "Papelillo King Size Slim Blazy Susan Pink | PIRANHA" and [astrogrowshop] "Papelillo Pink King Size Slim- Blazy Susan": Score = 0.92 (misma marca, mismo tamano, 8 tokens clave, nombre similar)

---

#### Original Product: ocb/premium-con-tips (Papelillos)
- **Name**: OCB Premium 1.1/4 + Tips
- **Offers**: 4
- **Offer list**:
  - **ID 292**: [Piranha] "Papelillo OCB Negro Premium 1 ¼ + Boquilla" (Papelillos) — *Test Status: linked to ocb/premium-con-tips*
    URL: https://piranha.cl/inicio/6100/papelillo-ocb-negro-premium-1-14-boquilla.html
  - **ID 311**: [GrowBarato Chile] "OCB Premium 1.1/4 + Tips" (Papelillos) — *Test Status: linked to ocb/premium-con-tips*
    URL: https://www.growbaratochile.cl/papelillos/ocb-premium-114-tips.html
  - **ID 823**: [Astro Growshop] "Papelillo + Tips Premium 1U-Ocb" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillo-tips-premium-1u-ocb
  - **ID 1252**: [Fumetas] "OCB Papelillos Premium 1 1/4 + Tips" (Papelillos) — *Test Status: linked to ocb/premium-con-tips*
    URL: https://fumetas.cl/papelilos-ocb-premium-1-14-tips
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [piranha] "Papelillo OCB Negro Premium 1 ¼ + Boquilla" and [growbarato] "OCB Premium 1.1/4 + Tips": Score = 0.72 (misma marca, mismo tamano, 2 tokens clave, precio cercano)
  - Match between [piranha] "Papelillo OCB Negro Premium 1 ¼ + Boquilla" and [astrogrowshop] "Papelillo + Tips Premium 1U-Ocb": Score = 0.60 (misma marca, 3 tokens clave, precio cercano)
  - Match between [piranha] "Papelillo OCB Negro Premium 1 ¼ + Boquilla" and [fumetas] "OCB Papelillos Premium 1 1/4 + Tips": Score = 0.72 (misma marca, mismo tamano, 2 tokens clave, precio cercano)

---

#### Original Product: the-bulldog/plastic-3-partes-63mm (Moledores)
- **Name**: Moledor Plástico Bulldog 3 Partes 60mm | Grinder The Bulldog
- **Offers**: 3
- **Offer list**:
  - **ID 24**: [Astro Growshop] "Moledor Plastico 3 Partes - Bulldog" (Moledores) — *Test Status: linked to the-bulldog/plastic-3-partes-63mm*
    URL: https://astrogrowshop.cl/moledor-plastico-3-partes-bulldog
  - **ID 2024**: [Fumetas] "Moledor plástico Bulldog 3 partes 60mm" (Moledores) — *Test Status: linked to the-bulldog/plastic-3-partes-63mm*
    URL: https://fumetas.cl/moledor-plastico-bulldog-3-partes
  - **ID 9444**: [GrowBarato Chile] "Moledor Plástico Bulldog 3 Partes 60mm | Grinder The Bulldog" (Moledores) — *Test Status: linked to the-bulldog/plastic-3-partes-63mm*
    URL: https://www.growbaratochile.cl/parafernalia/moledor-plastico-transparente-bulldog-amsterdam.html
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [astrogrowshop] "Moledor Plastico 3 Partes - Bulldog" and [fumetas] "Moledor plástico Bulldog 3 partes 60mm": Score = 0.92 (misma marca, mismo material, 5 tokens clave, nombre similar, precio cercano)
  - Match between [astrogrowshop] "Moledor Plastico 3 Partes - Bulldog" and [growbarato] "Moledor Plástico Bulldog 3 Partes 60mm | Grinder The Bulldog": Score = 0.83 (misma marca, mismo material, 4 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Original Product: calvo/banger-flat-bucket-macho-90-14mm (Accesorios de extraccion)
- **Name**: Banger Calvo Flat Bucket 90° - Macho 14mm
- **Offers**: 2
- **Offer list**:
  - **ID 1410**: [GrowBarato Chile] "Flat Bucket Banger 90° 14mm | Calvo Glass de Cuarzo Durabilidad y Calor Uniforme" (Accesorios de extraccion) — *Test Status: linked to calvo/banger-flat-bucket-macho-90-14mm*
    URL: https://www.growbaratochile.cl/pipas-bongs-y-cachimbas/banger-flat-bucket-90-14mm-calvo-glass.html
  - **ID 2151**: [Fumetas] "Banger Calvo Flat Bucket 90° - Macho 14mm" (Accesorios de extraccion) — *Test Status: linked to calvo/banger-flat-bucket-macho-90-14mm*
    URL: https://fumetas.cl/banger-calvo-flat-bucket-90-macho-14mm
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Flat Bucket Banger 90° 14mm | Calvo Glass de Cuarzo Durabilidad y Calor Uniforme" and [fumetas] "Banger Calvo Flat Bucket 90° - Macho 14mm": Score = 1.01 (misma marca, mismo tamano, 2 tokens clave, 3 tokens modelo, nombre parcialmente similar, precio cercano)

---

#### Original Product: calvo/banger-simple-macho-90-14mm (Accesorios de extraccion)
- **Name**: Banger Regular Full Weld 14 mm Calvo Glass
- **Offers**: 2
- **Offer list**:
  - **ID 1432**: [GrowBarato Chile] "Banger Regular Full Weld 14 mm Calvo Glass" (Accesorios de extraccion) — *Test Status: linked to calvo/banger-simple-macho-90-14mm*
    URL: https://www.growbaratochile.cl/bho-extracciones/banger-calvo-classic-full-weld.html
  - **ID 2993**: [Fumetas] "Calvo Glass Banger Full Weld Regular Macho 14mm" (Accesorios de extraccion) — *Test Status: linked to calvo/banger-simple-macho-90-14mm*
    URL: https://fumetas.cl/calvo-glass-banger-full-weld-macho-14mm
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Banger Regular Full Weld 14 mm Calvo Glass" and [fumetas] "Calvo Glass Banger Full Weld Regular Macho 14mm": Score = 1.24 (misma marca, mismo material, mismo tamano, 2 tokens clave, 3 tokens modelo, nombre similar, precio cercano)

---

#### Original Product: ocb/premium-king-size-slim (Papelillos)
- **Name**: OCB Premium Slim King Size 32 hojas
- **Offers**: 3
- **Offer list**:
  - **ID 296**: [Piranha] "Papelillo OCB Negro King Size Slim" (Papelillos) — *Test Status: linked to ocb/premium-king-size-slim*
    URL: https://piranha.cl/inicio/1171/papelillo-ocb-negro-king-size-slim.html
  - **ID 307**: [GrowBarato Chile] "OCB Premium Slim King Size 32 hojas" (Papelillos) — *Test Status: linked to ocb/premium-king-size-slim*
    URL: https://www.growbaratochile.cl/papelillos/ocb-premium-slim-king-size.html
  - **ID 784**: [Astro Growshop] "Papelillo Negro King Size 1U-Ocb" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillo-negro-king-size-1u-ocb
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [piranha] "Papelillo OCB Negro King Size Slim" and [growbarato] "OCB Premium Slim King Size 32 hojas": Score = 0.89 (misma marca, mismo tamano, 4 tokens clave, nombre parcialmente similar, precio cercano)
  - Match between [piranha] "Papelillo OCB Negro King Size Slim" and [astrogrowshop] "Papelillo Negro King Size 1U-Ocb": Score = 1.02 (misma marca, mismo tamano, 4 tokens clave, 1 descriptores, nombre similar, precio cercano)

---

#### Original Product: ocb/ultimate-king-size-slim (Papelillos)
- **Name**: Papelillo Slim Ultimate King Size- Ocb
- **Offers**: 3
- **Offer list**:
  - **ID 317**: [GrowBarato Chile] "OCB Slim Ultimate de origen orgánico" (Papelillos) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/papelillos/ocb-slim-ultimate.html
  - **ID 2040**: [Fumetas] "OCB Papelillos Ultimate Slim King Size" (Papelillos) — *Test Status: linked to ocb/ultimate-king-size-slim*
    URL: https://fumetas.cl/ocb-papelillos-ultimate-slim-king-size
  - **ID 2566**: [Astro Growshop] "Papelillo Slim Ultimate King Size- Ocb" (Papelillos) — *Test Status: linked to ocb/ultimate-king-size-slim*
    URL: https://astrogrowshop.cl/papelillo-slim-ultimate-king-size-ocb
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "OCB Slim Ultimate de origen orgánico" and [fumetas] "OCB Papelillos Ultimate Slim King Size": Score = 0.00 (Variante de papel distinta)
  - Match between [growbarato] "OCB Slim Ultimate de origen orgánico" and [astrogrowshop] "Papelillo Slim Ultimate King Size- Ocb": Score = 0.00 (Variante de papel distinta)

---

#### Original Product: ozeta/lonchera-con-clave (Contenedores y estuches)
- **Name**: Lonchera con Clave Anti-Olor Ozeta
- **Offers**: 2
- **Offer list**:
  - **ID 1373**: [GrowBarato Chile] "Lonchera con Clave Anti-Olor Ozeta - GB The Green Brand" (Contenedores y estuches) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/ozeta/lonchera-con-clave-anti-olor-ozeta.html
  - **ID 2058**: [Fumetas] "Ozeta Lonchera con clave - Anti-olor" (Contenedores y estuches) — *Test Status: unlinked*
    URL: https://fumetas.cl/lonchera-con-clave-anti-olor-ozeta
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Lonchera con Clave Anti-Olor Ozeta - GB The Green Brand" and [fumetas] "Ozeta Lonchera con clave - Anti-olor": Score = 0.78 (misma marca, 6 tokens clave, nombre similar, precio cercano)

---

#### Original Product: ozeta/shoulderbag-con-clave (Contenedores y estuches)
- **Name**: Shoulderbag con Clave Anti-olor OZeta
- **Offers**: 2
- **Offer list**:
  - **ID 1385**: [GrowBarato Chile] "Shoulderbag con Clave Anti-olor OZeta" (Contenedores y estuches) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/ozeta/shoulderbag-con-clave-anti-olor-ozeta.html
  - **ID 2059**: [Fumetas] "Ozeta Shoulderbag con Clave - Anti-olor" (Contenedores y estuches) — *Test Status: unlinked*
    URL: https://fumetas.cl/ozeta-shoulderbag-con-clave-anti-olor
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Shoulderbag con Clave Anti-olor OZeta" and [fumetas] "Ozeta Shoulderbag con Clave - Anti-olor": Score = 0.78 (misma marca, 6 tokens clave, nombre similar, precio cercano)

---

#### Original Product: blazy-susan/pink-king-size-slim-con-tips (Papelillos)
- **Name**: Blazy Susan Deluxe Rolling Kit Pink King Size
- **Offers**: 3
- **Offer list**:
  - **ID 728**: [Astro Growshop] "Papelillo Pink King Size Slim Deluxe Kit 1U-Blazy Susan" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillo-pink-king-size-slim-deluxe-kit-1u-blazy-susan
  - **ID 2257**: [GrowBarato Chile] "Papelillo King Size Slim Blazy Susan Deluxe Kit Rosado – Papeles de Enrolar Premium" (Papelillos) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/papelillos/blazy-susan-deluxe-kit-king-size-pink.html
  - **ID 2467**: [Fumetas] "Blazy Susan Deluxe Rolling Kit Pink King Size" (Papelillos) — *Test Status: linked to blazy-susan/pink-king-size-slim*
    URL: https://fumetas.cl/blazy-susan-deluxe-rolling-kit-pink-king-size
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [astrogrowshop] "Papelillo Pink King Size Slim Deluxe Kit 1U-Blazy Susan" and [growbarato] "Papelillo King Size Slim Blazy Susan Deluxe Kit Rosado – Papeles de Enrolar Premium": Score = 0.92 (misma marca, mismo tamano, 8 tokens clave, nombre similar)
  - Match between [astrogrowshop] "Papelillo Pink King Size Slim Deluxe Kit 1U-Blazy Susan" and [fumetas] "Blazy Susan Deluxe Rolling Kit Pink King Size": Score = 0.00 (Cantidad o formato distinto)

---

#### Original Product: blazy-susan/purple-king-size-slim-con-tips (Papelillos)
- **Name**: Blazy Susan Deluxe Rolling Kit Purple King Size
- **Offers**: 3
- **Offer list**:
  - **ID 2258**: [GrowBarato Chile] "Papelillo King Size Slim Blazy Susan Deluxe Kit Purple – Papeles de enrolar premium" (Papelillos) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/papelillos/blazy-susan-deluxe-kit-king-size-purple.html
  - **ID 2468**: [Fumetas] "Blazy Susan Deluxe Rolling Kit Purple King Size" (Papelillos) — *Test Status: linked to blazy-susan/purple-king-size-slim*
    URL: https://fumetas.cl/blazy-susan-deluxe-rolling-kit-purple-king-size
  - **ID 2686**: [Astro Growshop] "Papelillo Purple King Size Slim Deluxe Kit 1U-Blazy Susan" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillo-purple-king-size-slim-deluxe-kit-1u-blazy-susan
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Papelillo King Size Slim Blazy Susan Deluxe Kit Purple – Papeles de enrolar premium" and [fumetas] "Blazy Susan Deluxe Rolling Kit Purple King Size": Score = 0.00 (Cantidad o formato distinto)
  - Match between [growbarato] "Papelillo King Size Slim Blazy Susan Deluxe Kit Purple – Papeles de enrolar premium" and [astrogrowshop] "Papelillo Purple King Size Slim Deluxe Kit 1U-Blazy Susan": Score = 0.98 (misma marca, mismo tamano, 9 tokens clave, nombre similar, precio cercano)

---

#### Original Product: blazy-susan/purple-con-tips (Papelillos)
- **Name**: Blazy Susan Deluxe Rolling Kit Purple 1 1/4
- **Offers**: 2
- **Offer list**:
  - **ID 822**: [Astro Growshop] "Papelillo Purple 1 1/4 Deluxe Kit 1Und-Blazy Susan" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillo-purple-1-14-deluxe-kit-1und-blazy-susan
  - **ID 2425**: [Fumetas] "Blazy Susan Deluxe Rolling Kit Purple 1 1/4" (Papelillos) — *Test Status: unlinked*
    URL: https://fumetas.cl/blazy-susan-deluxe-rolling-kit-purple-1-14
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [astrogrowshop] "Papelillo Purple 1 1/4 Deluxe Kit 1Und-Blazy Susan" and [fumetas] "Blazy Susan Deluxe Rolling Kit Purple 1 1/4": Score = 0.00 (Cantidad o formato distinto)

---

#### Original Product: blazy-susan/pink-con-tips (Papelillos)
- **Name**: Blazy Susan Deluxe Rolling Kit Pink 1 1/4
- **Offers**: 1
- **Offer list**:
  - **ID 194**: [Fumetas] "Blazy Susan Deluxe Rolling Kit Pink 1 1/4" (Papelillos) — *Test Status: unlinked*
    URL: https://fumetas.cl/blazy-susan-deluxe-rolling-kit-1-14
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Single-offer product in dev_recovered (no peer matches to score)

---

#### Original Product: raw/pre-roll-king-size-with-tips (Conos y blunts)
- **Name**: RAW Conos Pre-enrolados King Size + Tips
- **Offers**: 2
- **Offer list**:
  - **ID 222**: [Fumetas] "Conos RAW Pre-enrolados King Size" (Conos y blunts) — *Test Status: unlinked*
    URL: https://fumetas.cl/conos-raw-preenrolados-king-size
  - **ID 3189**: [GrowBarato Chile] "Raw Cones de RAW para rellenarlo y darle uso." (Conos y blunts) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/papelillos/raw-cones.html
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [fumetas] "Conos RAW Pre-enrolados King Size" and [growbarato] "Raw Cones de RAW para rellenarlo y darle uso.": Score = 0.00 (Atributo incompatible)

---

#### Original Product: raw/black-con-tips (Papelillos)
- **Name**: RAW Black Connoisseur 1 1/4 + Tips
- **Offers**: 2
- **Offer list**:
  - **ID 200**: [Fumetas] "Papelillos Raw Black Connoisseur 1 1/4 + Tips" (Papelillos) — *Test Status: unlinked*
    URL: https://fumetas.cl/papelillos-raw-black-connoisseur-1-14-tips
  - **ID 792**: [Astro Growshop] "PAPELILLOS BLACK CONNOISSEUR CON TIPS 1 1/4 24U-RAW" (Papelillos) — *Test Status: unlinked*
    URL: https://astrogrowshop.cl/papelillos-black-connoisseur-con-tips-1-14-24u-raw
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [fumetas] "Papelillos Raw Black Connoisseur 1 1/4 + Tips" and [astrogrowshop] "PAPELILLOS BLACK CONNOISSEUR CON TIPS 1 1/4 24U-RAW": Score = 0.00 (Cantidad o formato distinto)

---

#### Original Product: futurola/tyson-king-size-slim-con-tips (Papelillos)
- **Name**: Futurola x Mike Tyson King Size + Tips
- **Offers**: 2
- **Offer list**:
  - **ID 3389**: [Piranha] "Papelillo Tyson x Futurola King Size + Boquilla | PIRANHA" (Papelillos) — *Test Status: unlinked*
    URL: https://piranha.cl/inicio/7165/mike-tyson-x-futurola-papelillo-king-size-boquilla.html
  - **ID 3775**: [Fumetas] "Futurola x Mike Tyson Papelillos King Size + Tips" (Papelillos) — *Test Status: unlinked*
    URL: https://fumetas.cl/futurola-x-mike-tyson-papelillos-king-size-tips
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [piranha] "Papelillo Tyson x Futurola King Size + Boquilla | PIRANHA" and [fumetas] "Futurola x Mike Tyson Papelillos King Size + Tips": Score = 0.89 (misma marca, mismo tamano, 5 tokens clave, nombre parcialmente similar, precio cercano)

---

#### Original Product: the-bulldog/metalico-swing (Moledores)
- **Name**: Moledor Metálico Bulldog Swing Giratorio
- **Offers**: 2
- **Offer list**:
  - **ID 2298**: [GrowBarato Chile] "Moledor Bulldog Ámsterdam Metálico Swing Giratorio" (Moledores) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/moledores/moledor-bulldog-amsterdam-metalico-swing-giratorio.html
  - **ID 4656**: [Fumetas] "Moledor metálico Swing Bulldog 60mm" (Moledores) — *Test Status: unlinked*
    URL: https://fumetas.cl/moledor-metalico-swing-bulldog
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Moledor Bulldog Ámsterdam Metálico Swing Giratorio" and [fumetas] "Moledor metálico Swing Bulldog 60mm": Score = 0.93 (misma marca, mismo material, 4 tokens clave, 1 tokens modelo, nombre parcialmente similar, precio cercano)

---

#### Original Product: dynavap/m7-xl (Vaporizadores herbales)
- **Name**: Vaporizador Dynavap M7 XL
- **Offers**: 2
- **Offer list**:
  - **ID 1370**: [GrowBarato Chile] "Vaporizador Dynavap M7 XL | Versión extendida sin batería" (Vaporizadores herbales) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/vaporizadores/vaporizador-dynavap-the-m7-xl.html
  - **ID 1527**: [Fumetas] "Dynavap Vaporizador Mecánico M7 XL" (Vaporizadores herbales) — *Test Status: unlinked*
    URL: https://fumetas.cl/dynavap-vaporizador-mecanico-m7-xl
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "Vaporizador Dynavap M7 XL | Versión extendida sin batería" and [fumetas] "Dynavap Vaporizador Mecánico M7 XL": Score = 0.00 (Atributo incompatible)

---

#### Original Product: raw/classic-mediana (Bandejas y ceniceros)
- **Name**: Bandeja RAW Metálica Classic Mediana
- **Offers**: 3
- **Offer list**:
  - **ID 152**: [GrowBarato Chile] "RAW Bandeja Metálica para liar - GB The Green Brand" (Bandejas y ceniceros) — *Test Status: unlinked*
    URL: https://www.growbaratochile.cl/articulos-para-el-fumador/raw-bandeja-metalica.html
  - **ID 510**: [Piranha] "Bandeja Metálica RAW Classic | PIRANHA" (Bandejas y ceniceros) — *Test Status: unlinked*
    URL: https://piranha.cl/inicio/7283/bandeja-metalica-raw-classic-tamano-a-eleccion.html
  - **ID 2062**: [Fumetas] "Bandeja RAW metálica Classic - Mediana" (Bandejas y ceniceros) — *Test Status: unlinked*
    URL: https://fumetas.cl/bandeja-raw-metalica-classic-mediana
- **Original Pairwise Scores & Reasons (under current matching rules)**:
  - Match between [growbarato] "RAW Bandeja Metálica para liar - GB The Green Brand" and [piranha] "Bandeja Metálica RAW Classic | PIRANHA": Score = 0.00 (Modelo RAW distinto)
  - Match between [growbarato] "RAW Bandeja Metálica para liar - GB The Green Brand" and [fumetas] "Bandeja RAW metálica Classic - Mediana": Score = 0.00 (Modelo RAW distinto)

---

## Audit Against AGENTS.md Curation Rules

Below is an audit of the observed changes against the category-specific curation rules defined in `AGENTS.md` to identify potential false positives.

⚠️ **Potential false positives or rule violations flagged by heuristics:**

- [Repuestos para bongs y vaporizadores] Mixed unit quantities in "Repuesto Saber Replacement Tip Focus V | PIRANHA": contains both multi-packs and single-units.
- [Vaporizadores herbales] Potential mix of Onyx and non-Onyx in product "Vaporizador Volcano Classi": Offers contain both Onyx and non-Onyx variants.
- [Vaporizadores herbales] Potential mix of Gold and non-Gold in product "Vaporizador Volcano Classi": Offers contain both Gold and standard/other variants.
- [Papelillos] Mixed paper formats in "RAW Connoisseur 1.1/4+ Tips de RAW para armar": contains both rolling kits/connoisseur (with tips/trays) and standard paper booklets.
- [Papelillos] Mixed paper packaging in "RAW Connoisseur 1.1/4+ Tips de RAW para armar": contains both rolls (custom length) and standard booklet papers.
- [Papelillos] Mixed paper formats in "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos": contains both rolling kits/connoisseur (with tips/trays) and standard paper booklets.
- [Papelillos] Mixed paper packaging in "Blazy Susan papelillos king size purple – Papeles de enrolar ultra finos": contains both rolls (custom length) and standard booklet papers.
- [Papelillos] Mixed paper formats in "Papelillo Pink King Size Slim- Blazy Susan": contains both rolling kits/connoisseur (with tips/trays) and standard paper booklets.
- [Papelillos] Mixed paper packaging in "Papelillo Pink King Size Slim- Blazy Susan": contains both rolls (custom length) and standard booklet papers.
- [Moledores] Mixed grinder parts in "Moledor Plástico Bulldog 3 Partes 60mm | Grinder The Bulldog": contains different part count indications (2-part vs 3-part vs 4-part).
- [Accesorios de extraccion] Mixed joint angles (45° vs 90°) in "Banger Calvo Flat Bucket 90° - Macho 14mm": Offers contain both angle variants.
- [Papelillos] Mixed paper packaging in "Papelillo Slim Ultimate King Size- Ocb": contains both rolls (custom length) and standard booklet papers.

### Manual Review of Newly Grouped Products
Please inspect the newly grouped/merged list above. Specifically check if any names, descriptions, or store titles indicate different sizes, colors, capacities, or accessory types that shouldn't be grouped under the same product ID.
