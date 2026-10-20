# Phase 6: native module verification and repair

Started October 19; handoff finalized October 20, 2026, America/Chicago.
Starting commit: `dee3df9a338aa990620ea5108a4fe4a56ae0613b` on
`meteor-client-integration`. Work used the clean `input/phase4-worktree` checkout.
The original checkout remains on main with its unrelated changes preserved.
Initial state is recorded in `initial-state.json`.

All **22 previously implemented/unverified modules received focused gameplay
evaluation** on the refreshed native client. Screenshot Utilities was also
repaired and verified, giving **23 newly verified modules**, with **5 partial**
and **31 unsupported** modules remaining. Another **18 modules retain historical
verification on the original artifact**. These are distinct evidence classes:
41 modules have gameplay evidence across the two artifacts, but the old 18 are
not thereby certified on the refreshed HTML. No claim that all 77 work is made.

The registry/evidence audit reproduced the initial counts exactly:
18 historical verified, 22 implemented/unverified, 6 partial and 31 unsupported.
The full 77-row [matrix](MODULE_MATRIX.md) and `module-matrix.json` identify each
module's category, requirements, settings/defaults, implementation status,
automated test-file matches, actual checks and limitations. Automated file
matches are coverage pointers, not invented per-module test totals.

## Actual gameplay coverage

| Group | Newly evaluated implemented modules | Observed behavior |
| --- | --- | --- |
| HUD | Active Modules, CPS Counter, Custom Text, Direction, FPS, Keystrokes, Performance Monitor, Session Timer, Speed HUD | Nonempty visible nodes at configured (12,30); live text/position, yaw, held W, positive movement speed, mouse click and timer updates; disable removes nodes |
| Rendering | Radar, Hitboxes, Chunk Borders | Actual private-world entity/projection data produces canvas pixels; repaired chunk grid draws both axes; disabling clears overlay |
| Movement/player | BunnyHop, AntiAFK, Durability Warnings | Actual jump height, sprint activation gate, changed yaw; no remaining movement after disable; real damaged Iron Pickaxe reads 5/250 durability and emits warning |
| Combat | AutoClicker, TriggerBot | Real pigs lose health; held activation gate, weapon-only rejection of stick, actual crosshair target and inventory input gating |
| Client utilities | Debug Console, Friend Manager, Keybind Manager, Module Search, Notifications | Actual toggles/events and subscription cleanup, friend setting integration, real ClickGUI opening; one notification row/event after repair |

Screenshot Utilities downloads the real 1280×800 game canvas after repair.
The original black PNG is retained as **failure evidence**, not proof of a
working screenshot. It decodes to one color. The repaired PNG decodes to
687 colors and visibly contains the platform, pig and inventory. Both files
have valid PNG structure/CRCs; `binary-integrity.json` records content hashes.

`checks.jsonl` contains actions, expected/actual behavior, setting overrides,
results, cleanup observations and artifact/source hashes. Defaults are in the
matrix; a settings map of `{}` means defaults/no override in that helper group.
Evidence is focused on these observed paths, not an exhaustive sweep of every
setting combination. In particular, FPS displays framework/browser cadence,
not physical display FPS or the separate game-submission metric.
Hitboxes draws projected rectangles; Expand changes the overlay, not collisions.

## Confirmed repairs

| Module | Defect | Repair and regression evidence |
| --- | --- | --- |
| Macros | A wait step's 250-ms default was overwritten with zero immediately | Preserve the wait default after advancing the step. Regression failed before the fix; actual native-client macro waits, resumes and cancels on disable |
| Notifications | Client callback and manager event delivered the same notice twice | Client publishes once and returns a handled sentinel; manager skips republishing. Regression failed at 2 versus 1; actual history/event counts are now one |
| Chunk Borders | Only X-directed grid segments were drawn | Add Z-directed projected segments. Regression failed before the fix; actual repaired rendering and cleanup passed |
| Screenshot Utilities | `toDataURL()` in a later input task read a discarded WebGL buffer | Capture immediately after the final default-framebuffer draw; restore draw method after success/failure/timeout/cancel. Real PNG content, cancellation and cleanup passed |

Five new regression tests cover these defects, including screenshot offscreen-pass
filtering and cancellation/timeout restoration. The capture wrapper exists for
one present, with a two-second timeout; it is not a permanent per-frame hook.
Text HUDs retain their existing 100-ms refresh limit. This phase did not profile
allocations or claim zero allocations: existing bounded Radar candidate arrays
and Hitboxes projection arrays remain possible optimization work. The chunk fix
adds only the required second-axis projection. No performance comparison was
repeated.

## Partially implemented and unsupported review

All six original partial modules were inspected and their supported subsets
received actual gameplay checks:

| Module | Phase 6 result | Remaining limitation |
| --- | --- | --- |
| Criticals | Jump mode changes actual player height | No packet hook; automatic jumping alone does not establish critical-hit damage timing |
| Fullbright | Real gamma changes/restores; combined camera ownership passes | Optional night-vision effect mutation absent |
| NoHurtCam | Compiled suppression flag changes/restores | Independent directional tilt unavailable |
| Macros | Default wait repaired; module/wait sequence and disable cleanup pass | Native chat sending and arbitrary bind-step execution absent |
| Target HUD | Actual entity-derived text/bar pixels and disable cleanup pass | Target armor metadata absent |
| Screenshot Utilities | Real image and hook cleanup pass; upgraded from partial | Capture is scoped to this runtime's final WebGL2 present pattern; no HUD-composite/export packaging claim |

All 31 unsupported labels remain gated. The matrix records exact missing methods
or data rather than treating the broad capability names as sufficient analysis.
Existing velocity/jump/rotation/slot selection are narrow actions, not knockback
interception, step-height control, collision/edge queries, flight state, or
inventory/container mutation. Hotbar and armor reads do not equip armor or sort
inventory. Projection does not detach the camera. Network, stable world identity,
block lookup/light, renderer face visibility, and hit-distance event streams
remain absent.

AutoWeapon is a possible focused JavaScript follow-up: hotbar reads and selected
slot writes already exist, but `findBestWeapon` and reliable weapon ranking are
not implemented. Simple identifier-based ranking could be explored separately;
full damage/enchantment-aware ranking needs metadata. FastPlace similarly has
useItem but lacks the actual right-click delay hook. Neither was marked supported
from inspection. No broad native APIs or untested Java edits were added.

Future native compilation is required for genuinely missing compiled hooks such
as packet interception, effect mutation, directional hurt tilt, target armor,
collision/block queries, inventory mutation, detached camera, timing and network
contracts. No native build is required to use the four JavaScript repairs here.

## Conflicts and lifecycle

Prioritized actual-state combinations passed:

- BunnyHop + Sprint + Speed: disabling BunnyHop preserves sprint; final release
  returns to ground, no sprint and negligible horizontal velocity.
- TriggerBot + Aim Assist: disabling attacks preserves aim rotation; after both
  release, manually setting yaw 90 remains stable.
- AutoEat + AutoClicker: actual food use continues with clicker enabled and after
  clicker disable; final food owner releases use and restores selected slot 3.
- Zoom + Fullbright + NoHurtCam: releasing gamma preserves the other two controls;
  final release restores FOV 70, gamma 0.5 and ordinary hurt camera.

Before-world attempts on all 22 and Macros verified either eligible activation,
one-shot GUI action, or explicit safe rejection. Direct enabling in a menu does
not imply deferred intent; saved configuration restoration tests that separately.
Rapid three-cycle toggling of the 22, Macros and Screenshot Utilities returned
to the listener baseline with no owned keys or module errors.

Native-dependent HUD/render modules and changed utilities were exercised through
ClickGUI, actual inventory, programmatic blur/focus, real death/respawn, exit,
reentry, settings changes and saved configuration/page reload. World exit waits
for the adapter to process the absent snapshot; world modules resume from pending
intent on reentry. Saved Custom Text/layout and pending Chunk Borders restore
across reload. Screenshot cancellation restores the actual WebGL draw method.
Headless programmatic focus is not certification of an OS-level focus transition.
The headed captured-input overlap is additional evidence, not complete physical
pointer/camera/audio desktop QA.

## Diagnostics, counts and environment

**190 raw records are preserved**, including the intermediate macro-only runtime.
**115 records bind the final runtime: 111 pass and four earlier failures remain.**
Latest results contain **99 passing functional checks** plus one intentionally
retained pointer-lock failure diagnostic. A separate foreground-headed recovery
record resolves that diagnostic and the inventory ownership conflict passed.
The headless pointer-lock acquisition was not rerun after foregrounding was added.
This accounting does not discard failed attempts or count mocked tests as native
checks.

Earlier failures included loading/menu timing, an unselected world row, a wrong
menu-enablement expectation, retained DOM focus, pause after blur and a world-exit
assertion before the adapter tick. Food setup now waits for observed hunger.
A failed movement attempt left W held and the player fell/died in the disposable
world; keys were released, the player was respawned and teleported through real
game actions, and driver failure cleanup now releases keys and disables modules.
Long inline PTY input was replaced with short helper calls. See `defects.json`.

Mouse capture initially returned `WrongDocumentError`; synthetic and physical
right-use did not start food use. One headed attempt, bringing the tab forward
and acquiring pointer lock on the actual canvas, resolved this blocker. The
session now foregrounds its page. No native identity or state was fabricated.
There were zero captured uncaught page errors and zero module crashes. The
existing empty `minecraft:music.game` sound-event warning remains; audio is not
certified here.

Chrome 155.0.8059.80 used dedicated task profiles on the Apple M4 MacBook Air,
16 GiB RAM. GPU records confirm Apple/ANGLE Metal. One full client ran at a time.
Read-only memory-pressure queries during work reported roughly 43–52% free;
two preserved process/memory observations report 43% and 42%, with owned browser
RSS sums 2,095,923,200 and 2,136,555,520 bytes. RSS may double-count shared pages;
these are observations, not peak/profiling or performance claims. The browser
was already closed when the final continuation attempted to save/exit; all
modules and camera/input owners had been released in the final recorded state.
Process inspection then confirmed no Phase 6 Chrome remained.

No personal profile was accessed. The test world was a disposable copy of the
existing task-profile fixture; the original EPK and benchmark profiles remain
unchanged. The 30 corrupt historical PNGs remain invalid and untouched.

## Artifact and automated validation

| Identity | SHA-256 |
| --- | --- |
| Historical native HTML | `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c` |
| Historical source digest | `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f` |
| Final JavaScript-refreshed HTML, 80,978,021 bytes | `6403b3eefb970f302a9dfa07b892eb1827629d96a09dd38c852e326ac2265829` |
| Final runtime source digest | `252d2ca8b9bdde95958474e6c08894a422bb02a7452a8f03b548833d86ee9fa4` |
| Unchanged client WASM | `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d` |

`runtime.json` records byte-for-byte equality of all six embedded payloads.
The source digest changed because browser JavaScript changed; no Java source,
compiled payload or native build mode changed. Native remains the saved
fast-analysis/SIMPLE development build. Original HTML and receipt were statically
reverified before work. Large HTML, browser profiles and IndexedDB stay ignored.

`npm test`: **156 passed, zero failed**. `npm run build`: both bundles built.
`node tools/smoke.mjs`: **SMOKE OK**. The five focused regression tests pass.
New PNG structure/CRC/decompression passes. The full historical 64-check gameplay
suite, performance comparison, multiplayer, Java/TeaVM compilation and release
packaging were not run.

## Publication and Phase 7 starting point

The phase is published by normal local Git commit/push to
`meteor-client-integration`, without force push or main changes. The final
commit SHA and independent fetched-tree byte comparisons are recorded in the
ignored `input/phase6/publication-verification.json` receipt and final response;
the report cannot embed its own containing commit hash.

For Phase 7, start at that published commit; read `verification.json`, this report
and the 77-row matrix. Reproduce the refreshed HTML from the original pinned
native artifact and verify `runtime.json` before using Phase 6 evidence. Choose
the next bounded objective explicitly. Suitable remaining work is the five exact
partial contracts, a narrow AutoWeapon implementation using existing reads/slot
selection, and headed physical focus/camera/input QA. Preserve the per-artifact
verification split. Native hook work must be separated from the already compiled
binary and requires fresh gameplay evidence after compilation.

Phase 6 stops here. No multiplayer validation, new benchmark, precise/FULL build
or release packaging is included.
