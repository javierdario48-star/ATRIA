// Compact V4 scoring breakdown adapted to confirmed V5 closure receipts.
// It NEVER computes or awards XP. The V4 quality evaluator remains the owner.
import {confirmedClinicalMissteps} from './clinical-risk.js';
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
 const missing=[];
 if((q.diagnosis||0)<15||q.diagnosticFactor<1)
  missing.push('Precisar el diagnóstico presuntivo.');
 if((q.history||0)<15)missing.push('Completar anamnesis relevante y antecedentes.');
 if((q.safety||0)<25)missing.push('Completar examen, signos, reevaluación y destino.');
 if((q.studies||0)<15)missing.push('Completar los estudios pertinentes del caso.');
 if((q.treatment||0)<25)missing.push(c.id==='PERI-SEC-001'?
  'Control definitivo del foco diferido al equipo quirúrgico receptor.':'Completar las intervenciones recomendadas.');
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
