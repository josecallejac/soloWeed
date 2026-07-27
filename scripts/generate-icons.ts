// Genera los iconos de la app desde assets/brand/icon.svg (fuente de verdad).
// Salidas: src/app/favicon.ico (16/32/48) y src/app/apple-icon.png (180x180).
// Correr solo cuando cambie la marca: npx tsx scripts/generate-icons.ts
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";

const REPO_ROOT = path.join(__dirname, "..");
const SOURCE = path.join(REPO_ROOT, "assets", "brand", "icon.svg");
const APP_DIR = path.join(REPO_ROOT, "src", "app");

const ICO_SIZES = [16, 32, 48];

/**
 * Empaqueta varios PNG en un .ico. El formato ICO admite payload PNG directo
 * (Vista+), asi que basta con la cabecera ICONDIR + un ICONDIRENTRY por imagen.
 */
function buildIco(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // type 1 = icono
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + images.length * 16;

  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // ancho (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // alto
    entry.writeUInt8(0, 2); // colores de paleta
    entry.writeUInt8(0, 3); // reservado
    entry.writeUInt16LE(1, 4); // planos
    entry.writeUInt16LE(32, 6); // bits por pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  const svg = await fs.readFile(SOURCE);

  const pngs = await Promise.all(
    ICO_SIZES.map(async (size) => ({
      size,
      data: await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer(),
    })),
  );

  const icoPath = path.join(APP_DIR, "favicon.ico");
  await fs.writeFile(icoPath, buildIco(pngs));
  console.log(`favicon.ico  -> ${ICO_SIZES.join("/")}px`);

  const applePath = path.join(APP_DIR, "apple-icon.png");
  await sharp(svg, { density: 384 }).resize(180, 180).png().toFile(applePath);
  console.log("apple-icon.png -> 180px");

  // Copia suelta para inspeccion visual del render (no la usa la app).
  const previewPath = path.join(REPO_ROOT, "assets", "brand", "preview-64.png");
  await sharp(svg, { density: 384 }).resize(64, 64).png().toFile(previewPath);
  console.log("preview-64.png (solo inspeccion)");
}

main();
