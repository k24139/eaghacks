# Eaglercraft 26.2-u1 integration

The supplied 26.2-u1 HTML was inspected directly. Its `eag-inline-wasm-br` asset expands to a 102,444,741-byte WebAssembly module with **12 exports**: nine TeaVM glue functions, one exception tag, `main`, and `teavm.memory`. There are no exported player, entity, world, inventory, or movement accessors. Shell globals include `window.__tv`, `window.__eaglerWasmModule`, and `window.__eaglerGameReady`. Game-ready does **not** mean a world is loaded.

## Build

1. Obtain the original `eaglercraft-26.2-u1.html` (about 75 MB).
2. Run `npm ci`.
3. Run `node tools/inject-eaglercraft.mjs /path/to/eaglercraft-26.2-u1.html`.
4. Open `Eaglercraft-26.2-u1-Meteor.html` in a compatible browser.

The injector bundles `src/integration/bootstrap.js` and the existing framework, then inserts the bundle before `</body>`. It leaves the original WASM and EPK payloads unchanged and adds no external runtime dependencies.

## Current scope

- The original game boot process is preserved.
- ClickGUI and HUD framework mount in the game document.
- Keyboard/mouse handling uses the existing keybind manager.
- HUD events draw into a separate transparent 2D canvas, not the game's WebGL canvas.
- Frame timing, viewport, shell readiness, and pointer-lock release use browser APIs.
- `window.EaglerHacks.diagnostics()` reports detected capabilities and shell state.
- `window.EaglerHacks.shutdown()` removes the integration.

**Not yet available:** real player/world/entity/inventory access, ESP, combat, movement modification, FOV/brightness changes, packet hooks, or in-world detection. Capability gating intentionally disables modules needing unavailable hooks. This is not a completed gameplay hack client.

## Validation

The adapter, bootstrap and injector have passed syntax checks locally. The existing Freebuff suite previously passed 82 tests and 18 harness browser checks, but those do **not** validate this new integration. A real in-world Eaglercraft browser test and full test suite are still required; the execution environment blocked browser navigation to the local client. Do not claim full integration is tested.
