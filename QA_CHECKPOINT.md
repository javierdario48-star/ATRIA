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
