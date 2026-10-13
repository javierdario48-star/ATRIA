# ATRIA 4.8.7 clinical multiplayer implementation plan

Goal: make shared clinical play use the native solo engine with reliable chat, nursing execution, permission checks, and synchronized evidence.

Starting remote HEAD: `7ab162b50a9ab22cb2f2cf78a46f9a357bc4510d`, branch `atria-4.8.7-multiplayer-stabilization`.

The user's specification in this session supplies the execution order and authorization to publish checkpoints F–J. Work happens in a fresh dedicated clone. No additional design approval or production merge is required for these authorized fixes.

## Global constraints

- Golden master 4.8.6 and checkpoint E motion code remain byte-identical.
- Reuse native clinical, pharmacology, study, nursing, closure, and XP functions.
- Preserve the visual chat and its Android keyboard viewport behavior.
- No avatar, map, graphics, massive lobby, or movement changes.
- Exactly one physiology authority per patient; observers only receive evidence.
- Network replay cannot create an additional dose; a deliberate new order can.
- Only the competitive patient owner may mutate clinical state.

## Review focus

- A response is lost after the server accepted an order: retries retain event identity.
- A player types while another sends: draft, caret, focus, and keyboard stay intact.
- Patient switches while nursing or a reply is pending: evidence stays patient-bound.
- Several cooperative doctors act in succession: native administration logs retain attribution and accumulated effects.
- A competing peer forges an owner or requests a study outside the case's original list: authority validates identity and the universal registry.

## F — Chat

- [ ] Reproduce draft loss and reconnect/send behavior in independent full-game Chromium processes using the project's real HTTP handlers.
- [ ] Add failing assertions before modifying native anchored adapters.
- [ ] Fix delivery identity, feedback, retry/deduplication, and recipient routing in existing chat/room paths.
- [ ] Run browser and protocol checks, commit and publish F.

## G — Nursing

- [ ] Reproduce `Enfermera, pon vías, monitor, Ringer y oxígeno` and two-antibiotic orders through the real compositor.
- [ ] Assert actual access, monitor, administrations, dependencies, and receipts.
- [ ] Fix localized native parsing/execution boundaries; retain default doses and safety validation.
- [ ] Verify fresh deliberate doses vs repeated network events, commit and publish G.

## H — Cooperative

- [ ] Compare native owner state and visiting mirrors with 2–4 independent players.
- [ ] Exercise history, exam, universal studies, native treatments, diagnosis, disposition, closure and XP from different doctors.
- [ ] Fix missing relay/state fields and preserve a single evolving native simulation per patient.
- [ ] Verify attribution and single closure, commit and publish H.

## I — Competitive

- [ ] Race valid first contacts; assert one owner everywhere.
- [ ] Reject rival therapy/study/closure and forged packets at authority while allowing history/exam/monitor.
- [ ] Preserve 24-minute competition, points and native career rules, commit and publish I.

## J — Integration

- [ ] Run the complete native suite and all 13 clinical journeys, good and harmful care.
- [ ] Run clinical browser scenarios with 2, 3 and 4 isolated users, plus unchanged checkpoint E motion regression.
- [ ] Review the final change, build and verify exact golden-master recovery.
- [ ] Publish J, verify all final-SHA GitHub Actions jobs and obtain the exact-SHA ready Android preview.

## Evidence ledger

- Recovery: remote branch matches the specified checkpoint E and reference workflow is successful. Repository has no AGENTS.md. Native engine and transport examined before implementation.

- F RED→GREEN: independent 2- and 4-process full-game tests reproduce then eliminate lost lobby draft/focus, missing retry after accepted POST, and an NPC reply arriving before its compressed ownership snapshot. Team replay and recipient tests pass. Protocol/identity, frozen-source, build and exact recovery gates pass. G reproduction found an undefined cross-script permission reference; its fix belongs to G.
