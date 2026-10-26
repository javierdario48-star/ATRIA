# ATRIA experimental — first four plant replacements

This is a **visual and physics prototype specification**, not yet a live runtime replacement. No clinical or navigation module is modified.

## Candidates

- PL-38 near entrance left (51×57 px, estimated pot radius 10 px)
- PL-39 near entrance right (51×57 px, estimated pot radius 10 px)
- PL-41 at entrance left (49×59 px, estimated pot radius 10 px)
- PL-42 at entrance right (49×59 px, estimated pot radius 10 px)

## Object layers

Plant has visual foliage (non-solid, occludes doctor when doctor foot is behind); pot base is a solid circle; soft shadow is separated. Doctor radius is already 10.5 px in existing navigation; do not introduce new navigation engine.

## Important limitation

The original map stores plants baked into hospital.webp. Overlaying a new transparent sprite does **not** erase the old plant, so this is a side-by-side fit trial only. Before production replacement, reconstruct unobstructed background under each plant and verify that walls and light are preserved. Preview artifact is delivered separately in the conversation as a self-contained HTML containing the generated experimental sprite. Binary asset not added to repo in this checkpoint.

## Gates

Preserve original V5; compare positions at native scale; check back/front depth and collision on desktop/mobile; no live replacement or collision activation until preview accepted and source cleaned.
