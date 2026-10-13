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
 s=once(s,
  "if((v.sys<90||map<65)&&!present('fluid')||small)",
  "if((v.sys<90||map<65)&&(!present('fluid')||small))",
  'repeat-bolus-only-with-current-hypoperfusion');
 const priority=String.raw` function csVegaPriorityStudies487(){
  // Two high-yield diagnostic studies. Longer cultures or staging exams
  // remain available to the player; the tutor does not order everything.
  const first={
   'CIRR-001':['paracentesis','hepatograma'],
   'PANC-001':['lipasa','hemograma'],
   'CROHN-001':['colonoscopia','inflamatorio'],
   'HDA-001':['hda_lab','grupo'],
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
 function csVegaDiagnosticEvidence487(){
  if(!sim.examDone)return false;
  const done=id=>sim.orders.get(id)?.status==='done';
  const groups={
   'CIRR-001':[['eco','hepatograma']], 'PANC-001':[['lipasa']],
   'CROHN-001':[['colonoscopia']], 'HDA-001':[['hda_lab','eda']],
   'COLON-001':[['colonoscopia']], 'PERI-PBE-001':[['pbe_paracentesis']],
   'PERI-SEC-001':[['peri_ct','peri_rx']], 'PERI-TER-001':[['ter_ct']],
   'APP-001':[['app_us','app_ct']], 'CHOLE-001':[['chole_us']],
   'ILEO-001':[['ileo_xray','ileo_ct']], 'MESI-001':[['mesi_cta','mesi_angio']],
   'CHOLANG-001':[['cholang_liver'],['cholang_us']]
  }[C.id]||[csVegaPriorityStudies487()];
  if(C.id==='PERI-SEC-001'&&Number(sim.liveVitals?.sys)<90)return true;
  return groups.every(group=>group.some(done));
 }
 function csVegaTreatmentStudy487(){
  // A later study is justified by the next decision, never a timed cascade.
  const required={'CIRR-001':['renal'],'CROHN-001':['stool'],
   'PERI-TER-001':['ter_culture']}[C.id]||[];
  return required.map(id=>C.studies.find(x=>x.id===id))
   .find(x=>x&&sim.orders.get(x.id)?.status!=='done')||null;
 }
 function csVegaProposalReason487(intent){
  if(intent.type!=='therapy_proposal')return '';
  const id=intent.therapy?.id||intent.intervention?.id,v=sim.liveVitals||vitalsNow();
  if(id==='oxygen')return v.spo2<92?'':'No hay hipoxemia que justifique oxígeno ahora.';
  if(id==='vasopressor')return v.sys<90&&present('fluid')?'':
   'La noradrenalina requiere hipotensión persistente y reevaluar la reposición inicial.';
  if(id==='fluid'&&(v.sys<90||(v.sys+2*v.dia)/3<65))return '';
  const algorithm=typeof caseAlgorithm==='function'?caseAlgorithm():null;
  const indicated=new Set([...(C.keyInterventions||[]),...(algorithm?.interventions||[])]);
  if(!indicated.has(id))return 'Esa medida no trata el problema planteado. '+
   (algorithm?.planTeach||'Revisemos la indicación y el estado actual antes de administrarla.');
  const required=csVegaTreatmentStudy487();
  if(required)return 'Antes de esa conducta necesitamos '+required.label+
   ' para comprobar su seguridad; todavía no está disponible.';
  return '';
 }
 function csVegaAsk487(job,reason){
  job.phase='decision487';job.csDecisionAt487=performance.now();job.csReminderSent487=false;
  say(reason+' ¿Qué proponés hacer? Respondé tocándome o escribiendo «Dr. Vega, …».');
 }
 function csVegaUrgentMeasures487(job){
  const empiric=new Set(['fluid','analgesia','npo','ngt','ppi']);
  if((sim.liveVitals?.temp||0)>=38)for(const id of
   ['ceftriaxone','metronidazole','piptazo'])empiric.add(id);
  for(const id of C.keyInterventions)if(empiric.has(id))give(job,id);
  if(C.id==='PERI-SEC-001'&&sim.examDone&&!sim.consults?.has('cirugia')){
   actor(()=>csSetDiagnosticImpression(C.dx[0],{echo:false}));
   if(actor(()=>window.csSurgery487Request?.())!==false){
    job.issued.add('source_control');
    say('La exploración sugiere peritonitis con foco. Solicité evaluación urgente por Cirugía '+
     'por la inestabilidad; no esperamos todas las imágenes ni realizamos una operación en el box.');
   }
  }
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
   if(job.csPausedStudy487){
    const state=window.nsPatientState();
    if(state.color==='ROJO'||immediateDanger(state)){
     csVegaUrgentMeasures487(job);job.csUrgent487=true;job.phase='reassessment';
     say('Está empeorando. El estudio cancelado no puede demorar la estabilización; lo retomaremos después.');
     return;
    }
    const order=sim.orders.get(job.csPausedStudy487);
    if(!order||['cancelled','canceled','rejected','failed'].includes(order.status))return;
    job.csPausedStudy487=null;job.phase='results';return;
   }
   const oriented=!!sim.diagnosis&&csVegaDiagnosticEvidence487()&&
    (window.csDx487?.matchesCase?.(C.id,sim.diagnosis)??
     C.dx.some(dx=>norm(sim.diagnosis).includes(norm(dx))));
   const preferred=(oriented?[]:csVegaPriorityStudies487())
    .map(id=>C.studies.find(x=>x.id===id)).filter(Boolean);
   job.csStudies487=preferred.map(x=>x.id);
   const missing=preferred.filter(x=>!sim.orders.has(x.id));
   if(missing.length)actor(()=>{for(const st of missing)orderStudy(st,true,'Dr. Vega')});
   job.phase='results';
   if(oriented)return;
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
   if(critical)csVegaUrgentMeasures487(job);
   const wanted=job.csStudies487||csVegaPriorityStudies487();
   const cancelled=wanted.find(id=>!sim.orders.has(id)||
    ['cancelled','canceled','rejected','failed'].includes(sim.orders.get(id)?.status));
   if(cancelled){
    job.csPausedStudy487=cancelled;job.phase='workup487';
    say('El estudio '+(C.studies.find(x=>x.id===cancelled)?.label||cancelled)+
     ' no sigue en curso. ¿Lo volvemos a solicitar? Respondé «Dr. Vega, no sé» si necesitás ayuda.');
    return;
   }
   if(!wanted.every(id=>sim.orders.get(id)?.status==='done')){
    status(job,'results','Esperando estudios','No voy a repetir las mismas órdenes.',true);
    return;
   }
   actor(()=>csSetDiagnosticImpression(C.dx[0],{echo:false}));
   if(critical){
    say('Mi diagnóstico presuntivo es '+C.dx[0]+
     '. Por la gravedad no espero: continúo el tratamiento urgente y te explico las medidas.');
    job.csUrgent487=true;job.phase='reassessment';return;
   }
   const confirm=csVegaDiagnosticEvidence487();
   say('Según el examen y los estudios disponibles, mi diagnóstico presuntivo es '+C.dx[0]+
    (confirm?'.':'. Todavía requiere confirmación; los resultados inespecíficos no lo establecen por sí solos.')+
    ' ¿Qué proponés hacer? Si no sabés, decime «Dr. Vega, no sé» y avanzamos paso a paso.');
   window.nsSelectChatTarget487?.('expert',{auto:true});
   job.csDecisionAt487=now;job.phase='decision487';return;
  }
  if(job.phase==='decision487'){
   if(window.nsPatientState().color==='ROJO'||immediateDanger(window.nsPatientState())){
    say('Está empeorando. Intervengo ya; después discutimos la conducta.');
    job.csUrgent487=true;job.phase='reassessment';return;
   }
   // In a stable patient silence is NOT authorization to prescribe.
   // One short reminder is enough; urgent deterioration overrides the wait.
   if(!job.csReminderSent487&&now-(job.csDecisionAt487||now)>=16000){
    job.csReminderSent487=true;
    say('Te escucho. Si necesitás ayuda, escribí «Dr. Vega, no sé».');
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
   if(job.csUrgent487&&!urgent){
    job.csUrgent487=false;
    if(job.csPausedStudy487){
     job.phase='workup487';
     say('La urgencia cedió. Retomemos el estudio cancelado: podés proponerlo o decir «Dr. Vega, no sé».');
     return;
    }
    csVegaAsk487(job,'Ya podemos reevaluar con más calma y retomar la decisión clínica.');return;
   }
   if(urgent&&job.csPausedStudy487){
    csVegaUrgentMeasures487(job);
    const v=sim.liveVitals,map=(v.sys+2*v.dia)/3;
    if((v.sys<90||map<65)&&present('fluid')){
     if(C.risk==='bleed')give(job,'transfusion','transfusión 1 unidad');
     if(!present('vasopressor'))give(job,'vasopressor','noradrenalina 0.05 µg/kg/min');
    }
    if(sim.monitorConnected&&sim.gameMinute>=job.nextReviewMinute){
     actor(()=>captureMonitorVitals());job.nextReviewMinute=sim.gameMinute+.6;
    }
    status(job,'urgent','Estabilización en curso','Reevalúo sin repetir el estudio cancelado.',true);return;
   }
   if(job.csOneStep487&&job.csActionAwaiting487&&!urgent){
    const id=job.csActionAwaiting487;
    if(sim.pendingTherapies?.has(id)||['source_control','surgery'].includes(id)&&
       sim.consults?.get('cirugia')?.status==='pending')return;
    job.csActionAwaiting487=null;job.csOneStep487=false;
    const done=csVegaInterventionComplete487(id);
    if(!done)job.issued.delete(id);
    if(done&&sim.monitorConnected)actor(()=>captureMonitorVitals());
    csVegaAsk487(job,done?'La medida se ejecutó. Reevaluemos la respuesta antes del siguiente paso.':
     'La indicación no se completó. Revisemos el registro y qué la impidió.');
    return;
   }
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
        if(job.csOneStep487)job.csActionAwaiting487=id;
       }
       continue;
      }
      if(needsIV(id)&&!sim.venousAccessCount){
       actor(()=>window.csQueueIV(1));continue;
      }
      if(give(job,id)&&job.csOneStep487)job.csActionAwaiting487=id;
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
 const decision=String.raw`  if(sim.nsVegaCare?.active&&sim.nsVegaCare.csPausedStudy487){
   const job=sim.nsVegaCare,id=job.csPausedStudy487,study=C.studies.find(x=>x.id===id);
   if(/^(?:no se|ayudame|ayuda|hacelo|hazlo)$/.test(n)||
      intent.type==='study_proposal'&&intent.study?.id===id){
    const prior=sim.orders.get(id);
    if(prior&&['cancelled','canceled','rejected','failed'].includes(prior.status))sim.orders.delete(id);
    if(study)actor(()=>orderStudy(study,true,'Dr. Vega'));
    if(sim.orders.has(id)){job.csPausedStudy487=null;job.phase='results';
     say('Volví a solicitar '+study.label+'. Esperamos su resultado antes de seguir.');}
    else say('El estudio todavía no se pudo solicitar. Revisemos la condición pendiente.');
   }else say('Primero resolvamos el estudio pendiente; podés volver a pedirlo o decir «Dr. Vega, no sé».');
   return;
  }
  const unsure487=/^(?:no se|no se que hacer|no tengo idea|ayudame|ayuda|hacelo|hazlo|encargate|hace vos|hazlo tu|que harias vos)$/.test(n);
  if(sim.nsVegaCare?.active&&(sim.nsVegaCare.phase==='decision487'||
      sim.nsVegaCare.phase==='learner'&&unsure487)){
   const job=sim.nsVegaCare;
   sim.chats.expert.push(['doctor',text]);
   if(unsure487){
    job.participatory=false;job.turn=null;
    const required=csVegaTreatmentStudy487();
    if(required&&window.nsPatientState().color!=='ROJO'){
     if(!sim.orders.has(required.id))actor(()=>orderStudy(required,true,'Dr. Vega'));
     job.csStudies487=[required.id];job.phase='results';
     say('Antes de tratar necesitamos '+required.label+'. '+
      (sim.orders.has(required.id)?'Espero su resultado; no repito la orden.':'No se pudo solicitar; revisemos el registro.'));
     return;
    }
    job.csOneStep487=!/^(?:hacelo|hazlo|encargate|hace vos|hazlo tu)$/.test(n);
    job.phase='reassessment';job.csNextTherapy487=performance.now();
    say('Te ayudo. Empezaré por la primera medida indicada, confirmaré que se ejecute y después seguimos.');
    return;
   }
   if(/^(?:yo|lo hago|yo lo hago|dejame|me encargo|quiero hacerlo)$/.test(n)||
      intent.type==='therapy_proposal'||intent.type==='study_proposal'){
    const reason=csVegaProposalReason487(intent);if(reason){say(reason);return;}
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
 s=once(s," function learnerMessage(text,intent){\n  const job=",
  " function learnerMessage(text,intent){\n  const reason=csVegaProposalReason487(intent);if(reason){say(reason);return;}\n  const job=",
  'teacher-validates-proposal-before-player-administration');
 s=once(s,
  "if(sim.caseEnded||job.epoch!==careEpoch||job.token!==token()||job.caseId!==C.id||!window.nsMayExamine?.())",
  "if(sim.caseEnded||sim.patientDied||job.epoch!==careEpoch||job.token!==token()||job.caseId!==C.id||!window.nsMayExamine?.())",
  'deceased-or-returned-patient-stops-consultation');
 // Auto-enter consultation only after an explicit call, not when merely
 // seeing Vega on the map. A returned/closed patient cannot revive it.
 // Do not alter the frozen ns422-treatment-context prefix (IIFE to say).
 // Install the same call adapter after the existing say() function instead.
 s=once(s,
 " function status(job,id,label,reason,canLeave=false){",
 " const oldExplicitCall487=window.csCallVega;window.csCallVega=function(){const ok=oldExplicitCall487?.apply(this,arguments);if(ok!==false&&sim){sim.csVegaConsultRequested487=true;window.nsSelectChatTarget487?.('expert');}return ok;};\n function status(job,id,label,reason,canLeave=false){",
 'explicit-call-for-autoconsult-after-frozen-prefix');
 s=once(s,
 " function tick(){\n  const job=sim?.nsVegaCare;if(!job)return;",
 " function tick(){\n  if(sim?.csVegaConsultRequested487&&sim.nsVegaArrived&&!sim.nsVegaCare?.active&&!sim.caseEnded){sim.csVegaConsultRequested487=false;begin(false,false);}\n  const job=sim?.nsVegaCare;if(!job)return;",
 'begin-after-arrival');
 return s;
}
