// V5-only GI disposition extension. No edits to the characterized V4
// handoff evaluator. XP quality is the ORIGINAL csClosureQuality487 calculator.
// The shared shift/actor authority still owns final receipts exactly once.
import {csClosureQuality487} from '../../clinical/case-completion-487.js';
import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function evaluateGastroDisposition(a={}){
 const rule=GASTRO_CASE_RULES[a.caseId];if(!rule)return null;
 const done=new Set(a.delivered||[]),studies=new Set(a.studiesDone||[]),missing=[],requirements=[];
 const need=(type,details,message)=>{missing.push(message);requirements.push({type,...details});};
 const target=a.disposition||rule.destinations[0];
 const matched=a.diagnosticAssessment?.sufficient??(a.acceptedDiagnoses||[]).some(x=>norm(a.diagnosis).includes(norm(x)));
 const critical=Number(a.initialSys||120)<90||Number(a.sys||120)<90;
 if(a.dead||a.ended)return {caseId:a.caseId,ready:false,missing:['Atención finalizada.'],action:null};
 if(!a.vitalsKnown)need('vitals',{},'Registrar signos vitales.');
 if(!a.examDone&&Number(a.examRegionsCount||0)<2)need('examination',{ids:rule.requiredExams||[]},'Completar examen físico dirigido.');
 if(!matched)need('diagnosis',{},'Registrar un diagnóstico presuntivo compatible.');
 const contextual=['anamnesis:reason','anamnesis:pmh','anamnesis:allergies','anamnesis:meds'];
 const history=(a.historyAnswered||[]).filter(x=>(a.historyRelevant||[]).includes(x)||contextual.includes(x));
 if(!history.length&&!critical)need('history',{},'Obtener al menos un dato relevante de anamnesis.');
 const examined=new Set(a.examPerformed||[]),requiredExams=rule.requiredExams||[];
 for(const id of requiredExams)if(!examined.has(id))need('examination',{ids:[id]},'Completar la exploración dirigida: '+(id==='perineum:rectal'?'tacto rectal':id)+'.');
 const evidence=rule.study?.length?rule.study.some(group=>group.some(id=>studies.has(id))):
  requiredExams.length>0&&requiredExams.every(id=>examined.has(id));
 if(rule.study?.length&&!evidence&&!rule.urgentStudyBypass)need('study',{anyOf:rule.study.flat().map(id=>[id])},'Completar un estudio orientador.');
 for(const id of rule.requiredStudies||[])
  if(!studies.has(id))need('study',{anyOf:[[id]]},'Revisar estudio imprescindible '+id+' antes de cerrar el caso.');
 if(rule.treatment?.length&&!rule.treatment.some(group=>group.every(id=>done.has(id))))
  need('treatment',{anyOf:rule.treatment},'Confirmar las intervenciones imprescindibles y su ejecución real.');
 if(target==='alta'&&(rule.dischargeTreatments||[]).some(id=>!done.has(id)))
  need('treatment',{anyOf:[rule.dischargeTreatments]},'Documentar un plan de seguimiento y signos de alarma antes del alta.');
 if(critical&&!['fluid','vasopressor','transfusion'].some(id=>done.has(id)))
  need('treatment',{anyOf:[['fluid'],['vasopressor'],['transfusion']],urgent:true},'Iniciar soporte para la hipoperfusión.');
 if(Number(a.spo2??98)<90&&!done.has('oxygen'))need('treatment',{anyOf:[['oxygen']],urgent:true},'Tratar la hipoxemia.');
 if(!a.reassessments)need('reassess',{},'Reevaluar tras la intervención.');
 if(!rule.destinations.includes(target))missing.push('Destino no autorizado para este paciente.');
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
  qualityInput={...a,acceptedDiagnoses:matched?[...(a.acceptedDiagnoses||[]),a.diagnosis]:a.acceptedDiagnoses,keyStudies:[...(a.keyStudies||[]),...examEvidence]},
  qualityEvidence=new Set([...studies,...requiredExams.filter(id=>examined.has(id)).map(id=>'exam:'+id)]);
 return {caseId:a.caseId,ready,action:ready?target:null,destination:rule.destinations[0],
  choices:ready?[...rule.destinations]:[],missing,requirements,fulfilledTreatmentIds:[...done],diagnostic:matched,
  historyCount:history.length,studiesSatisfied:evidence,procedurePerformed:false,
  quality:csClosureQuality487(qualityInput,rule,done,qualityEvidence)};
}
