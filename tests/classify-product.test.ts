import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyProduct, extractOffer, isDiscoveryUrl, isPotentialCandidate } from "../scripts/scrape";

/**
 * Regresiones del clasificador de alcance. Tres veces ya un termino de la lista
 * de exclusion se comio parafernalia legitima por aparecer como SABOR o DISENO:
 * "tabaco" (r42), "chocolate" y "hongos" (r53). Cada arreglo deja su caso aqui.
 */
describe("classifyProduct: terminos excluidos que nombran un sabor o diseno", () => {
  it("acepta un contenedor con diseno de hongos", () => {
    assert.equal(
      classifyProduct(
        "Soulblime Contenedor tapa deslizable - Diseños - Hongos",
        "https://fumetas.cl/soulblime-contenedor-tapa-deslizable?variant=Hongos",
        "Contenedores y Almacenamiento",
      ),
      "Contenedores y estuches",
    );
  });

  it("acepta la variante hermana Fungi (control: siempre paso el filtro)", () => {
    assert.ok(
      classifyProduct(
        "Soulblime Contenedor tapa deslizable - Diseños - Fungi",
        "https://fumetas.cl/soulblime-contenedor-tapa-deslizable?variant=Fungi",
        "Contenedores y Almacenamiento",
      ),
    );
  });

  it("sigue excluyendo el cultivo real de hongos", () => {
    assert.equal(classifyProduct("Kit de cultivo de hongos", "https://astrogrowshop.cl/kit-cultivo-hongos"), null);
    assert.equal(classifyProduct("Jeringa de esporas de hongos", "https://astrogrowshop.cl/jeringa-esporas"), null);
  });

  it("acepta un blunt wrap con sabor a chocolate", () => {
    assert.ok(
      classifyProduct(
        "HempWrap Chocolate Lion Rolling Circus",
        "https://fumetas.cl/hempwrap-chocolate-lrc",
      ),
    );
  });

  it("acepta papelillos que llevan tabaco en la URL", () => {
    assert.ok(
      classifyProduct(
        "Papelillos OCB Bamboo 1 1/4",
        "https://kushbreak.cl/papelillos-ocb-bamboo-1-1/4-tabaco",
      ),
    );
  });

  it("sigue excluyendo el tabaco declarado en el titulo", () => {
    assert.equal(
      classifyProduct("Tabaco Stingray Golden Virginia", "https://kushbreak.cl/tabaco-stingray"),
      null,
    );
  });
});

describe("classifyProduct: evasion de tests de drogas vs limpiadores", () => {
  /**
   * Las cuatro tienen que dar LA MISMA categoria, no solo "no null": la
   * reclasificacion post-scrape desvincula la oferta cuando le cambia la
   * categoria, asi que una grieta aqui saca ofertas de P10764 en silencio.
   */
  it("clasifica el Kleaner como Limpieza en las cuatro tiendas que lo venden", () => {
    assert.equal(classifyProduct("Kleaner 30 Ml Detox – Limpiador De Toxinas", "https://astrogrowshop.cl/kleaner-30-ml-detox-limpiador-de-toxinas"), "Limpieza");
    assert.equal(classifyProduct("Kleaner Spray Detox 30ml", "https://fumetas.cl/kleaner-spray-30-ml-detox"), "Limpieza");
    assert.equal(classifyProduct("Kleaner Detox Saliva", "https://www.kushbreak.cl/kleaner-detox-saliva"), "Limpieza");
    assert.equal(classifyProduct("Kleaner Spray – Limpiador de Toxinas en Saliva", "https://www.growbaratochile.cl/ocultacion/limpiador-bucal-de-saliva.html"), "Limpieza");
  });

  it("deja fuera los CleanU (evasion de test de orina)", () => {
    assert.equal(classifyProduct("CleanU Screeny Weeny 6.0 Final", "https://fumetas.cl/cleanu-screeny-weeny-60-final"), null);
    assert.equal(classifyProduct("CleanU ScreenUrin Urine Refill Pack 80 ml", "https://fumetas.cl/cleanu-screenurin-urine-refill-pack-80-ml"), null);
  });

  it("no confunde los screen de parafernalia con los CleanU", () => {
    assert.ok(classifyProduct("Malla Para Pipa Silver Screens", "https://astrogrowshop.cl/malla-para-pipa-silver-screens"));
    assert.ok(classifyProduct("Titanium Screen Grado 1 15Mm 5 Ud-Bonglab", "https://astrogrowshop.cl/titanium-screen-grado-1-15mm-5-ud-bonglab"));
    assert.ok(classifyProduct("Repuesto Screen Kit Pocket", "https://www.kushbreak.cl/repuesto-screen-kit-pocket-cali-crusher"));
  });
});

describe("classifyProduct: desechables de sabores fuera de alcance", () => {
  it("rechaza un desechable por senal dura aunque la marca suene herbal", () => {
    assert.equal(
      classifyProduct(
        "Fume Vaporizador Desechable Nicky Jam 15.000 Puffs - Fenix",
        "https://astrogrowshop.cl/fume-desechable-nicky-jam",
      ),
      null,
    );
  });

  it("mantiene dentro los vaporizadores herbales y de concentrados", () => {
    assert.ok(classifyProduct("Vaporizador Storz & Bickel Volcano Classic", "https://fumetas.cl/volcano-classic"));
    assert.ok(classifyProduct("Puffco Proxy 3D Chamber", "https://astrogrowshop.cl/puffco-proxy-3d-chamber"));
  });

  /**
   * r53: los pod kits RECARGABLES de e-liquido no son desechables, asi que las
   * senales duras no los agarraban. El usuario los dejo fuera igual (no son
   * herbales ni de concentrados). El limite delicado es la bateria 510 para
   * cartuchos de concentrado, que SI pertenece al catalogo.
   */
  it("deja fuera el hardware recargable de e-liquido", () => {
    assert.equal(classifyProduct("Vaporizador Xros 5 Nano -Vaporesso", "https://astrogrowshop.cl/vaporizador-xros-5-nano-vaporesso"), null);
    assert.equal(classifyProduct("Vaporizador Vaporesso Xros Nano 3 Pod Kit Original.", "https://www.friendlygrow.cl/vaporizador-vaporesso-xros-nano-3"), null);
    assert.equal(classifyProduct("Vaporizador Scar 18 Kit -Smok", "https://astrogrowshop.cl/vaporizador-scar-18-kit-smok"), null);
    assert.equal(classifyProduct("Batería Nexpod -Wotofo - Rojo", "https://astrogrowshop.cl/bateria-nexpod-wotofo"), null);
  });

  it("mantiene dentro las baterias 510 para cartuchos de concentrado", () => {
    assert.ok(classifyProduct("Vaporizador Bateria Alien Doteco Et500 Para Cartridges 510", "https://www.friendlygrow.cl/vaporizador-bateria-alien-doteco-et500"));
    assert.ok(classifyProduct("Bateria 510 Puffco Plus", "https://astrogrowshop.cl/bateria-510-puffco-plus"));
    assert.ok(classifyProduct("Vaporizador Brass Knuckles 900mah Rosca 510 Original.", "https://www.friendlygrow.cl/vaporizador-brass-knuckles-900mah-510"));
  });
});

describe("classifyProduct: accesorios Storz & Bickel no son vaporizadores completos", () => {
  it("separa un hitter que menciona Mighty como pipa", () => {
    assert.equal(
      classifyProduct(
        "Anomaly Mighty Hitter 17mm",
        "https://fumetas.cl/anomaly-mighty-hitter-17mm",
        "Vaporizadores herbales",
      ),
      "Pipas",
    );
  });

  it("clasifica adaptadores, estuches y kits Mighty como repuestos", () => {
    const cases = [
      ["Mighty Adaptador de Corriente", "https://piranha.cl/inicio/330/mighty-adaptador-de-corriente.html"],
      ["Estuche rígido Mighty y Mighty+", "https://piranha.cl/inicio/6092/mightymighty-estuche-rigido.html"],
      ["Mighty/Crafty Kit de Accesorios", "https://piranha.cl/inicio/7816/mightycrafty-kit-de-accesorios.html"],
      ["SIDE KIT VENTY/VEAZY/MIGHTY/CRAFTY-STORZ & BICKEL", "https://astrogrowshop.cl/side-kit-ventyveazymightycrafty-storz-bickel"],
      ["Storz & Bickel Juego de Piezas de Desgastes Mighty", "https://fumetas.cl/juego-de-piezas-de-desgastes-mighty"],
    ] as const;

    for (const [title, url] of cases) {
      assert.equal(classifyProduct(title, url, "Vaporizadores herbales"), "Repuestos para bongs y vaporizadores", title);
    }
  });

  it("mantiene el dispositivo Mighty completo como vaporizador herbal", () => {
    assert.equal(
      classifyProduct(
        "Vaporizador Mighty V2 Storz & Bickel",
        "https://fumetas.cl/storz-bickel-mighty-v2-vaporizador-herbal",
      ),
      "Vaporizadores herbales",
    );
  });
});

describe("classifyProduct: catálogo Yocan y Doteco de Friendly Grow", () => {
  it("separa vaporizadores herbales Yocan de los dispositivos de extracción", () => {
    assert.equal(classifyProduct("Vaporizador Herbal Yocan Hit", "https://www.friendlygrow.cl/yocan-hit"), "Vaporizadores herbales");
    assert.equal(classifyProduct("Vaporizador Yocan Vane Para Hierbas Secas", "https://www.friendlygrow.cl/yocan-vane"), "Vaporizadores herbales");
  });

  it("clasifica boquillas, coils y resistencias Yocan como repuestos", () => {
    assert.equal(classifyProduct("Boquilla de Repuesto Yocan Hit", "https://www.friendlygrow.cl/boquilla-yocan-hit"), "Repuestos para bongs y vaporizadores");
    assert.equal(classifyProduct("Yocan Cloud QBC Coil Resistencia", "https://www.friendlygrow.cl/yocan-cloud-qbc-coil"), "Repuestos para bongs y vaporizadores");
  });

  it("conserva los Yocan y Doteco de extracción en su categoría", () => {
    assert.equal(classifyProduct("Vaporizador Yocan iCan Para Concentrados", "https://www.friendlygrow.cl/yocan-ican"), "Accesorios de extraccion");
    assert.equal(classifyProduct("Vaporizador Yocan Ziva Para Cartridges", "https://www.friendlygrow.cl/yocan-ziva"), "Accesorios de extraccion");
    assert.equal(classifyProduct("Dabber Electrico Yocan Dirk", "https://www.friendlygrow.cl/yocan-dirk"), "Accesorios de extraccion");
    assert.equal(classifyProduct("Doteco COXL", "https://www.friendlygrow.cl/doteco-coxl"), "Accesorios de extraccion");
    assert.equal(isPotentialCandidate("https://www.friendlygrow.cl/doteco-coxl"), true);
  });
});

describe("Friendly Grow: paginación de categorías", () => {
  it("descubre las páginas siguientes de categorías con slugs de producto", () => {
    assert.equal(isDiscoveryUrl("https://www.friendlygrow.cl/pipas-silicona?page=2", "https://www.friendlygrow.cl"), true);
    assert.equal(isDiscoveryUrl("https://www.friendlygrow.cl/bongs-pyrex?page=2", "https://www.friendlygrow.cl"), true);
  });
});

describe("Friendly Grow: categoría de origen", () => {
  it("prefiere el breadcrumb textual cuando Jumpseller entrega un id numérico", () => {
    const html = `
      <html><head>
        <link rel="canonical" href="https://www.friendlygrow.cl/papelillos-raw-classic">
        <meta property="og:type" content="product">
        <script type="application/ld+json">{
          "@type":"Product",
          "name":"Papelillos RAW Classic King Size Slim",
          "category":"4091",
          "offers":{"@type":"Offer","price":"1490","priceCurrency":"CLP","availability":"InStock"}
        }</script>
      </head><body>
        <nav class="theme-breadcrumbs"><a href="/">Inicio</a><a href="/papeleria">Papelería y Enrolado</a></nav>
      </body></html>`;
    const offers = extractOffer(html, "https://www.friendlygrow.cl/papelillos-raw-classic", { includeVariants: false });
    assert.ok(offers);
    assert.equal(offers[0].sourceCategory, "Papelería y Enrolado");
  });
});
