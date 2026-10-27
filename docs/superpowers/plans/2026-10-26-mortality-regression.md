# Mortality evidence and regression implementation plan

> **For agentic workers:** Execute inline with the authorized checkpoint-A implementation. Use systematic debugging and TDD for any clinical change.

**Goal:** Verify real deterioration, mortality and terminal-state integrity through ordinary clinical APIs and incremental clocks.

**Architecture:** Keep native case physiology and the existing survival adapter as the only clinical owners. QA strategies issue ordinary commands and retain acknowledgements, delivered receipts and observation samples; SQLite durable authority verifies multiplayer persistence.

**Tech Stack:** Node test runner, native ESM, existing clinical sessions and SQLite durable store.

**Spec:** Checkpoint-A user instructions and `docs/qa/2026-10-26-quality-results.md`.

## Global constraints

- Never inject vitals, administrations, death, XP or post-admission clinical state.
- Never lower mortality thresholds or add a survival engine.
- Observe at ordinary increments up to 1440 real seconds; native time remains 0.12 minute/second.
- Distinguish pending, rejected and truly administered interventions.
- Report nonfatal trajectories honestly; stable patients need not die.
- Do not commit or publish independently of the parent checkpoint.

## Review focus

- Repeated commands require distinct administrations; transport replay must not give an extra dose.
- Explicit severe allergy facts must differ from ordinary allergy or absent documentation.
- Good matched care must survive with actual delivery and handoff evidence.
- A death must cancel pending work and persist through reconnect without XP or resurrection.
- Coop/competitive members must observe the same death and cannot treat a terminal patient.

### Task 1: Document the confirmed pressor consequence gap

**Files:** `src/v5/clinical/vasopressor-adverse-evidence.test.js`, `src/v5/clinical/medication-harms-487.js`, `src/v5/clinical/clinical-risk.js`.

- [ ] Write and run a failing real-session test: CIRR with confirmed high-rate norepinephrine develops the inherited excessive pressure response but currently has no adverse event or penalty.
- [ ] Reuse the native support projection to document the observed excess, retain resolved history, and connect that event to existing quality scoring.
- [ ] Verify pending therapy and ordinary matched support do not create the event.

### Task 2: Produce reproducible local mortality evidence

**Files:** `qa/v5/mortality-regression.mjs`, `src/v5/clinical/mortality-regression.test.js`.

- [ ] Exercise abandonment, harmful drugs, repeated valid doses, overload, explicit severe allergy, late rescue and matched good care in solo first, then apprentice/coop.
- [ ] Advance at no more than one real second per call; record actual receipts, critical transition, survival exposure and death.
- [ ] Verify terminal commands, replay, checkpoint restoration and zero unearned XP.

### Task 3: Verify shared durable mortality

**Files:** same executable QA runner and its regression test.

- [ ] Use SQLite CAS authority, real navigation/claim and physical nursing for coop and competitive selected high-risk scenarios.
- [ ] Verify both members observe the same death before and after a worker restart, rejected postmortem treatment and no XP.

### Task 4: Publish reviewable evidence

**Files:** `docs/evidence/c4a/mortality-regression.json`, `docs/qa/2026-10-26-mortality-results.md`.

- [ ] Run targeted meaningful clinical regressions; retain exact commands, duration and outcomes.
- [ ] Save per-scenario machine-readable traces and a Spanish QA table including delivered dose, initial/final signs, deterioration, death, outcome and fixes.
