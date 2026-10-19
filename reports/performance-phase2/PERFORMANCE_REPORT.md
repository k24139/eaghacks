# Phase 2 performance comparison

Status: blocked before matched gameplay sampling. No FPS, frame-time, gameplay-memory, overlay-cost or performance-parity result is claimed.

The stock profile-screen navigation defect was repaired and the actual stock profile and title controls were exercised. The remaining blocker is the missing saved superflat world. The current stock UI shows creation/import choices, not a saved-world list. No replacement world was generated.

## Provenance

- Repository branch: `meteor-client-integration`.
- Starting commit: `791b8d1bd86df0b2bedaff70413a5dbc3097998c`.
- Required and verified runtime source digest: `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f`.
- Native HTML: 80,975,660 bytes, SHA-256 `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c`.
- Stock runtime HTML: 75,802,950 bytes, SHA-256 `1338d67feae9818b8e9873b58a3225d1f4fdce29f147711666ccf133d99a13a8`.
- The stock artifact's six embedded payloads match the original pins in `native-bridge/inputs.json`, including main payload SHA-256 `c783f63ac18c0a185fbf6fa633372a6f1d3cfa014a4285fb2fb4bd924a638c08`.
- The stock artifact retains its saved browser-integration shell. It is a stock game runtime with Meteor modules intended to be disabled during measurements, not an untouched stock HTML shell.
- The native candidate uses fast dependency analysis / SIMPLE optimization. No precise/FULL benchmark is claimed. The stock binary's optimization provenance is not established.

`tools/verify-recovery-artifact.mjs` passed before the browser work and again after it. Neither artifact nor the runtime source digest changed. No Java, TeaVM or native-client build ran.

## Environment and intended matching

| Setting | Value or status |
| --- | --- |
| Chromium | 153.0.8010.0, packaged executable `/tmp/eaghacks-browser-runtime/chromium` |
| Rendering | Headless, ANGLE SwiftShader software rendering |
| Host CPU identification | AMD EPYC 9V74 80-Core Processor |
| CPU quota | 8 CPU equivalents (`800000 100000`) |
| Container memory limit | 8 GiB |
| Browser memory stop | 6.5 GiB cgroup usage, sampled every second |
| Browser concurrency | One browser instance at a time, with its normal renderer/utility children |
| Origin | `http://127.0.0.1:3006` |
| Persistent test profile | `input/performance/profile` |
| Actual preflight viewport | 1280 × 800 |
| Planned sample viewport | 640 × 400, not reached |
| Planned world | The existing verified superflat world only, not available |
| Planned player reset | `/tp @s 0 150 0 0 20`, not executed |
| Planned warm-up | 3 seconds for baseline idle setup on each runtime, not executed |
| Planned baseline sampling | Three idle samples of 5 seconds and three movement samples of 1 second per runtime, not executed |
| Graphics equivalence | Not established; no saved-world gameplay comparison ran |

Matching position, graphics settings and world identity must be verified after restoring the world. Sharing a browser profile alone does not certify those conditions.

## Actual attempts

1. Stock startup reached its menu-ready flag during the resource-loading splash. The driver rejected unrecognized controls and closed Chromium. The screenshot showed a loading screen, not a profile-navigation failure. The fix added bounded visual readiness polling instead of trusting that flag alone.
2. Stock profile and title controls were recognized from screenshots. The driver edited the visible username field, clicked Done, recognized Singleplayer and opened it. The resulting screen offered Create New World, Import EPK World and Import Vanilla World. It contained no saved-world list. OCR read “Create New World” as “Create Hew World”, so the second attempt reached its bounded visual timeout. Inspection confirmed the empty-world selector. That observed OCR variation was added to the classifier and focused tests. No third browser attempt was made.

The classifier uses actual rendered control crops with thresholding and local Tesseract OCR. It does not depend on `__eaghacksScreenState` or `__eaghacksNativeBridge` for stock navigation. Both globals were absent in the stock runtime, as recorded in the raw result.

Disk inspection found no IndexedDB world data in the four retained old Playwright profile directories, and no exported world in the recovery artifacts. The prior tests used temporary browser contexts and did not persist a world export or a usable world-bearing profile. The current world database exposes a filesystem store with two entries, but the UI confirms that no selectable world is present. Those entries do not establish a recovered world.

## Results

| Matched metric | Stock | Native |
| --- | --- | --- |
| Idle FPS / frame time | Not measured | Not measured |
| Movement FPS / frame time | Not measured | Not measured |
| Gameplay browser/WASM memory | Not measured | Not measured |
| Frame-time spikes | Not measured | Not measured |
| Equivalent overlay cost | Not measured | Not measured |
| Native-only overlay increment | Not applicable | Not measured |
| Bridge snapshot self-time | Not applicable | Not measured |

No previous unmatched timing samples were substituted for missing results. Missing values remain `null` in the raw and summarized JSON.

The following observations describe startup and menu preflight only. They are not gameplay memory comparisons:

| Attempt | Peak total cgroup usage | Peak owned-browser RSS | Memory observations |
| --- | ---: | ---: | ---: |
| 1 | 3.915 GiB | 1.819 GiB | 20 |
| 2 | 5.055 GiB | 2.537 GiB | 95 |

Total cgroup usage includes this workspace and file cache. Browser RSS sums the owned browser process tree and can double-count shared pages. JavaScript heap readings exclude WASM, GPU allocations and worker/native memory. These measures are not interchangeable.

No memory stop or OOM kill occurred. Chromium was closed after both attempts. A final owned-process scan found zero remaining task browser processes.

## Script changes and validation

- Stock navigation reads the visible Done, Singleplayer and world-selection controls. Native-client screen-signal navigation remains on its separate existing path.
- The matched driver now requires a saved-world list before attempting the comparison. It no longer creates a world, builds a platform or starts full terrain generation.
- A persistent profile and same-origin requirement protect future world reuse.
- A 6.5 GiB host-memory guard, bounded navigation/sample waits and owned-process termination prevent an indefinite browser stall.
- Frame sampling keeps raw intervals and spikes, uses both page and host timeouts, and labels rAF timing separately from GPU-presented frames.
- Host/browser RSS observations, logs, OCR controls, screenshots and read-only database inventory are retained.
- Partial native-only results are written separately if a future paired run fails. No parity is automatically certified from unreviewed settings or position data.

Focused tests: 5 passed. Full lightweight suite: 146 passed, 0 failed. Browser bundles built. Smoke check: `SMOKE OK`. Static artifact verification passed. No gameplay/module validation, multiplayer test, native compilation or release packaging ran.

Stock navigation is verified only through the current empty-world selector. Stock joining, command timing, settings equality and paired sampling remain unverified in this environment. Native bridge overhead cannot be isolated by subtracting two runtimes that also differ in compilation mode and code. A future run can report observed bridge snapshot self-time and compare overlays enabled versus disabled within the same native artifact, with that limitation stated.

## Evidence

- [Raw final attempt and reviewer diagnosis](raw.json)
- [Raw first attempt](attempt-1.json)
- [Summary and preflight memory peaks](summary.json)
- [Navigation log](../../diagnostics/performance-phase2/navigation-log.txt)
- [Host/browser memory observations](../../diagnostics/performance-phase2/host-memory.jsonl)
- [Initial loading splash](../../diagnostics/performance-phase2/loading-splash.png)
- [Stock title after profile navigation](../../diagnostics/performance-phase2/stock-title.png)
- [Actual empty-world selector](../../diagnostics/performance-phase2/empty-world-selector.png)

All per-attempt screenshots and logs also remain under `diagnostics/performance-phase2/attempt-1/` and `attempt-2/` in the working checkout.

## Exact next action for Phase 3

Restore a verified superflat world export into `input/performance/profile`, or explicitly authorize creating and exporting one replacement benchmark world if no original export exists. Save both the world export and persistent profile, record their hashes and origin, and confirm that the stock saved-world list selects that same world. Then verify matching graphics and player position before collecting bounded paired samples. Do not begin module validation, multiplayer, recompilation or release packaging as a substitute for that prerequisite.

Reproduction command after restoring the world:

```sh
node tools/serve.mjs 3006 .
CHROMIUM_EXECUTABLE_PATH=/tmp/eaghacks-browser-runtime/chromium \
  node tools/matched-performance-check.mjs \
  http://127.0.0.1:3006/input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html \
  http://127.0.0.1:3006/input/performance/stock.html \
  input/performance/profile
```

Stop this phase with the missing-world limitation. There is no performance-parity conclusion.
