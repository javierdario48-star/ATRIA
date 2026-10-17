# C1 — Clinical freedom and inherited consequences

Branch: `atria-5.0-core-rebuild-experimental`. Base: `00984d4329ffbff504914625f6f0bdd5fcd54276`.

## Implemented contract

The doctor can prescribe a clinically wrong but technically interpretable treatment. Allergy and bleeding do not reject it. Syntax, molecule, patient identity, dose, route, access, physical arrival, preparation and receipt checks still apply. No pending order harms a patient. Transport retries never become new doses.

Patient facts accept `allergies:[{drugId:'ceftriaxone',severity:'severe'}]`, exact IDs/classes and original `clinicalFlags.drugAllergies/severeAllergies`. Unspecified severity does not invent severe hypersensitivity. The actual history is disclosed when the doctor asks; case defaults cannot falsely deny a supplied allergy. No automatic pre-administration disclosure.

`medication-harms-487.js` adapts confirmed, patient-matched administration/treatment rows to the **unchanged pure V4** `csSevereDrugReaction487` and `csHeparinHarm487`. It returns offsets to native APP/CIRR, which remain the only writers. No V4 HTML wrapper, B1, extra interval or parallel physiology owner is imported. The general pharmacology projection does not apply a second anticoagulant effect.

The allergy response uses original onset/rise/decay coefficients and the original >0.18 notification threshold. Repeat exposures retain new source IDs and can cause another episode after recovery; duplicate transport cannot. Concurrent allergic effects use the strongest original response rather than invented linear stacking.

Heparin uses the original initial IV simulated protocol (`HEPARIN_SIM_DOSE_487`); explicit unimplemented UI/mg/rate/route requests require clarification. Administration during active bleeding aggravates BP/HR with the original severity curve. This does not claim complete anticoagulant PK, reversal or MESI execution.

Complications are patient-bound history records and authoritative room events, displayed through the existing global transcript and clinical history. Confirmed complications reduce the original quality score; inappropriate antibiotic exposure cannot satisfy coverage or closure treatment credit. Recovery does not erase the penalty/history. XP still comes only from a unique original closure receipt.

The same existing grace, finite 65-real-second rescue and sustained critical exposure policies determine survival. A test combines real 6L overload with severe ceftriaxone allergy: overload alone remains nonfatal, early confirmed oxygen support permits survival, neglect/late support after sustained critical hypoxemia leads to death and zero XP. **No claim that an isolated allergic dose universally kills a stable patient.** This migrates the game model, not a complete real-world anaphylaxis treatment protocol.

Delayed frames are subdivided through the same clock/executor only when a severe allergy or heparin exposure/preparation requires it. Otherwise a complete transient reaction could be skipped. No global time scaling; display = 1 real minute / 1 visible hour, native drug domain unchanged.

## Verification / execution plan completed

- Reproduced RED: preventive allergy rejection, false allergy denial, absent native heparin executor, falsely fulfilled allergenic coverage, transient harm skipped by a long frame.
- GREEN: `clinical-freedom.test.js`, `medication-harms-487.test.js`, `anticoagulant-freedom.test.js` and corrected C12.k assertions. Real generated 4.8.7 administration and adverse offsets compared at equal elapsed native time for both inherited mechanisms.
- Checks include questioning/avoidance, unasked facts, preparation, compound order, physical nursing adapter, worsening BP/SpO2/HR, episode documentation, score, rescues/death, re-exposure, forged/cross-patient/future/duplicate receipts and unsupported heparin formulations.
- Full `npm test` completed locally with exit 0; original 421 nursing, 131 closure and 39 harmful scenarios retained. The two old nonresponsive hypovolemic-diuretic scenarios (PERI-SEC/CHOLANG) remain explicitly unresolved. No old clinical file or golden source changed.
- `test:v5`, `test:v5-core`, V5 core/game builds, old build, boundary audit and `git diff --check` run before publication. Exact CI outcomes and final counts must be recorded after remote execution.
- `qa/v5/clinical-freedom-browser.mjs` added to existing CI: published ESM modules, genuine spatial nurse journeys, desktop/Pixel emulation × Solo/Aprendiz, clinical history. It creates an authoritative scenario at admission, never mutates live clinical state. Local Chromium absent; install download failed. Do not label browser QA approved until CI completes.

## Next checkpoint and limits

C2: reuse the prepared-medication pipeline for remaining original formulations/families, starting with alternative antibiotics and case-appropriate coverage. Every active entry needs execution, preparation, receipt and model-specific effects; a catalog entry is insufficient. Preserve unsupported route/dose clarifications.

C3: recover original immediate sepsis treatment plus effective secondary/rescue wrappers as pure functions; connect a single PERI owner to the already extracted longitudinal core. Do not apply sepsis progression to APP/CIRR. Migrate PERI closure under its own rules, not APP rules.

Still missing: 11 case executors, full 30-treatment execution/PK/duration/overdose/interactions, both diuretic discrepancies, product multiplayer/lobby integration and durable transport, 2–4 browser gameplay, physical Android and all remaining case-specific closure/visual parity. This checkpoint is not full ATRIA 5.0 completion.
