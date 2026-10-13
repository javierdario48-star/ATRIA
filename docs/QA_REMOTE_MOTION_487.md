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

## Checkpoint B: common timeline and ordering

The integrated guard constant-speed test first failed on the original code:
mean 204.31 px/s and speed CV 0.4242. With the common linear source-time
timeline it measures 205.06 px/s and CV 0.00125 at the same 60 FPS/13-frame
packet cadence. This test executes the actual active guard renderer.

Both scenes now share the math and rendered-distance footsteps. Lobby HTTP
and RTC share sequence numbers and a per-page motion generation. Server and
guard ordering allow a new generation and reject retired ones. Fresh RTC is
preferred; HTTP resumes with its actual cadence. No extrapolation is used.

Explicit supporting regressions cover source generations, retired packets,
outages, a suspended renderer at a collision-safe corner, transport cadence,
20/30/60/120 FPS, and two-to-four-player independent pose buffers.
After a long interruption, the renderer resumes at an actual received pose,
tagged `network-resume` in opt-in diagnostics; it does not replay a stale
backlog with seconds of hidden lag. Short catch-up is bounded to 110% of the
native speed, within the one-frame/snapshot speed budget, following the
buffered path rather than cutting a corner.

The complete `cs-v410-modes` block retains its frozen hash; the guard adapter
mounts outside that block and delegates to the original transport validators.
The native physiology reference still compares all 4,537 numeric values at
its original tolerance. No frozen reference or clinical expectation changed.

## Checkpoint C: animation and lifecycle

Displayed direction, walking/idle and foot phase use the same sampled path.
A reload explicitly resets source clock/cursor. A monotonically ordered page
start generation supplements the UUID, so a delayed older page that was never
seen cannot retire a newer one. Raw guard message size/type validation remains
in the original receive chain, including malformed JSON and null input.
A suspended renderer whose route history expired resumes at a retained actual
snapshot, tagged `render-resume`, with zero walking advance for that rebase.

The full historical regression suite passed locally. GitHub checkpoint B's
independent-browser job passed with genuinely open RTC channels in both lobby
clients and the genuine HTTP guard transport. It measured no orientation
errors and no frames sliding without steps in either direction/scene. This
is interim evidence; final same-run comparison and 2–4 clients are still due.

The artifact verifier now explicitly inverts every remote-motion replacement
before its historical recovery. Its original protected HTML SHA-256 remains
`dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7`.

## Checkpoint D: independent-client acceptance matrix

The browser workflow now opens 2, 3 and 4 isolated browser processes and checks
all ordered observer/source pairs in lobby and real cooperative guards. It
also exercises simultaneous movement, actual 20/30-FPS scheduling, delayed,
lost and reordered outgoing RTC poses, degraded HTTP room sends, an offline
HTTP interruption with observed post-recovery position, real channel closure
and HTTP fallback, a page reload, lobby return and a new competitive guard.
No generated packets, shared client memory, or injected player coordinates
are substituted for those network tests.

The two-client job builds the exact reference SHA in a separate directory,
including its original backend. It measures before/after on the same runner
and requires improvement separately for A->B and B->A. Every additional pair
must show real source and remote travel, nonempty speed samples, finite time
alignment, a measured stop, consistent direction and stride, and bounded
tracking. A supporting regression confirms that a completely frozen remote
with apparently perfect zero CV/direction errors cannot pass acceptance.

Budgets use original 100/220/260-ms transmit cadences, existing 150/260-ms
HTTP polling, observed render periods, and the test's actual 270-ms maximum
outgoing delay. Speed variability is bounded using the recorded old baseline
plus observed native, packet and FPS variability; the primary two-client
comparison requires a decrease for each direction. Raw tiny moving flags and
explicit interruption rebases are reported separately, not silently erased.
Frame times use actual RAF timestamps; draw execution time is also retained.

CI artifacts contain full local/received/rendered traces, per-pair metrics,
paired screenshots at straight movement, turns, stopping and reversal, and
videos of each independent browser. Final matrix results remain to be checked.

Matrix harness refinements: selects the same APP practice through the native
practice selector in both versions, to isolate motion from randomized case
startup; explicitly stops through the native destination controller before
settling; checks companion coverage against all observer frames. Interrupted
nonwalking relocations retain their measured jump and recovery checks, but
are not counted as walking-orientation failures. Group clients require real
RTC connections; each pair's recorded actual transport/cadence determines its
budget, including any genuine HTTP fallback while the mesh completes.

A further queue regression models actual room HTTP draining: after an outage,
one old in-flight pose precedes the newest coalesced pose in a poll. Recovery
must select a real current snapshot rather than retain the old backlog. The
new regression failed with a 387-pixel discrepancy before the correction.

The four-process HTTP/jitter run exposed another confirmed adapter defect:
source poses `(429.5123,536.8780)` -> `(400.0744,588.6500)` were valid, but a
coarse 4-pixel sweep missed a thin occupied corner. Subsequent shorter render
steps hit it and stranded the remote 21.99 pixels from the delivered stop.
The new native-map regression fails before the fix and reaches the exact
endpoint afterward. The adapter checks crossing times of the ORIGINAL nine
collision offsets and tile grid, delegates original `circleBlocked`, then
uses the existing `astar` only where the full segment is blocked. Native
collisions, map states, doors and local navigation are unchanged.

Recovery also covers old/current snapshots separated by a render frame.
Source age and source-time catch-up identify the queued stale pose; recovery
ends on a current actual snapshot, never invented extrapolation. Both queue
variants are explicit lifecycle regressions.

The exact sweep also requires a detour to include the starting tile center:
actual native movement from `(336,173.3868)` to `(368,159.3962)` uses its
original axis collision fallback, whereas skipping the start center recreates
a blocked direct leg. Both native-map cases now have failing-before/passing-
after tests; every reconstructed leg is validated against the exact sweep.

Walking velocity and raw velocity are both retained: a tagged outage relocation
is a measured jump, not a burst of footsteps. Stop-animation time measures
visual rest; final endpoint error separately prevents a stationary wrong pose
from passing. This avoids mistaking a later revisit to an old source stop point
for the time the animation first stopped.

Acceptance uses actual receipt of the CURRENT stopped source generation and
allows its measured buffer to settle, then requires <=2 pixels endpoint error
even after earlier impairment. It therefore rejects the recorded 21.99-pixel
corner freeze. All positive frame intervals, including long frames, enter FPS
and velocity statistics; they are not discarded above 100ms. Two-client videos
remain enabled; group runs use paired screenshot sequences to avoid encoding
four videos competing with the tested 20/30-FPS clients on a small CI runner.

Harness/storage limitation: production HTTP handlers run unchanged on a test
filesystem KV. Whole handler transactions are serialized because that adapter
has no atomic read/modify/write, preventing the fixture from losing party ACKs.
This does not verify concurrent transactions in the deployed cloud KV.
The original case selector retains C/sim; lobby-return tests use actual room
leave followed by an ordinary page reload with the same isolated storage.
Native back-button cleanup is outside this motion change and remains unverified.

The terminal-receipt gate has its own regression: a peer which travels normally
but remains 22 pixels short AFTER receipt of the current stopped snapshot must
fail even if the earlier interval had packet impairment. The test fails at that
specific acceptance boundary, independently of mean tracking error or CV.
