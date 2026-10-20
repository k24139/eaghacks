# Phase 10: local native-source recovery and publication diagnostics

October 20, 2026, America/Chicago. Started from the independently verified Phase 9
publication **0969e356b6e9f7e3e31d5670a9ae399c976651cf** on
meteor-client-integration in the existing integration worktree. The final Phase 10
containing commit and independent fetch receipt are recorded after publication
in the final response and ignored input/phase10/publication-verification.json.
Original checkout/main, task source/world originals and the known-good runtime
are preserved. No native hook implementation, Java edit, native compilation,
FULL optimization, matched benchmark or release packaging ran.

**Source recovery is partial and the historical lobby failure remains unresolved.**
The accessible local sources were verified, and three overlay source copies were
recovered from the local ZIP; no missing core native source was found. The
investigation narrowed snapshot-start versus completion and identified gaps in
exception visibility. Missing exact native implementation and source mapping
block a confirmed root cause or native repair. This phase stops with those
precise blockers documented.

## Phase 9 publication completed after sensitive-data review

The user explicitly authorized the specified repository, branch and safe QA
payload. Review of all original 70 changed files found private direct invitations
and transport/session identifiers in local logs. Nineteen text files were
sanitized; numeric/boolean/null diagnostic values, results and all 14 PNG byte
hashes were preserved. All screenshots were visually reviewed. No profiles,
IndexedDB, native HTML or personal source/storage files were included.

The original d85a48d793b51921bf1058d44aaa12ce87f4fd76 commit remains only in a
local backup ref. It was not published and is not an ancestor of the sanitized
commit. The sanitized publication is a direct child of the expected remote Phase 8
head e60ec2ae87622b6032f8756f9ece57fe803b1a53. See the Phase 9 PUBLICATION_REVIEW
files for every original path, old/new hashes and redaction counts.

A normal fast-forward Git CLI push published **0969e356b6e9f7e3e31d5670a9ae399c976651cf**
to https://github.com/k24139/eaghacks.git, meteor-client-integration. An independent
fresh repository fetched that exact SHA, matched tree
**d871897b24fc338b5ef98ed5523316eee0ce1f54**, ran Git fsck and compared **573 tracked
files** byte-for-byte with local files, including all changed PNG SHA-256 hashes.
Main remained 1ccda035bc03a3fac460fc3fe484c383a65a2d59 and the original checkout's
status was unchanged. phase9-publication.json is the compact receipt; the full
file manifest remains in ignored input/phase9/publication-verification.json.
Phase 10 began only after this verification succeeded.

## Search scope, recovered files and provenance

Read PROGRESS.md, INTEGRATION.md, MODULES.md, Phase 9 report/root-cause/manual and
verification evidence, Phase 8 report and the Phase 6 module matrix. No module
coverage was upgraded. Detailed source paths and expected pinned blob IDs are in
[source-search.json](source-search.json); verified local file SHA-256 and Git blob
IDs are in [source-provenance.json](source-provenance.json).

The pinned native revision remains **1be2375ad67cb42a52d5f586a2422e54b57be625**.
Searches covered accessible entries under Documents (including original and
integration worktrees and eaghacks-recovery), local cache roots and private/tmp.
Twelve local Git repositories were queried read-only for ten exact expected
source blobs, including unreachable objects available to cat-file. All twelve
queries completed; none contained a requested blob. Private unrelated repository
names and filenames are omitted from the publication summary.

Downloads and Desktop exist but macOS returned Operation not permitted even
outside the sandbox: they were **not successfully searched**. Protected OS cache
subdirectories were also unreadable. Browser profiles/storage/caches and unrelated
archive contents were excluded. ~/.gradle and ~/.m2 do not exist. The original
Linux build path /tmp/eaghacks-complete-UDdGE8/upstream and the recorded
/workspace/scratch/673e9e5e458a recovery location are absent on this Mac.
No repository access block, macOS permission or authentication control was bypassed.

Two identical local Eaglercraft-26.2-u1-Meteor-Source.zip files were inspected:
**309,537 bytes**, SHA-256
**0517476a238c1e3fc30fed66a6699635baed5176b6d5f2d46c163743c6e31e66**.
All 83 entries pass CRC checks. Only three Java files are present, all bridge
overlays; none is a requested core source or source map. This archive is distinct
from the historical 303,717-byte checkpoint with hash 0ea9b5fc… recorded in
PROGRESS.md; that historical checkpoint was not found and is not being substituted.

Recovered ignored copies of these existing overlay sources match the current
runtime's overlay files byte-for-byte:

| Overlay file | Bytes | SHA-256 |
| --- | ---: | --- |
| EaglerHacksNativeBridge.java | 10,783 | `0ca000b5bb0292d62d913e920182f98d9b5871480d968ba408748c2bb56b4d06` |
| PlatformMeteorBridge.java, TeaVM implementation | 12,018 | `8df00b77aa83b39c0e1af2f32412601d7e53e533ff06fd59d1d07fb2079d91ad` |
| PlatformMeteorBridge.java, platform contract | 3,363 | `848e7fbf7155a91ea5053eb8f1b23be9887a195a12a18f33cb719a948fbc475d` |

Existing EaglerLANPeersScreen.java and PlatformInput.java, plus lan-discovery.js
and lan-server.mjs, were matched to exact Git blob IDs in the saved pinned tree.
These were already available before Phase 10; they are not counted as newly
recovered missing native components. Their full hashes are in source-provenance.
No recovered native/TeaVM source code is newly redistributed in Phase 10.

Still missing: Minecraft, SingleplayerServerController26, TeaVM PlatformRuntime,
PlatformWebRTC, LANInvites and TeaVM ClientPlatformSingleplayer, plus relevant
platform contracts/variants. Expected paths, sizes and Git blob IDs are recorded
so a future lawful source package can be checked exactly. Complete pinned native
checkout, TeaVM dependency jars/build manifests and a Java symbol/source map are
not recovered. The existing native build receipt binds the retained WASM to the
pinned revision and fast-analysis development build; it is not a source archive.

A 13,984-byte embedded TeaVM JavaScript runtime was recovered locally from the
exact HTML, SHA-256
`1e80092312d7bfe6efa74f8bb372d5521bc0549dcfbf384f25a145261a80d124`.
It matches the previously saved loader literal, but is **not** recovered Java
PlatformRuntime. It remains ignored. Static parsing of the unchanged WASM found
only teavm.memoryRequirements and teavm.imports custom sections: no name/source
map/debug sections. An external symbol map might once have existed; none was
found. No native build, WASM compile or decompilation was run.

## Host-lobby findings and confirmed limits

Read [LOBBY_FINDINGS.md](LOBBY_FINDINGS.md) for the evidence partition, exact
existing method boundaries and future regression plan.

The bridge's started sequence increments in beginFrame; completed sequence is
published in endFrame and pending state is deleted. Publication precedes
applyCommands. Started-versus-completed/pending state can separate a failure
before the bridge from an interrupted snapshot build, though it cannot name the
exact native method. The screen object only changes on screen/overlay changes;
it is not a tick heartbeat. Native tick is world time, and session.paused is the
presence of menu/overlay, not an independent integrated-server pause measurement.

LAN discovery subscriber exceptions are caught without being surfaced as uncaught
page errors. Consequently the absence of pageerror cannot exclude errors at a
native-facing subscriber. Its event queue is bounded to 64; pollEventsJson drains
it, so observation must not consume this API. Neither swallowed callback errors
nor queue overflow was observed to cause the stall. They are investigation paths,
not confirmed causes or speculative fixes.

The exact client was prepared in one dedicated headed Chrome 155.0.8059.80 task
profile. A 1.5-second healthy gameplay control advanced browser frames **567→747**,
world time **53850→53880**, and both started/completed sequences **155→185**, with
no pending state at either endpoint. bridge-publication-control.json records the
actual values. This is a single-client signal control, not another multiplayer
reproduction. No unnecessary two-client test or performance comparison was run.

Phase 8 did not capture started/pending sequence at its historical stationary
completed-sequence observation. Phase 9's two post-acceptance B paths succeeded.
Those records cannot now identify whether the historical native continuation,
bridge build, command stage or LAN/worker handling was interrupted. No confirmed
affected Java method, source fix or new certification of host-lobby reliability
is claimed. Preserve the known-good pre-acceptance return-to-gameplay workaround.

## Manual QA and validation

The existing Phase 9 manual checklist was reused. The exact client loaded a
disposable copy of prior task storage in input/phase9/phase10-manual-profile;
no personal or benchmark profile/world was used. The user previously reported
being unavailable. Physical continuous movement/recenter, pointer-lock transitions,
post-acceptance physical Back/Escape, human audio listening and mute/focus listening
remain **pending**. Physical tests performed: **0**. Human listening tests: **0**.
Automated navigation and signal observation are labeled as such. The prepared
client and loopback server were closed after recording; the dedicated profile is
retained locally for later manual operation.

To reopen, use the Phase 9 checklist commands with profile
input/phase9/phase10-manual-profile and the unchanged input/phase8/native-fixed.html.
Do not label the helper's automated navigation as physical verification.

| Phase 10 automated check | Result |
| --- | --- |
| npm test | **162 passed, 0 failed** |
| npm run build | Both browser bundles passed |
| node tools/browser-check.mjs with loopback harness URL and task Chrome | **20/20** |
| node tools/smoke.mjs | **SMOKE OK** |
| Exact runtime verification | HTML/source/six encoded+decoded payloads/client WASM all unchanged |
| Archive inspection | Both 83-entry copies CRC-valid; 3 overlay files match current bytes |
| Pinned local source verification | Four existing Java/JS files match recorded Git blob IDs |
| Healthy bridge publication control | Started/completed +30, world +30, browser frames +180 |
| World exit and double shutdown | Zero listeners/owned input/held keys/use/capture/module errors |
| Historical preservation | All initially hashed Phase 6–9 reports unchanged; generated tracked harness PNGs restored to original bytes |

No implementation changed, so additional Phase 8/9 two-client regressions were
not repeated. The full unit suite still includes the four lifecycle/safety tests.
The Phase 9 real-client reconnect, forced-loss, identity, remote-policy and
cleanup results remain hash-bound prior evidence, not new Phase 10 gameplay
claims. The 30 corrupt historical screenshots remain invalid and unused.
No new screenshot is needed for this documentation-only phase.

Recorded macOS free memory was 58% during preparation and 65% after cleanup; these
are samples, not a continuous peak. One full client ran; the synthetic harness
used a lightweight separate task Chrome instance. No native compiler ran.
No task Chrome main process remains, the loopback server shut down, and unrelated
Chrome processes were not terminated. Logs retain the required validation. The
initial sandbox filename search missed macOS-protected locations; an authorized
outside-sandbox retry confirmed their denial. An overbroad redaction draft in
the publication review was rejected by JSON parsing, regenerated from the untouched
original commit, and validated structurally before any commit/push. It did not
alter the retained originals or published numeric evidence.

## Runtime identity and future native-build requirements

| Artifact | Unchanged identity |
| --- | --- |
| HTML | **80,978,184 bytes**, `9989669a3b71bcd38b6f2ff15ac24debfe644f638194a8225923f564bb6339b0` |
| Runtime source digest | `d2cc8f7711a9b7a8c218232066c0d3c67135c5b4e644f3b0d098c028ac2aa7a0` |
| Client WASM | **93,857,501 bytes**, `aaf01b02e7bab4183431102bd42c4f4045e2633c707d81451b050921019e002d` |
| All six native payloads | Unchanged; complete encoded/decoded hashes in runtime.json |

Future native work requires lawful complete source at the exact pinned revision,
matching TeaVM jars/build dependencies, Java 25 and the recorded Gradle 9.6.1
build path, plus verified resource/payload inputs and an isolated copy for the
existing bridge patch. Resolve Mac/ARM toolchain support without starting a build
as a recovery action. Obtain separate authorization for instrumented compilation,
keep the original runtime available, and budget the 16 GiB machine with browsers
closed during compilation. Do not infer a FULL/release build requirement.

First resolve loop/bridge/LAN continuation tracing before making a lobby repair.
Only then plan one narrow missing native capability against the Phase 6 matrix,
for example bounded read-only block lookup: define its Java/platform/adapter ABI,
capability gate, bounds and lifecycle cleanup; inspect the exact relevant world
APIs from recovered source; add focused tests and real-client checks; advertise
it only when implemented. Inventory transactions, collision/knockback interception,
camera detachment, timing and world identity are separate contracts. Existing
read/velocity/slot APIs do not imply those hooks. No unsupported module was
implemented or promoted in this phase.

## Publication and stopping point

Only Phase 10 documentation, validation logs, hashes and sanitized structured
observations are committed. Recovered source, raw local-search inventories,
browser profiles, storage and standalone HTML remain ignored. A normal Git CLI
push and independent fresh fetch verify the final commit/tree and every tracked
file; the final response and ignored receipt hold the containing commit SHA.
Main and the original checkout remain unchanged.

Stop after Phase 10. The next action is obtaining the unavailable lawful pinned
source package or access to user-selected source archives in currently unreadable
locations, then checking the recorded blob IDs. Keep physical QA pending until
performed. Do not begin native hooks, native compilation, FULL optimization or
release packaging from this handoff.
