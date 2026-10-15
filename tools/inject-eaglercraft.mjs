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
const source = await readFile(resolve(input), 'utf8');
const required = ['id="game_frame"', '__eaglerWasmGCInstantiate', '__eaglerGameReady', 'eag-inline-wasm-br'];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Input is not the expected Eaglercraft 26.2-u1 HTML (missing ${marker})`);
}
if (source.includes('id="eaghacks-integration"')) throw new Error('Refusing to inject twice');
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
console.log('Gameplay modules are capability-gated until verified native hooks exist.');
