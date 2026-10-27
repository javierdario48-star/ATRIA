// Shared catalogue policy. The durable server creates and persists the policy;
// only its existing verified reward RPC can apply the factor to account XP.
export const GUARD_SCOPES=Object.freeze({
 random:Object.freeze({label:'Cualquier caso',multiplier:1.5}),
 specialty:Object.freeze({label:'Por especialidad',multiplier:1.2}),
 specific:Object.freeze({label:'Patología específica',multiplier:1})
});
export function eligibleGuardCases(cases,playableIds,scope='random',selection=''){
 const eligible=cases.filter(c=>playableIds.includes(c.id));
 if(scope==='random')return eligible;
 if(scope==='specific')return eligible.filter(c=>c.id===selection);
 if(scope==='specialty')return eligible.filter(c=>guardCaseSpecialty(c).toLowerCase()===String(selection).toLowerCase());
 return [];
}
// This is the current Gastroenterology catalogue, including older entries
// without specialty metadata. Empty future specialties never enter the menu.
export const guardCaseSpecialty=c=>c.specialty||c.category||'Gastroenterología';
export function resolveGuardSelection(cases,playableIds,input){
 const invalid=()=>{throw Object.assign(Error('invalid guard case selection'),{code:'invalid'});};
 if(!input||typeof input!=='object'||!Object.hasOwn(GUARD_SCOPES,input.scope))return invalid();
 const {scope}=input;
 if(scope!=='random'&&typeof input.selection!=='string')return invalid();
 const selection=scope==='random'?'':input.selection;
 const eligible=eligibleGuardCases(cases,playableIds,scope,selection);
 if(!eligible.length)return invalid();
 return {version:1,scope,selection:scope==='specialty'?guardCaseSpecialty(eligible[0]):selection,caseIds:eligible.map(c=>c.id)};
}
export function guardCaseSequence(caseIds){
 // Shuffle each pool once before reuse, so small pools can cover six arrivals.
 const sequence=[];
 while(sequence.length<6){
  const pool=[...caseIds];
  for(let i=pool.length-1;i>0;i--){const n=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[pool[i],pool[n]]=[pool[n],pool[i]];}
  sequence.push(...pool.slice(0,6-sequence.length));
 }
 return sequence;
}
export function guardScopeMultiplier(scope){
 return GUARD_SCOPES[scope]?.multiplier??null;
}
