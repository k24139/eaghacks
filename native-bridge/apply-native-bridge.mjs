import {cp,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),target=process.argv[2];if(!target)throw Error('Prepared source required');
const bridge='net.lax1dude.eaglercraft.v1_8.mods.meteor.EaglerHacksNativeBridge',changes=new Map();
for(const [path,before,after]of [
 ['game/src/main/java/net/minecraft/client/Minecraft.java','      this.clientTickCount++;',`      this.clientTickCount++;\n      ${bridge}.tick(this);`],
 ['game/src/main/java/net/minecraft/client/Camera.java','float fov = this.minecraft.options.fov().get().intValue() * Mth.lerp(partialTicks, this.oldFovModifier, this.fovModifier);',`float fov = ${bridge}.fov(this.minecraft.options.fov().get()) * Mth.lerp(partialTicks, this.oldFovModifier, this.fovModifier);`],
 ['game/src/main/java/net/minecraft/client/renderer/GameRenderer.java','private void bobHurt(final CameraRenderState cameraState, final PoseStack poseStack) {',`private void bobHurt(final CameraRenderState cameraState, final PoseStack poseStack) {\n      if (${bridge}.noHurtCamera()) return;`],
 ['game/src/main/java/net/minecraft/client/gui/Hud.java','private void extractCrosshair(final GuiGraphicsExtractor graphics, final DeltaTracker deltaTracker) {',`private void extractCrosshair(final GuiGraphicsExtractor graphics, final DeltaTracker deltaTracker) {\n      if (${bridge}.hideCrosshair()) return;`]
]){const source=await readFile(join(target,path),'utf8');if(source.includes(after))continue;if(source.split(before).length!==2)throw Error(`Unexpected source marker: ${path}`);changes.set(path,source.replace(before,after));}
for(const path of ['wasm-toolchain/link-web-target-standalone.js','wasm-toolchain/link-server-standalone.js']){
 let source=await readFile(join(target,path),'utf8');source=source.replaceAll('path.join(os.homedir(), ".gradle", "caches"','path.join(process.env.GRADLE_USER_HOME || path.join(os.homedir(), ".gradle"), "caches"');
 if(path.includes('link-web-target')){
 source=source.replace('linkerHeapMiB < 8192','linkerHeapMiB < 4096').replace('between 8192 and 12544','between 4096 and 12544').replace('"-XX:+UseParallelGC",','"-XX:+UseG1GC",\n          "-XX:+UseStringDeduplication",\n          "-XX:G1ReservePercent=5",');
 if(!source.includes('G1MaxNewSizePercent'))source=source.replace('"-XX:G1ReservePercent=5",','"-XX:G1ReservePercent=5",\n          "-XX:G1MaxNewSizePercent=10",');
 if(!source.includes('EAGLER_LINK_HEAP_DIRECTORY'))source=source.replace('"-XX:+UseCompactObjectHeaders",','"-XX:+UseCompactObjectHeaders",\n          ...(process.env.EAGLER_LINK_HEAP_DIRECTORY ? [`-XX:AllocateHeapAt=${path.resolve(process.env.EAGLER_LINK_HEAP_DIRECTORY)}`] : []),\n          ...(process.env.EAGLER_LINK_GC_LOG ? [`-Xlog:gc:file=${path.resolve(process.env.EAGLER_LINK_GC_LOG)}`] : []),');
 }changes.set(path,source);
}
const runner='wasm-toolchain/StandaloneTeaVMLinker.java';let source=await readFile(join(target,runner),'utf8');if(!source.includes('lastUnknownProgressLog'))source=source.replace('private int bucket = -1;','private int bucket = -1;\n            private long lastUnknownProgressLog;').replace('if (nextBucket > bucket) {','if (nextBucket > bucket || (total == 0 && System.currentTimeMillis() - lastUnknownProgressLog >= 30000L)) {\n                    lastUnknownProgressLog = System.currentTimeMillis();');changes.set(runner,source);
await cp(join(here,'upstream'),target,{recursive:true,force:true});for(const [path,text]of changes)await writeFile(join(target,path),text);console.log('Applied native bridge, camera hooks and task-local linker support.');
