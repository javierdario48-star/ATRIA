# ATRIA 4.8.7 — Low-credit Work execution protocol

Source branch: \`atria-4.8.7-multiplayer-stabilization\`  
Plan-only branch: \`atria-4.8.7-structural-cleanup-qa\`  
Pinned source SHA at the start: \`95c4f5d7c3a02bfebc675be3889bcc673ac96e4a\`  
Current source SHA may move. Before any implementation, fetch BOTH heads and explicitly reconcile; do not silently reset, overwrite, or merge newer changes. This plan is valid as a design reference, not a certification of QA.

## Why Work should not start with "refactor everything"

The current generated game uses ~1.98 MB frozen legacy source, source-anchor integration, 79 script blocks, extensive historical tests, and multiple independent-browser jobs. An indiscriminate rebuild can make regressions untraceable. The goal is to reduce clinical and network defect rates, not maximize rewritten lines.

## Tasks that should not consume Work's computer/credits

These documents already establish the architecture, current ownership candidates and test gates. Work must **read and reuse them**, not repeat broad exploration of 181 source/test files, not re-research OT server architecture, not create mock screenshots, and not reopen solved map/art tasks.

## First Work task: P0 clinical order transaction, ONE narrow vertical slice

1. Fetch current source and cleanup-branch heads; report drift. Do not change the original stabilization branch.
2. Read only \`src/integration/nurse-scanner-487.js\`, \`nurse-voice-487.js\`, \`nurse-execution-487.js\`, \`src/clinical/natural-study-orders.js\`, \`src/integration/pharmacology-receipts-487.js\`, \`qa/hemogram-albumin-browser-487.mjs\`, \`qa/android-integrated-orders-487.mjs\`, and relevant source-anchor integration lines. Expand only for a concrete dependency.
3. Identify the precise old and new paths for \`Enfermera hemograma\`; compare against \`Enfermera albúmina\` and \`Enfermera dos vías y hemograma\`. Make a one-page trace of source->interpretation->patient->native executor->receipt.
4. Write strict characterization tests: positive study request, no drug, previous IV order pending, late IV completion, retry duplicates, guest 2–4 clients, wrong patient, out-of-order reply.
5. Implement only the minimum needed to make the proven failing test pass. Do not create a new pharmacology engine or general command bus.
6. Run fast targeted tests, then build, golden-source gate and the real browser CI. Report exactly which test ran at which SHA.
7. Commit with root cause, limited diffs, no unrelated formatting. Stop after this vertical slice. Request feedback before expanding to chat.

## Subsequent one-at-a-time tasks (NOT part of task 1)

- Task 2: map sole chat input/owner; remove an identified redundant wrapper only after replay/ack/idempotency tests.
- Task 3: prove host room snapshot and patient state convergence on resume/reconnect.
- Task 4: isolate UI hit testing/social interaction without touching movement.
- Task 5: replace ONE \`replaceOnce\` patch with a stable interface and ensure byte-level frozen source invariance.

## Release gates per checkpoint

1. **Baseline fingerprint**: source SHA, golden 4.8.6 manifest hashes, unchanged 13 clinical cases, changed-file list.
2. **Behavior characterization**: a test MUST fail on the defect and pass on the fix, OR document why a protective negative test is new.
3. **Focused targeted tests**: check existing targeted \`npm test\` scripts; do not run huge CI just to test a typo.
4. **Whole-source build and immutable check**: \`npm run build\`, \`npm test\`, existing artifact hash gate.
5. **Independent browser real-client checks**: 2, 3 and 4 browsers, including Android emulation, on the same actual game build. Do not confuse emulation with physical Android.
6. **Final verification**: same HEAD SHA = Actions SHA = Vercel READY SHA, only if deployment of that branch is intended.
7. **User acceptance**: manual Android play test before any merge from cleanup to stabilization.
8. Failure means NOT DONE. Never lower expectations, silently suppress exceptions or claim success with pending jobs.

## Stop / rollback protocol

- Work in small independent commits. No broad global "cleanup" or formatting.
- After 2 consecutive failures of the same tool/action, stop that approach and report the exact blocker, keeping checkpoint.
- For a failing regression, revert only the offending change, retain diagnostic evidence and characterization test.
- Preserve user edits by fetching latest heads before updates; never force push.
- No new third-party runtime dependencies or paid infrastructure without explicit approval.
- No separate C++ dedicated server, React rewrite or global event bus unless separately justified and approved.

## Structured handoff required from each Work task

\`\`\`
SOURCE SHA:
CLEANUP SHA:
FILES CHANGED:
ROOT CAUSE:
OLD AND NEW BEHAVIOR:
NEGATIVE TESTS ADDED:
TARGETED TESTS:
CI JOBS (completed/pending/failing):
GOLDEN HASH CHECK:
VERCEL URL + SHA (if deployed):
MANUAL ANDROID RISKS:
NEXT SINGLE TASK:
\`\`\`

## Team discipline

For state-changing clinical actions, reason about a single authoritative writer and patient-scoped command/receipt. For UI, validate actor/target/spatial proximity but never mutate medicine directly. For chats, do not reinterpret human-visible speech as a clinical order without explicit addressed recipient and permissions.
