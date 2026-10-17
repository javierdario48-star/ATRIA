# ATRIA 5.0 — C12.f1b: APP progression, death room synchronization and early/late rescue bots

Date 2026-10-17. Branch: atria-5.0-core-rebuild-experimental. Production/main/V4/golden master untouched.
Baseline fully green: 35adf2a8c44167fa3d9fc47ae9d24735916b5321.
Functional code checkpoint: 3fdd993f1c32418388ad443b732e40ac687d9ed8.
Code CI: https://github.com/javierdario48-star/ATRIA/actions/runs/39039358606 . Clean-core-contract passed 294/294 V5, 40/40 core, four other core tests, and standalone builds; HTTP multiplayer job also succeeded. Confirm the independent browser and historic regression jobs complete before declaring 4/4.
Preview deployment for exact code SHA (Vercel READY): https://night-shift-clinical-ocnmzi7yq-javierdario4878-7324.vercel.app

## Changes

APP disease natural history is now a pure bounded case-scoped target projection in src/v5/clinical/app-disease-progression.js, consumed by the existing SINGLE case vital writer in native-app.js. It is an explicitly new V5 educational mechanic, not a recreation of the V4 stable APP no-treatment reference. It begins only after 20 simulated native minutes, then gradually affects temperature, heart rate, pressure, respiratory rate and oxygen saturation. No direct vital writes, timers or new clinical engines. Completed, UID-bound ceftriaxone+metronidazole administrations slow FUTURE worsening (0.45 effective rate) but do not undo existing organ injury or substitute for surgery. A partially delivered antibiotic regimen, order, fake receipt or therapy from another UID gets no credit.
Independent old APP native-reference tests call advanceAppVitals without a native-minute parameter; that optional argument remains defaulted to zero, preserving the exact frozen legacy baselines. Zero offsets return actual +0 (not -0) for byte-precise tests.

Native death is published exactly once by trusted room authority through reportPatientDeath in src/v5/core/room-authority.js. The room patient becomes {closed:true,died:true,deathReason}, and emits clinical.patient-died. In src/v5/clinical/guard-session.js death stops native preparation, rejects queued clinical/study/nursing acknowledgements, disallows postmortem interventions or disposition, and gives 0 XP. Room messages include an ATRIA death report. Existing nursing journeys are not teleported: their eventual spatial arrival can only produce a rejected native action.
src/v5/app/application.js displays a one-time in-game 'Guardia finalizada' panel with return-to-lobby action and an updated HUD label. Existing map, sprites, keyboard and walking layout were not redesigned.

## Tests and limits

src/v5/clinical/app-disease-progression.test.js: long-horizon progression, stable CIRR, delivery provenance, no false early divergence from the legacy.
src/v5/clinical/native-death-room.test.js: actual native session, 20 individually verified Ringer administrations, death reflected by room authority exactly once, no postmortem medications/disposition or XP.
src/v5/clinical/clinical-rescue-paths.test.js: severe initial hypoxemia with confirmed IV fluid, active matching oxygen delivery and improved actual measurements survives; after confirmed irreversible death, later interventions do not revive the case.
Existing six clinical bots remain positive: expert APP closes OR and expert CIRR closes ward; harmful 10-L bots die from critical hypoxemia without XP; APP untreated now shows natural worsening; CIRR stable remains stable.

The strict parity gate still reports CLOCK/24h: 24 real minutes advance only 172.8 simulated native minutes (not 1440). This is not corrected here because naive clock-rate changes would alter drug kinetics, study completion and death timers. Do not mark this gate green by removing it.
Death UI is currently a simple final panel, not a separate animated patient sprite; coop/competitive UI not yet operational. Browser tests run on emulators, not a physical Android device. Medical parameters are qualitative educational game rules, not real-world clinical prognostication.

## Next

1. Verify existing CI jobs 4/4 and Android preview manually; review death-panel UI on the actual screen.
2. Harden pending physical nurse and study cancellation tests at death with spatial checkpoints. Inspect and isolate any postmortem callback.
3. Fix native clock 24h/24min with coordinated updates to pharmacodynamic timelines and tests, preserving real-time 180-480s grace and 65s rescue.
4. Continue C12/f with stress bots varying frame step, harmful treatment, resuscitation and surgery handoff. No new cases or medication families yet.
