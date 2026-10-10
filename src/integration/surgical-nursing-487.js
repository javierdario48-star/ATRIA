import {csSurgicalReview487} from '../clinical/surgical-review-487.js';
// Additive QA integration. Surgery is a consultation, never a completed operation.
export function applySurgicalNursing487(html){
 if(html.includes('id="atria-surgical-nursing-487"'))throw Error('surgery patch installed twice');
 const code=String.raw`<script id="atria-surgical-nursing-487">
(function(){
 'use strict';
 if(window.__csSurgeryNurse487)return;window.__csSurgeryNurse487=true;
 ${csSurgicalReview487.toString()}
 const priorNurse=nurseNatural,priorMonitor=addMonitorTherapy,priorCommand=processCommand,priorMessage=sendMessage;
 const clean=x=>norm(String(x||''));
 const surgeryWord=/\b(?:cirug(?:ia|ico|ica)|cirujan[oa]|quirofano|laparotomia|operar|operacion|control de foco)\b/;
 const notAnOrder=/\b(?:no (?:solicites?|avis(?:es|ar)|llames?|operes?|quiero)|no cirugia|sin cirugia|evitar cirugia|no hace falta cirugia)\b/;
 const surgicalRequest=text=>{
   const n=clean(text);
   if(!surgeryWord.test(n)||notAnOrder.test(n)||/\?/.test(text))return false;
   return /^(?:enfermera|enfermero|enfermeria|solicito|pido|orden|necesito|quiero|cirugia|quirofano|operar|llevar|preparar|derivar|avisar|llamar|interconsulta|consulta)\b/.test(n)||
     /\b(?:pedir|pedimos|solicitamos|avisar|llama|llamar|llevar a|enviar a|preparar|necesita|requiere)\b/.test(n);
 };
 function snapshot(){
   return {diagnosis:sim.diagnosis||'',diagnosticCompatible:
    typeof window.csDx487?.matchesCase==='function'?window.csDx487.matchesCase(C.id,sim.diagnosis):C.dx.some(x=>clean(x)===clean(sim.diagnosis)),
    vitalsKnown:!!sim.lastVitalsKnown,examDone:!!sim.examDone,examRegions:sim.examRegions?.size||0,
    sys:Number(sim.liveVitals?.sys||120),initialShock:Number(String(C.vitals?.bp||'120/80').split('/')[0])<90,
    imagingDone:[...(sim.orders?.entries?.()||[])].some(([id,o])=>o?.status==='done'&&/^(peri_ct|peri_rx|ter_ct)|ct|rx|imagen|radiografia|tomografia/i.test(id))};
 }
 function actualSurgeryBlockers(){
   if(typeof window.csPeritonitisAssessment487!=='function')return [];
   const status=window.csPeritonitisAssessment487();
   return (status?.missing||[]).filter(x=>!/(respuesta de interconsulta|respuesta del equipo receptor)/i.test(String(x)));
 }
 function adviseExact(){
   const remaining=actualSurgeryBlockers();
   return remaining.length?'Para derivar todavía falta: '+remaining.join('; ')+'.':
     'Se cumplen los criterios de derivación: pulsá «Derivar a quirófano» sobre el paciente.';
 }
 function request(){
   if(!C||!sim||sim.caseEnded||sim.patientDied){nurseSay('No hay una atención activa para gestionar Cirugía.');return false;}
   if(window.nsMayExamine?.()===false){nurseSay('Podés consultar el paciente, pero no indicar cirugía sobre un caso ajeno.');return false;}
   sim.consults??=new Map();
   const old=sim.consults.get('cirugia');
   if(old?.status==='pending'){nurseSay('Doctor, Cirugía ya fue avisada; la respuesta sigue pendiente.');return true}
   if(old?.status==='done'){nurseSay('Doctor, Cirugía ya aceptó la evaluación. '+adviseExact());return true}
   sim.consults.set('cirugia',{status:'pending',requestedAt:sim.gameMinute,name:'Cirugía',origin:'nurse487'});
   sim.events?.push({m:sim.gameMinute,t:'Interconsulta a Cirugía solicitada'});
   nurseSay('Doctor, recibí la indicación de Cirugía. Voy a solicitar evaluación; le confirmo la respuesta.');
   const target=sim,caseId=C.id;
   setTimeout(()=>{
     if(target.caseEnded||target.patientDied)return;
     const apply=()=>{
       const consult=target.consults?.get('cirugia');if(!consult||consult.status!=='pending'||consult.origin!=='nurse487')return;
       const evaluation=csSurgicalReview487(snapshot(),C);
       consult.status=evaluation.accepted?'done':'rejected';consult.respondedAt=target.gameMinute;
       consult.accepted=evaluation.accepted;consult.advice=evaluation.reason;
       target.events?.push({m:target.gameMinute,t:'Respuesta de Cirugía: '+evaluation.status});
       nurseSay('Doctor, Cirugía respondió: '+evaluation.reason);
       // Report ACTUAL unfulfilled state from the native administration log,
       // physical examination and disposition evaluator, not generic guesses.
       if(evaluation.accepted)nurseSay(adviseExact());
       else{
        const blockers=actualSurgeryBlockers();
        if(blockers.length)nurseSay('Requisitos pendientes documentados: '+blockers.join('; ')+'.');
       }
       window.csPeritonitisRefresh487?.();
     };
     if(typeof window.csWithPatientStateV203==='function')window.csWithPatientStateV203(target,caseId,apply);
     else if(sim===target&&C?.id===caseId)apply();
   },3500);
   return true;
 }
 window.csSurgery487Request=request;
 nurseNatural=function(text){
   if(surgeryWord.test(clean(text))&&(/\?/.test(String(text))||notAnOrder.test(clean(text)))){
     nurseSay('La cirugía no fue solicitada: la frase es una pregunta o una negación.');return false;
   }
   if(!surgicalRequest(text))return priorNurse.apply(this,arguments);
   const normal=clean(text).replace(/^(?:enfermera|enfermero|enfermeria|solicito|pido|necesito|ordenar?)\s*/,'').trim();
   const pieces=normal.split(/\s*(?:,|;|\s+y\s+|\s+e\s+)\s*/).filter(Boolean);
   if(pieces.length===1)return request();
   let accepted=false,asked=false;
   for(const item of pieces.slice(0,12)){
     if(surgeryWord.test(item)&&!notAnOrder.test(item)){if(!asked){asked=true;accepted=request()||accepted;}}
     else accepted=priorNurse.call(this,'enfermera '+item)!==false||accepted;
   }
   if(pieces.length>12)nurseSay('Hay indicaciones adicionales que no procesé: dividí la orden en dos mensajes.');
   return accepted;
 };
 addMonitorTherapy=function(text){
   if(surgeryWord.test(clean(text))&&(/\?/.test(String(text))||notAnOrder.test(clean(text))))return false;
   if(surgicalRequest(text))return request();
   return priorMonitor.apply(this,arguments);
 };
 processCommand=function(text){
   const raw=String(text||'').replace(/^\//,'').trim();
   if(/^(?:consulta|consultar|orden|estudio|derivar|solicito)\s+(?:a\s+)?(?:cirugia|quirofano|cirujano|operar|control de foco)\b/.test(clean(raw)))return request();
   return priorCommand.apply(this,arguments);
 };
 sendMessage=function(text){
   const n=clean(text);
   if(!String(text||'').startsWith('/')&&surgicalRequest(text)&&
      /^(?:cirugia|quirofano|operar|interconsulta a cirugia|solicito cirugia)\b/.test(n)){
     addGlobalChat('doctor',String(text));return request();
   }
   return priorMessage.apply(this,arguments);
 };
})();
</script>`;
 return html.replace('</body>',code+'</body>');
}
