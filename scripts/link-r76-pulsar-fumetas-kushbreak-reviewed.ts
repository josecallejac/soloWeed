// Ronda 76 (2026-07-30, 5a sesion): PULSAR, LA MARCA MAS DESAPROVECHADA DEL
// CATALOGO. 194 huerfanas contra 11 productos.
//
// Es el paso 2 del estandar (`docs/NUEVA_TIENDA.md`), pero aplicado como lo que
// de verdad es: no "una tienda nueva contra el resto", sino una MARCA con mucho
// stock huerfano en las dos unicas tiendas que la venden.
//
// ── LA ASIMETRIA QUE DEFINE LA RONDA ────────────────────────────────────────
// Pulsar solo existe en Fumetas y Kushbreak. Fumetas tiene 169 huerfanas y
// Kushbreak 25. Esa asimetria no es casual: Fumetas publica CADA COLOR como una
// oferta aparte de una misma ficha (el 2.0 Pro tiene 18 colores), mientras
// Kushbreak publica una sola oferta por modelo.
//
// Por eso el factor limitante son las 25 de Kushbreak, no las 169: cada oferta
// de Kushbreak que encuentre a su familia en Fumetas es UN producto. Emparejan
// 13. Las otras 12 son modelos que Fumetas no trae (APX III, APX Wax V3, Barb
// Fire H2O, Barb Fire Slim, Hammer Glycerin, Shift, Syndr, DL VLT, Slim Spinner,
// Matte Grinder Rasta...) y quedan huerfanas LEGITIMAS.
//
// ── COMO SE ARMA CADA GRUPO (y por que no listo las variantes a mano) ───────
// Se declara la oferta de Kushbreak + UNA oferta semilla de Fumetas, y el script
// expande la familia por URL BASE. Verificado antes de escribir esto: cada
// familia de colores de Fumetas es exactamente UNA ficha, o sea una sola URL
// base. Por ejemplo las 12 ofertas del "510 DL" cuelgan todas de
// fumetas.cl/pulsar-bateria-cartridges-510-dl y las 18 del "2.0 Pro" de
// fumetas.cl/pulsar-bateria-cartridges-510-dl-20-pro.
//
// Eso convierte "estos 12 colores son el mismo producto" en una GARANTIA
// ESTRUCTURAL (misma ficha de la tienda) en vez de un juicio mio, y hace
// imposible que se me escape una variante o que meta una de mas.
//
// LA COMPARACION ES POR IGUALDAD EXACTA DE URL BASE, NUNCA POR PREFIJO: si
// fuera por prefijo, ".../510-dl" se tragaria ".../510-dl-20-pro",
// ".../510-dl-5-0" y ".../510-dl-lite", que son cuatro productos distintos con
// precios distintos.
//
// ── LA EVIDENCIA, GRUPO POR GRUPO ──────────────────────────────────────────
// Nombre de modelo identico + precio. Kushbreak es sistematicamente algo mas
// barato, y ninguna pareja pasa de 1,20:
//
//   modelo                 Kushbreak    Fumetas    ratio
//   510 DL                  $19.990     $19.990     1,00
//   510 DL Lite             $14.990     $14.990     1,00
//   510 Voltaje Variable    $12.990     $12.990     1,00
//   Vanish Filtro           $23.990     $23.990     1,00
//   Freezable Glycerin      $24.990     $24.990     1,00
//   510 DL Pipa             $42.990     $44.990     1,05
//   510 Pantalla Digital    $15.990     $16.990     1,06
//   510 Payout 3.0          $18.990     $17.990     1,06
//   510 Payout              $12.990     $11.990     1,08
//   Nectar Dab Straw 25cm   $12.990     $11.990     1,08
//   510 DL Tandem           $38.990     $41.990     1,08
//   510 DL 5.0              $28.990     $31.990     1,10
//   510 DL 2.0 Pro          $24.990     $29.990     1,20
//
// Cinco pares al peso EXACTO. Los nombres de modelo de Pulsar son muy
// especificos ("Payout 3.0", "DL Tandem", "DL 5.0"), asi que el riesgo de
// homonimia es bajo, y las dos tiendas los escriben casi igual.
//
// ── DOS COSAS QUE HUBO QUE MIRAR DOS VECES ─────────────────────────────────
// - of69116 "Nectar Collector BOROSILICATO Colores 25cm" contra of98 "Nectar Dab
//   Straw FULL COLOR 25 cm". Ya existe P10866 "Nectar Collector CUARZO 25cm"
//   con las dos tiendas: o sea que cada tienda vende DOS nectar de 25cm, el de
//   cuarzo (ya curado) y el de vidrio de colores (este). No se pisan.
//   "Nectar collector" y "dab straw" son el mismo objeto.
// - of69219 "510 DL Pipa" lo clasifica el clasificador como "Pipas" y a su
//   contraparte de Fumetas como "Accesorios de extraccion". Es una BATERIA 510
//   con forma de pipa: va a "Otros parafernalia", que es donde ya viven las
//   demas baterias 510 de Pulsar (P10860, P10861). La categoria se fuerza en el
//   spec y no se hereda del clasificador, justamente porque este es
//   inconsistente en esta familia (reparte las mismas baterias entre "Otros
//   parafernalia", "Accesorios de extraccion" y "Repuestos").
//
// ── EL BUG DE MARCA QUE TAPABA PARTE DEL FILON ─────────────────────────────
// of69137 "Focus V Aeris" aparecia como huerfana DE PULSAR: Kushbreak declara
// brand="Pulsar" en un producto cuyo titulo y URL dicen Focus V, y "pulsar"
// (linea 89 de KNOWN_BRAND_PHRASES) le gana a "focus v" (linea 121) por ORDEN.
// Es el patron de r68/r69 por tercera vez. Arreglado con el alias de prioridad
// ["focus v", "focus-v"].
// Efectos colaterales medidos con --dry-run, 4 ofertas y las 4 revisadas:
//   - of32828/of32851 (Astro) airistech -> focus-v: SON MEJORAS. Astro declara
//     brand="FOCUS V" y sus descripciones dicen "repuesto para el dispositivo
//     AERIS"; caian en airistech porque el titulo contiene "AIRIS" (que ademas
//     es OTRA marca, Airistech: aqui "Aeris" es el aparato de Focus V).
//   - of75163 "Ruby Terp 3mm Pack 2" puffco -> focus-v: sigue MAL, pero ya
//     estaba mal. Es de Ruby Pearl Co. y su tienda la declara "Generico", asi
//     que entra por el fallback por description, que name-dropea los
//     vaporizadores compatibles. Se intento registrar la marca y se REVIRTIO:
//     "ruby terp" como frase se llevaba tambien "Calvo Terp Balls Luminosas",
//     que es una regresion peor que el problema. Queda anotado como pendiente
//     aparte; es huerfana y no afecta a ningun producto.
//
// ── FILTRO OBLIGATORIO ─────────────────────────────────────────────────────
// Cada producto nace con EXACTAMENTE 2 tiendas (Fumetas + Kushbreak). No se
// crean productos de 1 tienda (incidente r55). El script lo verifica por grupo.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { normalizeForSearch } from "../src/lib/tokenize";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");

type Spec = {
  name: string;
  modelSlug: string;
  category: string;
  kushbreak: number;
  fumetasSeed: number;
};

const SPECS: Spec[] = [
  { name: "Pulsar Batería Cartridge 510 DL", modelSlug: "510-dl", category: "Otros parafernalia", kushbreak: 69324, fumetasSeed: 20241 },
  { name: "Pulsar Batería Cartridge 510 DL 2.0 Pro", modelSlug: "510-dl-2-0-pro", category: "Otros parafernalia", kushbreak: 69300, fumetasSeed: 20119 },
  { name: "Pulsar Batería Cartridge 510 DL 5.0", modelSlug: "510-dl-5-0", category: "Otros parafernalia", kushbreak: 69315, fumetasSeed: 20182 },
  { name: "Pulsar Batería Cartridge 510 DL Lite", modelSlug: "510-dl-lite", category: "Otros parafernalia", kushbreak: 69115, fumetasSeed: 19332 },
  { name: "Pulsar Batería Cartridge 510 DL Pipa", modelSlug: "510-dl-pipa", category: "Otros parafernalia", kushbreak: 69219, fumetasSeed: 19794 },
  { name: "Pulsar Batería Doble Cartridge 510 DL Tandem", modelSlug: "510-dl-tandem", category: "Otros parafernalia", kushbreak: 69325, fumetasSeed: 20184 },
  { name: "Pulsar Batería Cartridge 510 Payout", modelSlug: "510-payout", category: "Otros parafernalia", kushbreak: 69301, fumetasSeed: 20242 },
  { name: "Pulsar Batería Cartridge 510 Payout 3.0", modelSlug: "510-payout-3-0", category: "Otros parafernalia", kushbreak: 69317, fumetasSeed: 19333 },
  { name: "Pulsar Batería Cartridge 510 Pantalla Digital", modelSlug: "510-pantalla-digital", category: "Otros parafernalia", kushbreak: 69034, fumetasSeed: 20185 },
  { name: "Pulsar Batería Cartridge 510 Voltaje Variable", modelSlug: "510-voltaje-variable", category: "Otros parafernalia", kushbreak: 69035, fumetasSeed: 19334 },
  { name: "Pulsar Vanish Filtro Personal de Olor", modelSlug: "vanish-filtro-personal", category: "Filtros y boquillas", kushbreak: 69221, fumetasSeed: 19944 },
  { name: "Pulsar Pipa Freezable Glycerin Spoon 10cm", modelSlug: "freezable-glycerin-spoon-10cm", category: "Pipas", kushbreak: 69145, fumetasSeed: 19414 },
  { name: "Pulsar Nectar Dab Straw Full Color 25cm", modelSlug: "nectar-dab-straw-full-color-25cm", category: "Accesorios de extraccion", kushbreak: 69116, fumetasSeed: 98 },
];

const baseUrl = (u: string) => u.split("?")[0];

async function main() {
  console.log(APPLY ? "APLICANDO r76\n" : "DRY-RUN r76\n");

  const plan: { spec: Spec; offerIds: number[]; base: string; precios: string }[] = [];
  const vistos = new Set<number>();

  for (const spec of SPECS) {
    const choque = await prisma.product.findFirst({
      where: { brandKey: "pulsar", modelSlug: spec.modelSlug },
      select: { id: true },
    });
    if (choque) throw new Error(`P${choque.id} ya usa pulsar/${spec.modelSlug}`);

    const kb = await prisma.offer.findUnique({
      where: { id: spec.kushbreak },
      select: { id: true, productId: true, title: true, url: true, price: true, sourceCategory: true, store: { select: { slug: true } } },
    });
    if (!kb) throw new Error(`of${spec.kushbreak} no existe`);
    if (kb.store.slug !== "kushbreak") throw new Error(`of${kb.id} no es de kushbreak`);
    if (kb.productId !== null) throw new Error(`of${kb.id} ya cuelga de P${kb.productId}`);

    const semilla = await prisma.offer.findUnique({
      where: { id: spec.fumetasSeed },
      select: { id: true, productId: true, url: true, price: true, storeId: true, store: { select: { slug: true } } },
    });
    if (!semilla) throw new Error(`of${spec.fumetasSeed} no existe`);
    if (semilla.store.slug !== "fumetas") throw new Error(`of${semilla.id} no es de fumetas`);
    if (semilla.productId !== null) throw new Error(`of${semilla.id} ya cuelga de P${semilla.productId}`);

    // Expansion por IGUALDAD EXACTA de URL base (nunca por prefijo).
    const base = baseUrl(semilla.url);
    const candidatas = await prisma.offer.findMany({
      where: { storeId: semilla.storeId, productId: null },
      select: { id: true, url: true, title: true, price: true, inStock: true, sourceCategory: true },
    });
    const familia = candidatas.filter((o) => baseUrl(o.url) === base);
    if (!familia.some((o) => o.id === semilla.id)) throw new Error(`la semilla of${semilla.id} no quedo en su familia`);

    const ids = [kb.id, ...familia.map((o) => o.id)];
    for (const id of ids) {
      if (vistos.has(id)) throw new Error(`of${id} aparece en dos grupos`);
      vistos.add(id);
    }

    for (const o of familia) {
      if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
        throw new Error(`of${o.id} esta FUERA de alcance`);
      }
    }
    if (classifyProduct(kb.title, kb.url, kb.sourceCategory ?? undefined) === null) {
      throw new Error(`of${kb.id} esta FUERA de alcance`);
    }

    const pf = familia.map((o) => o.price).filter((p) => p > 0);
    const ratio = pf.length && kb.price > 0
      ? Math.max(kb.price, Math.min(...pf)) / Math.min(kb.price, Math.min(...pf))
      : 0;
    if (ratio > 2) throw new Error(`${spec.name}: ratio ${ratio.toFixed(2)} > 2`);

    plan.push({
      spec, offerIds: ids, base,
      precios: `kush $${kb.price} / fum $${pf.length ? Math.min(...pf) : 0} = ${ratio.toFixed(2)}`,
    });

    console.log(`NUEVO  pulsar/${spec.modelSlug}  [2t]  ${ids.length} ofertas (1 kushbreak + ${familia.length} fumetas)`);
    console.log(`   "${spec.name}" (${spec.category})`);
    console.log(`   ${plan[plan.length - 1].precios}`);
    console.log(`   ficha fumetas: ${base}`);
    console.log(`   + of${kb.id} [kushbreak] $${kb.price} | ${kb.title}`);
    if (familia.length <= 4) {
      for (const o of familia) console.log(`   + of${o.id} [fumetas] $${o.price} | ${o.title}`);
    } else {
      console.log(`   + ${familia.length} ofertas de fumetas de esa ficha (of${familia.map((o) => o.id).slice(0, 4).join(", of")}, ...)`);
    }
    console.log();
  }

  const total = plan.reduce((s, p) => s + p.offerIds.length, 0);
  console.log(`RESUMEN: ${plan.length} productos nuevos, ${total} ofertas (todas huerfanas hasta ahora)`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  console.log("\n=== APLICANDO ===");
  for (const { spec, offerIds } of plan) {
    const portada = await prisma.offer.findFirst({
      where: { id: { in: offerIds }, imageUrl: { not: null } },
      select: { imageUrl: true },
    });
    const product = await prisma.product.create({
      data: {
        name: spec.name,
        normalizedName: normalizeForSearch(spec.name),
        brand: "Pulsar",
        brandKey: "pulsar",
        modelKey: spec.modelSlug,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: portada?.imageUrl ?? null,
      },
    });
    await prisma.offer.updateMany({
      where: { id: { in: offerIds } },
      data: { productId: product.id, category: spec.category },
    });
    const despues = await prisma.offer.findMany({
      where: { productId: product.id }, select: { storeId: true }, distinct: ["storeId"],
    });
    const ok = despues.length === 2;
    console.log(`${ok ? "OK " : "!! "} P${product.id} pulsar/${spec.modelSlug} -> ${despues.length}t, ${offerIds.length} ofertas`);
    if (!ok) throw new Error(`P${product.id} quedo con ${despues.length} tiendas`);
  }
  console.log("\nAPLICADO r76. Recordar: los productos nuevos nacen con shortDescription null.");
}

main().finally(() => prisma.$disconnect());
