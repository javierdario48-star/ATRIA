# ATRIA 4.8.7: chat and Vega verification

Repository: `javierdario48-star/ATRIA`. Only branch `atria-4.8.7-multiplayer-stabilization` is authorized. Starting remote HEAD: `413a5c08a68c7aa04d9a66679ed3fc4981d795ab` (17 commits after the supplied reference).

## Integrity checkpoint

- Failed run: `38332553312`, commit `6184825301ec23991fde85f1e7297535722cf2b2`.
- Responsible commit: `303e43134f185dd3c438db031bb4b5a552756257`, parent `54cecc3faff39607843ab6663735e0884b0bd6ba`.
- Exact delta: the `oldExplicitCall487` adapter was inserted immediately before `window.nsTreatmentContext`, between the rescue IIFE start and `function say`. The call behavior was legitimate but its position altered the frozen context.
- Existing fix: `d42c95ec5332ca5aa90bc1c32e179e3955d497fa` relocates the same adapter after `say`, before `status`. No general rollback, physiology changes, fixture regeneration or hash replacement.
- Frozen fixture/original context SHA-256: `31ed6e0d9bfd1da23a88653b916a3c5e387409d2c80ee3fb7de785ce02805901`.
- Faulty context SHA-256: `2b5189d2d4269a6c5bf4360fc8d75ddf52646029375ea05fe6909ac593ae9d61`. The former compatibility assertion used `assert.equal(prior, actual)`, so Node's diagnostic labels reversed the intuitive expected/observed roles in the report.
- Independently reproduced both hashes using the adapter at `6184825`; current context equals the original. `physiology-native-reference-487.test.js`: 24 trajectories, 120 samples, 4,537 numeric comparisons pass. Build and `qa:physiology-artifact` pass, including unchanged historical HTML SHA `dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7`.
- Compared the extracted context with the last successful full pre-regression revision `8518df90691fa64d21fa18fa4180852ecc611828` (run `38330917089`): it has the same original `31ed6e…` hash.
- New regression: `src/integration/vega-integrity-487.test.js` verifies the original hash, one adapter outside the protected context, and rejects the precise historical mutation.
- Published integrity checkpoint `b8551103a58a2721bd0e6973b9eea71f8343fac8`; all three Actions jobs passed in run `38339085539` before functional work.

## Implementation plan

The user supplied the complete design and authorized implementation. Continue the existing adapters and native controller; do not create a second chat, scheduler or multiplayer engine.

1. Integrity: verify existing remote correction, preserve fixtures and protected source, publish this checkpoint before functional changes.
2. Chat: reproduce focus and IME defects; update `chat-recipient-487.js` with synchronous focus and composition-safe mention insertion. Preserve draft, caret after prefix, movement controls and explicit command precedence. Test generated dispatch with real nursing/clinical runtime and native relay for 2–4 peers.
3. Vega: reproduce insufficient-diagnosis workup, cancelled-result waits and inappropriate proposals; update `vega-concise-consult-487.js` outside the frozen context. Use native case studies, real results, sequential stable decisions and clinically justified urgent support. Test all 13 cases using the generated controller and actual native administration/evolution.
4. Regression: run the entire existing npm test suite, observer journeys, build, artifact integrity and generated syntax checks. Publish small commits only to the authorized branch; verify Actions and the final remote SHA.

Review focus: input rebuilt during IME, explicit questions containing drugs, team chat during clinical care, simultaneous messages on separate patients, cancelled studies and patient/room changes during Vega's active turn.

## Verification limits

Node VM fixtures simulate actors, DOM and transport. Chromium with mobile viewport/touch can verify browser events and caret, but cannot prove a physical Android soft keyboard or real multiplayer network. Never report those as physical-device tests.

## Chat checkpoint

- Reproduced: selecting an NPC while the composer was unfocused did not focus it. Corrected with synchronous `focus({preventScroll:true})` before changing the caret.
- Reproduced: the final hospital actor wrapper consumed a nurse tap before the original patched handler. The outermost chat adapter now selects the mention and still invokes native navigation; it does not replace movement controls.
- Composition now retains the same DOM input during native repaint and defers prefix replacement until the IME commits. Repeated selections retain only the last recipient; drafts and selections survive repaint.
- The owner and cooperative relay share the leading-mention parser. Requests retain sender identity, patient UID and recipient; authoritative permissions reject conflicting recipient metadata. Existing native replay receipts are retained.
- Passed: 26 VM editor checks, six native-engine/protocol sessions across 2–4 players in coop/competitive, ten multiplayer restart cycles. Real administration records verify the nursing action; Vega questions do not administer drugs or enter patient anamnesis.
- Added `qa/chat-browser-487.mjs` and a required Actions job using actual Chromium DOM/pointer events, desktop and Pixel 5 emulation, the generated native canvas and hospital handlers. Local browser downloads were blocked. Actions run `38340375312`, checkpoint `396a196f71860e24a13c1acf81cc07b583adecc2`, passed all three jobs, including both browser variants. Composition is a synthetic IME event sequence in an isolated chat fixture, not a complete game boot or a physical soft keyboard test.

## Vega and shared transcript checkpoint

- Reproduced and fixed adequate native diagnostic evidence being ignored, missing/cancelled studies stranding result waits, and proposals unrelated to the current native case reaching administration. The controller now reuses evidence, pauses cancelled workup for an explicit response, and validates proposals against the existing case algorithm and safety prerequisites.
- Initial workup is at most two pertinent existing studies. The selected study IDs remain fixed while results are pending. A later safety prerequisite is ordered only when the next treatment decision requires it (renal function, infectious stool workup or culture in the respective native cases).
- A stable decision waits for the player. Explicit uncertainty delegates one native measure, waits for its real administration or specialty acceptance, and returns to one decision. Hints/questions and silence cannot silently authorize a cascade. Explicit full delegation remains available.
- Severe hypoxemia/shock use native support with current indications. Case-specific urgent empiric measures use native clinical APIs. Shock with examined secondary peritonitis requests urgent surgical evaluation before all results, without claiming that surgery occurred.
- Reproduced delayed patient answers disappearing when switching beds. The 320 ms native response now stays on its original patient, with patient/guard/room validity checks and native patient-context binding. Background answers do not write into the new patient's anamnesis.
- NPC answers are relayed through existing public `team_chat` messages with sender, patient UID, NPC speaker and recipient metadata. Only the patient's owner can originate them; authenticated replay receipts suppress duplicates. Listeners render text without executing clinical orders, including teammates attending another bed.
- Independent read-only review identified two additional regressions, each first reproduced by a failing assertion: uncertainty after a correct learner proposal only emitted hints; critical deterioration during a cancelled-study pause only provided partial support. Both now pass: uncertainty advances one real next action, and urgency overrides the pause, delivers indicated native coverage and resumes the unresolved study decision after stabilization.
- New `qa/vega-integrated-runtime-487.mjs` loads the full generated rescue controller plus native medications, administration, study timers and physiological evolution. Actor arrival/movement, DOM and previous mentor callbacks are fixtures. Starting acuity and pre-existing completed case results are explicit scenario inputs.
- `vega-full-matrix-487.test.js`: 13 native cases × 14 scenario categories = 182 checks, including oriented/unknown cases, silence, correct/incorrect/uncertain responses, cancelled studies with deterioration, completed-treatment reuse, real urgent dose records, physiological response against matched untreated controls, resumed teaching, rival permissions and ended patients.
- `vega-native-flow-487.test.js` additionally waits for real PBE study timers, tests cancelled-study retry, rejects an inappropriate drug, confirms sequential stable administrations, and verifies urgent APP coverage plus explicit study retry after stabilization. Existing partial-controller tests now load the actual proposal helpers rather than mocking away their safety checks.

No clinical catalogue, physiology/pharmacology engine, frozen fixture, production branch or golden-master file was changed. Browser and transport limits above still apply; multiplayer coverage uses native handlers and independently authenticated simulated clients, not live WebRTC users.

## Final local verification

- Full `npm test` completed successfully after the review fixes, including all existing clinical, pharmacology, nursing receipt, study, destination, EXP, mode, lobby, synchronization and protected-source gates.
- `npm run qa:physiology-live` passed 24 matched observer trajectories and 216 points. This is a technical comparison of native simulated journeys, not external clinical validation.
- `npm run build` and `npm run qa:physiology-artifact` passed, with exact historical HTML recovery and no default experimental physiology writer.
- Generated-output safety checks passed; `node --check` accepted all 77 inline scripts and 11 copied external task scripts.
- `git diff --check` passed. The final remote HEAD and its complete Actions result are verified after publishing and reported with the delivery.
