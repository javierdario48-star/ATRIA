# ATRIA music integration implementation plan

> **For agentic workers:** Use superpowers:executing-plans. The user explicitly authorizes autonomous implementation, tests and publication on the experimental branch; no design or checkpoint approval is pending.

**Goal:** Integrate the supplied 164.4 second composition and navigation click with persistent, independent music controls and smooth screen transitions.

**Architecture:** `hospital-audio.js` remains the sole audio owner and creates one AudioContext. A music transport owns the two music gain envelopes and one looping decoded source; the existing caller RAF advances cleanup and the unchanged classic note sequencer. Asset loading is asynchronous, cached and abortable.

**Tech stack:** Native ESM, Web Audio, node:test, existing canonical V5 builder and browser QA/deployment infrastructure.

**Spec:** User mission in this session: new music in title/avatar/lobby, classic in all guard modes, selectable tracks, 2.5 second crossfades, 250 ms mute fades, single-source continuity, preserved effects and compatible audio.v1 migration.

## Global constraints

- Only `atria-5.0-core-rebuild-experimental`; initial HEAD `621a336d972c5576ef019c7fc4ae3c17759d16f1`.
- No clinical, NPC, multiplayer authority, scoring or legacy source edits; no repeated approved clinical simulations.
- Keep global enabled/volume, channel switches and classic guardia/enfoque preferences.
- Preserve composition, speed, instrumentation, click pitch and timbre; apply only a short seam envelope if needed.
- Publish small verified commits, never production; check remote HEAD before publishing.

## Review focus

- A load finishing after rapid navigation, mute or destruction must not start stale playback.
- A reversed crossfade must begin at the current gain, with complementary levels and bounded sources.
- First pointer/keyboard interaction must unlock even outside buttons; no duplicate click from change events.
- Hidden-tab and bfcache recovery must preserve position without silent synthesis loops.
- Existing saved mute, volume, disabled effects and focus melody must survive migration.

### Task 1: Music transport and assets

**Files:** `src/v5/ui/music-transport.js`, `music-transport.test.js`, `audio-assets.js`, `audio-assets.test.js`, `src/v5/content/audio/*`.
**Interfaces:** Transport consumes an existing context, music destination and cached buffer loader; produces `select`, `setLevel`, `tick`, `pause`, `resume`, `destroy`, `state`, `classicAudible` and track outputs.

- [ ] Write behavioral tests for default track, actual overlapping ramps, interrupted transition, same-track continuity, async loading, pause offsets, mute/unmute, cleanup and load failure; run RED.
- [ ] Implement cached decoding, click-preserving asset preparation, complementary gain ramps and one loop source; run GREEN.
- [ ] Verify audio duration, format, frame boundaries, asset hashes and no added silence.

### Task 2: Existing owner and interface integration

**Files:** `hospital-audio.js`, its tests, `ui-sound-policy.js` and tests, `audio-settings.js`, `application.js`, `web/index.html`, `web/game.css`.
**Interfaces:** Preserve existing owner API; add `setMusicTrack(screen, track)`, `setMusicVolume`, `setEffectsVolume`; retain `setChannel('music', enabled)` as music-only mute.

- [ ] Write failing tests for preference migration, title unlock, all guard modes, UI click isolation/rate limit and independent clinical channels.
- [ ] Route music and effects through separate gains; wire first gesture, existing settings and permanent music control. Run audio/UI/app regression tests and architecture boundary check.
- [ ] Commit tested implementation and assets as small checkpoints.

### Task 3: Browser verification and preview

**Files:** `qa/v5/audio-browser.mjs`, audio verification evidence/documentation and CI audio checks if needed.

- [ ] Verify desktop/mobile title/avatar/lobby, autoplay unlock, track switches, fades, rapid navigation, reload, clinical effects and teardown using the existing browser infrastructure where available.
- [ ] Build canonical V5, verify included assets, review the full diff and fix observed failures with regression tests.
- [ ] Publish only authorized branch, verify remote commits, inspect Actions, locate exact HEAD preview and verify deployed asset hashes.

## Execution record

- Baseline: existing hospital audio/UI policy tests 8/8 passing; branch clean, latest NPC and case integration commits preserved.
- Ruling: execute directly from the supplied complete mission, without an approval round, as explicitly requested.
