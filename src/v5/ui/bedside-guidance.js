import {clinicalWorkflow} from './clinical-workflow.js';

/** Presentation hints from visible, authenticated clinical progress only.
 * No answer key, diagnosis inference, treatment recommendation or new clock. */
export function suggestedBedsideAction(state){
 const p=state?.patient;
 if(!p||p.caseEnded||p.patientDied||p.closure?.closed||state.canEdit===false)return null;
 const flow=clinicalWorkflow(state);
 if(!flow)return null;
 const ready=Array.isArray(state.eligibleDestinations)&&state.eligibleDestinations.length>0;
 const pending=(p.pendingTreatments||[]).length+(p.pendingConsults||[]).length>0;
 if(ready&&!pending)return 'patient';
 if(!p.diagnosis&&flow.cue?.id==='diagnosis')return 'diagnosis';
 if(!(p.intentHistory||[]).length)return 'talk';
 return null;
}

/** Map highlight is a visual hint, never a click target or owner claim.
 * The original map interaction remains responsible for patient selection. */
export function unassignedPatientMarkers(phase,mode,patients=[],records=[]){
 if(phase!=='guard'||mode!=='competitive'||!Array.isArray(patients))return [];
 const byUid=new Map((records||[]).map(p=>[p.uid,p]));
 return patients.filter(p=>{
  const r=byUid.get(p.uid);
  return r&&!r.ownerId&&!r.closed&&!r.departed&&!r.patientDied&&
   !p.departed&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 }).map(p=>({uid:p.uid,x:p.x,y:p.y}));
}

export function createUnassignedPatientGlow({document}){
 const elements=new Map();
 function update(phase,mode,patients,records){
  const shown=unassignedPatientMarkers(phase,mode,patients,records);
  const active=new Set(shown.map(p=>p.uid));
  for(const [uid,item] of elements)if(!active.has(uid)){item.element.remove();elements.delete(uid);}
  for(const p of shown){
   if(elements.has(p.uid)){elements.get(p.uid).point=p;continue;}
   const el=document.createElement('span');
   el.className='unassigned-patient-marker';
   el.setAttribute('aria-hidden','true');
   el.dataset.patientUid=p.uid;
   document.body.append(el);elements.set(p.uid,{element:el,point:p});
  }
 }
 function position(renderer,top,bottom){
  for(const {element,point} of elements.values()){
   const [x,y]=renderer.screen(point.x,point.y);
   const visible=Number.isFinite(x)&&Number.isFinite(y)&&x>=34&&
    x<=document.documentElement.clientWidth-34&&y>=top+34&&y<=bottom-34;
   element.hidden=!visible;
   if(visible){element.style.left=x+'px';element.style.top=y+'px';}
  }
 }
 function destroy(){for(const {element} of elements.values())element.remove();elements.clear();}
 return Object.freeze({update,position,destroy,count:()=>elements.size});
}
