export const REAL_MS_PER_GAME_HOUR=60_000;
export function buildStudyCatalog(cases){
 const map=new Map();
 for(const c of cases||[])for(const s of c.studies||[]){const prev=map.get(s.id);if(!prev)map.set(s.id,{...s,aliases:[...(s.aliases||[])]});}
 return [...map.values()];
}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function resolveStudy(query,currentCase,catalog){
 const n=norm(query);let best=null,score=0;
 const pool=[...(currentCase?.studies||[]),...(catalog||[])];
 for(const s of pool)for(const a of [s.label,...(s.aliases||[])]){const x=norm(a);if(x&&n.includes(x)&&x.length>score){best=s;score=x.length}}
 return best;
}
export function materializeStudy(study,currentCase,{normalResult='Sin alteraciones significativas para esta patología.'}={}){
 const native=(currentCase?.studies||[]).find(s=>s.id===study?.id);
 const s=native||study;
 if(!s)return null;
 return {...s,result:native?.result ?? normalResult,nativeResult:!!native};
}
export function studyReadyAt(now,study){
 const gameHours=Math.max(1,Number(study?.gameHours ?? study?.delayHours ?? study?.delay ?? 1));
 return now+gameHours*REAL_MS_PER_GAME_HOUR;
}
