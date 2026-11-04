// One read-only selector over the case's OWN pending requirements. No timers,
// dose administration, diagnosis generation, patient mutation or clinical AI.
import {clinicalActionDescriptor} from './clinical-action-registry.js';
import {CHECKLIST_PRIORITY as priority,clinicalClosureRule} from './clinical-hint-requirements.js';
import {clinicalInterventionEligibility} from './native-medication-eligibility.js';
import {currentClinicalTreatment} from './receipts.js';
import {clinicalAcuity} from './acuity.js';
import {medicationSafety487,matchesMedicationAllergy487,hasMedicationSafetyMetadata487} from './medication-safety-487.js';
import {nativeTreatmentDefinition} from './native-medications.js';
import {physicianExaminationsPerformed} from './diagnostic-evidence.js';
import {antimicrobialRegimens487} from './antimicrobial-regimens-487.js';
import {clinicalTransferContinuation,unrescuedTransferReactions} from './transfer-continuation.js';
import {patientStudyOrders,studyEvidenceId} from './study-evidence.js';

function semanticHintKey(action,p,c){
 const base=action.kind+':'+action.id;
 if(action.kind==='reassess')return base+':'+JSON.stringify([...new Set([
  ...(p.treatments||[]).map(t=>t.sourceEventId),
  ...(p.administrationLog||[]).filter(t=>t.status==='administering').map(t=>t.sourceEventId)
 ])].filter(Boolean).sort());
 if(action.kind==='study'){
  const dependencies=[...(c.studies.find(s=>s.id===action.id)?.requiresCompletedTreatments||[]),
   ...Object.values(c.clinicalPolicy?.eligibility||{}).flatMap(rule=>rule.requiresStudiesAfterTreatments||[])
    .filter(rule=>rule.studyId===action.id).map(rule=>rule.treatmentId)];
  if(dependencies.length)return base+':'+JSON.stringify(dependencies.map(id=>p.treatments?.filter(t=>t.id===id).at(-1)?.sourceEventId||'pending'));
 }
 return base;
}

export function selectClinicalHint({patient:p,caseData:c,requirements=[],content,clock,destination,fulfilledTreatmentIds=[]}){
 if(!p||p.caseEnded||p.patientDied)return null;
 const context={patient:p,caseData:c,content,clock},minute=clock.nativeMinute;
 const done=new Set(fulfilledTreatmentIds),pending=new Set([
  ...(p.pendingTreatments||[]).map(x=>x.id),...(p.hintPendingActions||[]).map(x=>x.id),
  ...(p.administrationLog||[]).filter(x=>x.status==='administering').map(x=>x.id)]);
 for(const t of p.treatments||[])if(c.clinicalPolicy?currentClinicalTreatment(p,t.id,minute):
  t.patientUid===p.uid&&t.sourceEventId&&t.action!=='stop')done.add(t.id);
 if(p.venousAccessCount>0)done.add('iv');
 if(p.procedures?.monitor?.connected)done.add('monitor');
 const studies=new Set(patientStudyOrders(p,'done').map(x=>studyEvidenceId(c,x.id))),
  requested=new Set(patientStudyOrders(p,'pending').map(x=>studyEvidenceId(c,x.id)));
 const blocking=clinicalTransferContinuation(p,c,destination,minute).pendingBlockers.length||p.hintPendingActions?.length||p.pendingConsults?.length;
 const severity=clinicalAcuity(p.liveVitals,{rhythm:p.ecg?.rhythm}),v=p.liveVitals||{},
  shock=v.sys<90||(v.sys+2*v.dia)/3<65,hypoxemia=v.spo2<90;
 const candidates=[],errors=[],waiting=[];
 const action=(kind,id)=>clinicalActionDescriptor(kind,id,context);
 function add(a,priority,reason){
  if(a)candidates.push({action:a,priority,requirement:reason});
  else errors.push(reason);
 }
 function study(id,priority,reason,seen=new Set(),repeat=false){
  const key='study:'+id;
  if(seen.has(key)){errors.push('dependency-cycle:'+key);return;}
  if(requested.has(id)){waiting.push(id);return;}
  if(studies.has(id)&&!repeat)return;
  const def=c.studies.find(s=>s.id===id);
  const prerequisite=def?.requiresCompletedTreatments?.find(t=>!done.has(t));
  if(prerequisite){treatment(prerequisite,priority,reason,new Set([...seen,key]));return;}
  add(action('study',id),priority,reason);
 }
 function treatment(id,priority,reason,seen){
  if(done.has(id))return true;
  if(pending.has(id)){waiting.push(id);return true;}
  if(seen.has(id)){errors.push('dependency-cycle:'+id);return false;}seen=new Set([...seen,id]);
  const safety=hasMedicationSafetyMetadata487(id)?medicationSafety487(c,p,id):{},issue=clinicalInterventionEligibility(p,c,id,clock);
  if(matchesMedicationAllergy487(p,id)||safety.blocked||safety.contraindicated||
   ['clinical-contraindication','clinical-indication-not-supported','clinical-onset-window-exceeded','clinical-anticoagulant-mismatch'].includes(issue?.reason))return false;
  const eligibility=c.clinicalPolicy?.eligibility?.[id]||{},def=nativeTreatmentDefinition(id,c);
  if(issue){
   const historyRequired=issue.prerequisites?.history?.[0];
   if(historyRequired){add(action('history',historyRequired),priority+1,reason);return true;}
   const studyAlternatives=issue.prerequisites?.studyAlternatives;
   if(studyAlternatives?.length){
    if(studyAlternatives.some(id=>requested.has(id)))waiting.push('study');
    else study(studyAlternatives[0],priority+1,reason,seen);
    return true;
   }
   const prior=eligibility.requiresCompletedTreatments?.find(t=>!done.has(t));
   if(prior)return treatment(prior,priority+1,reason,seen);
   const requiredStudy=eligibility.requiredStudies?.find(s=>!studies.has(s));
   if(requiredStudy){study(requiredStudy,priority+1,reason,seen);return true;}
   const control=issue.prerequisites?.studyAfterTreatment;
   if(control){study(control,priority+1,reason,seen,true);return true;}
   const priorHistory=eligibility.requiresHistory?.find(h=>!p.intentHistory?.some(x=>x.id.replace(/^anamnesis:/,'')===h));
   if(priorHistory){add(action('history',priorHistory),priority+1,reason);return true;}
   if(issue.reason==='clinical-swallow-assessment-required')return treatment('swallow_screen',priority+1,reason,seen);
   if(issue.reason==='clinical-airway-required')return treatment('intubation',priority+1,reason,seen);
   // A restriction without a currently executable prerequisite is never
   // presented as a prescription. Another authored alternative may be safe.
   return false;
  }
  if(def?.requiresAccess&&!done.has('iv'))return treatment('iv',priority+1,reason,seen);
  const a=action('treatment',id);if(!a)return false;
  add(a,priority,reason);return true;
 }
 function therapyPriority(id,urgent){
  let rank=urgent?800:priority.treatment;
  if(hypoxemia&&['oxygen','intubation','niv','lung_protective_ventilation','needle_decompression','chest_drain'].includes(id))rank=1100;
  if(shock&&['fluid','transfusion','vasopressor','synchronized_cardioversion','temporary_pacing','pericardiocentesis','needle_decompression'].includes(id))rank=1000;
  // Reuse authored response targets to rank disease-specific rescue actions.
  for(const response of c.clinicalPolicy?.responses||[])
   if([...(response.allOf||[]),...(response.anyOf||[])].includes(id)&&
    (hypoxemia&&response.offsets?.[5]>0||shock&&response.offsets?.[3]>0))rank=Math.max(rank,900);
  return rank;
 }
 // Ask the actual handoff adapter whether verified monitoring would allow an
 // ongoing infusion to continue at the receiver. Never wait for a full course
 // when a documented handoff dependency is the only thing still missing.
 if(!p.procedures?.monitor?.connected){
  const monitored=clinicalTransferContinuation({...p,procedures:{...p.procedures,monitor:{connected:true}}},c,destination,minute);
  if(monitored.continuingAdministrations.length)treatment('monitor',90,'handoff-monitoring',new Set());
 }
 if(unrescuedTransferReactions(p,c,minute).length)treatment('epi_im',2000,'active-anaphylaxis',new Set());
 for(const r of requirements){
  if(r.type==='vitals'){if(pending.has('vitals')||pending.has('monitor'))waiting.push('vitals');else add(action('vitals'),priority.vitals,'vitals');}
  else if(r.type==='examination'){
   const performed=new Set(physicianExaminationsPerformed(p));
   const id=r.ids?.find(id=>!performed.has(id.replace(/^(?:heart|lungs):/,'thorax:').replace('neurological:all','neurological:neurological')))||
    (!p.examFindings?.general?.general?'general':'abdomen');
   add(action('examination',id),priority.examination,'examination');
  }else if(r.type==='history')add(action('history'),priority.history,'history');
  else if(r.type==='diagnosis')add(action('diagnosis'),priority.diagnosis,'diagnosis');
  else if(r.type==='study'){
   if(r.anyOf?.some(g=>g.every(id=>studies.has(id))))continue;
   const groups=(r.anyOf||[]).map(g=>g.filter(id=>!studies.has(id)));
   if(groups.some(g=>g.every(id=>requested.has(id)))){waiting.push('study');continue;}
   const id=groups.sort((a,b)=>a.length-b.length)[0]?.find(id=>!requested.has(id));
   if(id)study(id,priority.study,'study');
  }else if(r.type==='treatment'){
   const groups=(r.anyOf||[]).map(g=>g.filter(id=>!done.has(id)));
   if(groups.some(g=>!g.length))continue;
   // An already running acceptable strategy outranks ordering another one.
   if(groups.some(g=>g.every(id=>pending.has(id)))){waiting.push('treatment');continue;}
   const usable=groups.filter(g=>g.every(id=>!matchesMedicationAllergy487(p,id)&&
    !(hasMedicationSafetyMetadata487(id)?medicationSafety487(c,p,id):{}).contraindicated&&!['clinical-contraindication','clinical-indication-not-supported','clinical-onset-window-exceeded']
     .includes(clinicalInterventionEligibility(p,c,id,clock)?.reason)));
   usable.sort((a,b)=>a.filter(id=>!pending.has(id)).length-b.filter(id=>!pending.has(id)).length);
   let found=false;
   for(const group of usable){
    const ids=[...group].sort((a,b)=>therapyPriority(b,r.urgent)-therapyPriority(a,r.urgent));
    for(const id of ids)if(treatment(id,therapyPriority(id,r.urgent),'treatment',new Set())){found=true;break;}
    if(found)break;
   }
   if(!found)errors.push('no-executable-treatment-alternative');
  }else if(r.type==='reassess'){
   if(!blocking)add(action('reassess'),priority.reassess,'reassess');else waiting.push('reassessment');
  }else if(r.type==='closure'){
   if(!blocking&&requirements.every(item=>item.type==='closure'))add(action('closure',r.destination||destination),priority.closure,'closure');
  }else if(r.type==='wait')waiting.push(r.reason||'execution');
 }
 if(!requirements.length&&!blocking)add(action('closure',destination),priority.closure,'closure');
 const next=candidates.sort((a,b)=>b.priority-a.priority)[0];
 if(next)return {text:next.action.text,action:next.action,chargeable:true,
  key:semanticHintKey(next.action,p,c),requirement:next.requirement,severity:severity.state};
 if(waiting.length||blocking){
  const reason=p.pendingConsults?.length?'receiver':requested.size?'study':waiting.includes('observation')?'observation':'execution';
  const a=action('wait',reason);return {text:a.text,action:a,key:'wait:'+reason,chargeable:false};
 }
 return {text:'No hay una pista ejecutable disponible para este estado. No se descontó XP.',action:null,key:null,
  chargeable:false,error:errors.length?errors.join(','):'unmapped-clinical-requirement'};
}

export function clinicalHintCoverage(content){
 const cases=[],errors=[];
 for(const c of content.cases){
  const rule=clinicalClosureRule(c),ids=[...new Set([
   ...(rule?.treatment||[]).flat(),...Object.values(rule?.treatmentByDestination||{}).flat(2),
   ...(rule?.dischargeTreatments||[]),...antimicrobialRegimens487(c).flat()
  ])];
  const context={caseData:c,content,patient:{uid:'coverage',caseId:c.id,treatments:[],orders:[],administrationLog:[],procedures:{},liveVitals:{}},clock:{nativeMinute:0,clinicalMinute:0}};
  for(const id of ids)if(!clinicalActionDescriptor('treatment',id,context))errors.push(c.id+':treatment:'+id);
  for(const id of [...(rule?.requiredStudies||[]),...(rule?.study||[]).flat()])
   if(!clinicalActionDescriptor('study',id,context))errors.push(c.id+':study:'+id);
  for(const id of rule?.requiredExams||[])if(!clinicalActionDescriptor('examination',id,context))errors.push(c.id+':exam:'+id);
  for(const id of rule?.destinations||[])if(!clinicalActionDescriptor('closure',id,context))errors.push(c.id+':closure:'+id);
  cases.push({caseId:c.id,treatments:ids,destinations:rule?.destinations||[]});
 }
 return {cases,errors};
}
