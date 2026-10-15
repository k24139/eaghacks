/**
 * Test helpers. The DOM must be installed *before* the framework modules are
 * imported, so everything here uses dynamic import.
 */
import { installDom } from "../tools/dom-env.mjs";

let dom = null;

export function ensureDom() {
  if (!dom) dom = installDom();
  return dom;
}

/** In-memory Storage implementation with failure injection. */
export class FakeStorage {
  constructor() {
    this.map = new Map();
    this.failWrites = false;
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    if (this.failWrites) throw new DOMException("quota exceeded", "QuotaExceededError");
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
  key(i) {
    return [...this.map.keys()][i] ?? null;
  }
  get length() {
    return this.map.size;
  }
  constructorName() {
    return "FakeStorage";
  }
}

/**
 * Boot a client with the full module set and a mock adapter.
 * @param {{inWorld?:boolean, storage?:any}} [opts]
 */
export async function bootTestClient(opts = {}) {
  const d = ensureDom();
  const { bootMeteor, shutdownMeteor } = await import("../src/index.js");
  const { MockAdapter } = await import("../src/core/adapter.js");
  shutdownMeteor();
  const storage = opts.storage === undefined ? new FakeStorage() : opts.storage;
  const adapter = new MockAdapter();
  if (opts.inWorld) adapter.setWorldLoaded(true);
  const client = bootMeteor({ adapter, storage, fresh: true, document: d.window.document, window: d.window });
  return { client, adapter, doc: d.window.document, win: d.window, storage };
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
