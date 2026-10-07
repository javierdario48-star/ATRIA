import assert from'node:assert/strict';import fs from'node:fs';
const html=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
function literalAfter(mark,open,close){const k=html.indexOf(mark),a=html.indexOf(open,k);assert(k>=0&&a>=0,mark);let d=0,q=false,e=false;for(let i=a;i<html.length;i++){const c=html[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c==='"')q=false;continue}if(c==='"'){q=true;continue}if(c===open)d++;else if(c===close&&--d===0)return JSON.parse(html.slice(a,i+1))}throw Error(mark)}
const cases=literalAfter('const CASES=','[',']'),alg=literalAfter('const CASE_ALGORITHMS=','{','}');
const expected={
'CIRR-001':{studies:['hepatograma','hemograma','renal','eco','paracentesis'],tx:['sal_restriccion','espironolactona'],result:['albúmina 2,7','ascitis']},
'PANC-001':{studies:['hemograma','lipasa','gasometria','eco','tc'],tx:['fluid','npo','analgesia'],result:['>3 veces','necrosis']},
'CROHN-001':{studies:['inflamatorio','stool','colonoscopia','enterorm'],tx:['steroid','aza'],result:['granulomas','sin absceso']},
'HDA-001':{studies:['hda_lab','grupo','eda'],tx:['iv','fluid','ppi'],result:['sangre compatible','Forrest 2']},
'COLON-001':{studies:['iron','fobt','colonoscopia','staging'],tx:['staging_order','surgery'],result:['adenocarcinoma','Sin metástasis']},
'PERI-PBE-001':{studies:['pbe_paracentesis','pbe_renal','pbe_cbc','pbe_culture'],tx:['ceftriaxone','albumin'],result:['780 PMN','Escherichia coli']},
'PERI-SEC-001':{studies:['peri_cbc','peri_gas','peri_ct'],tx:['fluid','ceftriaxone','metronidazole','source_control'],result:['perforada','polimicrobiano']},
'PERI-TER-001':{studies:['ter_cbc','ter_ct','ter_culture'],tx:['fluid','ampicillin','amikacin','fluconazole'],result:['Enterococcus','Candida']},
'APP-001':{studies:['app_cbc','app_us'],tx:['npo','fluid','ceftriaxone','metronidazole','source_control'],result:['no compresible','periapendicular']},
'CHOLE-001':{studies:['chole_cbc','chole_liver','chole_us'],tx:['npo','fluid','ceftriaxone','metronidazole','source_control'],result:['pared engrosada','Murphy ecográfico']},
'ILEO-001':{studies:['ileo_lab','ileo_gas','ileo_xray','ileo_ct'],tx:['npo','fluid','ngt'],result:['niveles hidroaéreos','punto de transición']},
'MESI-001':{studies:['mesi_lab','mesi_gas','mesi_cta'],tx:['npo','fluid','source_control'],result:['lactato 5,1','mesentérica superior']},
'CHOLANG-001':{studies:['cholang_cbc','cholang_liver','cholang_us','cholang_ercp'],tx:['fluid','ceftriaxone','metronidazole','source_control'],result:['Patrón colestásico','bilis infectada']}
};
assert.equal(cases.length,13);assert.equal(Object.keys(alg).length,13);assert.deepEqual(new Set(cases.map(c=>c.id)),new Set(Object.keys(expected)));
for(const c of cases){const e=expected[c.id],a=alg[c.id];assert(a,c.id+' algorithm missing');for(const id of e.studies)assert(a.coreStudies.includes(id),c.id+' missing core study '+id);for(const id of e.tx)assert(a.interventions.includes(id),c.id+' missing core treatment '+id);const results=(c.studies||[]).map(s=>s.result).join(' | ');for(const fragment of e.result)assert(results.includes(fragment),c.id+' missing book-aligned result fragment '+fragment);assert(a.diagnosisPrompt&&a.diagnosisTeach&&a.planPrompt&&a.planTeach&&a.reassess,c.id+' incomplete diagnostic/management state machine');for(const id of [...a.coreStudies,...a.conditionalStudies])assert(c.studies.some(s=>s.id===id),c.id+' algorithm study not in case '+id);for(const id of [...a.interventions,...a.conditionalInterventions])assert(c.interventions.some(x=>x.id===id),c.id+' algorithm intervention not in case '+id)}
assert(alg['HDA-001'].conditionalInterventions.includes('transfusion'));
assert(alg['COLON-001'].conditionalStudies.includes('cea'));
assert(alg['PERI-SEC-001'].conditionalStudies.includes('peri_rx')&&alg['PERI-SEC-001'].conditionalStudies.includes('peri_fluid'));
assert(alg['APP-001'].conditionalStudies.includes('app_ct')&&alg['APP-001'].conditionalStudies.includes('app_urine'));
assert(JSON.stringify(alg['ILEO-001']).includes('estrangul'),'ileus algorithm must explicitly detect strangulation risk');
assert(alg['MESI-001'].planTeach.toLowerCase().includes('reperf'));
assert(alg['CHOLANG-001'].planTeach.includes('CPRE')||alg['CHOLANG-001'].planTeach.includes('drenaje'));
console.log('gastro book clinical contract OK',{cases:cases.length,algorithms:Object.keys(alg).length});
