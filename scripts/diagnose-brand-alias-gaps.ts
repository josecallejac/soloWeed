// DIAGNOSTICO (read-only): HUECOS DE ALIAS DE MARCA.
//
// El caso: una tienda escribe una marca de una forma ("Airis") y el resto de otra
// ("Airistech"). Como ambas formas estan en KNOWN_BRAND_PHRASES, getBrandKey resuelve
// cada una a su propio brandKey y **toda herramienta que agrupe por marca queda ciega
// al cruce**: find-store-upgrades y diagnose-brand-coverage-gap no ven que la huerfana
// de una tienda y el producto curado de otra son la misma marca.
//
// Se descubrio el 29 jul 2026 y valia 2 upgrades a 4 tiendas + 2 productos nuevos:
// 0 productos con brandKey=airis contra 8 con airistech. Va a repetirse con cada
// tienda nueva, asi que esto es un diagnostico permanente, no un script de una ronda.
//
// CORRERLO DESPUES DE `npm run brand:backfill`: el backfill deja los brandKey
// consistentes con las constantes actuales, asi que cualquier par que siga apareciendo
// es un hueco vivo o dos marcas legitimamente distintas. No hay que duplicar aca la
// logica de BRAND_ALIASES.
//
// El canonico al unificar es SIEMPRE el que ya usan los Product existentes, porque
// Product.brandKey es URL publica (/productos/<brandKey>/<modelSlug>) y el backfill
// nunca lo cambia. Por eso la columna productos<A|B> es la que decide.
//
// Uso: npx tsx scripts/diagnose-brand-alias-gaps.ts
//      $env:ALIAS_MAX_DIST="2"; npx tsx scripts/diagnose-brand-alias-gaps.ts
//
// El fix se aplica a mano en BRAND_ALIASES de src/lib/matching-constants.ts (fuente
// unica) y despues se re-corre brand:backfill.

import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const MAX_DIST = Number(process.env.ALIAS_MAX_DIST ?? "2");
const MIN_LEN = 4; // pares mas cortos son ruido ("raw" vs "rawq")

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > MAX_DIST) return MAX_DIST + 1;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

type Info = {
  ofertas: number;
  huerfanasConStock: number;
  vinculadas: number;
  tiendas: Map<string, number>;
  productos: number[];
};

async function main() {
  const offers = await prisma.offer.findMany({
    where: { brandKey: { not: null } },
    select: {
      brandKey: true, title: true, url: true, sourceCategory: true,
      productId: true, inStock: true, store: { select: { slug: true } },
    },
  });

  // El alcance lo define classifyProduct, nunca Offer.category (se queda stale).
  const enAlcance = offers.filter(
    (o) => classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) !== null,
  );

  const products = await prisma.product.findMany({
    where: { brandKey: { not: null } },
    select: { id: true, brandKey: true },
  });

  const marcas = new Map<string, Info>();
  const get = (k: string) => {
    let info = marcas.get(k);
    if (!info) {
      info = { ofertas: 0, huerfanasConStock: 0, vinculadas: 0, tiendas: new Map(), productos: [] };
      marcas.set(k, info);
    }
    return info;
  };
  for (const o of enAlcance) {
    const info = get(o.brandKey!);
    info.ofertas += 1;
    if (o.productId) info.vinculadas += 1;
    else if (o.inStock) info.huerfanasConStock += 1;
    info.tiendas.set(o.store.slug, (info.tiendas.get(o.store.slug) ?? 0) + 1);
  }
  for (const p of products) get(p.brandKey!).productos.push(p.id);

  const nombres = [...marcas.keys()].sort();

  type Par = {
    a: string; b: string; senal: string; distancia: number;
    canonicoSugerido: string; motivoCanonico: string;
    compartenTienda: boolean; tiendasSoloA: string[]; tiendasSoloB: string[];
  };
  const pares: Par[] = [];

  for (let i = 0; i < nombres.length; i++) {
    for (let j = i + 1; j < nombres.length; j++) {
      const a = nombres[i];
      const b = nombres[j];
      if (Math.min(a.length, b.length) < MIN_LEN) continue;

      const sinGuion = a.replace(/-/g, "") === b.replace(/-/g, "");
      const prefijo = b.startsWith(a) || a.startsWith(b);
      const plural = a === `${b}s` || b === `${a}s`;
      const dist = levenshtein(a, b);

      let senal: string | null = null;
      if (sinGuion) senal = "MISMO-SIN-GUION";
      else if (plural) senal = "PLURAL";
      else if (prefijo) senal = "PREFIJO";
      else if (dist <= MAX_DIST) senal = `EDICION-${dist}`;
      if (!senal) continue;

      const ia = marcas.get(a)!;
      const ib = marcas.get(b)!;

      // El canonico es el que ya tiene Product (URL publica). Si ninguno tiene,
      // se sugiere el de nombre mas completo, que suele ser la marca real.
      let canonico: string;
      let motivo: string;
      if (ia.productos.length !== ib.productos.length) {
        const ganaA = ia.productos.length > ib.productos.length;
        canonico = ganaA ? a : b;
        motivo = `tiene ${ganaA ? ia.productos.length : ib.productos.length} productos contra ${ganaA ? ib.productos.length : ia.productos.length} (Product.brandKey es URL publica)`;
      } else if (ia.productos.length > 0) {
        canonico = a;
        motivo = `ambos tienen ${ia.productos.length} productos: DECIDIR A MANO, fusionar cambia URLs`;
      } else {
        const ganaA = a.length >= b.length;
        canonico = ganaA ? a : b;
        motivo = "ninguno tiene productos: se sugiere el nombre mas completo, sin riesgo de URL";
      }

      const tiendasSoloA = [...ia.tiendas.keys()].filter((s) => !ib.tiendas.has(s));
      const tiendasSoloB = [...ib.tiendas.keys()].filter((s) => !ia.tiendas.has(s));

      pares.push({
        a, b, senal, distancia: dist === MAX_DIST + 1 ? -1 : dist,
        canonicoSugerido: canonico, motivoCanonico: motivo,
        // OJO: compartir tienda NO descarta el hueco. da-vinci/davinci lo comparte
        // (Astro usa las dos formas: 17 y 15 ofertas) y era un hueco real.
        compartenTienda: [...ia.tiendas.keys()].some((s) => ib.tiendas.has(s)),
        tiendasSoloA, tiendasSoloB,
      });
    }
  }

  const filas = ["parA;parB;senal;distancia;canonicoSugerido;motivoCanonico;ofertasA;ofertasB;huerfanasStockA;huerfanasStockB;vinculadasA;vinculadasB;productosA;productosB;tiendasA;tiendasB;compartenTienda;tiendasSoloA;tiendasSoloB"];
  const fmtTiendas = (t: Map<string, number>) => [...t.entries()].map(([s, n]) => `${s}:${n}`).join(" ");
  for (const p of pares) {
    const ia = marcas.get(p.a)!;
    const ib = marcas.get(p.b)!;
    filas.push([
      p.a, p.b, p.senal, p.distancia, p.canonicoSugerido, p.motivoCanonico,
      ia.ofertas, ib.ofertas, ia.huerfanasConStock, ib.huerfanasConStock,
      ia.vinculadas, ib.vinculadas, ia.productos.length, ib.productos.length,
      fmtTiendas(ia.tiendas), fmtTiendas(ib.tiendas),
      p.compartenTienda ? "si" : "no",
      p.tiendasSoloA.join(",") || "-", p.tiendasSoloB.join(",") || "-",
    ].join(";"));
  }
  writeFileSync("reports/brand-alias-gaps.csv", `${filas.join("\n")}\n`, "utf8");

  console.log(`brandKeys distintos en ofertas dentro de alcance: ${nombres.length}`);
  console.log(`ofertas con brandKey: ${offers.length} (${enAlcance.length} dentro de alcance)`);
  console.log(`\n=== ${pares.length} pares sospechosos de ser la misma marca ===\n`);

  // Los que mas duelen primero: mas ofertas en juego = mas herramientas ciegas.
  const orden = [...pares].sort((x, y) => {
    const tot = (p: Par) => marcas.get(p.a)!.ofertas + marcas.get(p.b)!.ofertas;
    return tot(y) - tot(x);
  });
  for (const p of orden) {
    const ia = marcas.get(p.a)!;
    const ib = marcas.get(p.b)!;
    console.log(`[${p.senal}] ${p.a} vs ${p.b}`);
    console.log(`   ${p.a}: ${ia.ofertas} ofertas (${ia.huerfanasConStock} huerf. c/stock, ${ia.vinculadas} vinc.), ${ia.productos.length} productos | ${fmtTiendas(ia.tiendas)}`);
    console.log(`   ${p.b}: ${ib.ofertas} ofertas (${ib.huerfanasConStock} huerf. c/stock, ${ib.vinculadas} vinc.), ${ib.productos.length} productos | ${fmtTiendas(ib.tiendas)}`);
    console.log(`   canonico sugerido: ${p.canonicoSugerido} — ${p.motivoCanonico}`);
    console.log(`   comparten tienda: ${p.compartenTienda ? "si" : "no"} (no descarta el hueco) | solo en ${p.a}: ${p.tiendasSoloA.join(",") || "-"} | solo en ${p.b}: ${p.tiendasSoloB.join(",") || "-"}`);
    console.log("");
  }

  console.log("Reporte: reports/brand-alias-gaps.csv");
  console.log("Los pares REALES se arreglan en BRAND_ALIASES de src/lib/matching-constants.ts");
  console.log("(fuente unica) y despues se re-corre `npm run brand:backfill`.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
