# Phase 14 — Gameplay quality and experimental RC3

Started from `0287de1bcf7ebb1a086f5df986c7742b2403afd9` on `meteor-client-integration`, integration worktree only. RC3 is an **experimental candidate**, not final-release certification. No exhaustive acceptance promotion is claimed. No Phase 15 work ran.

## Changes

- Replaced KillAura's rounded tick counter and extra waiting tick with monotonic deadlines, fractional interval accounting, bounded CPS variation, target-switch delay, stall backlog discard and one batch per callback. Default is 2 attempts/s; configurable 0.5–20. Existing saved CPS is preserved.
- Rotation advances between attacks with elapsed-time smoothing; multi-target mode faces the primary once and limits batches to 16. Invalid position/health snapshots, friend/self/dead targets, range and category filters are checked before delivery.
- Added bounded prefer-falling scheduling using real grounded/fall-distance/vertical-velocity snapshots and known exclusions. Criticals uses filtered aura targets and no longer claims that jumping forces critical damage. Packet mode remains unavailable.
- TriggerBot's delay accounts for elapsed ticks and resets on toggles. TriggerBot and left AutoClicker yield attacks to KillAura; secondary-module disable preserves a primary owner's queue. AutoClicker resets residual fractions on disable/input blocking and limits delivery to one click per side per callback.
- Fixed Macros' missing keyboard route and modifier matching. Registered client module bind steps now execute; native chat and arbitrary game key injection remain unavailable and explicit. UI/typing/world exit cancels running sequences.
- Target HUD excludes dead/nonliving targets; the health bar follows scale and displayed line count. Target armor, Fullbright night vision and independent NoHurtCam tilt are retained as visibly unavailable controls with reasons. Supported brightness and whole hurt-camera controls remain.
- Fixed hidden ClickGUI search focus swallowing gameplay keys after programmatic close. The new regression fails before the repair and passes after; native repeated-toggle acceptance verifies focus release, then recaptures the canvas before issuing chat commands.
- Reused the existing actual-client, GUI, module and restart tools with isolated Phase 14 output roots and tool identity hashes. Preserved setting-listener and stale-availability regressions remain in the suite.

## Combat findings

The native package name `v1_8` does not identify the combat model. Native metadata names gameVersion 26.2 and the verified overlay calls gameMode.attack; the immutable snapshot contract has no attack-charge/readiness field. Real iron-axe second-hit damage is lower at 650 ms than at 1600 ms, proving modern recovery behavior in this runtime. RC3 schedules attempts and lets native recovery determine damage; it does not fabricate readiness.

Grounded and naturally falling recovered sword hits deliver different actual health reductions in a controlled dry/unmounted fixture. Prefer-falling and Criticals do not certify universal native critical eligibility: charge, fluid, climbing and passenger state are not exposed. Exact observations and attempt gaps are in COMBAT_VERIFICATION.md and verification.json.

## Acceptance scope

77 registered: **0 fully accepted**, **41 gameplay-observed but not exhaustively accepted**, **5 partial**, **31 unsupported**, **0 newly failed**. MODULE_ACCEPTANCE.md distinguishes current functional checks from GUI, lifecycle, persistence and historical evidence for every module. No unsupported module was promoted. AutoWeapon's feasible ID-only hotbar-ranking subset was reviewed but not implemented or certified; metadata still lacks attack-damage/enchantment ranking.

Positive other-player Entity ESP behavior remains unverified. The real local-self exclusion and passive/hostile filters are covered; a fabricated player snapshot is not counted as gameplay evidence. Comprehensive per-setting interaction and lifecycle combinations remain pending.

## Verification

**189/189 unit tests**, build, smoke and **20/20 installed-Chrome browser harness checks** pass. The exact final RC3 passed **211 combat/GUI/lifecycle checks**, **83 unique broader gameplay/lifecycle assertions** across hash-identical checkpoints (70 individually passed prefix assertions and 21 in the completed continuation, with duplicates removed), **56 unique focused module checks**, and **13 actual process-restart/recovery/shutdown checks**. All 41 observed module setting sets survived restart; nondefault new KillAura settings and modifier-aware macro definitions were separately compared across processes. Actual-client evidence is separate from unit mocks and synthetic harness checks.

Physical input, human listening and combat feel were not performed by a human in this session. Use PHYSICAL_QA.md as the consolidated acceptance checklist. Seven deferred LAN checks remain pending; the historical intermittent host-lobby limitation and return-to-gameplay workaround remain explicit. A short descriptive single-client heap/tick/listener sample is recorded; no optimization or broad performance certification is claimed.

Setup/test corrections are disclosed in verification.json. Early origin-platform probes were invalid after a fall into unloaded fixture terrain. An initial disable test sampled before an already-committed native hit updated health; final checks separate queue clearing and new-attempt cessation from settling native delivery. A test-only unqualified reference to a correctly deleted command queue was fixed. An intermediate run was stopped for the secondary queue ownership repair. The final broad suite uses individually passed hash-identical prefixes plus a completed continuation, with duplicate check names removed. Saved-world food/hunger isolation and normal canvas recapture after programmatic GUI stress were corrected in the driver. These runs are not counted as completed final acceptance sweeps.

## Artifact and preservation

Local ignored candidate: `input/phase14/Eaglercraft-26.2-u1-Eaghacks-RC3.html`.

RC3 SHA-256: `54b88a50d23b58955360d945178fe7776e0e1c545a3a4112d8ca5e05e8aaad6e`.

Embedded integration JavaScript SHA-256: `dc3bb76a70d1cdade914c133e1738f97b31795656592674c484db8ad14580d75`.

Source digest: `844737019ae0e1efb5ca63c5a0cdc6573c256fbce94d9fb45a43e7d62ee0f508`.

artifact-manifest.json binds HTML, embedded integration JavaScript, source digest, injection tool and all verification tools. All six embedded native payloads are byte-identical to the verified baseline; decoded WASM remains `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d`. RC2 and every captured earlier HTML remain unchanged. No native payload, Java, Gradle or TeaVM rebuild, source-recovery attempt or full native optimization ran.

## Reproduce

Use installed Google Chrome on this Mac, one full game client at a time:

```sh
npm test
npm run build
node tools/smoke.mjs
node tools/serve.mjs 3014
# Separate terminal, synthetic browser harness:
CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/browser-check.mjs http://127.0.0.1:3014/
node tools/inject-eaglercraft.mjs --refresh input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC2.html input/phase14/Eaglercraft-26.2-u1-Eaghacks-RC3.html
node tools/phase14-manifest.mjs
node tools/phase14-gameplay-check.mjs input/phase14/Eaglercraft-26.2-u1-Eaghacks-RC3.html
node tools/phase14-restart-check.mjs file:///absolute/path/to/input/phase14/Eaglercraft-26.2-u1-Eaghacks-RC3.html input/phase14/profile
NATIVE_ARTIFACT=input/phase14/Eaglercraft-26.2-u1-Eaghacks-RC3.html node tools/phase14-full-check.mjs file:///absolute/path/to/input/phase14/Eaglercraft-26.2-u1-Eaghacks-RC3.html
node tools/phase14-report.mjs
```

Use a new profile for a new-world full sweep or `QA_SAVED=1` with the existing disposable full-check profile. Focused checks append to ignored evidence; archive previous JSONL before a fresh sweep. Keep HTML, browser profiles, worlds, raw diagnostics, audio samples and screenshots local. Changes to source require refreshing RC3 and revalidating its exact hash.

## Publication and remaining blockers

Only reviewed source, regression tests, the framework JavaScript bundle, sanitized reports and metadata are published. The standalone HTML remains ignored. `tools/phase14-publication.py` independently fetches the pushed commit into a temporary repository and compares commit/tree identities, Git integrity and every tracked byte; it also checks original checkout contents/status, local/remote main and historical HTML hashes. Its post-commit receipt remains local at `input/phase14/publication-verification.json`; the completion response supplies the published commit.

Before Phase 15, complete release-specific human input/pointer-lock/audio/combat acceptance, exhaustive module setting/transition/interaction scopes and actual other-player ESP verification. Resolve or explicitly retain the seven deferred LAN checks and historical lobby limitation in release scope. An independent whole-project quality audit remains required before final certification. Phase 14 delivers the coherent verified gameplay improvement subset; it does not certify all exit criteria for final release preparation.
