import {CLINICAL_CONTROLS} from '../content/clinical-controls.js';
/**
 * UI-only context menu projected from the active world's patient coordinates.
 * No navigation, clinical execution, identity selection, or timers live here.
 * Rendering and event ownership stay with the single application lifecycle.
 */
export const PATIENT_ACTIONS=Object.freeze([
 {id:'talk',symbol:'✦',label:CLINICAL_CONTROLS.talk},
 {id:'diagnosis',symbol:'✎',label:CLINICAL_CONTROLS.diagnosis},
 {id:'examination',symbol:'♧',label:CLINICAL_CONTROLS.examination},
 {id:'history',symbol:'▤',label:CLINICAL_CONTROLS.history},
 {id:'studies',symbol:'⌁',label:CLINICAL_CONTROLS.studies},
 {id:'treatment',symbol:'✚',label:CLINICAL_CONTROLS.treatment},
 {id:'patient',symbol:'✓',label:CLINICAL_CONTROLS.patient},
 {id:'companion',symbol:'♙',label:'Hablar con acompañante'},
 {id:'hint',symbol:'💡',label:CLINICAL_CONTROLS.hint}
]);
export function createPatientActionWheel({document,window}){
 const root=document.getElementById('patientWheel');
 if(!root)throw Error('Patient action wheel host missing');
 const title=document.createElement('div');title.className='patient-wheel-caption';
 const controls=document.createElement('div');controls.className='patient-wheel-controls';
 root.replaceChildren(title,controls);
 for(const {id,symbol,label} of PATIENT_ACTIONS){
  const button=document.createElement('button');button.type='button';button.dataset.patientAction=id;
  button.hidden=id==='hint'||id==='companion';button.className='patient-wheel-action action-'+id;button.setAttribute('aria-label',label);
  const glyph=document.createElement('span');glyph.className='patient-wheel-glyph';glyph.setAttribute('aria-hidden','true');glyph.textContent=symbol;
  const text=document.createElement('span');text.textContent=label;button.append(glyph,text);controls.append(button);
 }
 let patient=null;
 function guide(action){
  for(const button of controls.children){
   const highlight=!!patient&&button.dataset.patientAction===action;
   button.classList.toggle('patient-wheel-guided',highlight);
   if(highlight)button.setAttribute('aria-description','Acción sugerida para esta etapa');
   else button.removeAttribute('aria-description');
  }
 }
 function show(p){if(!p?.uid)throw Error('World patient UID required');
  patient={uid:p.uid,x:p.x,y:p.y,bedId:p.bedId||'Paciente'};
  const companion=controls.querySelector('[data-patient-action="companion"]');
  companion.hidden=!p.historyCompanion;
  root.toggleAttribute('data-companion',!companion.hidden);
  title.textContent=patient.bedId;root.dataset.patientUid=patient.uid;root.hidden=false;
  guide(null);
 }
 function hide(){patient=null;root.hidden=true;delete root.dataset.patientUid;}
 function position(renderer,hudBottom,dockTop){
  if(!patient||root.hidden)return;
  const rect=root.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight;
  const [sx,sy]=renderer.screen(patient.x,patient.y);
  const x=Math.min(vw-rect.width/2-6,Math.max(rect.width/2+6,sx));
  const top=Number.isFinite(hudBottom)?hudBottom:0,bottom=Number.isFinite(dockTop)?dockTop:vh;
  const preferred=sy-30;
  // Keep the wheel in the walkable area as far as possible, but never offscreen.
  const low=Math.max(rect.height/2+3,top+rect.height/2+4);
  const high=Math.min(vh-rect.height/2-3,bottom-rect.height/2-3);
  const y=high>=low?Math.max(low,Math.min(high,preferred)):Math.max(rect.height/2,Math.min(vh-rect.height/2,preferred));
  root.style.left=x+'px';root.style.top=y+'px';
 }
 return Object.freeze({show,hide,guide,position,
  hintAvailable(allowed){const button=controls.querySelector('[data-patient-action="hint"]');if(button){button.hidden=!allowed;button.disabled=!allowed;}},isOpen:()=>!!patient,patientUid:()=>patient?.uid||null,root});
}
