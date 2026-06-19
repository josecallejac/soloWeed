type EmptyStateProps = {
  variant?: "catalog" | "product";
  dbReady?: boolean;
};

export function EmptyState({ variant, dbReady }: EmptyStateProps) {
  if (variant === "catalog") {
    return (
      <div className="rounded-xl border border-dashed border-black/20 dark:border-white/20 bg-zinc-50 dark:bg-[#18181b] p-10 text-center text-zinc-900 dark:text-white transition-colors duration-300">
        <h3 className="text-2xl font-black">Aun no hay ofertas para mostrar</h3>
        <p className="mx-auto mt-3 max-w-xl text-zinc-500 dark:text-white/50">
          {dbReady
            ? "No encontramos productos para estos filtros. Prueba quitando filtros o vuelve mas tarde para ver nuevas ofertas."
            : "Estamos preparando el catalogo. Vuelve pronto para revisar las primeras ofertas disponibles."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-black/20 dark:border-white/20 bg-zinc-50 dark:bg-[#18181b] p-10 text-center text-zinc-900 dark:text-white transition-colors duration-300">
      <h3 className="text-2xl font-black">Aun no hay ofertas asociadas</h3>
      <p className="mx-auto mt-3 max-w-xl text-zinc-500 dark:text-white/50">
        Este producto curado todavia no tiene ofertas vigentes asociadas. Vuelve mas tarde para revisar disponibilidad.
      </p>
    </div>
  );
}
