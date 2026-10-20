# Phase 8: desktop and multiplayer reliability

October 20, 2026, America/Chicago. Started at
`f57ffc361d3e873677b8253dba3fbea1dadfac4a` on `meteor-client-integration`, in the
existing integration worktree. Runtime source revision:
`e34a8ab6b6fd9bb314a25aa9395c1f2259778ebe`. The containing documentation commit
and independent fetched-tree receipt are recorded in the final response and
ignored `input/phase8/publication-verification.json`; a document cannot contain
its own commit SHA.

**Automatic remote module restoration is directly verified.** Two consecutive
normal reconnects and a reconnect after forced gameplay-channel loss restored
Coordinates, Radar and Zoom without any module-enable call during reconnect.
A native identity safety defect was repaired. The host lobby failure was
reproduced and bounded, with a working driver procedure; its native cause and
physical navigation remain unresolved. Physical mouse/recenter and human
listening checks are prepared and awaiting user verification.

The original main checkout remains at
`1ccda035bc03a3fac460fc3fe484c383a65a2d59`, with its unrelated status unchanged.
Every initially hashed Phase 6/7 report file is unchanged. No native Java build,
Java source patch, FULL optimization, Phase 5 comparison, public multiplayer,
production release or packaging ran. Personal Chrome profiles were not accessed.

## Artifact provenance

| Item | Value |
| --- | --- |
| Starting Phase 7 HTML | 80,978,153 bytes; `df14bf44e1de2ea58671fa4250234dea737fcc47b18e1f718c4d4149932bd5ea` |
| Starting source digest | `86b8b96670de55cb277e6e281d0a5d2b7bc4d421d20b17f39b9ca1fdc1a02623` |
| Final Phase 8 HTML | **80,978,184 bytes**; `9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0` |
| Final source digest | `d2cc8f7711a9b7a8c218232066c0d3c67135c5b4e644f3b0d098c028ac2aa7a0` |
| Local final artifact | `input/phase8/native-fixed.html` (ignored, as in prior phases) |
| Native build | Existing fast-analysis/SIMPLE development payloads |

The JavaScript injection was refreshed from the preserved Phase 7 standalone.
`tools/phase8-runtime.mjs` checks the HTML, source digest and all six encoded
payload hashes against Phase 6 without writing Phase 6/7 receipts. Decoder,
client, mesh, server worker, assets and sounds are unchanged; their complete
hashes are in `runtime.json`. The unchanged native client WASM hash remains
`aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d`.
Reports, QA tools and QA audio instrumentation are outside the runtime source
digest. The large HTML and Chrome profile contents are not published to Git.

The first raw module-setup observation accidentally used the older guest URL
while its recorder read the new runtime receipt. It is excluded from final
runtime certification. Inspection found the URL, the guest was explicitly
reloaded from `native-fixed.html`, and the final setup and all claimed reconnect
cycles followed that reload. `evidence-corrections.json` retains the correction;
the original record was not rewritten. The final client also exposed the
repaired `isRemote()` implementation during the metadata-fault check.

## Confirmed repair and regressions

`EaglercraftBrowserAdapter.isRemote()` previously fell through to the legacy
`minecraftServer` value when a native snapshot had missing or unknown identity.
An unknown native kind plus stale legacy `singleplayer` was therefore classified
local. This reproduced in the focused regression and in a controlled metadata
fault on the actual old client; the temporary values were restored immediately.
It was not a naturally observed malicious/public-server session.

The small repair makes a present native snapshot require explicit `kind=local`.
Missing or unknown native metadata stays remote. Clients without a native
snapshot retain their existing explicit legacy fallback. The new focused suite
failed **3 passed / 1 failed before**, then passed **4/4 after**. Tests cover two
restoration cycles, settings and listeners, explicit disable while disconnected,
persisted combat intent on a ready remote world, and unknown native identity.
The final actual client returned remote for the same controlled fault.

The actual ready remote guest also attempted persisted KillAura configuration.
It remained inactive, multiplayer combat opt-in remained false, and its reason
was specifically `blocked on remote sessions`. An earlier policy observation
occurred while a menu owned the world; the later ready-world check establishes
the remote-policy result independently of menu gating. Host identity was local;
guest identity stayed remote through all reported joins.

## Host lobby navigation

The old artifact reproduced the host stuck in `EaglerLANPeersScreen` after guest
acceptance. Trusted Escape keydown/up reached BODY; trusted Back-button
mousedown/up/click reached CANVAS at the displayed button position (874,718).
The page was focused, pointer lock absent, and GUI/capture ownership absent.
`lobby-reproduction.json`, `lobby-escape.png` and `lobby-after-shutdown.json`
preserve the observations.

The limitation persisted after Meteor shutdown. A 1.2-second observation advanced
72 browser animation frames while native tick **39040** and bridge sequence
**1557** stayed unchanged. Explicit foreground focus emulation, an active page
lifecycle and a synthetic focus notification did not restore that path. These
facts narrow the failure beyond a Meteor-owned GUI/key capture and show that
browser animation was running. They do **not** identify a Java onClose defect,
prove OS hardware input behavior, or establish the native stall's root cause.
No speculative native patch was made. The preserved pinned screen source has
ordinary Back/onClose behavior.

A working procedure was demonstrated on the final artifact: send the native
invitation, return the host to gameplay **before** guest acceptance, then keep
the guest foreground through acceptance and world readiness. This procedure
uses ordinary native menus and real gameplay channels; it changes no game
state or restoration flag. `tools/phase8-lan.mjs` implements it. Foreground
switching during guest startup could otherwise leave the guest on PauseScreen,
which must be resumed before asserting module effects.

A separate confirmed driver error selected the first Invite row even when
retained failed discovery peers preceded the guest. The driver now locates the
open guest peer by its actual discovery ID. The old rows and screenshots are
retained. Back/Escape succeeded in the pre-acceptance path used for the final
cycles. Physical post-acceptance lobby navigation and the exact native cause
remain follow-up work; the working procedure is not a blanket lobby fix.

## Actual remote restoration and cleanup

Both clients used dedicated headed Chrome profiles and disposable task storage.
The host profile was copied from the prior task profile; benchmark source EPKs
and benchmark profiles were not modified. The pinned local discovery script and
server provided rendezvous only at `127.0.0.1:3006`. Gameplay used actual WebRTC
`lan` channels. Connection evidence records open channel states and received
bytes separately from discovery traffic. The guest's actual native name was
`YeelerYeeish3726`, and host `YeelerYeeg3Ph131`; an attempted profile field edit
is not treated as a successfully changed identity.

Setup enabled the three modules once and saved nondefault settings: Coordinates
precision **2**, Radar range **64**, Zoom factor **5**. Expected base FOV was 70
and zoom target 14. Lifecycle observers were installed before disconnect.

| Stage | Direct result |
| --- | --- |
| Initial final-runtime remote world | Coordinates read actual XYZ; Radar had current host/mob entities; Zoom changed actual FOV; all three active |
| Normal disconnect 1 | Native world/player/commands cleared; no owned keys/use; runtime effects stopped; all three pending |
| Normal reconnect 1 | No enable calls; all three active, FOV about 14.207 during interpolation; one unload/load pair |
| Normal disconnect/reconnect 2 | No enable calls; all three active; exactly two unload/load pairs in cumulative observer history |
| Forced loss | Closed the actual open gameplay connection with received bytes; DisconnectedScreen/code 1006; cleared native state, commands and owned input; intent pending |
| Forced-loss reconnect | No enable calls; all three restored; exactly three unload/load pairs |
| Disable during reconnect | Disconnected, explicitly disabled Radar, joined again; Coordinates/Zoom restored and Radar stayed inactive with no pending intent |
| Disable restored effects | All three inactive; actual FOV returned to **70**; no owned input/module errors |
| Host world exit | Guest disconnected; native state/commands/input cleared and the separately prepared module intent stayed pending |
| Client shutdown | Final observer-free shutdown twice left zero listeners, keys, owned input, capture, active/pending modules or module errors |

`before-disconnect-1.json`, `after-reconnect-1.json`, `after-reconnect-2.json`, raw
checks and screenshots contain the actual state and connection statistics.
The restore assertions compare new player/state references against saved old
session references. Coordinates uses the current player, Radar candidates are
members of the current entity array, and the adapter reads the current world.
Diagnostic old references are intentionally retained by QA for comparison;
this is not an exhaustive heap/retained-object audit.

All three restore runs retained settings and the **4-listener** active baseline
(including the two QA lifecycle observers). Radar removal returned it to 3.
No module crashes were observed. Save operations and configuration snapshots
were recorded; the unit tests also protect persisted intent/cancellation. This
phase did not repeat every Phase 6 configuration/profile permutation.

## Desktop and audio

The final standalone passed **18/18** headed desktop checks: canvas pointer-lock
acquisition, horizontal and vertical camera motion, Escape release/reacquisition,
W/A/S/D, jump, sneak, sprint, wheel selection, inventory, typed chat, ClickGUI
Search ownership and restored movement. These are automated events, including
browser-trusted events, with native position/camera observations. They are not
physical hardware actions. Actual tab blur and minimize released owned input;
visibility stayed visible, so a hidden-document transition is not certified.

Additional gated tests recorded a real pig's health decrease from left-click,
and right-click placement/left-click breaking audio on the grounded disposable
platform. Earlier attack probes lacked sufficient capture/target/line-of-sight
gates; a follow-up explicitly recorded absent lock and target. A placement probe
still held a stick and was silent. Those failures remain raw evidence; only the
later properly prepared checks are claimed passed. A QA-only explicit lock
request diagnostic also succeeded; it is not included in the standalone.

Continuous physical movement, physical direction correctness and OS recenter
behavior remain **awaiting user verification**. The failed Phase 7 synthetic
zero-delta probe remains historical failed evidence. This phase does not repair
or certify native recenter behavior from synthetic deltas. The new manual
checklist covers physical input, focus transitions and ClickGUI.

The unchanged QA audio tee recorded the real game's graph before the hardware
destination. Four new WebM recordings decode to nonzero PCM: menu click,
focus-restored pig sound, valid placement and breaking. One invalid placement
attempt is explicitly a silent/header-only interval. File hashes and decoded
metrics are in `audio-recording-integrity.json`. This is final-artifact graph
output, not speaker/headphone playback or human listening. The manual checklist
covers menu, blocks, entity, master volume and focus restoration. No music pack
was added; optional missing music remains understood.

## Evidence limits and validation

`checks.jsonl` retains **53 raw observations: 48 pass, 5 fail**. Its first record
is the explicitly corrected old-artifact binding described above. These counts
are observations, not unique features or a claim that every probe passed.

The five failed records are: a disconnected sample containing transient
`AltLeft` in the physical key tracker (later empty, with no owned input throughout);
a shutdown expectation of zero total listeners while the two external QA
observers remained; two ungated attack probes; and placement with a stick.
`defects.json` explains each follow-up. The helper now retains disposable QA
subscriptions; an observer-free actual shutdown independently passed with zero
listeners. The transient modifier's origin was not established and is not
claimed to be a hardware test or a proven runtime defect.

Initial saved-world selection timing, old helper imports/paths, menu focus,
command timeouts, a post-shutdown read of the removed global and a PTY input
line exceeding the terminal buffer were driver errors. Commands were moved to
short helper calls where needed. `driver-commands.txt` (trailing whitespace normalized; exact command lines are
in `driver-commands.json`), host/guest console
records and correction files preserve the diagnostic context. Script-evaluation
errors returned to the driver are distinct from uncaught pageerror events;
zero total diagnostic errors is not claimed. Optional-music and deliberate
connection-loss warnings remain visible in console evidence.

| Required validation | Result |
| --- | --- |
| `npm test` | **162 passed, 0 failed** |
| New lifecycle/safety tests | **4/4**; before-fix failure retained |
| `npm run build` | Both browser bundles passed |
| `node tools/browser-check.mjs` | **20/20**, loopback harness URL supplied |
| `node tools/smoke.mjs` | **SMOKE OK** |
| Final headed desktop helper | **18/18** |
| Native payload hashes | All six unchanged |
| New evidence PNG integrity | **13** pass structure, CRC and decompressed stream length |
| Audio integrity | Four decoded nonzero captures, one silent/header-only interval |

The harness's short synthetic FPS sanity check is not the Phase 5 matched
performance comparison. Existing tracked harness PNGs were restored byte-for-byte;
new screenshots are under `diagnostics/reliability-phase8`. The 30 corrupt
historical PNGs remain unchanged, invalid and unused.

Eighty-three bounded two-client memory samples reported **35–59%** macOS free
percentage and a largest owned-browser RSS sum of **4,826,644,480 bytes**
(about 4.50 GiB). Shared pages can be double-counted; this is not a continuous
peak. The below-15% guest guard did not trip. All dedicated Phase 8 Chrome main
processes are closed, the loopback server reported graceful shutdown, and
unrelated browsers were not terminated.

## Publication and Phase 9 handoff

Publication uses normal local Git CLI commits/push on `meteor-client-integration`,
with no force push or changes to main. Independent verification fetches the
published branch into a separate temporary repository, checks its commit/tree
and compares every published blob's bytes and SHA-256 to the integration tree.
The final response and ignored publication receipt record the containing commit
and outcome. Profiles, oversized HTML and scratch storage stay ignored.

Start Phase 9 from that published containing commit. Read this report,
`verification.json`, `runtime.json`, `defects.json`, the raw reconnect records and
`MANUAL_CHECKLIST.md`. First obtain physical continuous-mouse/recenter and human
listening results on the exact Phase 8 artifact, then test physical Back/Escape
in the host peers screen after acceptance. Preserve the native bridge/frame/input
observations and the demonstrated pre-acceptance navigation procedure. Diagnose
the native stall's cause before proposing a Java screen patch. Reconnect
restoration now has direct evidence and regressions; keep those guards during
future work. Phase 9 planning is not authorization here for native hooks, a Java
rebuild, FULL optimization, performance comparison or release packaging.

Phase 8 stops at this published handoff, with the physical and host-navigation
limitations above explicitly open.
