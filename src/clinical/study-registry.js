import {csCaseStudyFallback} from './contextual-study-results.js';
export const REAL_MS_PER_GAME_HOUR=60_000;
export const EXTRA_EMERGENCY_STUDIES=Object.freeze([{"id":"amilasa","label":"Amilasa sérica","aliases":["amilasa","amilasa serica","amilasa en sangre","amilasemia"],"type":"lab","gameHours":1,"normalResult":"Amilasa sérica: dentro de límites de referencia."},{"id":"tc_torax","label":"TC de tórax","aliases":["tomografia de torax","tomografia toracica","tc de torax","tac toracica","tac de torax","tc torax","escaner de pecho","escaner toracico"],"type":"imaging","gameHours":1.5,"normalResult":"TC de tórax: sin hallazgos torácicos agudos específicos documentados para este caso."},{"id":"tc_cerebral","label":"TC cerebral","aliases":["tomografia cerebral","tomografia de cerebro","tomografia de craneo","tc cerebral","tc de craneo","tac cerebral","tac de cerebro","tac de craneo","tomografia encefalica","tc craneal","tomografia de cabeza"],"type":"imaging","gameHours":1.5,"normalResult":"TC cerebral: sin lesiones intracraneales agudas evidentes."},{"id":"rm_cerebral","label":"Resonancia magnética cerebral","aliases":["resonancia cerebral","resonancia de cerebro","resonancia de craneo","resonancia magnetica cerebral","rmn cerebral","rm cerebral","rmn de cerebro","rm encefalica","resonancia encefalica"],"type":"imaging","gameHours":3,"normalResult":"RM cerebral: sin hallazgos estructurales intracraneales patológicos relevantes."},{"id":"glucemia","label":"Glucemia","aliases":["glucosa","glucosa en sangre","azucar en sangre"],"type":"lab","gameHours":0.25,"normalResult":"Glucemia: sin alteración específica documentada para este caso."},{"id":"creatinina","label":"Creatinina sérica","aliases":["creatinina","creatininemia"],"type":"lab","gameHours":0.5,"normalResult":"Creatinina: sin alteración específica documentada para este caso."},{"id":"urea","label":"Urea sanguínea","aliases":["urea","uremia"],"type":"lab","gameHours":0.5,"normalResult":"Urea: sin alteración específica documentada para este caso."},{"id":"ionograma","label":"Ionograma plasmático","aliases":["ionograma","electrolitos","electrolitos plasmaticos","electrolitos sericos"],"type":"lab","gameHours":0.5,"normalResult":"Ionograma: sin trastorno electrolítico específico documentado para este caso."},{"id":"sodio","label":"Sodio sérico","aliases":["sodio","natremia"],"type":"lab","gameHours":0.5,"normalResult":"Sodio sérico: sin alteración específica documentada para este caso."},{"id":"potasio","label":"Potasio sérico","aliases":["potasio","kalemia","potasemia"],"type":"lab","gameHours":0.5,"normalResult":"Potasio sérico: sin alteración específica documentada para este caso."},{"id":"calcio","label":"Calcio sérico","aliases":["calcio","calcemia"],"type":"lab","gameHours":0.75,"normalResult":"Calcio sérico: sin alteración específica documentada para este caso."},{"id":"magnesio","label":"Magnesio sérico","aliases":["magnesio","magnesemia"],"type":"lab","gameHours":0.75,"normalResult":"Magnesio sérico: sin alteración específica documentada para este caso."},{"id":"pcr","label":"Proteína C reactiva","aliases":["pcr","proteina c reactiva","proteina c-reactiva"],"type":"lab","gameHours":1,"normalResult":"Proteína C reactiva: sin valor individual cuantificado en los datos del caso."},{"id":"vsg","label":"Velocidad de sedimentación globular","aliases":["vsg","eritrosedimentacion","velocidad de sedimentacion"],"type":"lab","gameHours":1,"normalResult":"VSG: sin valor individual cuantificado en los datos del caso."},{"id":"lactato","label":"Lactato sérico","aliases":["lactato","acido lactico","lactatemia"],"type":"lab","gameHours":0.35,"normalResult":"Lactato: sin valor individual cuantificado en los datos del caso."},{"id":"coagulograma","label":"Coagulograma","aliases":["coagulograma","pruebas de coagulacion","perfil de coagulacion"],"type":"lab","gameHours":0.7,"normalResult":"Coagulograma: sin alteración específica documentada para este caso."},{"id":"inr","label":"INR","aliases":["inr","razon internacional normalizada"],"type":"lab","gameHours":0.7,"normalResult":"INR: sin valor individual cuantificado en los datos del caso."},{"id":"orina_completa","label":"Análisis de orina completo","aliases":["orina completa","orina","sedimento urinario","uroanalisis","analisis de orina"],"type":"lab","gameHours":0.7,"normalResult":"Orina completa: sin hallazgos específicos documentados para este caso."},{"id":"hemocultivos","label":"Hemocultivos","aliases":["hemocultivos","hemocultivo","cultivo de sangre"],"type":"lab","gameHours":24,"normalResult":"Hemocultivos: sin crecimiento bacteriano documentado en el resultado disponible."},{"id":"troponina","label":"Troponina cardíaca","aliases":["troponina","troponinas","troponina cardiaca"],"type":"lab","gameHours":1,"normalResult":"Troponina: sin lesión miocárdica específica documentada para este caso."},{"id":"electrocardiograma","label":"Electrocardiograma","aliases":["electrocardiograma","ecg","ekg"],"type":"procedure","gameHours":0.17,"normalResult":"Electrocardiograma: sin hallazgos electrocardiográficos agudos específicos documentados para este caso."},{"id":"rx_torax","label":"Radiografía de tórax","aliases":["radiografia de torax","radiografia toracica","rx de torax","rx torax","placa de torax"],"type":"imaging","gameHours":0.65,"normalResult":"Radiografía de tórax: sin hallazgos torácicos agudos específicos documentados para este caso."}]);
// Emergency-department turnaround estimates in GAME MINUTES; one game minute = one real second.
// Nonurgent cultures/procedures intentionally take longer; workflow scheduling is a separate concern.
export const STUDY_TAT_MINUTES=Object.freeze({"amilasa":60,"hepatograma":70,"hemograma":35,"renal":45,"eco":75,"paracentesis":45,"lipasa":60,"gasometria":10,"tc":120,"inflamatorio":65,"stool":150,"colonoscopia":240,"enterorm":240,"b12":180,"hda_lab":60,"grupo":50,"eda":120,"iron":90,"fobt":45,"staging":180,"cea":120,"pbe_paracentesis":40,"pbe_culture":1440,"pbe_renal":45,"pbe_cbc":35,"peri_cbc":45,"peri_gas":20,"peri_rx":45,"peri_ct":110,"peri_fluid":70,"ter_cbc":55,"ter_ct":120,"ter_culture":1440,"app_cbc":45,"app_urine":35,"app_us":75,"app_ct":110,"chole_cbc":35,"chole_liver":65,"chole_us":75,"ileo_lab":55,"ileo_gas":15,"ileo_xray":40,"ileo_ct":105,"mesi_lab":70,"mesi_gas":15,"mesi_cta":95,"mesi_angio":135,"cholang_cbc":50,"cholang_liver":70,"cholang_us":85,"cholang_ercp":150,"tc_torax":90,"tc_cerebral":90,"rm_cerebral":180,"glucemia":15,"creatinina":30,"urea":30,"ionograma":30,"sodio":30,"potasio":30,"calcio":45,"magnesio":45,"pcr":60,"vsg":60,"lactato":21,"coagulograma":42,"inr":42,"orina_completa":42,"hemocultivos":1440,"troponina":60,"electrocardiograma":10,"rx_torax":39});
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
 for(const s of EXTRA_EMERGENCY_STUDIES)if(!map.has(s.id))map.set(s.id,{...s,aliases:[...s.aliases],gameHours:studyTurnaroundMinutes(s)/60});
 return [...map.values()];
}
function score(s,n){let out=0;for(const a of [s.id,s.label,...(s.aliases||[])]){const x=norm(a);if(!x)continue;if(n===x)out=Math.max(out,10000+x.length);else if(n.includes(x))out=Math.max(out,x.length)}return out}
export function resolveStudy(query,currentCase,catalog){
 const n=norm(query);
 const words=n.split(/\s+/),has=arr=>words.some(x=>arr.includes(x)),head=has(['cerebral','cerebro','encefalo','craneo','cranial','cabeza']),chest=has(['torax','toracico','toracica','pecho','pulmonar']),abdomen=has(['abdomen','abdominal','abdominopelvica','abdominopelvico','pelvis']),ct=has(['tomografia','tac','tc','escaner']),mr=has(['resonancia','rmn','rm']),rx=has(['radiografia','rx','placa']);
 const exact=head&&ct?'tc_cerebral':head&&mr?'rm_cerebral':chest&&!abdomen&&ct?'tc_torax':chest&&!abdomen&&rx?'rx_torax':null;
 if(exact)return (catalog||[]).find(s=>s.id===exact)||null;
let best=null,bestScore=0;
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
