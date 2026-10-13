import {csNurseScan487} from '../clinical/nurse-scanner-487.js';
export function applyNurseVoice487(html){
 if(html.includes('id="atria-nurse-voice-routing-487"'))throw Error('duplicate nurse dispatcher');
 const runtime=`<script id="atria-nurse-voice-routing-487">
(function(){
 if(window.__atriaNurseVoiceRouter487)return;window.__atriaNurseVoiceRouter487=true;
 ${csNurseScan487.toString()}
 const baseNurse=nurseNatural,baseSend=sendMessage;
 const addressed=t=>/\\b(?:enfermera|enfermero|enfermeria)\\b/.test(norm(String(t||'')));
 function feedback(t){nurseSay(t);sim?.events?.push({m:sim.gameMinute,t:'Enfermería: '+t})}
 nurseNatural=function(text){
  // A cooperative/competitive visitor has a read-only clinical mirror.
  // Never administer on that copy: the multiplayer chat owner relays commands.
  if(window.csV41Challenge?.active&&sim?.__csRemoteMirror487)return false;
  // "Both" can only refer to the last explicitly identified two-antibiotic
  // order on this very encounter. It never selects a regimen from diagnosis.
  const pair=sim?._csNurseAntibioticPair487;
  if(/^(?:enfermera |enfermero |enfermeria )?(?:aplica|aplicar|administra|administrar|dar|pasa|pasar) ambos antibioticos$/.test(norm(text))){
   if(pair?.uid!==sim?.patientInstance?.uid||pair?.texts?.length!==2){
    feedback('Especificá los dos antibióticos; no hay una pareja identificada para este paciente.');return false;
   }
   text='enfermera '+pair.texts.join(' y ');
  }
  const bare=norm(String(text||'')).trim();
  const direct=/^(?:(?:dos|2) )?(?:vias?|accesos? venosos?|monitor|monitorizar|oxigeno|o2|ringer|hemograma|signos vitales)$/;
  // A brief command addressed to a nearby nurse also works without saying
  // "enfermera" every time. Patient questions still use the native routing.
  // sendMessage can route a composite sentence while the doctor is speaking
  // directly with a nurse. Do not drop that SAME sentence here just because
  // it does not begin with "enfermera" or consist of a single-word alias.
  const activeNurse=(chatRole==='nurse'||pendingAddress==='nurse');
  const listed=activeNurse?csNurseScan487(text,C?.studies||[],
   typeof MONITOR_THERAPY_CATALOG!=='undefined'?MONITOR_THERAPY_CATALOG:[],
   C?.interventions||[]):null;
  if(!addressed(text)&&!direct.test(bare)&&
     !(activeNurse&&listed?.active&&listed.items.some(x=>!x.negated)))
   return baseNurse.apply(this,arguments);
  if(!C||!sim||sim.caseEnded||window.nsMayExamine?.()===false){
   feedback('No hay una atención activa con permiso para ejecutar estas indicaciones.');return false;
  }
  const parsed=csNurseScan487(text,C.studies,MONITOR_THERAPY_CATALOG,C.interventions);
  if(!parsed.active){feedback('Es una pregunta o una negación; no ejecuté procedimientos.');return false}
  if(!parsed.items.length){feedback('No reconocí acciones en el pedido. Reformulalo.');return false}
  const antibiotics=new Set(['ceftriaxone','metronidazole','imipenem','ceftazidime','cefoperazone',
   'cefepime','piptazo','ampicillin','amikacin','gentamicin']);
  const named=parsed.items.filter(x=>x.kind==='therapy'&&antibiotics.has(x.id)&&!x.negated);
  if(named.length)sim._csNurseAntibioticPair487=named.length===2?
   {uid:sim.patientInstance?.uid,texts:named.map(x=>x.text)}:null;
  feedback(parsed.items.length===1?'Recibí una indicación; informaré su estado.':
   'Recibí '+parsed.items.length+' indicaciones; informaré por separado su estado.');
  let ok=false;
  for(const item of parsed.items.slice(0,12)){
   if(item.routeOnly)continue;
   if(item.negated){feedback('No ejecuté '+item.phrase+' (indicación negada).');continue}
   let issue=item.id==='vasopressor'&&item.action!=='stop'?
    window.csNoradrenalineOrderIssue487?.(item.text,item.contractText,text):null;
   if(item.kind==='therapy'&&item.action!=='stop'&&item.id!=='vasopressor'){
    const therapy=typeof findMonitorTherapy==='function'?findMonitorTherapy(item.text):null;
    const explicitRoute=/\\b(?:oral|po|im|intramuscular|sc|subcutanea|nasal|intraarterial|intratecal|epidural)\\b/.test(item.text);
    if(explicitRoute&&window.csNurseTherapyRequiresIV487?.(item.id))
     issue='La formulación nativa requiere vía IV; aclar\u00e1 la vía indicada.';
    const dose=therapy&&typeof parseTherapyOrder==='function'?parseTherapyOrder(item.text,therapy):null;
    const explicitNumber=/(?:^|\\s)[+−–—-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)/.test(item.text);
    if(explicitNumber&&(dose&&(dose.defaultApplied||!Number.isFinite(dose.amount)||dose.amount<=0)||/[+−–—-]\\s*\\d/.test(item.text)))
     issue='La dosis explícita no es válida para esta formulación; aclar\u00e1 esa indicación.';
   }
   if(issue){feedback(item.phrase+' NO administrado: '+issue);continue;}
   if(item.action==='stop'){
    ok=window.csQueueTherapyStop487?.(item.id,item.text)===true||ok;continue;
   }
   if(item.kind==='monitor'){
    const started=window.csQueueMonitor?.()===true;
    feedback(started?'Monitor solicitado; avisaré cuando esté conectado.':
       sim.monitorConnected?'El monitor ya está conectado.':'El monitor ya está pendiente.');
    ok=true;continue;
   }
   if(item.kind==='iv'){
    const started=window.csQueueIV?.(item.count)===true;
    feedback(started?'Vía venosa solicitada; avisaré cuando esté colocada.':
       sim.venousAccessCount>=item.count?'Vía ya colocada.':'Vía ya solicitada.');
    ok=true;continue;
   }
   if(item.kind==='surgery'){ok=window.csSurgery487Request?.()!==false||ok;continue}
   if(item.kind==='therapy'&&item.id!=='vasopressor'&&typeof MONITOR_THERAPY_CATALOG!=='undefined'&&
      MONITOR_THERAPY_CATALOG.some(t=>t.id===item.id)){
    // A nurse order and a manual monitor order MUST reach the same native
    // administration and dose pipeline. The older baseNurse path may merely
    // acknowledge an already-scanned drug without scheduling a real dose.
    // Patient identity/permissions and invalid explicit doses were checked above.
    const uid=sim.patientInstance?.uid;
    const raw=item.id==='fluid'&&!/\\b(?:ringer|suero|cristaloides|volumen)\\b/.test(norm(item.text))?
      'ringer'+(norm(item.text).match(/\\b(\\d+)\\s*ml\\b/)?.[0]?' '+norm(item.text).match(/\\b(\\d+)\\s*ml\\b/)[0]:''):item.text;
    const iv=window.csNurseTherapyRequiresIV487?.(item.id)===true;
    const isPending=()=>sim.pendingTherapies?.has(item.id)===true||
      (sim.csPhase4Pending487||[]).some(x=>x.uid===uid&&x.id===item.id);
    const label=item.id==='oxygen'?'Oxígeno':item.id==='fluid'?'Ringer':
      MONITOR_THERAPY_CATALOG.find(t=>t.id===item.id)?.label||item.id;
    // Before cannulation, preserve the existing nursing receipt owner and
    // its native deferred-IV task (the monitor adapter still guards delivery).
    // After cannulation, the SAME medication executes via addMonitorTherapy.
    // Frozen V19 fixtures lacking the late IV adapter retain their safe path.
    if(Number(sim.venousAccessCount||0)<=0&&
       (iv||typeof window.csNurseTherapyRequiresIV487!=='function'&&item.id!=='oxygen')){
      // This is a clinical order, not a request to manually place a line.
      // Preserve the native venous-access scheduler and its patient-bound
      // delayed therapy queue; NEVER report administration before its log.
      const accessAlreadyPending=nurse.task?.kind==='iv_access'||
       nurse.queue?.some(t=>t.kind==='iv_access');
      if(!accessAlreadyPending)window.csQueueIV?.(1);
      const acknowledged=baseNurse.call(this,'enfermera '+raw);
      // Some legacy routes acknowledge without retaining the IV therapy.
      // The original monitor IV adapter is the authority for that fallback.
      if(!isPending()&&iv)addMonitorTherapy(raw);
      if(isPending())feedback(label+': PENDIENTE. Esperando vía periférica; ejecutaré al colocarla.');
      else feedback(label+': RECIBIDA. Verificando acceso y registro de enfermería.');
      ok=acknowledged!==false||isPending()||ok;continue;
    }
    if(isPending()){
      feedback(label+': '+(iv&&Number(sim.venousAccessCount||0)<=0?
       'PENDIENTE. Esperando vía periférica.':item.id==='fluid'?'EN PROGRESO. Ya existe una orden pendiente; no repetí el bolo.':
       'EN PROGRESO. Ya se está preparando; no repetí la dosis.'));
      ok=true;continue;
    }
    const previous=(sim.administrationLog||[]).filter(x=>x.id===item.id&&x.action!=='stop').length;
    const accepted=addMonitorTherapy(raw);
    const given=(sim.administrationLog||[]).filter(x=>x.id===item.id&&x.action!=='stop').length>previous;
    const pending=isPending();
    if(given){
      // Preserve the existing oxygen monitor UI refresh when its native
      // executor confirms synchronously (the async route refreshes itself).
      if(item.id==='oxygen'){
       if(typeof renderMonitorTherapies==='function')renderMonitorTherapies();
       if(typeof renderAdministrationHistory==='function')renderAdministrationHistory();
       if(typeof updateMonitorDOM==='function')updateMonitorDOM();
      }
      feedback(label+': COMPLETADA. Administración registrada en el monitor.');
    }
    else if(pending)feedback(label+': '+(iv&&Number(sim.venousAccessCount||0)<=0?
     'PENDIENTE. Se iniciará tras colocar vía periférica.':
     'EN PROGRESO. Preparación iniciada; confirmaré la dosis al registrarse.'));
    else if(accepted===false)feedback(label+': BLOQUEADA. El ejecutor nativo rechazó la orden; comprobá el motivo en el monitor.');
    else feedback(label+': RECIBIDA. Esperando confirmación del ejecutor nativo.');
    ok=accepted!==false||pending||given||ok;
    continue;
   }
   const phrase=item.kind==='vitals'?'signos vitales':
    item.kind==='study'?C.studies.find(x=>x.id===item.id)?.label:
    // 'expansión' is a recognized fluid request, not a native drug alias.
    // Use the real catalog alias so the Phase-4 IV dependency queue remains authoritative.
    item.kind==='therapy'&&item.id==='fluid'&&!/\\b(?:ringer|suero|cristaloides|volumen)\\b/.test(norm(item.text))?
      'ringer'+(norm(item.text).match(/\\b(\\d+)\\s*ml\\b/)?.[0]?' '+norm(item.text).match(/\\b(\\d+)\\s*ml\\b/)[0]:''):
      item.text.replace(/\\s+(?:y|e|ademas)\\s+.*$/,'');
   const before=sim.csNurse487History?.length||0;
   const response=baseNurse.call(this,'enfermera '+phrase);
   if((sim.csNurse487History?.length||0)===before){
     const active=item.kind==='therapy'&&(sim.monitorTherapies?.has(item.id)||sim.interventions?.has(item.id));
     const pending=item.kind==='therapy'&&(sim.pendingTherapies?.has(item.id)||
       (sim.csPhase4Pending487||[]).some(x=>x.id===item.id));
     const study=item.kind==='study'&&sim.orders?.has(item.id);
     const vitals=item.kind==='vitals'&&(nurse.task?.kind==='vitals'||nurse.queue?.some(t=>t.kind==='vitals'));
     if(active)feedback(phrase+': consta como tratamiento ACTIVO. Confirmá administración en el monitor.');
     else if(pending||study||vitals)feedback(phrase+': solicitado; ejecución o resultado pendiente.');
     else feedback(phrase+': NO quedó registrado como ejecutado. Volvé a indicar la acción o revisá el monitor.');
   }
   ok=response!==false||ok;
  }
  for(const unknown of parsed.unknown.slice(0,6))feedback('No reconocí '+unknown+'. No ejecuté esa parte.');
  if(parsed.items.length>12)feedback('El pedido excede 12 acciones; dividilo en dos mensajes.');
  return ok;
 };
 sendMessage=function(text){
  // Shared visiting doctors must reach the multiplayer authority BEFORE
  // this late nurse/chat intercept. Otherwise "enfermera ringer" mutates a
  // private mirror and prints a misleading "received" acknowledgement.
  if(window.csV41Challenge?.active&&sim?.__csRemoteMirror487)
   return baseSend.apply(this,arguments);
  const raw=String(text||'').trim();
  const clean=norm(raw);
  // If the nurse is the current recipient, interpret actionable composite
  // orders wherever the procedure words appear, not only as the first token.
  // Questions and explicit negations remain non-executable.
  const nurseContext=chatRole==='nurse'||pendingAddress==='nurse';
  const parsed=nurseContext?csNurseScan487(raw,C?.studies||[],MONITOR_THERAPY_CATALOG,C?.interventions||[]):null;
  const shortNurse=nurseContext&&!!parsed?.active&&
   parsed.items.some(x=>!x.negated)&&
   !/^(?:que|cuando|como|cuantas|por que|me dijeron|el paciente dice)\\b/.test(clean);
  // A message explicitly addressed to nursing works even when "enfermera"
  // occurs at the end ("monitor y vías, enfermera").

  if(!raw||raw.startsWith('/')||(!addressed(raw)&&!shortNurse)||!sim||!C)return baseSend.apply(this,arguments);
  player.bubble=raw;player.bubbleUntil=performance.now()+2200;
  addGlobalChat('doctor',raw);pendingAddress=null;chatRole='nurse';refreshChatDock();
  nurseNatural(raw);return true;
 };
 // Keep the one existing dispatcher accessible to the later native language
 // wrapper. V412 retains its permission/question guards and delegates here.
 window.csNurseVoice487={dispatch:nurseNatural,parse:t=>csNurseScan487(t,C.studies,MONITOR_THERAPY_CATALOG,C.interventions)};
})();
</script>`;
 const oldFlush="if(item.id==='albumin')addMonitorTherapy(item.text);else prevNatural.call(this,item.text);";
 const newFlush="if(typeof addMonitorTherapy==='function'&&typeof MONITOR_THERAPY_CATALOG!=='undefined'&&MONITOR_THERAPY_CATALOG.some(x=>x.id===item.id))addMonitorTherapy(item.text);else prevNatural.call(this,item.text);";
 if(html.split(oldFlush).length!==2)throw Error('unresolved pending-IV therapy anchor');
 html=html.replace(oldFlush,newFlush);
 const oldGeneric="   const instruction='enfermera '+entry.text;";
 const newGeneric="   if(entry.kind==='therapy'&&typeof addMonitorTherapy==='function'&&typeof MONITOR_THERAPY_CATALOG!=='undefined'&&MONITOR_THERAPY_CATALOG.some(x=>x.id===entry.id)){accepted=addMonitorTherapy(entry.text)!==false||accepted;continue;}\\n"+oldGeneric;
 if(html.split(oldGeneric).length!==2)throw Error('nursing generic therapy anchor');
 html=html.replace(oldGeneric,newGeneric.replace('\\n','\n'));
 const oldIVRule="if(entry.kind==='therapy'&&(ivMeds.has(entry.id)||window.csPharm487?.requiresIV?.(entry.id))&&Number(patient.venousAccessCount||0)<=0&&entry.id!=='fluid'){";

 const newIVRule="if(entry.kind==='therapy'&&ivMeds.has(entry.id)&&Number(patient.venousAccessCount||0)<=0){";
 if(html.split(oldIVRule).length!==2)throw Error('nurse IV safety rule anchor');
 html=html.replace(oldIVRule,newIVRule);
 const oldWarning="nurseSay('Doctor, el cuadro infeccioso sigue activo y los signos no se estabilizan.')";
 const newWarning="nurseSay('Doctor, hay signos de infección grave: Ringer y oxígeno no sustituyen los antibióticos. Verificá que se hayan administrado mientras gestionamos el foco.')";
 if(html.includes(oldWarning))html=html.replace(oldWarning,newWarning);
 const lateQuestion="  if(question(text)){nurseSay('Si querés indicar una conducta, decime la orden concreta. Para explicar o discutir esa decisión podés preguntarle al Dr. Vega.');return false;}";
 if(html.split(lateQuestion).length!==2)throw Error('late V412 nurse guard missing/ambiguous');
 html=html.replace(lateQuestion,lateQuestion+"\n  if(window.csNurseVoice487?.dispatch)return window.csNurseVoice487.dispatch(text);");
 return html.replace('</body>',runtime+'</body>');
}
