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
- New regression: `src/integration/vega-integrity-487.test.js` verifies the original hash, one adapter outside the protected context, and rejects the precise historical mutation.

## Implementation plan

The user supplied the complete design and authorized implementation. Continue the existing adapters and native controller; do not create a second chat, scheduler or multiplayer engine.

1. Integrity: verify existing remote correction, preserve fixtures and protected source, publish this checkpoint before functional changes.
2. Chat: reproduce focus and IME defects; update `chat-recipient-487.js` with synchronous focus and composition-safe mention insertion. Preserve draft, caret after prefix, movement controls and explicit command precedence. Test generated dispatch with real nursing/clinical runtime and native relay for 2–4 peers.
3. Vega: reproduce insufficient-diagnosis workup, cancelled-result waits and inappropriate proposals; update `vega-concise-consult-487.js` outside the frozen context. Use native case studies, real results, sequential stable decisions and clinically justified urgent support. Test all 13 cases using the generated controller and actual native administration/evolution.
4. Regression: run the entire existing npm test suite, observer journeys, build, artifact integrity and generated syntax checks. Publish small commits only to the authorized branch; verify Actions and the final remote SHA.

Review focus: input rebuilt during IME, explicit questions containing drugs, team chat during clinical care, simultaneous messages on separate patients, cancelled studies and patient/room changes during Vega's active turn.

## Verification limits

Node VM fixtures simulate actors, DOM and transport. Chromium with mobile viewport/touch can verify browser events and caret, but cannot prove a physical Android soft keyboard or real multiplayer network. Never report those as physical-device tests.
