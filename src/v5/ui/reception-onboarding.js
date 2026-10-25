/** Presentation-only competitive reception hint. No ownership or clinical mutations. */
export function needsReceptionOnboarding({phase,mode,patients=[],selfId,ended=false,selecting=false}={}){
 return phase==='guard'&&mode==='competitive'&&!ended&&!selecting&&!!selfId&&
  Array.isArray(patients)&&patients.some(p=>!p.closed&&!p.departed&&!p.patientDied&&!p.ownerId)&&
  !patients.some(p=>p.ownerId===selfId&&!p.closed&&!p.departed&&!p.patientDied);
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
