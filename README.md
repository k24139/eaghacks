# Eaghacks: Eaglercraft 26.2-u1 with Meteor modules

A browser module framework for the matching Eaglercraft 26.2-u1 standalone,
with 77 preserved modules, settings, ClickGUI, HUD, profiles and persistence.
Right Shift opens ClickGUI; Escape closes it.

The reproducible native build is documented in
[native-bridge/README.md](native-bridge/README.md). Actual executed results are
in [TEST_RESULTS.md](TEST_RESULTS.md). [MODULES.md](MODULES.md) uses strict
status labels and the actual Eaglercraft module factory. Unit tests and the
synthetic harness do not certify gameplay.

The [Phase 13.1 repair](reports/release-phase13/PHASE13_1_REPORT.md) fixes modules appearing unavailable inside ClickGUI and records RC2 gameplay/restart validation.

Phase 13 JavaScript release-candidate evidence, unchanged native payload identities and pending manual checks are recorded in [the Phase 13 report](reports/release-phase13/PHASE13_REPORT.md). The standalone HTML remains local and excluded from Git.

The [Phase 14 experimental RC3 report](reports/release-phase14/PHASE14_REPORT.md) records the combat scheduler, real modern weapon-recovery measurements, falling-aware timing, macro bind repairs and explicit unavailable options. Counts remain 41 gameplay-observed, five partial and 31 unsupported, with no exhaustive acceptance promotion. RC3 stays in ignored `input/phase14/`; [human acceptance](reports/release-phase14/PHYSICAL_QA.md) and actual other-player ESP checks remain pending.

## Framework and browser integration

```sh
npm ci
npm test
npm run build
npm run serve
```

Open `http://127.0.0.1:3000/` for the synthetic UI harness. It uses a mock game
adapter for development. To integrate the matching supplied standalone:

```sh
mkdir -p input/deliverable
npm run build:eagler -- /absolute/path/Eaglercraft-26.2-u1-Meteor.html \
  input/deliverable/Eaglercraft-26.2-u1-Meteor-browser.html --refresh
```

Use `--refresh` only when the input already contains this integration. The
injector repairs embedded asset transport and preserves the original six binary
payloads. Large game HTML files and downloaded build inputs are excluded from
Git history.

## Native Java/TeaVM build

```sh
git clone https://github.com/aerograde/eagle-26.2.git input/upstream-reference
git -C input/upstream-reference checkout --detach 1be2375ad67cb42a52d5f586a2422e54b57be625
npm run build:native -- input/upstream-reference \
  --base-html /absolute/path/Eaglercraft-26.2-u1-Meteor.html \
  --output input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html \
  --fast --heap-mib 6144
```

Both Java and javac must report version 25. Linux x64 builds can automatically
install checksum-pinned task-local Temurin Java 25 and Gradle 9.6.1. Other
platforms must provide a Java 25 `JAVA_HOME`. The native guide records all
external inputs and memory requirements.

The pipeline verifies the pinned source and six original payloads, restores
19,509 CRC-checked matching resources, compiles the real Java jars, runs the
TeaVM link, validates native markers in the WASM, replaces the main
client payload and refreshes Meteor. The five other payloads must stay identical.
JSON receipts record the resulting WASM and payload hashes. `--heap-directory`
uses file-backed Java heap allocation and needs free disk space at least equal
to the heap. The saved native candidate uses `--fast`, with fast dependency
analysis and SIMPLE optimization. Precise/FULL did not finish in this environment.
See TEST_RESULTS.md for completed gameplay checks and limitations.

## Verification

With the preview server running:

```sh
npm run test:browser -- http://127.0.0.1:3000/
node tools/real-client-check.mjs http://127.0.0.1:3000/input/deliverable/Eaglercraft-26.2-u1-Meteor-browser.html
node tools/real-client-check.mjs http://127.0.0.1:3000/input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html --require-native
NATIVE_ARTIFACT="$PWD/input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html" \
  node tools/native-gameplay-check.mjs http://127.0.0.1:3000/input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html
npm audit
node tools/gen-docs.mjs > MODULES.md
npm run package:source
```

Playwright needs Chromium; `CHROMIUM_EXECUTABLE_PATH` selects an existing
compatible installation. Native gameplay QA creates a private local world and
uses real in-game commands to prepare entities, food and player state. It does
not create mock native snapshots. Startup/UI, unit, harness and actual gameplay
results are reported separately. Gameplay evidence is tied to the actual HTML
hash and source digest before modules receive a verified status.

## Runtime behavior

The stock browser adapter supplies game input and an independent HUD overlay.
A bridge compiled into Java additionally publishes real player/world/entity,
inventory and camera snapshots, and narrow native actions. Capabilities appear
only when those real snapshots support them. Broad inventory transactions,
collision/blocks and other missing mechanics remain gated.

Local/remote identity uses native `Minecraft.isLocalServer()`. The observed
single-player runtime leaves the old `minecraftServer` browser global null, so
that field alone cannot identify a local world. Unknown sessions are treated
conservatively. Local-test-only automation is blocked on remote sessions by
default. For an explicitly authorized test server, the existing override is:

```js
EaglerHacks.allowMultiplayerCombat(true)
```

Pass `false` to remove it. `EaglerHacks.diagnostics()` reports readiness, native
identity, session kind, capabilities and input ownership.

Saved active modules wait for the required world/capabilities. World loss
suspends them and clears stale commands; explicit disable cancels restoration.
Menus and focus loss block new gameplay actions and release owned input.
Camera settings and owned cleanup remain writable for safe restoration.

## Private multiplayer and performance QA

The LAN test uses two isolated browser peers and a loopback rendezvous service:

```sh
node input/upstream-reference/tools/lan-server.mjs --host 127.0.0.1 --port 3002 --dir "$PWD"
NATIVE_ARTIFACT="$PWD/input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html" \
NATIVE_LAN_DISCOVERY_SCRIPT="$PWD/input/upstream-reference/target_teavm_wasm_gc/src/web/lan-discovery.js" \
  node tools/native-lan-check.mjs http://127.0.0.1:3002/input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html
```

The original standalone shell omits the optional LAN discovery helper. QA loads
the unchanged helper from the pinned upstream checkout before the game starts.
It supplies discovery for the private test environment; it does not replace game
state or alter the standalone artifact. Actual WebRTC traffic carries movement,
inventory, chat and lifecycle updates. No public game server is involved.

`NATIVE_QA_DEBUG=1` opens a browser inspection REPL on a gameplay or LAN failure.
`NATIVE_QA_REVIEW=1` retains a successful run for further inspection.
`NATIVE_QA_LOW_RESOURCE=1` selects two-chunk rendering through the actual options
UI and a 640-by-400 viewport for single-player software-rendering QA.

`tools/sample-client-performance.mjs` exports `measureClientFrames(page)` for
fresh frame-time, module-cost and native-snapshot samples. Compare original and
native clients sequentially in the same saved world, with the same viewport,
graphics settings and warmup, after the compiler has stopped. Chromium JS-heap
measurements exclude some WebAssembly, worker and graphics memory.

## Source package

`npm run package:source` requires Python 3, rebuilds the bundles, and writes a
ZIP with fixed timestamps and a source-only file allowlist.
`Eaglercraft-26.2-u1-Meteor-Source.zip` includes framework source and bundles,
Java overlay, pinned inputs, build/test tools and documentation. It excludes
dependencies, downloaded JDKs, caches and temporary game inputs. Reproduction
requires the original matching standalone and the pinned public source checkout
listed above. The repository's CI runs the framework suite and browser harness;
it is separate from the native gameplay validation.

The final native standalone is also a matching resource input when its exact
client payload hash is listed in `native-bridge/inputs.json`. This allows the
delivered HTML and source ZIP to be used together for a rebuild. Asset and worker
hash requirements remain unchanged.

For a matched performance run, put the tested native artifact at `client.html`
and the refreshed original-runtime artifact at `original.html` under the same
preview root, then run:

```sh
NATIVE_ARTIFACT="$PWD/client.html" NATIVE_QA_FLAT=1 NATIVE_QA_LOW_RESOURCE=1 \
  node tools/matched-performance-check.mjs http://127.0.0.1:3000/client.html
```

This compares both real runtimes in the same saved superflat world and browser
context, using three idle and three movement samples. Native overlays receive
an additional sample. Results go to `artifacts/matched-performance.json`.
`NATIVE_EXPECTED_SHA256` makes the native gameplay checker reject a mismatched
artifact before starting a browser. All local native artifacts must end with a
complete HTML document.
