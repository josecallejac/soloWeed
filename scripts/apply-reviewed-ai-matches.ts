import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const INPUT_FILE = path.join("reports", "ai-candidates.json");

async function main() {
  if (!existsSync(INPUT_FILE)) {
    console.error(`No se encontró el archivo: ${INPUT_FILE}`);
    return;
  }

  const matches: Array<{
    category: string;
    orphanId: number;
    targetProductId: number;
    sim: number;
    titleO: string;
    titleP: string;
  }> = JSON.parse(readFileSync(INPUT_FILE, "utf-8"));

  if (matches.length === 0) {
    console.log("El archivo JSON está vacío. Nada que aplicar.");
    return;
  }

  console.log(`Aplicando ${matches.length} vinculaciones confirmadas...`);

  let successCount = 0;

  for (const m of matches) {
    try {
      await prisma.offer.update({
        where: { id: m.orphanId },
        data: { productId: m.targetProductId }
      });
      console.log(`[OK] Oferta ${m.orphanId} -> Producto ${m.targetProductId} (${m.titleO})`);
      successCount++;
    } catch (e) {
      console.error(`[ERROR] Falló al vincular la oferta ${m.orphanId}:`, e);
    }
  }

  console.log(`\n¡Proceso finalizado! ${successCount}/${matches.length} ofertas vinculadas exitosamente.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
