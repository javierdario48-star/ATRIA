import {csPeritonitisEvaluate487,csPeritonitisSnapshot487} from '../clinical/peritonitis-pathways.js';

// Keep the three-seed flow isolated from 4.8.6 vendor and unrelated ATRIA modes.
// Inject after the existing nursing receipt scripts, without reconstructing the clinical engine.
export function applyPeritonitis487(html) {
  if(html.includes('id="atria-peritonitis-487-disposition"'))throw Error('peritonitis integration already installed');
  if(!html.includes('</body>'))throw Error('missing HTML body closing tag');
  const code=String.raw`<script id="atria-peritonitis-487-disposition">
(function(){
 'use strict';
 if(window.__csPeritonitisDisposition487)return;
 window.__csPeritonitisDisposition487=true;
 ${csPeritonitisEvaluate487.toString()}
 ${csPeritonitisSnapshot487.toString()}
 // The native sepsis physiology also needs to recognize clinically plausible
 // alternatives. Otherwise a safe decision earns XP but the patient never responds.
 if(typeof CASES!=='undefined')for(const c of CASES){
   if(!c?.physiology?.coverageSets)continue;
   const alternatives=c.id==='PERI-PBE-001'?[['piptazo']]:
     c.id==='PERI-SEC-001'?[['piptazo'],['imipenem']]:
     c.id==='PERI-TER-001'?[['piptazo','fluconazole'],['piptazo','amphotericin'],
       ['imipenem','fluconazole'],['imipenem','amphotericin']]:[];
   for(const group of alternatives)if(!c.physiology.coverageSets.some(existing=>
       existing.length===group.length&&group.every(id=>existing.includes(id))))
       c.physiology.coverageSets.push(group);
 }
 const current=()=>csPeritonitisEvaluate487(csPeritonitisSnapshot487(sim,C));
 window.csPeritonitisAssessment487=current;

 // The existing scoring contract counts fixed key studies. In these three
 // cases, equivalent evidence and safe early referrals count instead.
 const oldBreakdown=csBreakdown;
 csBreakdown=function(){
   const b=oldBreakdown.apply(this,arguments),v=current();
   if(!v)return b;
   const matched=v.ready&&sim?.disposition?.id===v.action&&!sim?.patientDied;
   if(matched){
     b.diagnosis=15;
     b.history=Math.max(b.history||0,10);
     b.safety=Math.max(b.safety||0,20);
     b.studies=Math.max(b.studies||0,12);
     b.treatment=Math.max(b.treatment||0,20);
     b.score=Math.max(70,Math.min(100,b.diagnosis+b.history+b.safety+b.studies+b.treatment+(b.efficiency||0)-(b.penalty||0)));
     b.safe=true;b.safeReasons=[];b.missingEssential=[];
     b.notes=(b.notes||[]).filter(x=>!/(faltan conductas esenciales|fuente sin control)/i.test(x));
   }else{
     // Post-case clinical audit: show proven administrations separately from
     // prescriptions/pending access, so the learner can see WHY shock persisted.
     if(C?.id==='PERI-SEC-001'){
       const administered=sim?.administrationLog||[];
       const awaiting=sim?.csPhase4Pending487||[];
       const describe=(id,label)=>{
         const record=[...administered].reverse().find(x=>x.id===id);
         return record?
           label+': ADMINISTRADO'+(record.doseDisplay?' ('+record.doseDisplay+')':'')+'; minuto clínico '+Number(record.m||0).toFixed(1)+'.':
           awaiting.some(x=>x.id===id)?
             label+': indicado, PENDIENTE de acceso venoso. No se administró.':
             label+': SIN administración registrada.';
       };
       const consult=sim.consults?.get('cirugia');
       b.notes=[...(b.notes||[]),
         'Accesos venosos realmente colocados: '+Number(sim.venousAccessCount||0)+'.',
         'Monitor multiparamétrico: '+(sim.monitorConnected?'conectado':'sin conectar')+'.',
         describe('fluid','Cristaloides/Ringer'),
         describe('ceftriaxone','Ceftriaxona'),
         describe('metronidazole','Metronidazol'),
         'Cirugía: '+(consult?.status==='done'?'aceptó la evaluación urgente':consult?.status==='pending'?
          'interconsulta pendiente de respuesta':consult?.status==='rejected'?
          'evaluación no aceptada: '+(consult.advice||'faltaron datos'):
          'interconsulta sin respuesta registrada')+'.'];
     }
     b.safe=false;b.score=Math.min(69,b.score||0);
     b.safeReasons=[...v.missing];
     if(v.ready&&sim?.disposition?.id!==v.action)b.safeReasons.push('El destino elegido no corresponde a la situación del paciente.');
     else if(!sim?.disposition?.id)b.safeReasons.push('Definir el destino del paciente.');
   }
   // XP is evaluated AFTER finishCase changes caseEnded. Remember the verified
   // pre-closure disposition to avoid an incorrect 0-XP receipt.
   sim._csPeriCompletionForXP487=!!matched;
   return b;
 };
 const oldXpEligible=window.nsExperienceEligible;
 window.nsExperienceEligible=function(){
   if(!['PERI-PBE-001','PERI-SEC-001','PERI-TER-001'].includes(C?.id))
     return typeof oldXpEligible==='function'?oldXpEligible.apply(this,arguments):false;
   return !!sim?._csPeriCompletionForXP487&&!sim?.patientDied;
 };

 let actionButton=null,lastUiAt=0;
 function renderAction(){
   const eligible=!!C&&!!sim&&!sim.caseEnded&&!sim.patientDied&&window.nsMayExamine?.()!==false;
   const v=eligible?current():null;
   const canShow=!!v?.ready&&!sim.disposition&&!document.body.classList.contains('keyboardOpen');
   if(!canShow){if(actionButton)actionButton.style.display='none';return;}
   if(!actionButton){
     actionButton=document.createElement('button');
     actionButton.type='button';actionButton.id='csPeri487BedsideAction';
     actionButton.style.cssText='position:fixed;z-index:1205;transform:translate(-50%,-100%);max-width:210px;padding:9px 12px;border:1px solid #8ac7b3;border-radius:12px;background:#103f45;color:#edfff7;font-weight:700;box-shadow:0 4px 13px #0008;touch-action:manipulation;cursor:pointer';
     document.body.appendChild(actionButton);
     actionButton.onclick=()=>{
       const choice=current();
       if(!choice?.ready||sim?.caseEnded||sim?.patientDied||window.nsMayExamine?.()===false)return;
       if(window.csSetDisposition?.(choice.action)!==true||sim?.disposition?.id!==choice.action)return;
       actionButton.style.display='none';
       finishCase('completed');
     };
   }
   actionButton.textContent=v.label;
   const point=worldToScreen(patient.x,patient.y);
   if(!point||!Number.isFinite(point[0])||!Number.isFinite(point[1])||
      point[0]<-20||point[0]>window.innerWidth+20||point[1]<0||point[1]>window.innerHeight+20){
      actionButton.style.display='none';return;
   }
   actionButton.style.display='block';
   actionButton.style.left=Math.max(95,Math.min(window.innerWidth-95,point[0]))+'px';
   actionButton.style.top=Math.max(110,Math.min(window.innerHeight-130,point[1]-31))+'px';
   if(!sim._csPeriReadyNotified487){
     sim._csPeriReadyNotified487=true;
     nurseSay(v.action==='quirofano'?
       'Doctor, Cirugía respondió. El manejo inicial está listo y podemos trasladar al paciente a quirófano.':
       'Doctor, completamos lo necesario para continuar la atención. Podemos '+(v.action==='uti'?'derivarlo a UTI.':'internarlo en sala.'));
   }
 }
 const oldUpdate=updateSimulation;
 updateSimulation=function(dt){
   const result=oldUpdate.apply(this,arguments),now=performance.now();
   if(now-lastUiAt>=320){lastUiAt=now;renderAction();}
   return result;
 };
 window.csPeritonitisRefresh487=renderAction;
})();
</script>`;
  return html.replace('</body>',code+'</body>');
}
