// ATRIA 4.8.7 — concise, patient-bound Vega consultation.
// This adjusts the existing native rescue controller; no second scheduler,
// no invented test result or medication, and no relaxation of critical rescue.
const replaceSpan=(s,from,until,body,label)=>{
 const a=s.indexOf(from),b=a<0?-1:s.indexOf(until,a+from.length);
 if(a<0||b<a||s.indexOf(from,a+from.length)>=0)throw Error('Vega consult range: '+label);
 return s.slice(0,a)+body+s.slice(b);
};
const once=(s,from,to,label)=>{
 const a=s.indexOf(from);
 if(a<0||s.indexOf(from,a+from.length)>=0)throw Error('Vega consult anchor: '+label);
 return s.slice(0,a)+to+s.slice(a+from.length);
};
export function applyConciseVegaConsult487(html){
 let s=html;
 const priority=String.raw` function csVegaPriorityStudies487(){
  // Two high-yield diagnostic studies. Longer cultures or staging exams
  // remain available to the player; the tutor does not order everything.
  const first={
   'CIRR-001':['paracentesis','hepatograma'],
   'PANC-001':['lipasa','hemograma'],
   'CROHN-001':['colonoscopia','inflamatorio'],
   'HDA-001':['hda_lab','eda'],
   'COLON-001':['colonoscopia','iron'],
   'PERI-PBE-001':['pbe_paracentesis','pbe_renal'],
   'PERI-SEC-001':['peri_cbc','peri_ct','peri_gas'],
   'PERI-TER-001':['ter_ct','ter_cbc'],
   'APP-001':['app_us','app_cbc'],
   'CHOLE-001':['chole_us','chole_cbc'],
   'ILEO-001':['ileo_xray','ileo_lab'],
   'MESI-001':['mesi_cta','mesi_gas'],
   'CHOLANG-001':['cholang_liver','cholang_us']
  }[C.id]||C.keyStudies;
  return first.filter(id=>C.keyStudies.includes(id)&&C.studies.some(x=>x.id===id))
   .filter(id=>{
    const name=C.studies.find(x=>x.id===id)?.label||id;
    if(/cultiv|culture|hemocult/i.test(id+' '+name))return false;
    if(C.id==='PERI-SEC-001'&&id==='peri_ct'&&sim.examDone&&
      Number(String(C.vitals?.bp||'120').split('/')[0])<90)return false;
    return true;
   }).slice(0,2);
 }
`;
 s=replaceSpan(s,' function csVegaPriorityStudies487(){',' const csVegaInterventionComplete487=',priority,'two-diagnostic-studies');
 s=once(s,"sim.consults?.get('cirugia')?.status==='done':present(id);",
 "['done','accepted'].includes(sim.consults?.get('cirugia')?.status):present(id);",
 'accepted-surgery-consult');
 s=once(s,
 "const csVegaInterventionComplete487=id=>id==='source_control'?\n    ['done','accepted'].includes(sim.consults?.get('cirugia')?.status):present(id);",
 "const csVegaInterventionComplete487=id=>id==='iv'?Number(sim.venousAccessCount||0)>0:\n    ['source_control','surgery'].includes(id)?['done','accepted'].includes(sim.consults?.get('cirugia')?.status):present(id);",
 'access-is-real-and-all-surgical-variants-require-accepted-consult');
 const assessment=String.raw`  if(job.phase==='assessment'){
   const point=sim.patientInstance?.bed?.patient||[patient.ix,patient.iy];
   if(Math.hypot(expert.x-point[0],expert.y-point[1])>145){
    status(job,'assessment','Vega va al box','Primero evalúo al paciente.');return;
   }
   // Single examination bundle with its real exam recording, one message.
   actor(()=>{for(const tech of ['general','inspection','auscultation','percussion','palpation'])
    window.nsRecordPhysicalExam(tech)});
   if(job.participatory){urgentEmpiric(job);job.phase='learner';sim.nsVegaArrived=true;learnerTick(job);return;}
   job.phase='workup487';job.csNextStep487=now+550;
   say('Ya lo examiné. Revisaré lo que sabemos y pediré solo los estudios que cambien la conducta.');
   return;
  }
`;
 s=replaceSpan(s,"  if(job.phase==='assessment'){","  if(job.phase==='workup487'){",assessment,'silent-exam-with-one-narration');
 const workup=String.raw`  if(job.phase==='workup487'){
   if(now<(job.csNextStep487||0))return;
   const preferred=csVegaPriorityStudies487().map(id=>C.studies.find(x=>x.id===id)).filter(Boolean);
   const missing=preferred.filter(x=>!sim.orders.has(x.id));
   if(missing.length)actor(()=>{for(const st of missing)orderStudy(st,true,'Dr. Vega')});
   job.phase='results';
   say(missing.length?'Solicité '+missing.map(x=>x.label).join(' y ')+
    '. Espero esos resultados para orientar el diagnóstico presuntivo.':
    'Los estudios prioritarios ya están solicitados. Espero sus resultados.');
   return;
  }
`;
 s=replaceSpan(s,"  if(job.phase==='workup487'){","  if(job.phase==='results'){",workup,'one-workup-round');
 const results=String.raw`  if(job.phase==='results'){
   // Time-sensitive treatment must not be delayed by a diagnosis conversation.
   const critical=window.nsPatientState().color==='ROJO';
   if(critical){
    const empiric=new Set(['fluid','analgesia','npo','ngt','ppi']);
    if((sim.liveVitals?.temp||0)>=38)for(const id of
     ['ceftriaxone','metronidazole','piptazo'])empiric.add(id);
    for(const id of C.keyInterventions)if(empiric.has(id))give(job,id);
   }
   if(!csVegaPriorityStudies487().every(id=>sim.orders.get(id)?.status==='done')){
    status(job,'results','Esperando estudios','No voy a repetir las mismas órdenes.',true);
    return;
   }
   actor(()=>csSetDiagnosticImpression(C.dx[0],{echo:false}));
   if(critical){
    say('Mi diagnóstico presuntivo es '+C.dx[0]+
     '. Por la gravedad no espero: continúo el tratamiento urgente y te explico las medidas.');
    job.phase='reassessment';return;
   }
   say('Según el examen y los estudios, mi diagnóstico presuntivo es '+C.dx[0]+
    '. ¿Qué proponés hacer? Si no sabés, decime «no sé» y avanzamos paso a paso.');
   window.nsSelectChatTarget487?.('expert',{auto:true});
   job.csDecisionAt487=now;job.phase='decision487';return;
  }
  if(job.phase==='decision487'){
   if(window.nsPatientState().color==='ROJO'||immediateDanger(window.nsPatientState())){
    say('Está empeorando. Intervengo ya; después discutimos la conducta.');
    job.phase='reassessment';return;
   }
   if(now-(job.csDecisionAt487||now)>=16000){
    say('Para no demorar el caso, voy a iniciar una medida por vez. Podés intervenir cuando quieras.');
    job.phase='reassessment';
   }
   return;
  }
`;
 s=replaceSpan(s,"  if(job.phase==='results'){","  if(job.phase==='reassessment'){",results,'diagnosis-awaits-answer');
 // Keep the original reassessment physiology/outcome algorithm; replace
 // just its repetitive per-drug Q&A with bounded sequential execution.
 const therapy=String.raw`   // One native intervention per stable tick; critical cases start all
   // available urgent measures without a chat question for each drug.
   const urgent=window.nsPatientState().color==='ROJO';
   // In shock, queue independent time-critical measures in parallel.
   // A stable patient waits for each real administration before the next.
   if(sim.pendingTherapies?.size&&!urgent){
     status(job,'administration','Tratamiento en curso','Esperando administración real.',true);return;
   }
   const targets=C.keyInterventions.filter(id=>id!=='iv'&&!csVegaInterventionComplete487(id));
   if(targets.length){
     if(!urgent&&now<(job.csNextTherapy487||0))return;
     for(const id of urgent?targets:targets.slice(0,1)){
      if(id==='source_control'||id==='surgery'){
       if(!sim.consults?.get('cirugia')&&!job.issued.has(id)){
        actor(()=>window.csSurgery487Request?.());
        job.issued.add(id);
        say('Solicité evaluación por Cirugía; falta su aceptación, no una operación automática.');
       }
       continue;
      }
      if(needsIV(id)&&!sim.venousAccessCount){
       actor(()=>window.csQueueIV(1));continue;
      }
      give(job,id);
     }
     if(!urgent)job.csNextTherapy487=now+1600;
     return;
   }
   // Even critical parallel orders cannot count as completed doses.
   if(sim.pendingTherapies?.size){
    status(job,'administration','Tratamiento en curso','Confirmando las dosis antes de derivar.',true);
    return;
   }
`;
 s=replaceSpan(s,"   // Prioritize finishing a real administration before starting the next one.","   if(!C.keyInterventions.every(csVegaInterventionComplete487)){",therapy,'quiet-sequential-therapy');
 // Once clinically indicated measures and real specialty acceptance are
 // verified, record an appropriate disposition. This is not an auto-discharge.
 s=once(s,
 "if(!C.keyInterventions.every(csVegaInterventionComplete487)){status(job,'treatment','Medidas pendientes','Verifico su ejecución y la respuesta de los servicios; no lo dejamos sin orientación.',true);return;}",
 "if(!C.keyInterventions.every(csVegaInterventionComplete487)){status(job,'treatment','Medidas pendientes','Verifico su ejecución y la respuesta de los servicios; no lo dejamos sin orientación.',true);return;}const goal=destinations[C.id]||'observacion';if((sim.disposition?.id||sim.disposition)!==goal)actor(()=>csSetDisposition(goal));",
 'resolve-native-destination-only-after-key-interventions');
 // The previous range included the original second pending check, so the
 // native downstream reassessment, rescue and outcome checks are retained.
 const decision=String.raw`  if(sim.nsVegaCare?.active&&sim.nsVegaCare.phase==='decision487'){
   const job=sim.nsVegaCare;
   sim.chats.expert.push(['doctor',text]);
   const unsure487=/^(?:no se|no se que hacer|no tengo idea|ayudame|ayuda|hacelo|hazlo|encargate|hace vos|hazlo tu|que harias vos)$/.test(n);
   if(unsure487){
    job.phase='reassessment';job.csNextTherapy487=performance.now();
    say('Te ayudo. Empezaré por la primera medida indicada, confirmaré que se ejecute y después seguimos.');
    return;
   }
   if(/^(?:yo|lo hago|yo lo hago|dejame|me encargo|quiero hacerlo)$/.test(n)||
      intent.type==='therapy_proposal'||intent.type==='study_proposal'){
    job.participatory=true;job.phase='learner';job.turn=null;
    say('Bien, tomá vos la próxima decisión. Yo vigilo la evolución y te ayudaré si hace falta.');
    if(intent.type==='therapy_proposal'||intent.type==='study_proposal')learnerMessage(text,intent);
    return;
   }
   say('Podés proponer una conducta, decir «yo lo hago» o «no sé». No pediré más estudios sin motivo.');
   return;
  }
`;
 const prompt="  const delegation=!/\\bno (lo )?(hagas|haga|haces)";
 const index=s.indexOf(prompt);
 if(index<0||s.indexOf(prompt,index+1)>=0)throw Error('Vega decision reply anchor');
 s=s.slice(0,index)+decision+s.slice(index);
 // Auto-enter consultation only after an explicit call, not when merely
 // seeing Vega on the map. A returned/closed patient cannot revive it.
 s=once(s,
 " window.nsTreatmentContext=()=>(",
 " const oldExplicitCall487=window.csCallVega;window.csCallVega=function(){const ok=oldExplicitCall487?.apply(this,arguments);if(ok!==false&&sim){sim.csVegaConsultRequested487=true;window.nsSelectChatTarget487?.('expert');}return ok;};\n window.nsTreatmentContext=()=>(",
 'explicit-call-for-autoconsult');
 s=once(s,
 " function tick(){\n  const job=sim?.nsVegaCare;if(!job)return;",
 " function tick(){\n  if(sim?.csVegaConsultRequested487&&sim.nsVegaArrived&&!sim.nsVegaCare?.active&&!sim.caseEnded){sim.csVegaConsultRequested487=false;begin(false,false);}\n  const job=sim?.nsVegaCare;if(!job)return;",
 'begin-after-arrival');
 return s;
}
