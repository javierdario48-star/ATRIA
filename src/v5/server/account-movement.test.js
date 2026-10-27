import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardRuntime} from '../clinical/guard-runtime.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url),'utf8'));
const content={map:read('hospital'),beds:read('beds'),cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
for(const count of [2,3,4])test(count+' doctors retain verified level speeds and continuous routes across recovery',async()=>{
 const members=Array.from({length:count},(_,i)=>({id:'doctor-'+i,name:'Doctor '+i,level:[1,10,50,100][i]}));
 let runtime=await createGuardRuntime({content,roomId:'speed-'+count,caseId:'CIRR-001',members,hostId:members[0].id,mode:'coop',nowMs:1000000});
 try{
  const start=runtime.view().spatial.doctors;
  for(const d of start){assert.equal(d.level,members.find(m=>m.id===d.id).level);assert(d.speed>=205&&d.speed<254.21);
   assert(runtime.motion(d.id,[d.x,d.y-200],1));}
  const distances=new Map(start.map(d=>[d.id,0]));let previous=start;
  for(let step=1;step<=12;step++){
   await runtime.advanceTo(1000000+Math.ceil(step*1000/60));
   const next=runtime.view().spatial.doctors;
   for(const d of next){const old=previous.find(x=>x.id===d.id),moved=Math.hypot(d.x-old.x,d.y-old.y);
    assert(moved<=d.speed/60+.01,'no snapshot jump may exceed one movement step');distances.set(d.id,distances.get(d.id)+moved);}
   previous=next;
  }
  for(let i=1;i<count;i++)assert(distances.get(members[i].id)>distances.get(members[i-1].id));
  const checkpoint=await runtime.checkpoint(),before=runtime.view().spatial.doctors;runtime.dispose();
  runtime=await createGuardRuntime({content,roomId:'speed-'+count,nowMs:1000201,checkpoint});
  assert.deepEqual(runtime.view().spatial.doctors,before,'restart cannot reset or teleport doctors');
  runtime.updateDoctorLevel(members[0].id,20);assert(runtime.view().spatial.doctors[0].speed>205);
 }finally{runtime.dispose();}
});
