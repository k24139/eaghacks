#!/usr/bin/env node
import { cp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] ? resolve(process.argv[2]) : null;
if (!target) {
  console.error('Usage: node native-bridge/apply-native-bridge.mjs /path/to/eagle-26.2');
  process.exit(2);
}

const overlay = join(here, 'upstream');
await cp(overlay, target, { recursive: true, force: true });

const minecraftPath = join(target, 'game/src/main/java/net/minecraft/client/Minecraft.java');
let source = await readFile(minecraftPath, 'utf8');
const call = '      net.lax1dude.eaglercraft.v1_8.mods.meteor.EaglerHacksNativeBridge.tick(this);';
if (!source.includes(call)) {
  const needle = '      this.clientTickCount++;';
  const index = source.indexOf(needle);
  if (index < 0) throw new Error(`Could not find expected 26.2 client tick marker in ${minecraftPath}`);
  source = source.slice(0, index + needle.length) + '\n' + call + source.slice(index + needle.length);
  await writeFile(minecraftPath, source, 'utf8');
}

console.log('EaglerHacks native bridge applied.');
console.log(`Patched: ${minecraftPath}`);
console.log('Overlay: game bridge + platform stub + TeaVM JS bridge');
