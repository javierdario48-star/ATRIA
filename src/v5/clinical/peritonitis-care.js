import {createAcuteCare} from './acute-care.js';
import {csPeritonitisEvaluate487} from '../../clinical/peritonitis-pathways.js';
import {csDxMatchesCase487} from '../../clinical/diagnostic-impression-487.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {initialPeritonitisVitals,initializeNativePeritonitis,advancePeritonitisVitals,
 applyConfirmedSepsisAdministration487,confirmedSepsisView487} from './native-peritonitis.js';
export function peritonitisClosureSnapshot(p,c,cases=[c]){
 const view=confirmedSepsisView487(p,p.phys.lastNativeMinute);
 return {caseId:c.id,diagnosis:p.diagnosis,diagnosticCompatible:csDxMatchesCase487(cases,c.id,p.diagnosis),
  historyCount:p.intentHistory.length,examDone:p.examDone,examRegionsCount:Object.keys(p.examFindings||{}).length,
  vitalsKnown:!!p.lastVitalsKnown,studiesDone:p.orders.filter(x=>x.status==='done').map(x=>x.id),
  studyResults:Object.fromEntries(p.orders.filter(x=>x.status==='done').map(x=>[x.id,x.result])),
  administered:[...view.monitorTherapies.keys()],consultsDone:p.consults.filter(x=>x.status==='done'&&x.accepted).map(x=>x.id),
  sys:p.liveVitals.sys,initialSys:initialPeritonitisVitals(c).sys,spo2:p.liveVitals.spo2,
  patientDied:!!p.patientDied,caseEnded:p.caseEnded,sourceControlled:p.phys.sourceControlled};
}
/** Numeric V19 quality followed by the effective peritonitis safe-handoff
 * correction. Eligibility is exclusively csPeritonitisEvaluate487. The shared
 * V5 adverse-event deduction preserves clinical freedom with consequences.
 */
export function peritonitisClosureQuality487(p,c,snapshot,destination,safeHandoff){
 const delivered=new Set(snapshot.administered),historyAnswered=new Set(p.intentHistory.map(x=>x.id));
 const started=c.keyInterventions.some(id=>delivered.has(id));
 let diagnosis=snapshot.diagnosticCompatible?15:0;
 let history=Math.round(15*c.requiredHistory.filter(id=>historyAnswered.has(id)).length/Math.max(1,c.requiredHistory.length));
 let safety=Math.min(25,(snapshot.vitalsKnown?8:0)+(p.examDone?7:0)+(started?(p.reassessments>0?5:2):0)+(destination?5:0));
 let studies=Math.round(15*c.keyStudies.filter(id=>snapshot.studiesDone.includes(id)).length/Math.max(1,c.keyStudies.length));
 let treatment=c.keyInterventions.length?Math.round(25*c.keyInterventions.filter(id=>delivered.has(id)).length/c.keyInterventions.length):25;
 const extraStudies=p.orders.filter(x=>!c.keyStudies.includes(x.id)).length,extraStudyPenalty=Math.min(5,extraStudies);
 const efficiency=5-extraStudyPenalty,adversePenalty=Math.min(20,confirmedClinicalMissteps(p,c).adverseCount*5);
 if(safeHandoff){diagnosis=15;history=Math.max(history,10);safety=Math.max(safety,20);studies=Math.max(studies,12);treatment=Math.max(treatment,20);}
 const subtotal=diagnosis+history+safety+studies+treatment+efficiency-adversePenalty;
 const score=p.patientDied?Math.min(20,Math.max(0,subtotal)):
  safeHandoff?Math.max(70,Math.min(100,subtotal)):Math.max(0,Math.min(69,subtotal));
 return {score,diagnosis,history,safety,studies,treatment,efficiency,
  penalty:adversePenalty+extraStudyPenalty,extraStudies,extraStudyPenalty,
  handoffCredit:safeHandoff?score-subtotal:0};
}
export function createPeritonitisCare(p,c,options){
 if(c.id!=='PERI-SEC-001')throw Error('only secondary peritonitis executor is connected');
 return createAcuteCare(p,c,options,{
  initialVitals:initialPeritonitisVitals,initialize:initializeNativePeritonitis,
  advanceVitals:advancePeritonitisVitals,onAdministration:applyConfirmedSepsisAdministration487,
  evaluate(patient,caseData,destination){
   const snapshot=peritonitisClosureSnapshot(patient,caseData,options.cases),out=csPeritonitisEvaluate487(snapshot);
   const correct=out.ready&&out.action===destination;
   out.quality=peritonitisClosureQuality487(patient,caseData,snapshot,destination,correct);
   if(out.ready&&!correct){out.ready=false;out.action=null;out.missing.push('Elegir el destino que corresponde al estado clínico: '+out.label+'.');}
   return out;
  },
  reassessmentMessage:patient=>'Reevaluación: FC '+Math.round(patient.liveVitals.hr)+', PA '+Math.round(patient.liveVitals.sys)+'/'+Math.round(patient.liveVitals.dia)+'. Continuar vigilancia y coordinación con el equipo receptor.',
  closureMessage:receipt=>'Derivación a quirófano confirmada. El control del foco se realizará allí. '+receipt.quality.score+'/100 · +'+receipt.xp+' XP.'
 });
}
