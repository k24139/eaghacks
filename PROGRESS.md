# Eaghacks recovery checkpoint

Recovery-only phase, October 18, 2026, America/Chicago. Stop after this phase.
No native compilation, browser gameplay, multiplayer test, or performance comparison was performed in this phase.

## Git and source provenance

- Repository: https://github.com/k24139/eaghacks
- Branch: `meteor-client-integration`
- Starting remote/local commit: `46cd7cdf44067d039e3fccf555aa88b285648e68`.
- Starting tree: `e9cf8d66581fe4ea84ca5109956a43b8e06c8acc`.
- Main baseline: `1ccda035bc03a3fac460fc3fe484c383a65a2d59`. Main is outside the recovery changes.
- Pinned native upstream: `1be2375ad67cb42a52d5f586a2422e54b57be625`.
- No prior `PROGRESS.md` was present in the local trees or selected recovery archive. This file was created for the handoff.
- Selected source: saved `Eaghacks-native-build-checkpoint.zip`, version 14, 303,717 bytes, SHA-256 `0ea9b5fc3dfc4983485724583cc66745bc4ffb973f2a635f76967003ce6fcc31`.
- This archive's SHA-256 was recorded during recovery. Its ZIP CRC checks pass. Its runtime source digest matches the independently saved gameplay evidence below.
- Older version 13: 299,569 bytes, SHA-256 `da76e987dbe83903fa6fd10c243e48dbdab2177c3c975543c2c0eeb561d94ee9`. It was not selected.
- Runtime source digest: `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f`.
- Source was restored in a separate checkout, `/tmp/eaghacks-recovery-phase1`. Newer experimental files in `/tmp/eaghacks-resume-isolated` and the older workspace were preserved. They are not the verified handoff.

## Exact native artifact

Saved native HTML version 2 is the verified artifact. No replacement game build was generated.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `Eaglercraft-26.2-u1-Meteor-Native.html` | 80,975,660 | `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c` |
| Compressed main client payload | 17,763,621 | `817d8dc367ee32beb863b23c4716fdc9b4acdfc7547594735fadfbcbf9874176` |
| Uncompressed client WASM | 93,857,501 | `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d` |

The recovered HTML has a complete closing document and all six embedded payloads. Payload sizes and hashes match `native-bridge/inputs.json` and the saved build receipt. Only the main client differs from the original runtime. The other five payloads retain their original hashes.

`native-bridge/recovery-artifacts.json` records every payload hash, native artifact hash, runtime source digest, upstream revision and bridge markers. The main WASM contains `__eaghacksNativeBridge`, `Java/TeaVM-WasmGC`, and `__eaghacksNativeState`. Static decompression and hash checks confirmed these markers without executing the game.

Build mode is fast dependency analysis / SIMPLE optimization. The receipt labels it a fast-analysis development build. It is not a completed precise/FULL release build. The saved build used Java 25.0.4.1+1 and Gradle 9.6.1. Those toolchains were not installed or invoked again in this phase.

Local artifact paths:

- Verified original saved copy: `/workspace/scratch/673e9e5e458a/resume-restored/Eaglercraft-26.2-u1-Meteor-Native.html`.
- Restored checkout copy: `input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html`.
- Saved receipt in checkout: `input/deliverable/native-build-receipt.json`, 1860 bytes, SHA-256 `11c62c6c0f3575b73238ffb5a923e7ccca2013584c52fbe90e8cfeb70bca1c28`.
- HTML and receipt stay outside Git under the ignored `input/` directory. Recover them from the saved artifacts after a workspace reset, then verify their hashes.

## Rejected or deferred local copies

- Top-level `/workspace/scratch/673e9e5e458a/Eaglercraft-26.2-u1-Meteor-Native.html` is truncated: 55,399,936 bytes, SHA-256 `db2027684bc7c3475b5093cb55138486a2fdc233db0505e90d015f57f5d1b72e`. It ends inside an embedded payload and has no closing HTML document. Do not use it. It was preserved rather than overwritten.
- The old workspace gameplay checker is 17,636 bytes, SHA-256 `054e843732d8f429478c27e075fcd3f7a6d7fc5c2f4fa91f72942f0f2be50d2d`. It lacks the selected checkpoint's newer setup and recovery checks.
- The selected gameplay checker is 27,602 bytes, SHA-256 `d8ff264dec8b07e646f22f0aa5877f6243d3ed6fb58281a84da9210335ec19fb`.
- Selected `tools/real-client-check.mjs`: SHA-256 `04b3e90b7e07a38655938e316798e5cd3128bb80a1764e21dfd4c955f5072790`.
- Selected `tools/browser-check.mjs`: SHA-256 `115006461b8067c9fe8e1f3992703bf85438a12de90aa89c198b60cd3af6eb9e`.
- Performance scripts are preserved from checkpoint 14, not certified by this phase. Earlier experiments exposed profile/screen-signal differences in the stock runtime. Do not treat those scripts or partial timing samples as a completed matched comparison.
- The newer temporary comparison experiments were not copied over the saved verified source.

## Checks performed in this recovery phase

| Check | Result |
| --- | --- |
| `npm test` | 141 passed, 0 failed |
| `npm run build` | Both browser bundles built |
| `node tools/smoke.mjs` | `SMOKE OK` |
| `node --check tools/verify-recovery-artifact.mjs` | Passed |
| Static saved HTML / payload / WASM verification | Passed, six payloads and three compiled bridge markers |
| Negative check against the truncated HTML | Rejected before payload decompression |
| Saved source/gameplay provenance | Source digest and HTML SHA-256 match the saved 64-check evidence |

Repeat the read-only artifact check after restoration:

```sh
node tools/verify-recovery-artifact.mjs \
  input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html \
  input/deliverable/native-build-receipt.json
```

The 64 real-gameplay checks and 12 native startup/UI checks are prior saved evidence, not tests run again in this phase. `native-bridge/gameplay-verification.json` supplies the artifact hash, source digest and concrete gameplay observations. Startup evidence supports bridge communication but does not replace that hash-bound gameplay record.

The catalogue remains 77 modules: 18 verified in real gameplay, 22 implemented but awaiting gameplay checks, 6 partial and 31 unsupported. No status was upgraded from static inspection.

## Starting point for Prompt 2

1. Check out the published `meteor-client-integration` head containing this recovery handoff. Record `git rev-parse HEAD` before edits.
2. Read this file and `native-bridge/recovery-artifacts.json`. Restore the exact native HTML and receipt if `input/deliverable/` is missing.
3. Require HTML SHA-256 `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c` and runtime source digest `49015a0f3899a8281b1479bf57e7fe7782524180c316d812efb1cad0f4a0722f` before using the saved gameplay evidence.
4. Keep the compiled candidate. Do not restart the native build as a recovery step.
5. Begin only the next explicitly authorized bounded phase. This phase did not authorize gameplay, multiplayer or performance work.

Remaining work is separate: a production precise/FULL build on a suitable host, desktop physical pointer/focus/audio QA, remaining module coverage, multiplayer on a host where Chromium gathers WebRTC ICE candidates, and a repaired matched performance comparison. Prior multiplayer diagnostics found zero ICE candidates in the loopback-only environment. No multiplayer compatibility or performance parity is claimed.
