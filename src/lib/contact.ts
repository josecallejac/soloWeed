// Datos de contacto para los CTA de la demo pública de inteligencia de precios.
// Son NEXT_PUBLIC_* → se inlinean en build; cambiarlos exige reconstruir la imagen.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "jose.ue98@gmail.com";

// Número en formato internacional sin "+" ni espacios, ej. "569XXXXXXXX".
// Si no está seteado, la vista pública oculta el botón de WhatsApp.
export const CONTACT_WHATSAPP = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "";

export function whatsappUrl(message: string): string | null {
  if (!CONTACT_WHATSAPP) return null;

  return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export function mailtoUrl(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });

  if (body) params.set("body", body);

  return `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}
