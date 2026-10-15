# Test results

Everything below was **executed in this environment**. Nothing here is a plan or a
prediction. Where a test could not be run, it is listed as *not run* with the
reason.

---

## 1. Test environment

| Item | Value |
| --- | --- |
| OS | Linux (container), Ubuntu noble userspace |
| Node | v24.21.0 |
| npm | 11.19.0 |
| Test runner | `node --test --test-force-exit` |
| DOM emulation | jsdom 25 (via `tools/dom-env.mjs`) |
| Browser | Chromium headless shell **156.0.8078.4** (Playwright 1.64.1) |
| Bundler | esbuild 0.25.12 |
| Framework build | `dist/meteor.bundle.js`, 218.2 KiB, 21 source modules |
| Game under test | **none — `eaglercraft-26.2-u1.html` was not supplied** |

The browser driver needed extra system libraries that are not present in the base
image (`libnspr4`, `libnss3`, X11/atk/atspi, and a font). They were installed
**into a local prefix** (`/tmp/chromelibs`) with `apt-get download` + `dpkg-deb -x`
and used through `LD_LIBRARY_PATH` / `FONTCONFIG_FILE`. `sudo` is unavailable here,
so no system packages were installed. See "Browser notes" below to reproduce.

---

## 2. Commands run and their results

### 2.1 Unit / integration suite

```
$ npm test        # node --test --test-force-exit tests/*.test.mjs

ℹ tests 82
ℹ pass 82
ℹ fail 0
```

Coverage:

| File | Tests | What it proves |
| --- | --- | --- |
| `tests/event-bus.test.mjs` | 6 | priority ordering, dispose, throw-isolation, cancellation, mutation during dispatch |
| `tests/settings.test.mjs` | 15 | clamping, invalid input rejection, coercion, serialisation only-when-changed, corrupt-value recovery, visibility, duplicate-name rejection |
| `tests/modules.test.mjs` | 11 | capability gating, idempotent lifecycle, crash-disables-module, enable-failure containment, adapter swap, keybind precedence, search, favourites, duplicate ids, init-failure containment |
| `tests/config.test.mjs` | 12 | save/reload, enabled-state restore, keybind persistence, corrupt JSON quarantine, per-field fallback, export/import, profile create/switch/delete, storage failure handling, reset, debounce coalescing |
| `tests/gui.test.mjs` | 14 | window/population, Right Shift open+Esc close, pointer-lock release, click-to-toggle, right-click settings, search by name and description, unsupported rendering, dragging + persistence, keybind capture, input routing both ways, HUD editor |
| `tests/hud.test.mjs` | 11 | node lifecycle, live text, no-world placeholder, layout round-trip, reset, error isolation, position/opacity/colour, transform formula, visibility persistence |
| `tests/integration.test.mjs` | 10 | boot, catalogue metadata + uniqueness, world load/unload transitions, remote-session combat guard, render dispatch, perf accounting, listener leak check, teardown, render-crash isolation, toggle events |
| `tests/theme.test.mjs` | 5 | theme round-trip, key/type validation, scale clamping, persistence, corrupt theme payload |

Notable assertions that are genuinely load-bearing:

- **Listener leak check** — enabling and disabling modules must return
  `bus.totalListeners()` to its exact baseline.
- **Crash isolation** — a module throwing in `onTick` or in an event handler is
  disabled, its sibling keeps ticking, and the error is recorded.
- **Corrupt config** — non-JSON is quarantined to `<key>.corrupt`, per-field
  garbage resets to defaults, and the client still boots with a full catalogue.
- **Input routing** — gameplay keys are *not* `preventDefault`ed when the GUI is
  closed, and *are* suppressed while it is open.

### 2.2 Headless browser checks

```
$ node tools/serve.mjs 3000 &
$ node tools/browser-check.mjs
```

```
PASS  harness boots with no uncaught page errors
PASS  no console errors on load
PASS  module catalogue is populated — 77 modules
PASS  world canvas is rendering
PASS  Right Shift opens the ClickGUI — {"open":true,"windows":9,"visible":"block"}
PASS  category windows are laid out — 9 windows
PASS  ClickGUI is actually visible (display != none) — block
PASS  left-clicking a module row enables it — {"active":true,"onClass":true}
PASS  enabled module row is highlighted
PASS  right-click expands module settings
PASS  settings widgets are rendered — 5 controls
PASS  search filters modules — Tracers
PASS  HUD element renders real text — XYZ: 0.0, 64.0, 0.0
PASS  HUD element has non-zero size — 147x20
PASS  Tracers actually change rendered pixels — 5499 pixels differ
PASS  module states survive a reload — {"esp":true,"coords":true,"tracers":true}
PASS  gameplay keys are not intercepted when the GUI is closed
PASS  frame rate with 9 modules enabled stays playable — 60.2 fps

18/18 browser checks passed.
```

These ran against the **integration harness** (`harness/index.html`), a synthetic
top-down world — not Eaglercraft. Two checks are worth calling out because they
test real rendering rather than DOM state:

- *"Tracers actually change rendered pixels"* reads back the canvas
  (`getImageData`) before and after enabling the module and requires a real pixel
  difference. This caught nothing, but it is the check that would catch a
  "renders nothing" module.
- *"module states survive a reload"* does a full `page.reload()` and re-reads the
  module flags, proving `localStorage` persistence end to end in a browser (not
  just in the jsdom fake).

Screenshots written to `artifacts/clickgui-open.png` and
`artifacts/harness-running.png`.

### 2.3 Smoke script

```
$ node tools/smoke.mjs
modules: 77 active: 0 listeners: 1
categories: Combat, Movement, Render, Player, World, Misc, HUD, Config
hud nodes: 1
coords active after world load: true
coords text: XYZ: 0.0, 64.0, 0.0
exported modules: 5
import ok: true
corrupt recovery: true modules payload was not an array
SMOKE OK
```

---

## 3. Bugs found and fixed during testing

These were all found by the tests/bundler/browser checks, not by guessing. Each is
a genuine defect that existed in the code and was fixed at the cause.

| # | Bug | Impact | Fix |
| --- | --- | --- | --- |
| 1 | `SettingGroup.add()` never registered settings into the owning `Settings` index | Every module that read a group-added setting threw `undefined.value`; ~40 modules were effectively dead | `SettingGroup` now takes an owner and routes through `Settings._registerInGroup()`; duplicate names throw at construction |
| 2 | `MeteorClient.stop()` called `config.save(true)` **after** `modules.disableAll()` | Shutting the client persisted "everything disabled" over the user's saved module states | Save first, then tear down |
| 3 | `ClickGUI.toggle()` called `this.open()`, which had become a getter | **Right Shift could not open the ClickGUI at all** | Call `show()` |
| 4 | `MeteorClient.notify()` dereferenced `this.toasts` before the GUI was constructed | Crash on the "storage unavailable" path, where the config manager notifies during construction | Optional-chained the toast sink |
| 5 | Switching to a fresh profile left the previous profile's in-memory settings | Profile switching silently kept old config | Added `_resetToDefaults()` when no stored config exists for a profile |
| 6 | `Theme.load()` assigned to a destructured `const` | Would throw at runtime whenever a saved theme was loaded (the bundler caught this; no test reached the path) | Rewrote the loop with a separate `value` binding, and added `tests/theme.test.mjs` to cover it |
| 7 | Module **event-handler** exceptions were only logged by the bus | A module that threw in its `RenderWorld`/`KeyInput` handler stayed enabled and threw every frame — the exact "one module breaks everything" failure the brief forbids | `Module.subscribe()` now routes handlers through the manager guard, so the offending module is disabled and the error recorded |
| 8 | Harness called `MeteorFramework.boot`, but the IIFE exposes `bootMeteor` | Harness never initialised | Fixed the call; the browser check now asserts boot before anything else |
| 9 | ClickGUI windows overlapped on first open | Sloppy first-run UX | Added `_tileWindows()`: measure each window and flow into columns |

Bugs 2, 3, 5 and 7 are the ones that mattered — each would have been a visible
malfunction (lost config, dead GUI, stuck modules) in the delivered client.

---

## 4. Performance

| Measurement | Result | Method |
| --- | --- | --- |
| Frame rate, 9 modules enabled (ESP, Tracers, Nametags, Radar, Crosshair, Block Search, Fullbright, Coordinates, FPS) | **60.2 fps** | rAF loop timed over 1.5 s in headless Chromium |
| Frame rate, idle | ~60 fps (rAF-capped) | browser check |
| Bundle size | 218.2 KiB unminified, 21 modules | `node build.mjs` |
| Module tick cost | sub-millisecond measured; asserted finite and ≥0 | `stats.measureTick()` in `tests/integration.test.mjs` |
| Listener count after enable→disable cycles | returns to baseline exactly | `tests/integration.test.mjs` |

Performance design decisions that back these numbers:

- HUD text refreshes at **10 Hz**, not per frame, and only writes `textContent`
  when the string actually changed.
- Config writes are **debounced** (three scheduled saves coalesce into one write —
  asserted in `tests/config.test.mjs`).
- Block scans (`Block Search`, `Storage ESP`) are **rate-limited and
  radius-capped**, and their results are cached, not recomputed per frame.
- World-space modules allocate nothing per frame beyond the colour strings the 2D
  context requires; entity filtering sorts a reused array.

> **Caveat:** this is the harness's frame rate, not the game's. The harness draws
> a trivial scene, so it demonstrates that the *framework* does not add
> measurable overhead — it does **not** demonstrate 60 fps inside real Eaglercraft.

---

## 5. What was **not** tested, and why

Reported as limitations, never as passes.

| Area | Status | Reason |
| --- | --- | --- |
| Eaglercraft startup / main menu / world load | **Not run** | The client HTML was not supplied |
| WebAssembly initialisation | **Not run** | No WASM runtime to initialise |
| Any module's in-game behaviour | **Not run** | Requires the game objects the adapter has no binding for |
| Multiplayer connect / disconnect / packets | **Not run** | No server or client to connect with |
| Real pointer lock | **Not run** | Requires a user gesture in a real browser session; the code path (`document.exitPointerLock`, adapter `setPointerLock`) is implemented but unverified against the game |
| Fullscreen transitions | **Not run** | Harness does not enter fullscreen |
| Long-run memory-leak soak (hours) | **Not run** | Only the listener-count leak assertion was run |
| Diversity of real browsers (Firefox/Safari) | **Not run** | Only one Chromium build is available in this environment |

The two provided files also could not be *inspected* at all — so the "Phase A"
requirement to identify the build's embedded assets, render pipeline, packet
system and so on is **unresolved**. What could be established from public sources
is recorded in `README.md` (official build is *26.2 (zeus)*; "26.2-u1" is a
community label; no public source found for 26.2). The version was not changed or
substituted, per the brief.

---

## 6. Browser notes (reproducing the headless run)

```bash
# 1. local system libraries (no root required)
mkdir -p /tmp/chromelibs && cd /tmp/chromelibs
for p in libnspr4 libnss3 libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 \
         libatspi2.0-0t64 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
         libxkbcommon0 libcups2t64 libgbm1 libdrm2 libpango-1.0-0 libcairo2 \
         fonts-dejavu-core; do apt-get download "$p"; done
for f in *.deb; do dpkg-deb -x "$f" ./root; done

cat > fonts.conf <<'XML'
<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>/tmp/chromelibs/root/usr/share/fonts</dir>
  <cachedir>/tmp/fontcache</cachedir>
</fontconfig>
XML

# 2. run the checks
export LD_LIBRARY_PATH=/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:/tmp/chromelibs/root/lib/x86_64-linux-gnu
export FONTCONFIG_FILE=/tmp/chromelibs/fonts.conf
npx playwright install chromium
node tools/serve.mjs 3000 &
node tools/browser-check.mjs
```

Without the font + fontconfig config, Chromium aborts with
`FATAL: SkFontMgr_FontConfigInterface ... Not implemented`. Without the X/NSS
libraries it fails with `error while loading shared libraries: libnspr4.so`.
