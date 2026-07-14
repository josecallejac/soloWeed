"use client";

import type { ReactNode } from "react";

// Enlace saliente a la tienda (vía /ir/[offerId], que registra el clic
// server-side en OutboundClick). Además dispara un evento custom en Umami
// para poder ver el embudo visitas -> clic a tienda dentro del dashboard.
// Si el script de Umami está bloqueado (adblocker), el ?. lo vuelve no-op;
// el registro server-side sigue siendo la fuente de verdad.

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

type OutboundLinkProps = {
  offerId: number;
  className?: string;
  children: ReactNode;
  eventData?: Record<string, unknown>;
};

export function OutboundLink({ offerId, className, children, eventData }: OutboundLinkProps) {
  return (
    <a
      className={className}
      href={`/ir/${offerId}`}
      rel="nofollow noreferrer"
      target="_blank"
      onClick={() => {
        window.umami?.track("clic-tienda", eventData);
      }}
    >
      {children}
    </a>
  );
}
