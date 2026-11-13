// V5-only GI disposition extension. No edits to the characterized V4
// handoff evaluator. XP quality is the ORIGINAL csClosureQuality487 calculator.
// The shared shift/actor authority still owns final receipts exactly once.
import {csClosureQuality487,csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {PERITONITIS_IDS_V487,csPeritonitisEvaluate487} from '../../clinical/peritonitis-pathways.js';
import {gastroClosureRule} from './gastro-expansion-policies.js';
import {hasAcuteInstability} from './clinical-risk.js';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

// Probe disposition eligibility with the legacy interview gate satisfied.
// Patient knowledge, receipts and quality still use the actual observations.
export function evaluateHistoricalGastroDisposition(snapshot){
 if(PERITONITIS_IDS_V487.includes(snapshot.caseId)){
  const actual=csPeritonitisEvaluate487(snapshot);
  if(actual.ready||snapshot.historyCount>0||snapshot.caseEnded||snapshot.patientDied)return actual;
  const disposition=csPeritonitisEvaluate487({...snapshot,historyCount:1});
  return {...disposition,historyDeferredForEmergency:actual.historyDeferredForEmergency};
 }
 const actual=csEvaluateClosure487(snapshot);
 if(!actual||actual.ready||actual.historyCount!==0)return actual;
 const disposition=csEvaluateClosure487({...snapshot,historyAnswered:[...(snapshot.historyAnswered||[]),'anamnesis:reason']});
 return {...disposition,historyCount:actual.historyCount,quality:actual.quality};
}

export function evaluateGastroDisposition(a={}){
 const rule=gastroClosureRule(a.caseId);if(!rule)return null;
 const done=new Set(a.delivered||[]),studies=new Set(a.studiesDone||[]),missing=[],requirements=[];
 const need=(type,details,message)=>{missing.push(message);requirements.push({type,...details});};
 const target=a.disposition||rule.destinations[0];
 const matched=a.diagnosticAssessment?.sufficient??(a.acceptedDiagnoses||[]).some(x=>norm(a.diagnosis).includes(norm(x)));
 const critical=Number(a.initialSys||120)<90||Number(a.sys||120)<90;
 if(a.dead||a.ended)return {caseId:a.caseId,ready:false,missing:['Atención finalizada.'],action:null};
 if(!a.vitalsKnown)need('vitals',{},'Registrar signos vitales.');
 if(!a.examDone&&Number(a.examRegionsCount||0)<2)need('examination',{ids:rule.requiredExams||[]},'Completar examen físico dirigido.');
 if(!matched)need('diagnosis',{},'Registrar un diagnóstico presuntivo compatible.');
 const contextual=['anamnesis:reason','anamnesis:pmh','anamnesis:allergies','anamnesis:meds',
  'anamnesis:surgeries','anamnesis:familyHistory'];
 const history=(a.historyAnswered||[]).filter(x=>(a.historyRelevant||[]).includes(x)||contextual.includes(x));
 const examined=new Set(a.examPerformed||[]),requiredExams=rule.requiredExams||[];
 for(const id of requiredExams)if(!examined.has(id))need('examination',{ids:[id]},'Completar la exploración dirigida: '+(id==='perineum:rectal'?'tacto rectal':id)+'.');
 const evidence=rule.study?.length?rule.study.some(group=>group.some(id=>studies.has(id))):
  requiredExams.length>0&&requiredExams.every(id=>examined.has(id));
 if(rule.study?.length&&!evidence&&!rule.urgentStudyBypass)need('study',{anyOf:rule.study.flat().map(id=>[id])},'Completar un estudio orientador.');
 for(const id of rule.requiredStudies||[])
  if(!studies.has(id))need('study',{anyOf:[[id]]},'Revisar estudio imprescindible '+id+' antes de cerrar el caso.');
 const treatment=rule.treatmentByDestination?.[target]??rule.treatment;
 const essential=target==='alta'?treatment?.map(group=>group.filter(id=>id!=='followup')):treatment;
 if(essential?.length&&!essential.some(group=>group.every(id=>done.has(id))))
  need('treatment',{anyOf:essential},'Confirmar las intervenciones imprescindibles y su ejecución real.');
 const dischargeTreatment=(rule.dischargeTreatments||[]).filter(id=>id!=='followup');
 if(target==='alta'&&dischargeTreatment.some(id=>!done.has(id)))
  need('treatment',{anyOf:[dischargeTreatment]},'Completar las intervenciones imprescindibles para el alta.');
 if(critical&&!['fluid','vasopressor','transfusion'].some(id=>done.has(id)))
  need('treatment',{anyOf:[['fluid'],['vasopressor'],['transfusion']],urgent:true},'Iniciar soporte para la hipoperfusión.');
 if(Number(a.spo2??98)<90&&!done.has('oxygen'))need('treatment',{anyOf:[['oxygen']],urgent:true},'Tratar la hipoxemia.');
 if(!a.reassessments)need('reassess',{},'Reevaluar tras la intervención.');
 if(!rule.destinations.includes(target))missing.push('Destino no autorizado para este paciente.');
 if(rule.unstableTransferDestinations?.includes(target)&&!hasAcuteInstability(a))
  need('stability',{reason:'destination-not-indicated'},'Con la evolución actual no hay indicación de traslado a este destino.');
 const receiver=rule.consult?.[target]||[];
 if(receiver.length&&!receiver.some(id=>(a.consultsDone||[]).includes(id)))
  need('closure',{destination:target},'Esperar aceptación documentada del servicio receptor.');
 if(target==='alta'&&(Number(a.sys)<100||Number(a.spo2)<94||Number(a.hr)>110||Number(a.rr)>24))
  need('stability',{},'Alta no segura: signos vitales inestables.');
 if(['sala','observacion'].includes(target)&&(Number(a.sys)<90||Number(a.spo2)<90))
  need('stability',{},'No trasladar a sala/observación con shock o hipoxemia grave.');
 const ready=!missing.length;
 // The original quality calculator has one diagnostic-evidence slot named
 // 'studies'. Adapt real required physician observations into that slot;
 // this never adds an order/result or creates another quality/XP calculator.
 const examEvidence=requiredExams.map(id=>'exam:'+id),
  qualityInput={...a,acceptedDiagnoses:matched?[...(a.acceptedDiagnoses||[]),a.diagnosis]:a.acceptedDiagnoses,
   keyInterventions:[...new Set([...(a.keyInterventions||[]),...(target==='alta'?rule.dischargeTreatments||[]:[])])],
   keyStudies:[...(a.keyStudies||[]),...examEvidence]},
  qualityEvidence=new Set([...studies,...requiredExams.filter(id=>examined.has(id)).map(id=>'exam:'+id)]);
 return {caseId:a.caseId,ready,action:ready?target:null,destination:rule.destinations[0],
  choices:ready?[...rule.destinations]:[],missing,requirements,fulfilledTreatmentIds:[...done],diagnostic:matched,
  historyCount:history.length,studiesSatisfied:evidence,procedurePerformed:false,
  quality:csClosureQuality487(qualityInput,rule,done,qualityEvidence)};
}
