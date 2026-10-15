/**
 * Build and embed the real Meteor framework into the supplied Eaglercraft
 * 26.2-u1 standalone HTML. No external scripts are needed at runtime.
 *
 * Usage:
 *   node tools/inject-eaglercraft.mjs /path/eaglercraft-26.2-u1.html [output.html]
 */
import { build } from 'esbuild';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const input = process.argv[2];
const output = process.argv[3] || 'Eaglercraft-26.2-u1-Meteor.html';
if (!input) {
  console.error('Usage: node tools/inject-eaglercraft.mjs <original.html> [output.html]');
  process.exit(2);
}

let source = await readFile(resolve(input), 'utf8');
const required = ['id="game_frame"', '__eaglerWasmGCInstantiate', '__eaglerGameReady', 'eag-inline-wasm-br', 'window.eaglercraftXOpts = {'];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Input is not the expected Eaglercraft 26.2-u1 HTML (missing ${marker})`);
}
if (source.includes('id="eaghacks-integration"') || source.includes('__eaghacksInstallOptsHook')) {
  throw new Error('Refusing to inject twice');
}

// This code executes immediately before the original client assigns
// window.eaglercraftXOpts. A temporary setter lets us wrap the official
// screenChanged hook without parsing/reformatting the giant options object.
// Eaglercraft calls screenChanged(null, ...) when currentScreen is null, which
// gives the adapter a supported menu-vs-gameplay signal without WASM poking.
const preboot = String.raw`
/* EaglerHacks preboot: wrap the official eaglercraftXOpts screenChanged hook. */
(function __eaghacksInstallOptsHook(){
  var assigned = false;
  function install(opts) {
    opts = opts && typeof opts === 'object' ? opts : {};
    var hooks = opts.hooks && typeof opts.hooks === 'object' ? opts.hooks : (opts.hooks = {});
    var previous = typeof hooks.screenChanged === 'function' ? hooks.screenChanged : null;
    hooks.screenChanged = function(screenName, scaledWidth, scaledHeight, realWidth, realHeight, scaleFactor) {
      var detail = {
        screenName: screenName == null ? null : String(screenName),
        scaledWidth: Number(scaledWidth) || 0,
        scaledHeight: Number(scaledHeight) || 0,
        realWidth: Number(realWidth) || 0,
        realHeight: Number(realHeight) || 0,
        scaleFactor: Number(scaleFactor) || 1,
        at: Date.now()
      };
      window.__eaghacksScreenHookSeen = true;
      window.__eaghacksScreenState = detail;
      try {
        window.dispatchEvent(new CustomEvent('eaghacks:screenChanged', { detail: detail }));
      } catch (_) {}
      if (previous) {
        try { return previous.apply(this, arguments); }
        catch (err) { console.error('[eaghacks] previous screenChanged hook threw', err); }
      }
    };
    return opts;
  }
  Object.defineProperty(window, 'eaglercraftXOpts', {
    configurable: true,
    enumerable: true,
    get: function(){ return undefined; },
    set: function(value){
      if (assigned) return;
      assigned = true;
      value = install(value);
      Object.defineProperty(window, 'eaglercraftXOpts', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: value
      });
    }
  });
})();
`;
source = source.replace('window.eaglercraftXOpts = {', `${preboot}\nwindow.eaglercraftXOpts = {`);

const compiled = await build({
  entryPoints: ['src/integration/bootstrap.js'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  platform: 'browser',
  write: false,
  legalComments: 'none',
  logLevel: 'silent',
});
const js = compiled.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const injection = `\n<!-- EaglerHacks browser integration: no external dependencies -->\n<script id="eaghacks-integration">\n${js}\n</script>\n`;
if (!source.includes('</body>')) throw new Error('Missing closing body tag');
const result = source.replace('</body>', `${injection}</body>`);
await writeFile(resolve(output), result, 'utf8');
const bytes = (await stat(resolve(output))).size;
console.log(`Built ${output}: ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
console.log('Installed official screenChanged hook + capability-gated Meteor integration.');
