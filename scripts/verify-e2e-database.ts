import { E2eSafetyError, verifyE2eDatabase } from "./lib/e2e-database";

verifyE2eDatabase().then(() => {
  console.log("Identidad y permisos de la base E2E de QA verificados.");
}).catch((error: unknown) => {
  console.error(error instanceof E2eSafetyError ? error.message : "No se pudo verificar la conexion E2E de QA.");
  process.exitCode = 1;
});
