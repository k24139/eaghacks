# Reproduce the local matched benchmark

Run from the integration worktree on the same Mac. Preserve any existing work;
use an isolated worktree if necessary. Do not invoke Java, Gradle, or a native
build, and do not regenerate the EPK. Keep each client's independent task profile
under ignored `input/phase5/`. Do not publish profiles or client HTML.

1. Verify the hashes in `provenance.json`, including the 570,090-byte fixture.
   Run `node tools/verify-recovery-artifact.mjs <native-html> <receipt>`.
   Keep the verified stock/native HTML files unchanged. Use the existing static
   server on `http://127.0.0.1:3006`. In this run its URLs were
   `/input/phase4/Eaglercraft-26.2-u1-Meteor-Native.html` and
   `/input/phase4/stock.html`, served from the original repository. For a new
   server, place copies beneath its root and use their corresponding URLs;
   `node tools/serve.mjs 3006 <root>` binds to loopback by default.
2. Prepare matching options for each fresh profile. The committed
   `native-settings.txt` and `stock-settings.txt` are identical decompressed game
   options, not browser storage archives. To create a local preset:

   ```sh
   mkdir -p input/phase5
   node --input-type=module - <<'JS'
   import {readFile,writeFile} from 'node:fs/promises';
   import {gzipSync} from 'node:zlib';
   const text=await readFile('reports/performance-phase5/native-settings.txt');
   await writeFile('input/phase5/preset.json',JSON.stringify({
     '_eaglercraftX.g':gzipSync(text).toString('base64')
   }));
   JS
   ```

   Important settings: Fast, four render/simulation chunks, FOV 70, unlimited
   max FPS (`260`), VSync off, graphics API Default, inactivity reduction only
   when minimized. GUI scale is Auto. See the text files for every setting.
3. Start **one** session. Use a new profile name for a clean EPK import:

   ```sh
   node tools/phase5-session.mjs input/phase5/repro-native \
     http://127.0.0.1:3006/input/phase4/Eaglercraft-26.2-u1-Meteor-Native.html \
     input/phase5/preset.json
   ```

   This uses installed Google Chrome in headless mode with hardware rendering
   verified separately. Commands on stdin are trusted local JavaScript with
   `page` and `context` available. Navigation has a 90-second timeout; session
   commands have a 120-second bound. Logs and error screenshots stay under
   ignored `input/phase5/`. If using a terminal, keep each command line short
   (or use `stty -icanon -echo` before launch) to avoid terminal line limits.
4. At the actual profile screen, wait for the resource overlay to disappear.
   Choose Tennis Alex, matching this run, and finish the profile with Done.
   Use screenshots to inspect controls; stock has no native bridge screen state.
   At 1280×800: Done is `(640,667)`; Singleplayer `(640,371)`. A fresh profile
   shows Import EPK World at `(640,371)`. Upload the exact fixture with a
   Playwright file chooser, click Continue `(640,348)`, select the imported row
   `(640,210)`, then Play Selected World `(400,675)`. Use held clicks, e.g.
   `await page.mouse.click(640,667,{delay:750})`, with short waits between screens.
   Example import command after the empty-world selector is visible:

   ```js
   const c=page.waitForEvent('filechooser');await page.mouse.click(640,371,{delay:750});await (await c).setFiles('tests/fixtures/performance/benchmark-world.epk');
   ```

   Do not click Create New World. If a screen differs, capture and inspect it
   before another attempt. Dismiss a recovered-crash notification if present.
   Do not reuse an earlier corrupted screenshot as evidence.
5. Wait for real gameplay and the platform. Resize while gameplay is running:

   ```js
   await page.setViewportSize({width:640,height:400});await page.waitForTimeout(1000);
   return await page.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>[c.width,c.height]));
   ```

   The game backing canvas must also be 640×400; CSS scaling alone is insufficient.
   Disable all modules, then configure the world and save metadata:

   ```js
   await page.evaluate(()=>{for(const m of EaglerHacks.client.modules.all())m.disable()});
   await (await import('./phase5-benchmark.mjs')).setup(page);
   await (await import('./phase5-benchmark.mjs')).saveMetadata(context,page,'native','input/phase5/repro-native');
   ```

   Setup retains Creative/Peaceful, freezes time at 6000 and weather at clear,
   and teleports to `(0.5,150,0.5)`, yaw 0, pitch 20. Verify successful command
   responses. Native snapshots and stock F3 evidence independently confirm the
   viewpoint. Turn F3 off before sampling. Check version/renderer and exact
   settings equality before treating samples as matched.
6. `runSamples` saves each raw sample **before** browser shutdown and records
   a host/process memory observation after each sample. It waits five seconds
   after every teleport, then collects three independent windows:

   ```js
   await (await import('./phase5-benchmark.mjs')).runSamples(context,page,'native','idle','input/phase5/repro-native');
   await (await import('./phase5-benchmark.mjs')).runSamples(context,page,'native','movement-timed','input/phase5/repro-native');
   ```

   Idle windows are 5 seconds; movement windows are 1 second with W held by a
   separate 1000-ms host timer. `inputHeldMs` includes key-release protocol
   latency; inspect it and the `/data get entity @s Pos` responses/screenshots.
   Actual displacement must be positive Z on the platform, with stable X/Y.
   Do not use the obsolete `movement` condition as the primary comparison.
7. In native only, enable exactly `fps-display`, `coordinates`, `direction`,
   `speed-hud`, `armor-hud`, and `session-timer`; collect `hud-on`. Disable all
   modules and collect `hud-off-return`. All these windows are 5 seconds and
   reset the same viewpoint. The original idle set and returning off set bracket
   the on set. Preserve the active module lists and screenshots.
8. Save any final observations, then end stdin to close **only** this context.
   Start stock with its own clean profile and the same preset. Import another
   copy of the same fixture, repeat setup and verification, and collect its idle
   and timed movement sets. Never run the game clients simultaneously. Original
   Phase 4 profiles and personal Chrome profiles are outside this workflow.
9. Monitor `memory.jsonl`: `memory_pressure -Q`, `vm_stat`,
   `sysctl vm.memory_pressure`, and RSS from the CDP-listed owned browser PIDs.
   Pause the task if memory pressure worsens or headroom becomes inadequate;
   do not terminate unrelated processes. The original raw indicator included 0, 62 and 245; it is not a severity level.
   Query `kern.memorystatus_vm_pressure_level` separately for severity.
   `memory()` also observes exported `teavm.memory`, when present. This is linear
   memory only, excluding WasmGC, worker memories and GPU allocations.
10. `node tools/phase5-summary.mjs` recomputes `summary.json` from the retained
    raw JSONL files. This run includes six earlier exploratory `movement` samples;
    preserve them, but use `movement-timed` in the primary comparison. For a fresh
    run keep the original report directory intact and change the helper output
    directory (and summarizer input directory) to a new report location first.
    Then run `npm test`, `npm run build`, and `node tools/smoke.mjs` after closing
    the benchmark browser. Audit new PNG CRCs and hashes before publication.

`phase5-present-sampler.mjs` timestamps the game's full-screen default-framebuffer
`drawArrays(TRIANGLES,0,3)` submission. A framebuffer-binding tracker excludes
intermediate render targets. It restores both wrapped GL methods after every
window and has a bounded timeout. It records browser rAF intervals separately.
The method measures CPU submission cadence; headless screenshots and rAF are
not physical monitor refreshes, and no GPU-completion timestamps are claimed.
