// Public handoff indication. It NEVER accepts the active patient case ID or
// true diagnosis as an argument; only the doctor's claim and the published
// indication catalog. This is the receptor's reusable knowledge base, not a
// shortcut to the hidden truth or a second closure/XP authority.
import {assessDiagnosticImpression} from './diagnostic-assessment.js';
import {CASE_CLOSURE_RULES_487} from '../../clinical/case-completion-487.js';
import {gastroClosureRule} from './gastro-expansion-policies.js';

const nonBlank=x=>typeof x==='string'&&x.trim().length>0;
// For older case definitions without directed-exam metadata, infer the
// *domain of assessment* from their published complaint, never patient truth.
// These are clinical categories, not case IDs or a diagnosis oracle.
function reportedExamDomain(publicCase){
 const text=String(publicCase.chief||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/abdom|hipocond|fosa iliaca|flanco|melena|hematemes|vomit|ascitis/.test(text))return ['abdomen:palpation'];
 if(/disnea|torac|tos|expector|sibilanc|pulmon|respira/.test(text))return ['thorax:auscultation'];
 if(/convuls|afasia|paresia|paralisis|neurolog|cefalea|conciencia|confusion/.test(text))
  return ['neurological:neurological'];
 return [];
}
function ruleFor(publicCase){
 return publicCase.clinicalPolicy?.closure||gastroClosureRule(publicCase.id)||
  CASE_CLOSURE_RULES_487[publicCase.id]||null;
}
function publicServices(rule,destination){
 const declared=rule?.consult?.[destination];
 if(Array.isArray(declared)&&declared.length)return declared;
 // A destination without an authored accepting service is not a valid
 // public operative indication (ordinary observation and alta are local).
 return [];
}
/** Invariant: changing the hidden patient diagnosis never changes this result. */
export function publicReceiverIndication({diagnosis,destination,service,catalog}={}){
 if(!nonBlank(diagnosis))return {supported:false,reasonCode:'diagnosis-missing',matches:[]};
 if(!nonBlank(destination)||!nonBlank(service)||!Array.isArray(catalog))
  return {supported:false,reasonCode:'invalid-receiver-request',matches:[]};
 const matches=[];
 for(const published of catalog){
  if(!published||!Array.isArray(published.dx))continue;
  const candidate=assessDiagnosticImpression(published,diagnosis);
  if(!candidate.sufficient)continue;
  const rule=ruleFor(published);
  if(!rule?.destinations?.includes(destination)||!publicServices(rule,destination).includes(service))continue;
  matches.push({publicDiagnosis:published.dx[0],publicCaseId:published.id,
   specificity:candidate.level,urgentStudyBypass:rule.urgentStudyBypass===true,
   requiredExams:[...new Set([...(rule.requiredExams||[]),...(!rule.requiredExams?.length?reportedExamDomain(published):[])])],requiredStudies:[...(rule.requiredStudies||[])],
   studyAlternatives:(rule.study||[]).map(group=>[...group])});
 }
 return matches.length?{supported:true,reasonCode:null,matches}:
  {supported:false,reasonCode:'diagnosis-does-not-indicate-receiver',matches:[]};
}
/** Shared safety and documented evidence visible to the receiving service.
 * A positive indication alone never equates to complete preparation.
 */
export function publicReceiverPreparation({indication,record,destination}={}){
 if(!indication?.supported)return {ready:false,reasons:['diagnosis-does-not-indicate-receiver']};
 const missing=[];
 const v=record?.vitals||{};
 if(!record?.measured || !['sys','spo2'].every(k=>Number.isFinite(v[k])))
  missing.push('measured-vitals-required');
 if(['sala','observacion','quirofano','procedimiento'].includes(destination)&&
    (!Number.isFinite(v.sys)||v.sys<90||!Number.isFinite(v.spo2)||v.spo2<90))
  missing.push('insufficient-transfer-stabilization');
 // Require a genuine communicated examination; the claimed diagnosis can be
 // wrong but must not be just a typed word without any documented assessment.
 const exams=new Set(record?.performedExams||[]);
 if(!exams.size)missing.push('physical-examination-required');
 const reports=(record?.reports||[]).filter(x=>x.patientBound===true&&x.status==='done'&&nonBlank(x.result));
 const reported=new Set(reports.map(x=>x.id));
 const supportedByRecord=indication.matches.some(m=>{
  const oriented=!m.studyAlternatives.length||
   m.studyAlternatives.some(g=>g.some(id=>reported.has(id)));
  const required=m.requiredStudies.every(id=>reported.has(id));
  const examination=!m.requiredExams.length||m.requiredExams.every(id=>exams.has(id.replace(/^(?:lungs|heart):/,'thorax:').replace('neurological:all','neurological:neurological')));
  return (m.urgentStudyBypass||oriented)&&required&&examination;
 });
 if(!supportedByRecord)missing.push('indispensable-evidence-pending');
 if(record?.pendingRescue===true||record?.activeUnsafeReaction===true)
  missing.push('pending-critical-rescue');
 return {ready:missing.length===0,reasons:[...new Set(missing)]};
}
