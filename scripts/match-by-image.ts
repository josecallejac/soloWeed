import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";

// Matching de ofertas por huella perceptual de imagen (dHash 512 bits).
// Es una herramienta de DIAGNOSTICO: imprime pares candidatos, nunca escribe
// en la BD. La imagen propone y el texto decide — revisar cada par contra
// titulos/precios/medidas antes de aplicar links con un script dirigido
// (patron apply-image-matching-r*.ts). Trampas conocidas: tiendas que reusan
// la misma foto para medidas distintas (14 vs 18mm), displays 24U/50U con
// foto de la unidad, y variantes (Plus/Onyx/colores) con foto compartida.
//
// Algoritmo (validado contra el catalogo el 2026-06-11): recortar margenes
// blancos (varian por tienda y aplastan la senal), reescalar a 17x17 y
// comparar gradientes horizontales + verticales (2 x 16 x 16 = 512 bits).
// Distancia Hamming <= 60 es casi siempre el mismo arte de fabricante;
// 60-140 requiere mirar las fotos. El dHash clasico de 64 bits sin recorte
// NO sirve aqui (cientos de falsos positivos en Bongs).
//
// Uso:
//   npm run match:image                                  # todas las categorias
//   $env:MATCH_IMG_CATEGORIES="Bongs,Pipas"; npm run match:image
//   $env:MATCH_IMG_MAX_DIST="60"; npm run match:image    # solo alta certeza
//
// Las imagenes se cachean por offerId en MATCH_IMG_CACHE (default
// scratch/img/cache, fuera del repo); borrar el archivo para re-descargar.

const CACHE_DIR = process.env.MATCH_IMG_CACHE ?? path.join("scratch", "img", "cache");
const MAX_DIST = Number(process.env.MATCH_IMG_MAX_DIST ?? 140);
const HIGH_CONFIDENCE_DIST = 60;
const HASH_SIZE = 16; // 16x16 en ambos ejes = 512 bits
const DOWNLOAD_CONCURRENCY = 8;

type OfferRow = {
  id: number;
  storeId: number;
  productId: number | null;
  price: number;
  title: string;
  imageUrl: string;
};

async function fetchImage(offer: OfferRow): Promise<Buffer | null> {
  const cached = path.join(CACHE_DIR, `${offer.id}.bin`);
  if (existsSync(cached)) return readFileSync(cached);
  try {
    const response = await fetch(offer.imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(cached, buffer);
    return buffer;
  } catch (error) {
    console.error(`oferta ${offer.id}: descarga fallida (${error})`);
    return null;
  }
}

// El hash de 512 bits se representa como Uint8Array(64): el target ES2017 del
// proyecto no admite literales BigInt y el XOR por byte es ademas mas rapido.
async function computeHash(buffer: Buffer): Promise<Uint8Array> {
  // Recortar al contenido: pixeles mas oscuros que 230 (umbral del prototipo).
  const { data, info } = await sharp(buffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let top = info.height, bottom = -1, left = info.width, right = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < 230) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  let pipeline = sharp(buffer).greyscale();
  if (bottom >= top && right >= left) {
    pipeline = pipeline.extract({
      left,
      top,
      width: right - left + 1,
      height: bottom - top + 1,
    });
  }
  const side = HASH_SIZE + 1;
  const px = await pipeline
    .resize(side, side, { kernel: "lanczos3", fit: "fill" })
    .raw()
    .toBuffer();
  const bits = new Uint8Array((HASH_SIZE * HASH_SIZE * 2) / 8);
  let bitIndex = 0;
  const pushBit = (on: boolean) => {
    if (on) bits[bitIndex >> 3] |= 0x80 >> (bitIndex & 7);
    bitIndex++;
  };
  for (let row = 0; row < HASH_SIZE; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      pushBit(px[row * side + col] > px[row * side + col + 1]);
    }
  }
  for (let row = 0; row < HASH_SIZE; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      pushBit(px[row * side + col] > px[(row + 1) * side + col]);
    }
  }
  return bits;
}

const POPCOUNT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  POPCOUNT[i] = (i & 1) + POPCOUNT[i >> 1];
}

function hammingDistance(a: Uint8Array, b: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    count += POPCOUNT[a[i] ^ b[i]];
  }
  return count;
}

function formatOffer(offer: OfferRow): string {
  const tag = offer.productId ? `prod ${offer.productId}` : "huerfana";
  return `${offer.id} t${offer.storeId} ${tag} $${offer.price} | ${offer.title.slice(0, 55)}`;
}

async function scanCategory(category: string, offers: OfferRow[]) {
  console.log(`\n===== ${category}: ${offers.length} ofertas con imagen =====`);
  const hashes = new Map<number, Uint8Array>();
  let errors = 0;
  for (let i = 0; i < offers.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = offers.slice(i, i + DOWNLOAD_CONCURRENCY);
    await Promise.all(
      batch.map(async (offer) => {
        const buffer = await fetchImage(offer);
        if (!buffer) {
          errors++;
          return;
        }
        try {
          hashes.set(offer.id, await computeHash(buffer));
        } catch (error) {
          console.error(`oferta ${offer.id}: hash fallido (${error})`);
          errors++;
        }
      })
    );
  }
  console.log(`hashes ok: ${hashes.size} | errores: ${errors}`);

  const hashed = offers.filter((offer) => hashes.has(offer.id));
  const pairs: Array<{ dist: number; a: OfferRow; b: OfferRow }> = [];
  for (let i = 0; i < hashed.length; i++) {
    for (let j = i + 1; j < hashed.length; j++) {
      const a = hashed[i];
      const b = hashed[j];
      if (a.storeId === b.storeId) continue;
      if (a.productId !== null && b.productId !== null) continue;
      const dist = hammingDistance(hashes.get(a.id)!, hashes.get(b.id)!);
      if (dist <= MAX_DIST) pairs.push({ dist, a, b });
    }
  }
  pairs.sort((x, y) => x.dist - y.dist);
  console.log(`${pairs.length} pares candidatos (distancia Hamming <= ${MAX_DIST}/512)`);
  for (const { dist, a, b } of pairs) {
    const mark = dist <= HIGH_CONFIDENCE_DIST ? "*" : " ";
    console.log(`${mark}d=${String(dist).padStart(3)} | ${formatOffer(a)}`);
    console.log(`       | ${formatOffer(b)}`);
  }
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const requested = process.env.MATCH_IMG_CATEGORIES?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const offers = await prisma.offer.findMany({
    where: {
      imageUrl: { not: null },
      ...(requested?.length ? { category: { in: requested } } : {}),
    },
    select: { id: true, storeId: true, productId: true, price: true, title: true, imageUrl: true, category: true },
    orderBy: { id: "asc" },
  });
  const byCategory = new Map<string, OfferRow[]>();
  for (const offer of offers) {
    const category = offer.category ?? "(sin categoria)";
    const list = byCategory.get(category) ?? [];
    list.push(offer as OfferRow);
    byCategory.set(category, list);
  }
  for (const [category, categoryOffers] of [...byCategory.entries()].sort()) {
    await scanCategory(category, categoryOffers);
  }
  console.log(
    `\n* = distancia <= ${HIGH_CONFIDENCE_DIST} (alta certeza). ` +
      "Revisar siempre titulo/precio/medidas antes de linkear."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
