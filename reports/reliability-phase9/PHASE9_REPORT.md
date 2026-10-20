# Phase 9: host-lobby diagnosis and physical QA preparation

October 20, 2026, America/Chicago. Starting commit
`e60ec2ae87622b6032f8756f9ece57fe803b1a53`, branch
`meteor-client-integration`, existing clean integration worktree. The final
containing commit and independent fetched-tree result are recorded in the final
response and ignored `input/phase9/publication-verification.json`; a report cannot
contain its own commit SHA. Original checkout/main and unrelated changes are
preserved and compared with `initial-state.json` before publication.

**The historical host-lobby stall remains unresolved.** Neither of two bounded
Phase 9 attempts reproduced it. Both kept the host in EaglerLANPeersScreen through
guest acceptance and actual world readiness; ordinary Back/Escape navigation
succeeded. There is no JavaScript runtime fix, native fix, or claim that the
workaround cured the original issue. Physical mouse/recenter and human audio
checks remain pending user operation and reporting.

## Diagnosis and limits

Read [ROOT_CAUSE.md](ROOT_CAUSE.md) for signal semantics, per-attempt evidence,
source inspection, missing sources, and the proposed next instrumentation.

The important diagnostic correction is that native `tick` is world game time.
The bridge is invoked after `Minecraft.clientTickCount++`, but publishes
`level.getGameTime()`. In a pause control, world time stayed **52461** while
sequence advanced **360→390** and browser frames advanced **181**. A stationary
world clock alone cannot establish a stopped game loop. The stationary bridge
sequence in Phase 8 still indicates absent snapshot publication at that hook;
it does not identify the last native method or prove a particular deadlock.

| Flow | Direct Phase 9 result |
| --- | --- |
| A, known-good procedure | Invite, return host to gameplay, accept guest; remote world, open gameplay `lan` channel with over 1 MB received; guest movement matches host's player entity; host identity local; normal host desktop controls |
| B1, already-running host | Stay in peers screen until guest is ready; sequence/world time each advance 31 with 186 browser frames before input; trusted Back/Escape leave the screen; host W moves afterward |
| B2, fresh host reload | Reload, reopen disposable world, publish fresh hosting, retain peers screen through acceptance/readiness; sequence +32/world time +33 with 184 browser frames; Back alone reaches EaglerDirectConnectHostScreen, then Escape reaches MultiplayerOptionsScreen |

Both B flows show actual connected gameplay, not merely discovery. Host RTC
statistics, focus, pointer lock, native screen/world/player, sequence and input
observations are in `path-b1-*.json` and `path-b2-*.json`. Guest statistics and
lifecycle state are in `checks.jsonl`. Exact endpoint values are preserved.
The guest's actual name was `YeelerYigg97Ph60`; host `YeelerYeeg3Ph131`. The
attempted guest profile-name edit is not claimed to have changed native identity.

Short 1.5-second CPU profiles show normal native WASM execution in these current
successful paths. The profile after B1 navigation has 1765 WASM nodes; the B2
lobby profile has 1885. Function indexes are not Java method mappings. These are
scheduling diagnostics, not a performance comparison. Startup/import long tasks
are retained; no acceptance stall or causative blocking operation was captured.
No uncaught game-page errors were recorded. Native logged warnings and caught
exceptions remain in console evidence, including optional-music absence, direct
address parsing messages on the guest, deliberate forced-loss behavior and the
native host-exit caller trace. Their presence during successful joins does not
establish a fatal acceptance exception.

Pinned screen and PlatformInput source bytes match the saved upstream Git blob
IDs. Back/onClose sets the parent screen; Escape is allowed. Input uses a native
trusted-Escape callback, mouse queues and TeaVM async frame pacing. Full Minecraft,
SingleplayerServerController26, PlatformRuntime and PlatformWebRTC source was not
available locally. The pinned GitHub source returned 404, and the connected
GitHub tool returned **HTTP 451, repository access blocked (dmca)**. This limits
source-level investigation of worker synchronization and async continuations.
No alternative upstream version was substituted.

The remaining hypothesis is interrupted/suspended native loop or snapshot
publication near LAN callbacks, integrated-server synchronization or a TeaVM
continuation. It is unconfirmed; no exact affected method or safe source repair
has been established. The Phase 8 failure and shutdown control remain historical
evidence, unchanged and not relabeled as new reproduction. The pre-acceptance
return-to-gameplay workaround was retested successfully.

## Desktop, multiplayer regressions and physical QA

Used the exact Phase 8 standalone in dedicated headed Chrome profiles. The host
profile is a disposable copy of prior task storage, not a personal or benchmark
profile. Guest storage is dedicated to Phase 9. Rendezvous was the existing pinned
local service on **127.0.0.1:3006**; no public game server was used.

Reused the Phase 8 LAN, lifecycle, input and session infrastructure with Phase 9
output paths, plus a bounded browser-only observer and focused action helpers.
No standalone runtime file changed. Reconnect assertions never explicitly enable
modules: the one initial setup enables Coordinates/Radar/Zoom and saves precision
2, range 64 and factor 5, then all restore assertions follow disconnect/rejoin.

| Verification | Result |
| --- | --- |
| Normal reconnects | Two passed, all three modules restored automatically with current world/player/entity references |
| Forced gameplay-channel loss/reconnect | Cleanup passed; all three automatically restored |
| Settings/listeners | Settings preserved and four-listener baseline stable, including two QA observers |
| Explicit disable while disconnected | Radar remained inactive with no pending intent; Coordinates/Zoom restored; three listeners |
| Remote restrictions | Guest remote, KillAura remains inactive; host local |
| Actual gameplay exchange | Guest displacement observed at matching host entity position |
| Disable effects | All inactive, FOV returned to 70, no owned movement/use or module errors |
| Host world exit | Guest native world/commands/input cleared |
| Final shutdown twice, both clients | After disposing QA observers, zero listeners, held/owned input, capture, active/pending modules and module errors |
| Headed desktop automation | 18/18: pointer lock, yaw/pitch movement, Escape/reacquisition, W/A/S/D, jump/sneak/sprint, wheel, inventory, chat and ClickGUI typing/control |
| Focus automation | Actual tab blur and minimize release owned input; restore works; literal hidden-document transition is not certified |

The browser-only observer records mouse deltas, pointer-lock changes and native
yaw/pitch alongside events. All recorded mouse/keyboard operations here were
automated. A concise human checklist is in [MANUAL_CHECKLIST.md](MANUAL_CHECKLIST.md).
A dedicated working session was prepared and user availability requested; no
physical results were supplied. `physical-results.json` therefore records **zero
physical checks and zero human listening checks**. No new audio capture/listening
claim is made. Phase 8 graph recordings remain historical evidence only.
Task Chrome windows were closed after the bounded investigation; the checklist
includes instructions to restart a dedicated session when the user is available.

## Artifact provenance and validation

| Identity | Unchanged Phase 8 artifact |
| --- | --- |
| HTML bytes | **80,978,184** |
| HTML SHA-256 | `9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0` |
| Runtime source digest | `d2cc8f7711a9b7a8c218232066c0d3c67135c5b4e644f3b0d098c028ac2aa7a0` |
| Compiled client WASM SHA-256 | `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d` |
| Six embedded payloads | Encoded and decoded SHA-256 values in runtime.json; all unchanged |
| Native mode | Preserved fast-analysis/SIMPLE development build |

`node tools/phase9-verify-runtime.mjs` is read-only for the HTML and historical
receipts. No regeneration was needed because runtime JavaScript did not change.
New actual-client checks bind the exact unchanged HTML/source digest. The large
HTML, profiles and storage remain ignored and excluded from Git.

| Automated validation | Result |
| --- | --- |
| `npm test` | **162 passed, zero failed** |
| Focused Phase 8 lifecycle/safety suite | **4/4**, included in the full 162 |
| `npm run build` | Both browser bundles passed |
| `node tools/browser-check.mjs http://127.0.0.1:3006/harness/` | **20/20**, dedicated Chrome executable supplied |
| `node tools/smoke.mjs` | **SMOKE OK** |
| All Phase 9 driver syntax checks | Passed |
| Actual-client raw assertions | **50 passing observations**, zero failed assertion records; not 50 unique features |
| New PNG integrity | **14** pass structure, chunk CRC and decompressed-stream length |
| Historical preservation | Every initially hashed Phase 6/7/8 report file unchanged; prior tracked harness screenshots restored byte-for-byte |

Failed attempts are retained separately from assertion totals. The initial
non-PTY session closed stdin and cleaned up. Saved-world entry timed out at
SelectWorldScreen; settled row selection then Play succeeded, and the Phase 9
helper now includes that delay. A guest already paused by focus changes caused
a blind Escape disconnect attempt to resume instead of opening PauseScreen; the
driver now checks current screen first. The pre-acceptance host probe from that
failed setup is explicitly retained as `pre-path-b-driver-probe`, excluded from
Path B certification. An initial hash-verifier syntax typo, sandbox restrictions,
missing gh CLI and failed pinned-source access are recorded in driver diagnostics.
The first connection predicate inherited a broad data-channel test; saved
statistics already showed gameplay bytes, and later assertions require `label=lan`.
No failed driver attempt is deleted or counted as successful runtime behavior.

There were **48** two-client memory samples, **37–49%** macOS free percentage,
and a largest sampled owned-browser RSS sum of **4,587,765,760 bytes**. RSS can
double-count shared pages; this is not a continuous peak. The below-15% guard did
not trip. Final free percentage was 61%. No owned Chrome main process remained;
the loopback server shut down gracefully. Unrelated Chrome processes were not
terminated. No native build, missing-module work, FULL optimization, matched
benchmark, release compilation or packaging ran.

## Publication and precise Phase 10 starting instructions

The original local commit d85a48d was withheld from publication. A subsequent
user-authorized review sanitized session invitations and transport identifiers;
see PUBLICATION_REVIEW.md and PUBLICATION_REVIEW.json. The publication commit
has a different SHA and excludes d85a48d from its ancestry. All original test
outcomes and screenshot bytes remain unchanged.

Publish this report, QA drivers and valid new diagnostic artifacts through normal
local Git CLI on meteor-client-integration; no force push or main changes.
`tools/phase9-verify-publication.py` independently fetches into a temporary
repository and compares every published blob, including all changed PNG bytes,
to local files. The final commit and receipt are recorded after push.

1. Start at the published Phase 9 commit reported in the final response. Read this
   report, ROOT_CAUSE.md, verification.json, runtime.json and MANUAL_CHECKLIST.md.
2. Reverify `input/phase8/native-fixed.html` with phase9-verify-runtime.mjs. Use a
   new dedicated task profile copied only from prior task storage, and the local
   rendezvous. Never use a personal or benchmark profile.
3. Obtain actual physical continuous-mouse/recenter, capture/focus/UI and listening
   results first; retain pending status until the user performs and reports them.
4. If separately continuing the lobby investigation, compare a fresh-host Path B
   with Path A and record exact sequence endpoints, screen, RTC gameplay bytes,
   observer events and exceptions. Current Phase 9 B1/B2 are successful controls,
   not proof that the historical intermittent stall was repaired.
5. Before proposing native edits, obtain the complete lawful pinned local source
   and source mapping. Use ROOT_CAUSE.md's instrumentation proposal to locate the
   stopped continuation/hook. Native compilation requires authorization in the
   next phase; none was performed here. Keep the known-good workaround and the
   reconnect/identity/cleanup guards. Do not infer permission for missing modules,
   FULL optimization, performance reruns, release compilation or final packaging.

Phase 9 stops at this published handoff.
