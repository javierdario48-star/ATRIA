import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from '../clinical/guard-session.js';
import {examinedRegions,progressiveExamImpression,examRegionStatus} from './exam-summary.js';
import {examinationHTML} from './examination-panel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
function setup(caseId='CIRR-001'){
 const s=createGuardSession({roomId:'P',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
 let id=0;
 return {s,send:text=>s.post({id:'exam-'+(++id),text}),p:()=>s.read().patient};
}
test('anatomy presentation contains progressive impression, technique controls and retained complete record',()=>{
 const html=examinationHTML();
 for(const label of ['examProgressiveSummary','examBodyMarkers','examBodyFindings','examTechniques','examRecord','examResults'])
  assert(html.includes('id="'+label+'"'),label);
 assert(html.includes('data-exam-region="abdomen"'));
});
test('unexplored findings stay absent, and no unmodeled organ is called normal',async()=>{
 const f=setup('APP-001');
 assert.equal(progressiveExamImpression(f.p()).examined,0);
 assert.match(progressiveExamImpression(f.p()).summary,/Pendiente/);
 await f.send('/examen abdomen inspection');
 let sections=examinedRegions(f.p()),ab=sections.find(x=>x.id==='abdomen');
 assert.equal(ab.status,'unmodeled');
 assert.equal(ab.summary,'Sin datos específicos modelados');
 assert(!progressiveExamImpression(f.p()).summary.includes('McBurney'));
 assert.equal(examRegionStatus(f.p(),'thorax'),'pending');
 await f.send('/examen abdomen palpation');
 sections=examinedRegions(f.p());ab=sections.find(x=>x.id==='abdomen');
 assert.equal(ab.status,'observed');
 assert.match(ab.summary,/McBurney|fosa ilíaca/);
 assert.match(ab.methods.find(x=>x.id==='palpation').findings[0].text,/Blumberg/);
 assert.match(progressiveExamImpression(f.p()).summary,/Abdomen/);
 assert(!progressiveExamImpression(f.p()).summary.includes('arañas vasculares'));
 assert(!sections.some(x=>x.id==='liver'));
 f.s.dispose();
});
test('progressive summary accumulates only performed findings by region and technique, with full details intact',async()=>{
 const f=setup('CIRR-001');
 await f.send('/examen general general');
 let impression=progressiveExamImpression(f.p());
 assert(impression.summary.includes('Adelgazado'));
 assert(!impression.summary.includes('esplenomegalia'));
 await f.send('/examen skin inspection');
 await f.send('/examen abdomen inspection');
 await f.send('/examen spleen palpation');
 impression=progressiveExamImpression(f.p());
 assert.equal(impression.examined,4);
 assert(impression.findings.some(x=>/Arañas vasculares/.test(x.text)));
 assert(impression.findings.some(x=>/Abdomen globoso/.test(x.text)));
 assert(impression.findings.some(x=>/Esplenomegalia/.test(x.text)));
 assert.equal(f.p().examDone,false);
 const detail=examinedRegions(f.p()).find(s=>s.id==='abdomen').methods[0].findings[0].text;
 assert.match(detail,/líquido/,'the untouched original text remains readable');
 assert.deepEqual(f.p().treatments,[]);
 f.s.dispose();
});
test('true documented negatives are retained; absent scenario descriptions are not normal results',async()=>{
 const f=setup('PERI-PBE-001');
 await f.send('/examen abdomen palpation');
 const abdomen=examinedRegions(f.p()).find(x=>x.id==='abdomen');
 assert.match(abdomen.details[0],/sin defensa ni Blumberg franco/);
 await f.send('/examen thorax auscultation');
 const chest=examinedRegions(f.p()).find(x=>x.id==='thorax');
 assert.equal(chest.status,'unmodeled');
 assert(!progressiveExamImpression(f.p()).summary.includes('sin soplos'));
 f.s.dispose();
});
