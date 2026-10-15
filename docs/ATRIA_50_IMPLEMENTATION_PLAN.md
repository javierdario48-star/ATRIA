# ATRIA 5.0 implementation plan

**Goal:** replace the generated historical game with an independently built, navigable and progressively complete modular application, preserving ATRIA's visual assets and clinical rules.
**Spec:** the reconstruction request and `docs/ATRIA_50_CORE_REBUILD.md`.
**Architecture:** canonical ESM source; immutable content assets; one application lifecycle; existing V5 room authority and native clinical port; explicit simulation, presentation and transport boundaries. Original JavaScript only; no TFS code copied.
**Execution:** implement in this session, with independent read-only audits and bounded module work where interfaces do not overlap. The user explicitly requested immediate implementation and autonomous technical decisions; no additional design approval stage.

## Global constraints

- Only `atria-5.0-core-rebuild-experimental`, starting at verified `64fedba8c8a0fb49fca58e210985740b09e26bed`.
- Preserve `vendor/atria-4.8.6/**` and stable builds. No production deployment or merge.
- New build must not read or transform historical HTML or import integration patch generators.
- Reuse canonical clinical algorithms; no second permanent medication or voice engine.
- Physical Android validation must remain explicitly distinct from Chromium mobile emulation.
- Publish small coherent commits and the first working navigation checkpoint before broadening clinical migration.

## Task 1: Canonical content and independent navigation

Files: `src/v5/content/**`, `src/v5/engine/navigation.js`, `src/v5/engine/navigation.test.js`, `scripts/import-v5-content.mjs`, `src/v5/content/content.test.js`.

Interfaces: content provides hospital dimensions/grid/doors/interactions, original images, original case catalog and provenance hashes. `createNavigation(map)` provides `tileAt(x,y)`, `center(c,r)`, `passable(c,r)`, `nearest(c,r,max)`, `route(start,goal)`, `move(actor,dt)` and `target(actor,x,y)`. No DOM, globals or timers.

- [x] Write failing content/provenance and collision/navigation contracts.
- [x] Extract data and assets ONCE, recording source hashes and symbols. Extraction is a migration tool, never a build dependency.
- [x] Implement deterministic movement/A* with original speed (205 px/s), diagonal corner protection and reachable bedside targets.
- [x] Run content/navigation tests and frozen source contract; commit.

## Task 2: Standalone executable application

Files: `src/v5/app/**`, `src/v5/render/**`, `src/v5/ui/**`, `src/v5/web/**`, `scripts/build-v5.mjs`.

Interfaces: `createApplication({document,window,content})` owns boot/lobby/guard/destroy; renderer consumes world snapshots and never mutates clinical state; inputs issue commands; `FrameScheduler` owns simulation cadence. Clinical functionality that has not migrated is disclosed rather than reported as working.

- [x] Add failing build/browser contract: independent HTML entry, original images, complete lobby, real movement and guard/lobby transition.
- [x] Implement canonical HTML/CSS and explicit modules; keep original map, whole-character sprites and familiar HUD/chat controls.
- [x] Build reproducibly with a SHA-256 file manifest and explicit import closure; reject patch modules/global code generation.
- [x] Verify desktop/mobile browser boot, movement, NPC presence, focus and repeated transition cleanup; commit a navigable checkpoint.

## Task 3: One clinical path and one communication path

Files: `src/v5/clinical/**`, room authority/port integration, patient panels and chat adapter.

Interfaces: native executor owns patient state; room authority serializes and authenticates commands; text, touch and voice submit the same envelope. Renderer only reads confirmed state. Catalogs retain original medical content.

- [ ] Characterize original studies, procedures, medicines and physiologic timing for one complete case.
- [x] Connect real study requests, deadlines and original results to the actual game UI through one authority/port.
- [x] Add serialized native-completion events; settle pending duplicate requests against one physical study.
- [x] Preserve every current-case native study label and exact menu selection; reproduce and fix disposal races.
- [ ] Add negative regression tests (hemogram cannot dose albumin, retries cannot duplicate effects, pending action provenance, IV dependency).
- [ ] Migrate established algorithms to explicit modules and wire the real game UI through the V5 authority/port.
- [ ] Verify actual browser clinical case, shared transcript and lifecycle cleanup; commit.

## Task 4: Multiplayer and certification

- [ ] Adapt existing authenticated room transport and proven remote motion runtime; host remains authoritative.
- [ ] Test 2, 3, 4 independent browser clients, coop/competitive, ownership, retransmission, reconnect, room changes and monotonic snapshots.
- [ ] Add CI for independent build, unit/integration/browser contracts and frozen hashes without weakening historical tests.
- [ ] Publish an isolated preview only after opening and checking it; record precise feature coverage and remaining migration work.

## Review focus

1. Map tiles may be passable at their center but reject the player's collision radius: route and movement tests must traverse bedside destinations.
2. Keyboard focus may reduce viewport height: resize/focus checks must keep chat reachable and avoid uncontrolled camera jumps.
3. Late image/network completions after a mode transition: generation/disposal checks must reject obsolete callbacks.
4. Apparent treatment success without a native receipt: only matching patient/event receipts authorize confirmation.
5. A partial executable must not present unimplemented modes as certified or claim full 4.8.7 compatibility.

## Execution ledger

- 2026-10-15: remote HEAD and successful CI 38658985952 verified. Isolated linked worktree created; unrelated modified 4.8.7 checkout preserved. Existing V5 contracts: 20/20 passing; pure core build and golden-master contract passing. Full historical regression started separately.
- Pre-flight: Task 1 content/navigation feeds Task 2 render/app; no writes overlap audit tasks. Task 3 consumes existing V5 authority/port; no second executor authorized. Task 4 must use Task 3 confirmed state, not replay effects.
- Task 1 complete: published A1 `a171de907317f00a92d0bfda9f8dfd878da22c23`, CI 38663219281 success. Canonical source and swept-circle navigation; no legacy source deleted.
- Task 2 complete: published B1 `da4b64e200effc605e18f47013be6777dd8c376c`, CI 38663833989 success. 47 V5 contracts green; standalone build reproduced without vendor. Real desktop/mobile-emulated/landscape navigation, 15 mode cycles, IME and actual listener disposal passed. Review findings reproduced before fixes; six boot/focus/rotation regressions now pass. Physical Android remains untested.
- Task 3 C1: real study service wired through the sole authority/port to chat and Historia/Estudios. 73×13 = 949 canonical study/result combinations plus all 54 native study labels are covered; 68 V5 contracts pass. Pending completion updates the original command; duplicate messages share one order/result. Review findings reproduced RED before fixes. Native administration/physiology, full patient dialogue and case closure remain pending; this does not complete Task 3.
- C1 published `8f0310fc76f85820caa4de87ed8213c297ceb08e`, CI 38665491977 success (all three jobs, including unchanged full historical regression). Preview deployment `dpl_8UGmVkbbZAQuVYiRjWQPKHRZn3p3` opened and checked through a real pending hemogram order. Exact verified URL and coverage are recorded in `ATRIA_50_CORE_REBUILD.md`; no production promotion.
- Next: C2 complete native CIRR path, including spironolactone administration, original physiological response and closure/XP. Reference locations and the dual clock mapping are recorded in `ATRIA_50_CORE_REBUILD.md`. No re-extraction or repeat navigation rebuild.
- Publishing decision: shell Git has read access but no push credential; use the connected GitHub Git-data API, verify the published tree equals the local tested tree, and update only the experimental ref with an expected-HEAD lease. Align the local HEAD to the byte-identical published commit without changing working files.

## C2 continuation — execution record

- Recovery verified remote465ad3d and clean tree. Interrupted physiology/closure agents produced no code; no unpublished work was lost. No repeat of A1/B1/C1.
- C2a published becd8ba80f5ee48264cc695f7ed63294133aaacc; CI38689354945 success. Native care/receipt/closure integration,80 tests.
- C2b: clinical UI/persistence/clock integration;88 tests after independent review fixes. Actual Chromium UI completed CIRR100/100,+133XP once with original treatment/study state, plus explicit native paracentesis response in a separate guard. CI and verified preview publication are tracked in ATRIA_50_HANDOFF.md.
- Ruling: selected one-case practice uses native practice1/shift1 multipliers; continuous-shift and random-case multipliers are not claimed before those systems migrate.
- Ruling: preserve native empty spironolactone effects and no CIRR diuresis/ascites engine. Cost/limit: no acute drug response is newly simulated; expanding it requires an explicit clinical-model task, not a substitute severity model.
- Review: two Important findings fixed with failing-then-passing tests; measured-vitals/provenance concerns also corrected. Minor deferred: localStorage progress across concurrent tabs; current C2 certification is one local application instance.
- C3: expand the same clinical executor and verify another full native case; C4 dialogue/Vega/voice; C5 global chat and2–4 real clients; C6 parity, physical Android, final obsolete-code removal and certification. Do not erase validated native CIRR or C1 contracts.

- C2b published744d5026d9e7913fa705829b556df22cb237776b; CI38690988414 success, all three jobs. Public interaction exposed clinical-time loss at low render FPS; C2c separates monotonic clinical advancement from bounded spatial catch-up within the same application cycle. Pre-order elapsed time is flushed before enqueue; native smoothing preserves60Hz reference.89 contracts and Chromium real-stall/typing/form-boundary regression, without hidden clinical mutations. Await C2c publication/CI/preview before final certification.
