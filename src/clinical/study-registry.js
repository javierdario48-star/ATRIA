export const REAL_MS_PER_GAME_HOUR=60_000;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export function normalStudyResult(study){
 const label=String(study?.label||'Estudio'),n=norm(label);
 if(/cultivo|microbiolog|clostridium|materia fecal|sangre oculta/.test(n))return label+': sin evidencia de patógenos, toxinas ni sangrado oculto significativo.';
 if(study?.id==='grupo')return label+': tipificación y pruebas de compatibilidad sin incidencias.';
 if(study?.type==='imaging')return label+': sin hallazgos patológicos agudos ni alteraciones significativas.';
 if(study?.type==='procedure')return label+': sin hallazgos patológicos relevantes.';
 return label+': parámetros dentro de límites de referencia, sin alteraciones significativas.';
}
export function buildStudyCatalog(cases){
 const map=new Map();
 for(const c of cases||[])for(const s of c.studies||[])if(s?.id&&!map.has(s.id))map.set(s.id,{...s,aliases:[...(s.aliases||[])],gameHours:Number(s.gameHours??s.delayHours??s.delay??1),normalResult:normalStudyResult(s)});
 return [...map.values()];
}
function score(s,n){let out=0;for(const a of [s.id,s.label,...(s.aliases||[])]){const x=norm(a);if(!x)continue;if(n===x)out=Math.max(out,10000+x.length);else if(n.includes(x))out=Math.max(out,x.length)}return out}
export function resolveStudy(query,currentCase,catalog){
 const n=norm(query);let best=null,bestScore=0;
 for(const s of currentCase?.studies||[]){const sc=score(s,n);if(sc>bestScore){best=s;bestScore=sc}}
 if(best)return best;
 best=null;bestScore=0;for(const s of catalog||[]){const sc=score(s,n);if(sc>bestScore){best=s;bestScore=sc}}return best;
}
export function resolveStudyById(id,currentCase,catalog){
 return (currentCase?.studies||[]).find(s=>s.id===id)||(catalog||[]).find(s=>s.id===id)||null;
}
export function materializeStudy(study,currentCase){
 const native=(currentCase?.studies||[]).find(s=>s.id===study?.id),s=native||study;if(!s)return null;
 return {...s,result:native?.result ?? study?.normalResult ?? normalStudyResult(study),nativeResult:!!native,universalFallback:!native};
}
export function studyReadyAt(now,study){
 const gameHours=Math.max(1,Number(study?.gameHours ?? study?.delayHours ?? study?.delay ?? 1));
 return now+gameHours*REAL_MS_PER_GAME_HOUR;
}
export const studyNorm=norm;
