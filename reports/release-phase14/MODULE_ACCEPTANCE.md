# Phase 14 module acceptance

77 registered: **0 fully accepted**, **41 gameplay-observed**, **5 partial**, **31 unsupported**, **0 newly failed**. No module is promoted on a GUI toggle or shared lifecycle test.

The exact final RC3 is bound by artifact-manifest.json. Every previously observed module has fresh GUI enable/disable checks and its current setting set compared across a real Chrome restart. This persistence comparison does not exercise every setting. Current functional evidence is itemized in verification.json. Historical observations remain in reports/release-phase13; they are not counted as new RC3 checks.

| Module | Category | Status | Current functional scope | Limitations |
| --- | --- | --- | --- | --- |
| Aim Assist | Combat | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| AutoClicker | Combat | gameplay-observed | AutoClicker activation hold gate; AutoClicker attacks through actual native target; combat modules gated by real inventory screen | Only the explicitly recorded behavior/settings scope is certified. |
| AutoTotem | Combat | unsupported | No new gameplay certification | No offhand inventory mutation/totem contract. Generic main/offhand useItem command does not implement slot management. |
| AutoWeapon | Combat | unsupported | No new gameplay certification | Read-only hotbar and selectSlot already exist. findBestWeapon/ranking is absent (no attack-damage/enchantment metadata); broad inventory gate remains. Possible focused JS follow-up, not a required Java build for simple ID ranking. |
| Criticals | Combat | partial | Criticals jump subset changes actual height; naturally falling native hit delivers greater actual damage than grounded hit; KillAura with Criticals waits for observed falling before first real attack; falling-aware KillAura delivers critical-sized sword damage in controlled fixture | Jump subset and falling-aware KillAura damage verified in a controlled dry/unmounted fixture. Packet hook, charge, fluid/climb/passenger state absent; no universal critical guarantee. |
| KillAura | Combat | gameplay-observed | Named native gameplay suite checks; KillAura delivers real hostile damage at configured 2 CPS; KillAura attempts follow 500 ms deadlines with bounded tick jitter; KillAura disable clears pending native attacks immediately; KillAura disable stops new attempts and further damage after in-flight native delivery; hostile filter excludes actual zombie; range excludes actual hostile five blocks away; GUI blocks native attack delivery and pending commands; GUI close resumes damage without a queued burst; KillAura GUI activation queues no combat or movement while paused; KillAura passive filter prevents damage to real pig; KillAura enabled through GUI damages eligible real mob after close; KillAura disable stops damage and clears queued attacks; KillAura range rejects real target five blocks away; KillAura attacks when actual player enters configured range; ESP hostile filter renders real zombie and excludes passive; KillAura with Criticals waits for observed falling before first real attack; falling-aware KillAura delivers critical-sized sword damage in controlled fixture; nondefault new KillAura timing settings persist across Chrome process restart | Modern recovery verified by damage; native charge is not published. Interval attempts and bounded falling preference, not guaranteed readiness/criticals. Actual other-player targeting remains unverified. |
| Reach Display | Combat | unsupported | No new gameplay certification | No attacker/distance combat event stream. Target snapshots do not identify hits. |
| TriggerBot | Combat | gameplay-observed | TriggerBot damages actual crosshair target; TriggerBot weapon-only rejects stick; combat modules gated by real inventory screen | Only the explicitly recorded behavior/settings scope is certified. |
| Velocity | Combat | unsupported | No new gameplay certification | setPlayerVelocity exists; no incoming knockback multiplier/interception hook. |
| Active Modules | HUD | gameplay-observed | active-modules-hud: actual visible HUD at configured position; active-modules-hud: disable removes node | Only the explicitly recorded behavior/settings scope is certified. |
| Armor HUD | HUD | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| Biome Info | HUD | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| Coordinates | HUD | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| CPS Counter | HUD | gameplay-observed | cps-counter: actual visible HUD at configured position; CPS observes actual browser click; cps-counter: disable removes node | Only the explicitly recorded behavior/settings scope is certified. |
| Custom Text | HUD | gameplay-observed | custom-text: actual visible HUD at configured position; custom text live settings; custom-text: disable removes node | Only the explicitly recorded behavior/settings scope is certified. |
| Direction | HUD | gameplay-observed | direction: actual visible HUD at configured position; direction tracks actual yaw; direction: disable removes node | Only the explicitly recorded behavior/settings scope is certified. |
| FPS | HUD | gameplay-observed | fps-display: actual visible HUD at configured position; fps-display: disable removes node | Browser/framework frame rate, not physical display or game submission rate. |
| Keystrokes | HUD | gameplay-observed | keystrokes: actual visible HUD at configured position; keystrokes: actual held movement; keystrokes: disable removes node | Only the explicitly recorded behavior/settings scope is certified. |
| Performance Monitor | HUD | gameplay-observed | performance-monitor: actual visible HUD at configured position; performance-monitor: disable removes node | Only the explicitly recorded behavior/settings scope is certified. |
| Ping Display | HUD | unsupported | No new gameplay certification | No ping/network read contract. |
| Potion HUD | HUD | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| Radar | HUD | gameplay-observed | radar: render from actual world/entities; radar: canvas cleanup | Only the explicitly recorded behavior/settings scope is certified. |
| Session Timer | HUD | gameplay-observed | session-timer: actual visible HUD at configured position; session timer visibly advances; session-timer: disable removes node | Only the explicitly recorded behavior/settings scope is certified. |
| Speed | HUD | gameplay-observed | speed-hud: actual visible HUD at configured position; speed-hud: actual held movement; speed-hud: disable removes node | Only the explicitly recorded behavior/settings scope is certified. |
| Target HUD | HUD | partial | target-hud: render from actual world/entities; target-hud: canvas cleanup | Live health/distance/bar supported; bar scale/line offset fixed; dead targets excluded. Armor metadata absent and UI option read-only with explanation. |
| World Time | HUD | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| AutoGG | Misc | unsupported | No new gameplay certification | No sendChat bridge method; keyboard command entry by a test driver is not a native chat capability. |
| AutoReconnect | Misc | unsupported | No new gameplay certification | No reconnect/server connection contract. |
| Chat Timestamps | Misc | unsupported | No new gameplay certification | No incoming chat render/format interception. |
| Debug Console | Misc | gameplay-observed | notification and debug toggle subscriptions; utility subscription cleanup | Only the explicitly recorded behavior/settings scope is certified. |
| Friend Manager | Misc | gameplay-observed | friend setting integrates with client | Only the explicitly recorded behavior/settings scope is certified. |
| Keybind Manager | Misc | gameplay-observed | keybind-manager: opens actual ClickGUI | Only the explicitly recorded behavior/settings scope is certified. |
| Macros | Misc | partial | macro default wait; macro resumes after wait; macro modifiers reject unmodified real browser key; macro keyboard route executes registered client bind; macro modifier bind and client-bind step persist across Chrome process restart | Real modifier-aware macro keybinds and registered client module bind steps work. Native chat and arbitrary game key injection remain unavailable; native chat steps fail explicitly. |
| Module Search | Misc | gameplay-observed | module-search: opens actual ClickGUI | Only the explicitly recorded behavior/settings scope is certified. |
| Notifications | Misc | gameplay-observed | notification and debug toggle subscriptions; utility subscription cleanup; Notification repaired duplicate delivery | Only the explicitly recorded behavior/settings scope is certified. |
| Screenshot Utilities | Misc | gameplay-observed | Screenshot completed and hook cleaned up | Only the explicitly recorded behavior/settings scope is certified. |
| Server Information | Misc | unsupported | No new gameplay certification | No server address/player-count network contract. |
| Session Statistics | Misc | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| AutoJump | Movement | unsupported | No new gameplay certification | jump/onGround/forward reads exist; isBlockAhead collision lookup absent. |
| AutoWalk | Movement | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| BunnyHop | Movement | gameplay-observed | BunnyHop only-sprinting gate; BunnyHop uses real jump with Sprint; BunnyHop/Sprint cleanup | Only the explicitly recorded behavior/settings scope is certified. |
| Flight | Movement | unsupported | No new gameplay certification | Direct velocity exists; setFlying/player flight flags and flight speed controls absent. |
| HighJump | Movement | unsupported | No new gameplay certification | Direct velocity/jump exist; setJumpHeight/getJumpHeight contract absent. |
| Jesus | Movement | unsupported | No new gameplay certification | No fluid collision or fluid movement interception. |
| NoFall | Movement | unsupported | No new gameplay certification | fallDistance is readable; no setNoFall or fall-damage override. |
| NoSlow | Movement | unsupported | No new gameplay certification | No item-use movement-modifier interception. |
| Parkour | Movement | unsupported | No new gameplay certification | jump/sneak exist; isBlockAhead with gap query absent. |
| SafeWalk | Movement | unsupported | No new gameplay certification | Sneak exists; no setSafeWalk edge-collision constraint. |
| Speed | Movement | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| Spider | Movement | unsupported | No new gameplay certification | No horizontal-collision hook. |
| Sprint | Movement | gameplay-observed | Named native gameplay suite checks; BunnyHop/Sprint cleanup | Only the explicitly recorded behavior/settings scope is certified. |
| Step | Movement | unsupported | No new gameplay certification | No setStepHeight/getStepHeight API. |
| Timer | Movement | unsupported | No new gameplay certification | No setTickRate/getTickRateMultiplier API. |
| AntiAFK | Player | gameplay-observed | AntiAFK acts on actual player; AntiAFK cleanup | Only the explicitly recorded behavior/settings scope is certified. |
| AutoArmor | Player | unsupported | No new gameplay certification | Armor/main inventory reads exist; equipBestArmor/inventory click or equip command absent. |
| AutoEat | Player | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| AutoRespawn | Player | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| AutoTool | Player | unsupported | No new gameplay certification | Inventory/slot reads and selection exist; block type and findBestTool ranking absent. |
| Chest Organizer | Player | unsupported | No new gameplay certification | No container slot/click automation. |
| Durability Warnings | Player | gameplay-observed | durability warning uses real damaged inventory | Only the explicitly recorded behavior/settings scope is certified. |
| FastPlace | Player | unsupported | No new gameplay certification | useItem exists; no setRightClickDelay/getRightClickDelay hook. |
| Inventory Manager | Player | unsupported | No new gameplay certification | Reads exist; sort/drop/slot-click mutation contract absent. |
| Chunk Borders | Render | gameplay-observed | chunk-borders: render from actual world/entities; chunk-borders: canvas cleanup; Chunk Borders repaired two-axis grid | Local projected grid, not native renderer geometry. |
| Custom Crosshair | Render | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| Entity ESP | Render | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| Freecam | Render | unsupported | No new gameplay certification | Projection exists; camera detachment/update/restore API absent. |
| Fullbright | Render | partial | Named native gameplay suite checks; Partial camera controls actual supported subsets; Partial camera controls cleanup | Night-vision effect mutation absent; gamma subset works. |
| Hitboxes | Render | gameplay-observed | hitboxes: render from actual world/entities; hitboxes: canvas cleanup | Screen overlay only, not expanded collision. |
| Nametags | Render | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| NoHurtCam | Render | partial | Named native gameplay suite checks; Partial camera controls actual supported subsets; Partial camera controls cleanup | Damage/death suppression exists; independent directional tilt absent. |
| Storage ESP | Render | unsupported | No new gameplay certification | No block/container enumeration. |
| Tracers | Render | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| X-Ray | Render | unsupported | No new gameplay certification | No renderer face-visibility override. |
| Zoom | Render | gameplay-observed | Named native gameplay suite checks | Only the explicitly recorded behavior/settings scope is certified. |
| Block Search | World | unsupported | No new gameplay certification | No block enumeration/lookup. |
| Light Level Overlay | World | unsupported | No new gameplay certification | No per-block light lookup. |
| Waypoints | World | unsupported | No new gameplay certification | Position/dimension exist; stable world-save/server identity absent. |

## Scope by acceptance dimension

Registration: all 77 in smoke/unit checks. Availability and GUI enable/disable: all 41 observed modules. Actual functionality/settings: only named native and focused checks. Disable/cleanup: named checks plus shared repeated-toggle test. Persistence: all 41 current setting sets across process restart, including new KillAura controls; configuration equality alone does not establish gameplay. World unload/reentry: priority combat/movement/render and explicitly named HUD/camera checks, not all 41 settings. Session shutdown: listeners, commands, HUD and synthetic input checked. Related-module interactions: explicit combat/movement ownership checks only. Human physical QA: pending.

## Unsupported-module review

All 31 previous unsupported dispositions were retained. Their exact missing contracts are in the table. AutoWeapon has the clearest limited JavaScript path (ID-based hotbar ranking and slot selection), but attack damage/enchantments are absent and no new ranking implementation or gameplay certification is claimed. Native renderer/collision/network/inventory mutation features were not fabricated. Priority remained existing gameplay quality.
