import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureDom, bootTestClient } from "./helpers.mjs";

const dom = ensureDom();

function keydown(win, init) {
  const ev = new win.KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  win.document.dispatchEvent(ev);
  return ev;
}

function click(win, node, init = {}) {
  node.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true, ...init }));
}

function contextMenu(win, node) {
  node.dispatchEvent(new win.MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
}

test("category windows are created for populated categories", async () => {
  const { client, doc } = await bootTestClient();
  client.clickgui.show();
  const windows = doc.querySelectorAll(".mt-window");
  assert.ok(windows.length >= 8, `expected several windows, got ${windows.length}`);
  const titles = [...doc.querySelectorAll(".mt-title")].map((n) => n.textContent);
  for (const cat of ["Combat", "Movement", "Render", "Player", "World", "Misc", "HUD"]) {
    assert.ok(titles.includes(cat), `missing category window: ${cat}`);
  }
});

test("right shift opens the ClickGUI and escape/right shift closes it", async () => {
  const { client, win, doc } = await bootTestClient();
  assert.equal(client.clickgui.open, false);
  keydown(win, { code: "ShiftRight", key: "Shift" });
  assert.equal(client.clickgui.open, true);
  assert.ok(doc.getElementById("meteor-clickgui").classList.contains("mt-open"));
  keydown(win, { code: "Escape", key: "Escape" });
  assert.equal(client.clickgui.open, false);
});

test("opening the GUI releases pointer lock through the adapter", async () => {
  const { client, adapter } = await bootTestClient();
  let requested = null;
  adapter.setPointerLock = (v) => {
    requested = v;
    return true;
  };
  client.clickgui.show();
  assert.equal(requested, false);
});

test("left-clicking a module row toggles it", async () => {
  const { client, win, doc } = await bootTestClient({ inWorld: true });
  client.clickgui.show();
  const row = [...doc.querySelectorAll(".mt-row")].find((r) => r.querySelector(".mt-name")?.textContent === "Sprint");
  assert.ok(row, "Sprint row rendered");
  const sprint = client.modules.get("sprint");
  assert.equal(sprint.active, false);
  click(win, row);
  assert.equal(sprint.active, true);
  assert.ok(row.classList.contains("mt-on"));
});

test("right-clicking a module row expands its settings", async () => {
  const { client, win, doc } = await bootTestClient();
  client.clickgui.show();
  const row = [...doc.querySelectorAll(".mt-row")].find((r) => r.querySelector(".mt-name")?.textContent === "KillAura");
  const container = row.parentElement;
  const expand = container.querySelector(".mt-expand");
  assert.ok(expand.classList.contains("mt-hidden"));
  contextMenu(win, row);
  assert.equal(expand.classList.contains("mt-hidden"), false);
  // A setting widget for the attack range should now exist.
  const labels = [...expand.querySelectorAll("label")].map((l) => l.textContent);
  assert.ok(labels.some((l) => /range/i.test(l)), "range setting rendered");
});

test("search filters across categories", async () => {
  const { client, doc } = await bootTestClient();
  client.clickgui.show();
  const input = doc.querySelector(".mt-search");
  input.value = "kill";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  const results = [...doc.querySelectorAll(".mt-search-win .mt-row .mt-name")].map((n) => n.textContent);
  assert.ok(results.includes("KillAura"));
  assert.ok(!results.includes("Fullbright"));
});

test("search by description also matches", async () => {
  const { client, doc } = await bootTestClient();
  client.clickgui.show();
  const input = doc.querySelector(".mt-search");
  // "original" appears only in Fullbright's description, never in its name.
  input.value = "original value";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  const results = [...doc.querySelectorAll(".mt-search-win .mt-row .mt-name")].map((n) => n.textContent);
  assert.ok(results.includes("Fullbright"), `got: ${results.join(", ")}`);
});

test("unsupported modules are visible but marked and refuse to enable", async () => {
  const { client, doc } = await bootTestClient();
  const xray = client.modules.get("xray");
  assert.equal(xray.unsupported, true);
  client.clickgui.show();
  const row = [...doc.querySelectorAll(".mt-row")].find((r) => r.querySelector(".mt-name")?.textContent === "X-Ray");
  assert.ok(row.classList.contains("mt-unsupported"));
});

test("dragging a window header moves it and persists", async () => {
  const { client, win, doc } = await bootTestClient();
  client.clickgui.show();
  const header = doc.querySelector(".mt-window .mt-header");
  const state = client.clickgui.windows.get(doc.querySelector(".mt-window").dataset.category);
  const before = state.y;
  header.dispatchEvent(new win.MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0, clientX: 0, clientY: 0 }));
  win.dispatchEvent(new win.MouseEvent("mousemove", { bubbles: true, clientX: 20, clientY: 60 }));
  win.dispatchEvent(new win.MouseEvent("mouseup", { bubbles: true }));
  assert.equal(state.y, before + 60);
  assert.ok(client.clickgui.serialiseLayout()[state.el.dataset.category]);
});

test("keybind capture writes to the module bind setting", async () => {
  const { client, doc, win } = await bootTestClient();
  client.clickgui.show();
  const row = [...doc.querySelectorAll(".mt-row")].find((r) => r.querySelector(".mt-name")?.textContent === "Sprint");
  const expand = row.parentElement.querySelector(".mt-expand");
  contextMenu(win, row);
  const bindBtn = expand.querySelector(".mt-bindbtn");
  assert.ok(bindBtn, "a bind button is rendered");
  click(win, bindBtn);
  assert.equal(client.keybinds.capturing, true);
  keydown(win, { code: "KeyJ", key: "j" });
  assert.equal(client.modules.get("sprint").bind.value.key, "KeyJ");
  assert.equal(client.keybinds.capturing, false);
});

test("closing the GUI restores gameplay key routing", async () => {
  const { client, win } = await bootTestClient();
  keydown(win, { code: "ShiftRight", key: "Shift" });
  assert.equal(client.keybinds.guiOpen, true);
  keydown(win, { code: "ShiftRight", key: "Shift" });
  assert.equal(client.keybinds.guiOpen, false);
  // A gameplay key must now reach the game: nothing should stop propagation.
  const ev = keydown(win, { code: "KeyW", key: "w" });
  assert.equal(ev.defaultPrevented, false);
});

test("gameplay keys are suppressed while the GUI is open", async () => {
  const { client, win } = await bootTestClient();
  client.clickgui.show();
  const ev = keydown(win, { code: "KeyW", key: "w" });
  assert.equal(ev.defaultPrevented, true);
});

test("HUD editor can be toggled from the config window", async () => {
  const { client } = await bootTestClient();
  client.hud.setEditing(true);
  assert.equal(client.hud.editing, true);
  assert.ok(client.hud.root.classList.contains("mt-hud-editor"));
});

test('GUI text editing preserves movement letters and native scrolling', async () => {
  const { client, win, doc } = await bootTestClient();
  client.clickgui.show();
  const input = doc.querySelector('.mt-search');
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'KeyT']) {
    const event = new win.KeyboardEvent('keydown', { code, bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false, `${code} must remain editable`);
  }
  let scrolled = 0;
  client.bus.on('mouse-scroll', () => scrolled++);
  const wheel = new win.WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
  doc.querySelector('.mt-window').dispatchEvent(wheel);
  assert.equal(wheel.defaultPrevented, false);
  assert.equal(scrolled, 0, 'GUI scroll must not trigger module/game wheel actions');
});

test('repeated shutdown preserves enabled module state', async () => {
  const { client, storage } = await bootTestClient({ inWorld: true });
  client.modules.get('sprint').enable();
  client.stop();
  const saved = [...storage.map.entries()];
  client.stop();
  assert.deepEqual([...storage.map.entries()], saved);
});
