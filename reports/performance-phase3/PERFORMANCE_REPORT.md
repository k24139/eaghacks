# Phase 3 benchmark world and performance verification

## Result

The replacement world was created and saved in the native client, exported as an EPK, and found in the stock client’s saved-world selector from the same persistent browser profile and origin. The stock screen shows the selected `Eaghacks Benchmark 2026` row and an enabled **Play Selected World** button.

A fresh-profile import could not be verified. Two bounded native-client startup attempts stayed on the profile/loading overlay and did not reach the import selector. The EPK is durable and hashed, but the required fresh-profile round trip is not proven. Per the benchmark gate, paired timing did not start. This report contains no FPS, frame-time, gameplay-memory, overlay, or bridge-overhead measurements, and makes no parity claim.

## Artifact and world identity

| Item | Value |
| --- | --- |
| Starting commit | `e9e3dc48b5230e57d577c52979f80c821443155e` |
| Native HTML SHA-256 | `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c` |
| Stock HTML SHA-256 | `1338d67feae9818b8e9873b58a3225d1f4fdce29f147711666ccf133d99a13a8` |
| Runtime source digest | `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f` |
| Native build | Fast dependency analysis / SIMPLE development build, not a production FULL-optimization benchmark |
| World export | `tests/fixtures/performance/benchmark-world.epk`, 570,090 bytes |
| World export SHA-256 | `503a38bc3200d84c5335c710044ab772a7b7f636aa59b01c4de84c7b46cc0784` |
| World | Eaghacks Benchmark 2026, seed `20261019`, Superflat, structures off, bonus chest off |
| Game settings | Creative, Peaceful, commands enabled; 17×17 stone platform at Y=149 |
| Reset command | `/tp @s 0 150 0 0 20` |
| Observed reset | `(0.5, 150, 0.5)`, yaw `0`, pitch `20` |
| Required origin | `http://127.0.0.1:3006` |

The native video-settings screen showed Fast preset, unlimited max frame rate, VSync off, four-chunk render distance, biome blend off, and graphics API set to Prefer OpenGL. These settings were not independently checked in the stock client, so cross-client settings equivalence is unverified. World time and weather cycling rules were not disabled; the preparation command attempted older gamerule names that this runtime rejected. Time and clear weather were set during preparation. Future samples must reset and verify these conditions.

The stock HTML contains original stock game payloads with the saved browser integration shell. Its six payload hashes match the saved pins. The native source digest and HTML hash remained unchanged.

## Environment and bounded diagnostics

- Chromium `153.0.8010.0`; headless ANGLE SwiftShader, WebGL2 software renderer.
- Container memory limit 8 GiB; browser process concurrency was one.
- Navigation viewport 1280×800. The intended measurement viewport was 640×400, but no sample viewport was entered.
- The 6.5 GiB stop was active. Peak cgroup use was 5,880,815,616 bytes (5.48 GiB); owned browser-tree RSS peak was 4,061,237,248 bytes (3.78 GiB). Both peaks occurred during native world creation/configuration, not during a benchmark.
- Fresh-profile startup peaked at 3,998,576,640 bytes. The stock selector check peaked at 4,935,090,176 bytes.
- No cgroup OOM events occurred. Owned Chromium processes were terminated after each run.

Cgroup memory is total container use. Browser-tree RSS sums each owned process RSS and can double-count shared pages. No gameplay JS heap, WASM, GPU, or renderer memory observations are reported.

## Measurements

| Condition | Stock | Native | Difference |
| --- | ---: | ---: | ---: |
| Idle FPS, 3 × 5 s | Not collected | Not collected | Not available |
| Idle median frame time | Not collected | Not collected | Not available |
| Idle p95 frame time / spikes | Not collected | Not collected | Not available |
| Movement FPS, 3 × 1 s | Not collected | Not collected | Not available |
| Movement median frame time | Not collected | Not collected | Not available |
| Movement p95 frame time / spikes | Not collected | Not collected | Not available |
| Gameplay memory / JS heap / WASM | Not collected | Not collected | Not available |
| HUD overlay on/off | Not applicable | Not collected | Not available |
| Isolated bridge overhead | Not measured | Not measured | Not attributable from these builds |

The planned warm-up was three seconds, but it was not performed. The three-sample idle and movement plan remains unchanged for a later verified run. Do not infer performance parity from startup or menu memory.

## Driver repair and validation

`tools/performance-stock-ui.mjs` now recognizes a populated `Select World` screen from its visible heading and row. It selects the row, then confirms the **Play Selected World** control is enabled. The previous classifier required the Play label before selecting a row, so the disabled control left a real saved world misclassified as unknown. A focused regression assertion covers the populated-row state.

The first stock check preserved screenshots and showed the failure. The repaired bounded check then selected `Eaghacks Benchmark 2026` in the stock selector. Fresh-profile attempts are separately logged and screenshot evidence is retained. No native compilation, Java/Gradle, multiplayer, module gameplay suite, or performance sampling ran.

## Recovery files

- Portable world fixture and instructions: `tests/fixtures/performance/benchmark-world.epk` and `tests/fixtures/performance/README.md`.
- World record: `reports/performance-phase3/BENCHMARK_WORLD.md`.
- Full raw observations and null metric fields: `reports/performance-phase3/raw.json`.
- Machine-readable conclusion: `reports/performance-phase3/summary.json`.
- The closed persistent profile backup is 709,093 bytes, SHA-256 `2b2254d55a32f124269a1ebd7610f34bf3e0a0dfb91dd3cc59475f796a8004c3`. It is available as `eaghacks-phase3-browser-profile.tar.gz`. It preserves the origin-scoped profile for `http://127.0.0.1:3006`; the portable EPK is the world recovery source.

## Phase 4 starting point

Start from the Phase 3 commit recorded in `PROGRESS.md`. First diagnose why a clean native-client profile remains on the profile/loading overlay. Use the saved profile or a clean profile, import `tests/fixtures/performance/benchmark-world.epk`, and verify the imported world appears in both clients. Then verify stock/native graphics settings and reset position in the same Chromium profile before running the existing bounded sampling plan. Do not report measurements until those checks pass.
