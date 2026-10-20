# Phase 13 — Playable JavaScript integration candidate

Started from `9c091dcfb497f680f2f0d693c66084cc2d9da49f`, integration worktree only. No Java, Gradle, TeaVM, native compilation, source reconstruction or native payload replacement ran. Phase 11 and Phase 12 artifacts are preserved.

The candidate is `input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC.html`, in ignored local storage. It uses the existing compiled client. `release-manifest.json` binds HTML, integration JavaScript, source, injection tool and all six payloads; the decoded 93,857,501-byte client WASM and every native payload match the verified baseline byte-for-byte.

The focused RC checks pass. This is a playable candidate, not final-release certification: exhaustive per-setting/world-exit acceptance and release-specific human input/audio QA remain pending.

## Repair

ClickGUI settings widgets retained model callbacks after reset, category refresh and shutdown. Added removable setting subscriptions and panel-owned cleanup. A regression test reproduces callback growth on the starting commit (two listeners instead of one after reset), and passes with the fix. Search replacement also invokes panel cleanup. No module/native behavior is fabricated to increase the count.

## Verification

Automated checks passed: **165 unit tests**, **20 browser harness checks**, build and smoke. The exact RC has **79 unique actual-client checks** across hash-identical checkpoints, plus **56 focused module checks**. This is a scoped continuation record, not a claim of a single uninterrupted run.

**Eight restart/recovery/shutdown checks** passed, including safe recovery from invalid stored settings and no failed required requests or unexpected JavaScript errors. Module dispositions: **41 gameplay-observed, five partial, 31 unsupported**; no exhaustive full-acceptance count is claimed. The screenshot download has valid PNG chunks/CRCs, 1280×800 dimensions and 783 distinct colors.

Final totals and sanitized per-module checks are in `verification.json`; all 77 dispositions and exact unsupported contracts are in `MODULE_STATUS.md`. Gameplay-observed support is separated from exhaustive per-setting/world-exit acceptance, which is not claimed. Missing optional Fullbright night vision, independent hurt-camera tilt, packet criticals, macro chat/bind steps and target armor remain partial. AutoWeapon still requires verified weapon ranking despite existing hotbar reads; unsupported does not invariably mean Java must be rebuilt.

The immutable Phase 12 candidate passed 65 loaded-world checks. The RC is tested directly through a `file://` URL, with a disposable world and task-owned profile. Evidence includes live player state, keyboard movement, simulated mouse camera motion, inventory/chat, combat/movement modules, HUD, ClickGUI, module settings, actual block conditions, WebAudio samples, saved-world reentry and process restart. These are browser automation results, not physical mouse or human listening claims.

Test setup corrections are retained in ignored local logs: load origin chunks before constructing the platform; avoid a preliminary attack click on the placement support; clear leftover blocks above the platform before reusing a world and before the following combat fixture. Explicit native camera setup plus a held simulated click targets the placed block for breaking. Inspecting the combat retry identified pig suffocation/occlusion by that support block, not a client combat regression. The initial persisted-module hypothesis was incorrect. Modules/settings now reset before setup as additional fixture isolation.

## Reproduce

Use installed Chrome on this Mac, one full client at a time:

```sh
npm test
npm run build
node tools/serve.mjs 3012
# In another terminal:
CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/browser-check.mjs http://127.0.0.1:3012/
node tools/smoke.mjs
node tools/phase13-manifest.mjs
NATIVE_ARTIFACT=input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC.html node tools/phase13-gameplay-check.mjs file:///absolute/path/to/input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC.html
node tools/phase13-restart-check.mjs file:///absolute/path/to/input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC.html input/phase13/rc-profile
```

For an existing disposable world use `QA_SAVED=1` and its `QA_PROFILE` child of `input/phase13`. The original adapted baseline runner and raw local/browser evidence stay ignored. Rebuild an RC with the existing `tools/inject-eaglercraft.mjs --refresh` before manifest verification when integration source changes.

## Limits and publication

No new LAN run or human hardware test is claimed. The 35 Phase 11 physical passes remain historical; seven manual LAN checks remain deferred. Existing remote/reconnect and unknown-identity regression tests remain in the unit suite. The intermittent host-lobby issue remains unresolved: return the host to gameplay before accepting the guest. No open-ended lobby investigation ran.

Only reviewed source, tests, browser JavaScript bundle, sanitized reports and metadata are published. Candidate HTML, browser profiles, worlds, local storage, raw logs, audio samples and native inputs remain excluded. A normal branch push is followed by `tools/phase13-publication.py`: independent temporary-repository fetch, SHA/tree comparison, fsck, every tracked file's bytes, original checkout status/files and local/remote main identity. Its post-commit receipt stays in ignored `input/phase13/publication-verification.json`; the final response supplies the published SHA.

The remaining path to final release is release-specific physical input/audio QA and full per-module settings/lifecycle acceptance. Deferred LAN checks and the lobby workaround remain explicit. Native-dependent expansion still requires lawful complete pinned inputs and separate authorization. Stop after Phase 13.
