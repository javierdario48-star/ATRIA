// TEST ONLY: characterize the effective original executor. Never a V5 build input.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createNativeReferenceRuntime487,orderNativeReference487,advanceNativeReference487,
 snapshotNativeReference487} from '../physiology-pilot/native-reference-487.mjs';

const fixture=new URL('./fixtures/cirr-native-reference.json',import.meta.url);
export function characterizeCirr(){
 const scenarios=[];
 for(const text of ['espironolactona','espironolactona 100 mg','espironolactona 0,1 g','paracentesis terapeutica']){
  const r=createNativeReferenceRuntime487({caseId:'CIRR-001'}),id=text.startsWith('para')?'paracentesis_ter':'espironolactona';
  const initial=snapshotNativeReference487(r);orderNativeReference487(r,{id,text});
  const points=[0,.06,.066,.12,1,5].map(t=>advanceNativeReference487(r,t));
  assert.equal(points[1].administrationCount,0);assert.equal(points[2].administrationCount,1);
  scenarios.push({text,id,initial,points,dose:JSON.parse(JSON.stringify(r.ctx.sim.monitorTherapies.get(id).dose)),
   administration:JSON.parse(JSON.stringify(r.ctx.sim.administrationLog[0]))});
 }
 const spirono=scenarios.slice(0,3);
 for(const s of spirono){assert.deepEqual(s.points.at(-1).vitals,s.initial.vitals);assert.equal(s.dose.amount,100);}
 return {schema:'atria-cirr-native-c2/v1',testOnly:true,
  reference:'effective apply487 source via existing native-reference-487 harness; deterministic baseline, response/trajectory factors 1',
  clock:{studyMinutesPerRealSecond:1,nativeMinutesPerRealSecond:.12,typingNativeMinutesPerRealSecond:.03},
  preparationRealSeconds:.55,
  limitation:'Original spironolactone has empty vital effects, no CIRR physiology engine and no modeled ascites/diuresis kinetics. Do not invent rapid improvement.',
  scenarios};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const actual=characterizeCirr();
 if(process.argv.includes('--write')){await fs.mkdir(new URL('./fixtures/',import.meta.url),{recursive:true});await fs.writeFile(fixture,JSON.stringify(actual,null,2)+'\n');}
 else assert.deepEqual(actual,JSON.parse(await fs.readFile(fixture,'utf8')),'original CIRR behavior changed: review, never silently regenerate');
 console.log('CIRR NATIVE CHARACTERIZATION PASS: 4 scenarios, 550ms preparation, exact native baseline/trajectories; physicalAndroid=false');
}
