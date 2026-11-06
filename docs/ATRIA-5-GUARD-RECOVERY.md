# Saved guard recovery

Account `activeGuardId` is a reference, not proof of a recoverable participation.
The account gateway verifies that reference against the existing durable guard,
roster and permanent-release record before offering recovery.

`atria_v5_guard_recovery` holds the authenticated account lock. Inspection never
transfers control. Only a missing guard, an explicit release or a valid roster
excluding the doctor clears that doctor's account pointer. An unreadable
checkpoint or database failure preserves the pointer and permits retry.
No reconciliation operation writes the guard's clinical state or another account.

Saved native leave and the 24-minute decision boundary remain recoverable.
Explicit recovery transfers control and uses the native resume receipt. Permanent
finalization obtains the native leave receipt before creating the existing release
tombstone. The shared guard and colleagues remain available.

Recovery actions bind the inspected room and expected doctor. The server compares
the expected doctor with the authenticated identity before account mutations and
native clinical requests; that field never grants identity or authority. Optional
bindings preserve compatibility with earlier clients.

The existing dialog displays verification, pending operations and retryable errors.
Both headers and response bodies have deadlines. Duplicate taps are disabled;
cancelled or late responses cannot replace a newer offer. An expired advisory
social room cannot prevent recovery of a verified durable guard.

## Verification, 2026-11-06

| Check | Executed result |
| --- | --- |
| Complete `npm run test:v5` after review fixes | 2,930 passed; 0 failed |
| Focused recovery, identity, HTTP, client and dialog tests | 57 passed |
| Installed PostgreSQL recovery function, rollback-only QA fixtures | 34 assertions passed |
| `guard-recovery-browser.mjs` | Solo, cooperative and competitive; two accounts and a third independent device |
| `account-release-browser.mjs` | Temporary native conflict retried with one original decision ID |
| `shared-guard-auth-browser.mjs` | Shared care, lost response, unique administrations, recovery and turn continuation |
| `npm run build:v5` | Passed |
| `npm run build:v5-core` | Passed |

The new browser regression reproduces missing pointers on both accounts,
released references, visible errors in both controls, device transfer and
ephemeral social-cache loss. Clinical checkpoints remain read-only in this test;
normal actions use the real native authority with a local SQLite CAS adapter.
SQL fixtures use disposable authenticated QA accounts and roll back all changes.

Desktop and Pixel 5 Android emulation were exercised in separate Chromium
processes with independent authentication/storage. No physical Android device was
available. The turn-boundary regression uses an accelerated authoritative clock,
not another real-time 24-minute run.

`guard-recovery-preview.mjs` separately verifies the published build against its
source manifest, then exercises real Supabase accounts and the deployed native
authority. Its deployment-specific result is reported after publication; local
browser evidence is not represented as live-preview evidence.

XP rules, reward presentation and clinical decisions were not modified.
