// C12.b — acute respiratory toxicity from CONFIRMED crystalloid exposure.
// Calibrated against effective V4.8.7 CI trajectories (eight genuine 500 ml
// administrations, APP/CIRR; qa/v5/characterize-rapid-harm.mjs), not the B1
// experimental shadow. Not a general volume/circulatory physiology engine.
import {summarizeIVExposures} from './medication-exposure.js';

const BASE_THRESHOLD_ML=2800;
const RR_PER_LITER=4.4;
const SPO2_PER_LITER=-3.6;

/** Additive targets, never direct writes. Actual vitals retain their SINGLE
 * native case owner and smoothing; a request or pending IV cannot hurt anyone.
 * Profiles may alter individual susceptibility but not define new drug effects.
 */
export function crystalloidOverloadOffsets(patient,caseDef){
 const threshold=caseDef?.physiology?.fluidOverloadThresholdMl??BASE_THRESHOLD_ML;
 if(!Number.isFinite(threshold)||threshold<500||threshold>20000)
  throw Error('invalid case-specific overload threshold');
 // Keep standalone native baseline characterization viable: these older tests
 // intentionally lack patient UID and have no confirmed administration ledger.
 if(!patient?.administrationLog?.some(x=>x.id==='fluid'))
  return {rr:0,spo2:0};
 const totalMl=summarizeIVExposures(patient).confirmedCrystalloidMl;
 const excessLiters=Math.max(0,totalMl-threshold)/1000;
 return {rr:RR_PER_LITER*excessLiters,spo2:SPO2_PER_LITER*excessLiters};
}
