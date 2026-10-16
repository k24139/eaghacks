# Eaglercraft 26.2-u1 integration

The authoritative 26.2-u1 standalone HTML was inspected and exercised directly.

Its `eag-inline-wasm-br` asset expands to a **102,444,741-byte WebAssembly module** with only 12 exports: TeaVM glue/tags, `main`, and `teavm.memory`. It does **not** export browser-callable player, world, entity, inventory, movement, camera, renderer or packet objects.

The browser shell does expose useful lifecycle/session state, including `window.__tv`, `window.__eaglerWasmModule`, `window.__eaglerGameReady`, `window.minecraftServer`, the real game canvas and normal DOM input events.

## Build

```bash
npm ci
npm test
npm run build
npm run build:eagler -- /path/to/eaglercraft-26.2-u1.html
```

This creates:

```text
Eaglercraft-26.2-u1-Meteor.html
```

Latest verified build:

- original size: **75,560,623 bytes**
- original SHA-256: `cd1caacf8440c0cbac94e35bd4686ed5397076522007330aa873eca23c134114`
- integrated size: **75,793,980 bytes**
- integrated SHA-256: `05b07f5b2449aa2676081dc1ee72e20019cda44dfe81f41e71ccc383aceb4eb6`

Removing the two injected EaglerHacks regions from the generated file reproduces the supplied original HTML exactly. The embedded game WASM/EPK payload is not rewritten.

## Runtime integration

### Eaglercraft adapter

`src/integration/eaglercraft-adapter.js` intentionally advertises only capabilities verified at the browser boundary:

```text
input
hud
```

It does **not** advertise `world`, `entities`, `movement`, `inventory`, `blocks`, `render`, `network` or similar native capabilities merely because Minecraft is running.

That prevents modules such as ESP, Flight or KillAura from turning into misleading GUI toggles when no real player/entity state is available.

### Loaded-session detection

The injector still wraps `eaglercraftXOpts.hooks.screenChanged` when present and preserves any previous callback. During direct execution of the supplied **26.2-u1** build, however, the game exposed the hook but did **not** invoke it during the verified menu/profile boot.

Therefore the actual 26.2-u1 path uses `window.minecraftServer` as its loaded-session fallback:

- `null`: menu/disconnected/no active server session
- `"singleplayer"`: integrated local server
- another non-null value: multiplayer/remote server identifier

If a compatible build does invoke `screenChanged`, its screen state refines the fallback.

### Safe gameplay-input ownership

When the screen hook is unavailable, a non-null `minecraftServer` alone is not enough to decide that automated input is safe: a pause/inventory/menu screen can still be open inside a loaded world.

The adapter therefore requires the **real game canvas to own `document.pointerLockElement`** before it injects gameplay presses/clicks. The Meteor ClickGUI must also be closed.

If gameplay loses input ownership while an automated key is held, `adapter.update()` releases it immediately so movement cannot remain stuck.

### Browser input

The exact compiled 26.2-u1 client contains its own synthetic DOM-input self-test using `KeyboardEvent`/`MouseEvent` dispatch. The adapter uses the same browser event mechanism for currently supported automated input.

Implemented browser-bound actions include:

- held `KeyW` for AutoWalk;
- `Space` tap;
- left mouse down/up;
- right mouse down/up;
- held Shift path;
- pointer-lock release/reacquire support.

AutoWalk's first `W` press is deliberately deferred until after the ClickGUI closes and the game reacquires control, rather than pressing W during module activation while the GUI owns input.

### Multiplayer/local safeguard

Eaglercraft sets `window.minecraftServer = "singleplayer"` for its integrated local server. All unknown/non-singleplayer sessions are treated conservatively as remote.

`localTestOnly` is enforced centrally by the base `Module` class. AutoClicker and AutoWalk are local-test-only in the Eaglercraft integration. Remote automation is rejected unless explicitly opted in:

```js
EaglerHacks.allowMultiplayerCombat(true)
```

Disable again with:

```js
EaglerHacks.allowMultiplayerCombat(false)
```

## Configuration storage

Normal origins use `localStorage`.

During real-client testing, Chrome DevTools loaded the self-contained game through an opaque `about:blank` origin because local navigation is blocked by environment policy. On such origins, **accessing `window.localStorage` itself can throw a `SecurityError`** before a normal storage probe runs.

`resolveEaglerStorage()` now handles that case and falls back to a small in-memory Storage-compatible backend instead of aborting the integration.

## Real-client validation

The exact final standalone HTML was loaded into a fresh non-headless Chromium session under Xvfb using DevTools `Page.setDocumentContent`. WebGL was provided through ANGLE/SwiftShader because local URL navigation is blocked in this environment.

The final integrated build reached:

- TeaVM/WASM instantiation;
- embedded resource loading;
- Minecraft main startup;
- `window.__eaglerGameReady === true`;
- an actual WebGL2 game canvas;
- `window.EaglerHacks` running at the same time;
- 77 registered modules;
- zero uncaught top-level runtime exceptions during the validated boot.

A real DOM Right-Shift event then opened the Meteor-style ClickGUI **over the actual Eaglercraft page**:

- ClickGUI open state: true;
- CSS display: `block`;
- nine windows rendered;
- module catalogue: 77.

This is separate from the synthetic harness and demonstrates that the integration coexists with the actual game shell.

## Single-player autotest attempt

The exact 26.2-u1 WASM contains the internal check:

```js
globalThis.__eaglerAutoTest === 'sp'
```

An otherwise-unmodified copy of the original client was booted with that flag to exercise its own single-player automation path. The game reached the integrated-server worker boot and deferred creation of `New World` until worker readiness, but the DevTools-loaded opaque origin prevented the IndexedDB-backed filesystem from behaving like a normal browser origin. The client fell back to RAM storage and the automated world startup did not progress far enough to verify `minecraftServer === "singleplayer"` or real in-world movement.

So the present validation boundary is:

- **real game/menu/profile boot:** verified;
- **real ClickGUI overlay:** verified;
- **framework/browser input mechanics:** tested;
- **completed real single-player world + AutoWalk/AutoClicker:** not yet end-to-end verified in this environment.

## Automated validation

Latest green CI for the integration code reports:

```text
Node tests:       92 / 92 pass
Browser harness:  18 / 18 pass
```

The browser harness checks the framework against the synthetic world and includes GUI interaction, settings, HUD, persistence, input routing, pixel-render changes and performance. It must not be confused with the real-client boot above.

## Still unavailable without native/source hooks

The standalone Wasm-GC ABI does not currently expose stable access to:

- player position/rotation/health/velocity/hunger/effects;
- world/block queries;
- real entity lists/metadata;
- inventory/hotbar/armor;
- camera matrices/world-to-screen projection;
- direct FOV/gamma/brightness internals;
- packet/network internals;
- direct physics/collision/flight/step/knockback/tick-rate state.

Accordingly, real Entity ESP, Tracers, Nametags, KillAura targeting, Aim Assist, Flight, Speed, Step, NoFall, inventory automation, X-Ray and similar native-state modules remain capability-gated rather than falsely marked functional.

## Diagnostics

At runtime:

```js
EaglerHacks.diagnostics()
```

reports framework state plus the Eaglercraft adapter's game-ready state, server identifier, local/remote classification, input ownership, capabilities, WASM exports and synthetically held keys.

## October 15 audit: asset transport and input reliability

The supplied standalone failed its first real-browser boot at `eagler-inline-payload://assets.epk`: the main runtime uses XMLHttpRequest, but the standalone only intercepted fetch. The injector now awaits embedded asset decoding and assigns Blob URLs. Each URL carries an asset-name fragment so the server worker routes its own EPK read through its embedded decoder instead of its incomplete delegated XHR path. Embedded payload text remains unchanged.

Native commands now refuse new actions from menus/ClickGUI, and pending commands are cleared as gameplay control disappears. The Java bridge clears pending commands on world loss. Boolean release commands remain allowed for cleanup. This Java source change still requires a native rebuild before it affects any game binary.

The source-only bridge is not present in the supplied compiled client. Native player, entity, inventory and physics modules remain unverified in real gameplay. The browser and standalone tests must not be reported as proof of their behavior.

Real-world QA also confirmed that `minecraftServer` remains null in a loaded single-player world. World readiness now uses the native game-ready/world-ready flags and no longer rejects that session. Unknown local/remote identity remains remote for automation policy. The current upstream source only initializes the server-name global to null, so it cannot establish single-player identity.
