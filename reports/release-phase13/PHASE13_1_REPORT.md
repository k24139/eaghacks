# Phase 13.1 — Restore module availability inside ClickGUI

Starting commit: `804480bc5598cf4139ea95b3202c8ba3a30b939d`. Integration worktree only. The original Phase 13 HTML was reproduced directly from disk in installed Chrome using a task-owned disposable-world profile. No Java, Gradle, TeaVM, native compilation, source recovery, LAN investigation or Phase 14 work ran.

## Root cause and repairs

Opening Right Shift released pointer lock and opened the native `PauseScreen`. Both readiness flags stayed true, and the native player/world remained present with the same capabilities. Nevertheless, `adapter.inWorld()` returned false because it rejected `session.paused` and any non-null game screen. KillAura, BunnyHop and Entity ESP were visibly gray and real category-row clicks left them inactive with “requires a loaded world.” Closing ClickGUI made them eligible again.

Repairs are deliberately separate:

- `eaglercraft-adapter.js`: loaded native-world recognition requires readiness plus native player **and** world. Pause/screen/GUI/focus restrictions remain in `_gameplayInputAllowed()`. Phase 12 movement/combat feature gates are unchanged. No world requirement or capability validation was removed.
- `clickgui.js`: refresh existing row status/title when opening. The first partial fix allowed activation but left stale startup “missing capabilities” warnings, which the new test correctly rejected. Refreshing rows preserves settings panels and layout.
- `clickgui.js`: always synchronize restored category expansion state with its body and indicator. A collapsed saved model previously left its body visible, covering another category header after restart.
- `config-manager.js`: serialize module binds explicitly. Cleared `null` binds were omitted as defaults, allowing constructor presets for Zoom, Module Search and Screenshot Utilities to return after restart. The all-41 settings comparison exposed this and a focused old-commit regression reproduces it.

## Actual-client acceptance

The new runner checks the displayed availability, uses normal category-header/collapse controls and real row clicks, closes ClickGUI and observes native gameplay. Direct module API calls are limited to fixture reset; they do not substitute for activation evidence. Native state is never replaced.

Before opening, while open and after closing are recorded separately. In RC2 a paused loaded world stays loaded, supported rows remain available, toggles become active, and gameplay commands remain blocked while the GUI owns input. On actual world exit the native snapshot/capabilities disappear, all three priority modules become unavailable, and their eligible intent resumes on reentry.

Priority behavior:

- **KillAura:** GUI activation and retention; passive filter rejects a pig until enabled; actual damage; configured range rejection and damage after moving into range; disable stops damage and clears queued attacks; exit clears combat state.
- **BunnyHop:** GUI activation and retention; no jump without sprint under sprint-only settings; real jumping while sprinting; disable stops jumping; native pause/world exit releases synthetic input.
- **Entity ESP:** GUI activation; visible passive and hostile overlays with filter exclusion; local self exclusion; rendered rectangle moves with a real pig teleport; disable/exit clears overlay pixels. Dropped-item fixtures were cleared so the tracking assertion measures the pig. No second real player was present, so positive other-player filtering is not claimed.

The exact existing cohort of **41 gameplay-observed modules** is checked for visible availability and real GUI enable/disable. Settings from all 41 are compared across a Chrome process restart. Status classifications remain **41 gameplay-observed, five partial, 31 unsupported**; this pass does not promote unsupported modules or certify every behavior/setting combination anew.

## Testing blind spot and regression coverage

Phase 13 enabled gameplay modules directly through JavaScript and tested GUI opening/closing separately. It did not click world-dependent category rows while native pause owned the screen or verify their displayed status. An older unit test also explicitly expected a paused native world to be unloaded; its world assertion is corrected while its input-refusal assertion remains.

Five added unit regressions cover paused loaded worlds with blocked commands, missing player/world/readiness and partial native flags, stale row display, restored collapsed panels and cleared preset binds. `tools/phase13_1-gameplay-check.mjs` fails on the original defect by default; `--before` explicitly records the expected original failure. The separate restart runner reopens the saved world and rechecks priority GUI availability. Raw profiles, worlds, settings snapshots, intermediate failures and browser logs stay ignored.

Final validation passed: **170/170 unit tests**, **20/20 browser checks**, build and smoke; **197 actual-client checks** and **11 restart/recovery/shutdown checks**. All 41 setting sets survive a process restart, including the cleared binds. The saved world reopens after restart with priority module intent and correct visible availability. These are browser automation results, not human hardware testing.

RC2: `input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC2.html` (80,979,395 bytes). HTML SHA-256 `16d3707a4050dfe63b139367aa7654bf291a45d71badafd30d5a6d5c7777b3d3`; source digest `d96fd80e27d3db49e6316706ef0acbe4f6e429ee457615f86879c849e6d7c702`; client WASM SHA-256 `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d`. `rc2-manifest.json` also records JavaScript and all six payload identities.

Final automated/actual totals and sanitized state evidence are in `phase13_1-verification.json`. The final RC2 identity is in `rc2-manifest.json`; all six native payloads and decoded WASM match the baseline byte-for-byte. Previous Phase 11/12/13 HTML artifacts are preserved.

## Reproduce and publish

Run `npm test`, `npm run build`, `node tools/smoke.mjs`, and the existing browser harness using the loopback server on port 3012 with installed Chrome. For actual gameplay:

```sh
node tools/phase13_1-gameplay-check.mjs input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC2.html
node tools/phase13_1-restart-check.mjs file:///absolute/path/to/input/phase13/Eaglercraft-26.2-u1-Eaghacks-RC2.html input/phase13_1/profile
```

The default task profile used for this run contains a copy of the previous task's disposable world. A fresh profile creates a disposable world through the normal UI. No personal browser profile or original world is used.

Only source, tests, browser JavaScript bundles and sanitized reports/identities are committed. HTML, profiles, worlds, sessions, local storage and raw data stay excluded. A normal branch push is independently checked by `tools/phase13_1-publication.py`: SHA/tree, fsck, every tracked file's bytes, original checkout status/files, local/remote main and all preserved artifact hashes. Its post-commit receipt stays in `input/phase13_1/publication-verification.json`; the final response gives the published SHA.

Remaining limitations: five partial/31 unsupported contracts, release-specific human input/audio QA and the seven deferred LAN checks. No physical mouse or human listening claim is made. Stop after Phase 13.1.
