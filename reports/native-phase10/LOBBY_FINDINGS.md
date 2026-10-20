# Phase 10 host-lobby diagnostic findings

The historical failure is unresolved. This phase did not run another two-client
reproduction because no missing native implementation was recovered and the two
Phase 9 Path B controls already succeeded. No runtime or native source changed.
The existing pre-acceptance host return-to-gameplay workaround remains the
previously verified procedure, not a fix.

## Signals and boundaries established from available source

| Signal/boundary | What it establishes | What it cannot establish |
| --- | --- | --- |
| Browser requestAnimationFrame count | The observed page is receiving browser animation callbacks | Java client or server tick progression |
| Snapshot tick | Client world's game time from level.getGameTime | Minecraft.clientTickCount or integrated-server tick execution |
| Snapshot session.paused | Native menu/overlay is present, from the bridge's publishContext argument | Whether the integrated server is paused or progressing |
| Screen state object/name | Last screen reported by the bridge; object is replaced only on a screen/overlay change | A per-tick heartbeat; an unchanged screen is normal |
| Global __eaghacksNativeSequence | beginFrame has started another snapshot | Completion of all player/biome/effect/inventory/entity reads |
| __eaghacksNativeNextState | An in-progress snapshot exists; its sequence can be compared with completed state | Which native query/continuation is currently pending |
| __eaghacksNativeState.bridge.sequence | endFrame has published a complete snapshot | Progress after publication through applyCommands and the rest of Minecraft's loop |
| WebRTC open/bytes | Transport state and messages; require actual gameplay label lan | Client simulation progression merely from discovery traffic |
| Independent server-worker observations | Worker callbacks/CPU can progress separately from the page | Which Java worker message handler is blocked without source/mapping |

EaglerHacksNativeBridge.tick publishes screen state first. With no player/level
it clears native state/commands and resets the sequence. Otherwise beginFrame
increments the started sequence before biome/camera/player/effect/inventory/entity
reads. Entity traversal is bounded to 512 snapshots. endFrame swaps in the new
snapshot and deletes the pending one; applyCommands runs afterward. These exact
existing methods establish a narrower diagnostic partition without a Java edit.

If a future failure has advancing started sequence but stationary completed
sequence and a pending snapshot, investigate the reads/build stage between
beginFrame/endFrame, including native caught exceptions. If both sequences stop
with no pending state, investigate failure after the previous completion or before
the next beginFrame, including command application and loop/continuation/LAN
processing. Equal stationary sequences do not identify a particular method.
Repeated browser samples occur between synchronous tasks, so a healthy snapshot
build can begin and finish entirely between samples; no observed pending state is
expected and does not prove those intermediate methods were never called.

## Exception and observation gaps

The pinned lan-discovery.js handles ordinary messages in handleMessage, queues
them through emitEvent, and then invokes subscribers. Both event and message
subscriber calls have catches that discard subscriber errors. Thus absence of
an uncaught pageerror does not rule out an exception in a native-facing
subscriber. This is an observation gap, not a confirmed cause: LANInvites and
ClientPlatformSingleplayer are missing, so the exact native subscription/polling
path and any effect on client continuations cannot be traced.

The event queue is bounded to 64, with oldest events removed when full.
pollEventsJson drains that queue. A diagnostic observer must not call it merely
to inspect pending events, because that could consume invitations/acceptance
messages intended for the native client. No queue-draining diagnostic was used.
Queue overflow or a swallowed callback error was not observed as the historical
stall's cause, and neither is proposed as a speculative fix.

PlatformInput's asyncRequestAnimationFrame waiter has a 50 ms timeout fallback;
completeRequestAnimationFrame clears the stored waiter before completing it and
prearms the next callback. This makes 'rAF did not fire' alone an incomplete
explanation; timer fallback/continuation behavior must also be checked. Full
PlatformRuntime Java remains missing, so swap-delay and immediate-continuation
paths cannot be fully resolved.

The exact verified HTML contains a 13,984-byte TeaVM JS runtime literal, SHA-256
`1e80092312d7bfe6efa74f8bb372d5521bc0549dcfbf384f25a145261a80d124`.
It matches the earlier locally saved loader literal. Its teavmAsync offer timer
schedules a callback with a nonnegative deadline delay; kill clears the timer.
This is recovered artifact-bound timer glue, not recovered PlatformRuntime Java.
It is kept ignored, not redistributed. No evidence identifies a timer cancellation
or continuation loss in the historical failure.

Static inspection of the 93,857,501-byte client WASM finds only two custom sections:
teavm.memoryRequirements and teavm.imports. No name, source map or debug section
was found. This does not prove no external map ever existed, but no Java symbol
mapping was recovered from the preserved artifact or inspected archives. The
Phase 9 CPU function indexes cannot consequently be mapped to missing methods.
No WASM compilation, decompilation, execution or replacement was needed for this
section-framing inspection.

## New control and historical limits

The exact unchanged client was loaded in a dedicated headed task profile copied
from prior task storage. In a 1.5-second ordinary local gameplay observation:

- Browser frames: 567 to 747 (+180).
- World game time: 53850 to 53880 (+30).
- Started sequence: 155 to 185 (+30).
- Completed sequence: 155 to 185 (+30).
- Pending sequence: null at both endpoints.
- Screen: gameplay, local session; yaw/pitch 0/20.

`bridge-publication-control.json` contains exact values. This is a healthy
single-client control for interpreting the globals, not a post-acceptance test,
physical input test or replacement of prior multiplayer evidence.

Phase 8 measured completed sequence 1557 and world time 39040 while browser
frames advanced 72. It did not preserve started/pending sequence at that failed
moment. Phase 9's two actual post-acceptance controls advanced publication and
left the screen normally. No evidence now establishes which side of the bridge
publication boundary failed historically. Native pause/server state, callback
errors and continuation state at that instant remain missing.

## Precise blocker and focused future regression plan

Obtain lawful exact pinned Minecraft, SingleplayerServerController26,
PlatformRuntime (TeaVM), PlatformWebRTC and relevant LANInvites /
ClientPlatformSingleplayer sources plus build dependency/toolchain manifests.
Expected pinned Git blob IDs are in source-search.json. Obtain any matching
symbol map. Downloads/Desktop could not be searched due to macOS permissions;
the historical Linux build directory and Gradle/Maven caches are absent.
Do not substitute current upstream or bypass the repository's access block.

With those sources, identify actual loop, connection acceptance, worker pause
handshake and continuation methods before proposing a patch. If existing browser
observation cannot reproduce and classify the fault, a separately authorized
instrumented Java/TeaVM build is needed. Minimal markers should bracket actual
client-loop entry, bridge begin/end, command application, LAN callback entry/exit,
worker request/reply and async registration/completion/cancellation, with bounded
buffers and monotonic IDs. Caught errors need bounded diagnostics as well as
uncaught-error listeners. Do not change scheduling to manufacture a pass.

Require matched fresh-host Path A/B, ordinary Back and Escape separately, actual
world/entity exchange and open gameplay data channels; two normal reconnects,
forced-loss restoration, disable while disconnected, native identities, remote
combat policy and double-shutdown/input/listener/camera cleanup. No module-enable
call may appear inside automatic-restoration assertions. Re-run physical/manual
checks only when the user can perform them and update artifact/payload/source
hashes for any genuinely modified runtime. This plan is not authorization to
compile or add hooks in Phase 10.
