# RC4 release readiness

**Pending acceptance. Prepared for independent final QA; not final-release certification.** The exact artifact, native preservation and automated results are bound by artifact-manifest.json and verification.json. The standalone HTML stays local and ignored. No public HTML release is authorized.

## Independent final QA

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

Stop after Phase 15. The next task is the independent final quality audit. Publish the standalone HTML only under separate authorization after acceptance.
