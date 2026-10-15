import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureDom, bootTestClient } from "./helpers.mjs";

ensureDom();

test("enabling a HUD element creates exactly one node", async () => {
  const { client, doc } = await bootTestClient();
  client.modules.get("fps-display").enable();
  const nodes = doc.querySelectorAll('[data-module="fps-display"]');
  assert.equal(nodes.length, 1);
});

test("disabling removes the node and leaves no orphans", async () => {
  const { client, doc } = await bootTestClient();
  const m = client.modules.get("fps-display");
  m.enable();
  m.disable();
  assert.equal(doc.querySelectorAll('[data-module="fps-display"]').length, 0);
});

test("HUD text updates from live data", async () => {
  const { client, doc } = await bootTestClient({ inWorld: true });
  const coords = client.modules.get("coordinates");
  client.adapter.player.x = 123.456;
  client.adapter.player.z = -78.9;
  coords.enable();
  client.hud.refresh(true);
  const text = doc.querySelector('[data-module="coordinates"]').textContent;
  assert.match(text, /123\.5/);
  assert.match(text, /-78\.9/);
});

test("coordinates show a placeholder when no world is loaded", async () => {
  const { client, doc } = await bootTestClient();
  client.modules.get("coordinates").enable();
  client.hud.refresh(true);
  // The element is active (HUD runs in menus) but cannot read a player.
  const text = doc.querySelector('[data-module="coordinates"]').textContent;
  assert.equal(text, "XYZ: —");
});

test("HUD layout round-trips through the config system", async () => {
  const { client } = await bootTestClient();
  const coords = client.modules.get("coordinates");
  coords.settings.get("hud-x").set(321);
  coords.settings.get("hud-y").set(111);
  const saved = client.hud.serialise();
  assert.equal(saved["coordinates"].x, 321);
  coords.settings.get("hud-x").set(0);
  client.hud.load(saved);
  assert.equal(coords.settings.get("hud-x").value, 321);
});

test("resetLayout returns every HUD element to its defaults", async () => {
  const { client } = await bootTestClient();
  const coords = client.modules.get("coordinates");
  coords.settings.get("hud-x").set(999);
  client.hud.resetLayout();
  assert.equal(coords.settings.get("hud-x").value, 4);
});

test("a HUD element that throws is reported and does not break the others", async () => {
  const { client, doc } = await bootTestClient();
  const fps = client.modules.get("fps-display");
  const coords = client.modules.get("coordinates");
  fps.enable();
  coords.enable();
  // Corrupt the settings access to force a throw inside hudRender.
  const originalGet = fps.settings.get.bind(fps.settings);
  fps.settings.get = (name) => (name === "label" ? undefined : originalGet(name));
  client.hud.refresh(true);
  assert.match(doc.querySelector('[data-module="fps-display"]').textContent, /error/);
  assert.equal(coords.active, true, "unrelated HUD element still enabled");
});

test("HUD elements apply position, opacity and colour to the node", async () => {
  const { client, doc } = await bootTestClient();
  const coords = client.modules.get("coordinates");
  coords.settings.get("hud-scale").set(2);
  coords.settings.get("hud-opacity").set(0.5);
  coords.settings.get("hud-color").set({ r: 255, g: 0, b: 0, a: 255 });
  coords.settings.get("hud-x").set(40);
  coords.settings.get("hud-y").set(55);
  coords.enable();
  const node = doc.querySelector('[data-module="coordinates"]');
  assert.equal(node.style.left, "40px");
  assert.equal(node.style.top, "55px");
  assert.equal(node.style.opacity, "0.5");
  // jsdom/cssstyle may normalise the hex colour to rgb().
  assert.ok(/#ff0000|rgb\(255,\s*0,\s*0\)/.test(node.style.color), `colour was ${node.style.color}`);
});

test("the scale transform formula is correct", async () => {
  const { hudTransform } = await import("../src/gui/hud.js");
  assert.equal(hudTransform(1), "");
  assert.equal(hudTransform(2), "scale(2)");
  assert.equal(hudTransform(1.5), "scale(1.5)");
  assert.equal(hudTransform(0), "");
});

test("visibility of HUD elements is persisted and restored", async () => {
  const { client } = await bootTestClient();
  client.modules.get("fps-display").enable();
  client.modules.get("cps-counter").enable();
  const vis = client.hud.serialiseVisibility();
  client.modules.get("fps-display").disable();
  client.hud.restoreVisibility(vis);
  assert.equal(client.modules.get("fps-display").active, true);
});
