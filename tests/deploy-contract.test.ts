import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const deployScript = readFileSync(new URL("../deploy.sh", import.meta.url), "utf8");
const composeFile = readFileSync(new URL("../docker-compose.yml", import.meta.url), "utf8");
const monitorScript = readFileSync(new URL("../scripts/ops/check-health.sh", import.meta.url), "utf8");

describe("contrato de despliegue", () => {
  it("usa api/health como endpoint predeterminado y exige catálogo fresco", () => {
    assert.match(deployScript, /HEALTH_URL=.*\/api\/health/);
    assert.match(deployScript, /catalog.*fresh/);
    assert.match(deployScript, /database.*ok/);
  });

  it("permite comprobar liveness por la portada únicamente durante rollback", () => {
    assert.match(deployScript, /require_release.*== '0'.*fallback_url/);
    assert.match(deployScript, /Rollback verificado mediante/);
  });

  it("mantiene el healthcheck de Compose alineado con el endpoint de producción", () => {
    assert.match(composeFile, /127\.0\.0\.1:3000\/api\/health/);
    assert.match(composeFile, /body\.ok === true/);
    assert.match(composeFile, /body\.catalog === 'fresh'/);
  });

  it("mantiene el monitor externo alineado aunque el JSON tenga espacios", () => {
    assert.match(monitorScript, /"ok"\[\[:space:\]\]\*:\[\[:space:\]\]\*true/);
    assert.match(monitorScript, /"database"\[\[:space:\]\]\*:\[\[:space:\]\]\*"ok"/);
    assert.match(monitorScript, /"catalog"\[\[:space:\]\]\*:\[\[:space:\]\]\*"fresh"/);
  });
});
