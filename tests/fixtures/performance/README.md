# Phase 3 benchmark world fixture

`benchmark-world.epk` is an Eaglercraft 26.2 EPK export created by the client's **Export EPK File** control for the superflat world `Eaghacks Benchmark 2026`.

- Exported files reported by the client: 1,256
- Export size: 570,090 bytes
- SHA-256: `503a38bc3200d84c5335c710044ab772a7b7f636aa59b01c4de84c7b46cc0784`
- Seed: `20261019`
- World type: Superflat
- Structures: Off
- Bonus chest: Off
- Game mode: Creative (commands enabled)
- Difficulty: Peaceful
- Prepared platform: stone from `(-8, 149, -8)` through `(8, 149, 8)`
- Reset position and view: `/tp @s 0 150 0 0 20`, observed `(0.5, 150, 0.5)`, yaw `0`, pitch `20`

The native client exported the world successfully. The stock client showed the same saved world in its selector from the shared persistent profile. Fresh-profile import did not complete during two bounded startup attempts; see the Phase 3 performance report. Do not treat fresh-profile import or matched performance sampling as verified.

## Recovery

1. Check out `meteor-client-integration` and serve the repository root at `http://127.0.0.1:3006`.
2. Open the verified native HTML at `/input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html` using a persistent Chromium profile.
3. In the title screen, choose **Singleplayer**, then **Import EPK World**, and select `tests/fixtures/performance/benchmark-world.epk`.
4. Verify that `Eaghacks Benchmark 2026` appears in the saved-world list. To confirm both clients use the same data, load the stock HTML at `/input/performance/stock.html` from the same origin and browser profile and inspect its saved-world list.
5. Use the captured profile archive listed in `PROGRESS.md` when restoring the existing populated profile. Extract it into `input/performance/profile` before launching Chromium. Do not run both clients at once.

The full browser profile archive is separate from this fixture. The profile contains origin-scoped IndexedDB world data and client settings; this EPK remains the portable recovery copy.
