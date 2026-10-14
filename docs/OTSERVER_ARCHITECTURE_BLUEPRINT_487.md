# ATRIA 4.8.7 — Architecture reference (OT Server principles, JavaScript implementation)

Status: **design / handoff only; no production changes approved**  
Source baseline: \`atria-4.8.7-multiplayer-stabilization\` @ \`95c4f5d7c3a02bfebc675be3889bcc673ac96e4a\` (verify current upstream HEAD before any merge or rebase)  
Protected: \`vendor/atria-4.8.6/**\`; original source and character/clinical data; movement engine; map/sprites.  
Primary comparison: The Forgotten Server (TFS), https://github.com/otland/forgottenserver — **GPL-2.0**. Study separation of responsibilities; do not copy source code.

## 1. Facts checked in ATRIA

- \`build.js\` copies immutable 4.8.6 artifacts and uses \`src/integration/apply-487.js\` to generate \`out/index.html\`. Every intervention must preserve the 4.8.6 source hashes.
- \`apply-487.js\` is a central generated-source composition layer (~122 kB), containing many exact string replacements. \`multiplayer-stabilization-487.js\` does further string-anchor replacements (~58 kB). This has high regression potential and is not a destination architecture.
- \`src/social/room-state.js\` is already a small, explicit room transition reducer.
- \`src/app/frame-scheduler.js\` already isolates fixed-step simulation and rendering cadence.
- \`src/clinical/clinical-clock-487.js\` validates an explicit clinical clock and authority.
- \`src/clinical/nurse-scanner-487.js\` is a pure text-to-intent scanner.
- \`src/integration/pharmacology-receipts-487.js\` already validates confirmed execution receipts and versions.
- \`src/integration/nurse-voice-487.js\` wraps \`nurseNatural\` and \`sendMessage\`, while \`nurse-execution-487.js\` handles deferred medicine completion. **A parsed study must never authorize a therapy**.
- Existing browser matrices independently exercise 2, 3, 4 clients. Treat actual execution tests as stronger evidence than parser-only unit tests.
- Existing \`src/social/qa-social-server.js\` identifies itself as a QA ephemeral transport, *not* a durable transactional production authority.

## 2. Mapping OT Server principles to ATRIA

| Inspiration (TFS) | Existing ATRIA area | Adaptation (NOT a new engine) |
|---|---|---|
| \`protocolgame.cpp\`: decode/network boundary | Social room transport, \`chat-recipient-487.js\`, voice normalization | Normalize input into typed commands; never administer drugs here |
| \`game.cpp\`: owns world rules | Existing guard host, native patient/clinical state | One authorized writer per room/patient; route into native executors |
| Scheduler / dispatcher | \`frame-scheduler.js\`, \`clinical-clock-487.js\`, existing nurse task queue | Sequential state-changing command processing and explicit timers; UI frames are not clinical truth |
| \`actions.cpp\`: validate targeted action | \`nurse-scanner-487.js\`, existing examination/study/therapy functions | Validate actor, patient, payload, preconditions, permissions; dispatch to a single established native function |
| \`chat.cpp\`: fan-out/read recipients | Existing global ward transcript + spatial proximity | A message's visibility is NOT treatment authorization |
| Script/event hooks | Existing 4.8.7 integration adapters | Incrementally replace brittle string patches with declared interfaces once tests prove equivalence |

**Caveat:** TFS typically uses a dedicated authoritative game server. ATRIA currently uses an authoritative host *within the session*, plus a room/signaling service. Do **not** interpret this document as authorization to introduce a new backend, migrate to C++, or replace the room transport.

## 3. Desired flow — one action, one authoritative effect

\`\`\`text
TEXT / TOUCH / VOICE
       |
       v
NORMALIZE -> PARSE (pure; list of typed intents, nothing executed)
       |
       v
ROUTE (participant identity and bed/patient UID)
       |
       v
VALIDATE (room, role, owner, patient, preconditions, source text)
       |
       v
SEQUENTIAL ROOM/PATIENT ACTION GATE
       |
       v
NATIVE CLINICAL EXECUTOR (study OR nurse action OR medication)
       |
       v
CONFIRMED EFFECT + EVENT/RECEIPT + ROOM REVISION
       |
       +----> local UI and original patient's medical record
       +----> authorized peer state projection
       +----> spatial global-chat/NPC response, if relevant
\`\`\`

Proposed *interface contract*, **not an instruction to instantiate another parallel runtime**:

\`\`\`js
// Example shape for a validated command at the existing dispatch boundary:
{
  eventId: "globally-unique-within-room",
  roomId: "existing-room",
  actorId: "authenticated-room-member",
  patientUid: "existing-patient",
  kind: "study.request",              // never "therapy" if study was parsed
  payload: { studyId: "native-id" },
  observedRevision: 123,
  sourceText: "Enfermera hemograma"
}
// Derived acknowledgement must record accepted/rejected/executed,
// native executor receipt, patientUid, eventId, current room revision.
\`\`\`

The transport must supply/validate authenticated identity. Never trust an \`actorId\` self-declared by arbitrary unverified packets.

## 4. Ownership invariants (release blockers)

1. Exactly one owner of actual clinical mutation for a given patient at a time, consistent with cooperative/competitive rules; spectators cannot administer treatments.
2. A \`study.request\` **cannot** call \`addMonitorTherapy\`, \`giveMedication\`, or replay a queued IV medicine.
3. Medication requires an explicit, matching, patient-scoped source command and native administration confirmation. Pending medications keep the original command/event ID and must not be unlocked by an unrelated study.
4. For one \`eventId\`, retries may duplicate transport but NEVER duplicate a native effect. Duplicate requests get a stable previously recorded result.
5. The host publishes patient UID, bed, case, status and monotonically increasing revision; stale snapshots cannot revive a closed case. On reconnection, replicas reconcile to the host state.
6. Chat has one ward transcript; visibility determined by spatial range. Patient voice recipient is its real occupied bed; Enfermera/Vega require an explicit mention. Social interactions never become medical commands.
7. Simulation clock drives clinical deadlines; display/render cadence, Android app suspension, and network reconnect must not independently spawn patients or accelerate clinical processes.
8. Any rejected/unapplied medical order must be visible as **not executed**, with an actionable reason; never invent a success confirmation.
9. Original 4.8.6 hashes and currently validated visible behavior remain constant until a deliberately scoped and tested change says otherwise.

## 5. What to preserve as good patterns

- Pure \`roomReducer\` and \`csNurseScan487\` for explicit state transitions and parsing.
- \`FrameScheduler\` / clinical clock for time ownership.
- Existing native \`orderStudy\`, nurse task completion, medicine executor, and patient state for real effects.
- Existing receipt schema validations and native browser harness for end-to-end proof.
- \`apply487\` is a **migration boundary**, not a new feature-development API; no mass rewrite of \`vendor\` or dozens of patch strings.

## 6. Incremental removal of legacy wrappers (strangler pattern)

For one **specific** feature at a time:
1. Capture characterization tests for old path (normal + negative + concurrent/reconnect).
2. Identify one stable call seam in generated JS. Name the sole intended owner; document side effects.
3. Introduce a small pure adapter or explicit interface *without a second executor*.
4. Route just this feature through the one established native executor.
5. Compare the confirmed outcomes, including negative tests. If identical/strictly safer, retire **only its redundant wrapper**.
6. Stop at a green CI checkpoint; do not migrate next feature in the same commit.

## 7. Recommended sequence and stop conditions

- P0 safety: nurse/study/medicine provenance and deferred orders, including hemogram -> NEVER albumin; unrequested medicine = red test.
- P1 global chat: one input router, one transcript, no lost events; 2–4 clients.
- P1 room state: host ownership, snapshots, revisions, delayed/out-of-order events; 2–4 clients.
- P2 visual taps: monitor vs patient hit testing, NPC mentions, human friend action.
- P3 reduce source-anchor mutations only after all above have strict characterization coverage.

Read TFS for **component boundaries**, not direct replacement code:
- https://github.com/otland/forgottenserver/blob/master/src/protocolgame.cpp
- https://github.com/otland/forgottenserver/blob/master/src/game.cpp
- https://github.com/otland/forgottenserver/blob/master/src/scheduler.cpp
- https://github.com/otland/forgottenserver/blob/master/src/chat.cpp
- https://github.com/otland/forgottenserver/blob/master/src/actions.cpp
- Michael Fowler, incremental migration: https://martinfowler.com/bliki/StranglerFigApplication.html

**Licensing:** TFS is GPL-2.0. Copy neither code, assets, nor substantial expressions without a separate licensing review. Architectural patterns may be discussed without copying implementation.
