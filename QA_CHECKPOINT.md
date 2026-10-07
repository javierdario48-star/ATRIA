# ATRIA 4.8.7 QA checkpoint

Last source-audit checkpoint: 2026-10-07.

## Verified by executed Node regressions
- bounded frame catch-up / maintenance separation
- 5,000-frame runtime stress and 1,000 lifecycle transitions
- network backpressure cadence
- universal study timing/native precedence contract
- deterministic 2–4 player room start
- stale room ACK rejection and active disconnect handling
- remote movement interpolation
- competitive 24 real minutes = 24 game hours
- natural greetings and medication-history routing
- patient/nurse/Vega target separation
- five-part physical exam state
- vascular access, monitor and treatment state
- patient better/worse/resolved/dead evolution
- clinical history source/certainty
- Vega uncertainty/critical-rescue policy

## Additional source audit completed
- Fixed brittle runtime-integration CI gate; CI reached a fully green architecture/build run at 844578e450f9ad243227950b8e4cdb1b34bfbb73.
- Fixed Vega uncertainty classifier typo (incertainty -> uncertainty).
- Added stale transient-speech cleanup regression coverage for lobby/mode transitions.
- Hardened multiplayer restart: START clears previous ACKs; disconnect while starting clears token/ACK state before returning to ready/lobby.

## Source modules present
App lifecycle/frame/boot guard; clinical dialogue/exam/treatment/history/evolution/mentor/studies; social friends/network/rooms/interpolation/competitive clock/voice; adaptive render; mobile chat.

## Golden-master boundary
Production 4.8.6 remains untouched. 4.3.2 is structural reference only. The QA build must not use runtime string replacement patches.

## External boundary
The repository does not contain the full 4.8.6 application document; current build mirrors the 4.8.6 production document at build time. Therefore the new source modules cannot honestly be declared integrated into the live application until a current 4.8.6 build artifact/source is available to the QA build. Do not substitute 4.3.2.

Next release action after Vercel build access is available: produce exactly one QA candidate from the 4.8.6 golden master, integrate the verified modules at source/build level, run the complete repository suite, then browser/mobile/two-client smoke QA. Do not promote production before those gates pass.

## 2026-10-07 golden-master recovery and source integration
- Recovered byte-faithful 4.8.6 via GitHub Actions and persisted it under vendor/atria-4.8.6 (index.html plus task3.js–task13.js and SHA-256 manifest).
- Normal QA build is now offline/reproducible from repository state; build.js no longer fetches the Vercel production alias.
- QA workflow no longer requires Vercel to run tests/build.
- Added historical-flow contracts against the real 4.8.6 source.
- Added deterministic source integration transform with strict anchors; immutable vendor snapshot is never edited.
- Integrated universal study resolution: native case result wins; otherwise a normal fallback is returned.
- Added arbitrary /estudio <nombre> fallback so valid named studies are not rejected merely because the current case omitted them.
- Converted both direct and post-collection study turnaround paths to 1 real minute = 1 game hour.
- Added peer data-channel backpressure guard.
- Removed the intentional UI gate that hid/disabled the existing WebRTC social voice transport; task13 continues microphone permission priming.
- CI reached green after the direct/lab timing correction (ded7048a...) and after universal free-form study implementation (d45dd180...).

Remaining release gate: browser/mobile/two-client behavior must be exercised on an actual served candidate before any production promotion. The Vercel account currently connected to ChatGPT does not expose the night-shift-clinical project, so production/deployment access remains separate from source development.


## 2026-10-07 guard-performance recovery
- Restored build.js to byte-copy golden-master task files; runtime retirement is expressed only in the 4.8.7 integration layer.
- Retired legacy study fallback loaders task7.js, task8.js and task12.js from the integrated artifact. Their golden-master files remain unchanged and copied by the build.
- Fixed QA output-safety and inline-script syntax gates. CI run 37697563154 established a fully green source/build/artifact baseline before the runtime smoothing change.
- Confirmed the legacy guard data channel transmits movement snapshots every 220 ms while csDrawRemote previously rendered raw packet coordinates. Wired render-cadence interpolation into the actual guard renderer and added integration regression coverage.
- HEAD 9f2b396414ab3fd942cbe1e78ee1b8ca9acaa3d7 passed the complete GitHub Architecture QA workflow (run 37697662396), including tests, offline golden-master build, artifact safety, generated JavaScript syntax checks and artifact upload.
- task3/task4/task5 remain loaded intentionally: audit shows they still own friends persistence/automatic social repair, return-to-lobby/mobile UI repair, and automatic group voice respectively. They were not removed merely for containing timers.
- Remaining browser gate: real guard FPS/jank and two-client symmetry/voice must be exercised on a served preview. The connected Vercel team currently exposes no linked ATRIA/night-shift project, so no existing-project preview can be created from this connection without creating/relinking infrastructure.


## 2026-10-07 forensic runtime audit — shared multiplayer / voice

### Root causes found and corrected
- The first guard interpolation fix only covered the legacy single-peer `csDrawRemote`. The real shared-room layer later overrides that function and iterated `csCoop.remotes` while still drawing raw `r.x/r.y`. Therefore 2–4 player server rooms could still visibly jump even though the legacy renderer regression was green.
- Shared-room state transmission also overrode the legacy sender, so the earlier legacy backpressure assertion did not prove the actual shared-room sender was protected.
- Corrected the real shared-room override: each remote peer now owns independent interpolation state in `csSharedRemotePose`; rendering iterates every entry in `csCoop.remotes`; shared packets carry monotonic `stateSeq`; older sequenced state is rejected; disconnected/stale interpolation entries are removed; the shared sender checks channel backpressure.
- Voice audit found two owners for the same clinical PTT gesture. `task13.js` captures `pointerdown` on `radioPttBtn` at document capture phase and calls legacy `csRadioDown` with `stopImmediatePropagation()`, while `task5.js` owns automatic lobby/room group voice and wires the same button. This can prevent task5's room-voice handler from receiving the gesture.
- 4.8.7 therefore retires the task13 loader only. The immutable task13 golden-master file remains copied in `out/`. Task5 remains loaded and owns mic acquisition, one persistent stream, per-target voice peers, PTT, lobby/room targeting and peer cleanup. Browser/device audio remains an E2E gate.
- Investigated task3's automatic `register()` call. It routes through the same `acquireSession()`/shared `connectPromise` as 4.8.7 `ensureSession()`, so the apparent duplicate caller does not create two concurrent registration requests. task3 remains loaded for friend persistence; its 1200 ms compatibility tick/MutationObserver remains a bounded legacy cost rather than being removed blindly.

### Executed stress / artifact evidence
- CI run 37699721540: SUCCESS at `f77f8d8c73af8f520cbd0599ac9425e4232f000d`.
- Runtime scheduler stress: 5,000 frames, 4,831 simulation steps, 5,000 maintenance passes, 2,338 renders, 1,000 lifecycle transitions; no unbounded catch-up or generic lifecycle leak.
- Hostile shared-motion stress: 10,000 frames with three simultaneous remotes (four players total), deterministic jitter/duplicate/stale injection; 2,390 accepted packets, 58 stale/duplicate packets rejected, maximum rendered frame displacement 2.779 units. Independent remote pose state remained bounded and disconnect removed one peer without affecting the others.
- CI run 37699822906: SUCCESS after task13 retirement and single-PTT-owner regression.
- Artifact integration regressions verify the shared renderer iterates all `csCoop.remotes`, draws interpolated `p.x/p.y` rather than raw packet coordinates, carries `stateSeq`, rejects stale sequence values, and retains task5 while excluding task13 from runtime.
- Golden-master files remain untouched. Retired task7/task8/task12/task13 files are preserved as immutable build copies; only their artifact loaders are removed.

### Runtime inventory notes
- Golden-master inline document contains 33 RAF call sites, 12 intervals, 11 MutationObservers, 2 ResizeObservers, 2 RTCPeerConnection construction sites and 12 `getBoundingClientRect` call sites before external task scripts are counted.
- No `TreeWalker`, `document.body.innerText`, `querySelectorAll('*')` or IntersectionObserver call sites were found in the golden-master inline document.
- High-frequency legacy intervals inspected include peer state at 220 ms, mentor coffee watcher at 120 ms, hospital audio at 250 ms and monitor/audio maintenance at 120 ms. The 220 ms peer timer is explicitly replaced on restart and cleared by `csCoopDisconnect`; board refresh is modal-scoped. Browser profiling is still required to quantify actual main-thread cost of the remaining audio/UI compatibility loops.

### Evidence matrix
| Area | State | Evidence |
|---|---|---|
| Golden master | DEMONSTRADO | Immutable vendor snapshot retained; integration edits loaders/output only |
| Build | DEMONSTRADO | Offline golden-master build passes CI |
| Artifact | DEMONSTRADO | Integration + generated-JS syntax gates pass |
| Local lifecycle | FUERTE EVIDENCIA | 1,000 generic lifecycle transitions; actual browser resource counts still unavailable |
| Guard performance | FUERTE EVIDENCIA | redundant study pollers removed; real shared raw-coordinate renderer fixed; browser FPS remains |
| Solo | FUERTE EVIDENCIA | source/clinical/runtime regressions; visual browser gate remains |
| Apprentice | FUERTE EVIDENCIA | mentor policy/clinical regressions; visual browser gate remains |
| Clinical | FUERTE EVIDENCIA | study, dialogue, exam, treatment, history, evolution tests green |
| Social | FUERTE EVIDENCIA | single session owner plus shared connectPromise; real server/browser reconnect remains |
| Coop 2P | FUERTE EVIDENCIA | actual shared artifact wiring audited; two-device E2E remains |
| Coop 3P | FUERTE EVIDENCIA | actual renderer iterates all remotes + deterministic 3-remote stress |
| Coop 4P | FUERTE EVIDENCIA | room supports max four; 3 simultaneous remotes stressed |
| Competitive | FUERTE EVIDENCIA | room/start/clock contracts green; browser E2E remains |
| Remote interpolation | DEMONSTRADO | both legacy and real shared-room render paths now interpolate |
| Network jitter | DEMONSTRADO | 10,000-frame deterministic hostile-network stress |
| Disconnect | FUERTE EVIDENCIA | pose cleanup/room reducer/RTC teardown contracts; browser transport remains |
| Reconnect | FUERTE EVIDENCIA | session/room retry architecture audited; real network E2E remains |
| Voice lifecycle | FUERTE EVIDENCIA | conflicting PTT owner removed; task5 single-stream/peer-map architecture retained |
| Mobile contract | REQUIERE BROWSER | source handlers/regressions exist; Android keyboard/viewport is environment-dependent |
| Long-session stability | FUERTE EVIDENCIA | 10k-frame network stress + 5k scheduler stress; browser heap/main-thread profiling remains |

### Remaining genuine browser gates
- Real Android/desktop FPS and main-thread jank.
- Two-device symmetric presence under actual network conditions.
- Physical microphone permission/audio playback and WebRTC behavior.
- Keyboard/visualViewport behavior on Android.
- Perceptual rendering/layout correctness.

No production deployment or promotion was performed.


## 2026-10-07 universal study invariant

### Root cause and architecture
- The previous 4.8.7 fallback was not a true catalog invariant: it synthesized arbitrary `universal_<text>` studies and used one generic result. That made misspellings indistinguishable from valid studies and did not prove every valid case/study pair.
- Consolidated the source contract into the existing `src/clinical/study-registry.js` rather than keeping a second resolver. It now owns catalog construction, canonical/alias resolution, case override materialization, normal fallback generation and the 60,000 ms/game-hour turnaround conversion.
- Runtime artifact wiring mirrors that contract from the real `CASES` data: native/current-case aliases are resolved first, then the universal catalog; a valid non-native study receives its catalog normal; genuinely unknown names are rejected and never materialized as invented studies.
- Case-specific result precedence is preserved. Seed/etiology overrides that wrap `orderStudy` remain downstream and can still replace the resolved case result intentionally.

### Exhaustive evidence
- Cases: **13**
- Canonical catalog studies: **51**
- Exhaustive matrix: **663/663 case × study combinations**
- Native case overrides: **54**
- Universal normal fallbacks: **609**
- Native label/alias checks: **293**
- Unknown control `banana cuántica`: rejected as absent from catalog.
- Every catalog entry is required to have a non-empty normal fallback and positive turnaround.
- Pipeline stress created **663 simultaneous logical orders** across all 13 patient states, with maximum turnaround **8 game hours** and invariant **1 game hour = 60,000 real ms**. Every result matured only in its owning patient map; deterministic repeated resolution for the same patient+study was verified.

### Result privacy / UI
- Study completion notifications contain availability only: active-patient nursing notification names the study but not `o.result`; inactive-patient global notification reports only the count of available results.
- Removed result content from the general Chart/History view. That view now reports only how many results are available and directs the player to **Estudios**.
- `studiesHTML()` remains the sole normal clinical view that renders `o.result`. Integration regressions fail if history/completion notification paths render the result content.
- No golden-master file was modified; this is source integration on the immutable 4.8.6 baseline.

### Final verification for this phase
- CI run **37701174403**: **SUCCESS** at `67b42fae3ccc1a07e9f67fa450e68f7a2c4557d2`.
- Full architecture/history regressions, exhaustive study matrix, study pipeline stress, offline golden-master build, artifact output-safety and generated inline JavaScript syntax all passed.
- Browser remains required only to confirm presentation/interaction visually; the catalog/fallback/precedence/timing/no-result-banner contracts are now mechanically tested.


## 2026-10-07 natural-language stabilization checkpoint

- Baseline QA HEAD: `aa47767165692e59d558a9b391ea567ffa4dd7a9` (CI `37703470096` SUCCESS).
- Root cause: natural-language requests used substring scoring on the entire utterance; this could order nested/overlapping study names and did not guard questions or negation.
- Added `src/clinical/natural-study-orders.js` with token-boundary recognition, negation/question guard, alias de-duplication, longest nonoverlapping matching and preservation of spoken order. Added `natural-study-orders.test.js` and wired it into the full CI suite.
- Updated the source-integrated artifact order handler to enforce the same matching constraints while preserving existing `orderStudy` ownership. Did not modify the golden master, network, voice, auth or production.
- CI `37704324289` **SUCCESS** at `e1cd5973cf915addd231f23c2408a8b2949b56e3`: full tests, offline build and artifact safety checks.
- Remaining browser gates: actual nurse input behavior on Android, keyboard/layout, multiplayer symmetry, WebRTC audio, frame pacing and visual UI. No preview deployed in this phase.
- This checkpoint does not claim browser E2E coverage. No production deployment or promotion.
