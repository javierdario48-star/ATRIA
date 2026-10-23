import {clinicalWorkflow} from './clinical-workflow.js';
import {esc,setHTML} from './render-content.js';

const symbols={done:'✓',partial:'◐',ready:'→',review:'◐',attention:'!',pending:'·'};
const labels={done:'Registrado',partial:'Parcial',ready:'Destino habilitado',review:'Reevaluar',attention:'Atención',pending:'Pendiente'};
/** A read-only bedside guide: mirrors confirmed data, never grants permission,
 * scores a case or infers the correct diagnosis. One selected patient only.
 */
export function careChecklistHTML(state,{collapsed=false}={}){
 const steps=clinicalWorkflow(state)?.steps||[];
 const completed=steps.filter(step=>step.status==='done').length;
 return '<div class="care-guide-title"><span><strong>Ruta clínica</strong><small>'+completed+' / '+steps.length+' registrados</small></span>'+
  '<button type="button" data-care-guide-toggle aria-label="'+(collapsed?'Expandir':'Plegar')+' checklist clínico" aria-expanded="'+(!collapsed)+'">'+(collapsed?'＋':'−')+'</button></div>'+
  (collapsed?'':'<ol class="care-guide-steps">'+steps.map(step=>
   '<li data-status="'+step.status+'" title="'+esc(labels[step.status])+'"><span class="care-guide-icon">'+symbols[step.status]+
   '</span><span>'+esc(step.label)+'</span></li>').join('')+'</ol>'+
   '<small class="care-guide-foot">Registro clínico, no indica la respuesta correcta.</small>');
}
export function createPatientCareChecklist({document}){
 const root=document.getElementById('patientCareChecklist');
 if(!root)throw Error('Patient care checklist host missing');
 let uid=null,collapsed=false,prior=null;
 return Object.freeze({
  root,
  show(patientUid){
   if(!patientUid)return;
   if(uid!==patientUid){uid=patientUid;collapsed=false;prior=null;}
   root.dataset.patientUid=uid;root.hidden=false;
  },
  update(clinical){
   if(!uid||clinical?.patient?.uid!==uid||clinical.patient.caseEnded||clinical.patient.patientDied){
    root.hidden=true;return;
   }
   const html=careChecklistHTML(clinical,{collapsed});
   if(html!==prior){setHTML(root,html);prior=html;}
   root.hidden=false;
  },
  position(hudBottom,dockTop){
   if(!uid||root.hidden)return;
   const top=Math.max(68,Math.ceil(hudBottom)+12),bottom=Math.max(top+85,Math.floor(dockTop)-8);
   root.style.top=top+'px';root.style.maxHeight=Math.max(76,bottom-top)+'px';
  },
  toggle(){collapsed=!collapsed;prior=null;},
  hide(){uid=null;prior=null;root.hidden=true;delete root.dataset.patientUid;},
  selected:()=>uid,
  isCollapsed:()=>collapsed
 });
}
