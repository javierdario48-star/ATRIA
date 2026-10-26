# ATRIA V5 clinical and visual quality implementation plan

> **For agentic workers:** Execute focused independent debugging tasks and use verification-before-completion before publishing each checkpoint.

**Goal:** Run all 25 GI cases with the five requested doctor profiles, correct medically important errors, recover the hospital rendering, and show physician examination findings in the examination panel.

**Architecture:** Keep the existing single clinical authority, patient-bound nursing receipts, shared catalogs and physiology writers. Repair each error at its existing owner. QA drivers use production commands and elapsed time; they never assign patient vitals, therapy receipts or XP.

**Tech stack:** JavaScript ESM, Node test runner, Canvas2D, Chromium/Playwright, existing durable guard authority and SQLite QA store.

**Spec:** User request in this task, sections 1–12. Work and publication are explicitly authorized without per-checkpoint confirmation.

## Global constraints

- Repository `javierdario48-star/ATRIA`; only `atria-5.0-core-rebuild-experimental`.
- Starting HEAD verified through GitHub and the local checkout: `0c5519beecc417e8753c77299ecb959ecde0597b`.
- Preserve V4 and main; no duplicate clinical or rendering engines.
- Guard duration remains 1440 real seconds / 1440 simulated minutes.
- Hospital recovery must preserve the active session, pending orders and patient.
- Clinical plausibility at educational game level; no unnecessary pharmacokinetic modeling.

## Review focus

- Empty or unchanged mobile resize must not clear the only valid canvas bitmap.
- One render exception or context loss must not permanently stop the render loop.
- Successful physician examination must not appear as nurse speech; rejected examination must still explain why in its panel.
- Noncirculatory treatments must not produce unsupported systemic vital changes.
- Rival commands, recovery and repeated disposition must not cross patients or duplicate XP.

## Task 1: Clinical behavior and five physician profiles

Files: `src/v5/clinical/gastro-*.js`, associated regression tests, `medical-personalities.test.js`, existing clinical playbooks.

- [x] Run baseline V5 suite: 2047/2047 pass.
- [x] Reproduce inappropriate treatment responses and missing closure evidence with failing focused tests.
- [x] Correct existing shared policies, preserving confirmation timing and one physiological writer.
- [x] Run all 25 cases with distinct expert, competent, beginner, dangerous and slow profiles in local/team sessions.
- [x] Verify matched treated/untreated trajectories and record actual receipts and outcomes.
- [x] Commit the verified clinical change independently.

## Task 2: Recover the existing hospital renderer

Files: `src/v5/render/hospital.js`, renderer lifecycle tests, render integration in `src/v5/app/application.js`, mobile browser regression.

- [x] Reproduce zero-size/unchanged resize and interrupted frame failure before correction.
- [x] Preserve the last healthy backing dimensions, recover context and continue the same rendering lifecycle after a transient failure.
- [x] Verify pixels, frame progress, same patient and pending treatment through rotation/keyboard/context recovery.
- [x] Commit the verified renderer change independently.

## Task 3: Physician examination panel

Files: `src/v5/clinical/guard-session.js` message projection, exam command contract, `src/v5/ui/clinical-controller.js`, examination panel, scoped chat preview integration, relevant unit/browser tests.

- [x] Reproduce exam findings being projected as nurse messages and false UI success after rejection.
- [x] Keep authoritative exam evidence and expose results/denials in the exam panel; suppress only exam speech duplication.
- [x] Verify regional/Glasgow examinations, proximity rejection, ordinary chat and nurse orders in mobile Chromium.
- [x] Commit the verified examination change independently.

## Task 4: Competitive profiles and integration evidence

Files: new `src/v5/server/competitive-personalities.test.js`, `.github/workflows/atria-v5-core.yml`, `docs/qa/2026-10-26-quality-results.md`.

- [x] Exercise 25 cases × five profiles through the real competitive durable authority, distributing 2/3/4 physician rosters.
- [x] Assert patient assignment, real nursing, recovery, closed dispositions and unique owner XP.
- [x] Retain machine-readable outcome evidence and add new browser regressions to CI.
- [x] Run the full V5 suite, architecture gate, historical regression and appropriate browser flows.
- [ ] Publish the reviewed commits to the authorized branch and check the final SHA's CI and preview (remote status is reported with the delivery).

## Progress notes

The starting branch already contains 375 persona tests and previous GI fixes. They are a baseline, not new work claimed in this task. Their profiles lacked distinct expert and competent doctors, and several tests explicitly expected medically unsupported generic vital improvements. Current work repairs those gaps and the reported visual behavior.

Final local evidence: 2240/2240 V5; historical npm test exit0; 500 physician journeys; 200 mobile panel openings; original exam parity100/100; reviewed gaps fixed with RED→GREEN regression tests. No physical-device claim.
