# ATRIA 4.8.7 — 13 clinical care pathways, medicines, vitals and discharge gates

## What the bot actually does

Run \`npm run qa:care-journeys\` on \`atria-4.8.7-care-journeys-qa\`.
There are 26 care paths, one standard and one clinically reviewed alternative
for each of the 13 present cases.

- Medications run through the real nursing and bedside monitor interfaces.
- Native timers execute; administration is verified in therapyExposure.
- Real native physiologic signs are compared with matched untreated controls.
- The VM receives **fixture workup evidence** (diagnosis, histories, physical
  examinations and completed study statuses). This is not a validated UI
  examination, consultation or laboratory turnaround.
- No source control, surgery, drainage, revascularization or ERCP is
  fabricated by entering a drug order.
- The game-native \`csSetDisposition\` is called and independently compared
  against V19 RECOMMENDED_DEST, but **choosing a destination is not closure**.
- The harness intentionally throws on native \`finishCase\` and omits
  \`csRequestConsult\`. Do not change this fixture's result to
  \`caseEnded=true\` or manufacture specialist acceptance to make a test green.

## Clinical routes / expected destinations

| Case | Core care | Clinical destination | Not equivalent to |
|---|---|---|---|
| CIRR-001 | Ascites management, diuretic if stable, paracentesis when needed | Sala | Automatically safe outpatient discharge |
| PANC-001 | Ringer, analgesia, antiemetic; bowel rest as appropriate | UTI for current severe seed | "Antibiotics cure sterile pancreatitis" |
| CROHN-001 | Anti-inflammatory treatment; azathioprine is maintenance | Sala | Azathioprine rapid induction |
| HDA-001 | Access, resuscitation, PPI, indicated transfusion | Procedimiento/EDA | Blood products stop bleeding without hemostasis |
| COLON-001 | Diagnostic staging and appropriate specialist follow-up | Alta only if truly stable | Completed oncologic surgery |
| PERI-PBE-001 | Appropriate antimicrobial + albumin when indicated | Sala | Surgery |
| PERI-SEC-001 | Resuscitation + appropriate antibiotics + accepted surgical handoff | Quirófano | Surgery already performed |
| PERI-TER-001 | Reassessment, antifungal only if appropriate, broad-spectrum therapy, critical handoff | UTI | Automatically resolved source |
| APP-001 | Antibiotics and evaluated surgery | Quirófano | Bedside procedure from medication search |
| CHOLE-001 | Fluids, antibiotics, fasting and surgical evaluation | Quirófano | Cholecystectomy completed |
| ILEO-001 | Rehydration, decompression, antiemetic and monitored reassessment | Sala | Endoscopic/surgical resolution if mechanical obstruction persists |
| MESI-001 | Fluid, anticoagulation when indicated, vascular evaluation | Quirófano | Heparin revascularizes bowel |
| CHOLANG-001 | Antibiotics, resuscitation, biliary drainage coordination | Procedimiento | Antibiotics remove duct obstruction |

Case-specific alternative regimens are in
\`qa/clinical-care-journeys-487.js\`. These are **test scenarios**, not universal
recommendations or prescriptions. The underlying medical evidence is in
\`qa/ATRIA_487_MEDICAL_RULES_AUDIT.md\`.

## Execution findings

Initial QA run \`38188177125\` (CI green) demonstrated 59/59 medication
administrations and 26/26 disposition selections, but **0 native finalized
closures**, because the deliberately restricted native VM throws on
\`finishCase\`. Most specialist consultations are also unavailable there.

This is an infrastructure gap in the **test harness**, not clinical evidence
that the deployed game fails closure. Three separate peritonitis-specific
source/UI bots continue to verify their surgery/ward/UTI pathway with
simulated UI interactions.

The updated QA also compares each treated trajectory to a time-matched
untreated control and checks all 13 native destination lists. Do not mistake
CI success in an *audit that reports blockers* for 26 successful closures.

## Final acceptance still required in a full-browser test

1. Actual physical examination and study orders/results, without prefilling.
2. Nursing and monitor orders and their confirmed administration history.
3. Dynamic hemodynamic response vs an untreated/wrong-treatment baseline.
4. Actual consultation request and reply; accepted transfer before death.
5. \`csSetDisposition\` with the appropriate case-specific destination.
6. Actual \`finishCase\` / caseEnded transition, visible receipt and XP
   (no manual flags), preserved on subsequent re-render.
7. Negative testing: missing antibiotics, wrong or contraindicated treatment,
   wrong destination, unresolved shock, pending imaging/consultation, mistaken
   claims of completed source control.
8. Tests in mobile browser / Android / iPhone for buttons and layouts.

For surgery/ERCP, **a real accepted and clinically appropriate handoff is
enough to end the emergency-room encounter**; the surgery or drainage itself
remains pending and must never be marked as done in the patient physiology.

Never modify production, \`main\`, the 4.8.6 golden master, Supabase, career
or the survival timer merely to change QA pass counts.
