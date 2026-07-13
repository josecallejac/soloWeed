import { prisma } from "../src/lib/prisma";
import { cleanDescription } from "../src/lib/format";

// Genera una descripcion corta (1 frase) por producto usando un LLM LOCAL via
// Ollama (sin API key, gratis) y la guarda en Product.shortDescription.
// Idempotente: solo procesa productos con shortDescription vacia y con alguna
// descripcion de oferta disponible.
//
// Requiere Ollama corriendo (app de Ollama o `ollama serve`) con el modelo
// descargado (`ollama pull llama3`).
//
// Uso:
//   npx tsx scripts/generate-short-descriptions.ts            (dry-run, muestra)
//   ... --apply                                               (escribe en la BD)
// Envs:
//   SHORT_DESC_MODEL=llama3               modelo de Ollama (default llama3)
//   OLLAMA_HOST=http://localhost:11434    host de Ollama
//   SHORT_DESC_LIMIT=50                   limita cuantos productos procesar
//   SHORT_DESC_CATEGORIES=Bongs,Pipas     restringe a categorias (coma-separadas)
//   SHORT_DESC_DRY_SAMPLE=10              en dry-run, cuantos resumir para revisar

const APPLY = process.argv.includes("--apply");
const MODEL = process.env.SHORT_DESC_MODEL ?? "llama3";
const OLLAMA_HOST = (process.env.OLLAMA_HOST ?? "http://localhost:11434").replace(/\/$/, "");
const LIMIT = process.env.SHORT_DESC_LIMIT ? Number(process.env.SHORT_DESC_LIMIT) : undefined;
const DRY_SAMPLE = process.env.SHORT_DESC_DRY_SAMPLE ? Number(process.env.SHORT_DESC_DRY_SAMPLE) : 10;
const CATEGORIES = (process.env.SHORT_DESC_CATEGORIES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const SYSTEM_PROMPT = `Eres un redactor de catalogo de parafernalia cannabica en Chile. Recibes el nombre, marca, categoria y la descripcion de marketing scrapeada de un producto. Devuelve UNA sola frase breve (maximo 140 caracteres), en espanol de Chile, factual y util para comparar: prioriza material, tamano/medidas, marca/modelo y la caracteristica distintiva. Prohibido el relleno de marketing ("el companero perfecto", "experiencia unica", "ideal para los amantes"). Responde SOLO con la frase, sin comillas, sin prefijos como "Resumen:" ni explicaciones. Si la descripcion no aporta datos concretos, responde exactamente con una cadena vacia.`;

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

async function ollamaAvailable(): Promise<{ ok: boolean; hasModel: boolean; models: string[] }> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { ok: false, hasModel: false, models: [] };
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const models = (data.models ?? []).map((m) => m.name);
    const base = MODEL.split(":")[0];
    const hasModel = models.some((name) => name === MODEL || name.split(":")[0] === base);
    return { ok: true, hasModel, models };
  } catch {
    return { ok: false, hasModel: false, models: [] };
  }
}

function tidy(raw: string): string {
  let text = raw.trim();
  // Quita preambulos conversacionales tipico de modelos locales.
  text = text.replace(/^(aqu[ií] (?:est[aá]|tienes)[^:]*:|resumen:|descripci[oó]n:|frase:)\s*/i, "");
  // Toma solo la primera linea.
  text = text.split(/\r?\n/)[0].trim();
  // Quita comillas envolventes.
  text = text.replace(/^["“'`]+|["”'`]+$/g, "").trim();
  // Recorte defensivo a ~160 chars en un limite de palabra.
  if (text.length > 160) {
    text = text.slice(0, 160).replace(/\s+\S*$/, "").trim() + "…";
  }
  return text;
}

async function summarize(product: ProductRow): Promise<string> {
  const userContent = [
    `Nombre: ${product.name}`,
    product.brand ? `Marca: ${product.brand}` : null,
    `Categoria: ${product.category}`,
    `Descripcion: ${product.description.slice(0, 2000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { temperature: 0.2, num_predict: 120 },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return tidy(data.message?.content ?? "");
}

async function main() {
  const health = await ollamaAvailable();
  if (!health.ok) {
    console.error(
      `No se pudo contactar Ollama en ${OLLAMA_HOST}. Inicia la app de Ollama o corre 'ollama serve'.`,
    );
    process.exitCode = 1;
    return;
  }
  if (!health.hasModel) {
    console.error(
      `El modelo '${MODEL}' no esta descargado. Corre 'ollama pull ${MODEL}'.\n` +
        `Modelos disponibles: ${health.models.join(", ") || "(ninguno)"}`,
    );
    process.exitCode = 1;
    return;
  }

  const products = await loadProducts();
  console.log(
    `Motor: Ollama ${MODEL} @ ${OLLAMA_HOST}\n` +
      `${products.length} productos sin shortDescription con descripcion util` +
      (CATEGORIES.length ? ` (categorias: ${CATEGORIES.join(", ")})` : "") +
      (LIMIT ? ` (limit ${LIMIT})` : ""),
  );

  if (products.length === 0) {
    console.log("Nada que hacer.");
    return;
  }

  if (!APPLY) {
    const sample = products.slice(0, DRY_SAMPLE);
    console.log(`DRY-RUN: resumo ${sample.length} de muestra (sin escribir). Usa --apply para todo.\n`);
    for (const product of sample) {
      const short = await summarize(product);
      console.log(`#${product.id} [${product.category}] ${product.name}`);
      console.log(`  -> ${short || "(vacio: sin datos concretos, quedaria null)"}\n`);
    }
    return;
  }

  let written = 0;
  let skipped = 0;
  for (const [index, product] of products.entries()) {
    try {
      const short = await summarize(product);
      if (!short) {
        skipped += 1;
        continue;
      }
      await prisma.product.update({ where: { id: product.id }, data: { shortDescription: short } });
      written += 1;
    } catch (error) {
      console.error(`Error en #${product.id} ${product.name}:`, error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
