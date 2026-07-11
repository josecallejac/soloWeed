"use client";

import { useLinkStatus } from "next/link";

// Debe renderizarse como hijo de un <Link>: useLinkStatus reporta si la
// navegación de ESE link está en vuelo, para dar feedback inmediato al clic.
export function LinkPendingBadge({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span
        aria-label="Cargando"
        className="ml-auto size-4 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
        role="status"
      />
    );
  }
  return <>{children}</>;
}
