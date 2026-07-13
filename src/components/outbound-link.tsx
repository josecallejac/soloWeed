"use client";

import type { ReactNode } from "react";

// Enlace saliente a la tienda (vía /ir/[offerId], que registra el clic
// server-side en OutboundClick — la fuente de verdad del embudo visitas ->
// clic a tienda). target/rel están endurecidos para no filtrar referrer.

type OutboundLinkProps = {
  offerId: number;
  className?: string;
  children: ReactNode;
};

export function OutboundLink({ offerId, className, children }: OutboundLinkProps) {
  return (
    <a
      className={className}
      href={`/ir/${offerId}`}
      rel="nofollow noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
