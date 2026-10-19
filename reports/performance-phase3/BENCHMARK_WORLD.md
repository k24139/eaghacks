# Phase 3 benchmark world recovery record

The previously referenced superflat export was not present in the retained profile or recovery artifacts. Under the Phase 3 authorization, a replacement was created in the native client and exported with its built-in EPK exporter.

| Property | Verified value |
| --- | --- |
| Name | Eaghacks Benchmark 2026 |
| Format | Eaglercraft EPK |
| Exported file count | 1,256 |
| Bytes | 570,090 |
| SHA-256 | `503a38bc3200d84c5335c710044ab772a7b7f636aa59b01c4de84c7b46cc0784` |
| Seed | `20261019` |
| World type / structures | Superflat / structures off |
| Game mode / difficulty | Creative / Peaceful |
| Bonus chest / commands | Off / on |
| Start reset | `/tp @s 0 150 0 0 20` |
| Observed reset | `x=0.5, y=150, z=0.5, yaw=0, pitch=20` |
| Prepared blocks | 17×17 stone platform at Y=149 |

The world export was made through the client’s World Backup Menu. The client log reports a successful export of 1,256 files. A stock-client saved-world selector check on the same origin and persistent profile showed the matching world name and enabled **Play Selected World** after selecting its row. This verifies shared-profile visibility across the two HTML clients.

A fresh-profile import was attempted twice with bounded waits. Both attempts remained on the Eagler profile/loading overlay and did not reach the title/import screen; no import result is claimed. The portable EPK has not yet passed a fresh-profile round trip. Performance sampling was therefore held at the world-recovery prerequisite.

For recovery, serve the project at `http://127.0.0.1:3006`, open the native HTML, choose **Singleplayer → Import EPK World**, and select `tests/fixtures/performance/benchmark-world.epk`. Confirm the saved-world selector entry before starting either client. The same profile archive is recorded in `PROGRESS.md`.
