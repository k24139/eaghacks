# RC4 release readiness

**CONDITIONAL — PENDING HUMAN ACCEPTANCE.** Independent targeted QA is complete; human certification remains pending. The exact artifact, native preservation and automated results are bound by artifact-manifest.json and verification.json. The standalone HTML stays local and ignored. No public HTML release is authorized.

## Independent final QA

The independent audit reviewed pinned commit `5799d3f415fbfe082497011924c76d7d93bff7d7` on 2026-10-21. Sanitized findings: [INDEPENDENT_QA_REPORT.md](../final-qa/INDEPENDENT_QA_REPORT.md) and [QA_RESULTS.json](../final-qa/QA_RESULTS.json). The reports agree on artifact/JavaScript hashes, three reviewed Phase 15 fixes, 28 targeted passing tests, build and smoke. No confirmed high-severity defects were found in the reviewed changes. Historical browser/gameplay results were reviewed, not independently rerun by that auditor; native preservation was reviewed from the existing manifest. This was a targeted source review and selected tests, not a comprehensive independent runtime audit.

Counts remain **41 gameplay-observed, 5 partial, 31 unsupported, 0 fully accepted, 0 newly failed**. Physical input, visual/combat/movement feel, listening, save/restart acceptance and the seven physical LAN checks remain human-pending. LAN reconnect reliability remains unverified. A broader independent runtime audit remains unperformed.

The following review guidance remains available for a broader audit:

Review the source/test diff from `e3c1455c3a119cd0e8f47676e6dd38279374bc8e`, the 77-module acceptance table and named evidence. Independently check native capability declarations, input/attack ownership, teardown, corrupt-settings recovery, external dependencies and publication preservation. Use risk-based setting/transition coverage, with particular attention to modified/mouse holds, combat owner changes and GUI focus. Do not infer all settings passed from a module toggle or persisted configuration equality.

Use the manifest's exact RC4 bytes in installed Google Chrome and a disposable world/profile. Record tester, date, OS/browser, artifact hash and pass/fail observations. Historical Phase 11 human results remain historical; no new human pass is claimed.

| Human check | Procedure / pass condition | Status |
| --- | --- | --- |
| Keyboard and mouse | Walk/strafe/jump/sprint, rotate, break/place, release all controls; no stuck input or camera drift. Include modifier and mouse AutoClicker holds and release. | Pending |
| Pointer lock and ClickGUI | Capture/release, open/close GUI, search/settings/keybinds, scroll, change desktop focus and return. Predictable lock restoration; no swallowed gameplay keys. | Pending |
| Combat and movement feel | Test KillAura target categories/range/rotation, interval and bounded falling preference; combine Criticals/TriggerBot/AutoClicker/Aim Assist. Disable mid-action; no burst, duplicate ownership or continuing control override. Native recovery determines damage. | Pending |
| ESP/HUD appearance | Observe labels/health, scale/opacity/color, moving/near/far entities, viewport resize and overlay cleanup. Confirm genuine player scope against the LAN evidence; no synthetic player substitution. | Pending |
| Audio listening | Hear menu clicks, walking, break/place and combat; adjust volume, switch focus, save/reenter. Correct playback and quality without interruption. Automated nonzero samples do not certify this. | Pending |
| Save/reentry/restart | Save, leave, reopen and restart; settings/binds/layout and eligible module intent return, with no stale input, commands or overlays. | Pending |

## Final handoff verification — 2026-10-21

Fresh development-worktree checks passed: `npm test` (193/193), `npm run build`, `node tools/smoke.mjs`, and the normal installed-Chrome browser harness (20/20). Hash-only verification using the existing manifest verifier independently extracted all six native payloads and compared them byte-for-byte with the preserved baseline; decoded WASM and source digest match the Phase 15 manifest. RC4 HTML SHA-256 remains `5d404a9f73c65acd1c4e453582301f507d6a7b307ebaa7a199284aea0c6c1b9d`; embedded JavaScript remains `889ba2bd7a3407fda37196b00b91f5f76c667c67c0caa25441a536607846f6e2`. Current source reproduces that embedded JavaScript with the established injection options/wrapping. RC4 was not rebuilt or modified.

The local Documents copy `Eaghacks-Human-QA.html` passed a separate SHA-256 check and byte comparison with RC4. A bounded visible installed-Chrome smoke opened that exact copy through `file://`, reached Minecraft's main menu, loaded a disposable single-player world, opened ClickGUI, toggled Coordinates through its GUI row and observed actual-position HUD text, disabled modules, saved/exited to the main menu with native world cleared, and shut down the integration with GUI removed. Seven assertions passed with no uncaught page errors. The initial local driver used the wrong save-menu coordinate; its incomplete run is excluded, and the corrected driver passed. Chrome required execution outside the filesystem sandbox. No product defect or source change was needed. Local raw logs/profile/world and the bounded helper remain ignored.

`Eaghacks-Human-QA-Checklist.md` beside the Documents HTML covers physical input, pointer lock, combat, movement, visuals, listening, save/reentry/browser restart and the seven optional physical LAN checks with PASS/FAIL/NOT TESTED fields. Open the HTML with Google Chrome via Open With or Chrome's Open File command; no development server is needed. These handoff checks are separate from the independent auditor's selected tests and from historical gameplay suites. They do not establish human input, visual feel or audio acceptance. No full exploratory Phase 15 rerun occurred.

## Seven deferred physical LAN checks

The bounded automated local session passed 18 assertions: initial host/guest join with the host still in the peers screen, Back/Escape, responsive gameplay, movement and disconnect cleanup. Genuine other-player ESP passed detection/self exclusion, player/range filters, rendered tracking and cleanup. Re-invitation timed out after 30 seconds; reconnect reliability stays outside verified scope. Details are in verification.json and PHASE15_REPORT.md. It cannot complete physical navigation acceptance. Use two authorized private participants and disposable worlds; retain the historical return-host-to-gameplay-before-guest-acceptance workaround wherever the lobby remains unreliable.

| Check | Human status |
| --- | --- |
| Host creates disposable LAN session | Pending |
| Guest accepts while host stays on invitation screen | Pending |
| Physical Escape navigation after acceptance | Pending |
| Physical Back navigation after acceptance | Pending |
| Return to responsive host gameplay | Pending |
| Guest movement visible to host | Pending |
| Cleanup after disconnect | Pending |

Any blocked LAN/positive-player scopes stay outside the verified release scope. Do not begin a multiplayer rewrite. Retain five partial and 31 unsupported native contracts; the audit must assess their visible explanations and supported subsets. No universal critical/readiness guarantee is possible from the published immutable snapshot contract.

Only reviewed source, tests, the existing framework JavaScript bundle and sanitized reports/metadata are published to `meteor-client-integration`. The independent publication checker verifies remote commit/tree/tracked bytes, main, original checkout and historical artifacts. Its post-commit receipt is local at `input/phase15/publication-verification.json`.

Stop after Phase 15. The next task is human acceptance testing. Publish the standalone HTML only under separate authorization after acceptance.
