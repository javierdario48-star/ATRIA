// Effective 4.8.7 morphine kinetics, extracted from the final morphine wrapper.
// No HTML, global overrides, timer, duplicate exposure ledger or vital writer.
// Native minutes are game calibration, not clinical elimination kinetics.
export function morphineOrderIssue487(raw) {
 const text=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/,/g,'.');
 const name=text.match(/\bmorfina\b/);
 if(!name)return 'Identificá morfina antes de indicar una dosis.';
 if((text.match(/\bmorfina\b/g)||[]).length!==1)return 'Indicá una sola orden de morfina por administración.';
 if(/\b(?:oral|vo|po|im|sc|intramuscular|intranasal|sublingual|subcutane[ao]|inhalad[ao]|nasal)\b|\bi\.?\s*m\.?(?=\s|$)|\bs\.?\s*c\.?(?=\s|$)/.test(text)||
    /\bvia\b/.test(text)&&!/\bvia\s+(?:iv|ev|intravenos[oa]|endovenos[oa])\b/.test(text))
  return 'Morfina: esta entrada de ATRIA solamente admite administración IV.';
 if(/(?:^|[\s(])[+−–—-]\s*\d/.test(text))return 'Morfina: indicá una dosis positiva sin signos ambiguos.';
 const numbers=[...text.matchAll(/\d+(?:\.\d+)?/g)];
 if(numbers.length>1)return 'Morfina: indicá una sola dosis verificable por administración.';
 if(numbers.length){
  const tail=text.slice(name.index+name[0].length);
  const dose=tail.match(/^\s*(\d+(?:\.\d+)?)\s*mg\b/);
  if(!dose||!Number.isFinite(Number(dose[1]))||Number(dose[1])<=0||Number(dose[1])>30)
   return 'Morfina: indicá después del nombre una dosis positiva en mg IV, dentro del límite educativo del simulador.';
 }
 if(/\b(?:mcg|ug|ml|cc|g|l)\b/.test(text))return 'Morfina: unidad incompatible; la dosis debe expresarse en mg IV.';
 return null;
}
const axes=['temp','hr','rr','sys','dia','spo2'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const painCases=new Set(['PANC-001','CROHN-001','PERI-SEC-001','APP-001','CHOLE-001','ILEO-001','MESI-001']);
export function parseMorphineIVDose487(text,reference={amount:4,unit:'mg',display:'4 mg'}){
 if(reference.amount!==4||reference.unit!=='mg')throw Error('invalid morphine reference formulation');
 if(morphineOrderIssue487(text))throw Error('unsupported-morphine-dose-route');
 const raw=String(text).replace(/,/g,'.'),match=raw.match(/(\d+(?:\.\d+)?)\s*mg\b/i);
 const amount=match?Number(match[1]):reference.amount;
 return {amount,unit:'mg',display:amount+' mg',defaultApplied:!match};
}
/** Only matched actual administrations can enter this recovered PK model.
 * A recent-dose projection is derived from the authoritative ledger, bounded
 * to the same 24 rows / 40 native minutes as the original final wrapper.
 */
export function confirmedMorphineResponse487(p,c,atNativeMinute){
 const rows=(p.administrationLog||[]).filter(row=>row.id==='morphine');
 if(!rows.length)return null;
 if(typeof p.uid!=='string'||!p.uid||!Number.isFinite(atNativeMinute)||atNativeMinute<0)
  throw Error('invalid morphine patient/clock');
 const seen=new Set();
 for(const row of rows){
  const matching=(p.treatments||[]).filter(t=>t.id===row.id&&t.sourceEventId===row.sourceEventId);
  if(row.patientUid!==p.uid||typeof row.sourceEventId!=='string'||!row.sourceEventId||
   seen.has(row.sourceEventId)||row.action==='stop'||row.dose?.unit!=='mg'||
   !Number.isFinite(row.dose.amount)||row.dose.amount<=0||row.dose.amount>30||
   !Number.isFinite(row.administeredAtNativeMinute)||row.administeredAtNativeMinute<0||
   row.administeredAtNativeMinute>atNativeMinute+1e-9||matching.length!==1||
   matching[0].patientUid!==p.uid||matching[0].dose?.unit!==row.dose.unit||
   matching[0].dose?.amount!==row.dose.amount||
   matching[0].administeredAtNativeMinute!==row.administeredAtNativeMinute)
   throw Error('morphine requires unique confirmed patient administration');
  seen.add(row.sourceEventId);
 }
 const reserve=clamp(Number(p.phys?.renalReserve??.8),.1,1);
 if(!Number.isFinite(reserve))throw Error('invalid morphine renal reserve');
 const halfLifeNative=8*(1+.28*(1-reserve));
 const recent=rows.filter(row=>atNativeMinute-row.administeredAtNativeMinute<40).slice(-24);
 let load=0;
 for(const row of recent){
  const elapsed=atNativeMinute-row.administeredAtNativeMinute;
  load+=row.dose.amount/4*Math.pow(.5,Math.max(0,elapsed)/halfLifeNative);
 }
 const effect=clamp(load,0,3.6),traits=c?.pharmacology?.traits||[],pain=painCases.has(c?.id)||traits.includes('pain');
 const sys=Number(p.liveVitals?.sys??120),spo2=Number(p.liveVitals?.spo2??98);
 if(!Number.isFinite(sys)||!Number.isFinite(spo2))throw Error('invalid morphine vital observation');
 const vulnerable=sys<95,breathingVulnerable=spo2<92;
 const excess=Math.max(0,effect-1.1);
 const offsets={temp:0,hr:pain?-Math.min(7,2.6*effect):0,
  rr:-Math.min(12,1.3*effect+3*excess),
  sys:-Math.min(19,Math.max(0,effect-.55)*3*(vulnerable?1.5:.8)),
  dia:-Math.min(10,Math.max(0,effect-.55)*1.5*(vulnerable?1.5:.8)),
  spo2:-Math.min(12,Math.max(0,effect-1.2)*4.2*(breathingVulnerable?1.25:1))};
 return {load:effect,analgesia:pain?clamp(effect*.75,0,1):0,
  respiratoryRisk:excess>0,halfLifeNative,offsets,
  recentDoseCount:recent.length,sourceEventId:recent.at(-1)?.sourceEventId??null};
}
export function applyConfirmedMorphineTargetOffsets487(target,p,c,atNativeMinute){
 const response=confirmedMorphineResponse487(p,c,atNativeMinute);
 if(response)for(const axis of axes)target[axis]+=response.offsets[axis];
 return target;
}
