# Pharmacology infrastructure implementation plan

> **For agentic workers:** execute incrementally with `superpowers:executing-plans` and tests before implementation. The user's explicit implementation authorization governs this plan; no additional design approval is required.

**Goal:** allow a new molecule/formulation to reuse one or more registered mechanisms without editing the physiological integrator or adding drug–disease rules.
**Architecture:** immutable mechanism registry and versioned molecule/formulation compiler; analytical B1 PK and fixed physiology grid remain unchanged. Registered pure evaluators return checked physiological patches in deterministic phases. A separate QA-only adapter verifies typed receipts against supplied confirmation records and a piecewise explicit clinical clock.
**Stack:** existing JavaScript ESM/Node assertions, no new dependencies.
**Spec:** user's infrastructure-only request; `ATRIA_487_B2_HANDOFF_READINESS.md`, stabilization checkpoint and pharmacology scaling plan.

## Constraints and decisions

- Start: `67b6a78196c09ae568b8d7208f4e4d734a5bb47b`, full GitHub CI `38104457917` SUCCESS; work only on `atria-4.8.7-grace-nursing-qa`.
- No native patient hooks/writes or changes to vendor, survival/rescue, surgery, nursing, XP, multiplayer, Supabase/auth/env, protected branches or production. Generated game HTML must remain byte-identical.
- Preserve approved B1 formulas, kinetics, integration order and observable trajectories. Do not regenerate approved snapshots or repeat scalability research; the existing mandatory bot remains a regression.
- Prefer registered mechanism evaluators over expanding the central switch. A generic ECS/mathematical solver would add maintenance without helping this bounded delivery.
- Legacy schema1 is a compatibility adapter for the original five entries; extensible schema2 separates identity, formulation/route, administration, PK and mechanism bindings. Multiple bindings share one formulation exposure; duplicate bindings are rejected.
- Mechanism modules declare version, axes read/written, compatible kinetic inputs, parameter bounds, phase order, evidence and behavioral-test references. Unknown/missing axes, cycles, unsupported bindings and incomplete kinetics fail compilation. Declared test/evidence metadata is not clinical approval.
- Evaluators receive read-only declared inputs and return patches validated against declared writes and state domains. The integrator alone applies them and records risks; modules never receive real patients.
- Existing B1 opioid response becomes three bindings (analgesia, respiratory/sedation, circulatory); the existing shared exposure/endpoint limitation is preserved, not silently calibrated away.
- Time remains explicit: one clinical minute per active real second under the guard convention; native rates0.12/0.03 are recorded piecewise. This observer clock changes neither native pacing nor typing slowdown. No wall-clock calls.
- Typed receipts require an independent supplied matching confirmation and provenance reference. The adapter proves correspondence/integrity, not physical delivery; real executor authority remains future work. Requests/pending records cannot act; confirmed stops/rate changes must match identity, patient, time, route and dose.
- Late new receipts require replay; deterministic event order and existing2048-receipt cap remain. Piecewise clock segments are bounded and require checkpoint on overflow. No invented long-session compaction.
- Heparin remains blocked. Coverage reports describe dependencies/readiness, not therapeutic indication or numerical clinical validation.

## Review focus

1. Duplicate bindings, multiple agents on the same mechanism and aliasing of one exposure must not double effects; deterministic aggregation and distinct formulations must be tested.
2. A module that returns undeclared writes, nonfinite values or invalid normalized axes must fail before producing a next state.
3. A formulation's mechanism/PK revision during active treatment must be rejected; no per-tick traversal of inactive definitions.
4. A dose-change or stop instruction without a matching independent confirmation must produce no exposure/change; contradictory receipt identities fail.
5. Native timestamps across typing-rate changes require explicit piecewise mapping; reversed/ambiguous clocks, missing authority and segment overflow must fail.

## Task1 — registry, content and B1 compatibility

Files: new `src/clinical/pharmacology-mechanisms-487.js`, `pharmacology-mechanisms-b1-487.js`, `pharmacology-content-487.js`, `pharmacology-extensibility-487.test.js`; modify only isolated `physiology-pilot-definitions-487.js`, `physiology-pilot-487.js` and package test wiring.

Interfaces: `compileMechanismRegistry487(modules, axes)`; `compilePharmacologyContent487(content, {mechanisms, axes, modelVersion})`; `createB1PharmacologyContent487(legacyDrugs)`; retain `compilePhysiologyDefinitions487`/`stepPhysiology487` signatures. `runMechanismPhase487(state, phase, activeSignals, context, registry)` applies checked patches to the copied experimental state only.

- [x] Write/run failing API and contract tests, including compound multi-binding and incomplete-module controls.
- [x] Implement immutable indexes, stable dependency/order validation and separated content compiler.
- [x] Extract the exact B1 effects into registered evaluators and replace drug-mechanism switches with active binding dispatch.
- [x] Add synthetic molecule/new formulation and synthetic mechanism tests, no user-facing additions.
- [x] Compare all approved B1 machine trajectory points/exposures/risks against the committed fixture with absolute1e-8/relative1e-10 tolerance; never rewrite the fixture.
- [x] Run targeted tests, full npm suite, build/artifact; commit/publish checkpoint and verify exact remote CI.

## Task2 — typed confirmations and clock

Files: new `src/clinical/clinical-clock-487.js`/`.test.js`; `src/integration/pharmacology-receipts-487.js`/`.test.js`; package test wiring. Keep the legacy observer/runtime unchanged.

Interfaces: `createClinicalClock487({authorityId})`, `advanceClinicalClock487(clock, {deltaRealSeconds, nativeMinutesPerRealSecond, paused})`, `nativeToClinicalTime487(clock, nativeMinute)`; `adaptConfirmedPharmacologyEvents487(events, {patientId, definitions, confirmations, clock})` returns kernel-compatible receipts and explicit ignored requests.

- [x] Write/run failing clock/receipt tests for partition determinism, piecewise typing, pauses, provenance and boundaries.
- [x] Implement pure bounded explicit-time mapping with fractional carry, authority and version validation.
- [x] Implement confirmation matching, units/actions/formulation validation, deterministic ordering, duplicate/conflicting receipts and typed administration/rate/stop conversion.
- [x] Demonstrate genuine start/titration/stop trajectory and request-without-confirmation controls; preserve patient/native input immutability.
- [ ] Run targeted/full tests/build/artifact; commit/publish and verify exact CI.

## Task3 — actual30-entry dependency coverage and closure

Files: new `qa/pharmacology-infrastructure/coverage-487.mjs`, JSON report, `qa/ATRIA_487_PHARMACOLOGY_INFRASTRUCTURE_RESULTS.md`, `src/clinical/pharmacology-infrastructure-coverage-487.test.js`; existing scaling/checkpoint docs and package QA command.

Interface: `auditPharmacologyInfrastructure487(catalogue, definitions)` emits one readiness/dependency row per actual post-V19 entry. Inventory is read from the actual current native initialization, including heparin, and all13 case IDs are preserved.

- [ ] Test exact catalogue identity/count, molecule vs generic class/procedure/stop distinctions, missing-axis reports and honest heparin blockage.
- [ ] Generate the30-entry mechanism/axis/ownership coverage report, identifying reusable components and unsolved physiology without drug–disease matrices.
- [ ] Record next safe isolated content group; safety means readiness to develop/test in shadow, not permission to activate clinically.
- [ ] Independent whole-change review; address material findings with red→green regressions, then full suite/build/artifact and protected-path/ref audit.
- [ ] Publish reversible checkpoint(s), verify exact remote HEAD/CI/artifact metadata, close documentation and deliver links/evidence/limitations. No deploy.

## Execution ledger

- Baseline: local full `npm test`, build and artifact passed on67b6a78; unchanged HTML SHA-256 `dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7`. The handoff and intervening QA-only commits were read; no B1 research reopened.
- Shared interfaces: task1 compiled formulation IDs/bindings feed task2 receipts and task3 dependency report; the original B1 facade remains for existing tests/replay. No task may install a browser writer.
- Ruling: retain QA plan/checkpoint as the execution ledger in this git-backed workspace. The user's existing authorization supplies the implementation method and publication scope; skill handoff approval prompts would repeat that authorization.

Acceptance: this delivery proves infrastructure extensibility and B1 software equivalence. It does not implement25 treatments, solve heparin or confer clinical/mobile release readiness.

- Task1 targeted:14 extensibility checks and30,351 frozen B1 numeric comparisons pass. Legacy facade requirements/physical-volume metadata and support suspension switching have explicit regressions. Receipt fingerprints are compact non-security keys; queued/active definitions additionally compare exact canonical content. Full-suite/publication verification follows.

- Task1 complete: published `8197b2ab477548216b9ce0a1c30c68583eff6d69`, CI `38107362076` SUCCESS; exact tested Git tree verified before guarded ref update.
- Task2 targeted:7 clock and11 confirmation/receipt checks pass, including cross-poll sequence ownership, changed-provenance conflicts and mixed-protocol rejection. The clinical clock maps normal/typing segments without modifying native rates.

- Task2 review: five contract defects independently reproduced and corrected with red→green tests.19 extensibility checks retain30,351 approved numeric comparisons;7 clock and12 receipt checks plus full npm suite pass. Duplicate confirmation/property ordering and active mechanism-version drift have regression coverage. Publication and exact remote CI verification follow.

- Independent final review: all five validation findings resolved; no remaining medium/critical blocker within isolated scope.19 extensibility checks/30,351 numeric comparisons independently pass. Supplied confirmations represent absolute delivered rates; a complete live infusion lifecycle/episode history is explicitly not proven.
