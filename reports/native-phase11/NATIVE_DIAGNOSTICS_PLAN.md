# Future native diagnostics design

Design only. No Java, runtime hooks or instrumentation were implemented or compiled in Phase 11. Historical host-lobby interruption remains unresolved. Phase 9's two successful Path B attempts and Phase 10's healthy single-client control remain historical evidence, not new reproduction. Retain the host-return-to-gameplay-before-acceptance workaround.

## Confirmed boundaries and independent measurements

| Signal | Meaning / limit |
| --- | --- |
| Browser animation-frame counter and monotonic time | Page callbacks progress; does not prove native client or server execution |
| Native loop entry/exit counter | Proposed direct execution marker around the actual recovered client loop; method name must be resolved from pinned source |
| World game time | Simulation clock; can stay stationary while native loop progresses |
| Bridge started sequence | beginFrame entered; independent of successful completion |
| Bridge completed sequence | endFrame published the finished snapshot |
| Pending bridge publication sequence | Snapshot construction is in progress; absence in sampled browser observations does not exclude short builds |
| Command application entry/exit | Proposed markers after snapshot publication; completion is not implied by endFrame |
| LAN callback entry/exit/error | Proposed direct subscriber observations; absence of pageerror cannot exclude caught subscriber exceptions |
| Worker request/reply/pause transitions | Proposed bounded local correlations; worker progress is independent of page/client progress |
| Async register/complete/cancel/resume | Proposed TeaVM continuation lifecycle IDs, including rAF and timer fallback |

Confirmed existing behavior from Phase 10 inspection: bridge endFrame publishes before applyCommands; screen state changes only on screen/overlay transitions; session.paused reports menu/overlay presence rather than independent integrated-server pause. LAN subscriber catches discard errors, and pollEventsJson drains a bounded 64-event queue. PlatformInput's rAF waiter has a 50 ms timer fallback. Exact missing PlatformRuntime/LAN/worker sources prevent identification of the original affected method. WASM lacks embedded name/debug/source mapping according to prior framing analysis.

## Instrumentation contract for a future authorized build

After obtaining and verifying exact source, resolve actual call sites before editing. Bracket loop entry/exit, bridge tick entry/exit, beginFrame, each coarse snapshot stage (context/biome/camera/player/effects/inventory/entities), publication, command application, LAN acceptance dispatch, native-facing subscriber calls, worker requests/replies and actual async continuation registrations/resumes/cancellations. Record IDs linking the entry, exit and exception of each stage; use a separate native-loop counter and server heartbeat instead of overloading world time or bridge sequence. Distinguish client and worker execution realms with local numeric realm IDs.

Use a preallocated 1024-record ring per realm, fixed-size numeric records and an aggregate counter for each marker. Record monotonic timestamps, local correlation ID, enum stage, entry/exit/error code, loop sequence and bridge started/completed/pending sequences. Keep screen/paused transitions as enums. Each realm uses its own clock; handshake offsets are estimates, not exact global ordering. Reconcile causality with request/reply IDs. Maximum capture: 30 seconds per attempt with explicit stop, no per-frame console stream; sample summaries at most 4 Hz and preserve ring drop/overwrite counters. Export only on explicit capture. No synchronous network/storage writes in tick paths.

Caught exceptions get a numeric class/site category and bounded stack symbol IDs where available. Record before preserving the exact existing rethrow/catch behavior. Do not include messages that may carry invitations, account names, addresses or private transport state. Trace IDs must be locally assigned numeric IDs, never actual LAN invitations/session identifiers. No player names/chat/world names or packet contents are needed. Any raw local map remains ignored until reviewed.

Observe queues with enqueue/dequeue/overflow counters and non-consuming length metadata at their normal mutation sites. Never call pollEventsJson or another consuming API for diagnostics. Avoid adding subscribers that alter dispatch ordering, extra scheduling/yield points, retries or synthetic commands. Preserve callback return and exception semantics. Browser observers capture existing globals; they cannot substitute for direct native stage markers. No instrumentation fix is inferred from an observed correlation alone.

## Classification of one bounded future failure

| Independent observation | Investigation boundary; not a confirmed cause |
| --- | --- |
| Browser frames advance; native-loop entry stops | Before next loop entry or a lost prior continuation; inspect previous loop exit/async/worker markers |
| Loop entry advances but bridge entry does not | Between actual loop entry and bridge hook; distinguish intended no-world branch |
| Started advances, completed stalls, pending exists | Snapshot construction; inspect last coarse stage and caught-error marker |
| Completed advances, command entry has no exit | Command application or its continuation, after publication |
| Loop exits but next async resume never occurs | Registration/completion/cancel/resume correlation and rAF/timer paths |
| LAN subscriber enters without exit/error | Native-facing callback/continuation boundary; verify independent worker and loop counters |
| Worker request lacks reply | Worker scheduling/protocol boundary; distinguish expected pause and disconnected state |
| World time stalls but loop and completed advance | Simulation pause/time behavior, not evidence of stopped client execution |

Equal stationary started/completed counters alone do not locate a failure. Browser sampling may miss an entire synchronous stage. An unmatched entry may reflect capture stopping; require sufficient ring retention and explicit end markers before concluding a missing exit. Guard diagnostic ID reset/wrap and world/session lifecycle transitions.

## Future bounded validation

First validate marker overhead and normal pairing on one healthy client; compare instrumented and unchanged controls without a performance benchmark. With explicit future authorization, use fresh disposable host/guest task profiles, one Path A control (return host before acceptance) and one Path B attempt (remain through acceptance). Exercise physical Back and Escape separately with user reports, responsive host gameplay and real guest movement/open gameplay channel. Stop after a failure and preserve one bounded capture, not repeated stress attempts.

A future changed native artifact additionally requires identity-bound reconnect/forced-loss/disable-during-loss/native-identity/remote-policy/world-exit and double-shutdown cleanup checks. No module enable calls may substitute for automatic restoration assertions. Mapping function IDs requires the matching compiler-produced symbol map. This plan does not authorize Phase 12, compilation, speculative scheduling changes or missing-module work.
