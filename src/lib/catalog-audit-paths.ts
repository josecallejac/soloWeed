import { isAbsolute, join, resolve } from "node:path";

const configuredDirectory = process.env.CATALOG_AUDIT_DIR?.trim();

export const CATALOG_AUDIT_DIR = configuredDirectory
  ? isAbsolute(configuredDirectory) ? configuredDirectory : resolve(process.cwd(), configuredDirectory)
  : join(process.cwd(), "reports", "catalog-audit");
export const CATALOG_AUDIT_RUNS_DIR = join(CATALOG_AUDIT_DIR, "runs");
export const CATALOG_AUDIT_LATEST_DIR = join(CATALOG_AUDIT_DIR, "latest");
export const CATALOG_AUDIT_REPORT_FILES = [
  "00-summary.csv",
  "01-home-visible.csv",
  "02-visible-products.csv",
  "03-categories.csv",
  "04-risks.csv",
  "05-opportunities.csv",
  "06-single-store-curated.csv",
  "07-two-store-curated.csv",
  "08-three-store-curated.csv",
  "09-four-store-curated.csv",
  "10-five-store-curated.csv",
  "11-six-store-curated.csv",
];
