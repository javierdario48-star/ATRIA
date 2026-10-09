# ATRIA 4.8.7 — Stabilization checkpoints

- Starting HEAD: `892c302160fce2af477e272b7f3cbd38401fb384`
- Last fully green HEAD: `892c302160fce2af477e272b7f3cbd38401fb384`
- Phases completed: none (read-only forensic audit completed; Phase 1 not fixed)
- Active phase: 1 — mobile ward chat/composer
- Files under investigation: `src/integration/apply-487.js`, `src/integration/apply-487.test.js`; effective HTML `vendor/atria-4.8.6/index.html` (READ ONLY), generated `out/index.html`
- Verified tests: Architecture QA and read-only QA Backend Probe both successful at starting HEAD; `npm run check` returned 0 in isolated Vercel sandbox. An isolated runtime extraction of `recentChatLines()` produced 10 DOM message rows for 10 inputs, preserving intentional word repetition.
- Phase 1 findings: legacy CSS declares `pointer-events:none!important` on `body:not(.keyboardOpen) #chatDock:not(.nsLobbyChat) .chatRecent` even while declaring `overflow-y:auto`. Another legacy rule declares `body.keyboardOpen #chatDock:not(.nsLobbyChat) .chatRecent{display:none!important}`, conflicting with the later `nsComposerStyles` mobile-history layout. These are confirmed source/artifact-level defects, not a completed physical Safari diagnosis. No evidence yet that all word duplication is visual.
- Defects open: all six phases; Safari/iPhone physical QA unavailable; full event-origin-to-DOM deduplication not yet audited; no fix committed.
- Next exact step: In Phase 1, add failing artifact regression assertions for scroll hit testing and keyboard-visible history; replace only the two uniquely anchored legacy CSS rules in `apply487`; add ward-scoped wrap handling if needed; run focused tests, `npm run check`, inspect generated HTML, then commit only if green. Verify source, artifact, and, where possible, browser runtime. Do not modify `main`, `vendor/atria-4.8.6`, or production.
- Last verified deployment: `https://night-shift-clinical-fe2njy5dk-javierdario4878-7324.vercel.app/` (`READY`, SHA `892c302160fce2af477e272b7f3cbd38401fb384`, QA preview).
- Concurrency: HEAD matched starting SHA before checkpoint creation; no open PRs observed during audit.
