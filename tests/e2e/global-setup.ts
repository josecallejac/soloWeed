import { E2eSafetyError, verifyE2eDatabase } from "../../scripts/lib/e2e-database";

export default async function globalSetup() {
  try {
    await verifyE2eDatabase();
  } catch (error) {
    if (error instanceof E2eSafetyError) throw error;
    throw new E2eSafetyError("No se pudo verificar la conexion E2E de QA.");
  }
}
