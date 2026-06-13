import { prisma } from "../src/lib/prisma";
// p10316 es el AtrapaCenizas Triple HoneyComb de 18mm (modelSlug y 2/3 ofertas
// lo confirman) pero su name quedo copiado del de 14mm. Correccion cosmetica.
async function main() {
  const name = "BongLab AtrapaCenizas Triple HoneyComb - Macho 18mm";
  await prisma.product.update({
    where: { id: 10316 },
    data: { name, normalizedName: name.toLowerCase() },
  });
  console.log("p10316 name ->", name);
}
main().finally(() => prisma.$disconnect());
