// Ronda 73 (2026-07-30, 5a sesion): EL BARRIDO DE TOKENS IDF APLICADO A LAS
// CINCO TIENDAS QUE NUNCA LO HABIAN VISTO.
//
// ── DE DONDE SALE ESTA RONDA ─────────────────────────────────────────────────
// `find-store-upgrades-by-tokens.ts` se construyo el 30 jul PARA Friendly Grow y
// solo se corrio contra las dos tiendas NUEVAS: FG (1 candidato, rechazado) y
// Kushbreak (r69). Nunca se paso por las CUATRO TIENDAS ORIGINALES, que es donde
// vive la mayor parte del catalogo. De ahi salio todo lo de esta ronda: 22 de 22
// ofertas son de Astro, Fumetas, Piranha y GrowBarato, y el re-barrido de
// Kushbreak confirmo el negativo (0 pares nuevos, ya estaba exprimida).
//
// Es la unica herramienta sin banda de precio, sin reja de categoria y sin reja
// de marca, asi que su zona ciega no se solapa con la de las demas.
//
// LECCION GENERALIZABLE: una herramienta nueva se estrena sobre el caso que la
// motivo y despues se da por "ya usada". Hay que barrer con ella el universo
// ENTERO, sobre todo las tiendas viejas, que nadie vuelve a mirar porque se
// asumen agotadas por los metodos anteriores.
//
// El recon que abrio la ronda explica por que rendia tan poco en FG y tanto aca:
//
//   tienda          huerf-stock   sin marca
//   fumetas              1043      75  ( 7%)   <- 968 CON marca, nunca barridas
//   astrogrowshop         388     101  (26%)
//   growbarato            304     155  (51%)
//   piranha               265      87  (33%)
//   kushbreak             142      65  (45%)
//   friendlygrow          649     351  (54%)   <- el caso peor, el ya medido
//
// FG es la tienda MENOS favorable del catalogo y fue justo con la que se estreno
// la herramienta. Fumetas es la mas favorable y estaba sin tocar.
//
// ── LO QUE SE ACEPTA: 18 OFERTAS, 13 PRODUCTOS, 5 SUBEN A 4 TIENDAS ──────────
// Ningun producto tocado esta congelado (todos estaban en 2t o 3t) y TODOS los
// vinculos son "solo sumar": cada grupo aporta una tienda que el producto no
// tenia. Medido sobre el estado PREVIO y por lote, no oferta por oferta (todas
// las ofertas de un grupo son de la MISMA tienda, asi que el lote suma 1 tienda
// por producto, nunca mas).
//
// ── LA EVIDENCIA MAS FUERTE: LA REFERENCIA DE FABRICANTE DE BONGLAB ─────────
// Astro y Fumetas codifican el mismo numero de modelo dentro de su propio SKU:
//
//   producto            SKU Astro          SKU Fumetas     referencia
//   Lucky Goblin        BGBL(K293)COLOR    BLAB-(K293)P    K293
//   Space Oddity Clear  BGBL(K306)CLEAR    BLAB-(K306)     K306
//   Water Fenix         BGBL(KE9)BLUE      BLAB-(KE9)WF    KE9
//
// Es SKU compartido ENTRE tiendas, o sea identidad dura: no hace falta foto. La
// descripcion de Astro del Lucky Goblin lo confirma en texto plano:
// "Referencia: K293 / Fabricante: Bonglab".
//
// ── GRUPO POR GRUPO ─────────────────────────────────────────────────────────
//
// 1) P10638 "Bateria Galaxy 510" [Astro+Piranha] <- 4 ofertas FUMETAS   2t->3t
//    of12989 (base), of34317 (Negro), of34318 (Blanco), of34319 (Azul), $11.490.
//    SKU propio de cada tienda (Astro AYPGABCRG*, Fumetas GLXY-BCAR18*), asi que
//    se resolvio POR FOTO, y hubo que mirar dos fotos de Astro para no rechazarlo
//    mal: la de la ficha base muestra la punta inferior negra LISA y la de Fumetas
//    muestra una PANTALLA LCD encendida (4.0V + indicador de bateria). Parecia el
//    patron Brass Knuckles de r64 (misma marca, "con pantalla" = otro modelo).
//    NO lo es: la foto de la variante Blanca de Astro tiene la MISMA pantalla LCD.
//    El panel es negro brillante y en la primera foto esta APAGADO. Con la pantalla
//    encendida las dos fotos coinciden en todo: wordmark GALAXY subrayado, boton
//    cromado a la misma altura, aro cromado superior, punta negra.
//    Corroboracion textual independiente: el filename de la imagen de Astro es
//    "18v-battery.webp" y la URL base de Fumetas es "galaxy-bateria-cartridge-18v".
//    Ratio 1,05. of34317 y of12989 comparten sku GLXY-BCAR18N e imagen: el Negro
//    ES la variante base, por eso van los dos.
//
// 2) P10547 "Ozeta Techbag Anti-Olor" [Astro+Piranha] <- of19789 FUMETAS 2t->3t
//    $54.990, EXACTAMENTE el precio de Piranha. "Techbag" es nombre de modelo, no
//    descripcion, y aparece literal en las tres tiendas; los SKU lo repiten
//    (Astro TXOZTECHB, Fumetas OZTA-TBAG). La foto cierra: Astro y Fumetas
//    publican LA MISMA toma de fabricante (bolso 2-en-1 acolchado azul metalico,
//    doble compartimento unido por cierre central, logo OZeta en los dos frentes).
//    Astro la titula "Techbag NEGRA" pero publica la foto AZUL -- error de Astro,
//    ya documentado en la memoria, no una variante distinta.
//    TRAMPA EVITADA: el mismo barrido proponia 6 "Ozeta Estuche grande/mediano/
//    pequeño" contra este producto (score 0,41-0,44). Se RECHAZAN: son otra linea
//    y ademas se diferencian por TALLA, que nunca fusiona.
//
// 3) P10538 "Bonglab Bong Lucky Goblin" [Fumetas+Piranha] <- 4 ofertas ASTRO 2t->3t
//    of17165 (base/Green), of31675 (Negro Humo), of31677 (Rosa), of31678 (Blanco).
//    Identidad dura por K293 (arriba). Color fusiona. Ratio 1,02-1,05.
//
// 4) P10394 "BongLab Elty8 Monster Bong 48cm" [Fumetas+Piranha] <- of12302 ASTRO 2t->3t
//    "Elty8 Monster Blue". Token ELTY8 en ambos SKU (BGBLELTY8BLUE / BLAB-ELTY8),
//    precio IDENTICO $64.990 en las tres tiendas, y la descripcion de Astro repite
//    la ficha tecnica del producto: "altura de 48 cm", "quemador macho de 18 mm".
//    Blue es color.
//
// 5) P5531 "Bong Pyrex 28cm Bonglab Space Oddity Clear K306" [Fum+Pir+GB] <- of17921 ASTRO 3t->4t
//    Identidad dura por K306, que ademas ya esta en el NOMBRE del producto. Las
//    dos fichas dicen 28 cm. Ratio 1,15 contra el minimo (GB $69.300).
//
// 6) P10726 "Focus V Saber Dabber Electrico" [Fumetas+Piranha] <- 4 ofertas ASTRO 2t->3t
//    of18091 (base), of33229 (FOREST), of33231 (Negro), of33233 (CLEAR), $69.990.
//    Colores de una misma ficha; of18091 y of33229 comparten sku VPFVSBRFRT e
//    imagen, o sea la base ES la Forest. Piranha lo vende como "Saber Electronic
//    Dab Tool Focus V" a $66.491 (ratio 1,05). Las variantes de Fumetas (Morado,
//    Jade) estan sin stock pero eso no afecta la identidad.
//
// 7) P10163 "Glycerin Green Avalanche Bonglab" [Fum+Pir+GB] <- of33137 ASTRO 3t->4t
//    Astro lo vende como variante "GREEN AVALANCHE" de su ficha "Glycerin".
//    "Green Avalanche" es el nombre de la colorway y coincide literal en las 4
//    tiendas; la descripcion de Astro repite el detalle tecnico de la ficha
//    (glicerina + percolador tree de 4 brazos con 3 slits). Ratio 1,10.
//
// 8) P10744 "Bonglab Bong KE9 Water Fenix 46cm" [Fumetas+GB] <- of17935 ASTRO 2t->3t
//    Identidad dura por KE9. La descripcion de Astro nombra el modelo completo:
//    "El Bonglab Ke9 Water Fenix". Blue es color. Ratio 1,16.
//
// 9) P10858 "Ozeta Bandolera Anti-olor" [Fumetas+Kushbreak] <- of70827 GROWBARATO 2t->3t
//    HACIA FALTA LA FOTO y el precio NO servia: $36.800 cae dentro del rango de
//    los DOS candidatos Ozeta ("Bandolera" P10858 $37.990-$40.990 y "Bandolera
//    Circular" P10235 $34.990-$40.990), y la descripcion de GB es generica ("con
//    Sistema Control de Olores... bonito y discreto diseño"), no dice cual es.
//    La foto zanja: la de GB muestra un bolso RECTANGULAR negro identico al de
//    Kushbreak -- mismo bolsillo frontal con cierre, mismo logo OZeta bordado en
//    negro sobre negro abajo a la derecha ("ahora con el logo en negro", dice la
//    ficha de Kushbreak), misma correa removible con la misma hebilla. Ademas GB
//    fotografia el Kit Fumeta incluido (hitter de vidrio verde, 2 contenedores
//    hermeticos, bandeja, dabbers), que es justo lo que enumera la ficha de
//    Kushbreak: "INCLUYE: 1 Hitter de borosilicato". La Circular es redonda: no
//    se parece en nada.
//
// 10) P10710 "Calvo Bateria Hide Cartridge 510 650mAh" [Astro+Fum+Pir] <- of11427 GROWBARATO 3t->4t
//    Ficha tecnica identica punto por punto: rosca 510, 650 mAh, marca Calvo, y
//    hasta el set de colores ("Disponible en rosado, verde y azul" en GB; Astro
//    vende PINK y GREEN, Fumetas Negro y Verde). "Hidden" es como la nombran GB y
//    Piranha; "Hide" es como la nombran Astro (ESCONDIDA) y Fumetas. Ratio 1,06
//    contra Piranha.
//
// 11) P10667 "Ignite Soplete Phantom" [Astro+Fum+Pir] <- of71140 GROWBARATO 3t->4t
//    El titulo de GB "Soplete Phantom Black-Ignite" es la MISMA cadena que la
//    variante BLACK de Astro ("Soplete Phantom -Ignite - BLACK"), $19.800 contra
//    $19.990. Black es color.
//    RECHAZADO en el mismo barrido: P10663 "Ignite Soplete Phantom MINI" (score
//    0,450). Mini es TALLA, no fusiona.
//
// 12) P10479 "Boquillas RAW Cono Perfecto" [Astro+Fumetas] <- of11241 PIRANHA 2t->3t
//    "Filtros RAW Cono Perfect (32u)" es el mismo nombre de producto traducido a
//    medias; Astro lo llama "TIPS RAW PERFECTO CONO". Los tres precios estan en
//    la misma banda ($690 / $890 / $990), lo que confirma que es el mismo formato
//    de paquete y no una unidad suelta contra una caja. Ratio 1,29.
//
// 13) P5498 "Galaxy Moledor Biodegradable" [Astro+GB+Kushbreak] <- of10784 PIRANHA 3t->4t
//    El titulo de Piranha ("Biodegradable Hemp Grinder Cañamo") NO nombra la
//    marca, que es justo la razon por la que ninguna herramienta con reja de
//    marca lo veia. Su DESCRIPCION la nombra explicitamente: "la linea Hemp de
//    Galaxy Grinders". Precio $4.990, identico al de Astro. Ratio 1,47 contra GB.
//
// ── RECHAZOS QUE VALE LA PENA DEJAR ESCRITOS ────────────────────────────────
// - of32773 "K30 -Bonglab - Negro" [Astro] -> P10344 "Bonglab K30 Fresh 42cm"
//   [3t]. DIFERIDO, no rechazado. La referencia K30 esta compartida en los SKU
//   (BGBLK30BLACK / BLAB-K30B), que es la misma evidencia dura que cerro los
//   otros tres Bonglab, PERO la descripcion de Astro dice "altura de 30 cm" y las
//   otras tres tiendas dicen 42 cm. La talla nunca fusiona, asi que la
//   contradiccion bloquea. Y NO se puede resolver por foto: la imagen de Astro es
//   un placeholder generico de la marca ("astro-bonglab-studio-square-white-v2
//   .webp"), no el producto. Lo mas probable es que el copy de Astro haya
//   deducido "30 cm" del codigo K30, pero eso hay que verificarlo en la tienda,
//   no suponerlo. Queda para la proxima ronda.
// - of20226 "S&B Juego de Mallas FINAS Solid Valve" -> P10372 "...Mallas
//   NORMALES". Score 0,797 y precio identico, pero finas != normales: son dos
//   repuestos distintos del mismo aparato.
// - of12988 "Focus V Atomizador Intelli-Core MAX" -> P10643 "Atomizador
//   Intelli-Core". Max es otro modelo.
// - Los pins HighTrip (Trascendence, Highfries, Cenicero 420, HIGH SKULLS) contra
//   P10682/P10683/P10592/P10495/P10473. Cada pin es un DISEÑO distinto al mismo
//   precio: es edicion, no color. El barrido los emparejo entre si en todas las
//   combinaciones justamente porque el precio y la marca coinciden.
// - Los Zippo (Purple->Green, Filigree->Flame Colorblock, Merlot->Santa Cruz).
//   Mismo argumento; ya habia precedente de rechazo en r66.
// - of19930 "Juego de Piezas de Desgastes Volcano" -> P10385 (ratio 5,07) y ->
//   P10275 "...Mighty" (otro aparato).
// - of32770/of78884/of32771 "Filtro Personal Pro II - Sploofy" -> P10741
//   "Sploofy Cartridge de REPUESTO". El filtro no es su repuesto.
// - of53237/of53238 "Bandeja de Cultivo Kasvi" -> P10787 "Humidificador Kasvi".
//   Ademas cultivo esta fuera de alcance.
// - of69346 "Yocan ZIVA" -> P10521 "Yocan Kodo Pro": modelos distintos pese al
//   precio identico. of68974 "Filtros Gizeh 8mm" -> P10347 "...6mm": talla.
//   of69352 "Silver 1 1/4 LRC" -> P10655 "...Big Smoke King Size": talla.
//
// PENDIENTE ANOTADO (no entra en esta ronda): Fumetas tiene 11 sabores huerfanos
// de "Blunt Soulblime Hemp Wrap x2" a $1.000 y el catalogo solo tiene P11018
// (Chocomint). Es una familia por SABOR, que se comporta como edicion, y ademas
// el P11018 existente ya mezcla el Chocomint de Astro con un "chocolate-2u" de
// Piranha. Revisar la familia entera antes de tocarla.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");

type Grupo = {
  productId: number;
  tiendasAntes: number;
  tienda: string;
  offerIds: number[];
  nota: string;
};

const GRUPOS: Grupo[] = [
  { productId: 10638, tiendasAntes: 2, tienda: "fumetas", offerIds: [12989, 34317, 34318, 34319], nota: "Bateria Galaxy 510 - colores, foto (pantalla LCD) + '18v'" },
  { productId: 10547, tiendasAntes: 2, tienda: "fumetas", offerIds: [19789], nota: "Ozeta Techbag - misma foto de fabricante + precio identico a Piranha" },
  { productId: 10538, tiendasAntes: 2, tienda: "astrogrowshop", offerIds: [17165, 31675, 31677, 31678], nota: "Bonglab Lucky Goblin - SKU compartido K293" },
  { productId: 10394, tiendasAntes: 2, tienda: "astrogrowshop", offerIds: [12302], nota: "BongLab Elty8 Monster 48cm - SKU ELTY8 + precio identico" },
  { productId: 5531, tiendasAntes: 3, tienda: "astrogrowshop", offerIds: [17921], nota: "Bonglab Space Oddity Clear - SKU compartido K306" },
  { productId: 10726, tiendasAntes: 2, tienda: "astrogrowshop", offerIds: [18091, 33229, 33231, 33233], nota: "Focus V Saber Dabber - colores de una misma ficha" },
  { productId: 10163, tiendasAntes: 3, tienda: "astrogrowshop", offerIds: [33137], nota: "Bonglab Glycerin Green Avalanche - colorway literal" },
  { productId: 10744, tiendasAntes: 2, tienda: "astrogrowshop", offerIds: [17935], nota: "Bonglab KE9 Water Fenix - SKU compartido KE9" },
  { productId: 10858, tiendasAntes: 2, tienda: "growbarato", offerIds: [70827], nota: "Ozeta Bandolera - foto (rectangular + kit fumeta), no la Circular" },
  { productId: 10710, tiendasAntes: 3, tienda: "growbarato", offerIds: [11427], nota: "Calvo Bateria Hide 510 650mAh - ficha tecnica identica" },
  { productId: 10667, tiendasAntes: 3, tienda: "growbarato", offerIds: [71140], nota: "Ignite Soplete Phantom - misma cadena que la variante BLACK de Astro" },
  { productId: 10479, tiendasAntes: 2, tienda: "piranha", offerIds: [11241], nota: "Boquillas RAW Cono Perfecto - mismo nombre traducido, misma banda de precio" },
  { productId: 5498, tiendasAntes: 3, tienda: "piranha", offerIds: [10784], nota: "Galaxy Moledor Biodegradable - marca en la descripcion, no en el titulo" },
];

async function main() {
  console.log(APPLY ? "APLICANDO r73\n" : "DRY-RUN r73\n");

  let okOfertas = 0;
  let suben4 = 0;
  const plan: { g: Grupo; productName: string; antes: string[]; ofertas: { id: number; title: string; price: number; inStock: boolean }[] }[] = [];

  for (const g of GRUPOS) {
    const p = await prisma.product.findUnique({
      where: { id: g.productId },
      select: { id: true, name: true, brandKey: true, modelSlug: true, category: true },
    });
    if (!p) throw new Error(`P${g.productId} no existe`);

    // Estado PREVIO: se calcula ANTES de escribir nada, y es contra esto que se
    // mide "¿suma tienda?" (nunca oferta por oferta dentro del lote).
    const antes = await prisma.offer.findMany({
      where: { productId: p.id },
      select: { storeId: true, store: { select: { slug: true } } },
      distinct: ["storeId"],
    });
    const slugsAntes = antes.map((o) => o.store.slug).sort();
    if (antes.length !== g.tiendasAntes) {
      throw new Error(`P${p.id} tiene ${antes.length} tiendas, se esperaban ${g.tiendasAntes}`);
    }
    if (slugsAntes.includes(g.tienda)) {
      throw new Error(`P${p.id} YA tiene ${g.tienda}: el lote no sumaria tienda`);
    }

    const ofertas: { id: number; title: string; price: number; inStock: boolean }[] = [];
    for (const oid of g.offerIds) {
      const o = await prisma.offer.findUnique({
        where: { id: oid },
        select: {
          id: true, productId: true, storeId: true, title: true, url: true, price: true,
          inStock: true, sourceCategory: true, store: { select: { slug: true } },
        },
      });
      if (!o) throw new Error(`of${oid} no existe`);
      if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
      if (o.store.slug !== g.tienda) throw new Error(`of${o.id} es de ${o.store.slug}, no de ${g.tienda}`);
      if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
        throw new Error(`of${o.id} esta FUERA de alcance`);
      }
      ofertas.push({ id: o.id, title: o.title, price: o.price, inStock: o.inStock });
    }

    plan.push({ g, productName: p.name, antes: slugsAntes, ofertas });
    okOfertas += ofertas.length;
    if (g.tiendasAntes + 1 >= 4) suben4++;

    console.log(`P${p.id} [${g.tiendasAntes}t -> ${g.tiendasAntes + 1}t] ${p.brandKey}/${p.modelSlug}`);
    console.log(`   "${p.name}"`);
    console.log(`   antes: ${slugsAntes.join(", ")}   +TIENDA NUEVA: ${g.tienda}`);
    console.log(`   ${g.nota}`);
    for (const o of ofertas) {
      console.log(`     + of${o.id} $${o.price} ${o.inStock ? "stock" : "SIN STOCK"} | ${o.title}`);
    }
    console.log();
  }

  console.log(`RESUMEN: ${okOfertas} ofertas -> ${GRUPOS.length} productos | ${suben4} suben a 4 tiendas`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  for (const { g } of plan) {
    const p = await prisma.product.findUnique({ where: { id: g.productId }, select: { category: true } });
    await prisma.offer.updateMany({
      where: { id: { in: g.offerIds } },
      data: { productId: g.productId, category: p!.category },
    });
  }

  console.log("\n=== VERIFICACION POST-APPLY ===");
  for (const { g } of plan) {
    const despues = await prisma.offer.findMany({
      where: { productId: g.productId },
      select: { storeId: true, store: { select: { slug: true } } },
      distinct: ["storeId"],
    });
    const slugs = despues.map((o) => o.store.slug).sort();
    const ok = despues.length === g.tiendasAntes + 1 && slugs.includes(g.tienda);
    console.log(`${ok ? "OK " : "!! "} P${g.productId}: ${despues.length}t (${slugs.join(", ")})`);
    if (!ok) throw new Error(`P${g.productId} no quedo con ${g.tiendasAntes + 1} tiendas`);
  }
  console.log("\nAPLICADO r73.");
}

main().finally(() => prisma.$disconnect());
