# ATRIA 4.8.7 — Full native handoff, XP and deliberate-malpractice QA

## Scope
This isolated QA branch is descended from `04e05639cfb83565a0c458d59a0da70d05d662a7`.
The source of truth remains the 13 existing clinical cases and all 30
catalogue interventions. There is **no modification to the old 4.8.6
golden master or production**.

Absolute testing of every possible sequence of 30 medications is
combinatorially infeasible. Instead, the battery provides:

| Test | Coverage | Observation |
|---|---|---|
| `qa/clinical-matrix-all-487.mjs` | 13 × 30 = 390 | Actual native selection and administration |
| `qa/adversarial-malpractice-487.mjs` | 390 high-risk drug/case rule pairs, 13 whole-patient harmful polypharmacy paths (65 drug attempts) | Confirmed receipt and the physiological difference vs untreated controls |
| `qa/closure-xp-real-487.mjs` | All 10 general-case native destinations plus full/partial handling and duplicate close | **Original** V18 `finishCase` and **original** V19 `csResultCareer`, rather than fake XP |
| `qa/closure-combinations-487.mjs` | 10 cases × 13 variations = 130 | Minimal/full workup, over-testing, omitted evidence, missing treatments, wrong disposition, unaccepted consultation, unstable discharge, repeated close |
| `src/integration/peritonitis-xp-native-487.test.js` | Three protected peritonitis pathways | Surgical handoff, retained safe scoring, native XP, duplicate prevention and unsafe discharge denial |

## What a valid game ending means

For the 10 general cases, case readiness and XP quality are separate:
the clinically appropriate minimum set enables an accepted ED disposition.
Anamnesis completeness, relevant diagnostic tests, support, medication
execution, autonomy and efficiency determine how much XP the original
career algorithm awards.

Neither selecting a disposition nor calling `finishCase` twice can
manufacture additional XP. The case only receives a career receipt after
native `caseEnded` / `_careerEndProcessed` and a safe proof bound to
patient UID and destination. The admission to Surgery or UTI is the
final ED action: NEVER set `phys.sourceControlled` merely for handoff.

The native-closure VM restores source text from **the current generated
game** to execute both native closing and native career rewards. The
headless harness substitutes only graphical rendering, sound and
persistent profile storage. It can verify the exact mathematical XP
formula and state transition but cannot verify a physical Android/iPhone
tap, persistent Supabase multiplayer receipt or graphical outcome.

## Deliberately wrong doctor bot

Each of the 13 native seeds is cloned into two matching patients.
The unsafe patient is explicitly **given active hemorrhage and a known
severe allergy to ceftriaxone**; its matched untreated patient has the
same risk flags.

The unsafe bot omits history, examination, diagnostic studies, useful
resuscitation and consultation, and instead orders:
heparin IV, furosemide, propranolol, ceftriaxone and morphine. The
script alternates nurse and monitor orders, waits for *verified*
administrations, observes ~30 additional simulation seconds and checks
vital differences.

The test requires genuine heparin hemorrhage and severe-allergy
physiology and an observable drop in systolic pressure and oxygen
saturation relative to the untreated patient. Reflex tachycardia is
**not** required because a concomitant beta-blocker can blunt it.
Incorrect cases must not automatically become ready for discharge
and must not grant XP.

**Important scientific limit:** Each synthetic variant is purposely
high-risk. A wrongly indicated drug does not *always* cause immediate
harm; in a low-risk patient it may have no measurable acute effect.
Acute renal failure, antibiotic resistance, surgical outcomes and HIT
thrombosis are not fabricated solely to make negative scenarios pass.

## QA artifacts and acceptance

On CI success, GitHub Actions uploads:
`qa/closure-combinations-results/report.json` and
`qa/adversarial-results/malpractice-487.json`
with outcome rows, native rewards and vital-sign deltas.

No green CI should be reported as proof of a real Android/iPhone browser
closure or as clinical-grade quantitative pharmacology. A future
end-to-end browser/device run is still required before production merge.
