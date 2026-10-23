// Read-only presentation of confirmed clinical progress; no XP or care readiness.
// Deliberately avoids using hidden case IDs or the evaluator's correct diagnosis.
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function recordedExam(p){return Object.values(p.examFindings||{}).some(x=>Object.keys(x).length)||!!p.glasgow?.eye;}
function consulted(p,id){return [...(p.consults||[]),...(p.pendingConsults||[])].some(x=>x.id===id);}
export function clinicalWorkflow(state){
 const p=state?.patient;if(!p)return null;
 const assessed=!!p.intentHistory?.length;
 const examined=recordedExam(p);
 const studies=(p.orders||[]).some(o=>o.status==='done');
 const waiting=(p.orders||[]).some(o=>o.status!=='done');
 const monitored=!!p.lastVitalsKnown||!!p.procedures?.monitor?.connected;
 const vital=p.lastVitalsKnown?.vitals||null;
 const unstable=!!vital&&(vital.sys<90||vital.spo2<90||vital.hr>140);
 const diagnosis=String(p.diagnosis||'').trim();
 const therapy=(p.treatments||[]).length>0||(p.administrationLog||[]).length>0;
 const treatmentWaiting=(p.pendingTreatments||[]).length>0||(p.pendingConsults||[]).length>0;
 const options=state.eligibleDestinations||[];
 const ended=!!p.caseEnded||!!p.patientDied||!!p.closure?.closed;
 const surgicalImpression=/apendicit|perforaci|peritonitis secundaria|foco quirurg|abdomen agudo quirurg|isquemia intestinal|obstruccion quirurg/.test(normalize(diagnosis));
 const steps=[
  {id:'history',label:'Anamnesis',status:assessed?'partial':'pending'},
  {id:'exam',label:'Examen físico',status:p.examDone?'done':examined?'partial':'pending'},
  {id:'studies',label:'Estudios',status:studies||waiting?'partial':'pending'},
  {id:'stabilization',label:'Estabilización',status:unstable?'attention':monitored?'review':'pending'},
  {id:'diagnosis',label:'Impresión diagnóstica',status:diagnosis?'done':'pending'},
  {id:'treatment',label:'Tratamiento',status:therapy&&options.length?'done':therapy||treatmentWaiting?'partial':'pending'},
  {id:'destination',label:'Destino',status:ended?'done':options.length?'ready':'pending'}
 ];
 let cue=null;
 if(!ended){
  if(unstable)cue={id:'unstable',text:'Doctor, los signos registrados siguen comprometidos. ¿Qué hacemos?'};
  else if(!diagnosis&&(assessed||examined||studies||therapy))cue={id:'diagnosis',text:'Doctor, ya tenemos información del paciente. ¿Cuál es su impresión diagnóstica?'};
  else if(diagnosis&&surgicalImpression&&!consulted(p,'cirugia'))
   cue={id:'surgery:'+normalize(diagnosis),text:'Doctor, según su impresión diagnóstica, ¿quiere que avise a cirugía?'};
  else if(diagnosis&&options.length)cue={id:'disposition',text:'Doctor, ya podemos definir cómo continúa el cuidado. ¿Qué destino indica?'};
  else if(diagnosis&&!therapy&&!treatmentWaiting)cue={id:'plan:'+normalize(diagnosis),text:'Doctor, ya tenemos su impresión diagnóstica. ¿Cómo continuamos el tratamiento?'};
  else if(diagnosis&&therapy&&!options.length&&!treatmentWaiting)cue={id:'reassess',text:'Doctor, ya hay intervenciones registradas. ¿Cómo seguimos con la reevaluación?'};
 }
 return {steps,cue,diagnosisRecorded:!!diagnosis,unstable,closed:ended};
}
