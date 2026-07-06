import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "../logout-button";
import { exportCatalogAudit } from "../../../../scripts/export-catalog-audit";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams?: Promise<{
    compareRun?: string;
    file?: string;
    q?: string;
    run?: string;
  }>;
};

type ReportTable = {
  columns: string[];
  file: string;
  rows: Record<string, string>[];
};

const REPORT_DIR = join(process.cwd(), "reports", "catalog-audit");
const RUNS_DIR = join(REPORT_DIR, "runs");
const REPORT_FILES = [
  { file: "00-summary.csv", label: "Resumen" },
  { file: "01-home-visible.csv", label: "Home visible" },
  { file: "02-visible-products.csv", label: "Productos visibles" },
  { file: "03-categories.csv", label: "Categorias" },
  { file: "04-risks.csv", label: "Riesgos" },
  { file: "05-opportunities.csv", label: "Oportunidades" },
  { file: "06-single-store-curated.csv", label: "Curados 1 tienda" },
  { file: "07-two-store-curated.csv", label: "Curados 2 tiendas" },
  { file: "08-three-store-curated.csv", label: "Curados 3 tiendas" },
  { file: "09-four-store-curated.csv", label: "Curados 4 tiendas" },
];

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireAdmin();

  const params = (await searchParams) ?? {};
  const runs = await getReportRuns();
  const selectedRun = runs.includes(params.run ?? "") ? params.run! : runs[0] ?? "legacy";
  const compareRun = runs.includes(params.compareRun ?? "") && params.compareRun !== selectedRun ? params.compareRun! : "";
  const selectedFile = REPORT_FILES.some((report) => report.file === params.file) ? params.file! : REPORT_FILES[0].file;
  const selectedReport = REPORT_FILES.find((report) => report.file === selectedFile) ?? REPORT_FILES[0];
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const table = filterTable(await readReport(selectedReport.file, selectedRun), query);
  const comparison = compareRun ? compareTables(await readReport(selectedReport.file, selectedRun), await readReport(selectedReport.file, compareRun)) : null;
  const clicks = await getOutboundClickStats();

  return (
    <main className="min-h-screen bg-[#f4f1e8] px-5 py-6 text-[#17150f] sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <header className="rounded-[2rem] bg-[#17150f] p-6 text-[#f8f4df] shadow-[10px_10px_0_#bddf57]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link className="text-sm font-black uppercase tracking-[0.2em] text-[#bddf57]" href="/">
              SoloWeed
            </Link>
            <LogoutButton />
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Reportes de catalogo</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#f8f4df]/70">
            Vista interna de los CSV generados en <code>reports/catalog-audit/runs</code>. Puedes regenerar reportes, filtrar tablas, comparar
            ejecuciones historicas y limpiar el historial cuando quieras. Al regenerar una vista, se recalcula solo el CSV activo y se conservan las
            demas vistas desde el ultimo run.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <form action={regenerateReport}>
              <input name="file" type="hidden" value={selectedFile} />
              <input name="q" type="hidden" value={query} />
              <button className="rounded-full bg-[#bddf57] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#17150f] shadow-[5px_5px_0_#000] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_#000]">
                Regenerar esta vista
              </button>
            </form>
            <form action={clearReportHistory}>
              <input name="file" type="hidden" value={selectedFile} />
              <input name="q" type="hidden" value={query} />
              <input name="run" type="hidden" value={selectedRun} />
              <button className="rounded-full border border-[#f8f4df]/25 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#f8f4df] transition hover:border-[#bddf57] hover:text-[#bddf57]">
                Limpiar historico
              </button>
            </form>
          </div>
        </header>

        <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-5 shadow-[6px_6px_0_#17150f]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">Clics salientes (via /ir)</p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Trafico referido a tiendas</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm sm:min-w-60">
              <Stat label="Ultimos 30 dias" value={clicks.last30Days} />
              <Stat label="Total historico" value={clicks.total} />
            </div>
          </div>
          {clicks.byStore.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {clicks.byStore.map((store) => (
                <div className="rounded-2xl border border-black/10 bg-[#f4f1e8] px-4 py-3" key={store.name}>
                  <span className="block text-2xl font-black">{store.count}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-black/50">{store.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-black/55">
              Aun no hay clics registrados. Cada clic en &quot;Ir a tienda&quot; desde el catalogo o el detalle de producto queda registrado aqui.
            </p>
          )}
          {clicks.topProducts.length > 0 ? (
            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">Top productos por clics (30 dias)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {clicks.topProducts.map((product) => (
                  <span className="rounded-full border border-black/10 bg-[#f4f1e8] px-4 py-2 text-xs font-bold" key={product.id}>
                    {product.name} · {product.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <form className="mt-6 grid gap-3 rounded-[2rem] border border-black/10 bg-white p-4 shadow-[6px_6px_0_#17150f] lg:grid-cols-[1fr_1fr_1.2fr_auto]" method="get">
          <input name="file" type="hidden" value={selectedFile} />
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">Reporte</span>
            <select className="mt-1 w-full rounded-2xl border border-black/10 bg-[#f4f1e8] px-4 py-3 text-sm font-bold" name="run" defaultValue={selectedRun}>
              {runs.length > 0 ? runs.map((run) => <option key={run} value={run}>{formatRunLabel(run)}</option>) : <option value="legacy">Legacy</option>}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">Comparar con</span>
            <select className="mt-1 w-full rounded-2xl border border-black/10 bg-[#f4f1e8] px-4 py-3 text-sm font-bold" name="compareRun" defaultValue={compareRun}>
              <option value="">Sin comparar</option>
              {runs.filter((run) => run !== selectedRun).map((run) => <option key={run} value={run}>{formatRunLabel(run)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">Filtro texto</span>
            <input className="mt-1 w-full rounded-2xl border border-black/10 bg-[#f4f1e8] px-4 py-3 text-sm font-bold" name="q" placeholder="Buscar en todas las columnas" defaultValue={query} />
          </label>
          <button className="self-end rounded-2xl bg-[#17150f] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#bddf57]">
            Aplicar
          </button>
        </form>

        <nav className="mt-6 flex flex-wrap gap-2">
          {REPORT_FILES.map((report) => {
            const active = report.file === table.file;

            return (
              <Link
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                  active ? "bg-[#17150f] text-[#bddf57]" : "border border-black/10 bg-white text-black/60 hover:border-black/30 hover:text-black"
                }`}
                href={`/interno/reportes?file=${encodeURIComponent(report.file)}&run=${encodeURIComponent(selectedRun)}${compareRun ? `&compareRun=${encodeURIComponent(compareRun)}` : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                key={report.file}
              >
                {report.label}
              </Link>
            );
          })}
        </nav>

        <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-5 shadow-[8px_8px_0_#17150f]">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">{table.file} · {formatRunLabel(selectedRun)}</p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{selectedReport.label}</h2>
              {query ? <p className="mt-2 text-sm font-bold text-black/50">Filtro activo: {query}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm sm:min-w-60">
              <Stat label="Filas" value={table.rows.length} />
              <Stat label="Columnas" value={table.columns.length} />
            </div>
          </div>

          {comparison ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Stat label="Agregadas" value={comparison.added} />
              <Stat label="Eliminadas" value={comparison.removed} />
              <Stat label="Cambiadas" value={comparison.changed} />
              <Stat label="Iguales" value={comparison.same} />
            </div>
          ) : null}

          {table.rows.length > 0 ? (
            <div className="mt-5 max-h-[70vh] overflow-auto rounded-2xl border border-black/10">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#17150f] text-[#f8f4df]">
                  <tr>
                    {table.columns.map((column) => (
                      <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr className="border-t border-black/10 odd:bg-black/[0.02]" key={index}>
                      {table.columns.map((column) => (
                        <td className={getCellClassName(column)} key={column} title={row[column]}>
                          {row[column]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-black/20 p-8 text-center text-sm text-black/55">
              No hay filas para mostrar. Regenera el reporte con <code>npm run catalog:audit:export</code>.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#bddf57] px-4 py-3 text-[#17150f]">
      <span className="block text-2xl font-black">{value}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-black/50">{label}</span>
    </div>
  );
}

async function getOutboundClickStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [total, last30Days, byStoreRaw, byProductRaw] = await Promise.all([
      prisma.outboundClick.count(),
      prisma.outboundClick.count({ where: { createdAt: { gte: since } } }),
      prisma.outboundClick.groupBy({ by: ["storeId"], _count: true, where: { createdAt: { gte: since } } }),
      prisma.outboundClick.groupBy({
        by: ["productId"],
        _count: true,
        where: { createdAt: { gte: since }, productId: { not: null } },
        orderBy: { _count: { productId: "desc" } },
        take: 10,
      }),
    ]);

    const stores = await prisma.store.findMany({ select: { id: true, name: true } });
    const storeNames = new Map(stores.map((store) => [store.id, store.name]));
    const productIds = byProductRaw.map((row) => row.productId).filter((id): id is number => id !== null);
    const products = productIds.length > 0
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      : [];
    const productNames = new Map(products.map((product) => [product.id, product.name]));

    return {
      total,
      last30Days,
      byStore: byStoreRaw
        .map((row) => ({ name: storeNames.get(row.storeId) ?? `Tienda ${row.storeId}`, count: row._count }))
        .sort((a, b) => b.count - a.count),
      topProducts: byProductRaw.map((row) => ({
        id: row.productId!,
        name: productNames.get(row.productId!) ?? `Producto ${row.productId}`,
        count: row._count,
      })),
    };
  } catch {
    return { total: 0, last30Days: 0, byStore: [], topProducts: [] };
  }
}

async function readReport(file: string, run: string): Promise<ReportTable> {
  const baseDir = run === "legacy" ? REPORT_DIR : join(RUNS_DIR, run);

  return readReportFromPath(file, join(baseDir, file));
}

async function readReportFromPath(file: string, path: string): Promise<ReportTable> {
  try {
    const content = await readFile(path, "utf8");
    const rows = parseCsv(content.replace(/^\ufeff/, ""));
    const [columns = [], ...values] = rows;

    return {
      columns,
      file,
      rows: values.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""]))),
    };
  } catch {
    return { columns: [], file, rows: [] };
  }
}

async function getReportRuns() {
  try {
    const entries = await readdir(RUNS_DIR, { withFileTypes: true });

    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse();
  } catch {
    return [];
  }
}

function filterTable(table: ReportTable, query: string): ReportTable {
  if (!query) return table;
  const normalized = query.toLowerCase();

  return {
    ...table,
    rows: table.rows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(normalized))),
  };
}

function compareTables(current: ReportTable, previous: ReportTable) {
  const currentRows = new Map(current.rows.map((row, index) => [getCompareKey(row, index), JSON.stringify(row)]));
  const previousRows = new Map(previous.rows.map((row, index) => [getCompareKey(row, index), JSON.stringify(row)]));
  let added = 0;
  let removed = 0;
  let changed = 0;
  let same = 0;

  for (const [key, value] of currentRows) {
    if (!previousRows.has(key)) {
      added += 1;
    } else if (previousRows.get(key) !== value) {
      changed += 1;
    } else {
      same += 1;
    }
  }

  for (const key of previousRows.keys()) {
    if (!currentRows.has(key)) removed += 1;
  }

  return { added, changed, removed, same };
}

function getCompareKey(row: Record<string, string>, index: number) {
  return row.id || row.metric || row.category || row.name || `${index}`;
}

function getCellClassName(column: string) {
  const base = "px-3 py-2 align-top text-black/70";

  if (["name", "titles", "stores"].includes(column)) {
    return `${base} min-w-64 max-w-[420px] whitespace-normal break-words leading-5`;
  }

  return `${base} max-w-[260px] whitespace-nowrap overflow-hidden text-ellipsis`;
}

function formatRunLabel(run: string) {
  if (run === "legacy") return "Legacy";

  const date = parseRunDate(run);

  if (!date) return run;

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Santiago",
  }).format(date);
}

function parseRunDate(run: string) {
  const match = run.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);

  if (!match) return null;

  return new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`);
}

async function regenerateReport(formData: FormData) {
  "use server";

  await requireAdmin();

  const file = String(formData.get("file") ?? REPORT_FILES[0].file);
  const query = String(formData.get("q") ?? "");
  const selectedFile = REPORT_FILES.some((report) => report.file === file) ? file : REPORT_FILES[0].file;
  const result = await exportCatalogAudit({ file: selectedFile });
  const params = new URLSearchParams({ file: selectedFile, run: result.runId });

  if (query) params.set("q", query);

  revalidatePath("/interno/reportes");
  redirect(`/interno/reportes?${params.toString()}`);
}

async function clearReportHistory(formData: FormData) {
  "use server";

  await requireAdmin();

  const file = String(formData.get("file") ?? REPORT_FILES[0].file);
  const query = String(formData.get("q") ?? "");
  const run = String(formData.get("run") ?? "");
  const runs = await getReportRuns();
  const selectedFile = REPORT_FILES.some((report) => report.file === file) ? file : REPORT_FILES[0].file;
  const runToKeep = runs.includes(run) ? run : runs[0] ?? "";

  await Promise.all(runs.filter((entry) => entry !== runToKeep).map((entry) => rm(join(RUNS_DIR, entry), { force: true, recursive: true })));

  const params = new URLSearchParams({ file: selectedFile });

  if (runToKeep) params.set("run", runToKeep);
  if (query) params.set("q", query);

  revalidatePath("/interno/reportes");
  redirect(`/interno/reportes?${params.toString()}`);
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some(Boolean)) rows.push(row);
  }

  return rows;
}
