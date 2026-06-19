import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Iniciando curacion manual de imagenes r1...");

  // 1. Sploofy Pro (3u)
  console.log("1. Vinculando Sploofy (oferta 27293 -> producto 10600)");
  await prisma.offer.update({
    where: { id: 27293 },
    data: { productId: 10600 },
  });
  console.log("   Sploofy vinculado exitosamente.");

  // 2. Mystica Max
  console.log("2. Creando producto Airistech Mystica Max...");
  const maxProduct = await prisma.product.create({
    data: {
      name: "Batería Airistech Mystica Max",
      normalizedName: "bateria airistech mystica max",
      brandKey: "airistech",
      modelKey: "mystica-max",
      modelSlug: "mystica-max",
      category: "Repuestos para bongs y vaporizadores",
      imageUrl: "https://cdnx.jumpseller.com/astrogrowshop/image/71842068/imagen_2_28646.webp", // Tomado del dHash log
    },
  });
  
  console.log(`   Producto creado con ID ${maxProduct.id}. Vinculando ofertas...`);
  await prisma.offer.updateMany({
    where: { id: { in: [24072, 26837, 26838] } },
    data: { productId: maxProduct.id },
  });
  console.log("   Mystica Max vinculado exitosamente.");

  // 3. Mystica Ace
  console.log("3. Creando producto Airistech Mystica Ace...");
  const aceProduct = await prisma.product.create({
    data: {
      name: "Batería Airistech Mystica Ace",
      normalizedName: "bateria airistech mystica ace",
      brandKey: "airistech",
      modelKey: "mystica-ace",
      modelSlug: "mystica-ace",
      category: "Repuestos para bongs y vaporizadores",
      imageUrl: "https://cdnx.jumpseller.com/astrogrowshop/image/71841315/imagen_1_28645.webp", // Tomado del dHash log
    },
  });

  console.log(`   Producto creado con ID ${aceProduct.id}. Vinculando ofertas...`);
  await prisma.offer.updateMany({
    where: { id: { in: [24071, 27629] } },
    data: { productId: aceProduct.id },
  });
  console.log("   Mystica Ace vinculado exitosamente.");

  console.log("Curacion finalizada.");
}

main()
  .catch((e) => {
    console.error("Error en script:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
