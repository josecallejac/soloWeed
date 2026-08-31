import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { trackAnalytics } from "../src/lib/analytics";

describe("analítica pública", () => {
  it("es un no-op seguro cuando Umami no está disponible", () => {
    assert.doesNotThrow(() => {
      trackAnalytics("busqueda-enviada", { origen: "portada", tiene_consulta: true });
    });
  });

  it("envía una sola vez el evento tipado y no incluye la consulta", () => {
    const calls: Array<{ event: string; data?: Record<string, unknown> }> = [];
    withWindow({
      umami: {
        track: (event: string, data?: Record<string, unknown>) => calls.push({ event, data }),
      },
    }, () => {
      trackAnalytics("busqueda-enviada", { origen: "portada", tiene_consulta: true });
    });

    assert.deepEqual(calls, [{
      event: "busqueda-enviada",
      data: { origen: "portada", tiene_consulta: true },
    }]);
    assert.equal("consulta" in (calls[0].data ?? {}), false);
  });

  it("no rompe la acción si el bloqueador de analítica hace fallar el tracker", () => {
    withWindow({
      umami: {
        track: () => {
          throw new Error("blocked");
        },
      },
    }, () => {
      assert.doesNotThrow(() => {
        trackAnalytics("favorito-agregado", { categoria: "Papelillos", producto_id: 1, tiendas: 4 });
      });
    });
  });

  it("registra la importación de una lista sin exponer sus productos", () => {
    const calls: Array<{ event: string; data?: Record<string, unknown> }> = [];
    withWindow({
      umami: {
        track: (event: string, data?: Record<string, unknown>) => calls.push({ event, data }),
      },
    }, () => {
      trackAnalytics("lista-importada", { cantidad: 3, modo: "mezclar", omitidos: 1 });
    });

    assert.deepEqual(calls, [{
      event: "lista-importada",
      data: { cantidad: 3, modo: "mezclar", omitidos: 1 },
    }]);
    assert.equal("ids" in (calls[0].data ?? {}), false);
  });
});

function withWindow(value: unknown, callback: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value });
  try {
    callback();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
}
