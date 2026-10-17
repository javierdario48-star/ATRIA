# C2.a — Original antimicrobial formulations through the shared executor

Base: C1 `035ae6b0c8dca197574011d637c4276d3fb50b53`, fully approved CI4/4 and legacy census. Same exclusive experimental branch. No old implementation or golden master changed.

## Executed scope

The same `createIVAdministration` now prepares nine more original formulations. No new drug engine, receipt type or vital writer. All aliases come from the existing 30-treatment content; all doses from existing default-doses. Ceftazidime/cefoperazone/cefepime prepare in 0.55 real seconds; imipenem/piptazo/ampicillin/amikacin/gentamicin/fluconazole in 1.5s. These values were measured from **actual** `createLiveNativeJourney487` delivery timestamps, not inferred from labels.

Together with fluid, ceftriaxone, metronidazole, furosemide and heparin, 14 IV entries are now executable in the current APP/CIRR clinical owners. Technical route/dose/identity/access validation remains. This checkpoint certifies original reference formulations; it does not invent unrestricted dosage/PK/toxicity for all 30 entries.

APP's existing progression policy now accepts its inherited alternative coverage sets, rather than giving appropriate coverage only to the literal reference pair. `antimicrobialRegimens487` obtains the three APP regimens from the actual unchanged V4 finalizer (reference pair, piptazo, imipenem); the same sets drive the general coverage projection and disease policy. Confirmed piptazo or imipenem contributes appropriate treatment/closure credit and slows future progression with the same existing policy. No pending or allergenic administration receives that credit. No universal immediate antibiotic vital improvement, performed surgery or automatic source control is added.

Unnecessary antimicrobials are assessed from inherited class/case traits rather than two hardcoded drug IDs. In stable noninfectious CIRR they remain administrable and count toward inappropriate-exposure quality deductions, without inventing immediate organ failure. Existing real severe-allergy consequences apply to the new formulations and classes.

## Verification

`antimicrobial-execution.test.js` checks 36 actual APP/CIRR×Solo/Aprendiz administrations, all nine exact V4-versus-V5 doses/delivery times/early vital trajectories, two real alternative APP workups through accepted surgical consultation,100/100 closure and133 unique XP, and severe penicillin-class allergy after authentic piptazo delivery. The browser acceptance additionally sends piptazo through the actual spatial nursing queue in desktop/mobile and both local modes.

RED reproduced unimplemented preparations and absent alternative coverage; GREEN implements only the inherited family and shared policy. `test:v5`:349/349; `test:v5-core`:40/40; both builds/boundary/diff checks locally approved. Published code SHA `833c8bc0a3f8dc45ce103de7e614bb4dd01e0c54`: [V5 CI4/4 success](https://github.com/javierdario48-star/ATRIA/actions/runs/39065136115), [legacy F/G/I census success](https://github.com/javierdario48-star/ATRIA/actions/runs/39065136162), full local historical regression success. [Preview verified HTTP200 and all96 manifest hashes](https://night-shift-clinical-pntgp6g6r-javierdario4878-7324.vercel.app). Evidence: `docs/evidence/c2a/verification.json`.

## Remaining sequence

C2 is still partial: special formulations (albumin g/kg, amphotericin mg/kg, pressor infusion, blood products), analgesics/morphine with effective late-wrapper kinetics, remaining oral/procedural treatments, dose accumulation and interactions require their original execution/receipt/effect contracts. No claim of 30 completed treatments or renal injury from a single aminoglycoside dose.

C3 still needs the sepsis native owner: integrate original immediate treatment effects plus effective secondary/rescue rules with `sepsis-physiology-487-core.js`, then the three original PERI closures under `csPeritonitisEvaluate487`. Other11 executors and product multiplayer remain unimplemented. Do not extend septic latent physiology to APP/CIRR or enable an unsupported case simply by adding a selector option.

## Ruling on the contradictory fourth APP fallback

Review reproduced cefepime+metronidazole being executable and accepted by the experimental general registry while the effective original finalizer rejected it. To preserve the user's mandatory original closure contract, V5 now derives APP coverage from the three actual `CASE_CLOSURE_RULES_487` treatment sets. The fourth general fallback no longer promises case coverage or prospective progression relief. The order remains technically executable and its receipts remain exact. No synthetic ceftriaxone administration is inserted and no V4 source is modified. This is a simulator acceptance contract, not a claim that this regimen is inappropriate in real medicine. Expanding case-specific accepted regimens belongs to a separately validated case-rule migration.
