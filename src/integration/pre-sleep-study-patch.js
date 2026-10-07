(()=>{
'use strict';
const NORMAL='Sin alteraciones significativas para esta patología.';
const localNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function install(){
 if(globalThis.__atriaUniversalStudyPatch487)return;
 if(typeof findStudy!=='function'||typeof orderStudy!=='function'||typeof processCommand!=='function')return;
 const originalFind=findStudy,originalOrder=orderStudy,originalProcess=processCommand;
 function allCaseStudies(){
  const out=[],seen=new Set();
  const cases=(typeof CASES!=='undefined'&&Array.isArray(CASES))?CASES:[];
  for(const c of cases)for(const s of c?.studies||[]){
    if(!s?.id||seen.has(s.id))continue;
    seen.add(s.id);out.push(s);
  }
  return out;
 }
 function currentHas(id){return !!(typeof C!=='undefined'&&C?.studies?.some(s=>s.id===id))}
 function materialize(s){return currentHas(s?.id)?s:{...s,result:NORMAL,universalFallback:true}}
 function explicitMatch(label){
  const n=localNorm(label);if(!n)return null;
  const pool=[...(typeof C!=='undefined'&&C?.studies||[]),...allCaseStudies()];
  let best=null,score=-1;
  for(const s of pool)for(const a of [s.label,...(s.aliases||[])]){
    const x=localNorm(a);if(!x)continue;
    const exact=n===x;
    const phrase=x.length>=4&&(' '+n+' ').includes(' '+x+' ');
    if((exact||phrase)&&x.length>score){best=s;score=x.length}
  }
  return best?materialize(best):null;
 }
 function inferUnknown(label){
  const n=localNorm(label);
  const imaging=/\b(tc|tac|tomografia|resonancia|rm|radiografia|rayos x|ecografia|ultrasonido|doppler|angiografia)\b/.test(n);
  const immediate=/\b(ecg|electrocardiograma|oximetria|glucemia capilar|tira reactiva)\b/.test(n);
  return {type:immediate?'immediate':imaging?'imaging':'lab',delayHours:immediate?.5:imaging?4:2};
 }
 findStudy=function(text){
  const native=originalFind(text);
  if(native)return native;
  const n=localNorm(text);let best=null,score=0;
  for(const s of allCaseStudies())for(const a of [s.label,...(s.aliases||[])]){
    const x=localNorm(a);
    if(x&&n.includes(x)&&x.length>score){best=s;score=x.length}
  }
  return best?materialize(best):null;
 };
 orderStudy=function(study,quiet=false,requestedBy='Jugador'){
  if(!study)return;
  const gameHours=Math.max(.1,Number(study.gameHours??study.delayHours??study.delay??1));
  return originalOrder({...study,delay:gameHours*60},quiet,requestedBy);
 };
 processCommand=function(q){
  const raw=String(q||'').trim().replace(/^\//,'').trim();
  if(/^estudio\s+/i.test(raw)){
    const label=raw.replace(/^estudio\s+/i,'').trim();
    if(label){
      const known=explicitMatch(label);
      if(known)return orderStudy(known);
      const inferred=inferUnknown(label);
      return orderStudy({
        id:'universal_'+localNorm(label).replace(/\s+/g,'_').slice(0,48),
        label,aliases:[label],type:inferred.type,delayHours:inferred.delayHours,result:NORMAL,universalFallback:true
      });
    }
  }
  return originalProcess(q);
 };
 globalThis.__atriaUniversalStudyPatch487=true;
}
setTimeout(install,0);
})();
