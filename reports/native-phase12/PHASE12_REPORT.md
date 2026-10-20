# Phase 12 — Native readiness and capability reliability

Starting commit: `6284074f4cbddbfd429afa008b858c4dc9b81a56` on `meteor-client-integration`.

## Outcome

Outcome B. Native compilation remains blocked by the complete pinned source/build tree and patched TeaVM dependency closure. No Java source was edited, no compiler/linker was invoked, and no native payload was changed. The known-good Phase 11 HTML remains intact.

## Source and toolchain readiness

One bounded search for the exact revision and identified upstream found no newly accessible, clearly authorized source candidate. Third-party descriptive indexes were not accepted as source archives. The previously recorded HTTP 451/DMCA restriction was not retried or bypassed. No filesystem-wide search, repeated archive inspection, source reconstruction or substitute version was used. Exact missing file/blob targets remain in `reports/native-phase11/SOURCE_READINESS.md` and `dependency-targets.json`.

Installed locally under ignored `input/phase12/toolchains/`:

- Temurin Java **25.0.4.1+1**, macOS ARM64. Archive SHA-256 `61979887f7506a24a57439ff99adb8b3a7fc89977d9cfe3b8984f58a981b7b9d` matched both official GitHub asset metadata and the publisher checksum before extraction. `java -version` and `javac -version` passed.
- Gradle **9.6.1**. Archive SHA-256 `9c0f7faeeb306cb14e4279a3e084ca6b596894089a0638e68a07c945a32c9e14` matched the official checksum and historical pin. `gradle --version --no-daemon` passed using that ARM64 JDK.

Official download/checksum URLs and command output are in `toolchains.json`. The version-specific Adoptium API returned 404; official GitHub release metadata identified the exact archive successfully. No global settings changed. Future build invocations can set `JAVA_HOME` to `input/phase12/toolchains/jdk-25.0.4.1+1/Contents/Home` and pass that verified toolchain directory to the existing helper. The helper must still wait for every source/dependency prerequisite.

Still missing: complete revision `1be2375ad67cb42a52d5f586a2422e54b57be625`, pinned build scripts/linker, patched TeaVM core/JSO and classlib/fiber/URI overrides, transitive dependencies with identities, and verified compiler configuration. Runtime resources remain available in the preserved HTML. External symbol mappings remain unavailable for diagnosis.

## Implemented fixes

Two regression tests failed before the fix and pass afterward:

1. A snapshot advertising only `directMovement` or only `combat` previously granted aggregate `native-direct`. Eight integration modules could pass that capability gate with a partial action implementation. The aggregate now requires both flags. Tests cover refusal, restoration, automatic suspension on capability loss and automatic resumption when both flags return. This conservative gate does not introduce finer-grained partial module support.
2. Velocity and rotation accepted commands without movement support; swing could be accepted with only movement support. They now require their corresponding native feature flags and refuse unsupported commands without creating a command queue.

The current bridge advertises both flags, so this changes handling of partial capability snapshots. All 77 modules remain registered. No previously unsupported module is claimed functional. The historical lobby interruption remains unresolved.

## Validation

- `npm test`: **164/164 passed**.
- `npm run build`: passed; both browser bundles rebuilt. The tracked generic bundle is byte-identical because the change affects only browser integration.
- `node tools/browser-check.mjs http://127.0.0.1:3012/`: **20/20 passed** with installed Chrome.
- `node tools/smoke.mjs`: passed.
- Isolated candidate: refreshed only JavaScript using `tools/inject-eaglercraft.mjs --refresh`; **12/12 actual-client startup/UI checks passed**, including compiled bridge identity, game canvas, GUI, search, HUD and no failed required requests/errors. Startup to menu: 9,748 ms.

Playwright's bundled browser was absent, so checks used installed Google Chrome. The original actual-client runner closed before page load with its software-GPU flags. One retry using the existing Mac session launch flags passed; the adapted runner is retained in ignored input storage. Neither attempt establishes loaded-world gameplay or audio success. Phase 11's 35 user-reported physical passes remain historical; seven manual LAN checks remain deferred. No benchmark, FULL optimization or release packaging ran. Task-owned browser processes closed after checks; local server stopped before publication.

## Artifact identities

| Artifact | SHA-256 |
| --- | --- |
| Preserved HTML | `9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0` |
| Isolated JS candidate HTML | `4513fb5bb769f8538bd792734ad07f59b71fdcb50433584bd7865b24ca194dff` |
| Client WASM in both | `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d` |
| Candidate source digest | `6be34674d1cb85a6aca665021aa9db39d8a152cb664768516fe7476013adb5db` |

Candidate: ignored `input/phase12/candidate.html`. All six decoded payloads are byte-identical to the preserved baseline; client WASM remains 93,857,501 bytes. `artifact-identities.json` records each hash. The baseline retains its historical source digest `d2cc8f7711a9b7a8c218232066c0d3c67135c5b4e644f3b0d098c028ac2aa7a0`; that digest does not certify the changed JavaScript. Candidate startup/UI validation does not replace the baseline gameplay evidence and the candidate is not promoted over it.

## Publication and next actions

Only integration source/tests, module documentation and reviewed Phase 12 evidence are published. Toolchain archives, candidate HTML, browser profiles and session data remain excluded. Commit/push uses the integration branch without force; an independent fresh-repository fetch records commit/tree agreement and every tracked file's bytes in ignored `input/phase12/publication-verification.json`. The original checkout and `main` must match the initial snapshot after publication.

Shortest next step: obtain a complete, lawfully provided pinned checkout plus patched jars and dependency closure; verify every recorded blob and dependency checksum. With those inputs, use the now-verified local tools, preserve the baseline, close task browsers and resolve the memory budget before the single authorized fast-analysis/SIMPLE diagnostic build. Retain the host-return-before-acceptance workaround. Stop after Phase 12.
