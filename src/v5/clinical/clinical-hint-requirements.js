// Read-only requirement projection. Declarative V5 gates report their own
// requirements. Characterized legacy gates are queried with evidence snapshots;
// neither the real patient nor the legacy evaluator is modified.
import {CASE_CLOSURE_RULES_487,csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {PERITONITIS_IDS_V487,csPeritonitisEvaluate487} from '../../clinical/peritonitis-pathways.js';
import {appClosureSnapshot} from './app-care.js';
import {closureSnapshot} from './cirr-care.js';
import {peritonitisClosureSnapshot} from './peritonitis-care.js';
import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
import {antimicrobialRegimens487} from './antimicrobial-regimens-487.js';
import {isNativeMedicine} from './native-medications.js';

export const clinicalClosureRule=c=>c.clinicalPolicy?.closure||GASTRO_CASE_RULES[c.id]||CASE_CLOSURE_RULES_487[c.id];
const unique=items=>[...new Set(items)];
function legacyProjection(p,c){
 const peritonitis=PERITONITIS_IDS_V487.includes(c.id),rule=clinicalClosureRule(c);
 const snapshot=peritonitis?peritonitisClosureSnapshot(p,c):c.id==='CIRR-001'?closureSnapshot(p,c):appClosureSnapshot(p,c);
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
export function hintDestination(p,c){
 const rule=clinicalClosureRule(c);
 return rule?.destinations[0]||legacyProjection(p,c).destination;
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
 if(assessment?.missing?.some(s=>/^Reevaluar/.test(s))&&!requirements.some(r=>r.type==='reassess'))requirements.push({type:'reassess'});
 if(assessment?.missing?.some(s=>/^Esperar/.test(s)))requirements.push({type:'wait'});
 return requirements;
}
