# ATRIA — Architecture Baseline

## Goal
Turn ATRIA into a reproducible application. Production 4.8.6 remains the rollback reference until QA passes.

## Non-negotiable contracts
- Boot must either reach a complete lobby (player + HUD + chat + entities) or show a visible fatal error. Never map-only.
- Clinical engine is independent from social/WebRTC/voice.
- One lifecycle owner per mode: boot -> lobby -> guard -> lobby. Every mode disposes timers, listeners, RAF/audio/network it owns.
- Simulation clock remains deterministic. 1 real minute = 1 in-game hour for study turnaround.
- Every study is orderable for every patient. Case-specific/native result wins; normal/negative fallback only when no native result exists. Pending/result state persists.
- Solo/Vega must remain fully functional with social/network disabled.
- Multiplayer is layered on top of the stable clinical engine.
- Production is promoted only after automated smoke checks plus two-client manual QA.

## Target source layout
src/
  app/          boot, lifecycle, mode transitions, fatal boundary
  engine/       fixed-step clock, movement, physiology, cases
  clinical/     anamnesis, exam, studies, treatment, Vega
  render/       canvas, camera, sprites, adaptive presentation
  ui/           HUD, chat, sheets, monitor
  social/       lobby presence, friends, rooms, WebRTC, voice
  diagnostics/  FPS, long-frame, timer/listener/RAF counters

## Performance budgets
- Simulation: fixed 60 Hz, no DOM writes.
- Rendering: adaptive; mobile target 30–60 FPS according to frame budget.
- HUD/monitor DOM: event-driven or throttled; never per simulation step.
- Network presence/state: independent cadence with backpressure.
- No duplicated RAF, interval, timeout loop, audio graph or peer connection after mode transition.

## Migration rule
No runtime string patching against production HTML. The repository becomes the canonical build input.
