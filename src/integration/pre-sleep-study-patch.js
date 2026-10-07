(()=>{
'use strict';
if(typeof findStudy!=='function'||typeof orderStudy!=='function'||typeof processCommand!=='function')return;
if(globalThis.__atriaUniversalStudyPatch487)return;
globalThis.__atriaUniversalStudyPatch487=true;
const NORMAL='Sin alteraciones significativas para esta patología.';
const originalFind=findStudy;
const originalOrder=orderStudy;
const originalProcess=processCommand;
const localNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function allCaseStudies(){
 const out=[],seen=new Set();
 const cases=(typeof CASES!=='undefined'&&Array.isArray(CASES))?CASES:[];
 for(const c of cases)for(const s of c?.studies||[]){
   if(!s?.id||seen.has(s.id))continue;
   seen.add(s.id);out.push(s);
 }
 return out;
}
findStudy=function(text){
 const native=originalFind(text);
 if(native)return native;
 const n=localNorm(text);let best=null,score=0;
 for(const s of allCaseStudies())for(const a of [s.label,...(s.aliases||[])]){
   const x=localNorm(a);
   if(x&&n.includes(x)&&x.length>score){best=s;score=x.length}
 }
 return best?{...best,result:NORMAL,universalFallback:true}:null;
};
orderStudy=function(study,quiet=false,requestedBy='Jugador'){
 if(!study)return;
 const gameHours=Math.max(1,Number(study.gameHours??study.delayHours??study.delay??1));
 return originalOrder({...study,delay:gameHours*60},quiet,requestedBy);
};
processCommand=function(q){
 const raw=String(q||'').trim().replace(/^\//,'').trim();
 if(/^estudio\s+/i.test(raw)){
   const label=raw.replace(/^estudio\s+/i,'').trim();
   if(label&&!findStudy(label)){
     return orderStudy({
       id:'universal_'+localNorm(label).replace(/\s+/g,'_').slice(0,48),
       label,
       aliases:[label],
       type:'lab',
       delayHours:2,
       result:NORMAL,
       universalFallback:true
     });
   }
 }
 return originalProcess(q);
};
})();
