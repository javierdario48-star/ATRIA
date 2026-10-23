import {clinicalWorkflow} from './clinical-workflow.js';
import {esc,setHTML} from './render-content.js';

const symbols={done:'✓',partial:'◐',ready:'→',review:'◐',attention:'!',pending:'·'};
export function clinicalChecklistHTML(state,{collapsed=false}={}){
 const steps=clinicalWorkflow(state)?.steps||[];
 return '<div class="bedside-checklist-head"><strong>Ruta clínica</strong>'+
  '<button type="button" data-action="toggle-clinical-checklist" aria-expanded="'+String(!collapsed)+'" '+
  'aria-label="'+(collapsed?'Expandir':'Contraer')+' ruta clínica">'+(collapsed?'▸':'−')+'</button></div>'+
  (collapsed?'':'<ol class="bedside-checklist-steps">'+steps.map(x=>
   '<li data-status="'+esc(x.status)+'"><span aria-hidden="true">'+symbols[x.status]+'</span>'+
   '<span>'+esc(x.label)+'</span></li>').join('')+'</ol>'+
   '<small>Seguimiento, no solución del caso</small>');
}
/** A single read-only overlay owned by application lifecycle, not the clinical engine. */
export function createClinicalChecklist({document}){
 const root=document.getElementById('bedsideChecklist');
 if(!root)throw Error('Clinical checklist host missing');
 let uid=null,collapsed=false,previous='';
 function update(state){
  if(!uid||!state||state.patient?.uid!==uid||state.patient?.caseEnded||state.patient?.patientDied){
   if(uid&&(state?.patient?.caseEnded||state?.patient?.closure?.closed||state?.patient?.patientDied))hide();
   return;
  }
  const html=clinicalChecklistHTML(state,{collapsed});
  if(html!==previous){setHTML(root,html);previous=html;}
 }
 function show(patientUid,state){
  if(!patientUid||state?.patient.uid!==patientUid)return false;
  if(uid!==patientUid){collapsed=false;previous='';}
  uid=patientUid;root.hidden=false;update(state);return true;
 }
 function hide(){uid=null;previous='';root.hidden=true;setHTML(root,'');}
 function toggle(){if(!uid)return;collapsed=!collapsed;previous='';}
 return Object.freeze({root,show,update,hide,toggle,isOpen:()=>!!uid});
}
