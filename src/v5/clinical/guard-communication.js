import {isExaminationKind,isPhysicianExamStudy} from './exam-contract.js';

const copy=value=>structuredClone(value);
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=160;
const HISTORY_LIMIT=300,RECEIPT_LIMIT=10000;
const keyFor=(actorId,commandId)=>JSON.stringify([actorId,commandId]);

/** Team messages share the durable runtime commit but never enter a clinical
 * dispatcher. Only this small immutable team stream is persisted here.
 * Clinical activity below is derived afresh from the original room events and
 * presentation rows; it is never a second clinical event log or evaluator. */
export function createGuardCommunication({roomId,mode,members,snapshot=null}){
 const names=new Map(members.map(member=>[member.id,String(member.name||member.id).slice(0,32)]));
 let revision=snapshot?.revision??0;
 const team=copy(snapshot?.team??[]),receipts=new Map();
 if(snapshot&&(snapshot.version!==1||!Number.isSafeInteger(revision)||revision<0||
  !Array.isArray(team)||team.length>HISTORY_LIMIT||!Array.isArray(snapshot.receipts)||
  snapshot.receipts.length>RECEIPT_LIMIT||snapshot.receipts.length!==revision||
  mode!=='coop'&&revision!==0))throw Error('invalid guard communication checkpoint');
 for(const entry of snapshot?.receipts??[]){
  if(!entry||!names.has(entry.actorId)||!validId(entry.commandId)||typeof entry.text!=='string'||
   !entry.text.trim()||entry.text.length>500||entry.ack?.commandId!==entry.commandId||
   entry.ack?.roomId!==roomId||entry.ack?.channel!=='team'||entry.ack?.status!=='received'||
   !Number.isSafeInteger(entry.ack.revision)||entry.ack.revision<1||entry.ack.revision>revision)
   throw Error('invalid guard team receipt');
  const key=keyFor(entry.actorId,entry.commandId);
  if(receipts.has(key))throw Error('duplicate guard team receipt');
  receipts.set(key,copy(entry));
 }
 if(team.some((row,index)=>!names.has(row.actorId)||!validId(row.commandId)||
  row.id!==roomId+':team:'+keyFor(row.actorId,row.commandId)||row.channel!=='team'||row.role!=='player'||
  typeof row.actorName!=='string'||typeof row.name!=='string'||!Number.isFinite(row.at)||row.at<0||
  !Number.isSafeInteger(row.revision)||row.revision!==revision-team.length+index+1||
  receipts.get(keyFor(row.actorId,row.commandId))?.text!==row.text))
  throw Error('invalid guard team history');
 return Object.freeze({
  hasCommand:(actorId,commandId)=>receipts.has(keyFor(actorId,commandId)),
  post(actorId,envelope,{at,participating}){
   const rejection=reason=>({roomId,commandId:envelope?.id??null,channel:'team',status:'rejected',reason});
   if(mode!=='coop')return rejection('team-channel-unavailable');
   if(!names.has(actorId))return rejection('not-a-clinical-member');
   if(!validId(envelope?.id)||envelope.channel!=='team'||
    typeof envelope.text!=='string'||!envelope.text.trim()||envelope.text.length>500)
    return rejection('invalid-team-message');
   const key=keyFor(actorId,envelope.id),prior=receipts.get(key);
   if(prior)return prior.text===envelope.text?copy(prior.ack):rejection('command-id-reused-with-different-payload');
   if(!participating)return rejection('shift-member-left');
   if(receipts.size>=RECEIPT_LIMIT)return rejection('team-command-capacity');
   const ack={roomId,commandId:envelope.id,channel:'team',recipient:'team',status:'received',revision:++revision,clinical:[]};
   team.push({id:roomId+':team:'+key,commandId:envelope.id,actorId,actorName:names.get(actorId),
    name:names.get(actorId),role:'player',channel:'team',text:envelope.text,at,revision});
   if(team.length>HISTORY_LIMIT)team.shift();
   receipts.set(key,copy({actorId,commandId:envelope.id,text:envelope.text,ack}));return copy(ack);
  },
  read({patients,actorId}){
   const visible=patients.filter(({visible})=>visible),activity=projectClinicalActivity({patients:visible,names,mode,actorId});
   const activityRevision=visible.reduce((sum,{state})=>sum+state.room.revision,0);
   return {version:1,revision:revision+activityRevision,teamRevision:revision,activityRevision,
    channelAvailable:mode==='coop',...(mode==='competitive'?{}:{team:copy(team)}),activity};
  },
  checkpoint:()=>copy({version:1,revision,team,receipts:[...receipts.values()]})
 });
}

function clinicalKind(item){
 if(isExaminationKind(item?.kind)||isPhysicianExamStudy(item?.id))return 'exam';
 if(item?.kind==='history.ask')return 'answer';
 if(item?.kind==='case.close')return 'disposition';
 if(item?.kind==='study.request'||item?.kind==='consult.request')return item.status==='executed'?'result':'order';
 if(item?.kind==='therapy.request'||item?.kind==='procedure.request')return item.status==='executed'?'administration':'order';
 return 'message';
}

function projectClinicalActivity({patients,names,mode,actorId}){
 const activity=[];
 for(const {record,state} of patients){
  const messages=new Map(state.messages.map(row=>[row.id,row])),used=new Set();
  for(const event of state.room.events){
   let rowIndex=0;
   const add=(row,kind,item=null)=>{
    if(!row||used.has(row.id))return;
    const authorId=event.message?.actorId??event.actorId??row.actorId??null;
    if(mode==='competitive'&&authorId&&authorId!==actorId)return;
    used.add(row.id);
    const localAt=Number.isFinite(event.at)?event.at:Number.isFinite(event.message?.at)?event.message.at:0;
    const eventId=event.eventId??item?.receipt?.eventId;
    activity.push({id:record.uid+':activity:'+row.id,source:'clinical',sourceType:event.type,
     sourceRevision:event.revision,kind,actorId:authorId,actorName:names.get(authorId)||row.name||'ATRIA',
     patientUid:record.uid,patientName:state.patient.name||record.uid,bedId:record.bedId,caseId:record.caseId,
     name:row.name,role:row.role,text:row.text,at:record.arrivalAt+localAt,
     commandId:event.commandId??event.message?.id??null,...(eventId?{eventId}:{}),
     patientIndex:record.index,rowIndex:rowIndex++});
   };
   if(event.type==='chat.posted'){
    const message=event.message,messageId=(state.room.mode==='coop'?message.actorId+':':'')+message.id;
    const items=event.clinical||[],question=items.some(item=>item.kind==='history.ask'),
     order=items.some(item=>/\.request$/.test(item.kind)),disposition=items.some(item=>item.kind==='case.close');
    add(messages.get('player:'+messageId),question?'question':disposition?'disposition':order?'order':'message');
    add(messages.get('route:'+messageId),'message');
    for(let index=0;index<items.length;index++){
     const item=items[index],kind=clinicalKind(item);
     if(kind==='exam'&&item.status==='executed'){
      add({id:'exam:'+messageId+':'+index,name:names.get(message.actorId)||message.actorId,role:'player',
       text:item.receipt?.message||'Examen físico registrado.'},'exam',item);
     }else add(messages.get('ack:'+messageId+':'+index),kind,item);
    }
    add(messages.get('npc:'+messageId),'mentor');
   }else if(event.type==='clinical.completed'){
    for(const item of event.clinical||[]){
     const source=(item.receipt?.sourceEventId||event.eventId)+(item.receipt?.samples?':series':'');
     add(messages.get('completion:'+source),clinicalKind(item),item);
    }
   }else if(event.type==='clinical.care-ready')add(messages.get('ready:'+event.patientUid+':'+event.revision),'care-ready');
   else if(event.type==='clinical.complication')add(messages.get('complication:'+event.sourceEventId),'complication');
   else if(event.type==='clinical.patient-died')add(messages.get('death:'+event.patientUid+':'+event.revision),'death');
  }
 }
 activity.sort((a,b)=>a.at-b.at||a.patientIndex-b.patientIndex||a.sourceRevision-b.sourceRevision||a.rowIndex-b.rowIndex);
 return activity.slice(-HISTORY_LIMIT).map(({patientIndex,rowIndex,...row})=>row);
}
