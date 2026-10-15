# Native Eaglercraft 26.2 bridge

The stock standalone `26.2-u1` WebAssembly exports only generic TeaVM glue, `main`, and memory. It does not export `Minecraft.player`, `ClientLevel`, or entity/inventory objects.

This overlay targets the matching patched 26.2 source tree rather than reverse-engineering obfuscated WASM addresses.

## Matching source

- Repository: `aerograde/eagle-26.2`
- Inspected commit: `1be2375ad67cb42a52d5f586a2422e54b57be625`

That source contains the exact `globalThis.__eaglerWorldReady` implementation and Eagler performance strings found in the supplied `26.2-u1` WASM.

## Published state

Each real Minecraft client tick atomically publishes `globalThis.__eaghacksNativeState` version 1 with:

- world time and dimension
- player position, yaw/pitch, health, hunger, on-ground state and velocity
- a bounded entity snapshot (max 512), including IDs, positions, dimensions, health, player/hostile/passive flags and real line-of-sight
- current crosshair entity ID
- camera position plus the live projection × view-rotation matrix for world-to-screen overlays
- selected hotbar slot
- hotbar and armor metadata including registry ID, display name, count, remaining/max durability and food nutrition/saturation

Commands are written by the browser adapter to `globalThis.__eaghacksNativeCommands` and consumed on the next client tick. The bridge currently supports rotation, velocity, jump, sprint, sneak, selected-slot changes, direct entity attacks and item use.

## Apply only

For an already prepared 26.2 source project:

```sh
node native-bridge/apply-native-bridge.mjs /path/to/eagle-26.2
```

The patcher is idempotent. It copies the common platform stub, TeaVM implementation and game bridge, then inserts one fully-qualified bridge call immediately after `this.clientTickCount++` in `Minecraft.java`.

## Build the complete native client

The public matching-source repository intentionally omits Mojang inputs/resources regenerated from the user's official client JAR. First use the upstream 26.2 patcher to create or reuse a complete build project. Then, from this `eaghacks` repository:

```sh
npm ci
npm run build:native -- /path/to/prepared/eagle-26.2
```

`build:native` performs the remaining pipeline in order:

1. applies the native bridge idempotently;
2. runs the upstream `link-web-target-standalone.js client`, which rebuilds the required Gradle JARs and links the TeaVM client WASM;
3. runs the upstream single-HTML packager while reusing the existing mesh/server outputs;
4. runs this repository's Meteor injector over the newly built native Eaglercraft HTML.

The default final output is:

`Eaglercraft-26.2-u1-Meteor-Native.html`

A custom path can be supplied with `--output file.html`. `--fast` opts into the upstream TeaVM fast-analysis development link; omit it for the full production link.

The upstream project documents Java 25 and Node on `PATH`, and notes that the full client link is the slow step.

## Capability policy

The bridge deliberately uses granular capabilities:

- `world`: real player/world snapshot exists.
- `entities`: real bounded entity snapshot exists.
- `render`: real camera matrix exists. This enables world-to-screen consumers such as Entity ESP, Tracers and Nametags.
- `native-direct`: direct native actions such as rotation, velocity, jump, attacks and item use exist.
- `native-inventory-read`: hotbar/armor metadata exists.

It intentionally does **not** advertise the broad `movement` capability yet, because that contract also promises Step, NoFall, SafeWalk and other hooks not implemented by this bridge.

It also does **not** advertise broad `inventory` mutation support. Armor HUD, Durability Warnings and AutoEat are mapped to the narrower inventory-read/direct-action capabilities, while Inventory Manager and AutoArmor remain gated.

Fullbright, Zoom and NoHurtCam remain behind separate granular write capabilities because camera projection access does not imply gamma/FOV/hurt-camera control.

The original browser-only integration remains the fallback when the native bridge is absent.
