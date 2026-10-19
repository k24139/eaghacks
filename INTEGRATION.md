# Eaglercraft integration

The browser framework targets Eaglercraft 26.2-u1. The Java overlay targets
`aerograde/eagle-26.2@1be2375ad67cb42a52d5f586a2422e54b57be625`.
Build instructions are in [native-bridge/README.md](native-bridge/README.md);
executed validation is in [TEST_RESULTS.md](TEST_RESULTS.md).

## Native path

Meteor modules call the browser adapter. The adapter reads a versioned native
snapshot and queues narrow commands. `PlatformMeteorBridge`, compiled into the
real Java/TeaVM client, publishes that snapshot and consumes commands on the
normal game tick. Java alone announces `__eaghacksNativeBridge`; the browser
bootstrap does not synthesize that identity or any player/world data.

The snapshot is replaced atomically. It contains world time/dimension,
local/remote identity, menu state, player position/velocity, yaw/pitch, health,
hunger, sprint/sneak, hurt/fall, movement input, death/use state, hotbar and 36
inventory slots, armor metadata and the real camera projection. A bounded list
of at most 512 entities contains registry type, velocity, health/death state,
position/size, classification and line of sight. Java object references do not
escape into the browser.

| Data or action | Capability |
| --- | --- |
| Real player and world | `world` |
| Real bounded entities | `entities` |
| Camera projection and world-to-screen rendering | `render` |
| Rotation, velocity, jump, sprint/sneak, attack/use, slot and swing | `native-direct` |
| Real hotbar/main inventory and armor metadata | `native-inventory-read` |
| Brightness option | `brightness-control` |
| FOV override | `fov-control` |
| Hurt-camera hook | `hurt-camera-control` |
| Respawn | `native-respawn` |
| Active potion effects | `effects` |
| Registered biome ID | `biome` |
| Vanilla crosshair visibility | `crosshair-control` |
| Bounded multi-target attacks | `native-multi-attack` |

The current overlay does not advertise broad inventory mutation, block lookup,
flight, timing, knockback interception, camera detachment,
world save identity or network contracts. Modules needing those hooks remain
gated. Camera projection does not imply Freecam support. Capability availability
is separate from a module's gameplay-tested status.

## Lifecycle and input

Upstream world-ready flags are one-way boot signals, so a compiled native client
requires a live native player snapshot for current world readiness.
Snapshot transitions produce world-load/unload, movement and death/respawn events. World
loss clears native commands and state. Pending user enablement survives missing
world/capabilities and menu saves; explicit disable cancels it. Crashed modules
are disabled, lose deferred restoration, and dispose subscriptions.

New gameplay commands require actual world control and stop in menus, ClickGUI
or after focus loss. Camera options, release commands, owned slot restoration
and dead-player respawn remain available for cleanup. Synthetic input consumed
with `preventDefault()` still counts as dispatched, so the adapter retains its
ownership and sends the matching release. Shutdown disposes focus/mouse listeners,
releases owned input and remains idempotent.

AutoEat waits until the native snapshot confirms the food slot before holding
the actual game use input. It releases use and restores its slot when finished
or disabled. Sprint observes native hunger and restores its original state.
Aim Assist can observe held physical attack input, and TriggerBot recognizes
native held-item identifiers. These APIs still require actual gameplay tests.

## Standalone pipeline

The Meteor injector owns two integration regions and supports `--refresh`.
It wraps the official screen-change hook. Main-runtime embedded assets use Blob
URLs, tagged so the server worker routes its own asset request through its
embedded decoder. This preserves the working asset transport.

The native build verifies six pinned input payload hashes and EPK file CRCs,
restores the matching resources, compiles the client, validates its native WASM
markers and replaces only `eag-inline-wasm-br`. Original asset/sound EPKs, mesh
and server worker binaries, and the remaining payload stay byte-identical.
The original client is preserved separately until the rebuilt client passes.

`tools/serve.mjs` serves local previews on loopback and rejects hidden-path and
traversal access. Tests use that same HTTP path. The module catalogue is generated
from `createEaglercraftModules()` so its requirements match the actual integration.
Only gameplay evidence with the matching source digest and artifact hash can
produce a verified module label. Unit fixtures and the synthetic harness cannot.
