// Effective native V4 therapyEffectTotals, including the later urgent-care
// correction removing the false transfusion saturation bonus. Pure projection;
// native case physiology remains the only writer of liveVitals.
import {SPECIAL_IV_FORMULATIONS_487} from './iv-dose-contracts-487.js';
const axes=['temp','hr','rr','sys','dia','spo2'];
const zero=()=>Object.fromEntries(axes.map(k=>[k,0]));
const effects=Object.freeze({albumin:{sys:5,dia:3,hr:-3},transfusion:{sys:10,dia:5,hr:-9},
 vasopressor:{sys:20,dia:10,hr:-4}});
export function confirmedNativeSupportEffects487(p,c,atNativeMinute){
 const latest=new Map(),seen=new Set(),counts=new Map();
 for(const row of p.administrationLog||[]){
  if(!Object.hasOwn(effects,row.id))continue;
  const matches=(p.treatments||[]).filter(t=>t.id===row.id&&t.sourceEventId===row.sourceEventId);
  const stop=row.action==='stop',unit=SPECIAL_IV_FORMULATIONS_487[row.id].unit;
  if(row.patientUid!==p.uid||typeof row.sourceEventId!=='string'||!row.sourceEventId||seen.has(row.sourceEventId)||
   !Number.isFinite(atNativeMinute)||!Number.isFinite(row.administeredAtNativeMinute)||
   row.administeredAtNativeMinute<0||row.administeredAtNativeMinute>atNativeMinute+1e-9||
   row.route!=='iv'||(stop?row.id!=='vasopressor'||row.dose!==undefined||row.previousDose?.unit!==unit||
    !Number.isFinite(row.previousDose?.amount)||row.previousDose.amount<=0:
    row.dose?.unit!==unit||!Number.isFinite(row.dose?.amount)||row.dose.amount<=0)||
   (row.id==='vasopressor'&&!['start','setRate','stop'].includes(row.action))||
   matches.length!==1||matches[0].patientUid!==p.uid||matches[0].action!==row.action||matches[0].route!==row.route||
   matches[0].administeredAtNativeMinute!==row.administeredAtNativeMinute||
   matches[0].dose?.amount!==row.dose?.amount||matches[0].dose?.unit!==row.dose?.unit)
   throw Error('native support requires unique confirmed administration');
  seen.add(row.sourceEventId);latest.set(row.id,row);
  if(!stop)counts.set(row.id,(counts.get(row.id)||0)+1);
 }
 const septic=['peritonitis','sepsis_source'].includes(c?.physiology?.engine),offsets=zero(),drugs={};
 for(const [id,row] of latest){
  const active=row.action!=='stop',own=zero(),toxicity=zero();
  if(active){
   if(id==='vasopressor'){
    const infusion=p.procedures?.vasopressor;
    if(!infusion?.active||infusion.patientUid!==p.uid||infusion.sourceEventId!==row.sourceEventId||
     infusion.moleculeId!=='norepinephrine'||infusion.dose?.amount!==row.dose?.amount)
     throw Error('native pressor requires the confirmed active infusion');
   }
   const policyOwnsBenefit=c?.clinicalPolicy?.responses?.some(r=>r.allOf?.includes(id)||r.anyOf?.includes(id));
   if(!policyOwnsBenefit&&!septic)Object.assign(own,effects[id]);
   else if(!policyOwnsBenefit&&id==='vasopressor'){
    if(!p.phys||!Number.isFinite(p.phys.effectiveVolume))throw Error('native pressor needs owned sepsis physiology');
    const doseFactor=Math.max(.55,Math.min(1.6,Number(row.dose.amount||.05)/.05));
    const volFactor=Math.max(.45,Math.min(1.05,.35+p.phys.effectiveVolume));
    own.sys=18*doseFactor*volFactor;own.dia=10*doseFactor*volFactor;own.hr=-3*doseFactor;
   }
  }
  // Exact native medicationSafetyOffsets contributions, not the blocked
  // experimental general pharmacology engine or another toxicity writer.
  if(id==='albumin'&&(counts.get(id)||0)>2){
   const n=counts.get(id)-2;toxicity.rr=Math.min(8,n*2);toxicity.spo2=-Math.min(7,n*2);
  }
  if(id==='vasopressor'&&active&&row.dose.amount>.18){
   const z=(row.dose.amount-.18)/.05;
   toxicity.sys=Math.min(32,z*8);toxicity.dia=Math.min(20,z*5);toxicity.hr=Math.min(18,z*4);
  }
  for(const axis of axes)own[axis]+=toxicity[axis];
  // In peritonitis albumin works through the original volume/renal state
  // transition, not an additional pressure buff; that owner is integrated in C3.
  drugs[id]={active,sourceEventId:row.sourceEventId,administrations:counts.get(id)||0,offsets:own,toxicity};
  for(const axis of axes)offsets[axis]+=own[axis];
 }
 return {offsets,drugs};
}
export function applyConfirmedNativeSupportTargets487(target,p,c,atNativeMinute){
 const {offsets}=confirmedNativeSupportEffects487(p,c,atNativeMinute);
 for(const axis of axes)target[axis]+=offsets[axis];
 return target;
}
