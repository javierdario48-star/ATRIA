const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export function normalStudyResult(study){
 const label=String(study?.label||'Estudio');
 const n=norm(label);
 if(/cultivo|microbiolog|clostridium|materia fecal|sangre oculta/.test(n))return label+': sin evidencia de patógenos, toxinas ni sangrado oculto significativo.';
 if(/grupo|factor|sangre/.test(n)&&study?.id==='grupo')return label+': tipificación y pruebas de compatibilidad sin incidencias.';
 if(study?.type==='imaging')return label+': sin hallazgos patológicos agudos ni alteraciones significativas.';
 if(study?.type==='procedure')return label+': sin hallazgos patológicos relevantes.';
 return label+': parámetros dentro de límites de referencia, sin alteraciones significativas.';
}

export function buildStudyCatalog(cases){
 const map=new Map();
 for(const c of cases||[])for(const st of c.studies||[])if(st?.id&&!map.has(st.id))map.set(st.id,{
   id:st.id,label:st.label,aliases:[...(st.aliases||[])],type:st.type||'lab',
   gameHours:Number(st.gameHours??st.delayHours??st.delay??1),normalResult:normalStudyResult(st)
 });
 return [...map.values()];
}

function scoreStudy(st,input){
 const n=norm(input);let score=0;
 for(const a of [st.id,st.label,...(st.aliases||[])]){const x=norm(a);if(!x)continue;if(n===x)score=Math.max(score,10000+x.length);else if(n.includes(x))score=Math.max(score,x.length)}
 return score;
}

export function resolveStudyById(cases,currentCase,id){
 const catalog=buildStudyCatalog(cases),native=currentCase?.studies||[],own=native.find(st=>st.id===id);
 if(own)return {...own,gameHours:Number(own.gameHours??own.delayHours??own.delay??1),universalFallback:false};
 const st=catalog.find(x=>x.id===id);return st?{...st,result:st.normalResult,delay:st.gameHours,universalFallback:true}:null;
}

export function resolveStudy(cases,currentCase,input){
 const catalog=buildStudyCatalog(cases),native=currentCase?.studies||[];
 let best=null,bestScore=0;
 for(const st of native){const sc=scoreStudy(st,input);if(sc>bestScore){best=st;bestScore=sc}}
 if(best)return {...best,gameHours:Number(best.gameHours??best.delayHours??best.delay??1),universalFallback:false};
 best=null;bestScore=0;
 for(const st of catalog){const sc=scoreStudy(st,input);if(sc>bestScore){best=st;bestScore=sc}}
 if(!best)return null;
 return {...best,result:best.normalResult,delay:best.gameHours,universalFallback:true};
}

export const studyNorm=norm;
