# ATRIA 4.8.7 QA checkpoint

Last local engineering checkpoint: 2026-10-07.

## Verified by executed Node regressions
- bounded frame catch-up / maintenance separation
- 5,000-frame runtime stress and 1,000 lifecycle transitions
- network backpressure cadence
- universal study timing/native precedence contract
- deterministic 2–4 player room start
- stale room ACK rejection and active disconnect handling
- remote movement interpolation
- competitive 24 real minutes = 24 game hours
- natural greetings and medication-history routing
- patient/nurse/Vega target separation
- five-part physical exam state
- vascular access, monitor and treatment state
- patient better/worse/resolved/dead evolution
- clinical history source/certainty
- Vega uncertainty/critical-rescue policy

## Source modules present
App lifecycle/frame/boot guard; clinical dialogue/exam/treatment/history/evolution/mentor/studies; social friends/network/rooms/interpolation/competitive clock/voice; adaptive render; mobile chat.

## Golden-master boundary
Production 4.8.6 remains untouched. 4.3.2 is structural reference only. The QA build must not use runtime string replacement patches.

## External boundary
The repository does not contain the full 4.8.6 application document; current build mirrors the 4.8.6 production document at build time. Therefore the new source modules cannot honestly be declared integrated into the live application until a current 4.8.6 build artifact/source is available to the QA build. Do not substitute 4.3.2.

Next release action after Vercel build access is available: produce exactly one QA candidate from the 4.8.6 golden master, integrate the verified modules at source/build level, run the complete repository suite, then browser/mobile/two-client smoke QA. Do not promote production before those gates pass.
