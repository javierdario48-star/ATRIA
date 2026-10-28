# Clinical recovery, 2026-10-28

Recovered the interrupted working tree at `/workspace/scratch/81946b15abba/ATRIA`.
Its HEAD and the authorized remote branch both resolved to
`b4ae3434e7f7cc24e2c7772d4168d856fbf0ac65`. Before editing, the recovery
preserved the tracked patch and every modified/untracked file in a separate
scratch archive. No other branch or original clinical source was changed.

This checkpoint preserves the shared policy/compiler/administration work,
three authored ten-case packs, reproducible patient variation, clinical
observations, and public-command certification. It fixes integration defects
found by executable regressions, including specialty history, build inputs,
partial infusion evidence, heparin dose dimensions, and magnesium routing.

The committed certified catalog is intentionally empty at this checkpoint.
The 30 specialty definitions are staged content, not a claim of playability.
Production activation requires an exact compiled pack, current executable
dependencies and actual guard-runtime certification; the import command writes
the catalog atomically only after all its cases pass.

Verified for this checkpoint: 266 focused tests passed, `npm run build:v5` and
`npm run build:v5-core` passed. Broader V5 and historical suites are recorded
separately as they finish. The focused suite includes the real registry/guard
certificate round trip, two infusion restores and nursing concurrency.

Reproduce specialty evidence with `node qa/v5/specialty-certification.mjs`.
It writes complete per-scenario evidence to ignored `qa/v5-specialty-results/`.
The main V5 test command now includes pack, importer and certification tests.

## Subsequent activation

The subsequent implementation activates all 30 specialty cases (10 respiratory,
10 cardiology, 10 neurology) alongside the original 25 gastrointestinal cases.
Each pack was imported again through the real compiler and public guard runtime
after the final physiological corrections. All 30 competent solo journeys passed
history, examination, studies, administered treatment, trajectory, closure, XP,
restart, shared authority, nursing, replay and terminal-state integrity checks.
The committed manifest contains those native proofs and the exact pack digests;
duplicate command traces are omitted from the compact manifest. Full scenario
traces remain available from the QA command and CI artifacts.

Selection, invitations, browser panel coverage and content migration now use the
certified catalog. New cases share the existing patient, vital-sign, pharmacology,
nursing, survival, closure and reward authorities. Continuous treatment benefits
follow actual active delivery, and stopping support can interrupt complication
recovery. Policy-owned pressor responses are not applied twice. Partial infusion
exposure can cause harm but cannot grant premature completed-treatment credit.

Clinical observations reflect current support and neurological state; historical
study results retain their sample times. Unconscious patients can have explicitly
attributed companion history without regaining speech. Severe pulmonary embolism
uses supported airway rescue only for refractory hypoxemia and post-lysis heparin
requires a fresh coagulation sample. The original clinical sources and V4 remain
unchanged.

Patient allocation uses 1,251 first names and 1,405 surnames with reproducible,
persisted identities, compatible age and history variants, personality and typed
allergy facts. Allergy knowledge comes from legitimate history; reactions use
the existing pharmacology.

Final local verification: `npm run test:v5` passed 2,565/2,565 tests;
`npm run build:v5` built 189 files and `npm run build:v5-core` validated 22 modules.
The historical `npm test` suite also passed during this recovery. Two explicit
complication-rescue journeys (RESP-04 and NEUR-08) passed again after the final
physics changes. Abandonment in RESP-04 and RESP-06 produced native deaths with
zero XP, one death event and immutable terminal state. A separate 20-scenario
slow/inexperienced/negligent/wrong-treatment/abandonment matrix produced three
accepted destinations, nine native deaths and eight living, unclosed cases;
negative care profiles are not certified as successful care.

CI additionally runs all 30 specialty journeys in solo, apprentice, cooperative
and competitive modes, with evidence artifacts, and browser coverage of all 55
cases. Browser execution is delegated to CI because this workspace has no
Chromium executable. Automatic deployment is restricted to the experimental
branch preview; this work does not promote production or modify `main`.
