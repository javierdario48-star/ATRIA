# PRE-SLEEP FORENSIC REPORT — ATRIA

## Decision

`PRE_SLEEP_LAST_KNOWN_GOOD = dpl_gfjiTapwJ1tY6dY8PrgAqHSByqQP`

Vercel candidate URL at creation:
`night-shift-clinical-kfnfu2kkw-javierdario4878-7324.vercel.app`

The deployment was READY and created at 2026-10-07T05:32:51.402Z (02:32:51 ART).

The user-supplied approximate sleep anchor was later in the same night. No newer ATRIA deployment was found between this candidate and the later production 4.8.6 redeploy at 2026-10-07T09:13:31.882Z (06:13:31 ART).

## Lineage

### Public 4.8.5 immediately before the candidate

Deployment:
`dpl_3MRzQ4DmWSAnJW4pYPLwreFicsFQ`

Created:
2026-10-07T05:27:29.143Z (02:27:29 ART)

Its checkpoint identifies it as:
`ATRIA checkpoint 4.8.5 combined candidate`

The checkpoint states that it already included the clinical voice/anamnesis changes and the never-reject study invariant work.

### Pre-sleep candidate

Deployment:
`dpl_gfjiTapwJ1tY6dY8PrgAqHSByqQP`

Its own source checkpoint states:

- `ATRIA checkpoint 4.8.6 candidate`
- Base: public 4.8.5
- Scope: social voice first-use only
- Preserve existing WebRTC/PTT transport
- Prime microphone permission on first pointerdown
- Keep microphone state present after chat remounts

Therefore this candidate is a narrow forward change from the functional 4.8.5 base, not the later broad 4.8.7 integration.

### Later production 4.8.6

Deployment:
`dpl_97vfUWrGi6NGx2ub4AqxtNfvSryd`

Created:
2026-10-07T09:13:31.882Z (06:13:31 ART)

The pre-sleep candidate and this later production deployment expose the exact same Vercel source file UIDs for build.js, checkpoint, APIs, package.json and vercel.json. This demonstrates same source snapshot.

Direct byte-for-byte comparison of the old protected pre-sleep rendered deployment is unavailable because Vercel returns 403 for protected rendered content.

## Relation to vendor/atria-4.8.6

The QA repository later captured production 4.8.6 byte-faithfully under `vendor/atria-4.8.6`.

Manifest SHA-256 for `index.html`:
`b552a5314586e886f46e1278166ef1d6d6aa40d6eaa3a77518674d7337f1754c`

The recovery audit verified every manifest hash and an offline rebuild.

Because the later production 4.8.6 used the same source snapshot as the pre-sleep candidate, `vendor/atria-4.8.6` is the best reproducible representation of PRE_SLEEP_LAST_KNOWN_GOOD.

Claim strength:
- Same source snapshot: PROVEN.
- Later production capture byte-faithful: PROVEN.
- Old protected pre-sleep rendered bytes equal later production bytes: HIGHLY LIKELY but not directly provable with current Vercel access.

## Protected known-good runtime behavior verified from the artifact

Verified in Chromium against the artifact itself, not source mocks:

- Boot reaches the character setup and then lobby.
- Splash exits after profile creation.
- `nsLobbyMode` mounts.
- Player object exists and is positioned.
- HUD is present.
- Lobby chat sends and clears its input.
- Personas opens without freezing.
- Local/offline social failure is graceful and does not block the lobby.
- Hacer guardia opens mode configuration.
- Solitario starts a continuous guard.
- Active case and shift state are created.
- Natural patient routing recognizes a direct history question when in hearing range.
- Patient anamnesis response is produced.
- No JavaScript exception was observed during boot/lobby smoke; headless Chromium reports only autoplay AudioContext warnings.

## Pre-sleep defects proven from baseline source/runtime

### Studies — EXISTED PRE-SLEEP

Baseline `findStudy` searches only `C.studies`.

Baseline direct/lab turnaround uses `delay * 1000`, i.e. legacy seconds rather than the required game-hour scale.

Therefore universal cross-case/arbitrary study ordering and 1 real minute = 1 game hour were not complete.

### Remote multiplayer motion — EXISTED PRE-SLEEP

Baseline state sync timer sends every 220 ms.

Baseline rendering uses the most recent remote x/y directly without interpolation.

Baseline peer send had no `bufferedAmount` backpressure guard.

These are real contributors to visible teleporting/jitter and network pressure.

### Voice — EXISTED PRE-SLEEP / POST-DEPLOY VALIDATION REQUIRED

Baseline contains WebRTC/PTT and microphone acquisition.

It also contains the guard message:
`Conectá un compañero desde Perfil → Co-op.`

Lobby voice UI exists, but real microphone permission, WebRTC transport, audio playback and reconnect behavior require HTTPS/two-device testing.

### Guard scheduling/performance — UNRESOLVED, DO NOT PATCH BLINDLY

A headless timing probe showed `nsPractice.start()` itself returning in ~20 ms. Chromium headless then exhibited scheduler gaps near 1 s after the active guard loop begins. This environment throttles timers/rAF and is insufficient to attribute those gaps exclusively to ATRIA.

Do not change the core frame loop solely from this result.

## Regressions introduced after the pre-sleep checkpoint

The following were not reproduced on the recovered baseline and are therefore treated as post-sleep regressions rather than baseline defects:

- map-only lobby / missing HUD boot;
- lobby unable to mount;
- Personas freezing the whole game;
- broken `window.nsLobby.enter` from generated syntax;
- watchdog/retry compensation for lobby boot.

## Recovery branch

Branch:
`atria-pre-sleep-recovery`

Base commit:
`d28a21709d63372537e0990fd39300272c4ca94c`

This point contains the immutable 4.8.6 vendor capture and historical contracts but predates the first 4.8.7 source integration transform.

The original `atria-4.8.7-qa` branch and production remain untouched.
