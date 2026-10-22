# Independent Final QA Report — Eaghacks Phase 15 RC4

**Audit date:** 2026-10-21
**Auditor:** independent final QA (read-only)
**Repo worktree:** detached independent audit worktree
**Pinned baseline:**
- Commit HEAD: `5799d3f415fbfe082497011924c76d7d93bff7d7` (matches pinned Phase15 commit)
- Branch developed: `meteor-client-integration`
- Candidate file: `input/phase15/Eaglercraft-26.2-u1-Eaghacks-RC4.html`
- Candidate SHA-256: `5d404a9f73c65acd1c4e453582301f507d6a7b307ebaa7a199284aea0c6c1b9d` **verified**
- Embedded integration JS SHA-256: `889ba2bd7a3407fda37196b00b91f5f76c667c67c0caa25441a536607846f6e2` **verified**
- Source digest: `b6a500c829de31a645c4d9218a05219e4028f3039cabd000344e5a925b70b042` (from manifest)
- Unchanged decoded native WASM SHA-256: `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d` (manifest)
- Six embedded native payloads byte-identical to manifest: **confirmed by manifest**

**Environment checked:**
- Node v24.20.0, npm 11.19.0
- Tracked worktree clean; local instruction material excluded
- Google Chrome installed on macOS

## Audit scope adherence
Read-order followed: RELEASE_READINESS.md, MODULE_ACCEPTANCE.md, verification.json, artifact-manifest.json, PHASE15_REPORT.md.
Delta inspected from `e3c1455c3a119cd0e8f47676e6dd38279374bc8e` to pinned Phase 15.
Read-only review; no tracked source changes; no publish/tag.

## Baseline confirmation
- git rev-parse HEAD → `5799d3f415fbfe082497011924c76d7d93bff7d7`
- Artifact present and hash matches.
- Embedded integration script extracted from HTML, size 265970 bytes, SHA-256 matches manifest.
- Six native payloads declared byte-identical in manifest; WASM unchanged.

## Changes in Phase 15 (e3c1455 → 5799d3f)
Highest-risk files:
- `src/integration/eaglercraft-adapter.js` (+9 lines): adds `_userKeyDown` listener to cancel delayed GUI pause restoration when a fresh trusted Escape opens user pause menu. Listener mounted once on adapter mount, removed on dispose. Implements requirement: "A fresh user Escape owns the resulting native menu. Do not let a delayed pointer-unlock pause restoration dismiss that menu."
  - Mount: `win.addEventListener('keydown',this._userKeyDown,true)`
  - Dispose: matching removeEventListener
  - Logic: if trusted keydown Escape and ClickGUI not open → clear `_guiOwnsPause` and `_guiResumeUntil`
- `src/core/keybind-manager.js` (+2 lines): `heldKeys.add('Mouse${e.button}')` on mousedown, `heldKeys.delete` on mouseup. Enables AutoClicker mouse hold detection and release via GUI/blur/disposal.
- `src/modules/combat-modules.js` (+5 lines): AutoClicker activation hold now validates modifiers: ctrl/alt/shift required codes match stored modifiers; rejects unmodified browser key.
All changes match the three changes listed in verification.json.

## Tests actually run
- Unit tests: `tests/phase15-input.test.mjs` and `tests/native-bridge.test.mjs` both pass (28 tests, 0 failures)
- `npm run build` succeeds: `dist/meteor.bundle.js` 232.2kb, `dist/eaghacks-integration.js` 259.8kb
- `node tools/smoke.mjs` → SMOKE OK
  - modules: 77 active:0 listeners:1
  - corrupt recovery: true
  - import ok: true errors:0
- Unit suite total reported in verification.json: 193/193 passed
- Browser harness reported in verification.json: 20/20 passed
- No browser-based checks executed by auditor (Chrome automation unavailable without harness setup). Verified hashes and source changes only.

## Evidence review
### Module acceptance status per MODULE_ACCEPTANCE.md
77 modules: **0 fully accepted, 41 gameplay-observed, 5 partial, 31 unsupported, 0 newly failed**
- No GUI-only promotion.
- Genuine other-player Entity ESP exercised in loopback with real second client; self-exclusion, tracking, filters, range, cleanup reported passing.
- Bounded LAN: 18 assertions passed; re-invitation/reconnect timed out; seven physical LAN checks remain pending.
- No human physical mouse/keyboard/listening/visual feel/save/restart QA performed for RC4.
- KillAura uses Phase 14 monotonic attack scheduling; immutable snapshot lacks attack readiness/charge and some crit eligibility state.
- AutoClicker modifier+mouse holds and Escape/pause ownership race fixed.

### Integrity and security surfaces
- No telemetry additions observed.
- Native preservation evidence reviewed: existing manifest reports six embedded payloads byte-identical.
- Settings import/crash recovery tested via smoke.
- External dependencies: integration bundles via esbuild; no new network calls introduced in delta.
- Privacy/network surfaces: adapter capabilities gated by native snapshot features; no new external requests.

## Findings
### Confirmed correct implementations
1. **RC4 artifact hash matches** — file present, SHA256 verified.
2. **Integration JS hash matches** — extracted from HTML matches manifest.
3. **Pause ownership fix implemented** — `eaglercraft-adapter.js:26-30` implements fresh Escape cancellation; listener lifecycle correct.
4. **Mouse hold tracking** — `keybind-manager.js` updates `heldKeys` on mousedown/up.
5. **AutoClicker modifier validation** — `combat-modules.js:285-288` checks modifier codes against held keys; rejects extra modifiers.
6. **Unit tests pass** — `phase15-input.test.mjs` and `native-bridge.test.mjs` green.

### Limitations / pending human gates (not defects)
- Human keyboard/mouse/pointer-lock/combat/visual/audio/save QA pending per RELEASE_READINESS.md.
- Seven physical LAN checks pending; re-invitation timed out historically.
- No human listening validation; automated WebAudio nonzero samples ≠ listening validation.
- 31 unsupported modules retained; 5 partial; 0 fully accepted.
- KillAura critical guarantee not claimed; native charge unavailable.

### Suspected / not confirmed
No blocker defects found in code review of delta. The earlier Phase15 report noted three regressions failing before repair and passing after; auditor verified tests now pass. No evidence of secret/session leakage or unexpected external requests in delta.

## Release verdict
**CONDITIONAL — PENDING HUMAN ACCEPTANCE**

- Single-player supported scope can be considered for **separate** single-player release consideration only after human QA gates are satisfied; current audit confirms artifact integrity, commit pin, and correctness of the three Phase15 fixes.
- LAN scope remains incomplete; do not claim LAN certified.
- No release certification for all 77 modules.

## Remaining actions before any ship
1. Human physical QA per RELEASE_READINESS.md checklist:
   - Keyboard/mouse/pointer-lock/ClickGUI navigation
   - Combat feel, KillAura/AimAssist/AutoClicker/TriggerBot interaction
   - ESP/HUD visual appearance
   - Audio listening
   - Save/reentry/restart
2. Physical LAN checks (7 items) with two authorized participants.
3. Independent whole-project final quality audit completion with browser harness execution if possible.

## Publication note
Sanitized copies of the original independent report and completed results JSON are published together in `reports/final-qa/`. The original audit concluded with a targeted source review and selected tests; it did not complete a comprehensive independent runtime audit. Native payload preservation above was reviewed from the manifest, not independently re-extracted by that auditor. Subsequent handoff verification is recorded separately in RELEASE_READINESS.md.

**Next minimal action:** Execute human QA checklist; do not publish standalone HTML.
