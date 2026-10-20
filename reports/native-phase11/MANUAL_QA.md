# Phase 11 physical QA baseline

Physical results remain PENDING until individually reported by the user. Automated Chrome results cannot fill this checklist. Installed browser: Google Chrome 155.0.8059.80; macOS 26.4 (25E246), arm64; user describes Apple M4 MacBook Air with 16 GB. Mouse, audio hardware, actual browser used, operator and physical test time remain unreported. See manual-results.json for every individual status and observation.

The user reported a setup error: the helper was launched from the original checkout and was not found. An explicit working-directory correction was supplied; this does not establish any client input/audio failure.

## Reopen the exact client

In BOTH terminals, starting from the original repository directory, first run:

```sh
cd input/phase4-worktree
```

Do not run from the original checkout. Verify the preserved client before starting:

```sh
shasum -a 256 input/phase8/native-fixed.html
```

Expected SHA-256: 9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0.

Terminal 1 (if 3006 is occupied, identify the owner; do not kill an unrelated service):

```sh
node input/phase7/lan-server.mjs --dir . --host 127.0.0.1 --port 3006
```

Terminal 2:

```sh
node tools/phase9-session.mjs input/phase9/phase10-manual-profile http://127.0.0.1:3006/input/phase8/native-fixed.html --headed
```

At READY, paste into Terminal 2:

```js
await context.addInitScript({path:'input/phase7/lan-discovery.js'}); await page.reload();
```

This reuses the Phase 9 local server and dedicated Phase 10 task profile, never a personal or benchmark profile. Do not run a second helper against the same profile. Complete profile/title screens and create a new disposable world named Phase11-QA. Leave all existing worlds unchanged. Prefer Creative with cheats for sound checks. A suitable unlocked interactive desktop is required; automation and a locked display cannot establish physical testing.

## Procedure and recording

1. Physically move the mouse continuously left/right and up/down for 15 seconds each, then repeat full turns. Observe smoothness, snapping and recentering. Press Escape, resume and click the canvas to reacquire lock. Switch away from Chrome and return; repeat camera movement.
2. Test each W/A/S/D direction, Space jump, configured sprint and sneak controls. Open/close inventory (normally E), chat (T/Escape), and ClickGUI (Right Shift/Escape). Search using movement letters and spaces, scroll a panel, toggle a harmless HUD module and change/restore its setting. After leaving/returning, check that no movement or mouse button remains held.
3. Listen for menu clicks, place/break blocks, and entity/ambient sounds. Where cheats allow, `/playsound minecraft:entity.pig.ambient master @s` can provide a sound stimulus. Adjust volume, mute and restore it. Switch tabs and refocus the window, listening afterward. The existence of audio API events is not evidence of heard audio.
4. With a second human participant and separate disposable task profile/device, host private LAN and invite the guest. The guest accepts while the host remains on the invitation screen. Test physical Escape and Back separately, verify responsive host gameplay and visible guest movement, then disconnect and inspect cleanup. Do not publish invitation strings, addresses or session identifiers. If no second participant is available, keep these checks PENDING. Preserve the previously verified workaround: return host to gameplay before guest acceptance. Stop after a failure, record exact steps and do not repeatedly stress the browser.
5. Report each check ID/result (PASS, FAIL, PENDING or BLOCKED), operator, local date/time, actual browser version, mouse and audio hardware, and observations. BLOCKED must include a concrete reason. Never infer PASS from another check.

Each individual check and current status:

- `mouse-01` **PENDING** — Smooth continuous physical camera rotation
- `mouse-02` **PENDING** — Look up/down
- `mouse-03` **PENDING** — Repeated full turns
- `mouse-04` **PENDING** — No unexpected camera snapping
- `mouse-05` **PENDING** — No unexpected cursor recentering
- `mouse-06` **PENDING** — Escape releases pointer lock
- `mouse-07` **PENDING** — Click gameplay reacquires pointer lock
- `mouse-08` **PENDING** — Pointer lock after switching away and returning
- `keyboard-interface-01` **PENDING** — W movement
- `keyboard-interface-02` **PENDING** — A movement
- `keyboard-interface-03` **PENDING** — S movement
- `keyboard-interface-04` **PENDING** — D movement
- `keyboard-interface-05` **PENDING** — Jump
- `keyboard-interface-06` **PENDING** — Sprint
- `keyboard-interface-07` **PENDING** — Sneak
- `keyboard-interface-08` **PENDING** — Inventory opens
- `keyboard-interface-09` **PENDING** — Inventory closes
- `keyboard-interface-10` **PENDING** — Chat typing
- `keyboard-interface-11` **PENDING** — ClickGUI opens
- `keyboard-interface-12` **PENDING** — ClickGUI closes
- `keyboard-interface-13` **PENDING** — ClickGUI search
- `keyboard-interface-14` **PENDING** — ClickGUI scrolling
- `keyboard-interface-15` **PENDING** — ClickGUI module toggles
- `keyboard-interface-16` **PENDING** — ClickGUI settings
- `keyboard-interface-17` **PENDING** — No stuck movement after leaving/returning
- `keyboard-interface-18` **PENDING** — No stuck mouse buttons after leaving/returning
- `audio-01` **PENDING** — Menu click sounds
- `audio-02` **PENDING** — Block placement sounds
- `audio-03` **PENDING** — Block breaking sounds
- `audio-04` **PENDING** — Entity/ambient sounds where available
- `audio-05` **PENDING** — Volume adjustment
- `audio-06` **PENDING** — Mute
- `audio-07` **PENDING** — Unmute
- `audio-08` **PENDING** — Sound restoration after tab switch
- `audio-09` **PENDING** — Sound restoration after window refocus
- `private-multiplayer-01` **PENDING** — Host creates disposable LAN session
- `private-multiplayer-02` **PENDING** — Guest accepts while host stays on invitation screen
- `private-multiplayer-03` **PENDING** — Physical Escape navigation after acceptance
- `private-multiplayer-04` **PENDING** — Physical Back navigation after acceptance
- `private-multiplayer-05` **PENDING** — Return to responsive host gameplay
- `private-multiplayer-06` **PENDING** — Guest movement visible to host
- `private-multiplayer-07` **PENDING** — Cleanup after disconnect

## Cleanup

Save/exit only the disposable world. In Terminal 2 enter `await context.close();`, then Control-D. Stop the task server with Control-C in Terminal 1. Confirm both exited; preserve personal Chrome sessions and all benchmark worlds. The helper's raw logs may include private LAN data: leave them ignored. No unattended server should remain after testing.
