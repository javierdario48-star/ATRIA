# C3a — APP native characterization gate

C2 is certified and untouched. This checkpoint adds an **isolated historical
APP-001 characterization** (QA only), not an APP clinical execution feature.

Run: \`node qa/v5/characterize-app-native.mjs\`.

The scenario matrix executes the original effective 4.8.7 VM for APP-001,
with one confirmed IV reference access: baseline; ceftriaxone 1 g;
metronidazole 500 mg; both antibiotic drugs ordered together; Ringer 500 ml.
It verifies the real 550 ms preparation and exactly-one administration
per actual order, and prints original snapshots, dose references and log
details in CI. **A confirmed IV in this historical harness is a controlled
input, not proof of a migrated V5 venous access procedure.**

Next: establish original APP physiology from these snapshots, migrate
nursing IV/monitor and correctly bound individual administrations through
the existing guard authority/port, and verify surgical consultation and
destination (surgery is an ED handoff, not a completed appendectomy).
Do not claim C3a is complete while its gameplay/Chromium route is absent.
