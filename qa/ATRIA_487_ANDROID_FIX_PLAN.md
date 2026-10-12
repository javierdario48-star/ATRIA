# ATRIA 4.8.7 — Android nursing, native closure and beta-blocker audit

> Execution: inline, systematic debugging and RED→GREEN regressions. The user's explicit implementation request authorizes execution and commits on the exclusive experimental branch.

Goal: correct the six reported defects with one existing executor and career owner.
Base: remote `5c5e06ba56c8a1fdf029fc0fc9fd117a0f7355b7`, verified 2026-10-12; Actions `38203666699` success. No later commits at recovery.
Branch: `atria-4.8.7-closure-harm-combinatorial-qa`.

## Constraints

Do not change main, production, vendor golden master, Supabase, secrets, multiplayer, movement, microphone, maps or grace/rescue/death protection. Preserve original dosing and original V19 XP computation. No synthetic resolved flag, direct XP increment, second scheduler or pharmacological engine.

## Checkpoints and contracts

- A: inspect actual load order; reproduce combined nursing and zero-XP using generated native code including late V412 nursing and ns422 experience policy. Existing narrower tests remain valid within their stated scope.
- B: preserve the existing composite nurse dispatcher at its actual late native replacement. Assert real cannulation, monitor state, medication receipts, IV dependency drain and independent execution. Reuse `qa/physiology-live/native-journey-487.mjs` and add `qa/android-integrated-orders-487.mjs`.
- C: clarify only the invalid clause, preserving native defaults for valid named medications. Test omitted/explicit dose, incompatible route, unknown/contextual antibiotic pair, repeated/pending orders and receipt dose/default provenance.
- D: preserve validated peritonitis handoff eligibility through the actual late XP policy. Test native finish, V19 career, profile persistence, HUD, patient switching, identity changes and single reward; extend all 13 cases. Add `qa/android-integrated-xp-487.mjs`.
- E: compare native beta-blocker single and repeated administrations with identical untreated controls. Audit identity, oral route, onset, cumulative dose, perfusion and clamps. Only change a mechanism proven defective by a failing regression. Add `qa/beta-blocker-audit-487.mjs`.
- F: run complete npm test, shadow journeys, build, artifact/syntax checks; independent whole-branch review; publish tested commits using expected-parent leases. Run only one full remote workflow at a time and verify exact final SHA. Inspect matching preview if available.

## Review focus

1. A late script replacing an earlier adapter must not silently discard it.
2. Invalid noradrenaline must leave independent oxygen and antibiotics executable.
3. Explicit route/dose must not become a silently defaulted valid medicine.
4. Ended/switching patients must preserve earned XP without stale identity credit.
5. Display pressure floors must not conceal native perfusion harm in comparative tests.

For each corrective checkpoint: reproduce RED, apply smallest fix, run targeted and related checks, record commit and evidence in `qa/ATRIA_487_ANDROID_FIX_CHECKPOINTS.md`. Final full suite/build/CI required. Physical Android remains a separate user validation.
