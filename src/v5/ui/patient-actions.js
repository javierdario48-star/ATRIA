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
 const hud=document.getElementById('hud'),rail=document.querySelector('.guard-rail');
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
  const vw=window.innerWidth,vh=window.innerHeight;
  const top=Math.max(3,Number.isFinite(hudBottom)?hudBottom+4:0);
  const bottom=Math.min(vh-3,Number.isFinite(dockTop)?dockTop-3:vh);
  let left=6,right=vw-6,compact=false;
  if(vw>vh&&vh<=500){
   // Measure the radial layout independently of the current compact size.
   const style=window.getComputedStyle(root);
   const radialHeight=parseFloat(style.getPropertyValue('--patient-wheel-radial-height'))*
    parseFloat(style.getPropertyValue('--patient-wheel-scale'));
   compact=radialHeight>bottom-top;
   if(compact){
    const hudRect=hud?.getBoundingClientRect(),railRect=rail?.getBoundingClientRect();
    if(hudRect?.width){left=Math.max(left,hudRect.left);right=Math.min(right,hudRect.right);}
    if(railRect?.width&&railRect.bottom>top&&railRect.top<bottom)left=Math.max(left,railRect.right+6);
    root.style.setProperty('--patient-wheel-available-width',Math.max(0,right-left)+'px');
    root.style.setProperty('--patient-wheel-available-height',Math.max(44,bottom-top)+'px');
   }
  }
  root.toggleAttribute('data-compact',compact);
  const rect=root.getBoundingClientRect();
  const [sx,sy]=renderer.screen(patient.x,patient.y);
  const halfWidth=rect.width/2,halfHeight=rect.height/2;
  const preferredX=compact&&sx+36+rect.width<=right?sx+36+halfWidth:sx;
  const x=Math.min(right-halfWidth,Math.max(left+halfWidth,preferredX));
  const preferred=sy-30;
  const low=top+halfHeight,high=bottom-halfHeight;
  const y=high>=low?Math.max(low,Math.min(high,preferred)):Math.max(halfHeight,Math.min(vh-halfHeight,preferred));
  root.style.left=x+'px';root.style.top=y+'px';
 }
 return Object.freeze({show,hide,guide,position,
  hintAvailable(allowed){const button=controls.querySelector('[data-patient-action="hint"]');if(button){button.hidden=!allowed;button.disabled=!allowed;}},isOpen:()=>!!patient,patientUid:()=>patient?.uid||null,root});
}
