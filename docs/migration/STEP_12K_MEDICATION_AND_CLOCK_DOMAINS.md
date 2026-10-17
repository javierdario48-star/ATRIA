# ATRIA 5.0 — C12.k: clock domains + inherited drug safety

Date: 2026-10-17. Exclusive branch: `atria-5.0-core-rebuild-experimental`.

> **Correction C1, 2026-10-17:** preventive allergy blocking below was an incorrect design decision, superseded by [C1_CLINICAL_FREEDOM.md](C1_CLINICAL_FREEDOM.md). Medical contraindications do not reject technically executable orders. Real administrations drive inherited adverse physiology and scoring. Clock findings remain valid.

## Verified original clock contract (do not introduce a second clock)

The current V5 `createGuardClock` deliberately uses the pure V4 `createClinicalClock487`: `clinicalMinute` grows at one *game/display minute per real second*. 1 real minute = 60 game/display minutes, and 24 real minutes = 24 game/display hours. The V5 UI already displayed `8:15 + clinicalMinute`; it was NOT a bug in the displayed clock.

The parallel `nativeMinute` domain is distinct and deliberately runs at `.12` native min per real second outside typing, `.03` during typing. This is the historical native pharmacodynamics/physiology timestamp domain, NOT the UI time. After 24 real minutes uninterrupted, gameMinute is 1440 but nativeMinute is 172.8. Previous docs that called this a *broken 24-hour display clock* were inaccurate. Any plan to speed up pharmacodynamics to match displayed days requires separate tests for all onset times, the 65-real-second rescue window, 180–480s grace, medication preparation deadlines and completed studies; do not scale nativeMinute globally.

C12.k exposes `clock.gameMinute` explicitly and has `guard-day-clock.test.js` enforcing the exact 60s/24min contract, including typed segments and checkpointed history. The HUD reads the game field. No change to native drug kinetics, nursing deadlines, study timing, grace/rescue or already-tested APP/CIRR behavior.

The 6-trajectory adverse-clinical bot previously mislabeled `nativeMinute` as the *declared game minutes* and automatically reported `clock/24h` as failed despite the visible clock being correct. C12.k now compares `clock.gameMinute===1440` after 1440 real seconds while **separately validating** `nativeMinute===172.8` as the unchanged historical PK rate. It does NOT make kinetics faster or declare all drug PK calibrated; it repairs a false parity failure with explicit time domains.

## All 30 legacy formulary entries versus administrable medicines

The original `PHARMA_RULES_487` and `csPharmResponse487` cover 29 entries; the 30th, anticoagulation, is a clearly marked `review-only` rule with NO invented mechanistic effects. V5 `pharmacology-catalog.js` already projected the V4 rule and case-sensitive efficacy/outcome for 30 x 13 = 390 case–drug combinations without administering them. `csPharmOutcomes487` recognizes FULL coverage regimens and renal injury virtual indices, not antibiotic benefit just because a drug exists.

This checkpoint adds `medication-safety-487.js`, a pure common safety assessment for 30 drugs x 13 original cases: inherited flags from V4 physiology. It distinguishes true nephrotoxic agents (amikacin, gentamicin, amphotericin) from drugs that merely require renal-dose review, includes the per-case `avoid` list, evaluates congestion risk and the absence of a documented infectious indication. Warnings are not instant physiological toxicity or XP penalties.

Optional documented allergies are accepted per patient and normalized; they apply to exact drug IDs and explicitly supplied drug classes (penicillin, cephalosporin, carbapenem and aminoglycoside), without inventing cross-reactivity between different classes. No allergy is assumed when it has not been provided. C1 removes the preventive administration/preflight block: a technically valid IV order is prepared and delivered even with a known allergy. Explicit severe allergy triggers the inherited reaction only after a real receipt. Medical risks remain distinct from dose/route/identity errors. Actual allergy facts are disclosed through patient questioning, not automatic preflight warnings.

The common `pharmacology-catalog` now projects these safety results alongside effective inherited response/warnings, but remains a **read-only interpreter**. DO NOT call 30/30 drugs 'playable' or 'fully implemented' until native executors, genuine receipts, timing/route/dose, effects and closure conditions are migrated and tested.

## Antibiotics, case closing and harms

Existing per-case `keyInterventions` and pure V4 closing (`csEvaluateClosure487`) define appropriate treatment and destination. For example, APP has ceftriaxone, metronidazole and accepted source-control/handoff requirements; PERI-SEC has ceftriaxone, metronidazole, source control and peritonitis-specific rules. Appropriate antibiotics contribute to required intervention **only after actual confirmed delivery**, not from mere chat text or as universal XP buffs. Complete regimens may reduce virtual infection only with case-defined coverage; source control remains separate.

Wrong antibiotic/no infection is a risk/quality problem, nephrotoxic medications require renal sensitivity, patient allergy makes that administration inappropriate, with modeled consequences rather than a preventive rejection. There is NO new universal antibiotic-driven vital improvement, and currently unadministerable case antibiotics do not secretly count toward closing.

## What is done, and what is NOT

- Done: V4 clock ratio exposed and tested; 390 case–drug safety evaluations, allergy classification for active IV (preventive gate superseded by C1); no second writer; all old tests included in GitHub CI.
- Already done before this step: pure V4 longitudinal peritonitis/sepsis physiology extracted and compared numerically with generated 4.8.7 in all three peritonitis cases, but NOT yet an active care executor.
- Not done: 26+ remaining full medicine executors, case-aware routes/PK and toxic overdoses, the rest of native case owners (11/13 missing), matching delayed pharmacodynamics to the 24-hour game display, multiplayer guard Coop/Competitivo activation, and end-to-end old death/closure visual comparison. No false completeness claim.

## Immediate prioritized implementation next

1. Extract **effective** V4 immediate treatment mechanisms from `applyImmediatePhysiology` AND the later V3/clinical wrappers, with unit/receipt/clock contracts, pure module and real original-vs-new bots on PERI-SEC under varied volume state.
2. Create ONE data-driven clinical execution pipeline for all 30 eligible drugs from the existing V4 registry, with explicit drug-specific route/dose/contraindication policies, real preparation, patient UID and provider receipts; leave anticoagulation in review-only until the original anticoagulant mechanism is established. No new state owner. Complete one family at a time with regression.
3. Connect a single PERI-SEC native clinical case executor to V5 room authority and its unique progression writer, then PERI-PBE/TER, retaining their original source-control and disposition logic.
4. Migrate the other eight clinical cases from old plans (not inventing new ones). Expand `csEvaluateClosure487` and existing XP/debrief displays only where actual parity tests show gaps.
5. Reconcile internal pharmacodynamics with the accelerated displayed clock in a *separate scoped checkpoint*, measuring study/dose onset, rescue timing and death; do not change all rates at once.
6. Reconnect coop/competitive to shared V5 authoritative patient, revisit independent F/G/I multiplayer contracts, and test 2,3,4 mobile clients including disconnect/reconnect and death/XP.

Acceptance for completion: all 13 case executors and actual closures, all 30 drugs with explicit functional/safe state, 26 legacy care journeys end-to-end, 421 nurse cases, 131 closure variants, 39 adversarial treatments (including the 2 ineffective diuretic cases), multi-browser 2–4, Android device and CI 4/4.

CI code: https://github.com/javierdario48-star/ATRIA/actions/runs/39059553376. Always verify 4/4 after code edits; green core alone is insufficient.
