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
- selected hotbar slot metadata
- current crosshair entity ID
- camera position plus the live projection × view-rotation matrix for world-to-screen overlays
- hotbar and armor metadata including registry ID, name, count, durability and food nutrition/saturation

Commands are written by the browser adapter to `globalThis.__eaghacksNativeCommands` and consumed on the next client tick. The first bridge supports rotation, velocity, jump, sprint, sneak, selected-slot changes, direct entity attacks and item use.

## Apply

```sh
node native-bridge/apply-native-bridge.mjs /path/to/eagle-26.2
```

The patcher is idempotent. It copies the common platform stub, TeaVM implementation and game bridge, then inserts one fully-qualified bridge call immediately after `this.clientTickCount++` in `Minecraft.java`.

Rebuild the TeaVM client using the matching source project's documented Java 25 / Node toolchain.

## Capability policy

The bridge intentionally does not advertise the broad `movement` capability yet. That contract also promises Step, NoFall, SafeWalk and other hooks this first bridge does not implement. Instead the adapter advertises `native-direct`; the Eaglercraft bootstrap maps only modules whose concrete method needs are currently satisfied.

Hotbar and armor metadata are published under `native-inventory-read`; the adapter still does not advertise broad `inventory` mutation support, so Inventory Manager/AutoArmor remain gated.

Camera state advertises `render`, enabling world-to-screen consumers such as Entity ESP, Tracers and Nametags. Fullbright, Zoom and NoHurtCam remain behind separate granular write capabilities because camera projection access does not imply gamma/FOV/hurt-camera control.

The original browser-only integration remains the fallback when the native bridge is absent.
