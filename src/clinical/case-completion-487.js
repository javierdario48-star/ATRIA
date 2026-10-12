/**
 * ATRIA 4.8.7 — Emergency-department handoff rules.
 * Strictly the CURRENT 10 non-peritonitis seeds: the 3 peritonitis seeds retain
 * their previously proven disposition owner.
 * Requirements enable handoff; OPTIONAL thoroughness only changes XP.
 */
export const CASE_CLOSURE_RULES_487=Object.freeze({
 'CIRR-001':{destinations:['sala','observacion'],study:[['hepatograma','renal','eco']],treatment:[['espironolactona']]},
 'PANC-001':{destinations:['uti'],study:[['lipasa']],treatment:[['fluid','npo']],consult:{uti:['uti']}},
 'CROHN-001':{destinations:['sala','observacion'],study:[['inflamatorio','colonoscopia','enterorm']],treatment:[['steroid']]},
 'HDA-001':{destinations:['procedimiento','uti'],study:[['hda_lab','grupo']],treatment:[['iv','fluid','ppi'],['iv','transfusion','ppi']],consult:{procedimiento:['gastro'],uti:['uti']}},
 'COLON-001':{destinations:['alta','sala'],study:[['colonoscopia']],treatment:[]},
 'APP-001':{destinations:['quirofano'],study:[['app_us']],urgentStudyBypass:true,treatment:[['ceftriaxone','metronidazole'],['piptazo'],['imipenem']],consult:{quirofano:['cirugia']}},
 'CHOLE-001':{destinations:['quirofano'],study:[['chole_us']],treatment:[['npo','ceftriaxone','metronidazole'],['npo','piptazo'],['npo','imipenem']],consult:{quirofano:['cirugia']}},
 'ILEO-001':{destinations:['sala','quirofano','uti'],study:[['ileo_xray','ileo_ct']],treatment:[['fluid','ngt','npo']],consult:{quirofano:['cirugia'],uti:['uti']}},
 'MESI-001':{destinations:['quirofano'],study:[['mesi_cta']],urgentStudyBypass:true,treatment:[['fluid','anticoagulation']],consult:{quirofano:['hemodinamia','cirugia']}},
 'CHOLANG-001':{destinations:['procedimiento','uti'],study:[['cholang_liver','cholang_us']],treatment:[['fluid','ceftriaxone','metronidazole'],['fluid','piptazo'],['fluid','imipenem']],consult:{procedimiento:['gastro'],uti:['uti']}}
});
export const CLOSURE_DEST_LABELS_487=Object.freeze({
 alta:'Dar de alta',observacion:'Dejar en observación',sala:'Internar en sala',
 uti:'Derivar a UTI',quirofano:'Derivar a quirófano',
 procedimiento:'Derivar a procedimiento/endoscopia'
});
export function csClosureSnapshot487(s,c){
 if(!s||!c)return null;
 const tx=new Set((s.administrationLog||[]).filter(x=>x?.id&&x.action!=='stop'&&x.status!=='pending').map(x=>x.id));
 for(const [id,entry] of s.therapyExposure?.entries?.()||[])
  if(Number(entry?.count||0)>0)tx.add(id);
 for(const id of s.interventions||[])tx.add(id);
 if(Number(s.venousAccessCount||0)>0)tx.add('iv');
 const consults=[];
 for(const [id,x] of s.consults?.entries?.()||[])
  if(x?.status==='done'&&x.accepted!==false)consults.push(id);
 const bp=Number(s.liveVitals?.sys??c.vitals?.bp?.split('/')[0]??120);
 return {caseId:c.id,diagnosis:String(s.diagnosis||''),acceptedDiagnoses:c.dx||[],
  historyAnswered:(s.intentHistory||[]).map(x=>x.id),historyRelevant:c.requiredHistory||[],
  examDone:!!s.examDone,examRegionsCount:Number(s.examRegions?.size||0),
  vitalsKnown:!!s.lastVitalsKnown,reassessments:Number(s.reassessments||0),
  studiesDone:[...(s.orders?.entries?.()||[])].filter(([,x])=>x?.status==='done').map(([id])=>id),
  extraStudies:[...(s.orders?.keys?.()||[])].filter(id=>!(c.keyStudies||[]).includes(id)),
  keyStudies:c.keyStudies||[],keyInterventions:c.keyInterventions||[],
  delivered:[...tx],consultsDone:consults,disposition:s.disposition?.id||null,
  sys:bp,hr:Number(s.liveVitals?.hr??80),spo2:Number(s.liveVitals?.spo2??98),
  rr:Number(s.liveVitals?.rr??16),initialSys:Number(String(c.vitals?.bp||'120/80').split('/')[0]),
  dead:!!s.patientDied,ended:!!s.caseEnded,
  clinicalFlags:s.clinicalFlags||{},phys:s.phys||{},
  adverseCount:Number(s.adverseEvents?.length||0),
  autonomy:typeof s.vegaRescues==='number'?Math.max(0,100-s.vegaRescues*15):100,
  uid:s.patientInstance?.uid||null};
}
export function csEvaluateClosure487(a={}){
 const rule=CASE_CLOSURE_RULES_487[a.caseId];if(!rule)return null;
 const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const missing=[],done=new Set(a.delivered||[]),studies=new Set(a.studiesDone||[]);
 const dest=a.disposition||null;
 const critical=(Number(a.initialSys||120)<90||Number(a.sys||120)<90);
 const matched=(a.acceptedDiagnoses||[]).some(x=>norm(a.diagnosis).includes(norm(x)));
 if(a.dead||a.ended)return {caseId:a.caseId,ready:false,missing:['La atención terminó o el paciente falleció.'],action:null};
 if(!a.vitalsKnown)missing.push('Registrar signos vitales.');
 if(!a.examDone&&Number(a.examRegionsCount||0)<2)missing.push('Completar examen físico dirigido.');
 if(!norm(a.diagnosis)||!matched)missing.push('Registrar un diagnóstico presuntivo compatible.');
 // The minimal clinical history establishes context. All other questions give
 // partial credit; in shock, treatment and transfer cannot be delayed for them.
 const relevant=(a.historyAnswered||[]).filter(x=>(a.historyRelevant||[]).includes(x)).length;
 const contextual=['anamnesis:reason','anamnesis:pmh','anamnesis:allergies',
   'anamnesis:meds','anamnesis:surgeries','anamnesis:familyHistory'];
 const general=(a.historyAnswered||[]).filter(x=>contextual.includes(x)).length;
 const answered=relevant+general;
 if(answered<1&&!critical)missing.push('Obtener al menos un dato relevante de anamnesis.');
 const evidence=(rule.study||[]).some(group=>group.some(x=>studies.has(x)));
 if(!evidence&&!(rule.urgentStudyBypass&&critical&&!!a.examDone))
  missing.push('Completar un estudio orientador o justificar urgencia clínica.');
 const hasAll=group=>group.every(id=>done.has(id));
 // Separate minimum clinical treatment groups from the total desirable care.
 if(rule.treatment?.length){
  let accepted=rule.treatment.some(hasAll);

  if(!accepted)missing.push('Confirmar las intervenciones imprescindibles y su ejecución real.');
 }
 const hemorrhage=a.clinicalFlags?.activeBleeding===true||
    a.clinicalFlags?.majorBleeding===true||a.phys?.activeBleeding===true;
 // Anticoagulation may be unsafe when hemorrhaging; never delay surgical
 // transfer solely to administer a contraindicated heparin dose.
 if(a.caseId==='MESI-001'&&hemorrhage){
  for(let i=missing.length-1;i>=0;i--)if(/intervenciones imprescindibles/.test(missing[i])&&done.has('fluid'))
   missing.splice(i,1);
 }
 if(critical&&!done.has('fluid')&&!done.has('vasopressor')&&!done.has('transfusion'))
  missing.push('Iniciar soporte para la hipoperfusión.');
 if(Number(a.spo2??98)<90&&!done.has('oxygen'))
  missing.push('Iniciar oxígeno ante hipoxemia.');
 if(!Number(a.reassessments||0))missing.push('Reevaluar al paciente tras las intervenciones.');
 const destination=rule.destinations[0],choices=rule.destinations;
 // A destination is an ED handoff, not performed surgery or source control.
 const goal=dest||destination;
 if(!choices.includes(goal))missing.push('El destino seleccionado no corresponde al caso.');
 const services=rule.consult?.[goal]||[];
 if(services.length&&!services.some(x=>(a.consultsDone||[]).includes(x)))
  missing.push('Esperar la respuesta del servicio receptor ('+services.join(' o ')+').');
 // Safe outpatient release requires actual stability; an unstable patient can
 // still transfer to UTI/OR with ongoing resuscitation.
 if(goal==='alta'&&(Number(a.sys||0)<100||Number(a.spo2||0)<94||
    Number(a.hr||0)>110||Number(a.rr||0)>24))
  missing.push('No dar el alta con signos vitales inestables.');
 if(goal==='sala'&&(Number(a.sys||0)<90||Number(a.spo2||0)<90))
  missing.push('Considerar UTI o continuar estabilización antes de internar en sala.');
 const ready=missing.length===0;
 return {caseId:a.caseId,ready,action:ready?goal:null,destination,
  choices:ready?[...choices]:[],missing,diagnostic:matched,historyCount:answered,
  studiesSatisfied:evidence,procedurePerformed:!!a.phys?.sourceControlled,
  // XP quality is calculated independently and never authorizes closure.
  quality:csClosureQuality487(a,rule,done,studies)};
}
export function csClosureQuality487(a,rule,done,studies){
 const take=ids=>(ids||[]).filter(id=>(a.historyAnswered||[]).includes(id)).length;
 const diagnosis=(a.acceptedDiagnoses||[]).some(x=>
  String(a.diagnosis||'').toLowerCase().includes(String(x).toLowerCase()))?15:0;
 const primary=15*take(a.historyRelevant)/Math.max(1,(a.historyRelevant||[]).length);
 const context=['anamnesis:reason','anamnesis:pmh','anamnesis:allergies',
   'anamnesis:meds','anamnesis:surgeries','anamnesis:familyHistory']
   .filter(id=>(a.historyAnswered||[]).includes(id)).length;
 const history=Math.min(15,Math.round(primary+Math.min(4,context*1.25)));
 const safety=(a.vitalsKnown?6:0)+(a.examDone?7:0)+
  (a.reassessments>0?7:0)+(rule.destinations.includes(a.disposition)?5:0);
 const studiesScore=Math.round(15*(a.keyStudies||[]).filter(id=>studies.has(id)).length/
  Math.max(1,(a.keyStudies||[]).length));
 // Surgery and source control occur AFTER ED handoff, so only the successful
 // transfer earns their treatment credit, not a fake surgical procedure.
 const relevant=(a.keyInterventions||[]).filter(id=>!['source_control','surgery'].includes(id));
 const completed=relevant.filter(id=>done.has(id)).length;
 const referralBonus=(a.keyInterventions||[]).some(id=>['source_control','surgery'].includes(id))?
  Number(rule.destinations.includes(a.disposition)&&
   (a.consultsDone||[]).length>0):0;
 const denominator=relevant.length+Number((a.keyInterventions||[]).some(id=>['source_control','surgery'].includes(id)));
 const treatment=Math.round(25*(completed+referralBonus)/Math.max(1,denominator));
 const penalty=Math.min(5,(a.extraStudies||[]).length*2);
 const efficiency=5-penalty;
 const adversePenalty=Math.min(20,Number(a.adverseCount||0)*5);
 const score=Math.max(0,Math.min(100,diagnosis+history+safety+studiesScore+treatment+efficiency-adversePenalty));
 return {score,diagnosis,history,safety,studies:studiesScore,treatment,
  efficiency,penalty:adversePenalty+penalty,extraStudies:(a.extraStudies||[]).length};
}
