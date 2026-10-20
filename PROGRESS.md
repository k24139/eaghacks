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
