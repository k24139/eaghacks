# Phase 11 native build readiness

**BLOCKED. This is a provisional build plan, not a demonstrated reproducible build.** No native compilation, Java edit, dependency installation, toolchain download, payload replacement or standalone regeneration occurred.

## Read-only inventory

| Input | Observation / requirement |
| --- | --- |
| Node / npm | v24.20.0 / 11.19.0 installed; existing node_modules supports all lightweight checks |
| Java / javac | macOS stubs report no Java Runtime; java_home -V cannot locate a JDK; Java 25 required |
| Gradle | No executable on PATH; ~/.gradle and ~/.m2 absent in targeted checks; project-local native-build toolchain directory absent |
| Platform | macOS 26.4 (25E246), arm64, 16 GiB unified memory |
| Historical JDK | Java 25.0.4.1+1; toolchains.mjs pins a Linux x64 Temurin archive, not a macOS ARM archive |
| Gradle distribution | 9.6.1; archive SHA-256 `9c0f7faeeb306cb14e4279a3e084ca6b596894089a0638e68a07c945a32c9e14` |
| TeaVM | Pinned tree names patched `teavm-core-0.13.1-eagler.jar` and `teavm-jso-impl-0.13.1-eagler.jar`, plus classlib, fiber and URI override jars; none recovered |
| Source | Complete exact source tree and upstream build manifests unavailable |
| Overlay | Three Java overlays present under native-bridge/upstream; existing patcher available |
| Resources | Exact HTML available; read-only decoding validates six payloads, 19,509 EPK file CRCs, 17,579,680 uncompressed resource bytes and tree digest |
| Mapping | No recovered external Java/source/symbol map |
| Historical receipt | recovery-artifacts.json and prior PROGRESS evidence retained; historical input/deliverable/native-build-receipt.json absent at its recorded path |

The pinned-tree dependency manifest supplies expected Git identities, not installed jars or a complete transitive dependency lock. Exact dependency coordinates, compiler flags/entry points and dependency SHA-256 closure must be resolved from the recovered Gradle scripts and standalone linker; they cannot be reconstructed reliably from jar names alone. Do not replace Eagler-patched TeaVM with stock Maven 0.13.1.

## Toolchain provisioning instructions for a separately authorized step

Obtain an Apple Silicon Java 25 JDK from the official Temurin distribution at https://adoptium.net/temurin/releases/ and verify its publisher-provided checksum/signature. Confirm `bin/java -version` and `bin/javac -version`; set JAVA_HOME only for the task invocation. Exact 25.0.4.1+1 macOS ARM availability/hash is unverified; the Linux archive checksum must not be reused for it. This is a compatibility blocker requiring resolution, not a verified installation recipe.

Gradle's recorded distribution is https://services.gradle.org/distributions/gradle-9.6.1-bin.zip (fallback pinned in toolchains.mjs: https://github.com/gradle/gradle-distributions/releases/download/v9.6.1/gradle-9.6.1-bin.zip). Validate the recorded checksum and wrapper properties before use. URLs are repository-recorded targets, not newly downloaded/availability-tested files. Preserve wrappers and patched jars from lawful pinned sources. No global environment configuration should change.

`prepareToolchains()` can download Gradle even with a supplied JAVA_HOME; calling it is not a read-only preflight. Do not invoke build-native-client.mjs as a readiness check. On non-Linux-x64 hosts it requires an explicit Java 25 JAVA_HOME. No helper was invoked to install dependencies in Phase 11.

## Provisional future procedure — requires separate compilation authorization

1. Preserve input/phase8/native-fixed.html unchanged as rollback. Hash it before/after and keep outputs in a new ignored directory. Preserve historical receipts separately; never overwrite the known-good WASM or HTML.
2. Obtain the lawful complete pinned checkout. Verify HEAD, full tree, file modes and expected blobs using the saved tree; record SHA-256 of every source/build input and patched jar. Verify Gradle wrapper/scripts and transitive dependency inventory/checksums before resolving dependencies. An immutable verified dependency closure is still missing.
3. Make an isolated working copy of that verified checkout. `prepare-from-html.mjs <known-good.html> <isolated-source>` requires the exact Git HEAD, checks all payload pins and EPK CRCs, and restores resources. Resource tree SHA-256 must be `f2afee52c90429514280032eb8b3316f9310b164e96aa17a908a9204d84ac18b`. It writes only to the isolated copy, and must not run during this phase.
4. `apply-native-bridge.mjs <isolated-source>` copies game/platform/platform-teavm overlays and patches Minecraft, Camera, GameRenderer and Hud plus linker support. It checks insertion markers, uses task-local Gradle caches, configures G1/string deduplication/reserve and young-generation limits, and supports file-backed heap/GC logs. Capture the exact diff and its hashes. Do not patch the recovered pristine source or integration runtime.
5. Once authorized and prerequisites verified, reproduce only fast-analysis/SIMPLE mode using the orchestrator with `--fast --base-html input/phase8/native-fixed.html --output input/phase12/candidate.html --toolchains <verified-task-toolchains> --heap-mib <approved-budget>`. The positional project is the isolated source copy. It invokes `wasm-toolchain/link-web-target-standalone.js client --fast-analysis`; the upstream source must confirm the actual compiler settings. No FULL run is part of the plan.
6. Expected client output: `target_teavm_wasm_gc/build/generated/teavm/wasm-gc-fast-analysis/classes.wasm`. Compare WASM header/sections, expected imports/exports, custom memory requirements and compiled bridge markers against the baseline metadata; retain any external map. Baseline WASM is 93,857,501 bytes, but a new instrumented/compiler build need not match its bytes. Distinguish structural compatibility from byte-for-byte reproducibility.
7. The existing replacement helper compiles/validates the new WASM as a module with js-string builtins, checks bridge markers, Brotli-compresses at quality 5 and replaces only eag-inline-wasm-br. Preserve the other five payload bytes. Injector refresh constructs a new standalone output, with build/payload receipts. These are future steps, not Phase 11 actions.
8. Assign new SHA-256 identities to HTML, WASM, all encoded/decoded payloads and runtime source digest; record upstream revision, overlay diff, compiler/dependency hashes, platform, flags and toolchains. A prior bridge/source digest cannot certify a changed native payload. Run actual regression and manual checks against that identity before any promotion. Roll back by reopening the unchanged known-good HTML, never by overwriting it.

## Memory and unresolved constraints

The wrapper accepts 4096..12544 MiB heap, defaults to 11264 MiB (or EAGLER_LINK_HEAP_MIB); the README example uses 6144 MiB. Neither is a demonstrated successful Mac budget. Historical upstream guidance is 16 GiB RAM / at least 10 GiB build budget, with failed 7–8 GiB Linux attempts in prior evidence. On a 16 GiB unified-memory Mac, close task browsers, avoid concurrent linkers and budget OS/GPU/Gradle overhead. File-backed heap requires at least heap-sized free disk plus build overhead; macOS JDK support for AllocateHeapAt must be demonstrated before relying on it. Read-only pressure samples were 62% free before harness and 59% after; they are not compiler peak measurements. Stop any future build on sustained pressure rather than treating swap as proof of feasibility.

Readiness requires all missing source/dependency bytes, verified macOS ARM JDK and Gradle, exact compiler settings, disk/heap budget and separate build authorization. No claim of reproducibility or native build readiness is made.
