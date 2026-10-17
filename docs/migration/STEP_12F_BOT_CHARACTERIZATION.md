# ATRIA 5.0 — Clinical bot characterization C12.f0

Branch: atria-5.0-core-rebuild-experimental
Functional code: a26a02eb66b758aaeea17a41b038bff4908e284e
CI: https://github.com/javierdario48-star/ATRIA/actions/runs/39005190191

## Implemented
Six independent session-level bots in qa/v5/clinical-trajectory-bots.mjs: competent, untreated and adverse-care strategies for APP-001 and CIRR-001. Automated V5 integration checks both correct closings and harmful physiological trajectories.
The speech router now accepts nurse requests for clinical referral, admission, observation and discharge. It delegates permission to the same native closure evaluator; an accepted surgical consultation is required for the APP referral. No new patients, cases, vital writers or multiplayer modes.

## Observed outcomes
Competent APP: operating-room handoff; 133 XP; alive. Competent CIRR: ward admission; 133 XP; alive. Premature or incompatible destinations were rejected. Neither route performs surgery in the ED.
Untreated APP: all vital measurements remained at their admission baselines over 24 real minutes. Untreated stable CIRR: likewise unchanged.
Adverse-care APP: respiratory rate 20 to 42 and SpO2 98 to 72.08 percent, without fatal transition. Adverse-care CIRR: respiratory rate 20 to 42 and SpO2 96 to 72 percent, likewise without fatal transition. These simulated states come from individually confirmed IV events, not unexecuted orders.

## Four unresolved clinical parity findings
1. APP has no untreated-disease progression.
2. APP has no implemented fatal-state transition despite sustained critical respiratory measurements.
3. CIRR has no implemented fatal-state transition after severe simulated adverse treatment effects.
4. Current native clock produces 172.8 simulated minutes for 24 real minutes, not the intended 1440 simulated minutes.

The passing V5 characterization test must NOT be described as a passing medical parity gate. To run the strict gate use: node qa/v5/clinical-trajectory-bots.mjs --require-parity. It intentionally returns a nonzero status while the listed defects remain.

## Next checkpoint C12.f1
Characterize effective 4.8.7 deterioration, fatal exposure and rescue timing. Implement case-dependent natural disease progression and a single native fatal-state owner with bounded grace and evidence-based rescue. Align timing only after studying medication and investigation deadlines. Verify with treated, untreated, adverse and rescued bots. Preserve 4.8.7, golden master, and all regression tests. Keep APP and CIRR as the only native cases.
