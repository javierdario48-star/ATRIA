import assert from'node:assert/strict';import fs from'node:fs';import{buildStudyCatalog,resolveStudyById,materializeStudy,studyReadyAt,REAL_MS_PER_GAME_HOUR}from'./study-registry.js';
function casesFrom(html){const k=html.indexOf('const CASES='),a=html.indexOf('[',k);let d=0,q=false,e=false;for(let i=a;i<html.length;i++){const c=html[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c==='"')q=false;continue}if(c==='"'){q=true;continue}if(c==='[')d++;else if(c===']'&&--d===0)return JSON.parse(html.slice(a,i+1))}throw Error('CASES')}
const cases=casesFrom(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8')),catalog=buildStudyCatalog(cases),patients=cases.map(c=>({caseId:c.id,orders:new Map()}));const now=1_000_000;
let total=0;
for(let pi=0;pi<patients.length;pi++){const p=patients[pi],c=cases[pi];for(const st of catalog){const x=materializeStudy(resolveStudyById(st.id,c,catalog),c),readyAt=studyReadyAt(now,x);assert.equal(readyAt,now+Math.max(1,x.gameHours??x.delayHours??x.delay??1)*REAL_MS_PER_GAME_HOUR);p.orders.set(st.id,{patient:p.caseId,id:st.id,result:x.result,status:'pending',readyAt});total++}}
for(const p of patients)for(const o of p.orders.values())assert.equal(o.status,'pending');
for(const p of patients)for(const o of p.orders.values())if(now+3*REAL_MS_PER_GAME_HOUR>=o.readyAt)o.status='done';
for(const p of patients)for(const [id,o] of p.orders){assert.equal(o.patient,p.caseId);assert.equal(p.orders.get(id),o);assert(o.result)}
const maxHours=Math.max(...catalog.map(x=>x.gameHours));const end=now+maxHours*REAL_MS_PER_GAME_HOUR;
for(const p of patients)for(const o of p.orders.values())if(end>=o.readyAt)o.status='done';
assert(patients.every(p=>[...p.orders.values()].every(o=>o.status==='done')),'all delayed studies must mature on their owning patient');
const a=materializeStudy(resolveStudyById(catalog[0].id,cases[0],catalog),cases[0]),b=materializeStudy(resolveStudyById(catalog[0].id,cases[0],catalog),cases[0]);assert.deepEqual(a,b,'same patient + study must be deterministic for multiplayer callers');
console.log('study pipeline stress OK',{patients:patients.length,studies:catalog.length,orders:total,maxGameHours:maxHours,realMsPerGameHour:REAL_MS_PER_GAME_HOUR});
