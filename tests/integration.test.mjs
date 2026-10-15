import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureDom, bootTestClient } from "./helpers.mjs";

const dom = ensureDom();
const { MockAdapter } = await import("../src/core/adapter.js");

test("the client boots with the whole module catalogue", async () => {
  const { client } = await bootTestClient();
  const diag = client.diagnostics();
  assert.ok(diag.modules > 60, `expected a full catalogue, got ${diag.modules}`);
  assert.deepEqual(diag.categories, ["Combat", "Movement", "Render", "Player", "World", "Misc", "HUD", "Config"]);
});

test("every module has the required metadata", async () => {
  const { client } = await bootTestClient();
  for (const m of client.catalogue()) {
    assert.ok(m.id, "id");
    assert.ok(m.name, "name");
    assert.ok(m.description !== undefined && m.description.length > 0, `description for ${m.id}`);
    assert.ok(m.category, `category for ${m.id}`);
  }
});

test("module ids are unique", async () => {
  const { client } = await bootTestClient();
  const ids = client.catalogue().map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("world load enables world-gated modules and unload disables them", async () => {
  const { client } = await bootTestClient();
  const worldLoads = [];
  const worldUnloads = [];
  client.bus.on("world-load", () => worldLoads.push(1));
  client.bus.on("world-unload", () => worldUnloads.push(1));

  // A fresh adapter represents "a world was loaded" — swapping the adapter is
  // how the integration reports a world transition.
  const inWorld = new MockAdapter();
  inWorld.setWorldLoaded(true);
  client.setAdapter(inWorld);
  assert.equal(worldLoads.length, 1);
  assert.equal(inWorld.inWorld(), true);

  // A world-gated render module becomes eligible once a world is loaded.
  const esp = client.modules.get("entity-esp");
  assert.equal(esp.canEnable(), true);
  esp.enable();
  assert.equal(esp.active, true);

  const emptyWorld = new MockAdapter();
  emptyWorld.setWorldLoaded(false);
  client.setAdapter(emptyWorld);
  assert.equal(worldUnloads.length, 1);
  assert.equal(esp.active, false, "module disabled when its capabilities disappear");
});

test("a remote session blocks intrusive combat modules until opted in", async () => {
  const { client, adapter } = await bootTestClient({ inWorld: true });
  adapter.isRemote = () => true;
  const killaura = client.modules.get("kill-aura");

  // localTestOnly is now enforced centrally before onEnable(), so a remote
  // session must refuse activation immediately instead of enabling for one tick.
  killaura.enable();
  assert.equal(killaura.active, false, "remote session blocks activation at the module boundary");
  assert.match(killaura.ineligibilityReason(), /remote sessions/);

  client.allowMultiplayerCombat = true;
  killaura.enable();
  killaura.onTick();
  assert.equal(killaura.active, true, "explicit opt-in allows it");
});

test("render events reach subscribed modules with a canvas context", async () => {
  const { client } = await bootTestClient({ inWorld: true });
  const canvas = dom.window.document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  const drawn = [];
  const sub = client.bus.on("render-world", () => drawn.push(1));

  // Simulate what a real integration does each frame.
  client.bus.emit("render-world", { ctx, viewport: { width: 800, height: 600 }, projection: null, frame: {} });
  assert.equal(drawn.length, 1);
  sub.dispose();
});

test("module ticks are accounted for in the performance stats", async () => {
  const { client } = await bootTestClient();
  client.modules.get("fps-display").enable();
  for (let i = 0; i < 5; i++) client._clientTick(1);
  const snap = client.stats.snapshot();
  assert.ok(snap.moduleTickMs >= 0);
  assert.ok(Number.isFinite(snap.fps));
});

test("disabling every module leaves no listeners behind", async () => {
  const { client } = await bootTestClient({ inWorld: true });
  const baseline = client.bus.totalListeners();
  const killaura = client.modules.get("kill-aura");
  const trigger = client.modules.get("trigger-bot");
  killaura.enable();
  trigger.enable();
  assert.ok(client.bus.totalListeners() >= baseline);
  killaura.disable();
  trigger.disable();
  assert.equal(client.bus.totalListeners(), baseline, "listener count returns to baseline");
});

test("client stop() tears everything down", async () => {
  const { client } = await bootTestClient();
  client.modules.get("fps-display").enable();
  client.stop();
  assert.equal(client.modules.activeCount(), 0);
  assert.equal(client.ticker.running, false);
});

test("a module crashing in render does not stop the frame", async () => {
  const { client } = await bootTestClient({ inWorld: true });
  const esp = client.modules.get("entity-esp");
  esp.enable();
  esp.renderWorld = () => {
    throw new Error("render boom");
  };
  const canvas = dom.window.document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  assert.doesNotThrow(() => {
    client.bus.emit("render-world", { ctx, viewport: { width: 100, height: 100 }, projection: null, frame: {} });
  });
  assert.equal(esp.active, false, "crashed module is disabled");
});

test("toggling a module emits a toggle event other systems can observe", async () => {
  const { client } = await bootTestClient();
  const toggles = [];
  client.bus.on("module-toggled", (ev) => toggles.push([ev.module.id, ev.active]));
  const m = client.modules.get("fps-display");
  m.enable();
  m.disable();
  assert.deepEqual(toggles, [["fps-display", true], ["fps-display", false]]);
});
