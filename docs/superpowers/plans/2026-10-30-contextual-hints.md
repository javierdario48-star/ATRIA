# Contextual hints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Execute inline under the user's explicit autonomous implementation authorization.

**Goal:** One executable clinical hint for the selected encounter, with persistent individual XP reduction.
**Architecture:** Read existing closure/evidence owners; select one typed requirement; translate through shared controls and validated commands. Persist offers and display receipts inside the existing guard CAS.
**Tech Stack:** Existing JavaScript ES modules, node:test, Playwright, Vercel preview.
**Spec:** `docs/v5/contextual-clinical-hints.md` and the user's complete mission.

## Global Constraints

- Only `atria-5.0-core-rebuild-experimental`; preserve legacy source and clinical scoring.
- One action per hint; 5 percentage points per new reveal, minimum 0 XP.
- Bind room, encounter, patient and authenticated physician; no charge for discarded replies.
- Reuse clinical requirements, alternatives, actual labels, eligibility and receipts.

## Review Focus

- Switching selection while display acknowledgement is in flight.
- Two physicians requesting the same clinical action and reconnecting independently.
- Pending alternatives and receiver-owned interventions after a rejected transfer.
- Scope multipliers and integer rounding at 19, 20 and 21 hints.
- Unknown integrations fail free and visibly, rather than inventing controls.

### Task 1: Requirements and prioritized selector

Files: clinical closure evaluators, new `clinical-hint-requirements.js`, `clinical-hints.js` and tests.
Interface: `selectClinicalHint({patient,caseData,requirements,content,clock})` returns one read-only executable descriptor or a free wait/error.
- [ ] Write failing selector tests; verify RED.
- [ ] Expose pending requirements from the existing gates; translate legacy snapshots through their original evaluators.
- [ ] Implement priority, alternatives, eligibility/dependencies and in-progress recognition; verify GREEN; commit.

### Task 2: Executable control registry

Files: new shared control/action registry, patient actions, destination labels and controller.
Interface: descriptors include action ID, section, visible label and a router-valid command where applicable.
- [ ] Write failing label/router coverage tests.
- [ ] Share existing labels and validate every suggested command; test all 55 cases; commit.

### Task 3: Persistent individual reveal receipts and XP

Files: new hint ledger, guard session/runtime, progression and durable authority/transport.
Interface: `hint(request,actor)` prepares/revalidates/acknowledges a room+encounter+patient-bound offer; `hintHistory(actor)` never reads another actor's receipt.
- [ ] Write failing fee/idempotence/restart/permission tests.
- [ ] Persist offers and history in existing checkpoints; calculate individual XP after multipliers; verify GREEN; commit.

### Task 4: Context menu and private Vega presentation

Files: patient actions, application, hint presenter, web styles and browser tests.
Interface: only the selected patient's menu opens the small private Vega hint; stale operations cannot display or acknowledge.
- [ ] Write failing patient-menu and delayed-response tests.
- [ ] Wire all supported transports, invalidate on selection/lifecycle changes; verify mobile and desktop; commit.

### Task 5: Certification, publication and live verification

Files: new hint bots/census, focused CI, evidence report.
- [ ] Run new tests, representative hint-guided bots, 55-case executable census, affected regression and builds.
- [ ] Fresh whole-change review; fix material findings with regression tests.
- [ ] Push small checkpoints only to the authorized branch; verify final remote SHA, Actions and live preview.
