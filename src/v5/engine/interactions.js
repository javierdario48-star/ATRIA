// Spatial interaction policy. All positions and hitboxes are hospital pixels.
import {bedsideMonitor} from './bedside-layout.js';
export const PATIENT_RANGE=150;
export function hospitalEntities(world,map,beds=[]){
 const entities=[];
 for(const p of world.patients){
  const common={patientUid:p.uid,bedId:p.bedId,approach:p.approach};
  entities.push({...common,id:'patient:'+p.uid,kind:'patient',x:p.x,y:p.y,width:52,height:48});
  entities.push({...common,id:'monitor:'+p.uid,kind:'monitor',...bedsideMonitor(p,map,beds)});
 }
 for(const n of world.nurses)entities.push({...n,kind:'nurse',x:n.x,y:n.y-22,width:44,height:62});
 if(world.expert)entities.push({...world.expert,kind:'vega',x:world.expert.x,y:world.expert.y-22,width:44,height:70});
 return entities;
}
export function hitWorldEntity(entities,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 return entities.filter(e=>Math.abs(x-e.x)<=e.width/2&&Math.abs(y-e.y)<=e.height/2)
  .sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y)||a.id.localeCompare(b.id))[0]||null;
}
export function canInteract(player,entity,patients){
 if(!entity)return false;
 if(entity.patientUid){
  const patient=patients.find(p=>p.uid===entity.patientUid);
  return !!patient&&Math.hypot(player.x-patient.x,player.y-patient.y)<=PATIENT_RANGE;
 }
 return Math.hypot(player.x-entity.x,player.y-(entity.y+22))<=(entity.kind==='nurse'?78:150);
}
