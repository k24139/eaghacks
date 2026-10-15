#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const args = process.argv.slice(2);
const preparedArg = args.find((x) => !x.startsWith('--'));
const fast = args.includes('--fast');
const outputFlag = args.indexOf('--output');
const output = resolve(outputFlag >= 0 && args[outputFlag + 1]
  ? args[outputFlag + 1]
  : 'Eaglercraft-26.2-u1-Meteor-Native.html');

if (!preparedArg) {
  console.error('Usage: node native-bridge/build-native-client.mjs /path/to/prepared/eagle-26.2 [--fast] [--output file.html]');
  process.exit(2);
}
const prepared = resolve(preparedArg);
for (const rel of [
  'game/src/main/java/net/minecraft/client/Minecraft.java',
  'wasm-toolchain/link-web-target-standalone.js',
  'wasm-toolchain/build-single-html.js',
  'gradlew',
]) {
  if (!existsSync(resolve(prepared, rel))) throw new Error(`Prepared 26.2 project is missing ${rel}: ${prepared}`);
}

function run(command, argv, cwd) {
  console.log(`[eaghacks-native-build] ${command} ${argv.join(' ')}`);
  const r = spawnSync(command, argv, { cwd, stdio: 'inherit', env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run(process.execPath, [resolve(here, 'apply-native-bridge.mjs'), prepared], projectRoot);

const linkArgs = [resolve(prepared, 'wasm-toolchain/link-web-target-standalone.js'), 'client'];
if (fast) linkArgs.push('--fast-analysis');
run(process.execPath, linkArgs, prepared);

const baseOutput = resolve(prepared, 'dist/eaghacks-native-base.html');
mkdirSync(dirname(baseOutput), { recursive: true });
run(process.execPath, [
  resolve(prepared, 'wasm-toolchain/build-single-html.js'),
  '--reuse-client', '--reuse-mesh', '--reuse-server', '--fast-package',
  '--output', baseOutput,
], prepared);

run(process.execPath, [resolve(projectRoot, 'tools/inject-eaglercraft.mjs'), baseOutput, output], projectRoot);
console.log(`[eaghacks-native-build] final=${output}`);
console.log(`[eaghacks-native-build] mode=${fast ? 'fast-analysis development build' : 'full production client link'}`);
