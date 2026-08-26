export type AnalyticsValue = boolean | number | string;

export type AnalyticsEventPayloads = {
  "alerta-creada": { categoria: string; producto_id: number };
  "alerta-editada": { categoria: string; producto_id: number };
  "alerta-eliminada": { categoria: string; producto_id: number };
  "b2b-contacto": { canal: "email" | "whatsapp"; tienda: string };
  "busqueda-enviada": { origen: "portada"; tiene_consulta: boolean };
  "canasta-agregada": { categoria: string; producto_id: number; tiendas: number };
  "canasta-compartida": { cantidad: number; metodo: "nativo" | "portapapeles" };
  "canasta-eliminada": { categoria: string; producto_id: number };
  "clic-tienda": Record<string, AnalyticsValue>;
  "favorito-agregado": { categoria: string; producto_id: number; tiendas: number };
  "favorito-eliminado": { categoria: string; producto_id: number };
  "lista-compartida": { cantidad: number; metodo: "nativo" | "portapapeles" };
  "sugerencia-elegida": { tipo: "categoría" | "marca" | "producto" };
};

export type AnalyticsEventName = keyof AnalyticsEventPayloads;

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

export function trackAnalytics<EventName extends AnalyticsEventName>(
  eventName: EventName,
  data: AnalyticsEventPayloads[EventName],
) {
  if (typeof window === "undefined") return;

  try {
    window.umami?.track(eventName, data as Record<string, unknown>);
  } catch {
    // La analítica es opcional y nunca debe bloquear una acción pública.
  }
}
