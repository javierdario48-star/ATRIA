# NPC conversation certification — 2026-10-29

Authorized branch: `atria-5.0-core-rebuild-experimental`; initial HEAD `8458ec1785e63aedf3679ab299b060241f2cc72a`.

1. Reuse the clinical certification content and playbooks to interview all 55 cases through `createGuardSession.post`, the speech router and the native clinical executor. Record 20 profiles × 15 case-derived questions, including repeats and clarification. Compare clinical state before/after and compare conversations with identical facts.
2. Reproduce the lost behavior-profile integration and substantive similarity failures before changing production. Keep stable personality, actor relationships and physiology separate; compose bounded, medically equivalent language and case-authored spontaneous information. Preserve sensitive drug/allergy history literally.
3. Exercise serialized checkpoint recovery, two doctors, all modes, neurological impairment, respiratory distress and adversarial questions. Keep physiological owners and closure unchanged.
4. Expand the stable campaign to at least 10,000 actual complete interviews. Save reproducible metrics, a corpus digest and ten full comparative transcripts. Add a CI job that runs these exact files and uploads the corpus.
5. Publish small commits only on the authorized branch, check CI job steps/logs and remote HEAD. Report actual counts, limitations and links to evidence.

Verification: focused regressions at each step, the full V5 suite after production changes, independent clinical-state invariants in each interview, and final CI. Existing 10,000 wrapper-only simulations are not repeated or counted as complete interviews.

Review focus: old checkpoints lacking behavior; shared patient versus per-doctor relationship; negation/numbers/drug names through realization; indirect history versus patient speech; same-fact comparisons excluding greetings and punctuation.
