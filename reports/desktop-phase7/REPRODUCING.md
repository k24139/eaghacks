# Phase 7 reproduction

Run in the integration worktree. No Java/TeaVM compilation is needed.

1. Read `initial-state.json` and `runtime.json`. Verify the recovered original HTML
   at `/Users/aaron/Documents/eaghacks-recovery/Eaglercraft-26.2-u1-Meteor-Native.html`.
   Preserve the Phase 6 standalone at `input/phase6/native.html`.
2. Refresh only the browser integration:
   `node tools/inject-eaglercraft.mjs input/phase6/native.html input/phase7/native.html --refresh`
   then `node tools/phase7-runtime.mjs input/phase7/native.html`.
3. Start the loopback static server: `node tools/serve.mjs 3006 .`.
   `node tools/phase7-webrtc.mjs` launches two dedicated headed profiles, exchanges
   SDP and candidates locally, requires open data channels and bidirectional messages,
   writes the result even on failure, and closes its browsers. Stop multiplayer if it fails.
4. Use a disposable copy of the existing task profile, or import the verified fixture
   through the Phase 4 workflow. Do not reuse/modify a personal or benchmark profile.
   Launch `node tools/phase7-session.mjs input/phase7/desktop-profile http://127.0.0.1:3006/input/phase7/native.html --headed`.
   Session commands are trusted local JavaScript; use short helper calls to avoid
   macOS PTY canonical-line limits. Navigation timeout 90 s, default interaction 15 s,
   command timeout 120 s. An expired command is a failure; inspect before retrying.
5. Use the exported functions in `phase7-checks.mjs`. They read real native snapshots;
   they do not synthesize world/player state. `enterSaved` assumes the first saved
   row; confirm it is selected and Play enabled. Foreground the tab. `desktop`,
   `lifecycle`, `focusWithoutEmulation`, `reentry`, and `shutdownProbe` cover the
   targeted paths. Shutdown is destructive to that runtime instance; reload afterward.
6. Install `phase7-audio-probe.js` with `context.addInitScript({path: ...})` before
   reload to capture the actual game master graph through MediaRecorder. The probe
   is QA-only and is never injected into the delivered standalone. Use the exported
   capture helpers in `phase7-audio.mjs`; `phase7-final.mjs` decodes the recordings.
   The master graph gain may remain 1 while the game suppresses playback at mute.
7. For private multiplayer, retrieve the exact upstream paths in `upstream-sources.json`
   from `aerograde/eagle-26.2` at the recorded revision. Compare Git blob SHA-1 and
   SHA-256 before use. Keep them ignored under `input/phase7/`.
   Replace the static server with:
   `node input/phase7/lan-server.mjs --dir . --host 127.0.0.1 --port 3006 --room phase7`.
   `phase7-lan.mjs` loads the unchanged helper before boot, uses a second isolated
   headed profile, records actual channels and gameplay, and samples memory every
   10 s (stopping the guest below 15% reported free). Never start a second game
   unless preflight passed. Close the guest through `close()` in a finally block.
   LAN helper peer state is `open`. The host lobby does not automatically close.
   After disconnect, return the guest from JoinMultiplayerScreen to TitleScreen.
   If lobby controls stop responding, preserve `inspect()` evidence and stop;
   do not claim the combined reconnect assertion passed.
8. `phase7-loss.mjs` closes only the task guest's gameplay channel (`label=lan`),
   requires native-state/input cleanup, and preserves the disconnect screenshot.
9. Close owned contexts and servers. Run `npm test`, `npm run build`,
   `node tools/smoke.mjs`, and the focused browser harness with Chrome:
   `CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/browser-check.mjs http://127.0.0.1:3006/harness/index.html`.
   The harness is synthetic evidence, separate from actual gameplay.
10. `python3 tools/phase7-audit.py` checks only new Phase 7 PNGs. The 30 damaged
    historical PNGs remain INVALID and must not be reused as visual evidence.

Profiles, IndexedDB, large standalone HTML and local publication receipts stay
ignored. Publish source, reports and selected task captures with normal Git CLI;
independently fetch and compare the published tree and bytes. No force push/main changes.
