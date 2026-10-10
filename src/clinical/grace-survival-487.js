// Non-invasive all-mode death-exposure gate. Never mutates physiology or clinical events.
// All treatment credit is grounded in the native monitor AND its administration ledger.
export function csGraceState487(patient, caseDef, activeSeconds=0){
 const elapsed=Math.max(0,Number(activeSeconds)||0);
 const enabled=!!patient&&!patient.caseEnded&&!patient.patientDied&&
  ['apprentice','solo','coop','competitive'].includes(patient.playMode);
 if(!enabled)return {enabled:false,protected:false,elapsed,releaseAt:0,credit:0};
 const log=Array.isArray(patient.administrationLog)?patient.administrationLog:[];
 const active=patient.monitorTherapies;
 const administered=id=>active?.has?.(id)===true&&log.some(row=>row?.id===id);
 const vitals=patient.liveVitals||{};
 const base=caseDef?.vitals||{};
 const initialSys=Number(String(base.bp||'120/80').split('/')[0]);
 const initialSpo2=Number(base.spo2??98);
 const hypotensive=Number.isFinite(initialSys)&&initialSys<100;
 const hypoxic=Number.isFinite(initialSpo2)&&initialSpo2<93;
 const coverageSets=caseDef?.physiology?.coverageSets||[];
 const covered=!coverageSets.length||coverageSets.some(set=>Array.isArray(set)&&set.length>0&&set.every(administered));
 const needsSource=!!caseDef?.physiology?.sourceControlRequired;
 const fluidOk=administered('fluid')&&Number(patient.therapyTotals?.fluidMl||0)>=250;
 // Only confirmed active procedures/administrations and measurable treatment
 // response earn time. Normal admission vitals alone grant no bonus. Reissuing
 // an order gives no extra credit.
 const credit=Math.min(1,
  (patient.monitorConnected?0.10:0)+
  (Number(patient.venousAccessCount||0)>0?0.12:0)+
  (administered('oxygen')?0.17:0)+
  (fluidOk?0.15:0)+
  (coverageSets.length>0&&covered?0.25:0)+
  (needsSource&&(patient.phys?.sourceControlled===true||administered('vasopressor'))?0.12:0)+
  ((fluidOk||administered('vasopressor'))&&Number(vitals.sys)>=90&&
    Number(vitals.spo2)>=90&&Number(vitals.hr)<=125&&
    (Number(vitals.sys)>=initialSys+5||Number(vitals.spo2)>=initialSpo2+3)?0.09:0)
 );
 // Confirmed care permanently earns its added response time; a temporary
 // monitor fluctuation or switching beds must not retract previously earned time.
 // Do not mutate in this pure evaluator; the frame adapter banks maxObservedCredit.
 const creditEarned=Math.min(1,Math.max(credit,Number(patient.csGrace487?.earnedCredit)||0));
 // 3 active real minutes unconditional; up to 5 additional minutes from
 // verified interventions. This gives an unfamiliar learner time to complete
 // abdominal examination and surgical handoff AFTER stabilizing shock.
 const releaseAt=180+300*creditEarned;
 // The native fatal-exposure clock resumes gradually after releaseAt; no cliff.
 return {enabled:true,protected:elapsed<180||(elapsed<480&&elapsed<releaseAt),
  elapsed,releaseAt,credit:creditEarned,observedCredit:credit,covered,fluidOk};
}

/** Native rescue equivalence, but require confirmed medication administration. */
export function csMissingAdminRescue487(patient,caseDef,v={},map=100){
 if(!patient)return false;
 const log=Array.isArray(patient.administrationLog)?patient.administrationLog:[];
 const executed=id=>patient.monitorTherapies?.has?.(id)===true&&log.some(row=>row?.id===id);
 if(Number(v.spo2)<80&&!executed('oxygen'))return true;
 if(map<45){
  if(caseDef?.risk==='bleed'&&!['fluid','transfusion','vasopressor'].some(executed))return true;
  if((caseDef?.risk==='shock'||caseDef?.physiology)&&!['fluid','vasopressor'].some(executed))return true;
 }
 if(caseDef?.physiology?.sourceControlRequired&&Number(patient.gameMinute)>12&&
    patient.phys?.sourceControlled!==true&&map<50)return true;
 return false;
}
