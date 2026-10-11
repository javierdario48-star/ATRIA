// One bounded, game-scale morphine owner over the EXISTING native writers.
// Uses the same actual-administration path for nurse and bedside monitor.
// No independent ledger, infusion engine, protected policy, or new catalogue.
export function morphineOrderIssue487(raw) {
 const text=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/,/g,'.');
 const name=text.match(/\bmorfina\b/);
 if(!name)return 'Identificá morfina antes de indicar una dosis.';
 if((text.match(/\bmorfina\b/g)||[]).length!==1)return 'Indicá una sola orden de morfina por administración.';
 if(/\b(?:oral|vo|v\.o\.|im|i\.m\.|sc|subcutane[ao]|inhalad[ao]|nasal)\b/.test(text))
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
export function applyMorphine487(html){
 if(html.includes('id="atria-morphine-487"'))throw Error('duplicate morphine owner');
 if(html.split('</body>').length!==2)throw Error('unique morphine insertion point required');
 const script=['<script id="atria-morphine-487">','(function(){',
  'if(window.__csMorphine487)return;',
  'if(window.__csPharmacology487===true)return; // never overlap a future active global drug owner',
  morphineOrderIssue487.toString(),
  'const previousRecord=recordAdministration;',
  'const previousGive=addMonitorTherapy;',
  'const previousTherapy=therapyEffectTotals;',
  'const previousSafety=medicationSafetyOffsets;',
  "const painCases=new Set(['PANC-001','CROHN-001','PERI-SEC-001','APP-001','CHOLE-001','ILEO-001','MESI-001']);",
  'const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));',
  'function response(){',
  " const p=sim,active=p?.monitorTherapies?.get?.('morphine'),ex=p?.therapyExposure?.get?.('morphine');",
  ' if(!active||!Array.isArray(ex?.csRecentMorphine487))return null;',
  ' const now=Number(p.gameMinute||0),reserve=clamp(Number(p.phys?.renalReserve??.8),.1,1);',
  ' const halfLifeNative=8*(1+.28*(1-reserve)); // virtual calibration; not clinical elimination kinetics',
  ' let load=0;',
  ' for(const x of ex.csRecentMorphine487){',
  '  const elapsed=now-Number(x.m);',
  '  if(elapsed>=0&&elapsed<40&&x.patientId===p.patientInstance?.uid)',
  '   load+=Number(x.mg)/4*Math.pow(.5,elapsed/halfLifeNative);',
  ' }',
  ' const effect=clamp(load,0,3.6),traits=C?.pharmacology?.traits||[],pain=painCases.has(C?.id)||traits.includes("pain");',
  ' const sys=Number(p.liveVitals?.sys??120),spo2=Number(p.liveVitals?.spo2??98);',
  ' const vulnerable=sys<95,breathingVulnerable=spo2<92;',
  ' const excess=Math.max(0,effect-1.1);',
  ' const offsets={temp:0,hr:pain?-Math.min(7,2.6*effect):0,',
  '  rr:-Math.min(12,1.3*effect+3*excess),',
  '  sys:-Math.min(19,Math.max(0,effect-.55)*3*(vulnerable?1.5:.8)),',
  '  dia:-Math.min(10,Math.max(0,effect-.55)*1.5*(vulnerable?1.5:.8)),',
  '  spo2:-Math.min(12,Math.max(0,effect-1.2)*4.2*(breathingVulnerable?1.25:1))};',
  ' return {load:effect,analgesia:pain?clamp(effect*.75,0,1):0,',
  '  respiratoryRisk:excess>0,halfLifeNative,offsets};',
  '}',
  'function oldMorphineSafety(){',
  " const ex=sim?.therapyExposure?.get?.('morphine');",
  ' const old={temp:0,hr:0,rr:0,sys:0,dia:0,spo2:0};',
  ' if(!ex||Number(ex.count||0)<=1)return old;',
  " const mg=ex.unit==='mg'?Number(ex.totalAmount||0):4*Number(ex.count||0),excess=Math.max(0,mg-8);",
  ' old.rr=-Math.min(12,excess*.65);old.spo2=-Math.min(12,excess*.45);',
  ' old.sys=-Math.min(18,excess*.55);old.hr=-Math.min(12,excess*.25);',
  ' return old;',
  '}',
  'addMonitorTherapy=function(text){',
  " const t=typeof findMonitorTherapy==='function'?findMonitorTherapy(text):null;",
  " if(t?.id==='morphine'){const issue=morphineOrderIssue487(text);",
  "  if(issue){setMonitorFeedback('Morfina NO administrada: '+issue,'warn');nurseSay(issue);return false;}}",
  ' return previousGive.apply(this,arguments);',
  '};',
  'recordAdministration=function(t){',
  ' const patient=sim,before=patient?.administrationLog?.at(-1),out=previousRecord.apply(this,arguments);',
  " if(t?.id!=='morphine'||t.action==='stop'||!patient||patient!==sim||!out)return out;",
  ' const after=patient.administrationLog?.at(-1),mg=Number(t.dose?.amount);',
  " if(after===before||after?.id!=='morphine'||t.dose?.unit!=='mg'||!Number.isFinite(mg)||mg<=0)return out;",
  ' const now=Number(patient.gameMinute||0),id=patient.patientInstance?.uid;',
  ' const retained=Array.isArray(out.csRecentMorphine487)?out.csRecentMorphine487:[];',
  ' out.csRecentMorphine487=[...retained.filter(x=>x.patientId===id&&now-x.m>=0&&now-x.m<=40),',
  '  {m:now,mg,patientId:id}].slice(-24);',
  ' return out;',
  '};',
  'therapyEffectTotals=function(){',
  ' const total=previousTherapy.apply(this,arguments),r=response();',
  ' if(!r)return total;',
  " const active=sim.monitorTherapies.get('morphine');",
  " const septic=['peritonitis','sepsis_source'].includes(C?.physiology?.engine);",
  ' if(septic){',
  '  const mg=Number(active.dose?.amount||4),factor=Math.max(.6,Math.min(2,mg/4));',
  '  total.hr+=4*factor;total.rr+=2.5*factor;if(mg>=10)total.spo2+=3;',
  ' }else for(const axis of Object.keys(total))total[axis]-=Number(active.effects?.[axis]||0);',
  ' for(const axis of Object.keys(total))total[axis]+=Number(r.offsets[axis]||0);',
  ' return total;',
  '};',
  'medicationSafetyOffsets=function(){',
  ' const total=previousSafety.apply(this,arguments),r=response();',
  ' if(!r)return total;',
  ' const legacy=oldMorphineSafety();',
  ' for(const axis of Object.keys(total))total[axis]-=legacy[axis];',
  ' return total; // morphine risk is now included ONCE in time-dependent therapyEffectTotals',
  '};',
  'window.csMorphine487=Object.freeze({report:()=>response(),issue:morphineOrderIssue487});',
  'window.__csMorphine487=true;',
  '})();','</script>'].join('\n');
 return html.replace('</body>',script+'</body>');
}
