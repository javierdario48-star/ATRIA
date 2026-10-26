// V5-only GI disposition extension. No edits to the characterized V4
// handoff evaluator. XP quality is the ORIGINAL csClosureQuality487 calculator.
// The shared shift/actor authority still owns final receipts exactly once.
import {csClosureQuality487} from '../../clinical/case-completion-487.js';
import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function evaluateGastroDisposition(a={}){
 const rule=GASTRO_CASE_RULES[a.caseId];if(!rule)return null;
 const done=new Set(a.delivered||[]),studies=new Set(a.studiesDone||[]),missing=[];
 const target=a.disposition||rule.destinations[0];
 const matched=(a.acceptedDiagnoses||[]).some(x=>norm(a.diagnosis).includes(norm(x)));
 const critical=Number(a.initialSys||120)<90||Number(a.sys||120)<90;
 if(a.dead||a.ended)return {caseId:a.caseId,ready:false,missing:['Atención finalizada.'],action:null};
 if(!a.vitalsKnown)missing.push('Registrar signos vitales.');
 if(!a.examDone&&Number(a.examRegionsCount||0)<2)missing.push('Completar examen físico dirigido.');
 if(!matched)missing.push('Registrar un diagnóstico presuntivo compatible.');
 const contextual=['anamnesis:reason','anamnesis:pmh','anamnesis:allergies','anamnesis:meds'];
 const history=(a.historyAnswered||[]).filter(x=>(a.historyRelevant||[]).includes(x)||contextual.includes(x));
 if(!history.length&&!critical)missing.push('Obtener al menos un dato relevante de anamnesis.');
 const evidence=rule.study?.some(group=>group.some(id=>studies.has(id)))||false;
 if(!evidence&&!rule.urgentStudyBypass)missing.push('Completar un estudio orientador.');
 if(rule.treatment?.length&&!rule.treatment.some(group=>group.every(id=>done.has(id))))
  missing.push('Confirmar las intervenciones imprescindibles y su ejecución real.');
 if(critical&&!['fluid','vasopressor','transfusion'].some(id=>done.has(id)))
  missing.push('Iniciar soporte para la hipoperfusión.');
 if(Number(a.spo2??98)<90&&!done.has('oxygen'))missing.push('Tratar la hipoxemia.');
 if(!a.reassessments)missing.push('Reevaluar tras la intervención.');
 if(!rule.destinations.includes(target))missing.push('Destino no autorizado para este paciente.');
 const receiver=rule.consult?.[target]||[];
 if(receiver.length&&!receiver.some(id=>(a.consultsDone||[]).includes(id)))
  missing.push('Esperar aceptación documentada del servicio receptor.');
 if(target==='alta'&&(Number(a.sys)<100||Number(a.spo2)<94||Number(a.hr)>110||Number(a.rr)>24))
  missing.push('Alta no segura: signos vitales inestables.');
 if(['sala','observacion'].includes(target)&&(Number(a.sys)<90||Number(a.spo2)<90))
  missing.push('No trasladar a sala/observación con shock o hipoxemia grave.');
 const ready=!missing.length;
 return {caseId:a.caseId,ready,action:ready?target:null,destination:rule.destinations[0],
  choices:ready?[...rule.destinations]:[],missing,diagnostic:matched,
  historyCount:history.length,studiesSatisfied:evidence,procedurePerformed:false,
  quality:csClosureQuality487(a,rule,done,studies)};
}
