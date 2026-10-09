# ATRIA 4.8.7 — Stabilization checkpoints

- Starting HEAD: `892c302160fce2af477e272b7f3cbd38401fb384`
- Last fully green HEAD: `308abe137b982289d20e8baf6ccfdeedb1ef0fcc`
- Phases completed: Phase 1 scoped CSS correction source/build/artifact regression green; physical Safari/Android and upstream message duplication still open. Phases 2–6 pending.
- Active phase: 2 — patient hit testing and physical-exam access (read-only inspection started).
- Files under investigation: generated ward click wrappers in `vendor/atria-4.8.6/index.html` (READ ONLY), `src/integration/apply-487.js`, and associated tests; Box 2B maps to bed `B4`.
- Verified tests: Phase 1 failing regression reproduced then passed. `node src/integration/apply-487.test.js` and `npm run check` returned 0; code blob hashes matched independently. GitHub Architecture QA and Read-only Backend Probe succeeded for `308abe137b982289d20e8baf6ccfdeedb1ef0fcc`.
- Phase 1 findings: exact-scope `replaceOnce` corrections enable history pointer/touch scrolling, preserve keyboard-open transcript, and wrap long speech text. Browser device-specific layout not physically tested. Rendering 10 stored messages yields 10 rows in isolated extract; upstream duplicate processing not completely ruled out.
- Defects open: physical Safari/Android QA; upstream duplicate event tracing; phases 2–6; Box 2B patient (B4) hitbox/exam access. No main/production/vendor changes.
- Next exact step: trace last active ward `handleGameTap` wrapper, multi-bed `scene()`, patient selection and `openEntity('patient')` for B4; reproduce bad hit routing, add failing artifact regression, implement minimal change, validate full suite and commit if green.
- Last verified deployment: `https://night-shift-clinical-t8qbmcv8u-javierdario4878-7324.vercel.app/` (`READY`, SHA `308abe137b982289d20e8baf6ccfdeedb1ef0fcc`, QA preview).
- Concurrency: QA HEAD rechecked before updating this checkpoint; no open PRs at initial audit.
