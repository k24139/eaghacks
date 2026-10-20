# Phase 4: local recovery and portability verified

October 19, 2026, America/Chicago. Starting checkpoint:
`2854912b1cfbd25f5938b49a9887498d243d1574`.

The benchmark EPK is recovered byte-for-byte, and independent clean Chrome
profiles imported and loaded it in both verified clients. Both profiles retained
the world across full browser shutdown/restart. The 30 damaged historical PNGs
remain unrecovered and must not be used as valid evidence.

## Inputs and isolation

All four original inputs in `/Users/aaron/Documents/eaghacks-recovery/` passed
complete SHA-256 checks against PROGRESS.md. The stock runtime was named
`Eaglercraft-26.2-u1-Meteor.html`; its full hash identifies it as the saved stock
artifact. See [verified-inputs.json](verified-inputs.json).

The native static verifier passed the HTML, receipt, six embedded payloads,
uncompressed WASM, bridge markers, and runtime source digest. No game build or
native compilation was performed.

The original checkout was on `main` with many pre-existing local changes. Work
was done in a separate worktree on `meteor-client-integration`, under
`input/phase4-worktree`. The original checkout, main ref, original archive, and
all original recovered inputs were preserved. The archive was extracted into
separate task profiles; personal browser profiles were never used. The local
server bound only to `127.0.0.1:3006`.

Host: macOS 26.4 (25E246), Apple M4 arm64, 16 GB RAM, initially 127 GiB free disk;
Chrome 155.0.8059.80, Node v24.20.0, npm 11.19.0, Git 2.50.1. Safari, Helium,
and Comet were present but not tested. The live integration branch matched the
starting checkpoint; live remote HEAD was `main` at `1ccda035bc03a3fac460fc3fe484c383a65a2d59`.

## Export and exact reconstruction

The native runtime opened `Eaghacks Benchmark 2026` from a working copy of the
archive. Gameplay showed the platform and reported `(0.5,150,0.5)`, yaw 0,
pitch 20. Export used **Singleplayer → select world → Backup → Export EPK File**.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Native export after gameplay | 573,791 | `b7bb72d400c012367e9324a801b2278b1cb535c5139702c57168299aede25f24` |
| Native export from untouched archive copy | 570,090 | `018588934c1b5df3e60468bf958578c38c096852918d2f5ebd156175508af87e` |
| Reconstructed original / published fixture | 570,090 | `503a38bc3200d84c5335c710044ab772a7b7f636aa59b01c4de84c7b46cc0784` |

The untouched export contains 1,256 files. All file bytes are identical to the
reconstructed original; only ten header bytes differ, carrying the exporter
date and timestamp. The damaged repository blob contains a Base64-decoded
truncated tool-output warning followed by surviving original data. Its first
179 original EPK bytes are intact. Restoring that header onto the untouched
native export exactly reproduces the independently recorded original hash.
This is an exact reconstruction, rather than a claim that the unmodified new
export had the original hash.

`tools/recover-epk-header.mjs` checks the damaged input's known hash, replaces
only this header, and refuses output unless the **entire** reconstructed EPK
matches the original SHA-256 and every file CRC validates. Its CLI was rerun
successfully and the output compared byte-for-byte with the repaired fixture.
The raw exports remain locally under `input/phase4/`, outside browser profiles.

The after-gameplay export differs in saved clocks, weather, level/player state,
chunk update/inhabited times, lighting sections, and five newly saved entity
files. The chunk-section changes are SkyLight/Y metadata; no block-state change
was found. The seed, settings, world UUID, player position, flat ground, and
platform validate in both exports. [export-comparison.json](export-comparison.json)
records the actual differences. It is not the published fixture.

## Portability checks

Both clients imported copies of the exact original-hash reconstruction into
independent, previously empty profiles at the required origin.

| Check | Native Meteor | Stock |
| --- | --- | --- |
| Clean-profile EPK import | Passed | Passed |
| World selector entry | Passed | Passed |
| Gameplay and visible platform | Passed | Passed |
| Position `(0.5,150,0.5)` | Native snapshot | F3 screenshot |
| World reload after full Chrome restart | Passed | Passed |
| Stock native bridge absent | — | Confirmed |

The stock client also re-exported its imported world. That export passes the
same static identity/settings/platform checks; its changed runtime save data
is recorded in [stock-roundtrip-identity.json](stock-roundtrip-identity.json).

[world-identity.json](world-identity.json) records NBT and chunk validation:
seed `20261019`, flat generator, Creative/Peaceful, commands enabled,
structures/bonus chest disabled, bedrock/dirt/dirt/grass layers at Y=-64…-61,
all 289 stone blocks from `(-8,149,-8)` to `(8,149,8)`, clear air above them,
and saved position/view. All 1,256 EPK file CRCs pass.

The earlier startup-overlay blocker is resolved by waiting for the actual
profile screen with its resource overlay gone before pressing Done. A clean
profile reaches `EaglerCreateWorldSelectionScreen`; use **Import EPK World**,
choose the file, click **Continue**, select the imported row, then click
**Play Selected World**. A double-click during navigation only selected the row
in an initial bounded attempt. These navigation misses did not require changing
either client artifact. Stock navigation was confirmed using actual screenshots
and import log messages, without inventing native bridge signals.

[browser-verification.json](browser-verification.json) links the state records
and eight new screenshots. These screenshots are Phase 4 evidence, not recovered
historical screenshots. Built-in debug counters visible in them were not used
for performance sampling or parity claims.

## Repository binary repair and limitations

The original invalid EPK was 480,240 bytes, SHA-256
`2657d47e64269689eecd25c4969a9b2d0e518b25cd5fcf73c8f68dce1e0fcde0`.
It was replaced only after recovery validation and both-client clean imports
and gameplay checks passed.

The 30 historical PNGs contain truncated tool-output data. Removing their
warning prefix still leaves failed PNG CRCs/missing bytes. No originals were
found among the four recovery inputs, in the source ZIP, or in local Git
history; their introduction already contains damaged bytes. They remain
unchanged, explicitly marked INVALID in [binary-audit-before.json](binary-audit-before.json)
and [binary-audit-after.json](binary-audit-after.json). No historical screenshot
was substituted or certified. New PNGs pass structural and chunk-CRC checks.

Publication uses standard local Git operations on `meteor-client-integration`,
without force pushing. An independent network fetch verifies the published EPK
and new screenshots against local SHA-256 values; its receipt is retained at
`input/phase4/publication-verification.json`. No browser archive, profile,
IndexedDB files, or client HTML is uploaded.

## Validation

- `npm test`: 148 passed, 0 failed, including two focused recovery tests.
- `npm run build`: both browser bundles passed.
- `node tools/smoke.mjs`: `SMOKE OK`.
- Native saved-artifact static verifier: passed.
- Recovery CLI reconstruction and byte comparison: passed.
- Native and stock fresh-profile import/gameplay/full-restart checks: passed.
- Stock EPK re-export identity and platform validation: passed.
- Git whitespace check and published binary hashes: checked before completion.

This phase did not run performance benchmarks, multiplayer tests, native
recompilation, desktop manual input/audio QA, or new module coverage.
