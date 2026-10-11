# ATRIA 4.8.7 — Existing-case pharmacology baseline and scaling gates

## 0. Decision and safety boundary

Use a SINGLE shared physiology state per patient and mechanisms per medication, NOT separate code for every drug/disease pair. Case-specific features declare phenotype, pathophysiology, microbes and exceptional contraindications. Every clinical effect MUST be traceable to actual `administrationLog` or confirmed procedure and the patient's evolving state. This plan does not claim that current numerical coefficients have undergone medical calibration.

Do not replace the native sepsis engines, 180–480 s real-time death protection, surgical handoff, nursing execution, XP or multiplayer while integrating this design. Work only on `atria-4.8.7-grace-nursing-qa`; protect `main`, original QA, `vendor/atria-4.8.6`, Supabase and production.

## 1. Exact inventory and first executable audit

Native literal catalog: **29** entries, some procedures rather than pharmaceutical compounds. The existing `cs-safe-v0190` bootstrap adds **`anticoagulation` (heparina IV)** for `MESI-001`, making **30 runtime entries**. The source currently has 13 seed cases. `src/clinical/pharmacology-coverage-487.js` projects all **390 pairs**, using the existing drug registry, case phenotype and physiological inputs. This is a **NON-MUTATING** audit: it cannot prescribe, mark a treatment administered, improve a lab, or affect death. It labels each pair as `conditional-target`, `target-with-risks`, `risk-without-benefit`, `no-demonstrated-target` or `blocked-unmodelled`.

A clinically necessary negative outcome is explicit: an irrelevant treatment must not magically help. A risk classification is not an assertion that an adverse event is guaranteed. The audit highlights missing mechanisms, drug-state interactions and the need for calibration; it does **not** certify the clinical correctness of 390 numerical trajectories.

**P0 hard blocker:** heparin's V19 catalog entry lacks a globally reviewed rule, proper IV dose/unit parsing, coagulation/thrombosis/bleeding state and monitoring. The already-committed transactional wrapper safely REJECTS installation rather than installing half the global engine; `node src/integration/pharmacology-boot-487.test.js --require-compatible` remains a failing **release-readiness** gate. Do not add fake heparin dose or constant BP offsets to force success. Model unfractionated heparin separately with documented anticoagulant mechanism, administration units/rate, coagulation monitoring, HIT and bleeding cautions; integrate only after independent medical review and a dedicated red/green test.

## 2. Common patient physiology — one state, explicit coupling

Evolve only the minimal state demanded by current cases:

- **Circulation:** effective circulating volume, vascular resistance, cardiac pumping/perfusion, active bleeding, fluid balance.
- **Respiration:** underlying untreated gas-exchange impairment and supplemental oxygen support; separate oxygen *saturation* from blood oxygen *content* and Hb.
- **Kidney/liver:** filtration and clearance modifiers; renal toxicity and overload; support delayed time course for ascites.
- **Infection:** pathogen spectrum/coverage, inflammation, source status, culture; antibiotic administration alone cannot silently count as source control.
- **Coagulation:** thrombotic burden, anticoagulation intensity, bleeding hazard/platelet abnormality (must be introduced before heparin is declared clinically compatible).
- **Symptoms:** pain, nausea, bowel motility, ascites and clinical progression, distinct from monitor vital signs.

No arbitrary additive effects when a mechanistic link exists. Derived observables are outputs; they are not fed back as their own uncorrected cause. Calibrate thresholds against independent clinical acceptance envelopes rather than copying the outputs of the current model.

## 3. Existing 13 cases: onboarding order

| Phase | Cases | Clinical mechanism |
| --- | --- | --- |
| B1 | PERI-SEC-001, HDA-001, CIRR-001 | Sepsis/vasoplegia, hemorrhagic volume depletion, cirrhosis/ascites; compare 5 key interventions |
| B2 | PERI-PBE-001, PERI-TER-001, CHOLANG-001, APP-001, CHOLE-001 | Organ infection + susceptibility + documented source control |
| B3 | PANC-001, ILEO-001, MESI-001 | Pancreatic third spacing, mechanical obstruction/decompression, mesenteric vascular ischemia and anticoagulation |
| B4 | CROHN-001, COLON-001 | Delayed immunomodulation, anemia, oncologic follow-up; no fictional acute cancer shrinkage |

All 13 receive a case profile and must pass the compatibility audit in every phase. Migrate clinically meaningful mechanisms independently, never all cases simultaneously.

## 4. Existing 30 catalog entries: onboarding order

| Phase | Treatments and mechanism family | Release condition |
| --- | --- | --- |
| M1 | oxygen; fluid (crystalloids); vasopressor; morphine; furosemide | Demonstrate dynamic physiological state, benefit/harm, onset, duration and no circular oxygen target |
| M2 | albumin; transfusion; beta_blocker; espironolactona; paracentesis_ter; stop_beta_blocker | Volume/Hb/renal/tachycardia distinctions, no fake blood oxygen saturation |
| M3 | analgesia; antiemetic; ppi; steroid; aza | Symptom, ulcer-bleed and delayed immunomodulation domains; separate active molecules and routes |
| M4 | ceftriaxone; metronidazole; imipenem; ceftazidime; cefoperazone; cefepime; piptazo; ampicillin; amikacin; gentamicin; fluconazole; amphotericin | Verified antimicrobial coverage and resistance context, source control, renal clearance and adverse effects |
| M5 | source_control; anticoagulation (heparin IV) | Verified performed procedure vs ordered consult; coagulation/bleeding/HIT model and explicit dose + monitoring |

Source control and stopping a beta blocker are **not drug molecules**; they share the *treatment catalog* but require different executors. Generic `analgesia` and `antiemetic` are orders for drug classes, not safe substitutes for molecule-specific kinetics.

## 5. Computational strategy for scale

1. **Registry at load:** validate all records once and build `Map<drugId, DrugDefinition>`, `Map<caseId, CaseDefinition>`, alias registry for nursing and `Map<mechanism, affected state axes>`. Freeze immutable definitions.
2. **Patient state:** store current organ/phenotype variables, administered treatment events, dosing/exposure and timestamp; never mark an order as an administered drug.
3. **Tick:** update only active treatments, active mechanisms and observed organ axes. Target complexity `O(patients * (activeDrugs + activeMechanisms))`, not `O(allDiseases * allDrugs)`. Use an independently timed fixed simulation step; UI updates can be throttled.
4. **PK/PD:** start with a small, explicit per-drug onset/peak/decay model and optional clearance modifiers. Do not assume all pharmacologic classes share a single half-life or route. Add a solver or compartment model ONLY when a tested mechanism needs it.
5. **Multiplayer:** only one authority advances physiological state; other clients render synchronized snapshots. Deterministic replay from an ordered event log is an acceptance requirement.
6. **CI:** run schema/contract tests and changed-mechanism dependent scenarios in quick checks; run complete 13x30 catalog matrix plus trajectories and targeted high-risk drug interactions in full regression. Avoid exponential all-subset testing for drug *efficacy*; broad spoken-order lexical fuzzing is a separate concern.
7. **New case:** validated phenotype/organ baseline, studies, evolution and closure; automatically inherits every registered medication mechanism, with no implied indication. New mechanism declarations require tests.
8. **New drug:** validated identity, aliases, route, numeric unit-aware dosing, mechanisms, toxicity, onset/decay, organ clearance, contraindications, evidence and monitoring. Register once globally, revalidate affected states/cases. No unreviewed default dose.
9. **Versioning:** immutable case/drug schema versions, explicit migration at shift boundaries only, schema compatibility checks before activating a new release.

## 6. Hard acceptance gates for future work

- **A — boot:** actual 30-entry post-V19 catalog compatible, zero partial wrappers, heparin honestly modelled or explicitly unavailable; CI/build/artifact checks green.
- **B — shadow pilot:** same three cases with 5 interventions; no-treatment, indicated, harmful, cumulative and delayed scenarios; compare against native on per-tick trace. New motor CANNOT write clinical state.
- **C — clinical envelopes:** clinician-reviewed expected directions/timing, organ-risk thresholds and no double counting, validated independently from implementation.
- **D — feature flagged** case-by-case runtime: preserve ledger, vitals, death clock, nursing, surgery/XP, mobile CPU/memory and two-client determinism; rollback via single flag.
- **E — scale rehearsal:** add a real new case and real new medication, require no handwritten drug × disease pair rules and no silent disabled side-effects; measure incremental CPU and build validation cost.
- **F — device:** exact HEAD preview READY, physical Android/iPhone patient+nursing end-to-end, real two-account scenario. GitHub CI or Node VM is not physical acceptance.

## 7. Current status

The cross-product audit is implemented and can expose incomplete pharmacology. The known heparin incompatibility is **deliberately unresolved** pending clinical mechanism/dose support. The existing global pharmacology adapter therefore must not be described as activated for the actual full catalog until the stricter `--require-compatible` gate passes. No production deployment or medical-accuracy claim.

## 8. B1 implemented boundary and next runtime gate

The B1 pilot now implements five mechanism families in pure isolated files, three existing initial profiles, confirmed-event QA shadow replay, native frozen trajectories, independent qualitative expectations and reproducible performance measurements. This implements **part of gate B**, with no runtime/browser observer installed and no real-state writes. A molecule mechanism can operate on different patient states without disease-ID branches; new validated IDs can reuse a mechanism. Only the five pilot definitions are executable. The complete30-entry global adapter still rejects heparin; gate A and clinical/device gates remain blocked.

Next checkpoint, **B1 runtime observer only**: expose an append-only, patient-bound confirmed administration/infusion-stop ledger through a narrow existing interface; keep actual executor/nursing unchanged. Observe one patient under an OFF-by-default QA flag, no vital/death/XP writes. Typing/shift-clock mapping must be explicitly piecewise or authority-provided; unsupported logs, missing history and version drift disable shadow with a diagnostic. Verify actual stops, patient switching, manual/nurse routes, grace, generated artifact and physical mobile memory/time before any activation. Do not promote to clinical ownership just because the standalone pilot passes.

## 9. Versioned content contract (design; not a content generator)

Data ingestion compiles once into indexes, checks declared read/write axes and resolves only installed mechanisms. This compilation is **not indication adjudication**. Compatibility output must distinguish `supported`, `missing-axis`, `missing-interaction`, `unknown-dose/route`, `unreviewed-evidence`, `unsupported-mechanism` and `release-blocked`. Unknown effects remain unknown; they cannot become zero risk or invented benefits.

```js
// Example future disease record for an EXISTING case, not a new disease added.
{
  schemaVersion: 2, id: 'CIRR-001', clinicalRuleVersion: 'cirr-b1-estimate-1',
  mechanisms: ['arterial-underfilling', 'fluid-retention'],
  initialState: {circulatingVolumeMl: 3900, interstitialFluidMl: 4000,
    vascularTone: 0.82, pumpFunction: 1, renalFunction: 0.85, hepaticFunction: 0.55},
  naturalHistory: {refillMlPerMin: 8}, // simulator estimates, no prescription
  requiredAxes: ['circulatingVolumeMl', 'interstitialFluidMl', 'renalFunction'],
  observations: {vitals: 'shared-observer', ascites: 'reservoir-observer'},
  studies: [{id: 'renal-panel', requires: ['creatinine', 'sodium', 'potassium']}],
  indicatedTargets: ['ascites-with-preserved-circulation'],
  contraindications: [{when: 'confirmed-AKI', excludes: ['volume-removal']}],
  resolution: {chronic: true, requires: ['explicit-specialist-disposition']},
  evidence: ['AASLD2021'], calibration: 'pending-professional-review'
}
```

The study axes `creatinine/sodium/potassium` do **not** exist in B1. Validation must report those missing dependencies and block those studies/mechanisms; it must not invent a renal panel from an XP score. Medications act on the state independently of `indicatedTargets`, allowing inappropriate-treatment harm. Declaring a mechanism is not proof it is implemented: each name resolves to an installed executor with a version and dependency set.

```js
// Example medication record; actual pilot normalization is not dosing guidance.
{
  schemaVersion: 2, id: 'norepinephrine', definitionVersion: 1, kind: 'molecule',
  legacyIds: ['vasopressor'], names: ['noradrenalina'],
  activeMoiety: 'norepinephrine-base', routes: ['iv'],
  dosing: {unit: 'mcg/kg/min', administration: 'infusion', defaultDose: null,
    clinicalDoseEnvelope: 'requires-reviewed-protocol', needs: ['patientWeightKg']},
  mechanisms: [{id: 'pressor', reads: ['circulatingVolumeMl','pumpFunction'],
    writes: ['vascularTone'], outputOwner: 'shared-physiology'}],
  kinetics: {plasmaHalfLifeMin: 2.4, responseModel: 'rapid-support',
    estimatedResponseHalfLifeMin: 0.5},
  riskTags: ['vasoconstriction', 'hypoperfusion', 'extravasation'],
  contraindications: [{state: 'uncorrected-hypovolemia', severity: 'contextual-risk'}],
  monitoring: ['MAP','perfusion','infusion-site'],
  evidence: ['DailyMed-S6'], clinicalApproval: 'pending'
}
```

The future compiler validates identity, molecule/class/procedure/stop type, units, aliases, precise formulation/route, dose domains, dependency axes, kinetics and required monitoring. `patientWeightKg` and infusion-site injury are not implemented in B1. An alias cannot turn an unspecified vasopressor class into reviewed norepinephrine. The registration transaction updates catalog, nursing alias index and executor index **once**, after every addition has passed validation. Indications remain separate. B1 intentionally does not modify that global transaction.

Each case/medicine/rule file has schema and content versions plus a deterministic manifest hash. Pin the entire manifest to a patient/shift and multiplayer session. A model-version string alone is insufficient for future hot rule changes. Change content between shifts; migrate saved state using explicit pure versioned migrations with replay equivalence and rollback. Do not reinterpret an active infusion with new coefficients. One authority owns time/events; clients display snapshots, and native vs new writer selection is per mechanism. Shadow never contributes effects.

## 10. Validation and rollout after B1

1. **Contract:** generated index checks duplicate IDs/aliases, exact units/route, molecule vs class/procedure, numeric domain, versions, axis references, known interaction coverage and evidence readiness. Reject a new drug requiring absent coagulation/platelets; do not hand-code every disease pair.
2. **Physiology:** synthetic state archetypes plus real cases; untreated/control comparisons, monotonic/saturating dose response, adverse directions, finite decay/accumulation, cessation, renal/hepatic variants and trajectory/timestep metamorphisms. Keep independent primary-source expectations separate from frozen native software regression. Require a clinician to approve quantitative envelopes and uncertain states.
3. **Interactions:** form a dependency graph from read/write/risk tags. Run explicit known pairs, shared-axis pairs and high-risk combinations (opioid+sedative, anticoagulant+bleed, renal toxicity, competing volume inputs/outputs). Changes select affected graph neighbors/archetypes; deterministic seeded pair samples supplement, never replace, known interactions. No exponential all-subset CI.
4. **Ownership:** append stable patient/event/sequence IDs at actual administration, explicitly including titration/stops; idempotent commit once. In shadow only compare; later flag selects exactly one physiology writer per mechanism and keeps the native rescue/death/disposition interfaces. Old additive bonuses for a migrated mechanism must be disabled at the same atomic ownership boundary.
5. **Performance gates proposed for devices:**16 patients with five pilot interventions batch p95≤4ms,64≤12ms at4Hz; render separately, no >50ms long task attributable to shadow. Typical kernel+active exposure≤32KiB/patient; bounded event checkpoint and sampling budgets separately. Maximum effect-observation lag≤250ms from grid, target UI delivery≤375ms real. These are engineering targets to measure, not current Android results. Measure exact SHA on a named midrange Android in foreground/background/throttling, CPU profiles, heap after15/60min, and two synchronized clients.
6. **Rollback:** OFF by default; mismatch/NaN/late or missing receipt/version mismatch disables shadow, never writes correction into the live patient. Preserve raw event log/native state and previous manifest. Later stop activation if duplicate effect, altered grace/rescue/surgery, numerical divergence, missing heparin support or device budgets fail. Active patients retain their engine version until resolution; no in-place reversal of drug effects.

B2/B3/B4 remain the groups in sections3–4. Add mechanisms, then dependent cases, in separate small checkpoints. Hb and bleeding control are prerequisites for credible HDA oxygen-delivery/transfusion; real performed source control/coverage for sepsis; sodium/renal circulation for ascites; CO₂/airway for precise opioid/oxygen safety. Heparin requires coagulation, thrombosis, hemorrhage, dose/route/monitoring/HIT validation before any compatibility unlock. Pancreatitis/mesenteric phases require fresh ACG/WSES research when implemented. No new case/medication or full generator in this B1 delivery.

## B2 infrastructure after the approved B1 pilot (2026-10-11)

The implementation plan/report are `ATRIA_487_EXTENSIBLE_PHARMACOLOGY_PLAN.md` and `ATRIA_487_PHARMACOLOGY_INFRASTRUCTURE_RESULTS.md`; machine inventory is `pharmacology-infrastructure/coverage-487.json`. This checkpoint prepares reuse, not all25 remaining therapies.

- New extensible entry point: `compilePharmacologyContent487(schema2, {mechanisms, axes, modelVersion})`. Molecule identity, route/formulation, administration, normalized PK and1..N effects are separate. Seven registered B1 mechanisms replace the isolated central effect switches; no real runtime writer is installed. The legacy five-drug compiler is a compatibility facade only.
- New content on existing axes/mechanisms needs definition+independent tests; synthetic multi-effect/route fixtures prove this across all three approved case states. Missing mechanisms/axes fail with explicit names. A new physiological variable still requires domain, initialization/evolution and observation design; a string declaration does not create an organ model.
- Confirmed schema1 receipts and explicit authority clock cover administration, absolute delivered rate modification and suspension. Full provenance/sequence conflicts and mixed old/new adapters fail; late history or old serialized state requires replay. Supplied ledger correctness, live delivery episode identity,80-row native truncation and complete stops remain live-integration blockers.
- Actual post-V19 catalog:30 entries,13 cases; only5 entries executable in isolated B1. Classes must resolve named agents; procedures/blood products/suspensions need distinct executed-event contracts. Several effects of one molecule are not a fixed combination with independent component exposures. Oral absorption/bioavailability and active metabolites remain incomplete.
- Next development candidate in shadow: a named opioid from `analgesia`, after separating paracetamol/fentanyl and validating its own route/dose/PK and analgesic/CNS time windows. Existing three opioid bindings are reusable; generic analgesia must not receive opioid respiratory effects. First infection group is ceftriaxone+metronidazole only after shared pathogen/susceptibility/exposure-response and actual-source contracts, then toxicity-aware families.
- No global indication by availability, no numerical medical approval by passing tests, and no fictitious heparin compatibility. Its missing coagulation/thrombosis/bleeding/platelet/aPTT mechanisms still block activation. Survival/rescue, Surgery/disposition, nursing, XP, multiplayer and production remain untouched.

Commands: `npm run qa:pharmacology-infrastructure` prints inventory totals; explicit `node qa/pharmacology-infrastructure/coverage-487.mjs --write` refreshes the reviewed report when content/source changes. Tests never rewrite it or the B1 approved snapshots.

## 2026-10-11 — Runtime observation checkpoint (supersedes the pending observer item)

`ATRIA_487_PHYSIOLOGY_LIVE_OBSERVER_RESULTS.md` records the new opt-in QA connection to actual native administration and time. It reuses the existing B1 kernel, registry, receipts and clock; no numerical model or content refactor. Default OFF loads no B1 modules; explicit enable on a fresh visible local pilot patient installs two call-through hooks and writes only separate shadow state. The old native HTML stays byte-identical after removing that sole QA entry.

The real nursing journey comparison now tests all five B1 interventions in three pilot cases, with pending/confirmed boundaries, exact native-state equality, repeated boluses and delivered rate changes. Missing route/formulation and confirmed suspension are still executor gaps; an unrecorded stop or dose edit disables comparison rather than fabricating an event. Heparin/global activation is not bypassed.

Checkpoint 2 is stopped because native vital/physiology ownership remains shared with critical-rescue effects and grace/death/surgical consumers. A clinical writer cannot be enabled safely by adding B1 output or redirecting the monitor. Complete verifiable execution evidence and establish one effect owner plus an unchanged contract for protected consumers first. All25 remaining entries and10 additional profiles remain pending; this gate must precede active families/case integration. No production promotion or physical-device validation.

## 2026-10-11 — Delivery contract complete; ownership conflict reproduced

`ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md` supersedes the generic Checkpoint2 blocker with an exact writer/consumer inventory and isolated counterexamples. The existing adapter now supports strict v2 formulation/revision/route and episode/predecessor contracts; its persistent receipt index prevents cross-batch hidden starts and v1 downgrades, while preserving approved B1. Published contract SHA `3d278b6f95e766f5d33f4423ca96616a9a26c92b`, complete CI [38142424357](https://github.com/javierdario48-star/ATRIA/actions/runs/38142424357) SUCCESS.

Actual nursing receipts still lack explicit executed formulation and native stop evidence. Replacing only Ringer's bolus leaves critical-rescue fluid volume and conditional bridge/convalescence writers. Hiding the native administration instead removes protected support/handoff evidence. The new preflight runs in `npm test`; PASS means the blocker is reproduced, not permission for activation. Numerical equations, native HTML, protected policies, CP1 observer and catalogue remain unchanged. The next work is this narrow ownership/execution boundary, not another infrastructure refactor or the25 remaining entries.
