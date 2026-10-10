// Non-invasive apprentice death-exposure gate. Never mutates physiology or clinical events.
// All treatment credit is grounded in the native monitor AND its administration ledger.
export function csGraceState487(patient, caseDef, activeSeconds=0){
 const elapsed=Math.max(0,Number(activeSeconds)||0);
 const enabled=!!patient&&patient.playMode==='apprentice'&&!patient.caseEnded;
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
 // A completed clinical intervention counts once. Reissuing an order gives no extra credit.
 const credit=Math.min(1,
  (patient.monitorConnected?0.10:0)+
  (Number(patient.venousAccessCount||0)>0?0.12:0)+
  (!hypoxic||administered('oxygen')?0.17:0)+
  (!hypotensive||fluidOk?0.15:0)+
  (covered?0.25:0)+
  (!needsSource||patient.phys?.sourceControlled===true?0.12:0)+
  ((Number(vitals.sys)>=90&&Number(vitals.spo2)>=90&&Number(vitals.hr)<=125)?0.09:0)
 );
 const releaseAt=180+120*credit;
 // Exactly 300s restores the native death predicate. Exposure itself is accrued
 // subsequently by the unmodified engine, so neither boundary causes instant death.
 return {enabled:true,protected:elapsed<180||(elapsed<300&&elapsed<releaseAt),
  elapsed,releaseAt,credit,covered,fluidOk};
}
