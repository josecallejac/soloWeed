import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

// Redirect saliente con tracking: registra el clic en OutboundClick y manda
// al usuario a la URL real de la oferta en la tienda.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const id = Number(offerId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.redirect(new URL("/", SITE_URL));
  }

  const offer = await prisma.offer.findUnique({
    where: { id },
    select: { url: true, storeId: true, productId: true },
  });
  if (!offer) {
    return NextResponse.redirect(new URL("/", SITE_URL));
  }

  // El registro no debe bloquear ni romper el redirect.
  try {
    await prisma.outboundClick.create({
      data: { offerId: id, storeId: offer.storeId, productId: offer.productId },
    });
  } catch (error) {
    console.error("No se pudo registrar el clic saliente", error);
  }

  return NextResponse.redirect(offer.url, { status: 302 });
}
