# ATRIA regression contract — 4.8.7

This file is executable product policy: every migration must preserve these invariants.

## Boot / lobby
- No map-only state: player, lobby HUD, chat dock and social controls must materialize together.
- Returning profiles do not require "activate social".
- Return action is labelled "Volver al lobby".
- Lobby chat history is visible; stale last-message bubbles do not leak across mode transitions.

## Clinical core
- Vega and Solo do not depend on social, WebRTC or voice.
- One simulation owner; no duplicate RAF/timer loops after transitions.
- Catch-up is bounded; UI/mentor/network maintenance never runs once per physics catch-up step.
- Keyboard closes after send on mobile and does not cover send controls.
- Player speech appears above the player and reaches the intended NPC.
- Nurse never answers as the patient.

## Studies — hard invariant
- Every study is orderable for every patient.
- Never reject a study as unknown merely because it is irrelevant to the seed.
- Native case-specific result wins.
- Universal normal/negative fallback is used only when no native result exists.
- Results are delayed and persistent.
- Turnaround uses the game clock contract: 1 real minute = 1 in-game hour.
- Slash autocomplete exposes the full study catalog.

## Social / multiplayer
- Lobby presence is automatic.
- Friends persist online/offline.
- People cannot freeze the app.
- Coop/competitive support 2–4+ players.
- Room must have a deterministic start transition; never remain forever in "iniciando".
- Remote movement is interpolated and network backpressure cannot stall clinical simulation.
- Voice works in lobby and shared modes without owning the clinical loop.

## Promotion
Production 4.8.6 is untouched until boot + clinical + studies + two-client social + mobile gates pass.
