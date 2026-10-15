import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureDom, bootTestClient, FakeStorage } from "./helpers.mjs";

ensureDom();
const { Theme } = await import("../src/gui/theme.js");

test("theme changes round-trip through load()", () => {
  const t = new Theme();
  t.set("accent", "#ff8800");
  t.scale = 1.5;
  const saved = t.serialise();
  const t2 = new Theme();
  assert.equal(t2.load(saved), true);
  assert.equal(t2.get("accent"), "#ff8800");
  assert.equal(t2.scale, 1.5);
});

test("theme load rejects unknown keys and wrong types", () => {
  const t = new Theme();
  const before = t.get("accent");
  const changed = t.load({ accent: 12345, notAThemeKey: "x", bg: "#000000" });
  assert.equal(changed, true, "the valid key still applied");
  assert.equal(t.get("accent"), before, "a number is not accepted for a colour string");
  assert.equal(t.get("bg"), "#000000");
  assert.equal(t.get("notAThemeKey"), undefined);
});

test("theme scale is clamped", () => {
  const t = new Theme();
  t.scale = 100;
  assert.equal(t.scale, 2.5);
  t.scale = 0.01;
  assert.equal(t.scale, 0.5);
  t.scale = "nonsense";
  assert.equal(t.scale, 1);
});

test("theme is persisted with the rest of the configuration", async () => {
  const storage = new FakeStorage();
  const a = await bootTestClient({ storage });
  a.client.theme.set("accent", "#123456");
  a.client.config.save(true);

  const b = await bootTestClient({ storage });
  assert.equal(b.client.theme.get("accent"), "#123456");
});

test("a corrupt theme payload does not prevent startup", async () => {
  const storage = new FakeStorage();
  storage.setItem(
    "meteor.eagler.default.config",
    JSON.stringify({ version: 1, modules: [], systems: { theme: { accent: {}, radius: "huge" } } }),
  );
  const { client } = await bootTestClient({ storage });
  assert.ok(client.modules.all().length > 0);
  assert.ok(typeof client.theme.get("accent") === "string");
});
