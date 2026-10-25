/** Presentation-only reception hint for every guard mode. No ownership or clinical mutations. */
export function needsReceptionOnboarding({phase,mode,patients=[],selfId,
 ended=false,selecting=false,focusedPatientUid=null}={}){
 if(phase!=='guard'||ended||selecting||!Array.isArray(patients))return false;
 const active=patients.filter(p=>!p.closed&&!p.departed&&!p.patientDied);
 if(!active.length)return false;
 // Shared/local guards do not claim exclusive ownership: stop the cue only
 // after this player selects a real bedside, regardless of teammate activity.
 if(['solo','apprentice','coop'].includes(mode))return !focusedPatientUid;
 return mode==='competitive'&&!!selfId&&active.some(p=>!p.ownerId)&&
  !active.some(p=>p.ownerId===selfId);
}
export function createReceptionOnboarding({button,guide,window}){
 if(!button||!guide||!window)throw Error('reception hint needs its host elements');
 let visible=false;
 function update(state){
  const show=needsReceptionOnboarding(state);
  button.classList.toggle('reception-highlight',show);
  guide.hidden=!show;
  if(show){
   const rect=button.getBoundingClientRect();
   const width=Math.min(260,Math.max(180,window.innerWidth-16));
   guide.style.left=Math.round(Math.max(8,Math.min(window.innerWidth-width-8,rect.left-30)))+'px';
   guide.style.top=Math.round(rect.bottom+10)+'px';
  }
  visible=show;return visible;
 }
 return Object.freeze({update,visible:()=>visible});
}
