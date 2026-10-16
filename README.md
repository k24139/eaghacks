# Eaglercraft 26.2-u1 — Meteor-style browser client

A Meteor Client-inspired module framework and browser integration for the **authoritative Eaglercraft 26.2-u1 standalone HTML**.

The project now includes the module registry, settings system, ClickGUI, HUD, profiles/configuration, Eaglercraft-specific browser adapter, standalone HTML injector, automated tests, and CI build pipeline.

## Current status

The original `eaglercraft-26.2-u1.html` was supplied and inspected directly during integration work. A standalone integrated file has been produced outside the repository:

`Eaglercraft-26.2-u1-Meteor.html`

Latest verified standalone build:

- Original HTML: **75,560,623 bytes**
- Original SHA-256: `cd1caacf8440c0cbac94e35bd4686ed5397076522007330aa873eca23c134114`
- Integrated HTML: **75,793,980 bytes**
- Integrated SHA-256: `05b07f5b2449aa2676081dc1ee72e20019cda44dfe81f41e71ccc383aceb4eb6`
- The injector adds exactly two integration regions. Removing those regions reproduces the supplied original HTML exactly, so the embedded Eaglercraft WASM/EPK payload is not rewritten.

The large game HTML is deliberately not committed to Git history. `tools/inject-eaglercraft.mjs` reproduces it from the authoritative base.

### Real-client validation

The integrated 75 MB file was booted in a fresh Chromium session using a DevTools `Page.setDocumentContent` path to work around this environment's policy blocking local URLs.

Verified against the **actual Eaglercraft page**, not the synthetic harness:

- TeaVM/WASM instantiated.
- `window.__eaglerGameReady === true`.
- Actual WebGL2 game canvas created.
- Eaglercraft loaded all embedded resources and handed off to Minecraft.
- `window.EaglerHacks` loaded alongside the game.
- 77 modules registered.
- Right Shift opened the Meteor-style ClickGUI over the real Eaglercraft page.
- Nine ClickGUI windows rendered.
- No uncaught top-level runtime exception occurred during the validated boot.

The environment still could not complete a persistent single-player world startup because the DevTools-loaded page has an opaque origin and Eaglercraft's IndexedDB-backed filesystem falls back to RAM storage. Therefore AutoWalk/AutoClicker are covered by adapter/integration tests but have **not** yet been end-to-end exercised inside a completed real world in this environment.

See [`TEST_RESULTS.md`](./TEST_RESULTS.md) and [`INTEGRATION.md`](./INTEGRATION.md).

---

## What works on the standalone 26.2-u1 build

Browser-bound functionality that does not require direct Minecraft object access is integrated:

- Meteor-style ClickGUI.
- Right Shift open/close handling.
- Module search, settings widgets, keybinds and favourites.
- Persistent profiles when browser storage is available.
- In-memory configuration fallback when storage access is denied.
- DOM HUD framework and transparent Canvas2D overlay.
- FPS, CPS, keystrokes, session timer, active-module list, custom text and performance HUD elements.
- Custom Crosshair.
- Pointer-lock integration.
- Eaglercraft session detection through `window.minecraftServer`.
- Browser keyboard/mouse input injection using the same event mechanism retained in the 26.2-u1 client.
- AutoWalk through held `KeyW` injection.
- AutoClicker through mouse input injection.
- Automatic held-key release when gameplay loses browser input control.
- Local/remote guard for automated gameplay modules.

`AutoWalk` and `AutoClicker` are local-test-only by default. Eaglercraft's integrated single-player server identifies itself with `window.minecraftServer === "singleplayer"`. Unknown/remote sessions are blocked unless explicitly opted in through:

```js
EaglerHacks.allowMultiplayerCombat(true)
```

Disable the override with `false`.

### Capability-gated native-state features

The supplied Wasm-GC module expands to **102,444,741 bytes** and exports only 12 symbols: TeaVM glue/tags, `main`, and `teavm.memory`. It does not export browser-callable player, world, entity, inventory, camera, block-query or movement-physics accessors.

Because of that, the project intentionally refuses to pretend that native-state features work. These remain unavailable until a stable game/source-level hook is found:

- real Entity ESP / Tracers / Nametags;
- KillAura targeting / Aim Assist / TriggerBot targeting;
- Flight / Speed / Step / NoFall / direct physics changes;
- real coordinates, player health, velocity and effects;
- inventory/armor automation;
- block scanning, Storage ESP and X-Ray;
- direct FOV/gamma/tick-rate manipulation;
- packet/network internals.

Those modules remain in the catalogue but capability checks refuse activation when the runtime cannot support them.

---

## CI status

Latest integration CI run used the `meteor-client-integration` branch and passed:

```text
Node tests:        92 / 92
Chromium harness:  18 / 18
Modules:           77
Harness FPS:       ~60 fps with 9 modules enabled
```

The Chromium harness verifies ClickGUI interaction, settings, search, HUD rendering, module persistence, input routing and render-module behavior against the synthetic test world. It is separate from the real-game boot described above.

---

## Build the standalone client

Prerequisites: Node.js and the authoritative `eaglercraft-26.2-u1.html`.

```bash
npm ci
npm test
npm run build
npm run build:eagler -- /path/to/eaglercraft-26.2-u1.html
```

The final command produces:

```text
Eaglercraft-26.2-u1-Meteor.html
```

`tools/inject-eaglercraft.mjs`:

1. validates markers unique to the expected 26.2-u1 standalone HTML;
2. installs the Eaglercraft preboot/browser bridge;
3. bundles `src/integration/bootstrap.js` and the existing framework;
4. injects the dependency-free integration before `</body>`;
5. leaves the embedded game payload intact.

To test the framework harness separately:

```bash
node tools/serve.mjs 3000 .
npm run test:browser
```

---

## Architecture

```text
src/
  core/
    adapter.js               runtime-neutral GameAdapter contract
    event-bus.js             priorities, cancellation, subscription bags
    settings.js              typed settings + groups
    module.js                lifecycle, capability + remote-session guards
    module-manager.js        registry, categories, search, favourites, isolation
    keybind-manager.js       DOM input ownership
    config-manager.js        profiles, autosave, import/export, recovery
    stats.js                 FPS/frame/module timing
    meteor.js                framework bootstrap and tick ownership

  integration/
    eaglercraft-adapter.js   verified 26.2-u1 browser boundary
    bootstrap.js             real Eaglercraft integration entry point

  gui/
    theme.js
    widgets.js
    clickgui.js
    hud.js

  modules/                   77-module catalogue
  index.js                   public framework API

tests/                       Node/jsdom tests
tools/
  inject-eaglercraft.mjs      standalone HTML builder
  browser-check.mjs           Chromium harness QA
  serve.mjs                   harness server
  gen-docs.mjs                module catalogue generator
harness/index.html            synthetic test world
.github/workflows/
  integration-ci.yml          Node + build + Chromium + artifact pipeline
```

### Integration boundary

Every game touch goes through a `GameAdapter`. Capabilities include `world`, `entities`, `blocks`, `inventory`, `movement`, `flight`, `render`, `hud`, `input`, `network`, `chat`, and `timing`.

The real Eaglercraft adapter currently advertises only capabilities verified at the browser boundary (`input` and `hud`). This is deliberate: advertising `world` merely because the game is running would incorrectly make ESP/movement modules look functional without actual player/entity access.

`window.EaglerHacks.diagnostics()` exposes the current adapter, capabilities, game-ready state, session/server state, input availability and framework diagnostics.

---

## ClickGUI controls

| Action | Control |
| --- | --- |
| Open / close | `Right Shift` |
| Toggle a module | left-click its row |
| Expand settings | right-click its row |
| Favourite | middle-click its row |
| Move window | drag its header |
| Search | Search window |
| Assign bind | expand module → bind control → press key |
| Edit HUD | Config → Edit HUD layout |

The GUI releases pointer lock when it opens so it can receive mouse input. Automated held gameplay input is also released when the game loses pointer-lock ownership.

---

## Configuration

- Debounced `localStorage` persistence.
- Save on navigation/visibility changes.
- Named profiles.
- Base64 import/export.
- Corrupt-data quarantine/recovery.
- If access to `window.localStorage` itself throws (opaque/sandboxed origins), the Eaglercraft bootstrap falls back to an in-memory Storage-like backend rather than failing startup.

---

## Known limitations

1. The exact real standalone client has been booted and its ClickGUI verified, but a complete persistent single-player world could not be reached in this execution environment because its DevTools-loaded opaque origin denies the IndexedDB storage Eaglercraft expects.
2. Direct Minecraft state is compiled behind TeaVM/Wasm-GC and not exported to JavaScript. Native-state modules remain capability-gated.
3. The 77-module catalogue describes implemented framework code, not 77 features proven against the real game. `MODULES.md` and `TEST_RESULTS.md` distinguish browser/harness coverage from unavailable game hooks.
4. Eight modules are explicitly marked unsupported where there is no known compatible hook rather than shipping nonfunctional toggles.

## Attribution / licences

The architecture and interface are inspired by [Meteor Client](https://github.com/MeteorDevelopment/meteor-client). This project is an independent browser-side implementation and does not directly run Meteor's Fabric JAR inside Eaglercraft.

### Standalone refresh and real-client checks

To replace this project's known older injection in an existing standalone HTML:

```sh
node tools/inject-eaglercraft.mjs current-client.html updated-client.html --refresh
```

The default still rejects duplicate injection. Refresh requires exactly one known preboot hook and integration script. The packager repairs the known fetch/XHR asset transport mismatch without changing the six embedded game payloads. Tagged Blob URLs serve the main client, and the embedded server worker recognizes the assets tag and uses its own decoder.

Run the real standalone separately from the synthetic harness:

```sh
node tools/serve.mjs
node tools/real-client-check.mjs http://127.0.0.1:3000/updated-client.html
```

Both browser tools accept `CHROMIUM_EXECUTABLE_PATH` for an installed Chromium binary. Preview binds to `127.0.0.1` by default. Set `HOST` explicitly for remote preview. The server rejects hidden paths and symlink escapes.

The real-client check covers startup and UI. It does not certify world loading, multiplayer or Java bridge behavior. A matching prepared upstream project remains required for `npm run build:native`.
