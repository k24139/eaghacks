# Phase 13 module status

77 registered. Counts: {"gameplay-observed":41,"unsupported":31,"partial":5}.

**No exhaustive full-acceptance count is claimed.** Gameplay-observed means actual intended behavior under the linked checks and settings; per-module coverage is in verification.json. Shared lifecycle checks do not prove every module setting and cleanup combination. Historical passes remain separate. Partial settings are limitations, not newly supplied native capabilities. Unsupported means the current adapter contract cannot fulfill the module; AutoWeapon in particular still needs verified JS weapon ranking rather than necessarily a new Java hook.

| Module | Category | Current evidence | Required capabilities | Limitation |
| --- | --- | --- | --- | --- |
| Aim Assist | Combat | gameplay-observed | world, entities, native-direct | Only the explicitly recorded behavior/settings scope is certified. |
| AutoClicker | Combat | gameplay-observed | input | Only the explicitly recorded behavior/settings scope is certified. |
| AutoTotem | Combat | unsupported | client UI | No offhand inventory mutation/totem contract. Generic main/offhand useItem command does not implement slot management. |
| AutoWeapon | Combat | unsupported | inventory | Read-only hotbar and selectSlot already exist. findBestWeapon/ranking is absent (no attack-damage/enchantment metadata); broad inventory gate remains. Possible focused JS follow-up, not a required Java build for simple ID ranking. |
| Criticals | Combat | partial | world, entities, native-direct | Jump subset exists; packet hook absent. Jump does not establish critical-hit damage timing. |
| KillAura | Combat | gameplay-observed | world, entities, native-direct | Only the explicitly recorded behavior/settings scope is certified. |
| Reach Display | Combat | unsupported | combat-events | No attacker/distance combat event stream. Target snapshots do not identify hits. |
| TriggerBot | Combat | gameplay-observed | world, entities, native-direct | Only the explicitly recorded behavior/settings scope is certified. |
| Velocity | Combat | unsupported | movement | setPlayerVelocity exists; no incoming knockback multiplier/interception hook. |
| Active Modules | HUD | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Armor HUD | HUD | gameplay-observed | native-inventory-read | Only the explicitly recorded behavior/settings scope is certified. |
| Biome Info | HUD | gameplay-observed | world, biome | Only the explicitly recorded behavior/settings scope is certified. |
| Coordinates | HUD | gameplay-observed | world | Only the explicitly recorded behavior/settings scope is certified. |
| CPS Counter | HUD | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Custom Text | HUD | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Direction | HUD | gameplay-observed | world | Only the explicitly recorded behavior/settings scope is certified. |
| FPS | HUD | gameplay-observed | client UI | Browser/framework frame rate, not physical display or game submission rate. |
| Keystrokes | HUD | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Performance Monitor | HUD | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Ping Display | HUD | unsupported | network | No ping/network read contract. |
| Potion HUD | HUD | gameplay-observed | effects | Only the explicitly recorded behavior/settings scope is certified. |
| Radar | HUD | gameplay-observed | world, entities, hud | Only the explicitly recorded behavior/settings scope is certified. |
| Session Timer | HUD | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Speed | HUD | gameplay-observed | world | Only the explicitly recorded behavior/settings scope is certified. |
| Target HUD | HUD | partial | world, entities, hud | Health/distance/bar exist; target armor metadata absent. |
| World Time | HUD | gameplay-observed | world | Only the explicitly recorded behavior/settings scope is certified. |
| AutoGG | Misc | unsupported | chat | No sendChat bridge method; keyboard command entry by a test driver is not a native chat capability. |
| AutoReconnect | Misc | unsupported | network | No reconnect/server connection contract. |
| Chat Timestamps | Misc | unsupported | client UI | No incoming chat render/format interception. |
| Debug Console | Misc | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Friend Manager | Misc | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Keybind Manager | Misc | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Macros | Misc | partial | client UI | Module/wait steps work; chat method unavailable; bind steps warn without execution. |
| Module Search | Misc | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Notifications | Misc | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| Screenshot Utilities | Misc | gameplay-observed | hud | Only the explicitly recorded behavior/settings scope is certified. |
| Server Information | Misc | unsupported | network | No server address/player-count network contract. |
| Session Statistics | Misc | gameplay-observed | client UI | Only the explicitly recorded behavior/settings scope is certified. |
| AutoJump | Movement | unsupported | world, movement | jump/onGround/forward reads exist; isBlockAhead collision lookup absent. |
| AutoWalk | Movement | gameplay-observed | input | Only the explicitly recorded behavior/settings scope is certified. |
| BunnyHop | Movement | gameplay-observed | world, native-direct | Only the explicitly recorded behavior/settings scope is certified. |
| Flight | Movement | unsupported | movement, flight | Direct velocity exists; setFlying/player flight flags and flight speed controls absent. |
| HighJump | Movement | unsupported | movement | Direct velocity/jump exist; setJumpHeight/getJumpHeight contract absent. |
| Jesus | Movement | unsupported | client UI | No fluid collision or fluid movement interception. |
| NoFall | Movement | unsupported | movement | fallDistance is readable; no setNoFall or fall-damage override. |
| NoSlow | Movement | unsupported | client UI | No item-use movement-modifier interception. |
| Parkour | Movement | unsupported | world, movement | jump/sneak exist; isBlockAhead with gap query absent. |
| SafeWalk | Movement | unsupported | movement | Sneak exists; no setSafeWalk edge-collision constraint. |
| Speed | Movement | gameplay-observed | world, native-direct | Only the explicitly recorded behavior/settings scope is certified. |
| Spider | Movement | unsupported | client UI | No horizontal-collision hook. |
| Sprint | Movement | gameplay-observed | input | Only the explicitly recorded behavior/settings scope is certified. |
| Step | Movement | unsupported | movement | No setStepHeight/getStepHeight API. |
| Timer | Movement | unsupported | timing | No setTickRate/getTickRateMultiplier API. |
| AntiAFK | Player | gameplay-observed | world, native-direct | Only the explicitly recorded behavior/settings scope is certified. |
| AutoArmor | Player | unsupported | inventory | Armor/main inventory reads exist; equipBestArmor/inventory click or equip command absent. |
| AutoEat | Player | gameplay-observed | world, native-inventory-read, native-direct | Only the explicitly recorded behavior/settings scope is certified. |
| AutoRespawn | Player | gameplay-observed | native-respawn | Only the explicitly recorded behavior/settings scope is certified. |
| AutoTool | Player | unsupported | inventory, blocks | Inventory/slot reads and selection exist; block type and findBestTool ranking absent. |
| Chest Organizer | Player | unsupported | client UI | No container slot/click automation. |
| Durability Warnings | Player | gameplay-observed | native-inventory-read | Only the explicitly recorded behavior/settings scope is certified. |
| FastPlace | Player | unsupported | inventory | useItem exists; no setRightClickDelay/getRightClickDelay hook. |
| Inventory Manager | Player | unsupported | inventory | Reads exist; sort/drop/slot-click mutation contract absent. |
| Chunk Borders | Render | gameplay-observed | world, render | Local projected grid, not native renderer geometry. |
| Custom Crosshair | Render | gameplay-observed | hud | Only the explicitly recorded behavior/settings scope is certified. |
| Entity ESP | Render | gameplay-observed | world, entities, render, hud | Only the explicitly recorded behavior/settings scope is certified. |
| Freecam | Render | unsupported | render, camera-detach | Projection exists; camera detachment/update/restore API absent. |
| Fullbright | Render | partial | world, brightness-control | Night-vision effect mutation absent; gamma subset works. |
| Hitboxes | Render | gameplay-observed | world, entities, render | Screen overlay only, not expanded collision. |
| Nametags | Render | gameplay-observed | world, entities, render, hud | Only the explicitly recorded behavior/settings scope is certified. |
| NoHurtCam | Render | partial | world, hurt-camera-control | Damage/death suppression exists; independent directional tilt absent. |
| Storage ESP | Render | unsupported | world, blocks, render | No block/container enumeration. |
| Tracers | Render | gameplay-observed | world, entities, render, hud | Only the explicitly recorded behavior/settings scope is certified. |
| X-Ray | Render | unsupported | client UI | No renderer face-visibility override. |
| Zoom | Render | gameplay-observed | world, fov-control | Only the explicitly recorded behavior/settings scope is certified. |
| Block Search | World | unsupported | world, blocks, render | No block enumeration/lookup. |
| Light Level Overlay | World | unsupported | client UI | No per-block light lookup. |
| Waypoints | World | unsupported | world, render, world-identity | Position/dimension exist; stable world-save/server identity absent. |
