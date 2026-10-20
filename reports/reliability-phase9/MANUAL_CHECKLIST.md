# Physical QA — pending user operation

Use only the dedicated `input/phase9/host-profile` Chrome window at
`http://127.0.0.1:3006/input/phase8/native-fixed.html`. Exact artifact and payload
hashes are in runtime.json. No physical operation or listening is certified yet.
The driver prepares a disposable copy of a previous task world.

1. Click the game canvas; move the physical mouse continuously left/right and
   up/down for 15 seconds each. Check direction, smoothness and recenter jumps.
2. Press Escape physically, resume, and click to reacquire pointer lock.
3. Switch tabs, minimize/restore Chrome, resume and check camera/control again.
4. Open/close inventory (E), chat (T/Escape), and ClickGUI (Right Shift/Escape).
   Check typing ownership and release of movement/buttons.
5. Listen for menu clicks, placed/broken blocks and entity sounds. In chat use
   `/playsound minecraft:entity.pig.ambient master @s` if needed.
6. Set master volume to zero, confirm silence, restore volume and confirm sound.
   Switch focus away/back and listen again.
7. Report each observed result, mouse/output hardware, and any jump or silence.
   Automation cannot fill in these answers.

`phase9-observe.mjs` records bounded mouse deltas, pointer lock, native yaw/pitch,
frames and snapshot sequence. Those supporting measurements do not prove that
physical operation occurred. Capture observations before and after each action.
If no user is available, all human-operated checks remain pending.

To reopen after Phase 9 cleanup, from the integration worktree:

```sh
node input/phase7/lan-server.mjs --dir . --host 127.0.0.1 --port 3006
node tools/phase9-session.mjs input/phase9/host-profile http://127.0.0.1:3006/input/phase8/native-fixed.html --headed
```

In the task session terminal: `await context.addInitScript({path:'input/phase7/lan-discovery.js'}); await page.reload(); await (await import('./phase9-checks.mjs')).enterSaved(page); await (await import('./phase9-observe.mjs')).install(page);`
Capture before/after each physical action using `state(page)` from that observer
and save results separately. Do not label this command or its automated world
navigation as physical verification. Close task browsers/server after recording.
