# Guard recovery Implementation Plan

> **For agentic workers:** Execute this plan in the existing authorized checkout using superpowers:executing-plans. Do not create another branch or redo the previous mission.

**Goal:** Reconcile stale guard references and make both recovery controls complete or report a visible, retryable failure.

**Architecture:** Account recovery inspects the existing PostgreSQL guard, membership and release records under the account lock. Native guard authority continues to own resume/leave and all clinical state. The existing dialog gets a bounded asynchronous recovery controller with explicit loading/error states.

**Tech Stack:** Existing ESM, Node tests, Playwright/Pixel 5, Supabase/PostgreSQL and durable guard authority.

**Spec:** User's urgent guard recovery mission, 2026-11-06: existing and stale activeGuardId; solo/coop/competitive; other devices; no patient/history/XP deletion; visible failures; publish only the authorized branch.

## Global Constraints

- Only `atria-5.0-core-rebuild-experimental`, starting at current remote HEAD `bdc95d9544bc9513019246471b6c08db9eb038bf`.
- Do not change XP rules, rewards UI, the clinical engine or valid guard contents during reconciliation.
- A saved physician who temporarily left a turn can return. A 24-minute decision boundary is recoverable, not a missing guard.
- Do not transfer control while merely inspecting recovery. Never release another physician.
- Use existing persistence, account session verification and native resume/leave receipts.

## Review Focus

- A guard disappears or the account changes guards between showing the dialog and clicking: bind operations to the inspected room.
- A transient network/database failure must retain the pointer and permit retry, not classify the guard as missing.
- Both response headers and response bodies can stall: enforce a bounded request and display an error inside the modal.
- A paused/end-of-turn guard with pending patients must survive inspection and recover unchanged.
- Concurrent/new-device requests must not release or take control of a newly selected guard or another physician.

### Task 1: Authoritative recovery reconciliation

**Files:** account gateway/store, one additive SQL migration, account fixture, gateway/store tests and transactional SQL regression.

**Interfaces:** Existing account/session projects the reconciled account and recovery metadata. Existing take-control/release-guard gain optional expected room binding. The RPC reads existing guard/release tables; no new persistence.

- [x] Add and run a failing regression: authenticated stale pointer survives `account/session` incorrectly.
- [x] Cover missing, released, nonmember, valid, paused, end-of-turn, two-device and changing-room cases; preserve all clinical records and XP.
- [x] Implement a private, session-verified RPC with account locking, reconciliation and expected-room validation; use existing control/release functions.
- [x] Run gateway/store and transactional SQL tests; apply the reviewed migration and verify installed behavior.
- [x] Commit the server checkpoint.

### Task 2: Visible, bounded recovery controls

**Files:** existing account client/application, a small recovery dialog controller and its tests.

**Interfaces:** The controller consumes verified account restoration and existing recovery/resume/leave operations; it renders checking, available, resuming, releasing and error states in the current modal.

- [x] Write failing tests for stalled account requests and modal operations with a valid/stale guard.
- [x] Add bounded account calls, room-bound actions and visible loading/retry errors, ignoring obsolete UI responses.
- [x] Propagate recovery failure instead of swallowing it; maintain the existing clinical client until native resume/leave confirms.
- [x] Verify delayed responses, duplicate taps, closure while loading, reconnect, changed accounts/devices and preserved room identity.
- [ ] Commit the UI checkpoint.

### Task 3: Gameplay regression and publication

**Files:** authenticated browser QA and the existing CI job.

- [ ] Reproduce existing and stale references with authenticated accounts and an Android viewport before relying on the fix.
- [ ] Verify solo, coop and competitive recovery, permanent release, temporary saved leave, turn boundaries, native pending work and colleague continuity.
- [ ] Run the V5 suite and relevant existing authenticated recovery/authority journeys, then build.
- [ ] Publish only the authorized branch, verify remote HEAD and deployed source, and report actual test results and physical Android limitations.
