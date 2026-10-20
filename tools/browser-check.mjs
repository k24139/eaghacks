/**
 * Browser verification of the integration harness using headless Chromium.
 * This exercises the real DOM/CSS/rAF path that jsdom cannot (jsdom has no
 * canvas, no layout, and no real keyboard focus).
 *
 * Usage: node tools/browser-check.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:3000/";
const results = [];
const fail = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) fail.push(name);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

mkdirSync("artifacts", { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const consoleErrors = [];
const pageErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(`${m.text()} (${m.location().url || "unknown URL"})`);
});
page.on("pageerror", (e) => pageErrors.push(String(e)));

await page.goto(base, { waitUntil: "load" });
await page.waitForFunction(() => window.harness?.client, null, { timeout: 15000 });

check("harness boots with no uncaught page errors", pageErrors.length === 0, pageErrors.join("; "));
check("no console errors on load", consoleErrors.length === 0, consoleErrors.join("; "));

const moduleCount = await page.evaluate(() => window.harness.client.diagnostics().modules);
check("module catalogue is populated", moduleCount > 60, `${moduleCount} modules`);

// Canvas renders.
const painted = await page.evaluate(() => {
  const c = document.getElementById("game");
  const ctx = c.getContext("2d");
  const d = ctx.getImageData(0, 0, 40, 40).data;
  return d.some((v, i) => i % 4 !== 3 && v > 0);
});
check("world canvas is rendering", painted);

// ClickGUI opens with Right Shift.
await page.keyboard.press("ShiftRight");
await page.waitForTimeout(200);
const guiOpen = await page.evaluate(() => ({
  open: window.harness.client.clickgui.open,
  windows: document.querySelectorAll(".mt-window").length,
  visible: getComputedStyle(document.getElementById("meteor-clickgui")).display,
}));
check("Right Shift opens the ClickGUI", guiOpen.open === true, JSON.stringify(guiOpen));
check("category windows are laid out", guiOpen.windows >= 8, `${guiOpen.windows} windows`);
check("ClickGUI is actually visible (display != none)", guiOpen.visible !== "none", guiOpen.visible);

// Left-click toggles a module.
const toggled = await page.evaluate(() => {
  const rows = [...document.querySelectorAll(".mt-row")];
  const row = rows.find((r) => r.querySelector(".mt-name")?.textContent === "Entity ESP");
  row.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  return {
    active: window.harness.client.modules.get("entity-esp").active,
    onClass: row.classList.contains("mt-on"),
  };
});
check("left-clicking a module row enables it", toggled.active === true, JSON.stringify(toggled));
check("enabled module row is highlighted", toggled.onClass === true);

// Right-click expands settings.
const expand = await page.evaluate(() => {
  const row = [...document.querySelectorAll(".mt-row")].find((r) => r.querySelector(".mt-name")?.textContent === "Entity ESP");
  row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
  const wrap = row.parentElement.querySelector(".mt-expand");
  return { hidden: wrap.classList.contains("mt-hidden"), controls: wrap.querySelectorAll("input, select, button").length };
});
check("right-click expands module settings", expand.hidden === false);
check("settings widgets are rendered", expand.controls >= 3, `${expand.controls} controls`);

// Search.
const search = await page.evaluate(() => {
  const input = document.querySelector(".mt-search");
  input.value = "tracer";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return [...document.querySelectorAll(".mt-search-win .mt-row .mt-name")].map((n) => n.textContent);
});
check("search filters modules", search.includes("Tracers"), search.join(", "));

// Use browser keyboard input: assigning input.value misses capture-phase bugs.
const searchInput = page.getByRole('textbox', { name: 'Search modules', exact: true });
await searchInput.fill('');
await searchInput.pressSequentially('wasd test');
check('GUI accepts movement letters and spaces in search', await searchInput.inputValue() === 'wasd test');
await searchInput.fill('');
const scroll = await page.evaluate(() => {
  const body = [...document.querySelectorAll('.mt-window')].map(w => w.lastElementChild).find(e => e.scrollHeight > e.clientHeight);
  if (!body) return null;
  body.scrollTop = 0;
  return { x: body.getBoundingClientRect().x + 20, y: body.getBoundingClientRect().y + 20 };
});
if (scroll) {
  await page.mouse.move(scroll.x, scroll.y);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(100);
  check('GUI panels scroll with the mouse wheel', await page.evaluate(() => [...document.querySelectorAll('.mt-window')].some(w => w.lastElementChild.scrollTop > 0)));
}

await page.screenshot({ path: "artifacts/clickgui-open.png" });

// Close, enable a HUD element, verify it renders on screen.
await page.keyboard.press("ShiftRight");
await page.waitForTimeout(150);
const hudVisible = await page.evaluate(() => {
  window.harness.client.modules.get("coordinates").enable();
  window.harness.client.modules.get("fps-display").enable();
  window.harness.client.hud.refresh(true);
  const node = document.querySelector('[data-module="coordinates"]');
  const rect = node.getBoundingClientRect();
  return { text: node.textContent, w: rect.width, h: rect.height, display: getComputedStyle(node).display };
});
check("HUD element renders real text", /XYZ:/.test(hudVisible.text), hudVisible.text);
check("HUD element has non-zero size", hudVisible.w > 0 && hudVisible.h > 0, `${hudVisible.w}x${hudVisible.h}`);

// Render modules draw onto the canvas (compare pixels before/after toggling ESP).
const renderEffect = await page.evaluate(async () => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const before = ctx.getImageData(0, 0, canvas.width, canvas.height).data.slice();
  window.harness.client.modules.get("tracers").enable();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const after = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let diff = 0;
  for (let i = 0; i < after.length; i += 4) if (before[i] !== after[i]) diff++;
  return diff;
});
check("Tracers actually change rendered pixels", renderEffect > 0, `${renderEffect} pixels differ`);

// Persistence across reload.
await page.evaluate(() => window.harness.client.config.save(true));
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => window.harness?.client, null, { timeout: 15000 });
const persisted = await page.evaluate(() => ({
  esp: window.harness.client.modules.get("entity-esp").active,
  coords: window.harness.client.modules.get("coordinates").active,
  tracers: window.harness.client.modules.get("tracers").active,
}));
check("module states survive a reload", persisted.esp && persisted.coords && persisted.tracers, JSON.stringify(persisted));

await page.screenshot({ path: "artifacts/harness-running.png" });

// Pointer lock / input routing: gameplay keys must not be swallowed when closed.
const inputRouting = await page.evaluate(() => {
  const ev = new KeyboardEvent("keydown", { code: "KeyW", key: "w", bubbles: true, cancelable: true });
  document.dispatchEvent(ev);
  return ev.defaultPrevented;
});
check("gameplay keys are not intercepted when the GUI is closed", inputRouting === false);

// Performance: measure frame rate with several modules enabled.
const fps = await page.evaluate(async () => {
  const c = window.harness.client;
  for (const id of ["entity-esp", "tracers", "nametags", "radar", "custom-crosshair", "block-search", "fullbright"]) {
    c.modules.get(id)?.enable();
  }
  return await new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    function loop() {
      frames++;
      if (performance.now() - start < 1500) requestAnimationFrame(loop);
      else resolve((frames / (performance.now() - start)) * 1000);
    }
    requestAnimationFrame(loop);
  });
});
check("frame rate with 9 modules enabled stays playable", fps > 30, `${fps.toFixed(1)} fps`);

await browser.close();

console.log(`\n${results.length - fail.length}/${results.length} browser checks passed.`);
if (fail.length) {
  console.log("Failed: " + fail.join(", "));
  process.exit(1);
}
