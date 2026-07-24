type EmptyStateProps = {
  variant?: "catalog" | "product";
  dbReady?: boolean;
};

export function EmptyState({ variant, dbReady }: EmptyStateProps) {
  if (variant === "catalog") {
    return (
      <div className="rounded-2xl border border-dashed border-black/20 dark:border-white/15 bg-white/80 dark:bg-[#0d0d12]/80 p-12  text-center text-zinc-900 dark:text-white transition-colors duration-300 shadow-lg">
        <h3 className="text-2xl font-black tracking-tight">Aun no hay ofertas para mostrar</h3>
        <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-white/50 text-sm leading-relaxed">
          {dbReady
            ? "No encontramos productos para estos filtros. Prueba quitando filtros o vuelve mas tarde para ver nuevas ofertas."
            : "Estamos preparando el catalogo. Vuelve pronto para revisar las primeras ofertas disponibles."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-black/20 dark:border-white/15 bg-white/80 dark:bg-[#0d0d12]/80 p-12  text-center text-zinc-900 dark:text-white transition-colors duration-300 shadow-lg">
      <h3 className="text-2xl font-black tracking-tight">Aun no hay ofertas asociadas</h3>
      <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-white/50 text-sm leading-relaxed">
        Este producto curado todavia no tiene ofertas vigentes asociadas. Vuelve mas tarde para revisar disponibilidad.
      </p>
    </div>
  );
}
