import { prisma } from "./prisma";

type DatabaseProbe = () => Promise<unknown>;

export type HealthStatus = {
  database: "ok" | "unavailable";
  ok: boolean;
};

export async function getHealthStatus(
  probe: DatabaseProbe = () => prisma.$queryRaw`SELECT 1`,
): Promise<HealthStatus> {
  try {
    await probe();
    return { ok: true, database: "ok" };
  } catch {
    return { ok: false, database: "unavailable" };
  }
}
