import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureDom } from "./helpers.mjs";

ensureDom();
const { Module } = await import("../src/core/module.js");
const { ModuleManager } = await import("../src/core/module-manager.js");
const { EventBus } = await import("../src/core/event-bus.js");
const { MockAdapter, NullAdapter } = await import("../src/core/adapter.js");

function makeManager(adapter) {
  if (!adapter) {
    adapter = new MockAdapter();
    // Most lifecycle tests need a loaded world, because modules default to
    // running only inside a world.
    adapter.setWorldLoaded(true);
  }
  const bus = new EventBus();
  const notify = [];
  const mm = new ModuleManager({ bus, game: adapter, onNotify: (t, l) => notify.push({ t, l }) });
  return { mm, bus, notify, adapter };
}

test("a module cannot enable when a required capability is missing", () => {
  const { mm } = makeManager(new NullAdapter());
  const m = new Module({ id: "needs-world", name: "Needs World", category: "Render", requiredCapabilities: ["world"] });
  mm.register(m);
  assert.equal(m.canEnable(), false);
  m.enable();
  assert.equal(m.active, false);
  assert.match(m.ineligibilityReason(), /world/);
});

test("enable/disable calls lifecycle hooks exactly once each", () => {
  const { mm } = makeManager();
  let enables = 0;
  let disables = 0;
  class M extends Module {
    onEnable() {
      enables++;
    }
    onDisable() {
      disables++;
    }
  }
  const m = new M({ id: "x", name: "X", category: "Misc" });
  mm.register(m);
  m.enable();
  m.enable();
  m.disable();
  m.disable();
  assert.equal(enables, 1);
  assert.equal(disables, 1);
  assert.equal(m.active, false);
});

test("a module that throws in onTick is disabled and does not break the others", () => {
  const { mm, notify } = makeManager();
  let goodTicks = 0;
  class Bad extends Module {
    onTick() {
      throw new Error("tick boom");
    }
  }
  class Good extends Module {
    onTick() {
      goodTicks++;
    }
  }
  const bad = new Bad({ id: "bad", name: "Bad", category: "Misc" });
  const good = new Good({ id: "good", name: "Good", category: "Misc" });
  mm.registerAll([bad, good]);
  bad.enable();
  good.enable();
  mm.tick(1);
  assert.equal(bad.active, false, "crashing module is disabled");
  assert.equal(good.active, true, "unrelated module keeps running");
  assert.equal(goodTicks, 1);
  assert.ok(notify.some((n) => n.l === "error"));
  assert.ok(bad.errorCount >= 1);
});

test("an exception during onEnable leaves the module disabled", () => {
  const { mm } = makeManager();
  class Boom extends Module {
    onEnable() {
      throw new Error("cannot enable");
    }
  }
  const m = new Boom({ id: "boom", name: "Boom", category: "Misc" });
  mm.register(m);
  m.enable();
  assert.equal(m.active, false);
});

test("adapter swap disables modules whose capabilities disappeared", () => {
  const adapter = new MockAdapter();
  adapter.setWorldLoaded(true);
  const { mm } = makeManager(adapter);
  const m = new Module({ id: "w", name: "World Only", category: "Render", requiredCapabilities: ["world"] });
  mm.register(m);
  m.enable();
  assert.equal(m.active, true);
  mm.game = new NullAdapter();
  const changed = mm.revalidateAll();
  assert.equal(m.active, false);
  assert.deepEqual(changed.map((c) => c.id), ["w"]);
});

test("keybinds toggle the matching module and modifiers take precedence", () => {
  const { mm } = makeManager();
  const plain = new Module({ id: "p", name: "Plain", category: "Misc" });
  const modded = new Module({ id: "m", name: "Modded", category: "Misc" });
  mm.registerAll([plain, modded]);
  plain.bind.set({ key: "KeyG", mouse: null, modifiers: {} });
  modded.bind.set({ key: "KeyG", mouse: null, modifiers: { ctrl: true } });
  mm.onKeybindPressed({ key: "KeyG", mouse: null, modifiers: { ctrl: true } });
  assert.equal(modded.active, true);
  assert.equal(plain.active, false);
  mm.onKeybindPressed({ key: "KeyG", mouse: null, modifiers: {} });
  assert.equal(plain.active, true);
});

test("search matches name, id and description", () => {
  const { mm } = makeManager();
  mm.registerAll([
    new Module({ id: "kill-aura", name: "KillAura", description: "attacks nearby targets", category: "Combat" }),
    new Module({ id: "fullbright", name: "Fullbright", description: "brighter world", category: "Render" }),
  ]);
  assert.equal(mm.search("kill")[0].id, "kill-aura");
  assert.equal(mm.search("brighter")[0].id, "fullbright");
  assert.equal(mm.search("aura")[0].id, "kill-aura");
  assert.equal(mm.search("zzzz").length, 0);
});

test("favourites persist on the module rather than the GUI", () => {
  const { mm } = makeManager();
  const m = new Module({ id: "fav", name: "Fav", category: "Misc" });
  mm.register(m);
  assert.equal(mm.isFavourite(m), false);
  mm.toggleFavourite(m);
  assert.equal(mm.isFavourite(m), true);
  assert.deepEqual(mm.favouriteIds(), ["fav"]);
});

test("duplicate module ids are rejected at registration", () => {
  const { mm } = makeManager();
  mm.register(new Module({ id: "dup", name: "A", category: "Misc" }));
  assert.throws(() => mm.register(new Module({ id: "dup", name: "B", category: "Misc" })), /duplicate module id/);
});

test("a module throwing in onInit is registered but marked unsupported", () => {
  const { mm } = makeManager();
  class BadInit extends Module {
    onInit() {
      throw new Error("init fail");
    }
  }
  const m = new BadInit({ id: "badinit", name: "BadInit", category: "Misc" });
  mm.register(m);
  assert.equal(mm.get("badinit"), m);
  assert.equal(m.unsupported, true);
  assert.match(m.unsupportedReason, /init failed/);
});
