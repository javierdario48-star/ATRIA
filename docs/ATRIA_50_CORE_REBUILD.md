# ATRIA 5.0 — experimental core rebuild

**Branch:** atria-5.0-core-rebuild-experimental
**Protected legacy baseline:** atria-4.8.7-structural-cleanup-qa @ be6707b9ea9c9cff66db442acc374e4aea95f6ce (16/16 GitHub Actions jobs green).
**Status:** independently built original-art game with C1 studies and a published and browser/CI-verified complete C2 CIRR care journey: history, exam/vitals, real oral administration, original physiological model, reassessment, diagnosis, safe disposition and unique persisted XP. Other cases retain navigation/studies; voice, tutor, shared multiplayer, complete career and full visual parity remain pending. Original CIRR spironolactone has no modeled diuresis/ascites kinetics or acute vital effects. No production deployment; this is not completion of all ATRIA 5.0. Current publication evidence and recovery instructions: `docs/ATRIA_50_HANDOFF.md`.

## Technical decision

Retain ATRIA's clinical content, artistic assets, rendering, gameplay rules, nurse scanner, room reducer, and frame scheduler as references or explicit imports. Build a canonical module-based game source, with no HTML string-anchor patching in new code.

The Forgotten Server (TFS/OTServ) supplies architectural inspiration: protocol/input boundary, authoritative game state, sequential action validation, scheduler, and chat distribution. No GPL-2.0 source or assets are copied; ATRIA remains JavaScript.

## First real vertical slice

- src/v5/core/speech-router.js: one pure text/voice command classifier, reusing the validated 4.8.7 nurse scanner.
- src/v5/core/room-authority.js: serialized, authenticated, room-scoped command executor; one transcript, one event ID, room revisions, competitive ownership and cooperative shared action.
- src/v5/adapters/native-clinical-port.js: explicit gateway to ONE native clinical executor; no second drug engine.
- src/v5/core/replica.js: read-only, monotonic versioned client state; older network updates cannot roll back room state.
- src/v5/index.js: reuse existing proven roomReducer and FrameScheduler, no monkey-patching.
- Tests: treatment/study separation, delayed/repeated network commands, wrong patient, forged actor, 2–4 participants, competitive claiming, question/negation, unconfirmed receipts and stale snapshots.

At the recovery checkpoint these were isolated domain modules with an injected test executor. B1 now supplies an independent renderer/application, and C1 connects the real study service through this authority and port. C2 now connects native CIRR care; full all-case medication/physiology parity remains pending. **The 2–4-member domain tests are objects in one process, not independent multiplayer clients.** The unchanged 4.8.7 build remains the full-game control group.

## Design invariants

1. Real native patient data is always the clinical source of truth; no state mutation from rendering, bubbles, or transcript replication.
2. Verified transport identity is supplied by an adapter. Neither actorId nor patientUid from an untrusted chat packet authorizes medicine.
3. Room commands are processed serially. Retries with the same event identity cannot trigger a second clinical effect.
4. Chat is one shared room transcript. Closest patient is the ordinary speech recipient; explicit or focused nurse/Vega conversation uses that NPC. Chat remains globally visible.
5. A study can only become study.request. Every therapy comes from an explicit recognized medicine; non-executable, ambiguous or unknown messages remain visible but cause no effects.
6. Competitive patient owners alone execute clinical mutations; cooperative users share the same native executor. A rejected action cannot claim a competitive patient.
7. Confirmations cannot be called administered unless the native executor says executed and returns a matching patient-scoped receipt.
8. Clients may render snapshots, not replay treatments; old snapshots are ignored.
9. Source-of-truth migration cannot begin by deleting the golden master or switching the production build.
10. TFS architectural concepts are reimplemented in original JavaScript, not translated/copied C++.

## Subsequent reconstruction requirements

1. Effective case/registry/map/asset extraction is complete (A1); do not repeat it or rebuild validated navigation.
2. Study requests/results and pending completion are connected (C1). Next migrate native nurse procedures, dosing, administration and physiology through the same port; no parallel medication engine.
3. Local guard text and study-menu selections use the authority. Patient dialogue, tutor, voice, lobby/guard history continuity and authenticated shared transport still need integration.
4. Original map/assets and a canonical UI are independently executable (B1). Full UI/clinical parity is pending; remove historical source ONLY after its replacement passes equivalent browser tests.
5. Establish real browser integration checks on the new page for 2, 3 and 4 participants plus suspend/reconnect and physical Android acceptance.
6. Measure absence of duplicate listeners, timers, effects, messages and XP; protect the 13 existing case paths.
7. No promotion to the playable branch until visual and behavior acceptance is achieved.

## Run locally

Node.js 22+:
- npm run test:v5 (canonical game, studies, authority and lifecycle contracts)
- npm run build:v5 (independent executable in out-v5)
- npm run qa:v5-browser (real desktop/mobile-emulated navigation)
- node qa/v5/boot-focus-browser.mjs
- node qa/v5/studies-browser.mjs (real elapsed study clock and UI results)
- node --test src/v5/core/room-authority.test.js src/v5/adapters/native-clinical-port.test.js
- npm run build (verifies the untouched 4.8.7 candidate build)
- node src/app/golden-master-contract.test.js

Do NOT interpret a green V5 unit suite as proof that the 5.0 replacement game is ready. Existing 4.8.7 remains the playable control group.


## Independent clean source build

Run npm run build:v5-core to create out-v5-core/src/v5/index.js and its referenced
pure modules. This command imports the actual newly built public API and writes
a SHA-256 manifest. It does not load the golden HTML, rewrite its scripts, or
alter the existing out/index.html. This original pure-core distribution is still
separate from the new executable game: `npm run build:v5` creates `out-v5/index.html`.

## Reconstruction checkpoint ledger — 2026-10-15

Recovery: remote HEAD `64fedba8c8a0fb49fca58e210985740b09e26bed` and successful CI [38658985952](https://github.com/javierdario48-star/ATRIA/actions/runs/38658985952) verified before editing. Work is isolated from an unrelated modified 4.8.7 checkout. No protected branch or vendor file changed.

### A1 — Effective original content and spatial engine

- `src/v5/content/`: 13 effective case definitions, algorithms, exam segments, therapy/default-dose catalog, eight beds, colors and 13 original image assets. Capture includes later corrected case data, not only the first `CASES` literal. Provenance records the exact original and generated-reference hashes and each asset/data SHA-256.
- `scripts/import-v5-content.mjs` is a one-time migration utility. Neither V5 build nor runtime invokes it or reads historical HTML.
- `src/v5/engine/navigation.js`: one explicit radius-aware spatial owner. Original dimensions, grid, door rules, 205 px/s movement, 10.5 px radius and walking phase retained. Swept-circle collision and safe route edges remove furniture-corner stalls without altering the authored map.
- Verification: content 2/2, navigation 13/13; all eight original bedside approaches plus coffee/reception/imaging traversed at 60 Hz; frozen historical-flow contract passing. Original full `npm test` finished with exit 0.
- State: canonical assets and executable isolated navigation module. App/UI integration follows in B1. Clinical seed data alone is not an implemented clinical engine.

Published A1: `a171de907317f00a92d0bfda9f8dfd878da22c23`; [CI passed](https://github.com/javierdario48-star/ATRIA/actions/runs/38663219281).

### B1 — Independent navigable game

- `src/v5/app/`: bootstrap with fatal/retry boundary, one lifecycle, one fixed-step/RAF owner, world state and input coordination. Lobby ↔ guard transitions replace owned entities and drafts. No historical global override is installed.
- `src/v5/render/hospital.js`: original map, garden/pavement, aspect-preserving sprites, original gait proportions, camera scale/projection and nameplate. It only reads spatial snapshots.
- `src/v5/web/`: canonical HTML/CSS and familiar HUD/chat/guard/profile controls. This is an exploration checkpoint: coop/competitive are visibly unavailable; clinical treatment/XP are not represented as implemented.
- `scripts/build-v5.mjs`: explicit transitive ESM dependency closure plus committed content, deterministic SHA-256 manifest. Test builds in a clean temporary tree without `vendor/`, integration HTML, or old build output. `build:v5-core` now writes a different directory so it cannot erase the game distribution.
- At B1, isolated study service `src/v5/clinical/studies.js` reused the existing registry and turnaround rules. Tests complete 949 combinations (73 studies × 13 cases), preserve native results/fallbacks, and reject identity collisions/repeats. C1 below connects it to the UI, without claiming physiology integration.
- `vercel.json` on this experimental branch selects the new build/output. Stable branches and production settings are unchanged; deploy only a branch preview.
- Verification: `npm run test:v5` 47/47; independent build; original full `npm test` exit 0; golden master unchanged. Real Chromium desktop, Pixel 5 emulation and landscape pass movement, initial chat, 15 total guard/lobby cycles, synthetic IME, viewport bounds and measured listener/RAF disposal. No physical Android test was performed.
- Independent review found unsupported saved colors, walking during editing, and uncaught module failures. All were reproduced RED and fixed GREEN, plus focused rotation. Six real-browser regression scenarios cover these findings.
- State: an executable, navigable local game. No full 4.8.7 clinical/multiplayer parity claim.

Published B1: `da4b64e200effc605e18f47013be6777dd8c376c`; [all CI jobs passed](https://github.com/javierdario48-star/ATRIA/actions/runs/38663833989). Branch preview opened in an independent browser and verified through title, lobby and guard. C1 supersedes this navigation-only checkpoint.

Commands: `npm run build:v5`; `npm run test:v5`; `npm run qa:v5-browser`; `node qa/v5/boot-focus-browser.mjs`. Browser commands accept `PLAYWRIGHT_MODULE_PATH` and `CHROMIUM_EXECUTABLE_PATH`. CI archives the standalone build and browser evidence separately.

Reference capture: `npm run build`, then `node qa/v5/capture-reference.mjs`. The resulting JSON can reproduce the one-time content migration; it is never needed to build/play V5.

### C1 — Real local clinical studies and asynchronous completion

- `src/v5/clinical/guard-session.js` composes the existing room authority, private native clinical port, canonical study service and original pure clinical clock. One authoritative patient owns orders. Trusted world proximity chooses the target; UI and chat cannot write patient data. Solo/apprentice use this same composition. Apprentice tutoring is still unavailable.
- Text and the actual Historia → Estudios menu submit through the same serialized command lane. Case-specific study aliases precede the global fallback catalog. Menu selections preserve the selected study ID while presenting the familiar clinical label. No treatment is inferred from a study.
- One real second advances one clinical minute (24 real minutes per 24 clinical hours). The study service retains original turnaround rules; frame scheduling owns advancement, without a second timer. Results remain visibly pending until the clinical deadline. No native physiology is loaded in this checkpoint.
- `native-clinical-port.complete()` accepts only a known pending event with the exact patient/event receipt. Room authority serializes completion with commands, updates the original cached acknowledgement, and emits a monotonic completion event. It never attributes a result to later chat.
- Two messages requesting one pending study share one physical order/result; both original acknowledgements settle, with one availability announcement. Retries cannot move the deadline or create another order. Disposal unsubscribes completion and blocks later composite actions/presentation commits; it cannot undo a native action already dispatched before disposal.
- Review regressions were reproduced failing before correction: 12/54 native study labels selected a different catalog ID; a second pending request never settled; and disposal during an awaited native call allowed remaining composite actions. Tests now cover all 54 native study labels across the 13 cases, pending aliases, exact-ID menu routing and disposal during execution.
- Local verification: 68 V5 tests; independent reproducible 45-file game build. Browser evidence is generated by `qa/v5/studies-browser.mjs`: actual walking to B1, range rejection, chat before any NPC, two pending hemogram requests, negated albumin, unsupported dual antibiotics, real elapsed wait, native CIRR anemia/thrombocytopenia result, selected APP CT identity and clean lobby return. This is a studies scenario, not a complete treated case.
- Desktop, mobile-emulated and landscape navigation plus the six boot/focus regressions passed again after integration. Identical-camera original lobby background comparison passed (maximum mean channel errors .5167 and .3258, threshold 1/255); it does not certify complete UI parity. Golden-master historical-flow contract and protected-tree comparison passed.
- Structural replacement: C1 adds no `apply-487.js`, historical HTML, global replacement, second pharmacology engine or network backend to the new executable. The only additional reused runtime module is the existing pure `clinical-clock-487.js`. All protected source/assets remain intact.
- CI keeps the full historical regression enabled and adds the actual study-browser scenario. All three jobs passed: clean-core-contract, independent-game-browser and preserved-historical-regression. Do not infer completion from unit tests alone.

Published C1 code checkpoint: `8f0310fc76f85820caa4de87ed8213c297ceb08e`, tree `52e33589b521363c4edfe7184214633a913ca1ed` (identical to the tested local tree). [CI 38665491977 passed](https://github.com/javierdario48-star/ATRIA/actions/runs/38665491977).

[Verified experimental preview](https://night-shift-clinical-a8n8i9raf-javierdario4878-7324.vercel.app/) — Vercel deployment `dpl_8UGmVkbbZAQuVYiRjWQPKHRZn3p3`, target preview, exact C1 SHA. Opened independently and checked title → lobby → solo guard, original hospital/characters, actual walking, chat before NPC, patient panel and menu hemogram request with visible pending acknowledgement. Completed native results were verified with real elapsed Chromium tests locally and in CI. Mobile emulation does not establish physical Android compatibility. The preview does not connect the production session or migrate its progress.

Continuation: use the remote experimental HEAD, whose latest functional code is C1 above. A following documentation-only commit records this publication; it does not change the tested runtime. Verify the real remote HEAD before resuming. Working tree is clean, no uncommitted engine work is required to recover C1, and no stable/golden branch or protected file was changed.

Acceptance boundaries at the historical C1 checkpoint (superseded for CIRR by C2 below):

| Requirement | Verified scope / remaining work |
| --- | --- |
| Independent boot, map, characters, movement | Executable original-art navigation; deterministic clean build |
| Studies | Local requests, native/fallback results, real deadlines, receipts and deduplication |
| Solitario / Aprendiz | Navigation and studies; patient conversation, tutor, treatment and full guard flow pending |
| Clinical executor | One port and one real study service; medications, procedures, physiology and closures pending |
| Shared communication | Local guard ordered transcript; cross-client distribution and lobby/guard history continuity pending |
| Cooperativo / Competitivo | Domain contracts only; visibly unavailable in the game; no independent-client certification |
| Voice / mobile keyboard | Voice unavailable; synthetic IME and Pixel 5 Chromium emulation only |
| Visual parity | Identical-camera lobby background comparison; full HUD/monitor/history/NPC parity pending |
| Physical Android | Not performed |
| Production | Unchanged; only experimental branch preview |

### Global audit evidence

The verified baseline had 63 integration files (26 production / 37 tests), a 1,980,964-byte frozen index, and 57 inline plus 11 external script tags. The generated reference contains 80 inline plus 7 active external scripts (2,328,830 bytes). `apply-487.js` contains 130 literal `replaceOnce(` sites. These are static source counts, not measurements of active duplicate callbacks.

Historical source contains 18 assignment sites for `updateSimulation`, 15 for `sendMessage`, 12 for `refreshChatDock`, 8 for `handleGameTap` and 8 for `addMonitorTherapy`. This supports replacing their accumulated ownership chains with explicit modules. No historical implementation has been deleted.

Reusable modules: `FrameScheduler`, lifecycle class, nurse scanner, room authority/replica/port, study registry/materialization, anamnesis classifier, clinical closure evaluators and remote-motion timeline. Generic severity helpers and the experimental B1 shadow physiology are not substitutes for native clinical physiology.

### Remaining native dependencies

C2 adds the native CIRR dose/preparation/physiology, evaluation, safe closure and unique persisted XP through the original V5 port. Other-case administration/physiology, physical nursing procedures, complete dialogue, tutor, consultations, shared transport and full progression still require explicit migration and browser parity tests. Requested treatment never means administered treatment. Port-level concurrent reservation is now hardened, but room authority remains the sole authorized command owner; it is not multiplayer certification.

### Historical C1 → C2 migration references (C2 implementation recorded below)

Continue from the published C1 tree; do not repeat A1/B1. Port the effective native CIRR clinical path: anamnesis/exam/vitals, existing study service, oral spironolactone with real administration receipt, native physiological response, diagnosis/reassessment and sala/observación closure with exactly-once XP. Characterize the original equations and nurse queues before moving them; do not reuse the generic severity helper or experimental shadow physiology as a substitute.

Native reference locations in the protected original: initial patient state around 658–667; dosing/nurse/physiology around 1232–1437; delayed administration around 3745–3793; patient-bound queue bindings around 6911–6991. Effective case amendments around 3639–3668 and 5293–5322 are already captured in canonical content. These are migration references, never runtime imports or string anchors.

Preserve the distinction between clinical study time (1 game minute per real second) and native physiology progression (normally .12 native minutes per real second; historical typing slowdown must be characterized). Only after a complete local case works should transport/2–4 independent-client integration and remaining case expansion be certified. The new build has removed historical code generation from execution; the old implementation has not been deleted.

Plan and ongoing decisions: `docs/ATRIA_50_IMPLEMENTATION_PLAN.md`.

## C2 — Native CIRR care journey and technical handoff

C2a published `becd8ba80f5ee48264cc695f7ed63294133aaacc`, CI38689354945 passed. C2b adds real clinical panels, saved receipt-ledger XP, globally unique patient UIDs, bounded typing-clock epochs and real Chromium CIRR completion. 88 V5 contracts pass locally; original native characterization reproduces100mg/550ms and exact vital trajectories. No historical runtime imports were added. The existing pure closure evaluator is reused explicitly.

Real UI path: original hospital traversal → authentic onset/alcohol history → five exam techniques and vitals → four native studies/results → requested espironolactone100mg oral → exact receipt → sodium restriction → reassessment/diagnosis → sala with100/100 and133XP once → lobby/reload with saved XP. Separate explicit therapeutic paracentesis checks real native HR/RR response; no unrequested medication is added. Chromium Pixel5 emulation is not physical Android.

Independent review found two important issues, now RED→GREEN: closing with a treatment still preparing and accepting residual quantities after100mg. Reassessment now binds all intervention event IDs even at equal timestamps, and UI vitals display actual measured values. Minor deferred: simultaneous tabs can overwrite saved progress; local single-instance persistence only.

Native CIRR has no spironolactone vital effects/ascites kinetics: preserve that fact instead of inventing rapid improvement. Dose scope is the original100mg oral reference; other regimens are rejected pending C3. Next checkpoint C3 expands the same executor after characterizing the next original clinical path. C4 dialogue/Vega/voice, C5 shared chat/real multiplayer, C6 parity/mobile/cleanup follow. See the permanent handoff for exact functions, contracts, commands, pending work and final CI/preview evidence.

C2b published `744d5026d9e7913fa705829b556df22cb237776b`; [CI38690988414 passed](https://github.com/javierdario48-star/ATRIA/actions/runs/38690988414). C2c corrects a preview-discovered timing regression: clinical elapsed time must not be dropped by the spatial FrameScheduler cap. A single application-owned monotonic advance handles RAF/focus/commands; medication preparation cannot inherit pre-request stall time. Native smoothing uses exact repeated60Hz Euler steps in closed form.89 V5 contracts and a real Chromium stall/form-submission regression cover these changes. Final publication/preview evidence is recorded in the handoff after verification.

C2 certified functional source `04557ba229231080690a513a0fa79968fb802294`, tree `40a1f0bd3a93e92599ca4b0817fd1aba52553d4c`; [CI38692877642 completed success](https://github.com/javierdario48-star/ATRIA/actions/runs/38692877642), all three jobs. Public preview https://night-shift-clinical-p2qug5rq0-javierdario4878-7324.vercel.app/ opened and completed: native CIRR with explicit therapeutic paracentesis, measured HR94→91/RR20→18, diagnosis, sala100/100 and133XP, no extra XP after retry/reload. See permanent `docs/evidence/c2` and handoff. Next implementation is C3a APP-001 dual antibiotics/IV/source-control through the same executor. C2 is a local selected-case checkpoint; all-case, voice and real multiplayer parity remain unfinished.
