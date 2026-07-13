import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../src/lib/prisma";
import { cleanDescription } from "../src/lib/format";

// Genera una descripcion corta (1 frase) por producto usando Claude Haiku y la
// guarda en Product.shortDescription. Idempotente: solo procesa productos con
// shortDescription vacia y con alguna descripcion de oferta disponible.
//
// Uso:
//   npx tsx scripts/generate-short-descriptions.ts            (dry-run, muestra muestra)
//   ... --apply                                               (escribe en la BD)
// Envs:
//   SHORT_DESC_LIMIT=50           limita cuantos productos procesar
//   SHORT_DESC_CATEGORIES=Bongs,Pipas  restringe a categorias (coma-separadas)
//   SHORT_DESC_MODEL=claude-haiku-4-5  override del modelo
//   SHORT_DESC_DRY_SAMPLE=10       en dry-run, cuantos resumir de verdad para revisar

const APPLY = process.argv.includes("--apply");
const MODEL = process.env.SHORT_DESC_MODEL ?? "claude-haiku-4-5";
const LIMIT = process.env.SHORT_DESC_LIMIT ? Number(process.env.SHORT_DESC_LIMIT) : undefined;
const DRY_SAMPLE = process.env.SHORT_DESC_DRY_SAMPLE ? Number(process.env.SHORT_DESC_DRY_SAMPLE) : 10;
const CATEGORIES = (process.env.SHORT_DESC_CATEGORIES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const SYSTEM_PROMPT = `Eres un redactor de catalogo de parafernalia cannabica en Chile. Recibes el nombre, marca, categoria y la descripcion de marketing scrapeada de un producto. Devuelve UNA sola frase breve (maximo 140 caracteres), en espanol de Chile, factual y util para comparar: prioriza material, tamano/medidas, marca/modelo y la caracteristica distintiva. Prohibido el relleno de marketing ("el companero perfecto", "experiencia unica", "ideal para los amantes"). No uses comillas ni prefijos. Si la descripcion no aporta datos concretos, responde exactamente con una cadena vacia.`;

type ProductRow = {
  id: number;
  name: string;
  brand: string | null;
  category: string;
  description: string;
};

async function loadProducts(): Promise<ProductRow[]> {
  const products = await prisma.product.findMany({
    where: {
      shortDescription: null,
      ...(CATEGORIES.length > 0 ? { category: { in: CATEGORIES } } : {}),
    },
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
      offers: { select: { description: true } },
    },
    orderBy: { id: "asc" },
  });

  const rows: ProductRow[] = [];
  for (const product of products) {
    // Elegimos la descripcion de oferta mas rica (la mas larga tras limpiar).
    const description = product.offers
      .map((offer) => cleanDescription(offer.description))
      .filter((value) => value.length >= 30)
      .sort((a, b) => b.length - a.length)[0];
    if (!description) continue;
    rows.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      description,
    });
  }
  return LIMIT ? rows.slice(0, LIMIT) : rows;
}

async function summarize(client: Anthropic, product: ProductRow): Promise<string> {
  const userContent = [
    `Nombre: ${product.name}`,
    product.brand ? `Marca: ${product.brand}` : null,
    `Categoria: ${product.category}`,
    `Descripcion: ${product.description.slice(0, 2000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join(" ")
    .trim();

  // Quita comillas envolventes que a veces agrega el modelo y recorta defensivo.
  return text.replace(/^["“']+|["”']+$/g, "").trim();
}

async function main() {
  const products = await loadProducts();
  console.log(
    `${products.length} productos sin shortDescription con descripcion util` +
      (CATEGORIES.length ? ` (categorias: ${CATEGORIES.join(", ")})` : "") +
      (LIMIT ? ` (limit ${LIMIT})` : ""),
  );

  if (products.length === 0) {
    console.log("Nada que hacer.");
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Falta ANTHROPIC_API_KEY en el entorno (.env). Abortando.");
    process.exitCode = 1;
    return;
  }

  const client = new Anthropic();

  if (!APPLY) {
    const sample = products.slice(0, DRY_SAMPLE);
    console.log(`DRY-RUN: resumo ${sample.length} de muestra (sin escribir). Usa --apply para todo.\n`);
    for (const product of sample) {
      const short = await summarize(client, product);
      console.log(`#${product.id} [${product.category}] ${product.name}`);
      console.log(`  -> ${short || "(vacio: sin datos concretos, quedaria null)"}\n`);
    }
    return;
  }

  let written = 0;
  let skipped = 0;
  for (const [index, product] of products.entries()) {
    try {
      const short = await summarize(client, product);
      if (!short) {
        skipped += 1;
        continue;
      }
      await prisma.product.update({ where: { id: product.id }, data: { shortDescription: short } });
      written += 1;
    } catch (error) {
      console.error(`Error en #${product.id} ${product.name}:`, error instanceof Error ? error.message : error);
      // Backoff simple ante rate limits/errores transitorios.
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if ((index + 1) % 25 === 0) {
      console.log(`  ${index + 1}/${products.length} procesados (escritos ${written}, sin datos ${skipped})`);
    }
  }

  console.log(`\nListo. shortDescription escrita en ${written} productos; ${skipped} sin datos (quedan null).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
