# RC3 consolidated human acceptance

Status: **pending human execution**. Browser automation cannot certify physical mouse/keyboard input, pointer-lock feel, audio listening, or combat feel. Use the exact RC3 hash in artifact-manifest.json, a disposable single-player world, one client, and a fresh task profile. Record tester/date/browser/OS and pass/fail/evidence for each item.

| Check | Efficient procedure | Pass condition | Status |
| --- | --- | --- | --- |
| Keyboard/mouse | Walk, strafe, jump, sprint, then rotate the view and break/place a block | Correct physical input, no stuck key or camera drift | Pending |
| Pointer lock | Capture the canvas; release with Escape; reopen/close ClickGUI; switch desktop focus; return | Predictable capture/release and no unintended motion | Pending |
| Audio | Enable sound; walk, break a block, hurt a mob; change volume; leave/reenter world | Human hears correct sounds at appropriate volume without interruption | Pending |
| GUI/settings | Resize window; browse every category; scroll; search; open settings/tooltips; collapse panels; assign and clear a bind; restart | Usable focus, accurate unavailable explanations, persisted panel/settings/bind state | Pending |
| Combat | Through ClickGUI enable KillAura; test passive off/on, hostile on/off, range, rotation speed/off and target switch delay; disable mid-combat | Observed damage matches targets/settings; no attacks during GUI; immediate stop on disable | Pending |
| Timing/criticals | Use 2 CPS with a sword and slower CPS with an axe; compare interval and prefer-falling; optionally enable Criticals jump | Predictable attempt timing; no burst after pause; critical damage only when actual native conditions allow it | Pending |
| Movement/cleanup | Toggle AutoWalk, Sprint, Speed and BunnyHop; stop; open inventory/GUI; die/respawn; save, rejoin and restart | No persistent synthetic input, velocity, stale target or overlay after cleanup | Pending |
| Rendering | Observe ESP, hitboxes, names, tracers and HUD during camera movement/resizing | Stable projection, readable labels, correct filtering and clean disable | Pending |
| Other-player ESP | In a separately authorized multiplayer/LAN session, switch player targeting off/on and check friend/self exclusion | Actual other player correctly included/excluded, self never included | Pending |

Seven previously deferred LAN checks remain pending. This session does not authorize or claim new LAN acceptance. The existing host-return-before-guest-acceptance workaround and unresolved intermittent lobby behavior remain recorded in the historical reports. Stop after Phase 14; final packaging and independent whole-project certification remain future work.
