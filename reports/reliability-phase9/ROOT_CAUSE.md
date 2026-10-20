# Host-lobby investigation

Status: historical stall remains unresolved; neither of two bounded Phase 9
post-acceptance attempts reproduced it. There is no runtime or Java fix.

Phase 8's original stationary world time 39040 and bridge sequence 1557 with
72 browser frames in 1.2 seconds remain valid historical observations, including
the Meteor-shutdown control. They are not relabeled as Phase 9 reproduction.
The 30 damaged historical screenshots remain invalid and unused.

## What the signals mean

`EaglerHacksNativeBridge.tick(Minecraft)` publishes the screen first, then calls
`beginFrame(minecraft.level.getGameTime(), ...)`. The reported `tick` is therefore
world game time, not `Minecraft.clientTickCount`. The bridge patch is inserted
after `this.clientTickCount++` by `native-bridge/apply-native-bridge.mjs`.
`PlatformMeteorBridge.beginFrame` increments `__eaghacksNativeSequence` and starts
a snapshot; the completed snapshot carries that sequence. A stationary world
clock alone is insufficient evidence of a stopped loop. Phase 9's pause control
kept world time 52461 but advanced sequence 360→390 and browser frames by 181.
A stationary bridge sequence identifies absent snapshot progress at this hook;
it does not identify the last Java method executed or prove a WASM deadlock.

## Actual Phase 9 observations

- Path A: native private hosting, invitation, host returned to gameplay before
  acceptance; guest remote world plus an open `lan` channel with over 1 MB
  received. Guest movement reached the matching host entity. Host was local and
  remote combat was blocked. Host progress sample advanced sequence/world time
  by 30 with 182 browser frames.
- Path B1: same task session after reconnect regressions, host retained in
  EaglerLANPeersScreen through acceptance and guest world readiness. Before input,
  sequence advanced by 31 and world time by 31 with 186 browser frames. Trusted
  Back/Escape left the screen for MultiplayerOptionsScreen; host W movement
  afterward succeeded.
- Path B2: host fully reloaded, reopened its disposable saved world and started
  fresh hosting. Host remained in EaglerLANPeersScreen through guest acceptance
  and world readiness. Before input, sequence advanced by 32 and world time by
  33 with 184 browser frames. Back alone reached EaglerDirectConnectHostScreen;
  Escape then reached MultiplayerOptionsScreen. Both observations advanced
  bridge sequence. No Meteor shutdown or forced state transition was needed.

Files `path-b1-*.json` and `path-b2-*.json` retain exact endpoints, focus, pointer,
input events, long-task observations, discovery state and host RTC statistics.
`checks.jsonl` records guest RTC channels separately, with `label=lan` required
for the final driver assertion. `lan-console.json`/`host-console.txt` retain the
native acceptance/join messages and warnings. The initial Path A connection
assertion used the inherited broad channel predicate; its saved result separately
shows the actual open gameplay `lan` channel and movement independently verifies
world exchange. The driver was tightened to require that label thereafter.

Short CPU profiles sampled normal running native execution: Path B1 after
navigation (1765 WASM nodes), Path B2 in the lobby (1885 WASM nodes). These are
1.5-second diagnostic samples, not performance benchmarks. Function indexes lack
Java source mapping. Startup/import long tasks are recorded; neither current
attempt establishes long-running blocking work at acceptance. Browser task and
WASM execution evidence from these successful attempts cannot explain the old
stall retroactively. No uncaught page errors were recorded in this Phase 9 game
session; logged native exceptions/warnings are retained and discussed separately.

## Native source inspection and limits

The local pinned `EaglerLANPeersScreen.java` and `PlatformInput.java` were matched
against their saved upstream Git blob IDs (see upstream-sources.json). The screen
refreshes peer rows in tick, sets its parent in onClose, and accepts Escape. Its
invite method calls SingleplayerServerController26 direct-host invitation methods.
PlatformInput queues mouse events and dispatches trusted Escape synchronously
through trustedEscapeHandler. Its frame pacing uses TeaVM async rAF with a 50 ms
fallback, PlatformRuntime sleep/swap-delay, and an explicit duplicate-vsync waiter
error. None of these inspected paths establishes a defective Back implementation.

Complete pinned Minecraft loop, SingleplayerServerController26, PlatformRuntime
and PlatformWebRTC sources are absent locally. Raw GitHub access returned 404;
the connected GitHub tool returned HTTP 451, repository blocked with reason dmca.
No alternate copy or rebuild was substituted. Consequently LAN callback, worker
pause/unpause and TeaVM continuation behavior cannot be fully traced to source.
Native bridge source and its insertion patch were inspected locally unchanged.

The narrow remaining hypothesis is interrupted or suspended native loop/snapshot
publication, potentially at a LAN callback, integrated-server synchronization or
TeaVM continuation boundary. This is an unconfirmed area to investigate, not an
exact affected method or confirmed root cause. A global browser main-thread busy
loop for the whole old observation is inconsistent with continuing browser rAF;
short blocking tasks, missing continuation, native caught exception or publication
hook failure remain distinguishable possibilities. Current successful acceptance
shows that staying in this screen is not sufficient by itself to trigger failure.

## Next instrumentation proposal — requires a separately authorized native build

First obtain a lawful complete local checkout at the pinned revision and a symbol
map for the preserved WASM. Keep existing HTML unchanged. Before considering a
source repair, capture bounded entry/exit markers around the actual Minecraft
loop containing clientTickCount++, the bridge tick/beginFrame/finish publication,
LANInvites acceptance handling, SingleplayerServerController26 worker connection
processing, and PlatformInput.update/asyncRequestAnimationFrame completion.
Include async continuation IDs, screen/paused transitions, worker message IDs,
last uncaught and caught exceptions, and watchdog timestamps. Resolve exact loop
and callback method names from that checkout rather than guessing them here.

That instrumentation would require compiling Java/TeaVM and replacing the client
payload, followed by payload/hash provenance and both navigation flows, reconnect
restoration, disable-during-reconnect, remote policy, desktop and cleanup tests.
No such source edit, compilation or speculative native patch ran in Phase 9.
The pre-acceptance return-to-gameplay workaround remains directly verified and
available; it is not reported as a fix.
