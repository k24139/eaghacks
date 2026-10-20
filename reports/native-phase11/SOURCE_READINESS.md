# Phase 11 source readiness

**Blocked: zero newly recovered core files.** Pinned native revision: `1be2375ad67cb42a52d5f586a2422e54b57be625`.

Phase 10 already searched accessible local archives/caches and twelve repositories. No new user-selected archive, authorized mirror, newly accessible directory or source package was supplied in Phase 11. The source-recovery stopping condition therefore applies: no filesystem-wide search, repeated archive scan, repository-block retry or permission bypass was performed. Downloads/Desktop restrictions remain historical unremedied limitations; this phase did not assume access or retry TCC-denied locations.

The existing pinned-tree metadata was inspected narrowly to identify build prerequisites. dependency-targets.json records exact paths, sizes and Git blob IDs for build scripts/manifests and patched TeaVM jars. This is newly documented metadata, not recovered source or dependency bytes. The three Phase 10 overlay copies and four previously verified source files retain their historical provenance; none is counted as a newly recovered missing core file.

Missing exact source targets (from Phase 10 source-search.json):

| Path | Bytes | Git blob SHA-1 |
| --- | ---: | --- |
| `game/src/main/java/net/lax1dude/eaglercraft/v1_8/sp/SingleplayerServerController26.java` | 32798 | `8045c2edd604ef0b7adad99d9612b98b2a6a2842` |
| `game/src/main/java/net/lax1dude/eaglercraft/v1_8/sp/lan/LANInvites.java` | 22653 | `f22b01dd8e15edd341f83940652376b26e5c00c3` |
| `game/src/main/java/net/minecraft/client/Minecraft.java` | 150527 | `0aefd147e34a8991d147b06e80b03e4e005cfe99` |
| `platform-lwjgl/src/main/java/net/lax1dude/eaglercraft/v1_8/internal/PlatformRuntime.java` | 23763 | `0b6dfa2347c9b76e56c96b4ed605517a8e55c764` |
| `platform-lwjgl/src/main/java/net/lax1dude/eaglercraft/v1_8/sp/internal/ClientPlatformSingleplayer.java` | 4864 | `a20bf552b4c888a76da20193c0656ce36ab3e714` |
| `platform-teavm/src/main/java/net/lax1dude/eaglercraft/v1_8/internal/PlatformRuntime.java` | 34697 | `59e94a49cd4becf8ebeb1326d935e2e4bd6385a7` |
| `platform-teavm/src/main/java/net/lax1dude/eaglercraft/v1_8/internal/PlatformWebRTC.java` | 72512 | `d0475401f39e604fae83671242706285daeae9ba` |
| `platform-teavm/src/main/java/net/lax1dude/eaglercraft/v1_8/sp/internal/ClientPlatformSingleplayer.java` | 43734 | `0a5f0a354db8cdd5e42ba49a9a9c2427118c51ab` |
| `platform/src/main/java/net/lax1dude/eaglercraft/v1_8/internal/PlatformRuntime.java` | 4996 | `7241ae57107dab8c7453b3f60f4c96348e0247d6` |
| `platform/src/main/java/net/lax1dude/eaglercraft/v1_8/sp/internal/ClientPlatformSingleplayer.java` | 4186 | `4e6a77c8d7bd8743570062e7f32f576f3e9730bf` |

Also required: complete pinned source/build tree, exact dependency closure, resource/build manifests and any external Java symbol/source mapping. The preserved WASM has no embedded name/debug/source-map sections according to Phase 10 static framing; an external mapping remains unavailable.

For a future lawful candidate, retain original bytes in ignored input storage, record exact origin/path and authorization, verify the pinned commit/tree and calculate SHA-256 plus `git hash-object --no-filters <file>` for each target. Compare size and Git blob ID to the recorded manifest; SHA-256 becomes a new provenance measurement where only Git SHA-1 was historically available. Do not invent an expected SHA-256. Match every required file, not just a revision label or one source class. Record submodule/LFS requirements if present. Quarantine mismatches under ignored input/phase11/quarantine rather than promoting them. No candidate exists to hash or quarantine in this phase.

Required user input: a lawfully obtained complete checkout/archive for the exact revision, including patched TeaVM jars and build files, or explicit selection of genuinely new accessible source material. Related/newer sources cannot substitute for the pin.
