import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { getPriceIntelligence, positionStatus } from "../data";

export const dynamic = "force-dynamic";

// Separador ";" y BOM UTF-8: es lo que Excel es-CL espera para abrir el
// archivo con columnas y acentos correctos sin pasar por el asistente.
const SEPARATOR = ";";
const BOM = String.fromCharCode(0xfeff);

function csvValue(value: string | number) {
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request) {
  await requireAdmin();

  const storeSlug = new URL(request.url).searchParams.get("store") ?? "";
  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) {
    return NextResponse.json({ error: "Tienda desconocida" }, { status: 404 });
  }

  const data = await getPriceIntelligence(store.id);
  const lines = [
    ["Producto", "Tu precio", "Mejor competencia", "Tienda competencia", "Estado", "Diferencia", "Diferencia %", "Ficha"]
      .map(csvValue)
      .join(SEPARATOR),
  ];

  for (const row of data.positions) {
    const gap = row.myPrice - row.bestOtherPrice;
    lines.push(
      [
        row.productName,
        row.myPrice,
        row.bestOtherPrice,
        row.bestOtherStore,
        positionStatus(row),
        row.suspect ? "" : gap,
        row.suspect ? "" : ((gap / row.bestOtherPrice) * 100).toFixed(1),
        row.productPath ? new URL(row.productPath, SITE_URL).toString() : "",
      ]
        .map(csvValue)
        .join(SEPARATOR)
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(BOM + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inteligencia-precios-${store.slug}-${today}.csv"`,
    },
  });
}
