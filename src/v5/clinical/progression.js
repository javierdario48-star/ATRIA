// Native csResultCareer arithmetic for a selected single-case practice.
// No continuous-shift/mentor multiplier is claimed before those modes migrate.
export function nativeCaseXP({score,mode,autonomy=100,practiceMult=1,shiftMult=1,complexityMult=1}){
 if(!Number.isFinite(score)||score<0||score>100||!['solo','apprentice','coop'].includes(mode))throw Error('invalid reward inputs');
 return Math.max(4,Math.round((16+score*.95)*(mode==='solo'?1.2:1)*shiftMult*(.72+.28*(autonomy/100))*practiceMult*complexityMult));
}
export function createProgressionLedger(saved={}){
 const receipts=new Map();
 function validate(r){
  if(r?.kind!=='clinical.closure'||typeof r.eventId!=='string'||!r.eventId||typeof r.patientUid!=='string'||!r.patientUid||
   typeof r.actorId!=='string'||!r.actorId||!Number.isSafeInteger(r.xp)||r.xp<0||r.closed!==true)throw Error('invalid closure XP receipt');
 }
 for(const r of saved.receipts||[]){validate(r);if(receipts.has(r.patientUid))throw Error('duplicate saved closure');receipts.set(r.patientUid,structuredClone(r));}
 return Object.freeze({
  award(receipt){validate(receipt);const existing=receipts.get(receipt.patientUid);
   if(existing){if(JSON.stringify(existing)!==JSON.stringify(receipt))throw Error('conflicting closure reward');return structuredClone(existing);}
   receipts.set(receipt.patientUid,structuredClone(receipt));return structuredClone(receipt);
  },
  read(){const list=[...receipts.values()],xp=list.reduce((sum,r)=>sum+r.xp,0);return structuredClone({xp,level:1+Math.floor(xp/200),receipts:list});}
 });
}
