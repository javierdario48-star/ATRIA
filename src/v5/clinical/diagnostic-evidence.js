// Read-only clinical evidence shared by closure, mentor and debrief. A
// physician examination remains an examination, never a fabricated lab order.
import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
import {isPhysicianExamStudy} from './exam-contract.js';

export function physicianExaminationsPerformed(p){
 return Object.entries(p.examFindings||{}).flatMap(([region,methods])=>
  Object.entries(methods).filter(([,entry])=>entry.patientUid===p.uid&&
   typeof entry.eventId==='string'&&entry.eventId&&entry.rows?.length)
   .map(([technique])=>region+':'+technique));
}
export function diagnosticRequirements(c){
 return {studies:(c.keyStudies||[]).filter(id=>!isPhysicianExamStudy(id)),
  examinations:GASTRO_CASE_RULES[c.id]?.requiredExams||[]};
}
