# Native Eaglercraft 26.2-u1 build

The source overlay targets `aerograde/eagle-26.2` at exactly
`1be2375ad67cb42a52d5f586a2422e54b57be625`. The source repository includes the
patched Java sources and TeaVM jars, but omits runtime resources. The matching
supplied standalone provides those resources. `inputs.json` pins all six
payload hashes, source revision and the 19,509-file resource digest.

The final delivered native HTML can also be used as the resource input when its
exact client payload is registered in `inputs.json` under `rebuiltClients`.
Only the main client pin has these explicit alternatives; all five other payloads
must still match the original hashes. An arbitrary modified client is rejected.

```sh
npm ci
git clone https://github.com/aerograde/eagle-26.2.git input/upstream-reference
git -C input/upstream-reference checkout --detach 1be2375ad67cb42a52d5f586a2422e54b57be625
npm run build:native -- input/upstream-reference \
  --base-html /absolute/path/Eaglercraft-26.2-u1-Meteor.html \
  --output input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html \
  --fast --heap-mib 6144
```

The build checks both Java and javac 25. On Linux x64 it can download a local
Temurin 25.0.4.1+1 JDK and Gradle 9.6.1. Their download URLs and SHA-256 pins are
in `toolchains.mjs`. Other platforms must provide a Java 25 `JAVA_HOME`.
No global Java settings change. The source revision, all payload lengths/hashes,
EPK framing and CRCs, and resource tree digest must pass before extraction.
Symlinks and conflicting resource files are rejected.

The command above applies the Java overlay, builds the actual Gradle jars, links
with fast dependency analysis and SIMPLE optimization, validates native WASM
markers, replaces the compressed main client payload, and refreshes the existing
Meteor integration. The five other embedded payloads must remain byte-identical.
The output has build and payload JSON receipts. The matching original asset and
sound EPKs and worker binaries are preserved, avoiding the upstream resource
repacker that needs additional non-runtime source inputs.

Upstream recommends 16 GiB RAM and at least a 10 GiB build budget. The previous
8 GiB workspace killed ordinary 8 GiB ParallelGC and 7 GiB G1 attempts during
dependency analysis. `--heap-directory` uses Java's file-backed heap option,
`-XX:AllocateHeapAt`, so pages can be backed by disk. Reserve disk space at
least equal to the heap and allow extra build time. It changes build allocation,
not TeaVM analysis, optimization or the game version. `--fast` explicitly makes
a fast-analysis/SIMPLE build. The saved native candidate uses this mode.
Precise/FULL did not complete in this environment. Omit `--fast` to attempt
the upstream precise/FULL build on a host with sufficient resources.
See TEST_RESULTS.md for completed runtime checks and limitations.

For the file-backed build, G1's young generation is capped at ten percent of
the maximum heap. This reduces paging during dependency analysis while retaining
the full maximum heap for later compiler phases. `EAGLER_LINK_GC_LOG` optionally
records actual garbage-collection occupancy and timings.

Only one linker may run per prepared project. If an abruptly killed process
leaves `wasm-toolchain/generated/standalone-link-cache/operation.lock`, confirm
that every linker for that project has exited before removing that exact stale
lock. Do not remove a live lock or run overlapping builds.

The compiled Java tick announces `__eaghacksNativeBridge` and publishes a bounded
structured snapshot with real player/world/entities/inventory/camera data.
The snapshot also includes the registered biome ID, active potion effects,
GUI/overlay state and bridge timing/sequence diagnostics. Session identity uses
`Minecraft.isLocalServer()`. Entities include registry type,
velocity, health/death and line of sight. Player data includes movement input,
sprint/sneak, hurt/fall, death/use state and inventory metadata. Commands support
rotation, velocity, jump, sprint/sneak, attack/use, slot, swing, respawn, brightness,
FOV, hurt-camera and vanilla crosshair control. Multi-target attack queues are
bounded to 16 distinct entities and are cancelled when KillAura disables. Native
menu gating discards gameplay commands while preserving release/restore actions.
Camera state resets on world exit. The adapter must
advertise narrow capabilities; full inventory transactions and collision/blocks
are separate missing contracts. Source presence and Java compilation alone do
not establish browser or gameplay verification. See TEST_RESULTS.md for actual
executed validation.
