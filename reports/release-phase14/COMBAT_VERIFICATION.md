# Phase 14 combat verification

Exact RC3: 54b88a50d23b58955360d945178fe7776e0e1c545a3a4112d8ca5e05e8aaad6e. Installed Google Chrome; disposable single-player world; native entity health snapshots. JavaScript mocks are recorded separately in the 189-test suite.

## Implemented mechanics

The existing native overlay targets gameVersion 26.2 / upstream 1be2375ad67cb42a52d5f586a2422e54b57be625; the v1_8 Java package name is not proof of legacy combat. The compiled bridge calls gameMode.attack and player.swing; it does not publish attack readiness. A real iron-axe comparison confirms modern weapon recovery, so no 1.8 CPS-only damage model is assumed.

| Delay before second attempt (ms) | Initial zombie HP | HP after first | HP after second |
| --- | --- | --- | --- |
| 250 | 20 | 11.144000053405762 | 11.144000053405762 |
| 650 | 20 | 11.144000053405762 | 6.7581095695495605 |
| 1600 | 20 | 11.144000053405762 | 2.2880001068115234 |

## Scheduler and delivery

KillAura uses performance.now deadlines. Fixed CPS preserves fractional intervals under normal tick jitter; missed deadlines after stalls are discarded, with at most one bounded batch per callback. Variation is sampled within configured CPS +/- variation, clamped to 0.5–20 attempts/s. Default is 2 attempts/s. This is a request rate, not native charge or a promise that every request damages a target. Choose a slower rate for slow weapons. Existing saved CPS settings remain intact.

Targets are revalidated on each callback; entity filters, line of sight, range, friends, health and finite positions apply. A changed primary waits the configured switch delay. Multi-target requests are bounded to 16 and face only the primary; native recovery can reduce damage to later batch members. Rotation updates between attacks with elapsed-time smoothing; rotate off preserves user camera control and speed 1 explicitly selects immediate rotation. TriggerBot and left AutoClicker yield while KillAura is active; disabling secondary owners preserves the primary queue.

Actual 2-CPS attempt gaps (ms): 499.6, 500.1, 549.9, 450.1, 549.1. Real hostile health decreased. ClickGUI activation, passive off/on, hostile exclusion/inclusion, range, GUI blocking, disable, world unload/reentry and restart are checked. Disable clears the queue immediately; a native hit consumed before disable can publish its health snapshot afterward. No new attempts and stable health after in-flight settlement are checked separately.

## Criticals

Grounded/falling recovered sword comparison: [{"falling":false,"health":14.095999717712402,"ground":true,"fallDistance":0,"verticalVelocity":-0.0784000015258789},{"falling":true,"health":11.144000053405762,"ground":false,"fallDistance":0.0754440650343895,"verticalVelocity":-0.15233518685055708}]. Falling-aware KillAura plus Criticals (prefer-falling, 0.5 attempts/s, 500 ms maximum wait, recovered iron sword) also delivered 8.855999946594238 actual damage, with the first request observed airborne, falling and descending. This certifies that controlled dry, unmounted, unblinded fixture only.

Prefer-falling uses onGround=false, positive fallDistance, negative vertical velocity and known exclusions (sprinting, item use, death, blindness). It waits at most the configured 0–500 ms, then falls back to an ordinary interval attempt. Criticals jumps only near a filtered aura target or eligible crosshair target; a jump itself never establishes a critical. Packet mode remains explicitly unavailable.

The exact universal native critical predicate cannot be established from the available immutable bridge: native charge, fluid, climbing and passenger state are not published. No guaranteed critical-hit control or fabricated charge value is claimed. Actual other-player targeting, physical camera movement and exhaustive combinations remain pending, so KillAura is gameplay-observed within this scope, not fully accepted.
