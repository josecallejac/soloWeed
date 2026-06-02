type EmptyStateProps = {
  variant?: "catalog" | "product";
  dbReady?: boolean;
};

export function EmptyState({ variant, dbReady }: EmptyStateProps) {
  if (variant === "catalog") {
    return (
      <div className="rounded-[2rem] border border-dashed border-black/25 bg-white p-10 text-center">
        <h3 className="text-2xl font-black">Aun no hay ofertas para mostrar</h3>
        <p className="mx-auto mt-3 max-w-xl text-black/55">
          {dbReady
            ? "No encontramos productos para estos filtros. Prueba quitando filtros o vuelve mas tarde para ver nuevas ofertas."
            : "Estamos preparando el catalogo. Vuelve pronto para revisar las primeras ofertas disponibles."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-dashed border-black/25 bg-white p-10 text-center">
      <h3 className="text-2xl font-black">Aun no hay ofertas asociadas</h3>
      <p className="mx-auto mt-3 max-w-xl text-black/55">
        Este producto curado todavia no tiene ofertas vigentes asociadas. Vuelve mas tarde para revisar disponibilidad.
      </p>
    </div>
  );
}
