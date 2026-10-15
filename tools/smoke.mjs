/**
 * Smoke check: boot the client under jsdom, toggle modules, round-trip config.
 * Run with `node tools/smoke.mjs`. Exits non-zero on failure.
 */
import { installDom } from "./dom-env.mjs";

const dom = installDom();

const { bootMeteor } = await import("../src/index.js");
const { MockAdapter } = await import("../src/core/adapter.js");

const adapter = new MockAdapter();
const client = bootMeteor({ adapter, storage: null, fresh: true });

const diag = client.diagnostics();
console.log("modules:", diag.modules, "active:", diag.active, "listeners:", diag.listeners);
console.log("categories:", diag.categories.join(", "));

// Enable a HUD module (works without a world) and check the DOM node exists.
const fps = client.modules.get("fps-display");
fps.enable();
client.hud.sync();
const hudNodes = dom.window.document.querySelectorAll(".mt-hud-el").length;
console.log("hud nodes:", hudNodes);

// World-gated module should refuse while no world is loaded.
const coords = client.modules.get("coordinates");
console.log("coords ineligible:", coords.ineligibilityReason());

// Load a world, then it should become eligible.
adapter.setWorldLoaded(true);
client.setAdapter(adapter);
coords.enable();
console.log("coords active after world load:", coords.active);

// Simulate a tick.
client._clientTick(1);
client.hud.refresh(true);
const coordText = dom.window.document.querySelector('[data-module="coordinates"]')?.textContent;
console.log("coords text:", coordText);

// GUI open/close.
client.clickgui.show();
console.log("gui open:", client.clickgui.open, "windows:", dom.window.document.querySelectorAll(".mt-window").length);
client.clickgui.close();
console.log("gui closed:", client.clickgui.open);

// Config round trip.
const exported = client.config.exportProfile({ base64: false });
const parsed = JSON.parse(exported);
console.log("exported modules:", parsed.modules.length);
const res = client.config.importProfile(exported, { base64: false });
console.log("import ok:", res.ok, "errors:", res.errors.length);

// Corrupt config recovery.
const bad = client.config.deserialiseAll({ modules: "not-an-array" });
console.log("corrupt recovery:", bad.recovered, bad.errors[0]);

client.stop();
console.log("SMOKE OK");
