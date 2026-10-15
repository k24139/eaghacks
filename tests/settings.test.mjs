import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Settings,
  BoolSetting,
  IntSetting,
  DoubleSetting,
  StringSetting,
  EnumSetting,
  ColorSetting,
  KeybindSetting,
  normaliseColor,
  describeKeybind,
} from "../src/core/settings.js";

test("int settings clamp to their bounds", () => {
  const s = new IntSetting("range", "", 5, { min: 1, max: 10 });
  s.set(999);
  assert.equal(s.value, 10);
  s.set(-5);
  assert.equal(s.value, 1);
  s.set(6.4);
  assert.equal(s.value, 6);
});

test("double settings respect precision and bounds", () => {
  const s = new DoubleSetting("speed", "", 1, { min: 0, max: 5, precision: 2 });
  s.set(3.14159);
  assert.equal(s.value, 3.14);
  s.set(99);
  assert.equal(s.value, 5);
});

test("invalid input is rejected and does not change the value", () => {
  const s = new IntSetting("n", "", 7);
  const changed = s.set("not a number");
  assert.equal(changed, false);
  assert.equal(s.value, 7);
  assert.ok(s.lastParseError instanceof Error);
});

test("bool settings coerce common representations", () => {
  const b = new BoolSetting("b", "", false);
  b.set("true");
  assert.equal(b.value, true);
  b.set(0);
  assert.equal(b.value, false);
  assert.equal(b.set("maybe"), false);
});

test("enum settings only accept known options, case-insensitively", () => {
  const e = new EnumSetting("mode", "", "a", ["a", "b"]);
  e.set("B");
  assert.equal(e.value, "b");
  assert.equal(e.set("zzz"), false);
  assert.equal(e.value, "b");
});

test("string settings truncate to maxLength", () => {
  const s = new StringSetting("t", "", "", { maxLength: 3 });
  s.set("abcdef");
  assert.equal(s.value, "abc");
});

test("colour settings normalise hex, arrays and objects", () => {
  assert.deepEqual(normaliseColor("#ff0000"), { r: 255, g: 0, b: 0, a: 255 });
  assert.deepEqual(normaliseColor([1, 2, 3]), { r: 1, g: 2, b: 3, a: 255 });
  assert.deepEqual(normaliseColor({ r: 10, g: 20, b: 30 }), { r: 10, g: 20, b: 30, a: 255 });
  const c = new ColorSetting("c", "", { r: 255, g: 0, b: 0, a: 255 });
  c.set("#00ff00");
  assert.equal(c.toHex(false), "#00ff00");
});

test("settings only serialise when they differ from the default", () => {
  const s = new IntSetting("n", "", 5);
  assert.equal(s.serialise(), undefined);
  s.set(6);
  assert.equal(s.serialise(), 6);
  s.set(5);
  assert.equal(s.serialise(), undefined);
});

test("deserialising corrupt data resets to default without throwing", () => {
  const s = new IntSetting("n", "", 5, { min: 0, max: 10 });
  const ok = s.deserialise("garbage");
  assert.equal(ok, false);
  assert.equal(s.value, 5);
});

test("change callbacks fire and exceptions in them are contained", () => {
  const s = new IntSetting("n", "", 1);
  const seen = [];
  s.onChanged(() => {
    throw new Error("listener bug");
  });
  s.onChanged((v) => seen.push(v));
  s.set(2);
  assert.deepEqual(seen, [2]);
});

test("visibility predicate gates a setting", () => {
  const s = new BoolSetting("advanced", "", false);
  const v = new IntSetting("n", "", 1);
  v.visibleWhen(() => s.value);
  assert.equal(v.isVisible(), false);
  s.set(true);
  assert.equal(v.isVisible(), true);
});

test("group-added settings are indexed and findable", () => {
  const settings = new Settings();
  const g = settings.addGroup("Visual");
  g.int("range", "", 10, { min: 1, max: 20 });
  assert.ok(settings.get("range"));
  assert.equal(settings.get("range").value, 10);
  assert.equal(settings.all().length, 1);
});

test("duplicate setting names in one module are rejected", () => {
  const settings = new Settings();
  settings.int("a", "", 1);
  assert.throws(() => settings.int("a", "", 2), /duplicate setting name/);
});

test("keybind description is human readable", () => {
  assert.equal(describeKeybind({ key: "KeyG", mouse: null, modifiers: { ctrl: true } }), "Ctrl + G");
  assert.equal(describeKeybind({ key: null, mouse: 2, modifiers: {} }), "Mouse2");
  assert.equal(describeKeybind(null), "none");
});

test("reset returns a setting to its default", () => {
  const s = new KeybindSetting("b", "", null);
  s.set({ key: "KeyK", mouse: null, modifiers: {} });
  assert.ok(s.value);
  s.reset();
  assert.equal(s.value, null);
});
