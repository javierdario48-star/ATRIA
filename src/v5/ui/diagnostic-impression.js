import {csDxSpecificity487,csDxCatalog487,csDxSuggest487} from '../../clinical/diagnostic-impression-487.js';
import {esc,setHTML} from './render-content.js';

export const DESTINATION_LABELS=Object.freeze({quirofano:'Derivar a quirófano',sala:'Internar en sala',
 observacion:'Dejar en observación',uti:'Derivar a UTI',alta:'Dar el alta',procedimiento:'Derivar a procedimiento'});
export function destinationButtonsHTML(choices=[],{floating=false}={}){
 return choices.filter(id=>Object.hasOwn(DESTINATION_LABELS,id)).map(id=>
  '<button type="button" '+(floating?'data-patient-destination':'data-destination')+'="'+id+'">'+DESTINATION_LABELS[id]+'</button>').join('');
}
/** Global vocabulary only: no active case or hidden patient data is accepted. */
export function diagnosisSuggestionsHTML(cases,value){
 const terms=csDxSuggest487(csDxCatalog487(cases),value);
 return terms.map(label=>'<button type="button" data-action="diagnosis-suggestion" data-diagnosis="'+esc(label)+'">'+esc(label)+'</button>').join('')+
  '<p class="diagnosis-tip">'+esc(csDxSpecificity487(cases,value).tip)+'</p>';
}
export function diagnosisBadgeLabel(cases,value){
 const specificity=csDxSpecificity487(cases,value);
 return !value?'✎ Impresión diagnóstica':specificity.specific?'🩺 '+value+' ✎':'✎ Precisar: '+value;
}
export function diagnosisEditorHTML(p,{readOnly=false}={}){
 return '<section class="diagnosis-editor" aria-label="Impresión diagnóstica">'+
  '<label class="field" for="diagnosisInput">Impresión diagnóstica<input id="diagnosisInput" maxlength="200" autocomplete="off" '+
   'aria-controls="diagnosisSuggestions" value="'+esc(p.diagnosis)+'" placeholder="Escribí tu impresión diagnóstica"'+(readOnly?' readonly':'')+'></label>'+
  (readOnly?'<p>Observación: '+esc(p.diagnosis||'Sin impresión registrada.')+'</p>':
   '<div id="diagnosisSuggestions" class="diagnosis-suggestions"></div><div class="actions">'+
   '<button type="button" data-action="clear-diagnosis">Borrar</button><button type="button" data-action="save-diagnosis" class="primary">Registrar impresión</button></div>')+'</section>';
}

/** Cached UI projection positioned by the existing application RAF. No clock,
 * event listeners, authority, navigation or clinical state writes live here.
 */
export function createPatientClinicalOverlay({document,window,cases}){
 const root=document.getElementById('patientClinicalActions');
 if(!root)throw Error('Patient clinical overlay host missing');
 let patient=null;
 return Object.freeze({root,
  update(worldPatient,clinical){
   if(!worldPatient||clinical?.patient.uid!==worldPatient.uid||clinical.patient.caseEnded){patient=null;root.hidden=true;return;}
   patient={uid:worldPatient.uid,x:worldPatient.x,y:worldPatient.y};root.dataset.patientUid=patient.uid;
   const impression=String(clinical.patient.diagnosis||'').trim();
   const label=impression?'✎ '+impression:'✎ Impresión';
   const html='<button type="button" data-patient-diagnosis aria-label="Editar impresión diagnóstica" '+
    'title="'+esc(diagnosisBadgeLabel(cases,impression))+'">'+esc(label)+'</button>';
   setHTML(root,html);
  },
  position(renderer,hudBottom,dockTop,{obscured=false}={}){
   if(!patient||obscured){root.hidden=true;return;}
   const [sx,sy]=renderer.screen(patient.x,patient.y);
   if(sx<0||sx>window.innerWidth||sy<hudBottom||sy>dockTop){root.hidden=true;return;}
   root.hidden=false;
   const rect=root.getBoundingClientRect(),gap=14;
   // Keep the unobtrusive editor BESIDE the patient, below the speech bubble.
   // Unlike the old sy-74-height placement it never sits over the dialogue.
   const right=sx+gap,roomRight=window.innerWidth-right;
   const left=sx-rect.width-gap;
   const x=roomRight>=rect.width+8?right:left>=8?left:
    Math.max(8,Math.min(window.innerWidth-rect.width-8,right));
   root.style.left=x+'px';
   // The badge belongs BELOW the patient sprite, never over the tap-to-walk
   // approach tile to the right of B1. Previously sy+6 intercepted the final
   // route waypoint and prevented legitimate ambulatory movement.
   root.style.top=Math.max(hudBottom+6,Math.min(dockTop-rect.height-6,sy+48))+'px';
  },
  hide(){patient=null;root.hidden=true;delete root.dataset.patientUid;}
 });
}
