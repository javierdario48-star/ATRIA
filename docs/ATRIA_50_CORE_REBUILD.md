# ATRIA 5.0 — experimental core rebuild

**Branch:** atria-5.0-core-rebuild-experimental
**Protected legacy baseline:** atria-4.8.7-structural-cleanup-qa @ be6707b9ea9c9cff66db442acc374e4aea95f6ce (16/16 GitHub Actions jobs green).
**Status:** isolated, runnable core library and automated tests. NOT a playable replacement, production deployment, or UI migration.

## Technical decision

Retain ATRIA's clinical content, artistic assets, rendering, gameplay rules, nurse scanner, room reducer, and frame scheduler as references or explicit imports. Build a canonical module-based game source, with no HTML string-anchor patching in new code.

The Forgotten Server (TFS/OTServ) supplies architectural inspiration: protocol/input boundary, authoritative game state, sequential action validation, scheduler, and chat distribution. No GPL-2.0 source or assets are copied; ATRIA remains JavaScript.

## First real vertical slice

- src/v5/core/speech-router.js: one pure text/voice command classifier, reusing the validated 4.8.7 nurse scanner.
- src/v5/core/room-authority.js: serialized, authenticated, room-scoped command executor; one transcript, one event ID, room revisions, competitive ownership and cooperative shared action.
- src/v5/adapters/native-clinical-port.js: explicit gateway to ONE native clinical executor; no second drug engine.
- src/v5/core/replica.js: read-only, monotonic versioned client state; older network updates cannot roll back room state.
- src/v5/index.js: reuse existing proven roomReducer and FrameScheduler, no monkey-patching.
- Tests: treatment/study separation, delayed/repeated network commands, wrong patient, forged actor, 2–4 participants, competitive claiming, question/negation, unconfirmed receipts and stale snapshots.

This is an executable domain slice. Its native port is injected by a test fixture until the game's existing native executor is wired through a proper module interface. **Do not claim that these tests demonstrate in-game integration.** User-facing clinical logic and screen rendering are still those of 4.8.7.

## Design invariants

1. Real native patient data is always the clinical source of truth; no state mutation from rendering, bubbles, or transcript replication.
2. Verified transport identity is supplied by an adapter. Neither actorId nor patientUid from an untrusted chat packet authorizes medicine.
3. Room commands are processed serially. Retries with the same event identity cannot trigger a second clinical effect.
4. Chat is one shared room transcript. Closest patient is the ordinary speech recipient; explicit or focused nurse/Vega conversation uses that NPC. Chat remains globally visible.
5. A study can only become study.request. Every therapy comes from an explicit recognized medicine; non-executable, ambiguous or unknown messages remain visible but cause no effects.
6. Competitive patient owners alone execute clinical mutations; cooperative users share the same native executor. A rejected action cannot claim a competitive patient.
7. Confirmations cannot be called administered unless the native executor says executed and returns a matching patient-scoped receipt.
8. Clients may render snapshots, not replay treatments; old snapshots are ignored.
9. Source-of-truth migration cannot begin by deleting the golden master or switching the production build.
10. TFS architectural concepts are reimplemented in original JavaScript, not translated/copied C++.

## Subsequent reconstruction requirements

1. Extract the current clinical case/registry data without duplicating medication or physiological policy.
2. Replace only the original native engine's global call boundary with a tested module-based adapter: nurse procedures, orderStudy, addMonitorTherapy, valid completion receipts.
3. Route actual chat/voice/tap traffic through the authoritative room endpoint; keep network signaling, movement and sprites unchanged during the handover.
4. Port the current UI, map and assets byte-identically into a modular source build. Remove old script blocks and generated-source patches ONLY once equivalent functions and real-browser tests pass.
5. Establish real browser integration checks on the new page for 2, 3 and 4 participants plus suspend/reconnect and physical Android acceptance.
6. Measure absence of duplicate listeners, timers, effects, messages and XP; protect the 13 existing case paths.
7. No promotion to the playable branch until visual and behavior acceptance is achieved.

## Run locally

Node.js 22+:
- node --test src/v5/core/room-authority.test.js src/v5/adapters/native-clinical-port.test.js
- npm run build (verifies the untouched 4.8.7 candidate build)
- node src/app/golden-master-contract.test.js

Do NOT interpret a green V5 unit suite as proof that the 5.0 replacement game is ready. Existing 4.8.7 remains the playable control group.
