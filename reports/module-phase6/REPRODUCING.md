# Phase 6 reproduction

Use `meteor-client-integration` and an isolated clean worktree. Read the Phase 6
report and runtime/matrix JSON. Do not alter original profiles, compile Java,
create a benchmark world or run performance sampling.

1. Verify the original native HTML and receipt with
   `tools/verify-recovery-artifact.mjs`. Pin original HTML SHA-256
   `eee3f8e9d93dc74d828655500f4d917ec8328ae5dde63e50c707dda67b11314c`.
2. Run `node tools/inject-eaglercraft.mjs <original-native.html>
   input/phase6/native.html --refresh`. This replaces only the browser integration.
   Compare the resulting HTML and source digest with `runtime.json`; compare all
   six embedded payloads byte-for-byte with the original. Keep large HTML local.
3. Copy a **closed task-only** Phase 5 native profile to
   `input/phase6/<new-disposable-profile>` for the established origin
   `http://127.0.0.1:3006`. Alternatively import the pinned EPK into a fresh task
   profile using the Phase 4 recovery workflow. Do not copy personal profiles.
   Profile copies and IndexedDB remain ignored and must not be published.
4. Serve locally. This run used the existing original-checkout server; the
   isolated worktree URL was
   `/input/phase4-worktree/input/phase6/native.html`. Use the corresponding URL
   under your server root. Run one client at a time:

   ```sh
   node tools/phase6-session.mjs input/phase6/<new-disposable-profile> \
     http://127.0.0.1:3006/<path-to-native.html>
   ```

   The session accepts trusted local JavaScript on stdin with `page` and
   `context`. It uses installed Chrome, bounded navigation/evaluation and a
   dedicated profile. `prejoin(page)` can run at the title menu.
5. Wait for `EaglerProfileScreen26` with `overlayActive:false`; click Done
   `(640,667)` at viewport 1280×800. At TitleScreen click Singleplayer
   `(640,371)`. Wait for the populated selector, **single-click the row**
   `(640,210)`, then Play `(400,675)`. Wait for screenName null and a real player
   at the platform. Presence of a player during LevelLoadingScreen is insufficient.
6. Disable all restored modules. Call the focused groups separately, checking
   results and actual screen state between groups:

   ```js
   const qa=await import('./phase6-checks.mjs');
   await qa.hud(page);
   await qa.render(page);
   await qa.utilities(page);
   await qa.movement(page);
   await qa.combat(page);
   await qa.inventory(page);
   await qa.finalRepairs(page);
   await qa.conflicts(page);
   await qa.rapid(page);
   await qa.lifecycle(page);
   ```

   These mutate only the disposable world: pigs, items, difficulty, effects,
   spawnpoint and death/respawn. Restore food before movement. The inventory
   conflict waits for **observed hunger**, clears the effect, then enables eating.
   Never assume a fixed hunger-effect duration produced the required state.
   On a failed group, release physical keys and disable modules before recovery.
   Resume from the diagnosed screen; do not restart Chrome without cause.
7. Save `environment(context,page)`, `memory(context,page,profile)` from the
   Phase 5 helper if desired; **do not call performance samplers**. The Phase 6
   checks append raw, hash-bound observations, settings overrides and cleanup.
   If pointer lock returns WrongDocumentError, bring the page to the foreground
   with `page.bringToFront()` and acquire the actual game canvas. A separate
   headed attempt (`--headed`) resolved the original input blocker in this run.
   Use `overlapCaptured(page)` for the final food/clicker/camera conflict checks.
   Keep trusted session command lines under the macOS terminal canonical limit;
   invoke helpers instead of pasting large inline programs. Default values are listed in `module-matrix.json`. Direct module enabling in
   menus may be explicitly rejected; configuration restoration separately retains
   pending intent. Headless programmatic blur is not physical OS focus QA.
8. `lifecycle` saves/exits before reload. At the end disable modules, save and
   close the owned context (EOF). Verify no task Chrome remains. Run
   `npm test`, `npm run build`, `node tools/smoke.mjs`.
9. Audit new PNG structure/CRC/content with `python3 tools/phase6-audit-pngs.py`.
   Build the evidence summary, run `node tools/phase6-module-audit.mjs`, and
   regenerate the catalogue with `node tools/gen-docs.mjs > MODULES.md`.
   A status upgrade requires actual gameplay observations for the exact refreshed
   artifact/source; neither the matrix nor mocked tests independently confer it.

The helper appends to this report directory. Use a new output directory for a
reproduction so original results and intermediate failures remain preserved.
