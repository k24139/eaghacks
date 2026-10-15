# Eaglercraft 26.2-u1 — Meteor-style client framework

A modular, Meteor Client-inspired framework (module registry, event bus, settings,
ClickGUI, HUD, persistent profiles) built to be injected into the **Eaglercraft
26.2-u1** client HTML.

---

## ⚠️ Read this first: the game files were not delivered

The task supplies two input files:

- `eaglercraft-26.2-u1.html` — the authoritative game base
- `eaglercraft-26.2-u1-meteor-bridge.html` — the previous interface attempt

**Neither file is present in this environment.** Verified by searching the entire
filesystem and the repository:

```
$ find / -iname "*eaglercraft*"   -> (no results)
$ find / -iname "*meteor*"        -> (only unrelated python packages)
$ git log --oneline               -> 1ccda03 Create README.md
$ git ls-tree -r freebuff-base    -> (empty)
$ git cat-file --batch-all-objects --batch-check | awk '$3>100000'  -> (no large blobs)
```

The repository contained only an empty `README.md`. The two HTML files were never
uploaded to this workspace, and there are no attachments in the conversation.

Because of that, one part of the brief cannot be completed honestly:

| Deliverable | Status | Why |
| --- | --- | --- |
| `Eaglercraft-26.2-u1-Meteor.html` (playable client) | **Not produced** | Requires the supplied game HTML. Fabricating an "Eaglercraft" would violate rule 2 (do not create a fake client). |
| `Eaglercraft-26.2-u1-Meteor-Source.zip` | **Produced** (framework only) | Contains everything that does not depend on the game file. |
| Framework + ClickGUI + HUD + config + tests | **Produced and verified** | Built and tested here. |
| Game-integrated modules (ESP, KillAura, Flight, …) | **Implemented against a documented adapter contract, not verified in-game** | The adapter needs the real client's objects to bind to. |

**To finish the job, re-attach `eaglercraft-26.2-u1.html` (and the bridge file).
Everything below then plugs in through a single file: `src/core/adapter.js`.**

Nothing in this repository pretends the game works. No module claims to be
verified in-game; see [`MODULES.md`](./MODULES.md) and
[`TEST_RESULTS.md`](./TEST_RESULTS.md).

---

## What was built, and what was actually verified

The framework is complete, and it is verified in **two** ways:

- **82 automated tests** (`node --test`, jsdom) — all passing.
- **18 headless-Chromium checks** against the live harness — all passing,
  including 60.2 fps with nine modules enabled.

```
$ npm test
ℹ tests 82
ℹ pass 82
ℹ fail 0

$ node tools/browser-check.mjs
18/18 browser checks passed.   (60.2 fps with 9 modules enabled)
```

Verified in a real browser: the game loop boots, `Right Shift` opens the ClickGUI,
left-click toggles a module, right-click expands its settings, search filters the
catalogue, HUD elements render live text, `Tracers` really changes rendered
pixels, and module state survives a page reload.

---

## Quick start

```bash
npm install                  # installs esbuild + jsdom + playwright (dev only)
npm run build                # -> dist/meteor.bundle.js (single injectable IIFE)
npm test                     # 82 unit/integration tests
npm run serve                # http://localhost:3000/  -> the integration harness
```

The harness at `/` runs the framework against a **synthetic top-down world**
(`harness/index.html`) so the GUI, HUD and render modules can be exercised without
the game. It is clearly labelled as a harness, not the game.

Headless browser checks:

```bash
node tools/serve.mjs 3000 &
node tools/browser-check.mjs          # writes artifacts/*.png
```

`tools/browser-check.mjs` needs a Chromium that can start. On a bare container you
may need to supply `libnspr4`, `libnss3`, X11 libs and a font (see
"Browser notes" in [`TEST_RESULTS.md`](./TEST_RESULTS.md)).

---

## Architecture

```
src/
  core/
    event-bus.js        typed bus, priorities, cancellation, subscription bags
    settings.js         Bool/Int/Double/String/Enum/Color/Keybind + groups
    module.js           Module base class + lifecycle + guarded subscriptions
    module-manager.js   registry, categories, search, favourites, error isolation
    keybind-manager.js  the single owner of DOM input listeners
    config-manager.js   profiles, debounced autosave, import/export, corruption recovery
    adapter.js          ★ the only file that touches the game
    stats.js            FPS / frame time / module update cost / memory
    meteor.js           bootstrap: owns the tick, wires every subsystem
  gui/
    theme.js            dark theme, CSS custom properties, persistence
    widgets.js          setting-type -> DOM widget factory
    clickgui.js         draggable category windows, search, config window
    hud.js              HUD elements, drag, edge snap, layout persistence
  modules/              the module catalogue (77 modules)
  index.js              public API + window.Meteor global

tests/                  node:test + jsdom  (82 tests)
tools/                  smoke, docs generator, static server, browser checks
harness/index.html      synthetic-world harness
dist/meteor.bundle.js   generated IIFE build
```

### The integration seam (`src/core/adapter.js`)

Every game touch goes through one object instead of scatted lookups into the
compiled runtime. An adapter advertises **capabilities** (`world`, `entities`,
`blocks`, `inventory`, `movement`, `flight`, `render`, `hud`, `input`, `network`,
`chat`, `timing`), and a module declares `requiredCapabilities`. The manager
refuses to enable a module whose capabilities are missing, so "unsupported on this
runtime" is a first-class, honest state instead of a toggle that silently does
nothing.

To bind the real game you implement the same methods the harness does:
`getPlayer`, `getEntities`, `getWorld`, `worldToScreen`, `attack`, `setFlying`,
`setStepHeight`, `findBlocks`, … and a small glue layer that emits
`Events.RenderWorld` / `Events.RenderHud` / `Events.ClientTick` from the game's
own loop.

---

## ClickGUI

| Action | Control |
| --- | --- |
| Open / close | `Right Shift` (middle mouse also opens) |
| Toggle a module | left-click its row |
| Expand settings inline | right-click its row |
| Favourite a module | middle-click its row |
| Move a window | drag its header |
| Collapse a window | click the ▾ / ▸ |
| Search | type in the Search window |
| Assign a keybind | open settings → click the bind button → press a key |
| Reset a module | open settings → "Reset settings" |

Settings widgets: boolean checkbox, number slider + readout, dropdown, colour
picker (RGBA sliders + hex, with rainbow), keybind capture, text input, expandable
groups.

Categories: Combat, Movement, Render, Player, World, Misc, HUD, Config.

## HUD

HUD elements are ordinary modules in the `HUD` category. Enable them from the
ClickGUI, then use **Config → Edit HUD layout** to drag them; they snap to screen
edges and their position/scale/opacity/colour persist.

## Configuration

- Automatic debounced save to `localStorage`; also saved on `beforeunload`.
- Named profiles (create / switch / delete) in the Config window.
- Export/import as Base64 through the Config window.
- Corrupt data is **quarantined**, never fatal: unreadable JSON is copied to
  `<key>.corrupt`, per-field failures fall back to defaults, and startup continues.

---

## Browser support

Tested automation target: Chromium 156 (headless shell) via Playwright.
The framework deliberately avoids anything exotic: `localStorage`, Canvas2D,
CSS custom properties, `requestAnimationFrame`, ES2020. It should run in any
current Chrome/Edge/Firefox/Safari. `performance.memory` is Chromium-only and the
Performance Monitor degrades to "memory: unavailable in this browser" elsewhere.

## Known limitations

1. **No in-game verification.** Every module that needs the game is implemented
   against the adapter contract but has never run inside Eaglercraft, because the
   client HTML was not supplied. Statuses in `MODULES.md` reflect this.
2. **Eight modules are explicitly unsupported**, each with a stated reason
   (X-Ray, NoSlow, Jesus, Spider, AutoTotem, Chest Organizer, Chat Timestamps,
   Light Level Overlay). They appear in the GUI, greyed out, and refuse to
   enable — they are not fake toggles.
3. **Deriving the exact Eaglercraft internals is not possible from here.** Public
   information indicates the official build is *Eaglercraft 26.2 (zeus)*, that
   "26.2-u1" is a community distribution label, and that no public source for the
   26.2 client was found. The version was **not** changed or substituted, and no
   other build was downloaded to stand in for the supplied file.
4. **Module coverage is intentionally conservative.** Ten thoroughly working
   modules beat a hundred broken ones; the catalogue is complete, but only the
   framework-level and HUD modules carry a "tested" status.

## Attribution / licences

- Architecture and interface patterns are modelled on
  [Meteor Client](https://github.com/MeteorDevelopment/meteor-client)
  (GPL-3.0). This project is an independent JavaScript reimplementation for the
  browser runtime — it contains **no Meteor code**. If it is ever distributed
  alongside Meteor-derived work, GPL-3.0 obligations apply.
- No third-party runtime dependencies are bundled; `esbuild`, `jsdom` and
  `playwright` are build/test tools only.
