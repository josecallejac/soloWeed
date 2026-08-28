import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BASKET_COLLECTION, BASKET_STORAGE_KEY } from "../src/lib/basket";
import { FAVORITES_COLLECTION, FAVORITES_STORAGE_KEY, type FavoriteItem } from "../src/lib/favorites";
import { PRICE_ALERTS_STORAGE_KEY } from "../src/lib/price-alerts";
import {
  parseStoredCollection,
  readStoredCollection,
  subscribeToStoredCollection,
  writeStoredCollection,
  type StorageLike,
  type StoredCollectionDefinition,
} from "../src/lib/stored-collection";

type FixtureItem = {
  id: number;
  label: string;
};

const fixtureDefinition: StoredCollectionDefinition<FixtureItem> = {
  key: "fixture:v1",
  eventName: "fixture-change",
  limit: 2,
  isValid: (value): value is FixtureItem => Boolean(
    value
    && typeof value === "object"
    && Number.isInteger((value as Partial<FixtureItem>).id)
    && typeof (value as Partial<FixtureItem>).label === "string",
  ),
  getKey: (item) => item.id,
};

describe("colecciones locales", () => {
  it("mantiene las claves v1 existentes para no perder datos del navegador", () => {
    assert.equal(FAVORITES_STORAGE_KEY, "soloweed:favorites:v1");
    assert.equal(BASKET_STORAGE_KEY, "soloweed:basket:v1");
    assert.equal(PRICE_ALERTS_STORAGE_KEY, "soloweed:price-alerts:v1");
  });

  it("acepta un payload válido sin marcarlo para reparación", () => {
    const result = parseStoredCollection(JSON.stringify([
      { id: 1, label: "Uno" },
      { id: 2, label: "Dos" },
    ]), fixtureDefinition);

    assert.deepEqual(result.items, [{ id: 1, label: "Uno" }, { id: 2, label: "Dos" }]);
    assert.equal(result.needsRepair, false);
    assert.equal(result.malformed, false);
  });

  it("tolera JSON corrupto sin lanzar ni sobrescribirlo durante la lectura", () => {
    const storage = new MemoryStorage({ [fixtureDefinition.key]: "{no-es-json" });
    const result = readStoredCollection(storage, fixtureDefinition, { repair: true });

    assert.deepEqual(result.items, []);
    assert.equal(result.malformed, true);
    assert.equal(storage.getItem(fixtureDefinition.key), "{no-es-json");
  });

  it("filtra inválidos, deduplica por identidad y respeta el límite conservando el orden", () => {
    const result = parseStoredCollection(JSON.stringify([
      { id: 1, label: "Primero" },
      { id: 1, label: "Duplicado" },
      { nope: true },
      { id: 2, label: "Segundo" },
      { id: 3, label: "Excede el límite" },
    ]), fixtureDefinition);

    assert.deepEqual(result.items, [{ id: 1, label: "Primero" }, { id: 2, label: "Segundo" }]);
    assert.equal(result.discardedCount, 3);
    assert.equal(result.needsRepair, true);
  });

  it("repara dentro de la misma clave sin eliminar entradas válidas", () => {
    const storage = new MemoryStorage({
      [fixtureDefinition.key]: JSON.stringify([
        { id: 1, label: "Primero" },
        { id: 1, label: "Duplicado" },
        null,
        { id: 2, label: "Segundo" },
      ]),
    });

    const result = readStoredCollection(storage, fixtureDefinition, { repair: true });

    assert.deepEqual(result.items, [{ id: 1, label: "Primero" }, { id: 2, label: "Segundo" }]);
    assert.equal(storage.getItem(fixtureDefinition.key), JSON.stringify(result.items));
  });

  it("notifica cambios en la misma pestaña y escucha cambios de storage", () => {
    const storage = new MemoryStorage();
    const eventTarget = new EventTarget();
    let notifications = 0;
    const unsubscribe = subscribeToStoredCollection(eventTarget, fixtureDefinition, () => {
      notifications += 1;
    });

    const writeResult = writeStoredCollection(storage, fixtureDefinition, [{ id: 1, label: "Uno" }], eventTarget);
    assert.equal(writeResult.ok, true);
    assert.equal(notifications, 1);

    eventTarget.dispatchEvent(storageEvent(fixtureDefinition.key));
    assert.equal(notifications, 2);

    eventTarget.dispatchEvent(storageEvent("otra-clave"));
    assert.equal(notifications, 2);

    unsubscribe();
    eventTarget.dispatchEvent(new Event(fixtureDefinition.eventName));
    assert.equal(notifications, 2);
  });

  it("mantiene compatible un favorito v1 completo", () => {
    const favorite: FavoriteItem = {
      id: 7,
      title: "RAW Classic",
      href: "/productos/raw/classic",
      price: 1990,
      category: "Papelillos",
      brand: "RAW",
      storeCount: 4,
      imageUrl: null,
      savedAt: "2026-08-25T12:00:00.000Z",
    };
    assert.deepEqual(parseStoredCollection(JSON.stringify([favorite]), FAVORITES_COLLECTION).items, [favorite]);
  });

  it("actualiza una entrada de canasta v1 antigua con cantidad 1 sin perderla", () => {
    const legacy = {
      id: 8,
      title: "RAW Classic",
      href: "/productos/raw/classic",
      price: 1990,
      category: "Papelillos",
      brand: "RAW",
      storeCount: 1,
      imageUrl: null,
      addedAt: "2026-08-25T12:00:00.000Z",
    };
    const storage = new MemoryStorage({ [BASKET_STORAGE_KEY]: JSON.stringify([legacy]) });
    const result = readStoredCollection(storage, BASKET_COLLECTION, { repair: true });

    assert.equal(result.items[0].quantity, 1);
    assert.equal(result.needsRepair, true);
    assert.equal(JSON.parse(storage.getItem(BASKET_STORAGE_KEY) ?? "[]")[0].quantity, 1);
  });
});

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) this.values.set(key, value);
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function storageEvent(key: string) {
  const event = new Event("storage");
  Object.defineProperty(event, "key", { value: key });
  return event;
}
