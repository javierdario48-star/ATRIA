// Extracted and behavior-preserving from the effective V4.8.7 generated
// initialPhysiology, updatePhysiologyState and progressionOffsets FUNCTIONS.
// Scope: physiology.engine === 'peritonitis' or 'sepsis_source' ONLY.
// This is a pure state transition / target projection, not another scheduler
// or a second vital writer. Integration requires one owned native case executor.
// V4 source review: qa/v5/legacy-clinical-owner-source.mjs.
const engines=new Set(['peritonitis','sepsis_source']);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function validCase(c){
 if(!engines.has(c?.physiology?.engine))throw Error('legacy sepsis physiology requires a sepsis/peritonitis engine');
 for(const key of ['inflammation','effectiveVolume','svr','contractility','oxygenation','renalReserve']){
  if(!Number.isFinite(Number(c.physiology[key])))throw Error('incomplete legacy physiology '+key);
 }
}
export function initialLegacySepsisPhysiology487(c){
 validCase(c);
 const p=c.physiology;
 // Exact initialPhysiology() inherited from effective generated V4 (only
 // stored state; no code from legacy HTML is imported in the V5 runtime).
 return {inflammation:Number(p.inflammation??.3),
  effectiveVolume:Number(p.effectiveVolume??.85),
  svr:Number(p.svr??.9),contractility:Number(p.contractility??.95),
  oxygenation:Number(p.oxygenation??.96),renalReserve:Number(p.renalReserve??.85),
  sourceControlled:!p.sourceControlRequired,renalStress:0,
  lastNativeMinute:0};
}
export function advanceLegacySepsisPhysiology487(state,c,atNativeMinute,{
 coverageScore=0,coverageRamp=0,albuminActive=false
}={}){
 validCase(c);
 if(!state||typeof state!=='object'||!Number.isFinite(state.lastNativeMinute))throw Error('invalid legacy physiological state');
 if(!Number.isFinite(atNativeMinute)||atNativeMinute<state.lastNativeMinute)
  throw Error('nonmonotonic legacy physiology clock');
 if(![coverageScore,coverageRamp].every(x=>Number.isFinite(x)&&x>=0&&x<=1))
  throw Error('invalid verified antimicrobial coverage');
 // The original updatePhysiologyState() quietly dropped elapsed time beyond
 // 1.5 min in a single tick. Refuse this discontinuity instead of replaying
 // unknown interventions; the case-authoritative clock must supply short steps.
 const dm=atNativeMinute-state.lastNativeMinute;
 if(dm>1.5+1e-10)throw Error('legacy physiology needs bounded native clock steps');
 const p={...state,lastNativeMinute:atNativeMinute},ph=c.physiology;
 if(dm===0)return p;
 const antimicrobial=coverageScore*coverageRamp;
 const sourceFactor=ph.sourceControlRequired?(p.sourceControlled?0:1):.55;
 const growth=Number(ph.inflammationGrowth??.025)+Number(ph.sourceGrowth??.015)*sourceFactor;
 const recovery=.075*antimicrobial*(ph.sourceControlRequired?(p.sourceControlled?1:.28):1);
 p.inflammation=clamp(p.inflammation+dm*(growth*(1-.55*antimicrobial)-recovery),.12,1.35);
 const relief=antimicrobial>.8&&(p.sourceControlled||!ph.sourceControlRequired)?.35:1;
 p.effectiveVolume=clamp(p.effectiveVolume-dm*Number(ph.thirdSpaceRate??.008)*
  (.55+p.inflammation)*relief,.28,1.12);
 const renalHit=Math.max(0,.72-p.effectiveVolume)*.018+p.renalStress*.014;
 const albuminProtect=albuminActive&&ph.subtype==='pbe'?.55:1;
 p.renalReserve=clamp(p.renalReserve-dm*renalHit*albuminProtect,.10,1);
 p.renalStress=Math.max(0,p.renalStress-dm*.006);
 p.svr=clamp(p.svr-dm*.012*Math.max(0,p.inflammation-.45)+dm*.006*antimicrobial,.42,1.15);
 p.contractility=clamp(p.contractility-dm*.006*Math.max(0,p.inflammation-.75),.50,1.08);
 p.oxygenation=clamp(p.oxygenation-dm*.005*Math.max(0,p.inflammation-.65)+dm*.004*antimicrobial,.62,1.02);
 return p;
}
export function legacySepsisVitalsOffsets487(state,baseline,c){
 validCase(c);
 if(!state||!baseline)throw Error('legacy physiology requires current/baseline state');
 const dI=state.inflammation-baseline.inflammation;
 const dV=state.effectiveVolume-baseline.effectiveVolume;
 const dS=state.svr-baseline.svr,dC=state.contractility-baseline.contractility;
 const dO=state.oxygenation-baseline.oxygenation;
 const dR=state.renalReserve-baseline.renalReserve;
 return {temp:dI*1.45,hr:dI*34-dV*62-dC*12-dR*5,
  rr:dI*11-dO*8,sys:dV*82+dS*42+dC*28-dI*18,
  dia:dV*38+dS*32-dI*8,spo2:dO*23-dI*2.5};
}
/** Effective ns423 recovery correction, AFTER native disease/bridge/rescue.
 * It projects state only. Source already controlled (or not surgical), adequate
 * real coverage and actual circulatory support are all necessary.
 */
export function advanceLegacySepsisConvalescence487(state,baseline,c,minutes,{
 coverageScore=0,coverageRamp=0,fluidActive=false,fluidMl=0,albuminDose=0
}={}){
 validCase(c);
 if(!Number.isFinite(minutes)||minutes<0||minutes>1.5+1e-9)throw Error('invalid convalescence clock step');
 const p={...state},needsFluid=c.keyInterventions.includes('fluid')||c.physiology.supportive?.includes('fluid');
 const adequateFluid=!needsFluid||fluidMl>=Number(c.physiology.doseRules?.fluid?.amount||500)*.5;
 // V4 DEFAULT_THERAPY_DOSES.albumin.amount is 1.5 g/kg; half is its
 // original convalescence threshold, not another albumin effect/dose policy.
 if(coverageScore>=.8&&coverageRamp===1&&p.sourceControlled&&p.inflammation<=baseline.inflammation*.7&&
   (fluidActive&&adequateFluid||albuminDose>=.75)){
  p.effectiveVolume+=minutes*.12*(.86-p.effectiveVolume);
  p.svr+=minutes*.08*(.92-p.svr);p.contractility+=minutes*.05*(.95-p.contractility);
  p.oxygenation+=minutes*.05*(1-p.oxygenation);
  p.renalReserve+=minutes*.02*(Math.min(1,baseline.renalReserve+.05)-p.renalReserve);
 }
 return p;
}
