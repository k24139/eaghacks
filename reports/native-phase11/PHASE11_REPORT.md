# Eaghacks Phase 11 — native build readiness and physical QA baseline

October 20, 2026, America/Chicago. **Readiness/evidence work is complete; native build readiness is blocked and 35 non-LAN physical checks are user-reported PASS; seven LAN checks remain pending by user choice.** No native compilation, source-level feature change, replacement WASM, standalone rebuild, FULL optimization, benchmark or release packaging ran. Stop after Phase 11.

## Repository baseline and preservation

Integration worktree: input/phase4-worktree, branch meteor-client-integration. Initial tracked/untracked status was clean. Starting HEAD and freshly fetched integration branch both equal `70365651d50eca8f0ac538e7f453aabb66420a61`; tree `8def2d0880bbaa7a190efcc8a6b8102113b3f808`. Remote: https://github.com/k24139/eaghacks.git. There was no unexpected remote advancement and no reset/force push.

The original checkout remains on main at `1ccda035bc03a3fac460fc3fe484c383a65a2d59`. Its preexisting README modification and untracked project content were snapshotted in ignored input/phase11/original-status-before.txt, not modified. Only the integration worktree receives Phase 11 files. Existing Phase 6–10 evidence, failed observations and invalid historical PNG classifications are preserved. Browser-check's two generated tracked harness PNGs were restored byte-for-byte from starting HEAD; new generated images are not published.

Read the current PROGRESS, INTEGRATION, MODULES, Phase 10 report/lobby/source evidence, Phase 9 checklist/root cause and Phase 6 matrix. Historical evidence remains historical; no unsupported module status was upgraded.

## Known-good artifact

| Component | Verified identity |
| --- | --- |
| HTML | 80,978,184 bytes; SHA-256 `9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0` |
| Runtime source digest | `d2cc8f7711a9b7a8c218232066c0d3c67135c5b4e644f3b0d098c028ac2aa7a0` |
| Client WASM | 93,857,501 bytes; SHA-256 `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d` |

`node tools/phase9-verify-runtime.mjs` passed (exit 0). Its write to the historical Phase 9 runtime receipt produced identical bytes. A separate read-only check verified all six encoded and decoded payload hashes, declared sizes and input pins, plus 19,509 resource CRCs / 17,579,680 resource bytes and the pinned resource-tree digest. Complete identities are in verification.json. The HTML and compiled payload are preserved unchanged, without regeneration or recompilation.

## Sources and toolchain

**New core sources recovered: 0.** No genuinely new accessible source candidate was provided; the source-recovery stopping condition applied. No repeated filesystem-wide search, two-ZIP rescan, twelve-repository scan, protected-directory retry or upstream-block bypass ran. Phase 10's Downloads/Desktop denial remains a historical limitation, not a directory searched successfully in Phase 11.

Four previously verified pinned Java/JS files and three existing Java overlays were hash-checked again; existing-source-verification.json records those results. They do not recover missing core classes. SOURCE_READINESS.md lists all ten missing exact source paths, sizes and Git blob IDs, including Minecraft, SingleplayerServerController26, LANInvites, TeaVM PlatformRuntime, PlatformWebRTC and ClientPlatformSingleplayer plus platform contracts/variants.

The retained pinned-tree metadata identifies patched TeaVM 0.13.1 core/JSO jars, three override jars and exact build-script blob targets. dependency-targets.json captures the metadata without claiming file recovery. The source tree, those jars, full dependency closure, exact compiler configuration and source mapping remain missing.

Node v24.20.0 and npm 11.19.0 work with existing local dependencies. macOS reports no installed Java runtime/JDK, no Gradle executable is on PATH, targeted Gradle/Maven caches and native-build toolchain directory are absent. Java 25 and Gradle 9.6.1 are required historically. The recorded Java 25.0.4.1+1 download pin is Linux x64; a verified compatible macOS ARM JDK and checksum have not been established. The old ignored build receipt is absent at its historical path; tracked recovery metadata remains available. No toolchain download, install or global environment mutation ran.

**Build plan: provisional, not reproducible as currently provisioned.** BUILD_READINESS.md documents source and dependency verification, isolated preparation and overlay application, fast-analysis/SIMPLE command construction, memory/disk constraints, output/structural checks, standalone construction, new cryptographic identity and rollback preservation. Mac file-backed heap compatibility and a sustainable 16 GiB memory budget remain unresolved. Do not run the orchestrator as a read-only preflight; it can download dependencies and compile.

## Physical QA

MANUAL_QA.md provides exact working-directory, hash, server, dedicated-profile and cleanup commands, individual procedures and the known-good LAN workaround. manual-results.json records 8 mouse, 18 keyboard/interface and 9 audio checks as PASS from the user’s aggregate report, and all 7 private multiplayer checks as PENDING. The operator is the user; exact test time, actual browser version and mouse/audio hardware remain unreported.

The user reported availability, then a MODULE_NOT_FOUND setup error from the original checkout. Explicit commands to change both terminals to the integration worktree were provided. This is a launch-directory error, not a physical client failure. In a later follow-up the user reported: "Everything works. I did not test the lan, since that is not a priority right now". This covers the supplied non-LAN checklist as an aggregate self-report; no per-check measurements were provided. LAN is deferred, not failed. Browser/server shutdown was not confirmed. Automated harness results cannot substitute for those results. A user-operated manual server must be closed by the operator after testing; no unrelated listener/browser is terminated by the agent.

## Host-lobby diagnostics

Historical lobby interruption is still unresolved; no new evidence warranted another automated two-client attempt. NATIVE_DIAGNOSTICS_PLAN.md separates browser frames, actual loop execution, world time, started/completed/pending publication, command application, LAN callbacks, workers and TeaVM continuations. It proposes bounded non-consuming counters/rings and local causal IDs, preserving scheduling/exception semantics and excluding invitation/session data. Confirmed signal semantics are distinguished from possible causes. Actual call sites and mapping require the missing pinned source and a separately authorized instrumented build. No instrumentation was implemented.

## Actual automated validation

| Command | Actual result | Exit |
| --- | --- | ---: |
| npm test | 162 passed, 0 failed, 0 skipped | 0 |
| npm run build | Both JavaScript bundles built | 0 |
| node tools/browser-check.mjs http://127.0.0.1:3011/ | 20 passed, 0 failed | 0 |
| node tools/smoke.mjs | SMOKE OK | 0 |
| node tools/phase9-verify-runtime.mjs | Exact HTML/source/payload/WASM verification | 0 |
| Independent six-payload / EPK validation | All hashes/sizes, CRCs and resource tree passed | 0 |

Logs are published beside this report. Browser checks used the task Chrome executable with an isolated ephemeral profile and a task-owned loopback server. An initial sandbox server launch could not remain running; the authorized outside-sandbox retry completed successfully. Git fetch likewise required write access to the worktree's Git metadata. The successful fetch and tests are recorded separately from those setup failures. No auto-review rejection occurred.

The harness browser/server were closed in finally cleanup. No full native client was launched by the agent, no expensive performance benchmark or historical multiplayer regression was repeated. User manual testing is independent. Memory free samples: 62% before harness and 59% after; these are samples, not continuous peaks or native build measurements.

## Publication and Phase 12 handoff

Only reviewed documentation, sanitized identities/manifests and lightweight validation logs are eligible for the Phase 11 commit. Exclude native HTML, source archives, recovered source copies, profiles, local storage and raw session logs. A normal Git CLI push followed by a fresh temporary-repository fetch must verify the containing commit SHA, tree and every tracked local file byte-for-byte. The final response and ignored input/phase11/publication-verification.json record the containing SHA and actual publication outcome; this committed report does not preclaim that later operation succeeded.

Proposed Phase 12 objectives, requiring fresh authorization:

1. Obtain a lawful complete source/dependency package at `1be2375ad67cb42a52d5f586a2422e54b57be625`, verify the manifest identities and retain matching symbol/source maps if available. User must supply/select genuinely new authorized material.
2. Resolve and verify the macOS ARM Java 25 toolchain, Gradle distribution, patched TeaVM jars/transitive closure, exact compiler settings and memory/disk budget. No ready-to-build claim until prerequisites are present.
3. Retain the user-reported non-LAN passes. Collect the missing hardware/browser/time metadata when available; leave private LAN deferred until the user prioritizes it and a second participant is available. Retain any future failure steps.
4. Only after explicit native compilation authorization, create an isolated fast-analysis/SIMPLE diagnostic candidate implementing the reviewed bounded markers; assign new identities and perform the scoped hash-bound regressions. Identify a confirmed interruption boundary before proposing a lobby fix.

No missing-module implementation is authorized by this handoff. Keep the unchanged client available for rollback. Phase 12 has not begun.

The physical QA follow-up is a documentation-only update to initial Phase 11 publication `668c5f346f3a502d1dca0b813177eb536ec8cabb`; existing automated results were not rerun or relabeled. Its own containing publication is verified separately in the ignored receipt.
