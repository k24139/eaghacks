# Eaghacks recovery checkpoint

Recovery-only phase, October 18, 2026, America/Chicago. Stop after this phase.
No native compilation, browser gameplay, multiplayer test, or performance comparison was performed in this phase.

## Git and source provenance

- Repository: https://github.com/k24139/eaghacks
- Branch: `meteor-client-integration`
- Starting remote/local commit: `46cd7cdf44067d039e3fccf555aa88b285648e68`.
- Starting tree: `e9cf8d66581fe4ea84ca5109956a43b8e06c8acc`.
- Main baseline: `1ccda035bc03a3fac460fc3fe484c383a65a2d59`. Main is outside the recovery changes.
- Pinned native upstream: `1be2375ad67cb42a52d5f586a2422e54b57be625`.
- No prior `PROGRESS.md` was present in the local trees or selected recovery archive. This file was created for the handoff.
- Selected source: saved `Eaghacks-native-build-checkpoint.zip`, version 14, 303,717 bytes, SHA-256 `0ea9b5fc3dfc4983485724583cc66745bc4ffb973f2a635f76967003ce6fcc31`.
- This archive's SHA-256 was recorded during recovery. Its ZIP CRC checks pass. Its runtime source digest matches the independently saved gameplay evidence below.
- Older version 13: 299,569 bytes, SHA-256 `da76e987dbe83903fa6fd10c243e48dbdab2177c3c975543c2c0eeb561d94ee9`. It was not selected.
- Runtime source digest: `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f`.
- Source was restored in a separate checkout, `/tmp/eaghacks-recovery-phase1`. Newer experimental files in `/tmp/eaghacks-resume-isolated` and the older workspace were preserved. They are not the verified handoff.

## Exact native artifact

Saved native HTML version 2 is the verified artifact. No replacement game build was generated.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `Eaglercraft-26.2-u1-Meteor-Native.html` | 80,975,660 | `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c` |
| Compressed main client payload | 17,763,621 | `817d8dc367ee32beb863b23c4716fdc9b4acdfc7547594735fadfbcbf9874176` |
| Uncompressed client WASM | 93,857,501 | `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d` |

The recovered HTML has a complete closing document and all six embedded payloads. Payload sizes and hashes match `native-bridge/inputs.json` and the saved build receipt. Only the main client differs from the original runtime. The other five payloads retain their original hashes.

`native-bridge/recovery-artifacts.json` records every payload hash, native artifact hash, runtime source digest, upstream revision and bridge markers. The main WASM contains `__eaghacksNativeBridge`, `Java/TeaVM-WasmGC`, and `__eaghacksNativeState`. Static decompression and hash checks confirmed these markers without executing the game.

Build mode is fast dependency analysis / SIMPLE optimization. The receipt labels it a fast-analysis development build. It is not a completed precise/FULL release build. The saved build used Java 25.0.4.1+1 and Gradle 9.6.1. Those toolchains were not installed or invoked again in this phase.

Local artifact paths:

- Verified original saved copy: `/workspace/scratch/673e9e5e458a/resume-restored/Eaglercraft-26.2-u1-Meteor-Native.html`.
- Restored checkout copy: `input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html`.
- Saved receipt in checkout: `input/deliverable/native-build-receipt.json`, 1860 bytes, SHA-256 `11c62c6c0f3575b73238ffb5a923e7ccca2013584c52fbe90e8cfeb70bca1c28`.
- HTML and receipt stay outside Git under the ignored `input/` directory. Recover them from the saved artifacts after a workspace reset, then verify their hashes.

## Rejected or deferred local copies

- Top-level `/workspace/scratch/673e9e5e458a/Eaglercraft-26.2-u1-Meteor-Native.html` is truncated: 55,399,936 bytes, SHA-256 `db2027684bc7c3475b5093cb55138486a2fdc233db0505e90d015f57f5d1b72e`. It ends inside an embedded payload and has no closing HTML document. Do not use it. It was preserved rather than overwritten.
- The old workspace gameplay checker is 17,636 bytes, SHA-256 `054e843732d8f429478c27e075fcd3f7a6d7fc5c2f4fa91f72942f0f2be50d2d`. It lacks the selected checkpoint's newer setup and recovery checks.
- The selected gameplay checker is 27,602 bytes, SHA-256 `d8ff264dec8b07e646f22f0aa5877f6243d3ed6fb58281a84da9210335ec19fb`.
- Selected `tools/real-client-check.mjs`: SHA-256 `04b3e90b7e07a38655938e316798e5cd3128bb80a1764e21dfd4c955f5072790`.
- Selected `tools/browser-check.mjs`: SHA-256 `115006461b8067c9fe8e1f3992703bf85438a12de90aa89c198b60cd3af6eb9e`.
- Performance scripts are preserved from checkpoint 14, not certified by this phase. Earlier experiments exposed profile/screen-signal differences in the stock runtime. Do not treat those scripts or partial timing samples as a completed matched comparison.
- The newer temporary comparison experiments were not copied over the saved verified source.

## Checks performed in this recovery phase

| Check | Result |
| --- | --- |
| `npm test` | 141 passed, 0 failed |
| `npm run build` | Both browser bundles built |
| `node tools/smoke.mjs` | `SMOKE OK` |
| `node --check tools/verify-recovery-artifact.mjs` | Passed |
| Static saved HTML / payload / WASM verification | Passed, six payloads and three compiled bridge markers |
| Negative check against the truncated HTML | Rejected before payload decompression |
| Saved source/gameplay provenance | Source digest and HTML SHA-256 match the saved 64-check evidence |

Repeat the read-only artifact check after restoration:

```sh
node tools/verify-recovery-artifact.mjs \
  input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html \
  input/deliverable/native-build-receipt.json
```

The 64 real-gameplay checks and 12 native startup/UI checks are prior saved evidence, not tests run again in this phase. `native-bridge/gameplay-verification.json` supplies the artifact hash, source digest and concrete gameplay observations. Startup evidence supports bridge communication but does not replace that hash-bound gameplay record.

The catalogue remains 77 modules: 18 verified in real gameplay, 22 implemented but awaiting gameplay checks, 6 partial and 31 unsupported. No status was upgraded from static inspection.

## Starting point for Prompt 2

1. Check out the published `meteor-client-integration` head containing this recovery handoff. Record `git rev-parse HEAD` before edits.
2. Read this file and `native-bridge/recovery-artifacts.json`. Restore the exact native HTML and receipt if `input/deliverable/` is missing.
3. Require HTML SHA-256 `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c` and runtime source digest `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f` before using the saved gameplay evidence.
4. Keep the compiled candidate. Do not restart the native build as a recovery step.
5. Begin only the next explicitly authorized bounded phase. This phase did not authorize gameplay, multiplayer or performance work.

Remaining work is separate: a production precise/FULL build on a suitable host, desktop physical pointer/focus/audio QA, remaining module coverage, multiplayer on a host where Chromium gathers WebRTC ICE candidates, and a repaired matched performance comparison. Prior multiplayer diagnostics found zero ICE candidates in the loopback-only environment. No multiplayer compatibility or performance parity is claimed.

## Phase 2 handoff: performance comparison blocked

Phase 2 started from `791b8d1bd86df0b2bedaff70413a5dbc3097998c`. Its only objective was a matched stock/native performance comparison. It stopped without paired gameplay samples: the existing superflat world was not preserved in the retained browser profiles or saved artifacts. No new world was generated.

Read [the dedicated Phase 2 report](reports/performance-phase2/PERFORMANCE_REPORT.md), [raw result](reports/performance-phase2/raw.json) and [summary](reports/performance-phase2/summary.json). Missing idle/movement FPS, frame-time, gameplay-memory, spikes, overlays and bridge self-time remain null. Earlier unmatched samples were not reused. No parity is claimed.

Compared artifact identity: native HTML SHA-256 `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c`; stock HTML SHA-256 `1338d67feae9818b8e9873b58a3225d1f4fdce29f147711666ccf133d99a13a8`. The stock artifact has the original six payloads and the saved browser-integration shell. Runtime source digest remains `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f`. The native build is fast-analysis/SIMPLE, not precise/FULL. Static recovery verification passed again.

Environment: Chromium 153.0.8010.0, headless ANGLE SwiftShader, 8 GiB container, one browser instance at a time. Navigation used 1280x800. Planned paired sampling was 640x400, the same saved superflat world/origin/profile/settings/position, three 5-second idle samples and three 1-second movement samples, with a 3-second idle warm-up. World, graphics and position matching were not achieved, so sampling did not run.

There were two bounded stock preflight attempts. Attempt 1 exposed menu-ready becoming true before resource loading ended. Attempt 2 passed actual profile and title controls, then displayed an empty-world creation/import selector. An OCR N/H variation caused its bounded timeout and was fixed by a focused regression assertion after screenshot inspection. No third browser attempt ran. Diagnostics, read-only database inventory and per-attempt memory samples are preserved. Peak cgroup use was 5.055 GiB and peak browser-tree RSS was 2.537 GiB in attempt 2. Those are startup/menu observations, not gameplay measurements. No OOM event occurred and no task browser remains.

Performance scripts now use actual stock canvas controls instead of native screen globals, bounded visual readiness, saved-world-only preflight, a persistent profile, a 6.5 GiB memory stop, bounded RAF/host evaluation timeouts, raw frame intervals, spike summaries and owned-browser cleanup. The existing native signal-based navigation is kept separate. Paired sampling and matching beyond the empty-world selector remain unverified. No runtime module code or native artifact changed.

Validation: focused performance-driver tests 5/5, full lightweight suite 146/146, browser-bundle build passed, smoke `SMOKE OK`, static native artifact verification passed. No native compilation, multiplayer, module gameplay validation or final release packaging ran.

Exact Phase 3 starting action: check out the integration head containing this Phase 2 report. Restore/import the verified superflat world into `input/performance/profile`, preserving the origin `http://127.0.0.1:3006`, and save a world export/profile backup with hashes. If no export exists, creating a replacement benchmark world needs explicit authorization in that next phase. Confirm the stock saved-world list and matching graphics/player position, then rerun the bounded paired comparison. Do not skip this prerequisite or infer performance parity from the old unmatched observations.

## Phase 3: benchmark world recovery and performance verification

Phase 3 began at `e9e3dc48b5230e57d577c52979f80c821443155e`. The earlier superflat world export was absent, so the authorized replacement was created in the native client. Its world type is Superflat, seed `20261019`, structures off, bonus chest off, Creative mode, Peaceful difficulty, and commands on. A 17×17 stone platform was placed at Y=149. `/tp @s 0 150 0 0 20` was accepted and the bridge observed `(0.5, 150, 0.5)`, yaw `0`, pitch `20`.

The client's Export EPK File action reported 1,256 files and wrote a 570,090-byte world export. Its SHA-256 is `503a38bc3200d84c5335c710044ab772a7b7f636aa59b01c4de84c7b46cc0784`. A portable copy and recovery instructions are committed under `tests/fixtures/performance/`. The native saved-world selector showed the world. A bounded stock-client check on `http://127.0.0.1:3006` also showed the same world from the persistent profile, selected with Play Selected World enabled. The stock and native HTML hashes remain respectively `1338d67feae9818b8e9873b58a3225d1f4fdce29f147711666ccf133d99a13a8` and `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c`; source digest remains `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f`.

Fresh-profile import is not verified. Two bounded attempts remained on the native profile/loading overlay and did not reach the import selector. The EPK has not passed a fresh-profile round trip. The benchmark gate therefore stopped before FPS, frame-time, gameplay-memory, HUD overlay, or bridge-overhead sampling. No parity claim is made. Native video settings were observed as Fast preset, unlimited max FPS, VSync off, four-chunk render distance, biome blend off, Prefer OpenGL; stock settings were not independently matched. The attempted legacy gamerule identifiers were rejected, so future sampling must reset and verify time and weather.

Environment observations: Chromium `153.0.8010.0`, headless ANGLE SwiftShader/WebGL2, 8 GiB cgroup, one browser at a time, 6.5 GiB stop. Peak cgroup memory was 5,880,815,616 bytes (5.48 GiB); owned browser-tree RSS peaked at 4,061,237,248 bytes (3.78 GiB). These peaks occurred during world preparation, not a benchmark. Fresh-profile and stock-selector peaks were 3,998,576,640 and 4,935,090,176 bytes. No OOM events occurred and no task Chromium process remains. RSS can double-count shared pages; no gameplay JS heap/WASM/GPU measurement exists.

The stock navigation driver was repaired after screenshots showed that a populated world row leaves Play Selected World disabled until selected. `tools/performance-stock-ui.mjs` now recognizes a Select World heading with a nonempty row, selects it, then confirms the Play control. A focused test covers this state. See [the Phase 3 report](reports/performance-phase3/PERFORMANCE_REPORT.md), [world recovery record](reports/performance-phase3/BENCHMARK_WORLD.md), [raw observations](reports/performance-phase3/raw.json), and [summary](reports/performance-phase3/summary.json).

The closed persistent profile backup is `eaghacks-phase3-browser-profile.tar.gz`, 709,093 bytes, SHA-256 `2b2254d55a32f124269a1ebd7610f34bf3e0a0dfb91dd3cc59475f796a8004c3`. It preserves profile state for the required origin. The exported EPK is the portable world source.

**Exact Phase 4 starting point:** check out the Phase 3 commit recorded below. Diagnose the clean-profile native startup overlay, import `tests/fixtures/performance/benchmark-world.epk`, and verify the world appears in both clients. Then confirm matching graphics settings and player position in one persistent profile before running the existing bounded sampling plan. Do not report performance results before those gates pass.

- Phase 3 commit: the published `meteor-client-integration` HEAD containing this handoff; use the final commit SHA reported with this phase.
- Phase 4 gate: clean-profile import and both-client settings/position verification remain incomplete.

Validation for Phase 3: focused performance-driver tests passed (5/5), `npm test` passed (146/146), `npm run build` completed both browser bundles, `node tools/smoke.mjs` returned `SMOKE OK`, and `tools/verify-recovery-artifact.mjs` revalidated the saved native HTML, source digest, six payloads, WASM hash and bridge markers. No native compilation or full gameplay suite was run.


## Phase 3 post-publish artifact integrity correction (2026-10-19)

A final remote-tree verification found that the published large binary blobs were truncated during upload. In particular, the remote `tests/fixtures/performance/benchmark-world.epk` blob is 480,240 bytes, while the verified local export was 570,090 bytes (SHA-256 `503a38bc3200d84c5335c710044ab772a7b7f636aa59b01c4de84c7b46cc0784`). The remote fixture must be treated as invalid and must not be used for Phase 4. The same upload issue affected 31 large binary files; textual report and source files and smaller binaries matched the local staged tree. The correct EPK and screenshot bytes are no longer available in the active checkout.

A browser profile archive with SHA-256 `2b2254d55a32f124269a1ebd7610f34bf3e0a0dfb91dd3cc59475f796a8004c3` was recovered from the persistent artifact backup and its hash verified. It contains the saved world in the browser's IndexedDB. An automatic publication review rejected uploading that browser profile archive to this repository because it contains browser session/storage material and that destination was not explicitly authorized. Do not work around that rejection. The profile archive remains available to the user separately. Before Phase 4, recover the EPK from that profile using the verified client export workflow, verify the EPK SHA-256, then replace the invalid repository fixture and verify the complete Git tree. No performance data was collected; Phase 3 comparison remains blocked and unmatched.

The active checkout was reinitialized at `46cd7cdf44067d039e3fccf555aa88b285648e68` and does not contain the previously staged Phase 3 files. The branch currently points at `299fcc9bad3dcf591f67c483416670dc1a486414`. This correction records the remote-integrity limitation; it does not repair the corrupted blobs. Keep `main` unchanged.


## Phase 4: local world recovery completed (October 19, 2026)

Started from `2854912b1cfbd25f5938b49a9887498d243d1574` on
`meteor-client-integration` in an isolated worktree. The original `main` checkout
and all its pre-existing local changes were preserved; no reset or force push.

The four user-recovered inputs in `/Users/aaron/Documents/eaghacks-recovery/`
passed full SHA-256 verification, including native HTML, stock HTML (provided as
`Eaglercraft-26.2-u1-Meteor.html`), receipt, and profile archive. The native static
verifier also passed all six payload pins, WASM, markers, and source digest.
Original inputs were not changed. Profiles and IndexedDB data remain local.

Local Chrome 155.0.8059.80 on macOS 26.4 / Apple M4 / 16 GB loaded the archived
world at `http://127.0.0.1:3006`. The observed player was at `(0.5,150,0.5)`,
yaw 0, pitch 20, on the stone platform. Export through the actual native backup
menu after gameplay produced 573,791 bytes, hash
`b7bb72d400c012367e9324a801b2278b1cb535c5139702c57168299aede25f24`.
This export includes normal saved-session changes and is not the original bytes.

A second untouched working copy of the archive exported 570,090 bytes and
1,256 files, hash
`018588934c1b5df3e60468bf958578c38c096852918d2f5ebd156175508af87e`.
All exported file contents match the original recovered fixture; only ten bytes
of exporter date/timestamp metadata differ. The corrupted repository blob still
retained its original 179-byte header after its decoded tool-output prefix.
Combining that header with the untouched native export reproduced **exactly**
570,090 bytes, SHA-256
`503a38bc3200d84c5335c710044ab772a7b7f636aa59b01c4de84c7b46cc0784`.
`tools/recover-epk-header.mjs` reproduces this operation and refuses to write
unless the full expected hash and all EPK file CRCs match. Only this validated
original-hash reconstruction replaces `tests/fixtures/performance/benchmark-world.epk`.

Independent clean native and stock profiles imported copies of that exact EPK.
Both loaded gameplay, showed the platform, and retained the world across full
Chrome shutdown/restart. Native snapshots and stock debug screenshots confirm
position. A stock re-export also passes the static world identity checks.
NBT validation confirms seed 20261019, flat generation, Creative/Peaceful,
commands on, structures/bonus chest off, expected ground layers, saved view,
and all 289 stone platform blocks from (-8,149,-8) to (8,149,8).

The previous fresh-profile failure is superseded by these successful tests.
Navigation waits for the actual profile screen with the resource overlay gone,
sets the username, then clicks Done. Empty profiles show the import selector
(`EaglerCreateWorldSelectionScreen`), not the populated-world selector. Complete
the import-name Continue step, select the resulting row, then click Play.

Historical screenshot recovery remains incomplete: 30 PNG blobs contain decoded
truncated tool output and fail PNG validation. Removing the warning prefix does
not restore missing data. The provided directory and source ZIP contain no
original screenshots; local history only has the damaged versions. Those files
remain unchanged and explicitly INVALID in the before/after binary audits.
New screenshots under `diagnostics/recovery-phase4/` are new evidence only.

Validation: `npm test` 148/148; `npm run build` both bundles passed;
`node tools/smoke.mjs` SMOKE OK; focused recovery tests 2/2; native static
artifact verification passed; native and stock clean-profile import/gameplay/
restart checks passed. No performance benchmark, multiplayer test, native
recompilation, or module-coverage upgrade was performed.

See `reports/recovery-phase4/RECOVERY_REPORT.md`, `world-identity.json`,
`export-comparison.json`, `browser-verification.json`, and binary audit manifests.
The EPK and new screenshot binaries are published using local Git push and
checked by an independent fetch; publication receipts are retained locally in
`input/phase4/`. The archived profile and its IndexedDB were not uploaded.

## Phase 5: local matched hardware-rendered benchmark

October 19, 2026, America/Chicago. Started from clean integration worktree and
verified remote `2ee6224e9fccb03ca901f85fcf96cddf06dd7dc4`. Original main checkout
and its local changes were preserved. No Java/TeaVM compilation, new world,
Phase 4 recovery, full gameplay suite, multiplayer or release packaging ran.

The original 570,090-byte EPK and both client HTML hashes passed. Source digest
remains `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f`.
Independent new task profiles imported the same verified fixture; complete game
options matched byte-for-byte. Both used Chrome 155.0.8059.80, Apple M4 ANGLE
Metal acceleration, actual 640×400 game backing canvas and viewport, Fast/four
chunks, unlimited FPS, VSync off, Creative/Peaceful, frozen time 6000 and clear
weather. Viewpoint reset to `(0.5,150,0.5)`, yaw 0, pitch 20 before each sample.

Three 5-second idle samples: stock average/median sample FPS 532.67/531.34,
native 784.15/769.57; pooled p95 intervals 5.30/5.20 ms. Three final 1-second
movement samples: stock 544.79/541.35, native 1042.47/1057.40; p95 5.20/1.60 ms.
Every final movement sample displaced exactly 4.3134259902859675 blocks in +Z;
recorded host key holds were 1000.9–1002.8 ms. Earlier movement attempts remain
as six exploratory raw records, excluded from the primary comparison.

These FPS values count CPU-side game fullscreen WebGL frame submissions, not
GPU completion or physical monitor presentations. Separate browser rAF cadence
was about 60 Hz in both. Higher native throughput compares different compilation
characteristics and must not be labeled isolated bridge overhead or parity.

Six native HUDs (FPS, Coordinates, Direction, Speed, Armor, Session Timer) were
measured in the same binary. HUD-on averaged 847.08 FPS, 7.86% higher than six
bracketing off samples, with unchanged 5.20-ms p95 and overlapping ranges. This
does not establish a performance benefit or a positive HUD cost; short sequential
blocks remain affected by scheduling/GC/run noise.

Mean observed browser-tree RSS: stock 2434.30 MiB, native 2305.61 MiB; CDP
V8/JS heap: stock 443.34 MiB, native 504.64 MiB. Exported client linear WASM:
stock 4.75 MiB, native 6.625 MiB, excluding WasmGC/workers/GPU memory. RSS may
double-count shared pages. Host raw memory-pressure indicator varied; continuous
severity was not captured. Resource and memory findings are observational.

See `reports/performance-phase5/PERFORMANCE_REPORT.md`, `summary.json`,
`samples.jsonl`, `memory.jsonl`, movement verification, device/options records,
binary integrity manifest and `REPRODUCING.md`. There are 24 preserved raw sample
records (18 primary/HUD and six exploratory). All task browsers were closed.
The 30 damaged historical screenshots remain unchanged and were not evidence.

Validation: npm test 151/151, focused tests 8/8, both browser bundles built,
SMOKE OK, native static artifact verification, new PNG CRC/hash audit and Git
whitespace checks. Publication uses standard Git CLI without force push; an
independent fetch verifies the published files and commit, with a local receipt
at `input/phase5/publication-verification.json`. Main remains unchanged.

**Phase 6 starting point:** use the published integration commit containing this
handoff. Read the report, raw data and reproduction instructions first. Select
the next bounded objective explicitly; longer randomized HUD pairs or physical
presentation/focus QA would address current limitations. Keep exact artifacts
and world pinned. Do not begin multiplayer, unrelated modules, native FULL
compilation or release packaging as part of Phase 5.

## Phase 6: module verification and focused repair (handoff October 20, 2026)

Started at `dee3df9a338aa990620ea5108a4fe4a56ae0613b` in the clean integration
worktree. Original main checkout/local changes preserved. All 22 implemented
modules awaiting gameplay checks were evaluated against actual native game state.
Screenshot Utilities also gained real gameplay verification: **23 newly verified,
18 historical verified, 5 partial, 31 unsupported**, total 77. Historical labels
refer to the original artifact and do not certify the refreshed runtime.

Fixed macro default waits, duplicate notifications, the missing Chunk Borders
axis and black screenshots. Five focused regressions bring the suite to **156/156**;
both builds and smoke pass. Prioritized movement, rotation, camera and inventory
conflicts passed; lifecycle checks include real death/respawn, exit/reentry and
saved configuration/reload. An input-capture blocker was resolved with a foreground
headed task tab; no native API or Java change was required.

Final refreshed HTML SHA-256:
`6403b3eefb970f302a9dfa07b892eb1827629d96a09dd38c852e326ac2265829`.
Final source digest:
`252d2ca8b9bdde95958474e6c08894a422bb02a7452a8f03b548833d86ee9fa4`.
All six compiled payloads remain byte-identical. Historical HTML/source references
`eee3f8e9…` / `49015a0f…` remain preserved with their original evidence.

Read [the Phase 6 report](reports/module-phase6/PHASE6_REPORT.md),
[77-module matrix](reports/module-phase6/MODULE_MATRIX.md), and
[structured verification](reports/module-phase6/verification.json). Raw results
retain failed attempts and separate the intermediate and final artifacts.
No benchmark world creation, performance rerun, multiplayer, Java/native build
or release packaging occurred. The 30 corrupt historical PNGs remain invalid.

Publication: normal CLI commit/push on integration; independent verification
receipt stays ignored under `input/phase6/publication-verification.json`. Phase 7
starts from that published commit and the exact runtime/matrix evidence. Remaining
partial modules: Criticals, Fullbright, NoHurtCam, Macros, Target HUD. Missing native
contracts and possible JavaScript-only follow-ups are enumerated in the matrix.
Stop after Phase 6; later compilation or multiplayer requires its own phase.

## Phase 7: desktop, audio and private multiplayer (October 20, 2026)

Started at `8ff1737b4f0147a96d3ced6cd9388ed7d0910447` in the clean integration
worktree. Original main checkout and its unrelated changes preserved. Phase 6
HTML/source hashes and all six payloads matched before testing. No Java/TeaVM
build, FULL optimization, matched benchmark or release packaging ran.

Fixed keybind disposal retaining held keys and an uncanceled capture callback.
The regression and actual client failed before the repair and pass afterward:
shutdown twice clears keys/capture, cancels once and leaves no listeners/input.
A harness-only implicit favicon 404 was also repaired; console diagnostics now
include source URLs. Tests **158/158**, focused regressions **2/2**, build and smoke
pass; final browser harness **20/20**. Prior failed probes are preserved.

Final repaired standalone: **80,978,153 bytes**, HTML SHA-256
`df14bf44e1de2ea58671fa4250234dea737fcc47b18e1f718c4d4149932bd5ea`;
source digest `86b8b96670de55cb277e6e281d0a5d2b7bc4d421d20b17f39b9ca1fdc1a02623`.
All six embedded payloads remain byte-identical. Native stays fast-analysis/SIMPLE.

Headed Chrome automation passed 18/18 final desktop checks, actual attack,
blur/minimize release, GUI ownership, local world exit/reentry and shutdown.
WebAudio recordings establish nonzero graph output for menu/gameplay sounds and
audio after focus/world restoration; they do not certify speakers or human
listening. Missing optional music explains the empty music event warning.

WebRTC passed in isolated headed profiles, with actual ICE/open bidirectional
channels. Two real private loopback game clients exchanged positions, entities,
inventory and chat; supported HUD/Radar/Zoom worked and remote combat stayed
blocked. Clean disconnect and forced gameplay-channel loss released state/input.
A second real gameplay connection exchanged data. The combined reconnect intent
restoration assertion did not finish because host lobby navigation resisted
Back/Escape automation. Physical lobby controls, automatic module restoration
after remote reconnect, physical mouse recenter and human listening remain
unverified. A synthetic zero-delta recenter probe failed; do not label it passed.

[Phase 7 report](reports/desktop-phase7/PHASE7_REPORT.md), raw checks, recordings,
console logs, screenshot/audio integrity and manual checklist preserve the exact
evidence. There are 77 raw actual-client records (67 pass, 10 failed probes retained),
41 bound to the final artifact. One QA-startup predicate ReferenceError was captured
and corrected in the driver; zero total page errors is not claimed. No module
crashes were observed. Sixteen new PNGs validate; 30 damaged historical PNGs remain
INVALID and untouched. Both task game browsers and loopback QA servers are closed.

Publication uses normal local Git CLI on integration, no force push/main changes.
An independent fetched-tree/byte receipt remains ignored under
`input/phase7/publication-verification.json`. **Phase 8 first action:** use this
published commit and exact runtime, then complete `MANUAL_CHECKLIST.md`, reproduce
the host lobby navigation limitation and assert reconnect restoration without
explicitly re-enabling modules. Do not infer authorization for native hook work,
FULL compilation or production release. Phase 7 stops at this handoff.

## Phase 8: desktop and multiplayer reliability (October 20, 2026)

Started at `f57ffc361d3e873677b8253dba3fbea1dadfac4a` in the existing integration
worktree. Original main/status and every initially hashed Phase 6/7 report remain
unchanged. Runtime source commit: `e34a8ab6b6fd9bb314a25aa9395c1f2259778ebe`.

Fixed native unknown/missing session identity inheriting stale legacy
`singleplayer`. Native snapshots now require explicit local identity. A failing
regression and controlled old-client metadata fault reproduce the defect;
focused tests and the repaired actual client pass. Ready remote configuration
restoration cannot enable KillAura while multiplayer combat opt-in is false.

Actual Coordinates/Radar/Zoom intent restored automatically, without enable calls,
after **two consecutive normal remote reconnects and a forced-loss reconnect**.
Current player/entity references, settings, FOV and listener baselines passed.
Disabling Radar while disconnected canceled its restoration; host world exit,
module disable and observer-free shutdown cleanup passed. Host lobby failure
reproduced even after Meteor shutdown, with browser animation advancing and the
native bridge stationary. Root cause/physical post-acceptance navigation remain
unresolved. The tested driver selects the guest by peer ID and returns the host
to gameplay before guest acceptance, then retains guest foreground.

Final HTML: **80,978,184 bytes**, SHA-256
`9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0`.
Source digest: `d2cc8f7711a9b7a8c218232066c0d3c67135c5b4e644f3b0d098c028ac2aa7a0`.
All six native payloads unchanged. Tests **162/162**, new lifecycle/safety checks
**4/4**, browser harness **20/20**, final headed desktop **18/18**, build and smoke
pass. Four final-artifact recordings decode to nonzero audio; one invalid-placement
interval is silent/header-only. Thirteen new PNGs validate; historical corrupt
images remain unused. Raw evidence retains 53 observations (48 pass, 5 failed
probes), an old-guest artifact-binding correction and driver limitations.

Physical mouse, OS recenter, human listening and physical lobby navigation remain
awaiting user verification in the new checklist. No Java build/patch, FULL link,
matched performance comparison, public server or release packaging ran. Dedicated
browsers and the loopback server are closed. Read
[the Phase 8 report](reports/reliability-phase8/PHASE8_REPORT.md) and structured
verification. Normal Git CLI publication and an independent fetched-byte receipt
under ignored `input/phase8/publication-verification.json` record the final
containing commit. Phase 9 starts with physical confirmation and diagnosis of the
bounded native lobby stall; do not infer native development/release authorization
from this handoff. Stop after Phase 8.

## Phase 9: bounded host-lobby investigation (October 20, 2026)

Started at `e60ec2ae87622b6032f8756f9ece57fe803b1a53` in the clean integration
worktree. Original main checkout and unrelated changes preserved. Read
[the Phase 9 report](reports/reliability-phase9/PHASE9_REPORT.md),
[root-cause findings and limits](reports/reliability-phase9/ROOT_CAUSE.md), and
[structured verification](reports/reliability-phase9/verification.json).

The historical lobby stall remains unresolved, with no runtime/native fix. Two
bounded post-acceptance Path B attempts (including a fresh host reload) instead
advanced bridge sequence and left the peers screen using ordinary Back/Escape.
Path A and the pre-acceptance return-to-gameplay workaround were verified again.
The reported native tick is world game time; a pause control kept it fixed while
bridge sequence advanced, so use sequence plus screen/input/RTC observations.
Full pinned native loop/LAN/TeaVM sources could not be fetched: GitHub returned
HTTP 451 repository-blocked; preserved local screen/input and bridge sources were
inspected. No speculative Java patch or rebuild ran.

Two normal reconnects and one forced-loss reconnect automatically restored
Coordinates/Radar/Zoom without enable calls during restoration. Disable while
disconnected, remote combat policy, actual guest-to-host position exchange,
FOV/input cleanup, host exit and observer-free double shutdown passed. A driver
error blindly pressing Escape on an already-paused guest was repaired; failed
attempts and excluded pre-acceptance probe remain documented.

Validation: 162 unit tests; focused lifecycle 4/4 (subset); 20/20 browser checks;
18/18 headed desktop checks; build and smoke passed. Raw actual-client assertions
50/50, not unique features. Fourteen new PNGs pass CRC/stream checks. All hashed
Phase 6/7/8 reports and historical harness artifact bytes preserved; 30 corrupted
historical screenshots still excluded. Forty-eight memory samples: 37–49% free,
largest sampled owned RSS sum 4,587,765,760 bytes; all task browsers/server closed.
Physical continuous mouse/recenter and human listening remain pending user results.

Exact Phase 8 artifact remains 80,978,184 bytes, SHA-256
`9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0`;
source digest `d2cc8f7711a9b7a8c218232066c0d3c67135c5b4e644f3b0d098c028ac2aa7a0`.
All six payloads and compiled WASM unchanged; HTML/profile/storage stay ignored.
No native build, FULL optimization, module expansion, matched benchmark or release
packaging. Publication uses ordinary local Git push and independent full-tree
byte verification; final containing SHA/receipt follow publication.

Phase 10 starts from the published Phase 9 commit: reverify unchanged artifact,
obtain physical QA with the manual checklist, then separately authorize further
bounded lobby work if desired. Complete lawful pinned source and symbols are
needed before attributing a native cause or considering instrumented compilation.
Keep current successful B flows as controls and the workaround available. Stop
after Phase 9; no next-phase implementation is started by this handoff.

### Phase 9 publication safety correction

The later explicit publication request triggered a complete 70-file review.
Session invitation strings and transport identifiers were found in local
evidence and sanitized before publication; the original d85a48d commit remains
local only. The sanitized publication has a new identity directly after the
published Phase 8 baseline, with no d85a48d ancestor. See
[publication review](reports/reliability-phase9/PUBLICATION_REVIEW.md).
Runtime/test results and all 14 screenshot byte hashes are unchanged.

## Phase 10: native-source recovery and publication diagnostics

Started at independently verified sanitized Phase 9 publication
`0969e356b6e9f7e3e31d5670a9ae399c976651cf`. Phase 9's original d85a48d stays local
only; private invitations/transport identifiers were sanitized in a new direct
child of Phase 8 before publication. Fresh fetch matched tree and all 573 files.
Read [Phase 10 report](reports/native-phase10/PHASE10_REPORT.md),
[source provenance](reports/native-phase10/source-provenance.json),
[search scope and missing blob IDs](reports/native-phase10/source-search.json), and
[lobby findings](reports/native-phase10/LOBBY_FINDINGS.md).

No missing core native source was recovered. Two identical CRC-valid local source
ZIPs (309,537 bytes, SHA-256 0517476a238c1e3fc30fed66a6699635baed5176b6d5f2d46c163743c6e31e66)
contain only three Java bridge overlays; recovered ignored copies exactly match
current files. These are distinct from the historical checkpoint archive.
Four existing pinned screen/input/discovery/server sources were reverified.
Twelve local Git repositories lacked the ten expected native source blobs.
Downloads/Desktop remain unreadable under macOS permissions; Gradle/Maven caches
and historical Linux build directories are absent. No blocked source was fetched
or access control bypassed; recovered code is not newly redistributed.

The investigation separates bridge beginFrame started sequence, pending state and
endFrame completed sequence. Snapshot session.paused means menu/overlay presence,
not proven server pause. Discovery subscriber exceptions may be caught silently;
no pageerror is insufficient to exclude them. The event queue's poll API drains
it and must not be used just for observation. Exact HTML timer glue was recovered
locally and hashed; no Java mapping/debug section was found in the unchanged WASM.
A healthy single-client control advanced started/completed/world by 30 and browser
frames by 180. Historical Phase 8 started/pending state was not captured, so its
stall remains unresolved and no exact Java method/fix is established.

Exact HTML/source/WASM/six payloads are unchanged. Validation: 162 unit tests,
20/20 browser harness, build and smoke passed; native world exit/double shutdown
left zero owned state/listeners/errors. No runtime implementation changed, so
prior multiplayer regressions remain historical and were not unnecessarily
repeated. All initially hashed Phase 6–9 report bytes remain unchanged; corrupt
historical PNGs remain invalid/unused. Dedicated manual session was prepared and
closed; mouse/recenter/physical lobby/audio listening remain pending (user
unavailable). Memory samples 58% free during preparation and 65% at cleanup.
No task Chrome/server remains; no unrelated Chrome terminated.

Phase 10 publishes only docs, safe validation logs and structured observations.
Full receipt/final containing SHA follow the normal push and independent fetch.
The precise blocker is missing lawful pinned Minecraft/server/TeaVM/WebRTC and
LAN callback source plus symbols. Next obtain those sources, verify expected
blob IDs, and separately authorize any instrumented native build. Plan one narrow
capability with ABI/gating/bounds/lifecycle and actual-client regressions only
after reliability tracing. No native hooks, Java build, FULL optimization,
matched benchmark, unsupported-module implementation or packaging ran. Stop here.

## Phase 11 — native readiness and physical QA baseline

October 20, 2026, America/Chicago. Started from clean meteor-client-integration
70365651d50eca8f0ac538e7f453aabb66420a61, also confirmed by fresh remote fetch.
See reports/native-phase11/PHASE11_REPORT.md and verification.json.

Known-good HTML/source/WASM and all six payload identities were verified; 19,509
resource CRCs and the exact resource tree passed. No runtime implementation or
native payload changed. Validation: 162/162 unit tests, both JavaScript bundles,
20/20 task Chrome harness checks and smoke all passed with exit 0. Historical
reports and harness screenshot bytes are preserved; damaged historical PNGs
remain invalid. Agent-owned harness Chrome/server were closed.

No new core source was recovered and no repeated broad source search ran.
The saved pinned tree identifies patched TeaVM 0.13.1 jars and build-file blob
IDs, documented as metadata rather than recovered bytes. Complete pinned source,
patched jars/transitive dependencies and mapping are missing. Java/JDK and
Gradle are unavailable; historical Java 25.0.4.1+1 Linux x64 download pin cannot
establish macOS ARM readiness. The isolated fast-analysis/SIMPLE build plan is
provisional; compiler settings, verified toolchains and memory/disk feasibility
remain blockers. No download, install, Java build, WASM replacement, standalone
regeneration, FULL optimization, benchmark or release packaging occurred.

Manual QA has an executable reopening procedure and individual PENDING statuses.
User reported availability and an initial wrong-directory helper launch error;
explicit worktree correction was supplied. Physical input/listening success is
not inferred from automation. Future diagnostics are designed with independent
loop/publication/command/LAN/worker/continuation markers and bounded non-consuming
buffers; no instrumentation was implemented and the lobby fault is unresolved.

Publication uses an ordinary push and separate fresh fetch; the ignored Phase 11
receipt/final response record actual commit/tree/all-file verification. Main and
the original checkout are preserved. Next obtain lawful exact source/dependencies,
resolve Mac toolchains, finish user physical QA and seek separate compilation
authorization. Stop after Phase 11; do not begin modules or Phase 12 here.

### Phase 11 physical QA follow-up

User reports: "Everything works. I did not test the lan, since that is not a priority right now". Recorded 35 non-LAN checks as PASS (8 mouse, 18 keyboard/interface,
9 audio) from this aggregate self-report, without invented measurements. All
7 LAN checks remain PENDING and deferred by user preference. Operator is the
user; exact test time, actual browser version and mouse/audio hardware remain
unreported. Browser/server cleanup was not confirmed. Automated results and
known-good artifact identities are unchanged; no native build or Phase 12 work
ran. The documentation follow-up is committed/published with its own independent
verification receipt in ignored input/phase11 storage.


## Phase 12 — Native prerequisites and capability reliability

Started from `6284074f4cbddbfd429afa008b858c4dc9b81a56`. One bounded source check found no new authorized candidate; complete pinned source/build files and patched TeaVM 0.13.1 dependency closure remain missing. No native compilation or Java changes. Official checksum-verified Temurin 25.0.4.1+1 macOS ARM64 and Gradle 9.6.1 are installed in ignored project-local storage and version commands pass.

Fixed reproduced integration defects: aggregate native-direct no longer accepts a partial movement/combat feature set; velocity/rotation and swing reject unadvertised native actions. Added two regression tests covering enable refusal, capability-loss suspension/restoration and command refusal. No module support expansion.

164 unit tests, build, smoke and 20 browser harness checks pass. An isolated JavaScript-refreshed candidate passed 12 actual-client startup/UI checks with unchanged WASM and six unchanged native payloads. Preserved Phase 11 HTML is byte-identical. No new loaded-world/audio/physical/LAN results are claimed; the 35 physical passes remain historical and seven LAN checks remain deferred. No FULL optimization, performance benchmark or release packaging. Details, hashes, reproduction and remaining prerequisites: `reports/native-phase12/PHASE12_REPORT.md`. Publication uses a normal push and independent all-file verification receipt in ignored `input/phase12/`. Stop after Phase 12.


## Phase 13 — Playable standalone JavaScript candidate

The immutable Phase 12 candidate passed 65 actual loaded-world checks. Fixed ClickGUI settings callbacks retained across panel reset/refresh/disposal, with a regression reproduced against the starting commit. Unit tests 165/165, browser harness 20/20, build and smoke pass.

Generated ignored `input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC.html`; verified all six native payloads and decoded WASM byte-identical to the Phase 11 baseline. Direct disk testing passed 79 unique actual-client checks across hash-identical checkpoints, 56 focused module checks and eight process-restart/recovery/shutdown checks. Real blocks were placed/broken through simulated mouse input and server conditions; WebAudio produced nonzero samples. Setup failures and checkpoint scope are disclosed in the report rather than counted as successful sweeps.

77 modules: 41 with current gameplay observations, five partial, 31 unsupported by the current adapter contract. No exhaustive per-module acceptance count or full 77-module functionality is claimed. The 35 physical passes remain historical to Phase 11; seven manual LAN checks remain deferred. Release-specific physical input/audio and full per-module settings/world-exit acceptance are pending; preserve the host-return-before-guest-acceptance workaround.

See `reports/release-phase13/PHASE13_REPORT.md`, `MODULE_STATUS.md`, `verification.json` and `release-manifest.json`. Publish only reviewed source/tests/sanitized reports/metadata and browser JS. Independently verify the remote commit, tree, objects, all tracked bytes, original checkout and main using `tools/phase13-publication.py`; post-commit receipt stays ignored. No native compilation, new native source research or next phase. Stop after Phase 13.


## Phase 13.1 — Correct ClickGUI world availability

Reproduced the exact Phase 13 RC: valid native player/world and readiness flags remained present, but Right Shift caused PauseScreen/paused and `inWorld()` rejected the loaded world. KillAura, BunnyHop and Entity ESP were gray and real category clicks did not activate them. Corrected native world detection while retaining pause/screen/GUI/focus input gates and Phase 12 feature validation.

Actual GUI testing also reproduced stale row warnings, incorrectly restored collapsed panels and cleared preset binds returning after restart. Fixed row refresh on opening, model/DOM expansion synchronization and explicit bind serialization. Five new regression tests; 170 unit tests, 20 browser checks, build and smoke pass. The exact final RC2 passed 197 actual-client checks and 11 restart/recovery/shutdown checks, including all 41 module GUI activations and all 41 setting sets across Chrome restart. Priority gameplay, filters/range, disable, world exit/reentry and post-restart availability are observed. Status counts remain 41 gameplay-observed/five partial/31 unsupported; no new unsupported behavior or exhaustive all-module certification is claimed.

Ignored local candidate: `input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC2.html`. WASM and all six payloads are byte-identical to baseline; Phase 11/12/13 artifacts remain intact. Report, sanitized evidence and identities: `reports/release-phase13/PHASE13_1_REPORT.md`, `phase13_1-verification.json`, `rc2-manifest.json`. Positive second-player ESP filtering, human physical input/audio and seven deferred LAN checks are not claimed. Publish reviewed changes normally and independently verify every tracked byte, original checkout/main and old artifacts with `tools/phase13_1-publication.py`. No native build, LAN investigation or Phase 14. Stop after Phase 13.1.


## Phase 14 — Gameplay quality and experimental RC3

Started from `0287de1bcf7ebb1a086f5df986c7742b2403afd9`, integration worktree only. KillAura now uses monotonic fractional deadlines, configurable attempt rate/variation, target-switch delay, bounded batches, continuous smoothed rotation and safe GUI/toggle resets. Actual axe damage comparisons establish modern weapon recovery; the bridge has no native charge-readiness field. Falling preference uses verified state and a bounded wait, with no guaranteed critical-hit claim. Secondary attack modules yield to KillAura and preserve its queue during cleanup.

Fixed hidden ClickGUI search focus swallowing gameplay keys on close, with a failing-before/passing-after regression. Repaired macro keyboard routing, modifier matching, registered client bind steps and sequence cancellation. Target HUD ignores dead/nonliving targets and scales its bar. Unsupported armor, night-vision and independent hurt-tilt controls visibly explain their missing contracts. Existing brightness/hurt suppression remain intact. No unsupported module promotion or native changes.

189 unit tests, build, smoke and 20 installed-Chrome browser checks pass. The exact RC3's current native damage/timing, GUI, functional, world save/reentry and process-restart evidence is itemized in `reports/release-phase14/verification.json`. Counts remain 0 exhaustively accepted, 41 gameplay-observed, five partial and 31 unsupported. Shared GUI/lifecycle tests do not certify every setting. Human physical input/audio/combat feel, positive other-player ESP, exhaustive combinations and seven deferred LAN checks remain pending.

Local ignored RC3 and unchanged six-payload/native WASM identities are bound by `reports/release-phase14/artifact-manifest.json`. Publication uses a normal integration-branch push and independent commit/tree/fsck/all-tracked-byte verification with original checkout, main and historical HTML preservation checks. See `PHASE14_REPORT.md`, `MODULE_ACCEPTANCE.md`, `COMBAT_VERIFICATION.md` and `PHYSICAL_QA.md` under that report directory. This is a coherent verified improvement subset, not final-release certification or satisfaction of every exhaustive acceptance objective. No Phase 15 work ran.


## Phase 15 — Final acceptance and RC4

Started from e3c1455c3a119cd0e8f47676e6dd38279374bc8e, integration worktree only. Fixed AutoClicker modifier matching and mouse activation holds, and a native GUI ownership race that dismissed a fresh user Escape pause after ClickGUI close. Three behavioral regressions fail before and pass after; the new native listener has explicit mount/dispose coverage. No broad module expansion, native rebuild or dependency addition.

Exact local RC4: input/phase15/Eaglercraft-26.2-u1-Eaghacks-RC4.html, SHA-256 5d404a9f73c65acd1c4e453582301f507d6a7b307ebaa7a199284aea0c6c1b9d. 193 unit tests, build, smoke and 20 browser checks pass; native verification includes 100 full gameplay assertions, 56 focused checks, 198 GUI checks, 119 cohort transition assertions and 13 process restart/recovery/shutdown checks. These overlapping suites do not certify all combinations. The bounded loopback attempt stopped at reconnect, with 18 completed assertions on the exact final RC4. Initial join while the host stayed in the peers screen, Back/Escape, responsive host gameplay, guest movement and disconnect cleanup passed. Re-invitation timed out after 30 seconds; reconnect camera/HUD intent and LAN shutdown assertions were therefore not reached. Other-player ESP disposition: verified genuine-player detection/self exclusion, player filter, rendered tracking, range and disable cleanup. Remaining uncompleted LAN scopes stay unverified. LAN testing stopped after three bounded attempts; incomplete setup/delivery attempts are disclosed in verification.json. No transport rewrite ran. Single-player restart/shutdown evidence remains separate.

Counts: 0 fully accepted, 41 gameplay-observed, five partial, 31 unsupported, zero newly failed. Human physical input/control/visual/audio/save QA and seven physical LAN items remain pending; independent whole-project final quality audit is next. RC4 is pending acceptance, not final release certification. All six native payloads, decoded WASM and historical HTML are preserved; publication verifies remote commit/tree/all tracked bytes, main and original checkout. See reports/release-phase15/PHASE15_REPORT.md, MODULE_ACCEPTANCE.md, RELEASE_READINESS.md, verification.json and artifact-manifest.json. No public standalone HTML release is authorized. Stop after Phase 15.
