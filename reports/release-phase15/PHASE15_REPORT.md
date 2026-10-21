# Phase 15 — Final acceptance and RC4

Started from e3c1455c3a119cd0e8f47676e6dd38279374bc8e on meteor-client-integration, integration worktree only. RC4 is **pending acceptance** and prepared for the independent final quality audit. No final-release certification is claimed. No next development phase ran.

## Fixes and stabilization

- AutoClicker now honors Ctrl/Alt/Shift activation modifiers, including rejecting extra modifiers. Mouse activation binds now receive held-button state and release through mouseup, GUI, blur and disposal.
- Fixed delayed ClickGUI pause restoration dismissing a fresh user Escape menu. A fresh trusted Escape transfers menu ownership to the user; consumed GUI-close and synthetic restoration keys preserve normal cleanup. The new listener mounts once and is removed at shutdown.
- Three behavioral regressions failed before repair and pass afterward; a fourth new test covers listener installation/disposal. Retained the Phase 14 KillAura scheduler and native recovery semantics. No module expansion, native compilation, source recovery, dependency addition or speculative optimization.

## Exact-candidate verification

193/193 unit tests, build, smoke and 20/20 installed-Chrome harness checks pass. Exact final RC4: **100 complete gameplay assertions**, **56 focused module checks**, **198 GUI/lifecycle checks**, **119 cohort transition assertions** and **13 actual process-restart/recovery/shutdown checks**. Suites overlap; these counts are not a count of unique behaviors or fully accepted modules.

Standalone file launch, real private-world combat/movement/render/GUI, real native damage and block actions, nonzero WebAudio samples, disable/cleanup, invalid settings recovery and saved-world restart are covered. All 41 observed setting sets survive actual process restart. Final cohort coverage verifies the 38 persistent observed modules across real world exit/reentry; three one-shot utilities use GUI/action checks. New holds, five-module combat ownership, secondary disable, alternate HUD layout and Zoom settings are checked with native data. No weapon-recovery exploratory investigation was repeated; unchanged Phase 14 evidence remains scoped and reusable.

The initial GUI origin fixture timed out; reentry showed the player below its platform. The driver now explicitly waits for loaded chunks and grounded y=150. Subsequent cohort testing exposed the genuine GUI ownership race described above. Preliminary candidate bytes and evidence are archived locally and excluded from final-byte counts. The final source was rebuilt and the final native suites rerun. Human physical operations and listening remain separate from browser automation. No performance concern was observed; no broad performance comparison or optimization certification is claimed.

## Module acceptance and multiplayer

77 registered: **0 fully accepted, 41 gameplay-observed, 5 partial, 31 unsupported, 0 newly failed**. MODULE_ACCEPTANCE.md and verification.json distinguish functional, setting, GUI, transition, persistence and human criteria. Risk-based coverage is used; no mathematically exhaustive combination sweep is required or claimed. Human visual/control/feel criteria remain pending. Partial and unsupported native contracts are retained accurately.

The bounded loopback attempt stopped at reconnect, with 18 completed assertions on the exact final RC4. Initial join while the host stayed in the peers screen, Back/Escape, responsive host gameplay, guest movement and disconnect cleanup passed. Re-invitation timed out after 30 seconds; reconnect camera/HUD intent and LAN shutdown assertions were therefore not reached. Other-player ESP disposition: verified genuine-player detection/self exclusion, player filter, rendered tracking, range and disable cleanup. Remaining uncompleted LAN scopes stay unverified. LAN testing stopped after three bounded attempts; incomplete setup/delivery attempts are disclosed in verification.json. No transport rewrite ran. Single-player restart/shutdown evidence remains separate.

The initial successful lobby probe advanced native publication sequence by 197 and world tick by 268 while the guest became remote; no host-lobby freeze was reproduced in that probe. This does not resolve the historical intermittent limitation. The re-invitation timeout is retained separately without attributing a native root cause.

The LAN driver uses two isolated Chrome contexts and preserved local discovery/server helpers, with loopback signaling and no STUN/TURN in the test. This is QA infrastructure, not a new embedded product dependency. Seven deferred physical LAN items remain human-pending even where automated counterparts pass. RELEASE_READINESS.md consolidates their disposition and the final independent/human checklist. Any blocked multiplayer scope is outside the verified release scope; the historical intermittent lobby limitation is not declared universally resolved.

## Artifact and preservation

Local ignored artifact: input/phase15/Eaglercraft-26.2-u1-Eaghacks-RC4.html.

HTML SHA-256: 5d404a9f73c65acd1c4e453582301f507d6a7b307ebaa7a199284aea0c6c1b9d.

Embedded integration JavaScript SHA-256: 889ba2bd7a3407fda37196b00b91f5f76c667c67c0caa25441a536607846f6e2.

Source digest: b6a500c829de31a645c4d9218a05219e4028f3039cabd000344e5a925b70b042.

All six embedded native payloads are byte-identical to the verified baseline. Decoded WASM SHA-256 remains aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d. RC3 and all captured historical HTML are preserved. No Java, Gradle or TeaVM rebuild ran. artifact-manifest.json binds exact bytes, source digest, injection/verification tools, regression tests and local QA helper identities.

## Reproduce and publication

Use the commands in verification.json with installed Google Chrome, fresh dedicated profiles for a fresh full run, and one full client at a time except the bounded two-client LAN test. Keep HTML, profiles, worlds, audio, screenshots and raw diagnostics local. Source changes require refreshing RC4 and revalidating its exact hash.

Only reviewed source, tests, the existing framework JavaScript bundle and sanitized metadata/reports are published to meteor-client-integration. No standalone HTML release is authorized. tools/phase15-publication.py independently fetches the pushed commit into a temporary repository and verifies commit/tree identity, Git integrity, every tracked byte, original checkout contents/status, local/remote main and historical artifacts. Its post-commit receipt remains local at input/phase15/publication-verification.json; the completion response supplies the published commit.

Remaining acceptance: human keyboard/mouse/pointer-lock/combat/visual/audio/save QA; deferred physical or blocked LAN scopes above; independent whole-project final quality audit. Stop after Phase 15.
