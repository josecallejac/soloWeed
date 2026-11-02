import type { PrismaClient } from "@prisma/client";

export const E2E_DATABASE_NAME = "soloweed_e2e";
export const E2E_DATABASE_USER = "soloweed_e2e";

export class E2eSafetyError extends Error {}

type E2eEnvironment = { [key: string]: string | undefined; E2E_DATABASE?: string; DATABASE_URL?: string };

/** Runs before importing/constructing Prisma or starting the test server. */
export function assertSafeE2eEnvironment(env: E2eEnvironment = process.env): string {
  if (env.E2E_DATABASE !== "1") throw new E2eSafetyError("E2E requiere E2E_DATABASE=1.");
  if (!env.DATABASE_URL) throw new E2eSafetyError("E2E requiere DATABASE_URL explicita de QA.");
  let url: URL;
  try { url = new URL(env.DATABASE_URL); }
  catch { throw new E2eSafetyError("DATABASE_URL de E2E invalida."); }

  if (!new Set(["postgresql:", "postgres:"]).has(url.protocol) ||
      !new Set(["127.0.0.1", "localhost"]).has(url.hostname) ||
      url.pathname !== `/${E2E_DATABASE_NAME}` || url.username !== E2E_DATABASE_USER || url.hash) {
    throw new E2eSafetyError("E2E solo permite PostgreSQL loopback, base y usuario soloweed_e2e.");
  }
  // Driver URL parameters can override connection or schema selection. Only
  // the explicit default schema is permitted; no host/options/user overrides.
  for (const [key, value] of url.searchParams) {
    if (key !== "schema" || value !== "public") {
      throw new E2eSafetyError("La URL E2E solo admite el parametro schema=public.");
    }
  }
  if (url.searchParams.getAll("schema").length > 1) {
    throw new E2eSafetyError("La URL E2E no admite parametros duplicados.");
  }
  return env.DATABASE_URL;
}

export type E2eDatabaseIdentity = {
  databaseName: string;
  userName: string;
  sessionUserName: string;
  schemaName: string;
  superuser: boolean;
  createDatabase: boolean;
  createRole: boolean;
  replication: boolean;
  bypassRls: boolean;
  hasMemberships: boolean;
  ownsDatabase: boolean;
};

export function assertE2eDatabaseIdentity(rows: readonly E2eDatabaseIdentity[]) {
  const identity = rows[0];
  if (rows.length !== 1 || !identity || identity.databaseName !== E2E_DATABASE_NAME ||
      identity.userName !== E2E_DATABASE_USER || identity.sessionUserName !== E2E_DATABASE_USER ||
      identity.schemaName !== "public" || identity.ownsDatabase !== true ||
      [identity.superuser, identity.createDatabase, identity.createRole, identity.replication,
        identity.bypassRls, identity.hasMemberships].some((privilege) => privilege !== false)) {
    throw new E2eSafetyError("Conexion E2E rechazada: se exige la base QA y su rol dedicado sin privilegios administrativos ni membresias.");
  }
}

type E2eClient = Pick<PrismaClient, "$queryRaw" | "$disconnect">;

/** Every destructive seed action is passed as work, after both guards succeed. */
export async function withSafeE2eDatabase<T extends E2eClient, Result>(
  env: E2eEnvironment,
  createClient: (databaseUrl: string) => T | Promise<T>,
  work: (client: T) => Promise<Result>,
): Promise<Result> {
  const databaseUrl = assertSafeE2eEnvironment(env);
  const client = await createClient(databaseUrl);
  try {
    const identity = await client.$queryRaw<E2eDatabaseIdentity[]>`
      SELECT current_database()::text AS "databaseName", current_user::text AS "userName",
        session_user::text AS "sessionUserName", current_schema()::text AS "schemaName",
        r.rolsuper AS "superuser", r.rolcreatedb AS "createDatabase", r.rolcreaterole AS "createRole",
        r.rolreplication AS "replication", r.rolbypassrls AS "bypassRls",
        EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid) AS "hasMemberships",
        (d.datdba = r.oid) AS "ownsDatabase"
      FROM pg_roles r
      JOIN pg_database d ON d.datname = current_database()
      WHERE r.rolname = current_user
    `;
    assertE2eDatabaseIdentity(identity);
    return await work(client);
  } finally {
    await client.$disconnect();
  }
}

export async function verifyE2eDatabase(env: E2eEnvironment = process.env) {
  return withSafeE2eDatabase(env, async (databaseUrl) => {
    const { PrismaClient } = await import("@prisma/client");
    return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  }, async () => undefined);
}
