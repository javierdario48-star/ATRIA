// Persistent reveal accounting only. This ledger cannot touch physiology,
// case quality, clinical commands, another encounter or another physician.
export function hintAdjustedXP(xp,count){
 if(!Number.isSafeInteger(xp)||xp<0||!Number.isSafeInteger(count)||count<0)throw Error('invalid hint reward inputs');
 return Math.floor(xp*Math.max(0,20-count)/20);
}
const copy=x=>structuredClone(x);
const validText=s=>typeof s==='string'&&s.length>0&&s.length<=240;
export function createClinicalHintLedger(binding,saved={}){
 const {roomId,encounterId,patientUid}=binding;
 if(![roomId,encounterId,patientUid].every(validText))throw Error('invalid hint encounter binding');
 if(saved.roomId&&[roomId,encounterId,patientUid].some((value,i)=>value!==saved[['roomId','encounterId','patientUid'][i]]))throw Error('wrong hint checkpoint encounter');
 const offers=new Map(copy(saved.offers||[])),requests=new Map(copy(saved.requests||[])),history=copy(saved.history||[]);
 const count=actorId=>history.filter(r=>r.actorId===actorId).length;
 const reject=(reason='invalid-hint-request')=>({status:'rejected',reason});
 return Object.freeze({
  count,
  history:actorId=>copy(history.filter(r=>r.actorId===actorId)),
  checkpoint:()=>copy({version:1,roomId,encounterId,patientUid,offers:[...offers],requests:[...requests],history}),
  request(r,hint){
   if(!r||r.roomId!==roomId||r.encounterId!==encounterId||r.patientUid!==patientUid||
    !validText(r.actorId)||!validText(r.requestId)||!['prepare','revalidate','displayed','cancel'].includes(r.op))return reject();
   const requestKey=r.actorId+':'+r.requestId,signature=JSON.stringify(r),previous=requests.get(requestKey);
   if(previous){
    if(previous.signature!==signature)return reject('hint-request-id-conflict');
    if(['prepare','revalidate'].includes(r.op)&&previous.result.key!==hint?.key)return {status:'stale',reason:'clinical-state-changed'};
    return copy(previous.result);
   }
   const remember=result=>{requests.set(requestKey,{signature,result:copy(result)});return copy(result);};
   if(r.op==='prepare'){
    if(!hint?.key||!hint.action||!hint.text)return remember({status:'unavailable',reason:hint?.error||'no-executable-hint'});
    for(const offer of offers.values())if(offer.actorId===r.actorId&&offer.stage!=='displayed')offer.stage='cancelled';
    const offerId=r.actorId+':'+r.requestId;
    offers.set(offerId,{offerId,actorId:r.actorId,selectionRevision:r.selectionRevision??0,stage:'prepared',hint:copy(hint)});
    return remember({status:'prepared',offerId,key:hint.key,chargeable:hint.chargeable,roomId,encounterId,patientUid,actorId:r.actorId});
   }
   const offer=offers.get(r.offerId);
   if(!offer||offer.actorId!==r.actorId||offer.stage==='cancelled')return remember(reject('hint-offer-unavailable'));
   if(r.op==='cancel'){offer.stage='cancelled';return remember({status:'cancelled'});}
   if(!hint||hint.key!==offer.hint.key||hint.text!==offer.hint.text||
    (r.selectionRevision??0)!==offer.selectionRevision){offer.stage='cancelled';return remember({status:'stale',reason:'clinical-state-changed'});}
   if(r.op==='revalidate'){
    offer.stage=offer.stage==='displayed'?'displayed':'verified';
    return remember({status:'verified',offerId:offer.offerId,roomId,encounterId,patientUid,actorId:r.actorId,...copy(offer.hint)});
   }
   if(!['verified','displayed'].includes(offer.stage))return remember(reject('hint-not-verified'));
   const isNew=offer.hint.chargeable&&!history.some(row=>row.actorId===r.actorId&&row.key===offer.hint.key);
   if(isNew)history.push({actorId:r.actorId,key:offer.hint.key,offerId:offer.offerId,requestId:r.requestId});
   offer.stage='displayed';
   return remember({status:'displayed',offerId:offer.offerId,newHint:!!isNew,hintCount:count(r.actorId)});
  }
 });
}
