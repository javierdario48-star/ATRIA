# Remote motion 4.8.7

## Checkpoint A: reproduction before product changes

Reference HEAD: `2f13db3ce1c47f58618c0955ca6e3c900f7f9aab`.
The complete pre-existing `npm test` suite passed locally.

`qa/remote-motion-browser-487.mjs` opens two independent Chromium processes,
with separate storage, identities, and controllers, loading the full generated
game. It serves the existing `createQaSocialServer` handlers over HTTP with a
filesystem KV adapter, and uses the game's real signaling and room transports.
It never injects remote coordinates or shares client state in memory.

Both A -> B and B -> A reproduced uneven remote motion in lobby and guard.
The local Chromium build completed SDP signaling but did not connect ICE;
this local baseline therefore measures the real HTTP fallback. The CI browser
job requires genuinely open RTC data channels before the lobby measurements.
The guard's existing social room transport is HTTP, not RTC.

The baseline in `qa/remote-motion-baseline.json` records local-vs-remote time
alignment, displayed velocity, direction, foot phase, packet intervals and
frame jumps. Raw frame/packet traces and screenshots are generated as CI
artifacts, not substituted with unit-test coordinates.

Observed causes:

* Lobby HTTP `statePayload()` and RTC `localState()` generate independent
  `seq` counters, while the same server presence record compares them as a
  single stream. Real requests return `stale:true` despite fresh positions.
* The lobby extrapolates targets, then predicts them again in its surviving
  render tick, then exponentially chases them. Direction changes take effect
  before the displayed actor reaches the turn. State-source changes reset the
  receive counter rather than preserving the pose timeline.
* Guard rendering restarts smoothstep from the displayed position on every
  new target, causing repeated artificial acceleration. Foot phase is already
  distance based; erratic position causes erratic footsteps. Direction is
  chosen from the newest packet while position is still chasing older motion.

## Bounded implementation design

Reuse one bounded time sampler in `src/social/remote-motion.js` for both
scenes, retain their transport adapters and original rendering owners, and
use the unchanged `drawSprite` and distance-per-stride rule. Share lobby
packet identity/sequence/time across HTTP and RTC. Order snapshots before
sampling; derive displayed direction and foot phase from displayed movement.
No clinical logic, local speed, controls, sprites or frozen source are changed.

## Focused reference review

Read the actual `updateWalk`, `updateWalkAnimation`, `updateWalkOffset` and
`terminateWalk` functions in:

* https://github.com/edubart/otclient/blob/master/src/client/creature.cpp
* https://github.com/OTCv8/otcv8-dev/blob/master/src/client/creature.cpp

Useful principles: a step has one elapsed-time progression; displacement,
direction and animation describe that progression; idle resets animation;
rendered progress is independent of the arrival of another network packet.
ATRIA retains continuous coordinates. No OT code, grid movement, or OTServer
engine is imported.

Physical Android validation remains mandatory before definitive acceptance.
