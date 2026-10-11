# ATRIA 4.8.7 — B2 implementation handoff / verified entry gates

**Prepared:** 2026-10-10. **Verified source branch/HEAD at handoff start:** `atria-4.8.7-grace-nursing-qa` / `f18cfd5b6d5f7efe014dd7e27ebebca5802744d5`. **Verified latest GitHub full CI:** `38101916651` SUCCESS. Treat these as reference only: Work MUST query HEAD and CI before changes, review any intervening commits, and continue from the latest valid checkpoint. No changes to production, protected branches, vendor, Supabase, auth or native clinical behavior are authorized here.

## A. What is VERIFIED and what is NOT

| Property | Evidence | Actual status |
| --- | --- | --- |
| Full real catalogue consists of 30 treatment/procedure entries, 13 native case seeds | `src/clinical/pharmacology-coverage-487.test.js` (V19 injects `anticoagulation` after initial 29 entries) | Verified inventory; NOT 30 distinct drug molecules |
| Cross-product labels for 390 drug/procedure x case pairs | `src/clinical/pharmacology-coverage-487.js` | Non-mutating audit; NOT 390 clinically proven responses |
| B1 physiology can reuse oxygen, fluids, norepinephrine, morphine, furosemide across PERI-SEC / HDA / CIRR | `src/clinical/physiology-pilot-487.js`, definitions, cases, tests, QA trajectories | Pure QA-only shadow, NOT installed as real patient physiology |
| Inactive catalogue growth does not linearly impact B1 tick | `src/clinical/physiology-scale-fuzz-487.test.js` (5 / 55 / 305 / 1005 synthetic definitions, 288 combinations, 100 synthetic profiles) | Node/Linux pilot-scale engineering evidence, NOT real mobile/browser load |
| Global clinical pharmacology boot | `src/integration/pharmacology-487.js`, `src/integration/pharmacology-boot-487.test.js` | Transactional reject/fallback, currently NOT compatible with V19 heparin |
| Actual completed administration and clinical source-control state | Native monitor/nurse ledger and physiology/source-control pathways | Not yet unified with typed start/rate/stop receipts, one authoritative clock and one effect owner |
| Clinical validity of dosing, PK/PD, kidney/liver, infection, heparin | B1 evidence and parameters files | Requires per-class medical review and empirical calibration |

### Baseline checklist to execute *before modifying code*

1. Confirm exact remote HEAD and full CI, compare with `f18cfd5b6d5f7efe014dd7e27ebebca5802744d5`. Protect `main`, original `atria-4.8.7-qa`, `vendor/atria-4.8.6`, Supabase, auth, XP, survival/grace, surgery, speech, nursing and multiplayer.
2. Re-run `npm test`, `npm run build`, `npm run qa:physiology-artifact` and known native snapshots. Record SHA and frozen hashes. No artifact difference unless specifically authorized for runtime shadow observation.
3. Build one **source-of-truth inventory** of all 13 native case IDs and 30 V19 post-boot catalogue IDs; distinguish molecule, active drug class/order, physical fluid, oxygen support, transfusion and performed procedure. Never call them all “drugs”.
4. Publish a **dependency mapping**, not 390 per-pair implementations: medication -> physiological mechanisms (1..N); mechanism -> physiological axes; case -> initial axes and natural disease trajectory; verified contraindication/exception -> explicit rule.
5. Identify each mechanism's authoritative event, clock and effect owner. Native `addMonitorTherapy`, `recordAdministration`, `therapyEffectTotals`, `applyImmediatePhysiology`, `progressionOffsets`, septic physiology bridges and the 4.8.7 global adapter all require double-effect analysis before a live hook.
6. Confirm `source_control` procedure status is strictly **performed** rather than ordered/consultation-accepted, since the native `applyImmediatePhysiology` contains an immediate `sourceControlled=true` branch; audit every clinical route that can reach it. Do not reinterpret this as evidence that current surgery workflow is broken without tracing its actual callers.

## B. Main architectural gap: mechanism extensibility

The B1 `compilePhysiologyDefinitions487()` uses a closed set of five `mechanism` values, hard-coded unit/route/kinetics mapping and **one mechanism per catalogue item**. The numerical kernel currently switches on opioid/pressor/diuretic mechanism IDs. It is correct for B1, but should **NOT** be expanded by one more switch per treatment.

Before adding the 25 remaining catalogue entries, establish an extendable, versioned **mechanism contract**:

- A medication definition may reference multiple registered mechanisms, each with explicit axes, supported actions/route, dose units and state-dependent effect parameters.
- A mechanism module is only accepted if its required axes are implemented, numeric parameters bounded, dependencies declared, and independent behavioral tests exist.
- Concrete drugs may reuse existing mechanisms with different kinetics/dose parameters and adverse-effect mechanisms WITHOUT changes to the core integrator.
- Administration types are explicit and separate from a mechanism: inhaled support, IV infusion, IV bolus, oral, topical/procedures, etc. Avoid generic one-dose kinetics for entire drug classes.
- Treat procedures and deprescribing separately from molecule exposure; a plan/consult is never a performed procedure.
- Unsupported molecules/mechanisms must be visible and **blocked**, not granted generic beneficial BP/SpO2 offsets. Strict heparin compatibility gate stays red until coagulation/bleeding/thrombosis/units/monitoring are actually represented and reviewed.
- New cases inherit mechanism actions from state axes; never add `drugId × caseId` switches. Extensibility QA must add one synthetic compatible new case, one synthetic new compound reusing existing mechanism and one intentionally unsupported mechanism, without entering user-facing catalogue.

## C. Authoritative data/event boundaries first

- Typed, stable events: patientId, eventId, sequence, `status=administered` or independently verified `performed`, treatmentId, action (bolus/start/setRate/stop), dose, unit, route, *clinical* timestamp and `schemaVersion`.
- Distinguish instruction RECEIVED from administration CONFIRMED, consultation ACCEPTED from procedure PERFORMED, stop request from delivered stop.
- Implement a **single authoritative clinical clock** with explicit mapping to native `gameMinute` (currently native simulation runs `dt*0.12`; B1 24-hour shift maps 1 game minute to ~1 real second). Typing slow-down must not create hidden time drift. Don't alter existing game pacing during preflight.
- Exactly-once event application; deduplication, stable simultaneous ordering, cross-patient isolation, late/out-of-order event handling via bounded replay or explicit reject; actual administration logs rather than chat/plan flags.
- Existing 2,048 receipt cap must have a documented checkpoint/compaction design before claims of arbitrarily long sessions. No unbounded per-tick replay history.
- Browser observer must be **off by default**, read-only, cannot override `sim`, `C`, `updateSimulation` or medical death/XP/closure functions to achieve B2; no live effect replacement in this phase.

## D. Minimal next Work execution: B2 *infrastructure only*, not 25 medicines

Work should deliver in small reversible commits:

1. Snapshot and compare clinical results on exact HEAD. Build a verified 30-entry typed coverage/ownership map (can be generated automatically).
2. Introduce and test a pure registry of mechanism handlers and a compatibility adapter for the five B1 mechanisms. Keep output equivalent to B1 for all existing B1 test profiles/scenarios; pin this with deterministic fixtures.
3. Allow multiple mechanisms per drug, independent route/unit/PK settings and rigorous validation while retaining the original B1 interface for compatibility. First use synthetic fixtures to prove automatic extension and negative controls; DO NOT import all real molecules here.
4. Create a typed receipt/clock **adapter for QA observation only** and show safe/explicit handling of skipped/pending, repeated, stopped, late, reordered and multi-patient events. No generated HTML change by default.
5. Run targeted tests, full npm test/build, native reference preservation and isolated CPU/memory stress, publish small reversible QA commits with CI. Stop on verified HEAD with a concise gap table for mechanisms still needed for the 30-entry catalog.

**Stop conditions:** unexpected native HTML/game change, clinical effect applied twice, heparin granted fictitious behavior, surgery control-of-source inferred solely from acceptance/order, any provenance loss in receipt, B1 sample drift outside declared tolerance, failed full CI or protected-branch drift. No production deploy.

## E. Subsequent staged clinical mechanism families (future executions)

1. **Blood, fluids, renal and hemodynamics:** albumin, red-cell transfusion, beta blockers, spironolactone, therapeutic paracentesis and stopping beta blockers; add Hb/oxygen content, fluid balance/urine/electrolytes and renal effects only as required.
2. **Actual infection mechanism:** pathogen susceptibility/coverage, antibiotic/antifungal exposure, infection burden, culture and verified source control. Do NOT convert `coverageSets` alone into guaranteed resolution. Separate source control from antibiotic delivery.
3. **Symptoms and delayed responses:** distinguish named analgesic/antiemetic agents rather than using a single generic molecule; acid suppression, corticosteroid regimens, azathioprine and delayed immunomodulation.
4. **Vascular/coagulation and special cases:** mesenteric thrombosis/ischemia, anticoagulation vs bleeding, heparin-specific IV rules/monitoring/HIT; obstruction and decompression; remaining digestive and chronic case-specific dynamics.

Add case definitions as mechanisms become available, and only after independently specified clinical oracles for each major treatment. Do not conflate 30 catalogue entries with 30 molecular PK models or with 13 fully playable physiology profiles.

## F. Acceptance criteria for release readiness (NOT satisfied yet)

- All 30 **real post-boot catalogue entries** classified and supported by their appropriate execution type; no fake default route, unit or drug-dose.
- Every treatment applicable to a case actually changes validated state following a verified event; inappropriate treatment may have no benefit or harm; clinically nonindicated treatment never earns unexplained improvement.
- B1 deterministic reference trajectories preserved with a genuine shared-mechanism integration; no double effects, no stale static risk trait used as permanent clinical state.
- One authoritative event ledger and time, bounded replay/checkpoints; compare 13 real case profiles, negative/adverse and repeated-dose trajectories with medically reviewed expectations.
- No native death/grace, surgery, nursing, XP, multiplayer or performance regression; physical Android/iPhone test and two-client authority test before live promotion.
- No claim of full clinical accuracy from CI-only pass.

This handoff is preparatory; it does NOT change game logic or certify new treatments.
