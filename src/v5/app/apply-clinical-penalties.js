// Project confirmed consequences into this device's existing private ledger.
// Clinical authorship stays intact: two authors' distinct unsafe events must
// not collapse into one debit when the cooperative beneficiary is the same.
const writers=Object.freeze({
 'clinical.unsafe-discharge':'penalizeUnsafeDischarge',
 'clinical.unsafe-observation':'penalizeUnsafeObservation',
 'clinical.death':'penalizeDeath'
});
export function applyClinicalPenalties(progress,penalties,{actorId,shared=false}){
 if(typeof actorId!=='string'||!actorId)return [];
 const applied=[];
 for(const penalty of penalties||[]){
  const writer=writers[penalty.kind];if(!writer)continue;
  const eligible=shared&&Array.isArray(penalty.beneficiaryIds)?
   penalty.beneficiaryIds.includes(actorId):penalty.actorId===actorId;
  if(!eligible)continue;
  const sourceActorId=penalty.sourceActorId||penalty.actorId;
  const receipt=progress[writer]({...penalty,actorId:sourceActorId});
  applied.push({...receipt,actorId,sourceActorId});
 }
 return applied;
}
