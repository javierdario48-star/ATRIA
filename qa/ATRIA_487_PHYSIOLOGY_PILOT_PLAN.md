# Shared physiology B1 pilot — implementation plan

**Goal:** demonstrate five reusable mechanisms across the three existing PERI-SEC, HDA and CIRR profiles, in a non-writing QA shadow simulation.
**Architecture:** pure state transition with an explicit clinical-minute clock and fixed 0.25-minute internal grid; analytical drug exposure; mechanism-owned physiological changes; independently derived observations. The QA shadow adapter reads confirmed native administrations and compares trajectories. No clinical runtime hook, catalogue modification or replacement of the existing engine in B1.
**Stack:** existing JavaScript ESM and Node assert/VM; no new packages.
**Spec:** the user's 2026-10-11 implementation brief, limited to section15, and `qa/ATRIA_487_PHARMACOLOGY_SCALING_PLAN.md`.

## Constraints and rulings

- Work only on `atria-4.8.7-grace-nursing-qa`, initial SHA `7d761ee69ebd05bd8a403babae104e5ca78b26d6`.
- Never change vendor, production, main/original QA, Supabase/auth, death protection, rescue, surgery, disposition, XP, nursing, voice or multiplayer.
- Heparin compatibility stays blocked. Experimental definitions contain exactly five supported entries, separate from the global catalogue.
- B1 shadow means a runnable QA observer/replay of native patient snapshots, NOT automatic activation on patient ticks. This keeps old clinical functions and generated game artifact unchanged. A runtime observer and physical-device acceptance belong to the next B1 runtime checkpoint.
- Clinical clock: 1 clinical minute = 1 real second under the displayed 24min→24h guard. The native no-typing clinical engine uses 0.12 native `gameMinute` per real second. Comparison explicitly converts native minutes; neither original clock is changed. Typing requires explicit piecewise conversion and cannot be silently replayed with the no-typing mapping.
- Numerical gains, physiological indices, inferred volumes, pressure anchors and effect-compartment parameters are estimates for the simulator, not dosing advice or validated medical measurements. Primary references and pending clinical calibration are recorded separately.
- Disease IDs may select initial profiles; the kernel and five drug mechanisms may not branch on disease IDs.

## Review focus

1. Replayed or conflicting events, simultaneous infusion stop/rate change: one application, deterministic sequence, conflict rejection.
2. Lost/ambiguous units in legacy display-only logs: explicit unsupported result, no guessed dose or historical dose copied from latest active entry.
3. Delayed events, timestep partitions and tiny deltas: fixed grid/remainder; reject unsupported late insertion, no silent rescheduling.
4. Fluid excess in cirrhosis with depleted effective circulation: distinguish retained/interstitial fluid from circulating volume and pulmonary susceptibility.
5. Unknown mechanisms/variables, zero doses, nonfinite state and extreme repetition: fail explicitly or no exposure; never silently mark catalogue readiness.

## Task 1 — frozen native reference

- [x] Audit current generated clinical wrappers and actual administration delays.
- [x] Create QA-only VM harness and bounded immutable snapshot matrix for3 cases ×8 scenarios.
- [x] Test current regenerated trajectories against fixture; preserve startup rejection and record excluded browser/mortality paths.
- [x] Run baseline full suite; commit baseline fixture/checkpoint once green.

Files: `qa/physiology-pilot/native-reference-487.mjs`, `qa/physiology-pilot/native-reference-487.json`, `src/clinical/physiology-native-reference-487.test.js`.

## Task 2 — pure pilot kernel and definitions

- [x] Write behavioral tests first: deterministic partitions, state-dependent fluid benefit/harm, oxygen bounded/refractory/stop, infusion response/stop/high exposure, opioid pain/toxicity/clearance/repetition, diuretic congestion/hypovolemia/renal response; malformed/pending/zero/duplicate events.
- [x] Observe failure because the expected exports are absent.
- [x] Implement `createPhysiologyState487(profile, patientId)`, `stepPhysiology487(state, events, deltaClinicalMinutes, definitions)`, `observePhysiology487(state)`.
- [x] Implement indexed immutable definitions and analytical central/effect exposure, with mechanism requirements validation; only administered active drugs are stepped.
- [x] Implement `createPilotProfile487(caseDef, initialPatient)` for the three existing IDs; no ID-specific drug rules.
- [x] Run targeted tests and full suite; record limits and commit.

Files: `src/clinical/physiology-pilot-definitions-487.js`, `physiology-pilot-cases-487.js`, `physiology-pilot-487.js`, `physiology-pilot-487.test.js`; QA evidence document.

## Task 3 — shadow observer and comparative trajectories

- [ ] Test deep-frozen native patient input, unchanged native function references, patient isolation, typed/legacy dose units, duplicate polling, explicit clock mapping and unsupported catalogue events.
- [ ] Observe missing shadow exports fail before implementation.
- [ ] Implement pure `createPhysiologyShadow487`/`samplePhysiologyShadow487` and current-ledger conversion with stable IDs. Keep all shadow state outside the real patient.
- [ ] Implement CLI comparison with readable Markdown and machine JSON, running the same confirmed events over frozen current profiles and expanded counterfactual trajectories.
- [ ] Tests evaluate complete trajectories/independent expected directions and timing bands rather than copying all model constants.

Files: `src/integration/physiology-shadow-487.js`, corresponding `.test.js`; `qa/physiology-pilot/run-pilot-487.mjs`; committed comparative report and clinical expectations.

## Task 4 — verification, performance, publication

- [ ] Wire specific tests into existing npm test; add independent pilot/report/benchmark commands, without adding runtime hooks or dependencies.
- [ ] Measure deterministic scenarios for 1/16/64 patients, active treatments vs registry padding, steady-state heap and per-step p50/p95; clearly label Node CPU and no physical Android.
- [ ] Run full npm test/build/workflow artifact checks. Verify generated HTML remains byte-identical to initial build and all protected files unchanged.
- [ ] Independent whole-change review, address important findings with red→green tests.
- [ ] Publish small commits with expected-parent/ref guards. Verify remote exact HEAD and successful GitHub CI before closing final checkpoint. No manual deploy or production promotion.
- [ ] Extend existing scaling plan with schema/version/extension gates and B2/B3/B4 order; retain clinical/Android/heparin blockers.

## Acceptance boundary

Passing software properties demonstrates mechanism reuse in the reduced model. It does not validate clinical efficacy, doses, patient survival, complete antimicrobial/source-control management, all30 catalogue entries, or mobile multiplayer performance. Only B1 is delivered in this execution.
