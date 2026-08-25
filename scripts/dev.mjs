import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Next 16 writes a managed block to AGENTS.md when it detects an AI coding
// agent. This repository already has contributor instructions there, so keep
// the normal `npm run dev` workflow from mutating that tracked file.
const env = { ...process.env };
for (const key of ["AI_AGENT", "CODEX_CI", "CODEX_SANDBOX", "CODEX_THREAD_ID"]) {
  delete env[key];
}

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [nextBin, "dev", "--webpack"], {
  env,
  stdio: "inherit",
  windowsHide: true,
});

child.on("error", (error) => {
  console.error(`No se pudo iniciar Next.js: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
