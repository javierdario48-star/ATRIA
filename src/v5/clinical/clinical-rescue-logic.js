// One AND/OR rescue contract for native recovery, disposition and Dr. Vega.
// Pure: never administers a drug, creates a complication or adjusts vitals.
export function clinicalRescueAlternatives(definition){
 const all=definition?.rescueAllOf||[],any=definition?.rescueAnyOf||[];
 if(!all.length&&!any.length)return [];
 return any.length?any.map(id=>[...new Set([...all,id])]):[[...all]];
}
export function confirmedClinicalRescue(definition,readReceipt){
 const all=(definition?.rescueAllOf||[]).map(readReceipt);
 const any=(definition?.rescueAnyOf||[]).map(readReceipt).filter(Boolean);
 const rescued=!!(all.length||definition?.rescueAnyOf?.length)&&all.every(Boolean)&&
  (!definition?.rescueAnyOf?.length||any.length>0);
 if(!rescued)return {rescued:false,evidence:[]};
 const first=any.length?any.reduce((a,b)=>
  a.administeredAtNativeMinute<b.administeredAtNativeMinute?a:b):null;
 return {rescued:true,evidence:[...all,...(first?[first]:[])]};
}
export function outstandingClinicalRescue(definition,completed=[]){
 const done=completed instanceof Set?completed:new Set(completed);
 const groups=clinicalRescueAlternatives(definition).map(g=>g.filter(id=>!done.has(id)));
 if(groups.some(g=>!g.length))return [];
 const seen=new Set();
 return groups.filter(g=>{
  const key=JSON.stringify(g);if(seen.has(key))return false;
  seen.add(key);return true;
 });
}
