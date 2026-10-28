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
