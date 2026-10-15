# C3a — APP native characterization gate

C2 is certified and untouched. This checkpoint adds an **isolated historical
APP-001 characterization** (QA only), not an APP clinical execution feature.

Run: \`node qa/v5/characterize-app-native.mjs\`.

The scenario matrix executes the original effective 4.8.7 VM for APP-001,
with one confirmed IV reference access: baseline; ceftriaxone 1 g;
metronidazole 500 mg; both antibiotic drugs ordered together; Ringer 500 ml.
It verifies no administration before 500 ms and eventual real administration exactly once per ordered therapy; times are measured for each native medicine separately from administration log, not assumed to share one 550ms/1500ms preparation deadline
per actual order, and prints original snapshots, dose references and log
details in CI. **A confirmed IV in this historical harness is a controlled
input, not proof of a migrated V5 venous access procedure.**

Next: establish original APP physiology from these snapshots, migrate
nursing IV/monitor and correctly bound individual administrations through
the existing guard authority/port, and verify surgical consultation and
destination (surgery is an ED handoff, not a completed appendectomy).
Do not claim C3a is complete while its gameplay/Chromium route is absent.

## Verified original dose and clock evidence

Frozen VM snapshots: `qa/v5/fixtures/app-native-reference.json`.
- Ceftriaxone 1 g IV: native minute 0.18 = 1.5 real seconds; one actual administration; no modeled immediate vital effect.
- Metronidazole 500 mg IV: native minute 0.18 = 1.5 real seconds; one actual administration; no modeled immediate vital effect.
- Both ordered together: independent proofs, no duplicate effect.
- Ringer 500 ml: native minute 0.096 = 0.8 real seconds; one administration; target increments sys +14, dia +7, hr -12, rr -1, smoothly interpolated at 60Hz. Native original totals fluidMl=500.
- A reference `confirmedIVCount=1` is a controlled test fixture; real V5 IV insertion and surgical-service consultation remain separate migration tasks.

The reference test now compares all five source scenarios against frozen snapshots so a changed native behavior cannot be silently redefined by a new assertion.
