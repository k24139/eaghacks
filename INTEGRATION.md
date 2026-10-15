# Eaglercraft 26.2-u1 integration

The supplied 26.2-u1 HTML was inspected directly. Its `eag-inline-wasm-br` asset expands to a 102,444,741-byte WebAssembly module with **12 exports**: TeaVM glue functions/tags, `main`, and `teavm.memory`. There are no exported player, entity, world, inventory, movement, camera, or renderer accessors. Shell globals include `window.__tv`, `window.__eaglerWasmModule`, and `window.__eaglerGameReady`.

The compiled client also retains Eaglercraft's supported `eaglercraftXOpts.hooks.screenChanged` launch hook and its own browser input self-test. The upstream Eaglercraft implementation calls `screenChanged(currentScreen != null ? currentScreen.getClass().getName() : null, ...)`, so `null` is a supported signal for normal gameplay with no GUI screen open. Eaglercraft also sets `window.minecraftServer = "singleplayer"` when launching the integrated single-player server.

## Build

1. Obtain the authoritative `eaglercraft-26.2-u1.html` (about 75 MB).
2. Run `npm ci`.
3. Run `npm test`.
4. Run `npm run build`.
5. Run `npm run build:eagler -- /path/to/eaglercraft-26.2-u1.html`.
6. Open `Eaglercraft-26.2-u1-Meteor.html` in a compatible browser.

The injector first installs a small preboot wrapper around `window.eaglercraftXOpts`. That wrapper preserves any existing `screenChanged` callback and mirrors screen changes to `window.__eaghacksScreenState` plus the `eaghacks:screenChanged` DOM event. The injector then bundles `src/integration/bootstrap.js` and inserts the dependency-free integration before `</body>`.

The original WASM and EPK payloads are left unchanged.

## Verified browser-bound capabilities

The integration does **not** claim direct Minecraft object access. It currently exposes only capabilities that can be implemented through supported browser/Eaglercraft boundaries:

- ClickGUI and DOM HUD framework.
- Separate transparent 2D HUD canvas above the game canvas.
- FPS/frame-time/session timing from the browser frame loop.
- Right Shift GUI handling and existing keybind manager.
- Pointer-lock release/reacquire support.
- Menu vs gameplay detection using the official `screenChanged` hook.
- Single-player vs unknown/remote classification using `window.minecraftServer` (`"singleplayer"` is local).
- Synthetic keyboard and mouse input using the same `KeyboardEvent`/`MouseEvent` dispatch pattern present in Eaglercraft 26.2-u1's compiled input self-test.
- `AutoWalk` through held `KeyW` injection.
- `AutoClicker` through left/right mouse event injection.
- Custom Crosshair and browser/HUD-only modules when gameplay is active.
- Automatic disabling/revalidation of gameplay-only modules when a GUI screen opens.
- Cleanup of synthetically held keys on disable/shutdown.

`AutoClicker` and `AutoWalk` are treated as local-test-only automation. On integrated single-player they may enable normally. Unknown/remote sessions are blocked by default. An explicit runtime override exists:

```js
EaglerHacks.allowMultiplayerCombat(true)
```

Disable the override again with `false`. `EaglerHacks.diagnostics()` reports the current state.

## Still unavailable without deeper native/source hooks

The standalone WASM does not currently provide stable browser-callable access to:

- player position, rotation, health, velocity, hunger, or effects;
- world/block queries;
- entity lists and entity metadata;
- inventory/hotbar/armor data;
- camera matrices or world-to-screen projection;
- direct FOV/brightness/gamma controls;
- packet/network internals;
- direct movement physics, collision, flight, step height, knockback, or tick rate.

Therefore ESP, Tracers, Nametags, KillAura targeting, Aim Assist, Flight, Speed, Step, NoFall, inventory automation, X-Ray, and similar native-state modules remain capability-gated rather than pretending to work.

## Validation performed

- The original 26.2-u1 HTML was inspected and its WASM decompressed/parsed.
- The original HTML contains exactly one `window.eaglercraftXOpts = {` assignment marker used by the injector.
- The preboot screen hook was exercised independently: it preserves a pre-existing hook and records both GUI class names and `null` gameplay state.
- The Eaglercraft browser adapter was exercised locally with a fake DOM/event target. It emitted `KeyW`, `Space`, left-click, and right-click events and suppressed new gameplay input when a pause screen was reported.
- The repository contains dedicated `eaglercraft-integration.test.mjs` and `safety.test.mjs` coverage.
- The preserved Freebuff baseline previously passed 82 Node tests and 18 Chromium harness checks before these integration changes.

### Remaining validation blocker

The current execution environment enforces a managed Chromium policy that blocks `localhost`, custom loopback hostnames, and `file://` URLs with `ERR_BLOCKED_BY_ADMINISTRATOR`. Because of that policy, a complete in-world run of the 75 MB standalone HTML could not be executed here. This is an environment limitation, not a passing gameplay test. Do not report the final integrated client as end-to-end tested until it is launched in an unrestricted browser and the full suite is rerun after `npm ci`.
