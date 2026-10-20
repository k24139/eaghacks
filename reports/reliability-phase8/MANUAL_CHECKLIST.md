# Phase 8 physical verification — awaiting user verification

No physical mouse action or human listening has been confirmed. Automated trusted
Chrome events do not count as hardware evidence. Use the dedicated profile and
exact artifact listed in runtime.json; do not open a personal Chrome profile.

Start the loopback server from the integration worktree:

```sh
node input/phase7/lan-server.mjs --dir . --host 127.0.0.1 --port 3006
node tools/phase8-session.mjs input/phase8/manual-profile http://127.0.0.1:3006/input/phase8/native-fixed.html --headed
```

Use a disposable creative world with commands enabled. Do not import over a
benchmark profile. In the session terminal, `page` is the task page. The helpers
in tools/phase8-checks.mjs can record native position/yaw/pitch and ownership.
Use `tools/phase8-lifecycle.mjs` snapshot(page) for detailed state. Record the
runtime hash, Chrome version, action, expected/observed result and physical=true
in manual-results.json. Leave anything not performed awaiting verification.

1. Click the canvas. Move a physical mouse continuously left/right and up/down
   for 15 seconds each. Confirm direction, smooth rotation and repeated recenter
   without cancellation or jumps. Record yaw/pitch before and after. Synthetic
   MouseEvent deltas cannot certify this behavior.
2. Press Escape physically, return to game, click to capture again. Repeat after
   changing tabs, minimizing/restoring, inventory and chat.
3. Physically test W/A/S/D, Space, Shift, Ctrl+W, wheel, attack and placement.
   Release every key/button and confirm movement/use stops.
4. Hold W, open ClickGUI with Right Shift, release W and type `wasd` into Search.
   Close it. Confirm Search owns typing, the player stayed still, and W works
   again without stuck movement or attack/use.
5. Listen on the intended speakers/headphones: menu click; place/break a block;
   `/playsound minecraft:entity.pig.ambient master @s`; set master volume to zero
   then restore it; change focus and return. Mark each audible/silent result.
   Optional music is absent; no replacement pack is required.
6. In a bounded two-profile private session, reproduce host Players On This
   Network after the guest accepts. Physically click Back and press Escape.
   Record whether it leaves and whether the native bridge sequence advances.
   Preserve a failure; do not call it an automation limitation without this test.

Close only task browsers and the loopback server when done. Send the observed
results so the report can distinguish physical confirmation from automation.
