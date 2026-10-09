import {csNurseScan487} from '../clinical/nurse-scanner-487.js';
export function applyNurseVoice487(html){
 if(html.includes('id="atria-nurse-voice-routing-487"'))throw Error('duplicate nurse dispatcher');
 const runtime=`<script id="atria-nurse-voice-routing-487">
(function(){
 if(window.__atriaNurseVoiceRouter487)return;window.__atriaNurseVoiceRouter487=true;
 ${csNurseScan487.toString()}
 const baseNurse=nurseNatural,baseSend=sendMessage;
 const addressed=t=>/^(?:enfermera|enfermero|enfermeria)\\b/.test(norm(String(t||'')));
 function feedback(t){nurseSay(t);sim?.events?.push({m:sim.gameMinute,t:'Enfermería: '+t})}
 nurseNatural=function(text){
  if(!addressed(text))return baseNurse.apply(this,arguments);
  if(!C||!sim||sim.caseEnded||window.nsMayExamine?.()===false){
   feedback('No hay una atención activa con permiso para ejecutar estas indicaciones.');return false;
  }
  const parsed=csNurseScan487(text,C.studies,MONITOR_THERAPY_CATALOG,C.interventions);
  if(!parsed.active){feedback('Es una pregunta o una negación; no ejecuté procedimientos.');return false}
  if(!parsed.items.length){feedback('No reconocí acciones en el pedido. Reformulalo.');return false}
  feedback('Recibí '+parsed.items.length+' indicaciones; informaré por separado su estado.');
  let ok=false;
  for(const item of parsed.items.slice(0,12)){
   if(item.negated){feedback('No ejecuté '+item.phrase+' (indicación negada).');continue}
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
   if(item.kind==='therapy'&&!C.interventions.some(x=>x.id===item.id)&&item.id==='oxygen'){
    const done=addMonitorTherapy(item.text);
    feedback(done!==false&&sim.monitorTherapies?.has('oxygen')?'Oxígeno iniciado; verificaré la saturación.':'Oxígeno no ejecutado; revisar el monitor.');
    ok=done!==false||ok;continue;
   }
   const phrase=item.kind==='vitals'?'signos vitales':
    item.kind==='study'?C.studies.find(x=>x.id===item.id)?.label:item.text.replace(/\\s+(?:y|e|ademas)\\s+.*$/,'');
   const before=sim.csNurse487History?.length||0;
   const response=baseNurse.call(this,'enfermera '+phrase);
   if((sim.csNurse487History?.length||0)===before)
    feedback(phrase+': '+(response===false?'no se pudo ejecutar.':'pedido recibido; revisá su estado.'));
   ok=response!==false||ok;
  }
  for(const unknown of parsed.unknown.slice(0,6))feedback('No reconocí '+unknown+'. No ejecuté esa parte.');
  if(parsed.items.length>12)feedback('El pedido excede 12 acciones; dividilo en dos mensajes.');
  return ok;
 };
 sendMessage=function(text){
  const raw=String(text||'').trim();
  if(!raw||raw.startsWith('/')||!addressed(raw)||!sim||!C)return baseSend.apply(this,arguments);
  player.bubble=raw;player.bubbleUntil=performance.now()+2200;
  addGlobalChat('doctor',raw);pendingAddress=null;chatRole='nurse';refreshChatDock();
  nurseNatural(raw);return true;
 };
 window.csNurseVoice487={parse:t=>csNurseScan487(t,C.studies,MONITOR_THERAPY_CATALOG,C.interventions)};
})();
</script>`;
 const oldFlush="if(item.id==='albumin')addMonitorTherapy(item.text);else prevNatural.call(this,item.text);";
 const newFlush="if((item.id==='albumin'||(typeof C!=='undefined'&&C?.interventions&&!C.interventions.some(x=>x.id===item.id)))&&typeof addMonitorTherapy==='function')addMonitorTherapy(item.text);else prevNatural.call(this,item.text);";
 if(html.split(oldFlush).length!==2)throw Error('unresolved pending-IV therapy anchor');
 html=html.replace(oldFlush,newFlush);
 const oldGeneric="   const instruction='enfermera '+entry.text;";
 const newGeneric="   if(entry.kind==='therapy'&&typeof C!=='undefined'&&C?.interventions&&!C.interventions.some(x=>x.id===entry.id)&&typeof addMonitorTherapy==='function'){accepted=addMonitorTherapy(entry.text)!==false||accepted;continue;}\\n"+oldGeneric;
 if(html.split(oldGeneric).length!==2)throw Error('nursing generic therapy anchor');
 html=html.replace(oldGeneric,newGeneric.replace('\\n','\n'));
 const oldWarning="nurseSay('Doctor, el cuadro infeccioso sigue activo y los signos no se estabilizan.')";
 const newWarning="nurseSay('Doctor, hay signos de infección grave: Ringer y oxígeno no sustituyen los antibióticos. Verificá que se hayan administrado mientras gestionamos el foco.')";
 if(html.includes(oldWarning))html=html.replace(oldWarning,newWarning);
 return html.replace('</body>',runtime+'</body>');
}
