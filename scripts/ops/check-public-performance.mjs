const baseUrl = (process.env.PERF_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://soloweed.store").replace(/\/$/, "");
const strict = process.argv.includes("--strict") || process.env.STRICT_PERFORMANCE === "1";
const configuredSamples = Number(process.env.PERF_SAMPLES || 3);
const samples = Number.isFinite(configuredSamples) ? Math.max(1, Math.floor(configuredSamples)) : 3;
const configuredTimeout = Number(process.env.PERF_TIMEOUT_MS || 15000);
const timeoutMs = Number.isFinite(configuredTimeout) ? Math.max(1000, Math.floor(configuredTimeout)) : 15000;
const probes = [
  { name: "home", path: "/", maxBytes: 300_000, maxMs: 800 },
  { name: "sitemap", path: "/sitemap.xml", maxBytes: 250_000, maxMs: 800 },
  { name: "health", path: "/api/health", maxBytes: 25_000, maxMs: 800 },
];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function probe(target) {
  const durations = [];
  let last = { status: 0, bytes: 0, contentType: "" };

  for (let index = 0; index < samples; index += 1) {
    const started = performance.now();
    const response = await fetch(`${baseUrl}${target.path}`, {
      cache: "no-store",
      headers: { "User-Agent": "SoloWeed-performance-check/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.arrayBuffer();
    durations.push(performance.now() - started);
    last = {
      status: response.status,
      bytes: body.byteLength,
      contentType: response.headers.get("content-type") || "",
    };
  }

  const durationMs = Math.round(median(durations));
  const passed = last.status >= 200 && last.status < 400 && last.bytes <= target.maxBytes && durationMs <= target.maxMs;
  console.log(`${target.name}: HTTP ${last.status}, ${last.bytes} bytes, p50 ${durationMs} ms, ${passed ? "OK" : "FUERA"}`);
  console.log(`  content-type: ${last.contentType}`);
  return { name: target.name, passed };
}

console.log(`Performance check: ${baseUrl} (${samples} muestras por ruta)`);
const results = [];
for (const target of probes) {
  try {
    results.push(await probe(target));
  } catch (error) {
    console.error(`${target.name}: error de red (${error instanceof Error ? error.message : String(error)})`);
    results.push({ name: target.name, passed: false });
  }
}

if (strict && results.some((result) => !result.passed)) {
  process.exitCode = 1;
}
