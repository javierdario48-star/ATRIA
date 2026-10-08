import {csCaseStudyFallback} from './contextual-study-results.js';
export const REAL_MS_PER_GAME_HOUR=60_000;
// Emergency-department turnaround estimates in GAME MINUTES; one game minute = one real second.
// Nonurgent cultures/procedures intentionally take longer; workflow scheduling is a separate concern.
export const STUDY_TAT_MINUTES=Object.freeze({"hepatograma":70,"hemograma":35,"renal":45,"eco":75,"paracentesis":45,"lipasa":60,"gasometria":10,"tc":120,"inflamatorio":65,"stool":150,"colonoscopia":240,"enterorm":240,"b12":180,"hda_lab":60,"grupo":50,"eda":120,"iron":90,"fobt":45,"staging":180,"cea":120,"pbe_paracentesis":40,"pbe_culture":1440,"pbe_renal":45,"pbe_cbc":35,"peri_cbc":45,"peri_gas":20,"peri_rx":45,"peri_ct":110,"peri_fluid":70,"ter_cbc":55,"ter_ct":120,"ter_culture":1440,"app_cbc":45,"app_urine":35,"app_us":75,"app_ct":110,"chole_cbc":35,"chole_liver":65,"chole_us":75,"ileo_lab":55,"ileo_gas":15,"ileo_xray":40,"ileo_ct":105,"mesi_lab":70,"mesi_gas":15,"mesi_cta":95,"mesi_angio":135,"cholang_cbc":50,"cholang_liver":70,"cholang_us":85,"cholang_ercp":150});
export function studyTurnaroundMinutes(study){
 const explicit=STUDY_TAT_MINUTES[String(study?.id||'')];
 if(Number.isFinite(explicit)&&explicit>0)return explicit;
 const hours=Number(study?.gameHours??study?.delayHours??study?.delay);
 if(Number.isFinite(hours)&&hours>0)return Math.max(1,hours*60);
 return study?.type==='imaging'?120:study?.type==='procedure'?180:60;
}

const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export function normalStudyResult(study){
 const label=String(study?.label||'Estudio'),n=norm(label);
 if(/cultivo|microbiolog|clostridium|materia fecal|sangre oculta/.test(n))return label+': sin evidencia de patógenos, toxinas ni sangrado oculto significativo.';
 if(study?.id==='grupo')return label+': tipificación y pruebas de compatibilidad sin incidencias.';
 if(study?.type==='imaging')return label+': sin hallazgos patológicos agudos ni alteraciones significativas.';
 if(study?.type==='procedure')return label+': sin hallazgos patológicos relevantes.';
 return label+': Sin alteraciones significativas; parámetros dentro de límites de referencia.';
}
export function buildStudyCatalog(cases){
 const map=new Map();
 for(const c of cases||[])for(const s of c.studies||[])if(s?.id&&!map.has(s.id))map.set(s.id,{...s,aliases:[...(s.aliases||[])],gameHours:studyTurnaroundMinutes(s)/60,normalResult:normalStudyResult(s)});
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
 return {...s,gameHours:studyTurnaroundMinutes(s)/60,result:native?.result ?? csCaseStudyFallback({...study,normalResult:study?.normalResult ?? normalStudyResult(study)},currentCase) ?? normalStudyResult(study),nativeResult:!!native,universalFallback:!native};
}
export function studyReadyAt(now,study){
 return now+studyTurnaroundMinutes(study)*1000;
}
export const studyNorm=norm;
