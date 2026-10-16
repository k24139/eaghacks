# Current audit: October 15, 2026

Starting branch: `meteor-client-integration`, commit `8b47d7af5100ba83b18e357db1b1a7de01fde8a8`. Main remained at `1ccda035bc03a3fac460fc3fe484c383a65a2d59`.

- Baseline Node suite: 97 passed, 0 failed.
- Final Node suite: 106 passed, 0 failed, 0 skipped.
- Build: both browser bundles compiled successfully.
- Chromium harness: 20/20 checks passed, including typed movement letters and native wheel scrolling. This uses synthetic world data.
- Real standalone: 11/11 startup/UI checks passed in headless Chromium 153.0.8010.0 (workspace-local @sparticuz/chromium), software WebGL. The original six embedded payloads were preserved.
- Real checks: menu-ready and game-ready signals, actual game canvas, one HUD overlay, Right Shift, nine GUI windows, typed search, FPS toggle, Escape, resize, no failed required requests, no uncaught/error-level startup failures.
- Manual real-world QA: created a single-player survival world, reached rendered terrain/entities with world-ready and terrain-ready signals, opened/closed ClickGUI, and opened the actual inventory. Found and fixed the adapter incorrectly requiring a non-null minecraftServer for single-player world readiness. The browser-only build still lacks native state access.
- Dependency audit: 0 vulnerabilities reported.
- Preview HTTP checks: root serves, `.git/config` and `.env` return 403.
- Known warning: supplied game reports an empty `minecraft:music.menu` sound event. It is recorded as a warning, not suppressed as a successful audio test.
- Browser installation initially failed: standard Playwright CDN downloads returned invalid archives. A separate workspace-local Chromium package supplied the binary. No global machine configuration changed.

Fixes: fetch/XHR embedded asset transport, embedded server asset routing, GUI text editing and scrolling, crash subscription cleanup, repeated-shutdown persistence, singleton replacement cleanup, toggle autosave, native menu command suppression, stale command cleanup, and preview path protection.

The public upstream source was inspected. Its README confirms omitted source inputs and Mojang asset/data resources, and its GUIDE requires Java 25. Only Java 17 is installed here. The matching prepared upstream build and required resource inputs are absent. `build:native` fails its prepared-project check at Minecraft.java, so the Java overlay has not been compiled or exercised in the game. Multiplayer and loaded-world native-module behavior are not certified. Real-game frame-rate parity was not established on this software-rendered browser. The project is not declared complete.

Earlier results below are historical. Their framework/harness module labels do not establish gameplay verification. MODULES.md uses conservative current statuses.

---

# Test results

This document records checks that were actually executed and keeps the synthetic framework harness separate from validation of the real Eaglercraft 26.2-u1 standalone client.

## Latest green integration CI

GitHub Actions run **38667015581** completed successfully on commit:

`28c17e342832f32abf18689893d2e415580e3c5e`

### Node suite

```text
92 tests
92 pass
0 fail
```

Relevant Eaglercraft integration coverage includes:

- game-ready state does not fabricate player/world access;
- optional `screenChanged` refinement;
- 26.2 `minecraftServer` loaded-session fallback;
- pointer-lock gameplay-input guard;
- synthetic `KeyboardEvent` / `MouseEvent` generation;
- held synthetic movement release when gameplay loses control;
- independent transparent HUD canvas;
- adapter mount/dispose idempotence;
- local-test-only module blocking on remote sessions;
- explicit remote-session override.

The suite also retains all existing settings, config, GUI, HUD, lifecycle, error-isolation and module tests.

Some tests intentionally exercise error paths and therefore print contained error messages (for example, a deliberately throwing module/listener). They still pass because isolation/recovery is the behavior under test.

### Chromium harness

Playwright Chromium 156.0.8078.4 ran `tools/browser-check.mjs` against the synthetic integration harness.

```text
PASS  harness boots with no uncaught page errors
PASS  no console errors on load
PASS  module catalogue is populated — 77 modules
PASS  world canvas is rendering
PASS  Right Shift opens the ClickGUI — 9 windows
PASS  category windows are laid out — 9 windows
PASS  ClickGUI is actually visible — block
PASS  left-clicking a module row enables it
PASS  enabled module row is highlighted
PASS  right-click expands module settings
PASS  settings widgets are rendered — 5 controls
PASS  search filters modules — Tracers
PASS  HUD element renders real text — XYZ: 0.0, 64.0, 0.0
PASS  HUD element has non-zero size — 183.03125x20
PASS  Tracers actually change rendered pixels — 5412 pixels differ
PASS  module states survive a reload
PASS  gameplay keys are not intercepted when the GUI is closed
PASS  frame rate with 9 modules enabled stays playable — 60.1 fps

18/18 browser checks passed.
```

These 18 checks use the **synthetic world harness**, not a real Minecraft world. They validate the framework/UI/render/input/persistence layer.

## CI build artifacts

The same green run built:

```text
dist/meteor.bundle.js          218.5 KiB
dist/eaghacks-integration.js   226.1 KiB
```

CI artifact:

- name: `eaghacks-integration-build`
- artifact ID: `11942985150`
- uploaded size: **335,867 bytes**
- GitHub SHA-256: `d15ef626099aef0332ba82c4e3d96ce035f3fa100ac919141f540792c2fc6b87`

The downloaded artifact was independently hashed and matched that digest exactly. It contains both bundles plus `Eaglercraft-26.2-u1-Meteor-Source-CI.zip`.

## Authoritative Eaglercraft input

The supplied original client was inspected directly:

```text
eaglercraft-26.2-u1.html
size:    75,560,623 bytes
SHA-256: cd1caacf8440c0cbac94e35bd4686ed5397076522007330aa873eca23c134114
```

Its compressed WASM expands to:

```text
102,444,741 bytes
```

The module exposes only 12 exports: TeaVM glue/tags, `main`, and `teavm.memory`.

No browser-callable player/world/entity/inventory/movement/camera/renderer API is exported.

## Latest standalone assembly

The latest green CI integration bundle was injected into the authoritative original HTML.

Result:

```text
Eaglercraft-26.2-u1-Meteor.html
size:    75,793,980 bytes
SHA-256: 05b07f5b2449aa2676081dc1ee72e20019cda44dfe81f41e71ccc383aceb4eb6
```

Verification:

- exactly one preboot integration region;
- exactly one `eaghacks-integration` script;
- removing those two injected regions reproduces the original supplied HTML exactly;
- original WASM/EPK payload is unchanged.

## Real Eaglercraft boot — PASS

The execution environment blocks navigation to local `file://`, localhost and loopback URLs. To exercise the actual standalone file anyway, Chromium was launched fresh under Xvfb with WebGL enabled through ANGLE/SwiftShader, and the entire self-contained HTML was loaded through Chrome DevTools Protocol `Page.setDocumentContent`.

The exact latest integrated file reached:

- **TeaVM/WASM instantiated**;
- **embedded Eaglercraft resources loaded**;
- **Minecraft startup reached**;
- **`window.__eaglerGameReady === true`**;
- **real WebGL2 game canvas present**;
- **`window.EaglerHacks` present**;
- **77 modules registered**;
- Eaglercraft adapter active with browser-bound capabilities;
- **zero uncaught top-level runtime exceptions during the validated boot**.

This is a real-client result, not the synthetic harness.

## Real ClickGUI overlay — PASS

A real DOM `Right Shift` key event was sent to the exact integrated game page after boot.

Observed:

```text
ClickGUI open: true
CSS display:   block
windows:       9
modules:       77
```

A captured frame visibly shows Combat, Movement, Render, Player, World, Misc, HUD, Search and Config windows layered over the actual Eaglercraft profile/game page.

This verifies that the framework coexists with the real Eaglercraft rendering/document rather than only working in the standalone harness.

## Runtime discoveries from real execution

### Storage fallback

The DevTools-loaded test page has an opaque `about:blank` origin. Access to `window.localStorage` itself throws `SecurityError` there.

The Eaglercraft bootstrap was updated to catch the getter failure and fall back to a memory-backed Storage-compatible object. After that fix, the framework booted normally alongside the real game.

On a normal browser origin, real `localStorage` remains the preferred backend.

### `screenChanged` behavior

The injected options object contains the wrapped `hooks.screenChanged` callback, and manually invoking the hook updates EaglerHacks state correctly.

However, the supplied **26.2-u1 runtime did not invoke the hook during the directly observed menu/profile boot**.

Therefore the active 26.2 fallback uses `window.minecraftServer` for loaded-session state and pointer-lock ownership for safe gameplay input:

- `minecraftServer === null`: no active server/session;
- `"singleplayer"`: integrated local server;
- other non-null values: treated as remote;
- synthetic gameplay input additionally requires the real game canvas to own pointer lock when no screen hook is available.

Held synthetic movement is released if pointer lock/input ownership is lost.

## Browser-input integration

The exact 26.2-u1 WASM contains a built-in synthetic browser-input self-test using DOM `KeyboardEvent` and `MouseEvent` dispatch. The Eaglercraft adapter uses the same browser event mechanism.

Automated integration tests verify:

- `KeyW` down/up;
- `Space` down/up;
- left mouse down/up;
- right mouse down/up;
- duplicate held-key suppression;
- no new automation when GUI state/input ownership forbids it;
- automatic release of a synthetically held key when gameplay loses control.

The standalone integration therefore has real browser-bound implementations for AutoWalk and AutoClicker, but see the in-world limitation below.

## Built-in single-player autotest attempt

The supplied WASM contains an internal test condition equivalent to:

```js
globalThis.__eaglerAutoTest === 'sp'
```

An otherwise-unmodified copy of the original client was launched with that flag.

Observed:

- normal real client initialization;
- WebGL2 initialization;
- integrated-server worker boot;
- `serverWorker mode ENABLED`;
- creation of `New World` deferred until worker boot;
- integrated worker reported image boot completion.

The DevTools-loaded page's opaque origin prevents the normal IndexedDB-backed Eaglercraft filesystem from operating as a normal persistent origin. The game falls back to RAM storage and the automatic world startup did not progress far enough for a trustworthy `minecraftServer === "singleplayer"`/in-world movement verification.

## Verified standalone feature boundary

Verified on the actual game shell/document:

- standalone game boot;
- EaglerHacks boot;
- ClickGUI coexistence;
- Right Shift opening;
- real overlay layout;
- runtime diagnostics;
- storage-degradation handling.

Verified through automated integration/browser tests:

- browser HUD layer;
- configuration/profile systems;
- browser input injection mechanics;
- AutoWalk/AutoClicker adapter actions;
- remote/local safety guard;
- held-key cleanup;
- pointer-lock gating;
- synthetic render modules/harness paths.

Not yet end-to-end verified inside a completed real Minecraft world in this environment:

- AutoWalk moving the real player;
- AutoClicker clicking inside a completed real world.

## Still capability-gated

No stable JavaScript access currently exists for:

- player coordinates/rotation/health/velocity;
- real entity lists;
- block/world lookup;
- inventory/hotbar/armor state;
- world-to-screen camera projection;
- native movement physics;
- packet/network internals;
- direct gamma/FOV/tick-rate internals.

Accordingly, real ESP, Tracers, Nametags, KillAura targeting, Aim Assist, Flight, Speed, Step, NoFall, inventory automation, X-Ray and similar native-state features remain unavailable rather than being falsely reported as functional.
