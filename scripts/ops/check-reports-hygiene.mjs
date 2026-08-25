import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";

const strict = process.argv.includes("--strict") || process.env.STRICT_REPORT_HYGIENE === "1";
const tracked = execFileSync("git", ["ls-files", "--", "reports", "prisma"], { encoding: "utf8" })
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);

const reportFiles = tracked.filter((file) => file.startsWith("reports/"));
const trackedDatabaseFiles = tracked.filter((file) => /(^|[\\/])(?:dev|.*\.db(?:\.|$))/i.test(file));
const allowedPatterns = [
  /^reports\/protected-links\.json$/,
  /^reports\/(?:latest|approved)(?:[-_].*)?\.(?:json|csv|md)$/i,
  /^reports\/(?:latest|approved)(?:\/.*)?$/i,
  /^reports\/catalog-audit\/(?:latest|approved)(?:\/.*)?$/i,
];
const historicalReports = reportFiles.filter((file) => !allowedPatterns.some((pattern) => pattern.test(file)));
const bytes = reportFiles.reduce((total, file) => {
  try {
    return total + statSync(path.resolve(file)).size;
  } catch {
    return total;
  }
}, 0);

console.log(`Reportes rastreados: ${reportFiles.length}`);
console.log(`Tamaño rastreado: ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
console.log(`Reportes fuera de la allowlist: ${historicalReports.length}`);
if (historicalReports.length > 0) {
  console.log(historicalReports.slice(0, 20).map((file) => `- ${file}`).join("\n"));
  if (historicalReports.length > 20) console.log(`- ... y ${historicalReports.length - 20} más`);
}

if (trackedDatabaseFiles.length > 0) {
  console.log("Bases históricas rastreadas:");
  console.log(trackedDatabaseFiles.map((file) => `- ${file}`).join("\n"));
}

if (strict && (historicalReports.length > 0 || trackedDatabaseFiles.length > 0)) {
  process.exitCode = 1;
}
