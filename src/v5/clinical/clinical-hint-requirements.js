import {clinicalExecutorFor} from '../content/clinical-cases.js';
import {choleClosureSnapshot} from './chole-care.js';
import {pancClosureSnapshot} from './panc-care.js';
import {cholangitisClosureSnapshot} from './cholangitis-care.js';
// Read-only requirement projection. Declarative V5 gates report their own
// requirements. Characterized legacy gates are queried with evidence snapshots;
// neither the real patient nor the legacy evaluator is modified.
import {CASE_CLOSURE_RULES_487,csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {PERITONITIS_IDS_V487,csPeritonitisEvaluate487} from '../../clinical/peritonitis-pathways.js';
import {additionalCaseClosureSnapshot} from './additional-case-care.js';
import {appClosureSnapshot} from './app-care.js';
import {closureSnapshot} from './cirr-care.js';
import {peritonitisClosureSnapshot} from './peritonitis-care.js';
import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
import {antimicrobialRegimens487} from './antimicrobial-regimens-487.js';
import {isNativeMedicine} from './native-medications.js';
import {hasRecordedVitals} from './observations.js';

export const clinicalClosureRule=c=>c.clinicalPolicy?.closure||GASTRO_CASE_RULES[c.id]||CASE_CLOSURE_RULES_487[c.id];
const unique=items=>[...new Set(items)];
function legacyProjection(p,c){
 const peritonitis=PERITONITIS_IDS_V487.includes(c.id),rule=clinicalClosureRule(c);
 const snapshots={cirr:closureSnapshot,app:appClosureSnapshot,chole:choleClosureSnapshot,panc:pancClosureSnapshot,cholangitis:cholangitisClosureSnapshot,additional:additionalCaseClosureSnapshot,peritonitis:peritonitisClosureSnapshot};
 const snapshot=snapshots[clinicalExecutorFor(c)](p,c);
 const evaluate=peritonitis?csPeritonitisEvaluate487:csEvaluateClosure487;
 const medicines=unique([...(c.interventions||[]).map(x=>x.id),...antimicrobialRegimens487(c).flat(),
  'fluid','vasopressor','oxygen']).filter(id=>isNativeMedicine(id)||id==='oxygen'||c.interventions.some(x=>x.id===id));
 const fulfilled=peritonitis?snapshot.administered:snapshot.delivered;
 const full=evaluate({...snapshot,vitalsKnown:true,examDone:true,examRegionsCount:2,historyCount:1,
  historyAnswered:[...(c.requiredHistory||[]),'anamnesis:reason'],diagnosis:c.dx[0],diagnosticCompatible:true,
  studiesDone:c.studies.map(s=>s.id),administered:medicines,delivered:medicines,
  consultsDone:['cirugia','uti','gastro']});
 return {snapshot,evaluate,rule,medicines,fulfilled,destination:full.action||rule?.destinations[0]};
}
export function hintDestination(p,c,readiness){
 const rule=clinicalClosureRule(c);
 if(!rule)return legacyProjection(p,c).destination;
 const allowed=rule.destinations;
 if(!readiness||allowed.length===1)return allowed[0];
 return allowed.find(destination=>{
  const assessment=readiness(destination);
  return assessment&&!assessment.requirements?.some(r=>r.type==='stability')&&
   !assessment.missing?.some(message=>/signos vitales inestables|shock o hipoxemia grave|estabilización antes de internar/i.test(message));
 })||allowed[0];
}
function legacyRequirements(p,c,destination){
 const {snapshot,evaluate,rule,medicines,fulfilled}=legacyProjection(p,c);
 snapshot.disposition=destination;
 const baseline=evaluate(snapshot),byGate=new Map();
 function probe(patch,descriptor){
  const out=evaluate({...snapshot,...patch});
  for(const gate of baseline.missing.filter(message=>!out.missing.includes(message))){
   const previous=byGate.get(gate);
   if(previous?.type===descriptor.type&&descriptor.anyOf)previous.anyOf.push(...descriptor.anyOf);
   else if(!previous)byGate.set(gate,{...descriptor,...(descriptor.anyOf?{anyOf:[...descriptor.anyOf]}:{})});
  }
 }
 probe({vitalsKnown:true},{type:'vitals'});
 probe({examDone:true,examRegionsCount:2},{type:'examination',ids:[]});
 probe({historyCount:1,historyAnswered:unique([...(snapshot.historyAnswered||[]),...(c.requiredHistory||[]),'anamnesis:reason'])},{type:'history'});
 probe({diagnosis:c.dx[0],diagnosticCompatible:true},{type:'diagnosis'});
 probe({reassessments:1},{type:'reassess'});
 for(const s of c.studies)probe({studiesDone:unique([...snapshot.studiesDone,s.id])},{type:'study',anyOf:[[s.id]]});
 // Multi-drug alternatives come from existing case contracts. The peritonitis
 // owner additionally accepts authored coverage sets; probe them rather than
 // duplicating its acceptance predicates or messages in this adapter.
 const groups=rule?.treatment?.length?rule.treatment:
  [...medicines.map(id=>[id]),...antimicrobialRegimens487(c)];
 for(const group of groups)probe({delivered:unique([...fulfilled,...group]),administered:unique([...fulfilled,...group])},
  {type:'treatment',anyOf:[group]});
 for(const id of ['fluid','vasopressor','transfusion','oxygen'])
  probe({delivered:unique([...fulfilled,id]),administered:unique([...fulfilled,id])},{type:'treatment',anyOf:[[id]],urgent:true});
 probe({consultsDone:unique([...(snapshot.consultsDone||[]),...Object.values(rule?.consult||{}).flat(),'cirugia','uti','gastro'])},
  {type:'closure',destination});
 return [...byGate.values()].map(r=>r.anyOf?{...r,anyOf:unique(r.anyOf.map(g=>JSON.stringify(g))).map(g=>JSON.parse(g))}:r);
}
export function clinicalHintRequirements(p,c,assessment,destination=hintDestination(p,c)){
 if(!p||p.caseEnded||p.patientDied)return [];
 const requirements=assessment?.requirements?structuredClone(assessment.requirements):legacyRequirements(p,c,destination);
 // These requirements are added by the existing care/session wrapper, after
 // its case evaluator. Read that verdict rather than reimplementing its gate.
 if(assessment?.missing?.some(s=>/^Esperar/.test(s)&&/pendientes|tareas físicas|ejecución o resolución/.test(s)))requirements.push({type:'wait'});
 return hasRecordedVitals(p)?requirements.filter(r=>r.type!=='reassess'):requirements;
}

// The same typed gates drive hints and the player-facing checklist. Activity
// distinguishes an untouched stage from one whose requirements are still open.
export const CHECKLIST_PRIORITY=Object.freeze({
 vitals:100,history:80,examination:75,study:70,diagnosis:60,treatment:50,reassess:20,closure:10
});

export function clinicalChecklist(patient,requirements,ready,activeReaction=false){
 const closed=!!(patient.caseEnded||patient.patientDied||patient.closure?.closed);
 const pending=(...types)=>requirements.some(r=>types.includes(r.type));
 const stage=(activity,...types)=>closed||!pending(...types)?'done':activity?'partial':'pending';
 const stabilization=stage(hasRecordedVitals(patient),'vitals','reassess','stability');
 return {
  history:stage(patient.intentHistory?.length,'history'),
  exam:stage(Object.keys(patient.examFindings||{}).length,'examination'),
  studies:stage(patient.orders?.length,'study'),
  stabilization:activeReaction||pending('stability')?'attention':stabilization,
  diagnosis:stage(patient.diagnosis,'diagnosis'),
  treatment:stage(patient.treatments?.length||patient.pendingTreatments?.length||patient.administrationLog?.length,'treatment'),
  destination:closed?'done':ready?'ready':'pending'
 };
}

/**
 * Read-only audit of the closure verdict shared with Vega. This does not
 * classify clinical necessity or change eligibility: unresolved descriptors
 * are reported for review instead of being silently treated as optional.
 */
export function auditClosureRequirements(assessment,requirements){
 const missing=assessment?.missing||[];
 const gates=requirements||[];
 const issues=[];
 for(const [index,gate] of gates.entries()){
  if(!gate||typeof gate.type!=='string'||!gate.type.trim())
   issues.push({code:'untyped-gate',index});
  else if(['study','treatment'].includes(gate.type)&&
   (!Array.isArray(gate.anyOf)||!gate.anyOf.some(group=>Array.isArray(group)&&group.length&&group.every(id=>typeof id==='string'&&id.length))))
   issues.push({code:'missing-action-alternatives',index,type:gate.type});
  else if(gate.type==='closure'&&!gate.destination)
   issues.push({code:'missing-destination',index});
 }
 if(assessment?.ready===false&&missing.length&&!gates.length)
  issues.push({code:'unrepresented-blockers',count:missing.length});
 // NPO is not presumed indispensable: its necessity needs a case-level
 // clinical review before it can be accepted as a blocking treatment.
 for(const [index,gate] of gates.entries()){
  const alternatives=gate?.type==='treatment'&&Array.isArray(gate.anyOf)?
   gate.anyOf.filter(group=>Array.isArray(group)&&group.length):[];
  if(alternatives.some(group=>group.includes('npo')))
   issues.push({code:'npo-necessity-review',index,
    unavoidable:alternatives.every(group=>group.includes('npo'))});
 }
 return {ready:assessment?.ready===true,missing:[...missing],issues};
}
