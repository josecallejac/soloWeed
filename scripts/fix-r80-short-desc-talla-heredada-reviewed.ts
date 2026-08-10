// Correccion de las `shortDescription` cuya medida CONTRADICE al propio producto.
// Es texto PUBLICO: alimenta la ficha y el JSON-LD, asi que no puede quedar mal.
//
// ── DE DONDE SALE ESTA LISTA ────────────────────────────────────────────────
// Del barrido de `scripts/audit-short-desc-size-mismatch.ts` sobre los 889
// productos del catalogo: 37 sospechosos (14 CONTRADICE + 23 CONVIVE), de los
// que sobreviven 19 tras revisar la fuente uno por uno.
//
// El modo de fallo es el de r68/r74 y NO lo ve el auditor de cifras inventadas
// (`audit-short-desc-claims.ts`): la cifra SI esta en la fuente, es "respaldada",
// pero pertenece al HERMANO. Se cuela por tres caminos distintos:
//
//   a) La tienda publica la misma descripcion en todas las variantes de tamaño
//      (Astro describe el difusor de 12cm con el texto del de 16,5cm).
//   b) La tienda describe DIRECTAMENTE otra pieza (Astro describe el extractor
//      Kasvi de 125mm con el texto del de 100mm: 12W/130 m3h/34 dB son del 100).
//   c) El resumen describe la FAMILIA en vez del producto (el Glass Cleaner de
//      250 ml diciendo "en formatos de 30 ml a 1 litro").
//
// ── EL CRITERIO ─────────────────────────────────────────────────────────────
// Cuando las tiendas se contradicen entre si (muy comun en cm de bongs y
// estuches: 25 vs 27, 17 vs 18, 22 vs 25), MANDA EL NOMBRE DEL PRODUCTO. El
// nombre es la identidad curada a mano y es lo que el usuario lee arriba de la
// ficha; un resumen que lo contradice se lee como un error aunque la cifra
// exista en alguna tienda. Es la misma regla que [[flujo-verificacion-pares-foto]]
// ya daba para identidad ("los cm difieren entre tiendas para la misma pieza").
//
// Toda cifra que se ESCRIBE aqui viene de una descripcion de origen; no se
// inventa ninguna, que es justo lo que r77 hizo mal.
//
// ── LOS 4 FALSOS POSITIVOS QUE NO SE TOCAN (medidos, no volver a mirarlos) ──
// * P5502  Galaxy New Pro Model "6cm": el resumen dice "46mm x 63mm" y esta BIEN,
//          63mm = 6,3cm. El nombre es el que redondea.
// * P10110 Galaxy Square "5cm": el resumen dice "5,4 x 5,4 x 2,6 cm", correcto.
// * P6773  American Helix Uno OG Mini "12cm": el resumen dice 12,7cm. Las DOS
//          estan respaldadas (Fumetas "Largo: 12cm", Astro "12,7 cm de largo");
//          12,7cm son 5 pulgadas exactas. Redundante, no erroneo.
// * P6010, P5719, P10417, P10418, P10466, P10489, P11056, P11066-68, P5926,
//          P10230, P10703, P10742: declaran DOS magnitudes distintas (diametro y
//          largo, altura y base, filtro y cama). Legitimo, es el falso positivo
//          que r68 ya habia documentado con la pipa "12mm x 75mm".
//
// ── UN CASO QUE NO ES DEL RESUMEN, ES DEL NOMBRE (no se toca aqui) ──────────
// P6777 "Bonglab American Hitter 18mm". El resumen dice "1,8 mm de grosor" y es
// CORRECTO: Fumetas escribe literal "grosor de 1,8 mm" y el titulo de Piranha es
// "Hitter American 1.8mm". El que esta mal es el NOMBRE del producto, que
// convirtio 1,8mm en 18mm (y con el la URL de Piranha). Cambiar `Product.name`
// es otra decision y queda para el usuario; el modelSlug (`american-hitter`) no
// lleva la talla, asi que arreglarlo NO rompe ninguna URL publica.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

type Fix = { id: number; short: string; antes: string; fuente: string };

const FIXES: Fix[] = [
  {
    id: 5768,
    short: "Banger de cuarzo de alta pureza con conexión macho de 14 mm y angulación de 45 grados, para vaporizar concentrados.",
    antes: "decia 'conexion macho de 10mm' contra su propio nombre, que es 14 mm",
    fuente: "Fumetas of2003 'Gracias a su conexion macho de 14mm'; GB of1389 'Macho 14 mm'. El 10mm venia de Astro of741, cuya ficha describe la variante de 10.",
  },
  {
    id: 6774,
    short: "Pipa de vidrio de borosilicato en forma de martillo, 13 cm, con carb lateral para regular la calada y base estable.",
    antes: "decia 12 cm",
    fuente: "Fumetas of8116 y GB of1366 titulan 13 cm ('Wig wag Hammer 13 cm'). El 12 cm sale de la prosa de Astro, que es minoria y contradice al nombre.",
  },
  {
    id: 10105,
    short: "Banger de cuarzo con base de 4 mm y paredes de 2 mm, entrada macho de 14 mm y ángulo de 90°, compatible con carb caps y terp pearls.",
    antes: "nunca decia el joint y daba el angulo como '45°/90°', que no distingue este producto de sus 3 hermanos",
    fuente: "Fumetas of2151 'Su entrada Macho de 14 mm y su angulo de 90°'; Piranha of15642 'Entrada macho de 14mm'.",
  },
  {
    id: 10159,
    short: "Enfriador de humo con glicerina y borosilicato para bongs con quemador macho de 14 mm; 30-40 minutos en el congelador y listo.",
    antes: "decia 'para bongs de 18mm', que es el hermano",
    fuente: "Fumetas of2018 'disenado especificamente para bongs que utilizan quemador macho de 14mm'. Astro of771 lista 'las siguientes medidas: 18Mm, 14Mm' y de ahi se colo el 18.",
  },
  {
    id: 10194,
    short: "Bong de vidrio de borosilicato americano de 22 cm, con percolador en forma de extraterrestre y quemador de 14 mm.",
    antes: "decia 20 cm",
    fuente: "Piranha of1060 'El bong de Pyrex de 22 cms de altura'. El 20 cm venia de Astro of2590.",
  },
  {
    id: 10221,
    short: "Recycler de vidrio borosilicato de 25 cm con percolador Inline de 3 slits y brazos que mantienen el agua en movimiento constante.",
    antes: "decia '25cm: ... 27cm' en la misma frase",
    fuente: "GB of3154 titula y describe 25cm; Fumetas of13169 lo vende como 27cm. Manda el nombre.",
  },
  {
    id: 10231,
    short: "Bong de vidrio de borosilicato de 17 cm de altura, con una esfera central estilo Dragon Ball como pieza distintiva.",
    antes: "decia 18 cm",
    fuente: "Piranha of11187 titula 17cm; Fumetas of12866 titula 18cm. Manda el nombre.",
  },
  {
    id: 10246,
    short: "Limpiador alcalino para pipas de agua y accesorios de vidrio que disuelve resina y alquitrán, en formato de 250 ml.",
    antes: "describia la FAMILIA ('en formatos de 30 ml a 1 litro') en vez de este formato",
    fuente: "Fumetas of13174 'Glass Cleaner 250 ml'; la formula alcalina y la resina/alquitran salen de Fumetas y Astro.",
  },
  {
    id: 10254,
    short: "Pipa de vidrio borosilicato de 15 cm con la tecnología Venturi de American Helix, que hace girar el humo en espiral y suaviza la calada.",
    antes: "decia 12 cm, que es la medida de la Mini (P6773)",
    fuente: "Fumetas of8115 'Con 15 cm de largo'; Astro of12570 '15 cm de largo'. OJO: las descripciones de Astro Rojo/Verde/Azul hablan de 'Pipa Classic Mini ... 12 cm' aunque sus titulos digan Classic OG — copy cruzado, mismo patron que el Santa Cruz de r74.",
  },
  {
    id: 10399,
    short: "Difusor de vidrio Bonglab en color magenta, conexión de 14 mm y 12 cm de largo, compatible con distintos bongs.",
    antes: "decia 16,5 cm",
    fuente: "Piranha of15558 'largo total de 12 cm'; Fumetas of34004 'Largo de 12cm'; GB of2305 'Difusor 14mm 12cm'. Los 16,5 cm son de la prosa de Astro, cuya ficha cubre 14Cm/12Cm con un solo texto.",
  },
  {
    id: 10401,
    short: "Difusor de vidrio premium Bonglab en color negro, conexión de 14 mm y 12 cm de largo, compatible con distintos bongs.",
    antes: "decia '12cm: ... 16.5 cm de longitud' en la misma frase",
    fuente: "Fumetas of12853 'Largo de 12cm'. Mismo origen del 16,5 que P10399.",
  },
  {
    id: 10404,
    short: "Banger de cuarzo con base de 4 mm y paredes de 2 mm, conexión macho de 10 mm y ángulo de 45° para rigs y beakers inclinados.",
    antes: "nunca decia el joint y daba el angulo como '45°/90°'",
    fuente: "Fumetas of1264 'Banger Calvo Flat Bucket 45° - Macho 10mm ... base de 4 mm ... paredes de 2 mm'.",
  },
  {
    id: 10535,
    short: "Rig de vidrio borosilicato de 5 mm y 22 cm de alto, con base de 9 cm de diámetro y percolador que suaviza cada calada.",
    antes: "decia 21 cm",
    fuente: "Fumetas of13296 'base firme de 9 cm de diametro, esta pieza de 22 cm de alto'; el borosilicato de 5 mm es de Astro of17917, que es quien dice 21 cm. Se omite el tipo de percolador porque las dos tiendas no coinciden (Fumetas 'wheel de 9 slits', Astro 'showerhead').",
  },
  {
    id: 10536,
    short: "Estuche antiolor de 22 cm con candado de combinación de 3 dígitos, filtro de carbono activado y cremallera hermética resistente al agua.",
    antes: "decia '22cm: 25 cm' en la misma frase",
    fuente: "Piranha of15884 y Astro of23565 titulan 22 cm (Astro lista sus colores como '22 Cm Black, 15 Cm Black'); Fumetas of13320 lo vende como 25cm. Manda el nombre.",
  },
  {
    id: 10608,
    short: "Adaptador de vidrio de repuesto de 18 mm para el vaporizador G Pen Connect, que permite conectarlo a bongs y piezas de agua con joint hembra.",
    antes: "decia 14 mm dos veces, contra su propio nombre",
    fuente: "Astro of23543 'Glass Adapter Grenco Connect Black 18Mm'; Fumetas of36824 variante '18mm'. El 14 mm entra por Astro of23542, que es la OTRA medida (ver nota de vinculos abajo).",
  },
  {
    id: 10771,
    short: "Extractor tubular in-line de 125 mm en plástico ABS, con 16 W de potencia, 240 m³/h de flujo de aire y solo 35 decibeles de ruido.",
    antes: "decia '100-150 mm, 12 W, 130 M3/H, 34 dB' — TODAS las cifras eran del extractor de 100mm",
    fuente: "Fumetas of50486 (Kasvi Extractor 5''/125mm) 'baja emision de ruido de solo 35 decibeles ... potencia nominal de 16 watts ... flujo de aire de 240 metros cubicos por hora'. La descripcion de Astro of47780 empieza literal con 'El Extractor Kasvi 4''/100mm', o sea describe otra pieza.",
  },
  {
    id: 10829,
    short: "Filtro de carbón activado Kasvi de 315x1200 mm, con cuerpo de aluminio y carbón activo de alta calidad para neutralizar olores.",
    antes: "decia '125x200mm', que es otro filtro de la familia",
    fuente: "Astro of31754 'cuerpo de aluminio y carbon activo de alta calidad'; la medida es la del nombre y la del titulo de Piranha of52581.",
  },
  {
    id: 11013,
    short: "Moledor Galaxy de aluminio de 63 mm y cuatro partes, con dientes afilados, tapa magnética de neodimio y cámara para el keef.",
    antes: "terminaba en 'disponible en medidas 73MM,…'",
    fuente: "Astro of31203 'moledor de cuatro partes fabricado en aluminio ... dientes afilados ... tapa magnetica ... camara de recoleccion de keef'; Fumetas of33554 'tapa magnetica de neodimio'.",
  },
  {
    id: 11043,
    short: "Banger de cuarzo con base de 4 mm y paredes de 2 mm, conexión macho de 10 mm y ángulo de 90°, ideal para rigs compactos.",
    antes: "nunca decia el joint y arrastraba 'para rigs con conexion diagonal', que es el copy del hermano de 45°",
    fuente: "Fumetas of2150 'Con su angulo de 90° y conexion macho de 10mm, se ajusta perfectamente a rigs mas delgados o portatiles'.",
  },
];

// ── VINCULOS SOSPECHOSOS DETECTADOS DE PASO (NO se tocan aqui) ──────────────
// El auditor destapo, como efecto colateral, ofertas cuya TALLA no cuadra con la
// del producto del que cuelgan. La talla de joint (10/14/18mm) es identidad dura
// —[[flujo-verificacion-pares-foto]] dice que "el tamano del titulo manda sobre
// la imagen"— asi que estos merecen revision aparte:
//   P10404 (45°/10mm) tiene of2149 Fumetas "45° - Macho 14mm" y of32873 Astro "90° 10MM"
//   P11043 (90°/10mm) tiene of78984 Astro "45° 14MM"
//   P10105 (90°/14mm) tiene of32872 Astro "45° 14Mm"
//   P10608 (18mm)     tiene of23542 Astro "Glass Adapter ... 14Mm"
//   P10401 (12cm)     tiene of78139 Astro variante "14 CM"
//   P10194 (Space Opera) tiene of13213 Fumetas "Space Horn Rig 21cm", que es otro
//                        modelo por nombre y por percolador (showerhead vs alien)
// Desvincular toca productos protegidos y cambia niveles de tienda: va con OK
// explicito del usuario, nunca de pasada en un fix de texto.

async function main() {
  console.log(APPLY ? "APLICANDO fix-r80\n" : "DRY-RUN fix-r80\n");

  const ids = FIXES.map((f) => f.id);
  if (new Set(ids).size !== ids.length) throw new Error("hay ids repetidos en FIXES");

  for (const f of FIXES) {
    const p = await prisma.product.findUnique({
      where: { id: f.id },
      select: { id: true, name: true, shortDescription: true },
    });
    if (!p) throw new Error(`P${f.id} no existe`);
    if (f.short.length > 200) throw new Error(`P${f.id}: resumen demasiado largo (${f.short.length})`);
    if (p.shortDescription === f.short) {
      console.log(`P${p.id} ya estaba corregido, se salta\n`);
      continue;
    }

    console.log(`P${p.id} ${p.name}`);
    console.log(`   problema: ${f.antes}`);
    console.log(`   fuente  : ${f.fuente}`);
    console.log(`   antes   : ${p.shortDescription ?? "(null)"}`);
    console.log(`   ahora   : ${f.short}  [${f.short.length} chars]`);
    console.log();

    if (APPLY) {
      await prisma.product.update({ where: { id: p.id }, data: { shortDescription: f.short } });
    }
  }

  if (!APPLY) {
    console.log(`(dry-run: no se escribió nada — ${FIXES.length} productos en la lista)`);
    return;
  }

  const pendientes = await prisma.product.count({ where: { shortDescription: null } });
  console.log(`APLICADO ${FIXES.length} resúmenes. Productos sin shortDescription: ${pendientes}`);
}

main().finally(() => prisma.$disconnect());
