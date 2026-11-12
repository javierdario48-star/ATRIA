export function dispositionProof(result,destination,actorId){
 const {receipt,eventId,patientUid}=result;
 const proof=receipt?.closure??receipt?.disposition;
 if(!proof||proof.patientUid!==patientUid||proof.eventId!==eventId||proof.actorId!==actorId||
   proof.destination!==destination)return null;
 if(receipt.closure===proof&&proof.kind==='clinical.closure'&&proof.closed===true)return proof;
 if(!receipt.closure&&destination==='alta'&&proof.kind==='clinical.unsafe-discharge'&&proof.closed===false&&
   typeof proof.penaltyEventId==='string'&&proof.penaltyEventId)return proof;
 return null;
}
