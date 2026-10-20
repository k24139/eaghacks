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

Phase 4 recovered this fixture byte-for-byte on macOS. A native export from an
untouched working copy of the archived profile contained all 1,256 original
files; only exporter date/timestamp metadata differed. Restoring the original
179-byte header retained in the damaged blob reproduced the full original
SHA-256 above. The unmodified native export and reconstruction are documented
in `reports/recovery-phase4/export-comparison.json`.

Independent fresh Chrome profiles imported this exact fixture in the verified
Meteor native and stock clients. Both loaded the stone platform and retained
the imported world across full browser restarts. Static NBT checks verify the
settings, ground layers, all 289 platform blocks, and saved player position.
See `reports/recovery-phase4/RECOVERY_REPORT.md`. No performance result is claimed.

## Recovery

1. Check out `meteor-client-integration` and serve the repository root at `http://127.0.0.1:3006`.
2. Open the verified native HTML at `/input/deliverable/Eaglercraft-26.2-u1-Meteor-Native.html` using a persistent Chromium profile.
3. In the title screen, choose **Singleplayer**, then **Import EPK World**, and select `tests/fixtures/performance/benchmark-world.epk`.
4. Click **Continue** on the import name screen. Select the saved world row, then click **Play Selected World**. For an independent stock check, import the same EPK into a separate clean profile using the verified stock HTML at the same origin.
5. Use the captured profile archive listed in `PROGRESS.md` when restoring the existing populated profile. Extract it into `input/performance/profile` before launching Chromium. Do not run both clients at once.

The full browser profile archive is separate from this fixture. The profile contains origin-scoped IndexedDB world data and client settings; this EPK remains the portable recovery copy.

Validate without a browser:

```sh
node tools/benchmark-world.mjs tests/fixtures/performance/benchmark-world.epk
node --test tests/recovery-world.test.mjs
```
