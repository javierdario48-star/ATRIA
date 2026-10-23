// Compact V4 scoring breakdown adapted to confirmed V5 closure receipts.
// It NEVER computes or awards XP. The V4 quality evaluator remains the owner.
import {confirmedClinicalMissteps} from './clinical-risk.js';
// Confirmed gaps are revealed only inside the final case result.
function conciseMissing(p,c,q){
 const answered=new Set((p.intentHistory||[]).map(x=>x.id));
 const studies=new Set((p.orders||[]).filter(x=>x.status==='done').map(x=>x.id));
 const performed=new Set((p.administrationLog||[]).filter(x=>x.status!=='pending'&&x.action!=='stop').map(x=>x.id));
 // Native C2 and APP treatments record an executed sourceEventId, not a status.
 for(const x of p.treatments||[])if(x?.sourceEventId&&x?.patientUid===p.uid)performed.add(x.id);
 const label=(items,id)=>items?.find(x=>x.id===id)?.label||
  items?.find(x=>x.id===id)?.reveal||id;
 const gaps=[];
 if((q.diagnosis||0)<15||q.diagnosticFactor<1)
  gaps.push('Precisar la impresión diagnóstica según los hallazgos.');
 const tx=(c.keyInterventions||[]).filter(x=>!['source_control','surgery'].includes(x)&&!performed.has(x));
 if((q.treatment||0)<25&&tx.length)
  gaps.push('Tratamiento: '+tx.slice(0,2).map(id=>label(c.interventions,id)).join(' y ')+'.');
 const labs=(c.keyStudies||[]).filter(x=>!studies.has(x));
 if((q.studies||0)<15&&labs.length)
  gaps.push('Estudios: '+labs.slice(0,2).map(id=>label(c.studies,id)).join(' y ')+'.');
 const hist=(c.requiredHistory||[]).filter(x=>!answered.has(x));
 if((q.history||0)<15&&hist.length)
  gaps.push('Anamnesis: '+hist.slice(0,2).map(id=>label(c.intents,id)).join(' y ')+'.');
 const examination=[!p.examDone?'Examen físico dirigido':null,
  !p.lastVitalsKnown?'signos vitales':null,
  !p.reassessments?'reevaluación':null].filter(Boolean);
 if((q.safety||0)<25&&examination.length)gaps.push(examination.join(' · ')+'.');
 return gaps.slice(0,3);
}
const labels={diagnosis:'Impresión diagnóstica',history:'Anamnesis',
 safety:'Evaluación y reevaluación',studies:'Estudios relevantes',
 treatment:'Tratamiento y destino',efficiency:'Uso eficiente de recursos'};
export function createClosureDebrief(p,c,q){
 if(!q||!Number.isFinite(q.score))throw Error('confirmed quality required for debrief');
 const earned=['diagnosis','history','safety','studies','treatment']
  .map(id=>({label:labels[id],points:q[id]||0}));
 earned.push({label:labels.efficiency,points:5});
 if(q.handoffCredit)earned.push({label:'Continuidad del cuidado',points:q.handoffCredit});
 const extraDeduction=q.extraStudyPenalty??Math.min(5,Math.max(0,q.extraStudies||0)*2);
 const iatrogenicDeduction=Math.max(0,(q.penalty||0)-extraDeduction);
 const diagnosisPenalty=Math.max(0,q.diagnosticPenalty||0);
 const partialScorePenalty=Math.max(0,q.partialScorePenalty||0);
 const deductions=[
  ...(partialScorePenalty?[{label:'Límite de puntuación por atención parcial',points:-partialScorePenalty}]:[]),
  ...(diagnosisPenalty?[{label:'Ajuste por precisión diagnóstica (factor '+q.diagnosticFactor+')',points:-diagnosisPenalty}]:[]),
  ...(extraDeduction?[{label:'Estudios innecesarios',points:-extraDeduction}]:[]),
  ...(iatrogenicDeduction?[{label:'Efectos adversos confirmados',points:-iatrogenicDeduction}]:[])];
 const missing=conciseMissing(p,c,q);
 const adverse=confirmedClinicalMissteps(p,c);
 const unnecessary=[
  ...((q.extraStudies||0)>0?[q.extraStudies+' estudios ajenos a la indicación principal']:[]),
  ...adverse.flags];
 const computed=earned.reduce((sum,x)=>sum+x.points,0)+
  deductions.reduce((sum,x)=>sum+x.points,0);
 if(computed!==q.score)throw Error('debrief cannot disagree with native closure score');
 return {schema:'atria.v5.closure-debrief.v1',score:q.score,
  earned,deductions,missing,unnecessary};
}
