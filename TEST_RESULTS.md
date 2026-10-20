# Build and validation: October 18, 2026

Starting branch: `meteor-client-integration`.
Starting commit: `46cd7cdf44067d039e3fccf555aa88b285648e68`.
Main baseline: `1ccda035bc03a3fac460fc3fe484c383a65a2d59`.

| Check | Executed result |
| --- | --- |
| Node suite | 141 passed, 0 failed |
| Framework bundles | Passed |
| Browser harness | 20/20 passed, 60.6 FPS with nine modules |
| Rebuilt native startup/UI | 12/12 passed |
| Refreshed original startup/UI | 11/11 passed |
| Actual rebuilt native gameplay | 64/64 passed |
| Dependency audit | 0 vulnerabilities at every severity |
| Private multiplayer | Blocked: Chromium gathered zero WebRTC ICE candidates |
| Matched gameplay performance | Deferred; no completed matched comparison claimed |

## Exact native build

The candidate uses task-local Temurin Java/javac 25.0.4.1+1 and checksum-pinned
Gradle 9.6.1. Its upstream revision is
`1be2375ad67cb42a52d5f586a2422e54b57be625` from `aerograde/eagle-26.2`.
The version remains Eaglercraft 26.2-u1. Java compilation passed in 2m53s.
The completed TeaVM link reported 36,898 classes and 213,530 methods.

The saved candidate uses upstream fast dependency analysis and SIMPLE
optimization, with strict mode and obfuscation enabled. Precise/FULL did not
complete in this environment. Ordinary heaps hit the 8 GiB container limit,
and later file-backed attempts were interrupted or stopped during dependency
analysis. No FULL result is claimed. The documented `--fast` command reproduces
the completed build mode. The default FULL path remains available for a host
with sufficient resources.

HTML SHA-256:
`eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c`.

Main WASM: 93,857,501 bytes, SHA-256
`aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d`.
Compressed main payload: 17,763,621 bytes, SHA-256
`817d8dc367ee32beb863b23c4716fdc9b4acdfc7547594735fadfbcbf9874176`.

Only the main client payload changed. The five other payloads, including
assets, sounds, mesh and server workers, remain byte-identical. The preparation
script verifies all six pins and restores 19,509 CRC-checked resource files.
The resource-tree digest is
`f2afee52c90429514280032eb8b3316f9310b164e96aa17a908a9204d84ac18b`.
The delivered HTML is itself a registered, verified resource input.

## Actual gameplay evidence

`native-bridge/gameplay-verification.json` records the tested HTML hash and
source digest. It contains actual native snapshots, check results and limitations.
No fixture or fabricated native state contributes to its verified module list.

The 64 checks exercised a real private superflat world with structures off:
movement, inventory, mouse capture, damage, slot selection, rotation, jump,
entities, biome, effects and camera projection. Real combat damaged mobs,
including two targets through the compiled bounded attack queue. KillAura owned
rotation with Aim Assist enabled. Speed and Sprint combined and released cleanly.

Zoom changed and restored actual FOV and projection. Brightness and hurt-camera
flags restored. AutoEat consumed real bread, increased hunger and restored the
selected slot. ESP, Tracers and Nametags drew pixels from actual entities.
Coordinates, World Time, Armor, Biome and Potion HUDs displayed native data.
Custom Crosshair enabled and restored the compiled vanilla-crosshair flag.

ClickGUI closed without leaving an extra pause menu. Real death and respawn
events reached Session Statistics and AutoRespawn. Java menu gating rejected
stale movement/slot/rotation commands with the framework ticker stopped.
World exit cleared snapshots, commands and references. Reentry restored pending
module intent and camera settings. Page reload preserved configuration.
The run reported zero uncaught page errors and zero module crashes.

Module counts: 18 verified in real gameplay, 22 implemented but not
gameplay-tested, 6 partially implemented and 31 unsupported, total 77.
Brightness and hurt-camera modules retain partial status despite their tested
subsets. MODULES.md lists each missing contract explicitly.

## Test environment and limits

Headless Chromium 153 uses SwiftShader software rendering in an 8 GiB container.
Physical pointer-lock movement produced trusted but cancelling recenter deltas.
Mouse capture and native rotation passed, but physical desktop camera motion
remains manual QA. Both headless tabs retained focus. A programmatic blur event
released module-owned keys in the actual game, and movement stopped after
disable. This does not certify an operating-system focus transition.

Normal terrain generation exceeded this host's practical memory budget during
an earlier QA run. The browser was stopped before an OOM kill. The final
64-check run used superflat, low-resource graphics and a 640x400 gameplay viewport.
A normal generated world had already loaded, rendered entities, opened inventory
and published actual native state. Audio assets are preserved, but audible
sound was not verified in the headless environment.

Cold startup samples reached the native menu in 17,333 ms and the refreshed
original menu in 14,131 ms. These are single samples on this host, not general
hardware guarantees or gameplay FPS.

## Resumed verification, October 18

The restored source and HTML were checked against the saved source digest and artifact SHA-256 before testing. The isolated rerun passed all 141 Node tests, built both bundles, and passed all 64 native gameplay checks with no page errors or module crashes. The full result is in `native-bridge/gameplay-verification.json`.

The two-client LAN run reached a real local host world and discovered both peers over the private HTTP rendezvous service. It could not open a WebRTC data channel. An independent two-peer browser probe returned zero ICE candidates, connection states `new`, and channel state `connecting`. A retry with Chromium's loopback flag returned the same result. This execution environment exposes only the loopback network interface. Multiplayer gameplay remains unverified and needs a Chromium host that gathers usable ICE candidates. Diagnostics are in `native-bridge/multiplayer-verification.json`.

The LAN checker now foregrounds each target page before input and uses the visually confirmed Direct Connect button position. The gameplay checker rejects an incomplete HTML file before launching Chromium and accepts `NATIVE_EXPECTED_SHA256` for exact artifact validation. A truncated recovered local HTML and reverting workspace files were bypassed by restoring the checksum-matching artifact and source to a private temporary directory.

## Phase 6: native module verification (handoff October 20, 2026)

Start: `dee3df9a338aa990620ea5108a4fe4a56ae0613b`. **156/156 Node tests**, both
browser bundles built, **SMOKE OK**, five new focused regressions. Chrome
155.0.8059.80 / Apple M4 Metal used only disposable task profiles and one client
at a time. No native compilation or performance comparison was repeated.

All 22 previously implemented/unverified modules received focused actual-gameplay
checks. Repaired Screenshot Utilities also passed: 23 newly verified, 18 historical
verified, 5 partial, 31 unsupported. The historical 18 remain bound to the original
artifact; they do not certify the refreshed runtime. All six original partials
were inspected and their existing subsets exercised. See the
[full report](reports/module-phase6/PHASE6_REPORT.md) and
[module matrix](reports/module-phase6/MODULE_MATRIX.md).

The final artifact has 115 preserved check records: 111 pass and four earlier
failures remain visible. Latest functional outcomes are 99 passing checks plus a
retained pointer-lock failure diagnostic resolved by foreground headed capture.
All 190 raw records, including intermediate-runtime observations, remain in
`reports/module-phase6/checks.jsonl`. Mocked checks are separate. No uncaught page
errors or module crashes were captured; the existing empty music sound warning
is retained without an audio certification claim.

Repairs: macro wait default, duplicate notifications, Chunk Borders second axis,
and same-draw WebGL screenshot capture with cancellation/timeout cleanup. Tests
cover real HUD updates, attacks on isolated pigs, movement, inventory metadata,
input/camera/rotation ownership, rapid toggling, GUI/inventory, programmatic focus,
actual death/respawn, world exit/reentry and saved configuration/reload. OS focus
and exhaustive settings combinations remain outside this bounded coverage.

Final refreshed HTML: `6403b3eefb970f302a9dfa07b892eb1827629d96a09dd38c852e326ac2265829`.
Source: `252d2ca8b9bdde95958474e6c08894a422bb02a7452a8f03b548833d86ee9fa4`.
Original HTML/source hashes and the 64-check evidence remain unchanged; six
embedded compiled payloads compare byte-for-byte. New PNGs pass structure/CRC and
content checks. The original black screenshot is failure evidence; the 30 corrupt
historical PNGs remain invalid and untouched. Profiles/HTML stay local and ignored.
