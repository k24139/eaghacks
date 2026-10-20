# Phase 5: local matched performance benchmark

October 19, 2026, America/Chicago. Starting integration commit:
`2ee6224e9fccb03ca901f85fcf96cddf06dd7dc4`.

Both recovered clients loaded independent imports of the exact verified EPK,
with matching graphics settings, viewpoint, Chrome version, viewport and Apple
GPU backend. Native recorded higher **CPU-side game frame submission throughput**
in this local run. These measurements do not establish physical displayed FPS,
release-build performance, performance parity, or isolated native bridge cost.

## Environment and matching

Google Chrome **155.0.8059.80**, installed in `/Applications/Google Chrome.app`,
ran one client at a time in dedicated profiles. Headless Chrome's actual WebGL
renderer was **ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)**;
CDP confirmed `(gl=egl-angle,angle=metal)`, GPU compositing and WebGL enabled.
The benchmark used Apple GPU acceleration, not SwiftShader software rendering.
The Playwright command line permits a software fallback, but the recorded actual
renderer for both clients is Metal. Browser/device records are preserved in
`native-environment.json`, `stock-environment.json`, and `provenance.json`.

Host: Apple M4 MacBook Air Mac16,12, 16 GiB RAM, eight GPU cores, macOS 26.4.
Two physical Dell displays reported 2160×3840 (main, rotated; logical 1080×1920)
and 3840×2160 (logical 1920×1080), both 120 Hz. Headless Chrome uses a virtual
screen; its separate browser animation cadence was approximately 60 Hz.

The original checkout remained on main at
`1ccda035bc03a3fac460fc3fe484c383a65a2d59`, with its pre-existing modifications
preserved. Work used the clean Phase 4 integration worktree. Standard Git CLI
verified that the remote integration head matched the starting commit before
editing. No client was rebuilt and no world was generated or recovered again.

| Match gate | Evidence |
| --- | --- |
| Same EPK | 570,090 bytes; SHA-256 `503a38bc3200d84c5335c710044ab772a7b7f636aa59b01c4de84c7b46cc0784`; independent fresh-profile imports |
| World identity | Eaghacks Benchmark 2026; same imported UUID/data; Phase 4 hash-bound NBT/CRC record in `../recovery-phase4/world-identity.json` |
| Seed/generator | `20261019`, Superflat (`minecraft:flat`); original platform retained |
| Mode/difficulty | Creative, Peaceful; structures disabled; successful commands and original fixture identity |
| Position/view | `(0.5,150,0.5)`, yaw 0, pitch 20; teleport before every sample, native snapshots and stock F3 screenshots |
| Time/weather | `advance_time=false`, time 6000; clear, `advance_weather=false`; stock final daytime query also 6000 |
| Graphics | Fast; four render and simulation chunks; FOV 70; unlimited max FPS; VSync off; graphics API Default; inactivity reduction only when minimized |
| Complete options | `native-settings.txt` and `stock-settings.txt` are byte-identical; unchanged stock settings checked after final movement |
| Viewport/render size | CSS viewport **and game backing canvas** 640×400; DPR 1 in both |
| Browser/backend | Same Chrome installation/version and ANGLE Metal renderer |
| Overlays/skin | All modules disabled for baseline; same Tennis Alex skin; built-in game counters enabled identically |

Native HTML SHA-256:
`eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c`.
Stock HTML SHA-256:
`1338d67feae9818b8e9873b58a3225d1f4fdce29f147711666ccf133d99a13a8`.
Runtime source digest:
`49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f`.
The saved native verifier passed all six payloads, WASM hash and bridge markers.
Native remains the fast-analysis/SIMPLE development build. Stock retains the
original stock game payloads and saved browser integration shell.

## Sampling method and results

Each condition has three independent windows: idle 5 seconds, movement 1 second.
Every window resets the viewpoint and waits five seconds before measurement.
The native HUD-on set is bracketed by the original idle set and a returning
HUD-off set. No screenshot or process-memory query runs inside a timed window.

The new sampler timestamps the game's full-screen WebGL
`drawArrays(TRIANGLES,0,3)` submission to the default draw framebuffer, excluding
intermediate framebuffers. It restores wrapped methods after each window.
Raw intervals, browser rAF intervals, per-sample state and heap observations are
retained in `samples.jsonl` (also packaged with memory observations in `raw.json`). This measures game submission cadence on the CPU,
including runtime scheduling stalls. It does **not** time GPU completion or count
physical monitor presentations. Instrumentation is identical in both clients.

Average FPS below is total counted frame intervals divided by their total
elapsed time. Median FPS is the median of the three sample FPS values, not the
inverse of median frame time. Frame p50/p95 and variability pool all retained
intervals without dropping spikes. Frame standard deviation is population SD;
per-sample FPS SD in JSON uses the sample estimator. Percentages use stock as
the denominator. Timing quantization is visible at roughly 0.1 ms.

| Condition | Stock average / median FPS | Native average / median FPS | Native throughput difference |
| --- | ---: | ---: | ---: |
| Idle, 3×5 s | 532.67 / 531.34 | 784.15 / 769.57 | +47.21% |
| Timed forward movement, 3×1 s | 544.79 / 541.35 | 1042.47 / 1057.40 | +91.35% |

| Condition/runtime | Frame p50 / p95 ms | Frame SD ms | Sample FPS min–max | Sample FPS SD | Maximum frame ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Stock idle | 0.70 / 5.30 | 1.99 | 530.11–536.58 | 3.43 | 12.00 |
| Native idle | 0.70 / 5.20 | 1.33 | 767.46–815.42 | 27.10 | 8.10 |
| Stock movement | 0.60 / 5.20 | 2.06 | 533.36–559.66 | 13.49 | 15.70 |
| Native movement | 0.80 / 1.60 | 0.82 | 997.90–1071.89 | 39.21 | 17.40 |

No primary or HUD sample contained a submission interval above 50 or 100 ms.
Native idle p95 was 0.10 ms lower (1.89%), close to timing resolution and not a
strong practical difference. Native movement p95 was 3.60 ms lower (69.23%).
The separate browser rAF loop averaged about **60.00 Hz in both**; its pooled
p95 was 16.70 ms native and 16.80 ms stock. High game submission rates must not
be presented as hundreds of physical screen updates per second.

### Verified movement

The final timed procedure releases W using an independent 1000-ms host timer.
Recorded hold durations, including release-protocol latency, were
1000.92–1002.62 ms native and 1001.13–1002.77 ms stock. Every final sample began
at the target and ended, by in-game entity-data query, at
`(0.5,150,4.8134259902859675)`: exactly **4.3134259902859675 blocks forward**
with unchanged X/Y. Native snapshots also verify displacement. This is evidence
of actual movement beyond injected keyboard events. See
`movement-verification.json` and the per-sample before/after screenshots.

Six earlier movement samples used key-up after sampler completion, allowing
protocol latency to extend the hold. One native sample moved an extra game tick.
Those raw observations remain preserved under `condition: movement` and
`exploratoryMovement` in the summary. They are excluded from the primary movement
comparison, which uses `movement-timed`. There are **24 preserved sample records:
18 primary/HUD records and six exploratory movement records**.

### Meteor HUD overhead in the same binary

Enabled exactly six HUD elements: FPS, Coordinates, Direction, Speed, Armor HUD,
and Session Timer. They used their default positions and settings. Active module
lists and screenshots confirm the actual on/off states.

| Native condition | Average / median sample FPS | P95 frame ms | FPS range |
| --- | ---: | ---: | ---: |
| Initial all-off, 3×5 s | 784.15 / 769.57 | 5.20 | 767.46–815.42 |
| Six HUDs on, 3×5 s | 847.08 / 864.68 | 5.20 | 799.31–877.28 |
| Returning all-off, 3×5 s | 786.52 / 787.12 | 5.20 | 750.65–821.80 |

Relative to the six bracketing off samples pooled together, HUD-on throughput
was **7.86% higher**, with mean submission interval **0.0928 ms lower** and
unchanged 5.20-ms p95. The ranges overlap, and sequential blocks do not isolate
scheduling, GC or run drift. This does not demonstrate that overlays improve
performance. **No positive HUD cost was resolved by this short measurement.**
A causal overhead estimate requires a larger randomized paired experiment.
Stock/native differences cannot be attributed to bridge overhead because these
are different compiled runtimes; no isolated bridge-cost claim is made.

## Memory and host resources

The table uses six post-sample observations per runtime: three idle and three
final timed-movement observations. Separate JSONL retains preflight, exploratory
movement, HUD and supplemental observations without mixing them into these means.

| Mean observed metric | Stock MiB | Native MiB |
| --- | ---: | ---: |
| Owned browser process-tree RSS | 2434.30 | 2305.61 |
| Browser main-process RSS | 219.39 | 213.65 |
| Sum of owned renderer-process RSS | 1814.31 | 1710.20 |
| CDP V8/JavaScript heap used | 443.34 | 504.64 |
| CDP embedder heap used | 67.27 | 73.92 |
| Exported client linear WASM memory | 4.75 | 6.625 |

Native tree RSS averaged 5.29% lower, while its V8 heap observation averaged
13.83% higher. These are sampled observations affected by allocation/GC timing,
not proof of a smaller total memory footprint. Raw RSS ranges are approximately
1.72–2.88 GiB native and 1.83–2.61 GiB stock. Memory observations span separate
browser lifetimes for idle and final movement in both runtimes.

RSS sums can double-count shared pages. Main-process and renderer RSS are
components of tree RSS, not additional allocations. CDP heap counters do not
isolate all managed WasmGC objects or account for all GPU/browser/worker memory;
embedder heap is not a complete GPU-memory counter. Exported `teavm.memory`
measures only the client linear buffer, excluding WasmGC and worker linear
memories. Initial native samples did not inspect the underlying instance export;
that field remains null in those raw rows. A supplemental observation and final
native movement rows record 6,946,816 bytes. Stock recorded 4,980,736 bytes.

`memory_pressure -Q` reported 40–50% system-wide free percentage for the primary
stock observations and 41–49% for native. This percentage is the macOS tool's
metric, not a direct measurement of unused physical RAM. VM compression/swap
counters are retained in raw snapshots. The legacy JSONL field `pressureLevel`
contains the **raw `vm.memory_pressure` indicator**, which included 0, 62 and
245 during native observations; it is not the severity level. Continuous
severity was not captured. After cleanup, the separate
`kern.memorystatus_vm_pressure_level` query returned 1 and reported free
percentage was 53%; see `host-final.json`. Resource conditions were not perfectly
stationary, so memory and throughput conclusions remain observational.

No unrelated Chrome process was terminated. Profiles and browser storage remain
local and ignored. All benchmark contexts were closed before validation, and a
process inspection confirmed no Chrome using a Phase 5 profile remained.

## Validity, limitations and handoff

The world/artifact, settings, render size, browser/backend and viewpoint gates
passed. Final movement duration and displacement matched. Idle, movement,
frame-time, memory and same-binary HUD observations are preserved. This is a
valid bounded **local headless hardware-rendered submission benchmark** for
these exact artifacts, with the stated scope; it is not a controlled release or
physical-display benchmark.

Three short samples on one machine cannot characterize all workloads. Native
was measured before stock; sample order was not randomized, CPU power/thermal
state was not locked, and other host activity was not eliminated. Independent
world instances may diverge in incidental entity/tick state despite the same
fixture, frozen day/weather and Peaceful setting. No confidence interval based
on falsely independent per-frame observations is claimed. Built-in counters and
command-chat rendering were enabled consistently; tutorial hints could advance
as play progressed, adding another small UI variation to the HUD blocks. These local results do not
reuse prior SwiftShader timings or the 30 corrupted historical PNGs.

A headed preflight had a CSS/backing-canvas resize mismatch and blocked UI
navigation; it produced no benchmark samples. A bounded first headless title
wait timed out because the actual screen was the profile screen. Screenshots
were inspected before proceeding through the real controls. Final sampling used
headless Chrome with matching backing canvases and verified Metal rendering.

Validation: **151/151 tests**, **8/8 focused driver/statistics tests**, both
browser-bundle builds, and **SMOKE OK**. The sampler tests cover framebuffer
filtering/restoration; the rAF regression excludes a partial first interval.
Phase 4 files, original artifacts, fixture, and historical evidence were
preserved. New PNG structure/CRC and hashes are recorded in `binary-integrity.json`.
No full 64-check gameplay suite, multiplayer, Java/Gradle, native FULL build or
release packaging ran.

For Phase 6, start from the published integration commit containing this report,
read `summary.json`, the raw JSONL and `REPRODUCING.md`, and choose the next bounded
objective explicitly. A suitable follow-up is a randomized longer same-binary
HUD experiment or a headed physical-present benchmark after resolving resize
and focus behavior. Keep the exact recovered artifacts and original EPK pinned;
do not infer isolated bridge cost from this build comparison. Phase 5 stops here.

Publication uses standard Git commit/push on `meteor-client-integration`, without
force push or changing main. An independent fetch verifies the published commit
and every changed file byte-for-byte; its local receipt is kept under ignored
`input/phase5/publication-verification.json` to avoid a self-referential commit.
