# C3a — APP-001 native characterization and integration status

C2 is certified and preserved. The characterization harness documented below
remains **QA-only**: it runs the historical original as a frozen oracle and is
never imported into the new executable. APP-001 clinical execution was
subsequently integrated in V5, and its built-game browser journey passed CI
at code SHA `6b333822bbe9d8d512ca69e3a020c893c2b0abe4`.
Public-deployment UI certification remains a separate, unverified step.

Run: \`node qa/v5/characterize-app-native.mjs\`.

The scenario matrix executes the original effective 4.8.7 VM for APP-001,
with one confirmed IV reference access: baseline; ceftriaxone 1 g;
metronidazole 500 mg; both antibiotic drugs ordered together; Ringer 500 ml.
It verifies no administration before 500 ms and eventual real administration exactly once per ordered therapy; times are measured for each native medicine separately from administration log, not assumed to share one 550ms/1500ms preparation deadline
per actual order, and prints original snapshots, dose references and log
details in CI. **A confirmed IV in this historical harness is a controlled
input, not proof of a migrated V5 venous access procedure.**

Historical implementation gate (now passed in the built-game CI):
establish APP physiology from these snapshots; migrate nurse IV/monitor,
independently timed administrations through the existing room authority and
clinical port; verify surgical consultation and destination. This destination
is an ED handoff to surgery, **not** a completed appendectomy.

## Verified original dose and clock evidence

Frozen VM snapshots: `qa/v5/fixtures/app-native-reference.json`.
- Ceftriaxone 1 g IV: native minute 0.18 = 1.5 real seconds; one actual administration; no modeled immediate vital effect.
- Metronidazole 500 mg IV: native minute 0.18 = 1.5 real seconds; one actual administration; no modeled immediate vital effect.
- Both ordered together: independent proofs, no duplicate effect.
- Ringer 500 ml: native minute 0.096 = 0.8 real seconds; one administration; target increments sys +14, dia +7, hr -12, rr -1, smoothly interpolated at 60Hz. Native original totals fluidMl=500.
- A reference `confirmedIVCount=1` is a controlled test fixture; real V5 IV insertion and surgical-service consultation remain separate migration tasks.

The reference test now compares all five source scenarios against frozen snapshots so a changed native behavior cannot be silently redefined by a new assertion.


## C3a integrated executable — verified 2026-10-15

- **Functional source commit:** `6b333822bbe9d8d512ca69e3a020c893c2b0abe4` on the exclusive branch `atria-5.0-core-rebuild-experimental`. This is 9 commits ahead of the C2 handoff `8b27ca9eb5823c101882722d2d0f9af536aa1ac2`; the comparison has no changes in protected `vendor/` files.
- **Native implementation:** `src/v5/clinical/app-care.js`, `native-app.js`; reuse of `guard-session.js`, room authority, native clinical port, existing scanner, receipts and progress ledger. No independent clinical or pharmaceutical engine, no legacy HTML execution.
- **Clinical journey:** approach the APP-001 patient, take history/exam/vitals, request CBC and ultrasound, confirm peripheral IV/monitor, order ceftriaxone **1 g IV** and metronidazole **500 mg IV**; each settles at **1.5 real seconds** with its own one-time receipt. Ringer **500 ml** settles at **0.8 real seconds**, with the frozen native fluid changes. Obtain an accepted surgical consultation, wait for studies, reassess, document acute appendicitis and hand off to **quirofano**. The handoff never fabricates a performed appendectomy or `source_control` treatment.
- **Unit/contracts:** `src/v5/clinical/app-care.test.js` and `native-app.test.js` exercise access dependency, wrong doses/routes, dual timing and duplicates, frozen 60 Hz physiology, missing consultation, reassessment, refused premature closing, patient identity and XP exactly once.
- **Browser:** `qa/v5/app-browser.mjs` interacts with visible Chromium Pixel 5 UI (not direct clinical mutation). The test asserts three real administrations (two antibiotics and one fluid), a confirmed surgical consultation, **100/100**, **133 XP** (solo chosen-case practice), one closure receipt and XP survival after reload. APP and the existing CIRR browser journey both passed.
- **CI:** [ATRIA 5 Experimental Game run 38746855667](https://github.com/javierdario48-star/ATRIA/actions/runs/38746855667), finished **success** with three jobs: `clean-core-contract`, `independent-game-browser` and `preserved-historical-regression`. The APP browser step passed. This is evidence for the built executable in CI, not Android physical or interactive testing of the deployed URL.
- **Matching preview:** Vercel deployment `dpl_84U4YjoEA3yAJyoaDpen3eGhB1G6`, status **READY**, git SHA `6b333822bbe9d8d512ca69e3a020c893c2b0abe4`; URL: `https://night-shift-clinical-5chli2frl-javierdario4878-7324.vercel.app`. Deployment readiness/commit were inspected, but **the full APP journey was not rerun against the public URL in this handoff**. Do not say public UI was certified.
- **Known limits:** IV placement is an immediately confirmed case-specific nursing action, not a complete generalized nursing simulator. Source control is referral, not performed surgery. Physical Android, BFCache, multitab progress merge, multiplayer, Vega and voice remain outside the certified scope.

### Reproduction and next gate

From the real remote HEAD of the experimental branch, preserve any later commits; do not reset to the source SHA above. On Node 22+, run:

```sh
npm run test:v5
node qa/v5/characterize-app-native.mjs
npm run build:v5
node qa/v5/app-browser.mjs
node qa/v5/cirr-browser.mjs
npm test
```

Playwright 1.58.2 and a Chromium executable are needed for the browser scripts; see `docs/ATRIA_50_HANDOFF.md`. For direct verification of the matching preview, set
`V5_BROWSER_URL=https://night-shift-clinical-5chli2frl-javierdario4878-7324.vercel.app`
and rerun `node qa/v5/app-browser.mjs` plus `node qa/v5/cirr-browser.mjs`. Record screenshots, summary JSON, remote availability and exact commit before labeling **public C3a certified**. After that, proceed with the next migration checkpoint without weakening C1/C2 or historical contracts; never promote to production as part of this verification.
