# Test results

This document records checks that were actually executed. It distinguishes the synthetic browser harness from the real Eaglercraft 26.2-u1 standalone build.

## Current CI result

GitHub Actions run **38665976367** on commit `a73e2d57a923428f013ae82c6935f0f573fa41a8` completed successfully.

### Node suite

```text
90 tests
90 pass
0 fail
```

The suite now includes the original framework/config/GUI/HUD/module tests plus Eaglercraft-specific adapter and safety coverage:

- official `screenChanged` state handling;
- no fabricated player/world capability from shell readiness;
- synthetic keyboard/mouse input generation;
- independent transparent HUD canvas;
- adapter cleanup/idempotence;
- local-test-only module blocking on remote sessions;
- explicit remote-session override behavior.

### Browser harness

Playwright Chromium 156.0.8078.4 executed `tools/browser-check.mjs` against the integration harness after CI started `tools/serve.mjs`.

```text
PASS  harness boots with no uncaught page errors
PASS  no console errors on load
PASS  module catalogue is populated — 77 modules
PASS  world canvas is rendering
PASS  Right Shift opens the ClickGUI — 9 windows
PASS  category windows are laid out
PASS  ClickGUI is visible
PASS  left-clicking a module row enables it
PASS  enabled module row is highlighted
PASS  right-click expands module settings
PASS  settings widgets are rendered — 5 controls
PASS  search filters modules — Tracers
PASS  HUD element renders real text — XYZ: 0.0, 64.0, 0.0
PASS  HUD element has non-zero size
PASS  Tracers actually change rendered pixels — 5437 pixels differ
PASS  module states survive a reload
PASS  gameplay keys are not intercepted when the GUI is closed
PASS  frame rate with 9 modules enabled stays playable — 60.6 fps

18/18 browser checks passed.
```

These 18 checks use the **synthetic integration harness**, not a real Eaglercraft world. They validate the framework, DOM/CSS/rAF paths, ClickGUI, persistence, input routing and rendering behavior.

## Eaglercraft 26.2-u1 inspection

The authoritative `eaglercraft-26.2-u1.html` was supplied and inspected directly.

- Original HTML size: **75,560,623 bytes**.
- Original SHA-256: `cd1caacf8440c0cbac94e35bd4686ed5397076522007330aa873eca23c134114`.
- `eag-inline-wasm-br` expands to a **102,444,741-byte** WebAssembly module.
- The WASM exposes only 12 exports: TeaVM glue/tags, `main`, and `teavm.memory`.
- It does **not** expose browser-callable player, world, entity, inventory, movement, camera or renderer objects.
- The client does expose the supported `eaglercraftXOpts.hooks.screenChanged` path used by the integration to distinguish menus from normal gameplay.
- Eaglercraft sets `window.minecraftServer = "singleplayer"` for an integrated single-player session; unknown/non-singleplayer sessions are treated conservatively as remote by the adapter.
- The compiled client contains its own DOM `KeyboardEvent`/`MouseEvent` self-test pattern; the adapter uses the same browser event mechanism for AutoWalk/AutoClicker input.

## Integration build

CI successfully builds both browser bundles:

```text
dist/meteor.bundle.js          218.5 KiB
dist/eaghacks-integration.js   223.7 KiB
```

The green CI artifact `eaghacks-integration-build` contains those bundles plus `Eaglercraft-26.2-u1-Meteor-Source-CI.zip`. GitHub reported artifact SHA-256:

`68468f3b20282287a246e9f4ca468880a20a8797e37d28cfd25a7a745032d932`

The downloaded artifact was independently hashed and matched that digest exactly.

## Standalone HTML assembly verification

The green-CI `dist/eaghacks-integration.js` bundle was injected into the authoritative original HTML along with the preboot `screenChanged` wrapper.

Result:

```text
Eaglercraft-26.2-u1-Meteor.html
size: 75,791,537 bytes
SHA-256: a4ef3778994f99a909fb08265c1802121c9cc2cbaf567892936125d5f37647c8
```

Structural verification removed exactly the two inserted integration regions from the generated file and reproduced the original HTML **byte-for-byte as UTF-8 text**. The original embedded Eaglercraft WASM/EPK payload was therefore not rewritten by the assembly step.

The generated file contains exactly one preboot integration hook and exactly one `eaghacks-integration` script.

## What is genuinely available in the standalone integration

Browser-bound features that do not require native Minecraft object access include:

- Meteor-style ClickGUI and configuration system;
- HUD/overlay framework;
- Right Shift GUI handling;
- screen/menu vs gameplay detection using Eaglercraft's hook;
- FPS/session/keystroke/CPS and other browser/HUD-only elements;
- Custom Crosshair;
- AutoWalk using held `KeyW` browser input;
- AutoClicker using mouse input events;
- pointer-lock release/reacquire integration;
- single-player vs unknown/remote classification;
- automatic revalidation/disable when a GUI screen opens;
- explicit multiplayer automation opt-in via `EaglerHacks.allowMultiplayerCombat(true)`.

## Still capability-gated

The following cannot honestly be marked functional from the current standalone WASM because stable browser-callable native state hooks are absent:

- ESP / Tracers / Nametags against real game entities;
- KillAura targeting and Aim Assist;
- Flight, Speed, Step, NoFall and direct physics modification;
- player coordinates/health/velocity readout from the real game;
- inventory/armor automation;
- block/world scanning and X-Ray;
- direct FOV/gamma/tick-rate manipulation;
- packet/network internals.

Those modules stay visible in the framework but are refused when their required capabilities are unavailable.

## Remaining end-to-end limitation

The environment used to assemble the 75 MB standalone client has a managed Chromium policy that blocks local `file://` and loopback origins with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore the exact generated `Eaglercraft-26.2-u1-Meteor.html` has **not** been launched through a real in-world session in this environment.

Do not interpret the 18/18 harness result as a real-game gameplay test. The next external validation step is to open the generated standalone HTML in an unrestricted compatible browser, enter a single-player world, and verify the screen hook, ClickGUI, overlay, AutoWalk and AutoClicker against the actual client.
