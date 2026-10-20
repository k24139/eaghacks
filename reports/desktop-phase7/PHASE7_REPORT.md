# Phase 7: desktop, audio and private multiplayer evaluation

October 20, 2026, America/Chicago. Starting commit:
`8ff1737b4f0147a96d3ced6cd9388ed7d0910447`, branch `meteor-client-integration`.
Work stayed in the existing integration worktree. The original checkout remains
on `main` at `1ccda035bc03a3fac460fc3fe484c383a65a2d59`, with its unrelated changes
preserved. `initial-state.json` records the starting state and provenance.

**Published evaluation with explicit limitations, not certification of physical
hardware, human listening, or every reconnect UI path.** The confirmed keybind
shutdown defect is repaired and verified in the actual client. Desktop automation,
WebAudio recording, local WebRTC and real private gameplay succeeded. Physical
recenter behavior and the host lobby navigation issue remain unresolved evidence
gaps. The combined reconnect/module-restoration assertion did not complete and
is not labeled passed.

The final containing commit is recorded by the final response and the independent
publication receipt under ignored `input/phase7/publication-verification.json`;
a report cannot contain its own commit SHA. Normal local Git CLI publication,
no force push, no changes to main. No Java/TeaVM build, FULL optimization,
matched performance benchmark, production release or packaging was started.
Phase 6 implementation, reports and runtime evidence remain preserved.

## Artifact identity

Before gameplay, the Phase 6 HTML, source digest, and all six payloads matched.
The refreshed Phase 7 standalone changes only browser JavaScript.

| Identity | Value |
| --- | --- |
| Phase 6 HTML | 80,978,021 bytes; `6403b3eefb970f302a9dfa07b892eb1827629d96a09dd38c852e326ac2265829` |
| Phase 6 source digest | `252d2ca8b9bdde95958474e6c08894a422bb02a7452a8f03b548833d86ee9fa4` |
| Phase 7 HTML | **80,978,153 bytes**; `df14bf44e1de2ea58671fa4250234dea737fcc47b18e1f718c4d4149932bd5ea` |
| Phase 7 source digest | `86b8b96670de55cb277e6e281d0a5d2b7bc4d421d20b17f39b9ca1fdc1a02623` |
| Unchanged native client WASM | `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d` |
| Native build mode | Existing fast-analysis/SIMPLE development build |

`runtime.json` verifies all six encoded payload hashes against Phase 6. Assets,
sounds, client, decoder, mesh and server worker payloads remain byte-identical.
`tools/phase7-runtime.mjs` verifies the refreshed artifact without modifying Phase 6
receipts. Large HTML and task profiles remain ignored. The source digest does
not include QA harness HTML or report/driver files; the favicon change does not
change the standalone hash.

## Desktop input and pointer lock

All results below are **headed Google Chrome automation**, including Chrome/CDP
input events marked trusted by the browser. None are manual hardware tests.
Chrome was 155.0.8059.80 on the Apple M4 / 16 GiB Mac, using dedicated profiles.
`environment.json` records the actual browser and Apple/ANGLE Metal backend.

The final repaired standalone passed **18/18 focused desktop checks**:

| Area | Actual evidence |
| --- | --- |
| Pointer lock | Actual game canvas acquires lock on click; Escape releases it; return and click reacquire it |
| Camera | Stepped horizontal input changes native yaw with stable pitch; vertical input changes pitch |
| Keyboard | W/A/S/D each displace the actual player; Space increases Y; Shift sets sneaking; Ctrl+W sets sprinting |
| Hotbar | Wheel changes the native selected slot |
| Inventory/chat | Inventory opens/closes; actual ChatScreen accepts typed text and the real chat log contains it |
| GUI ownership | Right Shift opens ClickGUI, typed `wasd phase7` reaches Search while player position stays fixed; closing it restores actual W movement |

A separate final-runtime left-click attack reduced the health of a real local
pig. Right-click placement and left-click breaking produced nonzero recorded
sound effects on the disposable platform. The placement marker command initially
checked the wrong face coordinate, so that marker is not treated as block-state
proof; use/interaction audio and actual native combat evidence are separate.

The first horizontal probe recorded no yaw change. A stepped diagnostic captured
four real browser `movementX=5` events and changed native yaw; the complete final
pass also succeeded. A separate synthetic `movementX=12` followed by a zero-delta
recenter control did **not** change yaw. That failed probe is retained. Continuous
physical mouse motion, physical direction correctness and real OS/remote-desktop
recenter sequences therefore remain unverified. No native mouse code was changed
from this evidence alone. See `MANUAL_CHECKLIST.md`.

## Focus, lifecycle and cleanup

Initial tab/minimize assertions expected `document.hidden` while Playwright
emulated foreground focus; those assertions failed. With focus emulation disabled,
the page received actual blur and reported `document.hasFocus() === false` during
tab switching and minimizing. Owned movement keys/buttons were empty. Restoring
the browser returned actual gameplay control. The final runtime repeated the
blur/minimize release checks successfully. `visibilityState` remained `visible`,
so this does not certify a true hidden-document transition.

ClickGUI, inventory, chat and pause input gating were exercised. Three GUI cycles
returned to the event-listener baseline with no owned keys/use state or module
errors. World exit on the repaired artifact emitted one unload, removed native
state and commands, and retained pending Coordinates/Radar/Zoom intent. Reentry
emitted one load and restored those modules without errors. Reload loaded the
repaired standalone and retained task storage; exhaustive configuration persistence
was not repeated beyond the already preserved Phase 6 coverage.

Clicking outside the full-viewport game canvas was not independently certified;
OS blur and GUI ownership are the observed paths. Literal hidden-tab behavior and
physical minimize/restore remain on the manual checklist.

**Confirmed defect:** `KeybindManager.dispose()` detached listeners without
clearing held keys or canceling a pending bind capture. Actual-client reproduction
held W, began capture, and called shutdown twice: `after=[KeyW]`, `capturing=true`,
`cancels=0`, despite adapter input ownership and bus listeners being gone.

The two-line runtime repair makes disposal idempotent and invokes the existing
blur cleanup before detaching. The focused test failed before the repair and
passes afterward. Actual repaired-client shutdown leaves `after=[]`,
`capturing=false`, `cancels=1`, no owned keys and zero bus listeners. This fixes
retained framework state; the evidence does not claim the original defect caused
continuous native movement after shutdown. `regression-before.txt` preserves the
failure and `tests/phase7-input.test.mjs` also protects blur cancellation.

## Audio

The empty `minecraft:music.game` warning is explained by the pinned upstream
resource design. The base sound EPK has **4,779 CRC-verified files and zero
music/record files**. `sounds.json` lists the optional music tracks. Pinned
`SoundManager.validateSoundResource` deliberately excludes missing browser
music/record resources and logs that the optional music pack is absent.
`SoundEngine` later warns when an empty weighted event is requested. Menu music
has the same condition. This is expected optional-pack absence, not evidence of
broken base sound mapping or failed browser unlock. No music pack was added and
no valid sound payload was replaced. Exact upstream file hashes are recorded in
`upstream-sources.json`; the files were checked against the pinned Git tree.

A QA-only script tapped the actual game's master WebAudio node, retaining its
hardware-destination connection and adding a MediaStreamDestination/MediaRecorder
branch. It is **not part of the standalone runtime**. AudioContext was suspended
before interaction and running after a menu click. This records actual graph
samples before the hardware output, not speaker/headphone sound or human listening.

| Check | Result |
| --- | --- |
| Menu interaction | UI click recording decodes to nonzero PCM; optional background music absent |
| Gameplay blocks | Successful grounded placement/breaking captures decode with peak amplitudes about 0.425 / 0.393 |
| Entity sound | Real `playsound minecraft:entity.pig.ambient` through the game yields nonzero PCM |
| Inventory | Open/close recorded a short nonzero tail; no claim of a dedicated inventory-open sound or full item-drag sound coverage |
| Volume | UI master-volume minimum produces no source starts and zero captured peak; restoring 100% produces nonzero sound |
| Focus restoration | Nonzero game audio after actual blur/restore |
| World reentry | Nonzero game audio after repaired-runtime exit/reentry |

Nine WebM recordings decode successfully to nonzero PCM. Two silent intervals
contain MediaRecorder headers with no audio frames, explicitly labeled as such.
`audio-recording-integrity.json` contains file hashes and decoded sample metrics;
`audio-captures.jsonl` retains graph measurements and failed attempts. An early
mute assertion incorrectly required graph gain zero: the game instead suppresses
source playback while its master graph gain remains 1. The silence observation
is valid; the original failed assertion is retained rather than rewritten.

Early block probes missed the intended block and removed player support; subsequent
probes ran while falling. Only the disposable profile world was repaired with a
stone platform and a grounded/Y gate before successful tests. The benchmark EPK
and benchmark profiles were not modified. The initial recordings/metrics are not
retroactively labeled successful block tests.

No transport-level resource request failures were captured by the installed
requestfailed listener. This is not a complete HTTP-status audit of embedded
resources. The harness's implicit favicon HTTP 404 was independently diagnosed
and repaired with an explicit empty data favicon. The final harness has no
console errors. Native optional-music and forced-disconnect warnings remain
visible in preserved logs and are not hidden or mistaken for uncaught exceptions.

## Local WebRTC and actual private gameplay

Transport preflight succeeded in **two isolated headed Chrome profiles**. It used
loopback-hosted pages, no external STUN/TURN, driver-only local SDP/candidate
exchange, actual ICE candidates, connected peer states and bidirectional messages
over an open data channel. `webrtc.json` includes candidate, transport and message
statistics. The first sandbox launch was denied by macOS process-bootstrap
restrictions; running the explicitly authorized task browser outside that sandbox
resolved the launch restriction. It was not recorded as a transport failure.

Only after preflight passed did two full game clients run. The unchanged pinned
upstream `lan-discovery.js` and `lan-server.mjs` provided loopback rendezvous on
127.0.0.1:3006; no public game server was contacted. Profiles and storage stayed
local. Requested guest profile-name editing did not persist, so gameplay checks
used its actual generated name `YeeishYeeish6184` and host `YeelerYeeg3Ph131`.

| Area | Result / evidence |
| --- | --- |
| Host and join | Native host identifies `local`; guest identifies `remote`, with actual world/player snapshots |
| Gameplay channel | First `label=lan` channel was open, receiving 1,028,544 bytes / 668 messages at the saved observation; discovery traffic is recorded separately |
| Both players | Both clients' native entity snapshots contain the other player |
| Position exchange | Guest W movement displaces the actual player and the host observes the corresponding entity position |
| Entity updates | Host-spawned pig appears in guest snapshot |
| Inventory | Host grant reaches guest inventory; guest hotbar selection changes to slot 3 |
| Chat | Guest text appears in actual host chat log |
| Representative modules | Remote Coordinates, Radar and Zoom activate with real inventory/entity/camera reads; no module crashes |
| Policy | Remote KillAura enable is rejected; multiplayer combat opt-in stays false; unknown identity remains conservatively remote in existing tests |
| Clean disconnect | Host removes the guest; guest loses native world/commands/input; one unload and pending module intent recorded |
| Reconnection | Second host login and remote world observed; second gameplay channel open with **456,397 bytes / 13 received messages** immediately before forced loss |
| Forced connection loss | Closing only that task gameplay channel yields `DisconnectedScreen` / code 1006; native state/commands removed, no keys/use ownership, no module errors, pending Coordinates/Radar/Zoom |

**Reconnect limitation:** the combined reconnect/restoration procedure did not
complete its assertion. A disconnected guest returns to JoinMultiplayerScreen;
returning Back to TitleScreen was needed before another invitation was handled.
After the second join, the host remained in EaglerLANPeersScreen. Automated
Escape, Back clicks, a longer press and a synthetic canvas click failed to leave
that menu. Canvas hit testing, no pointer lock, no GUI/capture owner, correct
1280×800 canvas and focused page were recorded. No physical menu action was
available to distinguish a native issue from the automation interface. Source
inspection shows a normal Back/onClose implementation; no speculative native
repair or Java rebuild was attempted. Screenshots and console/state diagnostics
are preserved. Reload and explicit foreground focus emulation allowed later
single-client world selection and the full desktop pass.

The second connection and forced-loss cleanup are real. **Automatic restoration
of prior module intent after remote reconnect remains unasserted**, because the
loss test explicitly enabled the representative modules before closing its
channel. Do not infer restoration from that enable or from peer discovery.
Physical lobby navigation and the combined reconnect assertion are Phase 8
prerequisites; no blanket multiplayer certification is made.

## Resources, diagnostics and validation

One full game client ran except during the bounded private session. No native
compilation ran beside browsers. Forty-five two-client observations recorded
macOS free percentages of **38–52%** and a largest sampled owned-browser RSS sum
of **4,139,220,992 bytes (3.85 GiB)**. RSS may double-count shared pages; these are
samples, not a continuous memory peak. The guard would close the guest below 15%
reported free. `memory.jsonl` retains task process IDs/RSS and host pressure.
Final browser metadata and cleanup report are separate. All Phase 7 Chrome
profile main processes are closed; unrelated Chrome processes were not terminated.

`checks.jsonl` preserves **77 actual-client records: 67 passing observations and
10 failed probes/assertions**, including the pre-fix reproduction and synthetic
recenter failure. Forty-one records bind the final standalone. Counts are raw,
not a claim of 77 independent unique features or all passing latest assertions.
The final desktop helper's 18 checks passed. The 10 failures and later resolutions
or limitations are described above and in `defects.json`.

One captured uncaught page error was caused by an early QA wait predicate using
an undeclared startup global (`ReferenceError: __eaghacksScreenState is not defined`).
The driver now reads optional `window` properties. This error is retained in
`page-errors.txt`; zero total page errors is not claimed. No module crashes were
observed. Command timeouts, selector ambiguity and interactive ESM/PTY issues are
retained in the driver record rather than counted as successful game checks.

| Final validation | Result |
| --- | --- |
| `npm test` | **158 passed, zero failed** |
| Focused input regressions | **2/2**, with failing-before evidence |
| `npm run build` | Both browser bundles passed |
| `node tools/smoke.mjs` | **SMOKE OK** |
| Browser harness | **20/20**, after diagnosing/removing implicit favicon 404; prior 19/20 logs retained |
| New evidence images | **16 PNGs** pass structure, CRC and decompressed-stream length checks |
| Audio files | Nine decoded nonzero recordings; two explicitly silent/header-only intervals |
| Final artifact | HTML/source hashes recorded; all six payloads unchanged |

The browser harness's short built-in FPS sanity check is synthetic and is not a
repeat of the matched Phase 5 benchmark. Generated harness screenshots were moved
under Phase 7 diagnostics; the previously tracked artifact images were restored
byte-for-byte. The **30 damaged historical PNGs remain INVALID**, unchanged and
excluded from evidence. Phase 6 reports, per-artifact module labels and counts
remain unchanged; this phase does not upgrade the full 77-module catalogue.

## Phase 8 exact next step

Start from the published integration commit containing this report. Read
`runtime.json`, `checks.jsonl`, this report and `MANUAL_CHECKLIST.md`. Load the exact
Phase 7 standalone in a dedicated headed Chrome profile with a disposable world.
First perform physical continuous mouse/capture/recenter and human listening
checks, then reproduce host lobby Back/Escape after private reconnect and assert
pending HUD/Radar/Zoom restoration without explicitly enabling them. Preserve
actual channel/gameplay evidence and distinguish physical actions from automation.
Do not begin native hooks, FULL optimization or release packaging as an inferred
continuation of this phase. Phase 7 stops at this published handoff.
