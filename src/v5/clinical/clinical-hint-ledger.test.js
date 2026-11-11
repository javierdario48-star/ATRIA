import test from 'node:test';
import assert from 'node:assert/strict';
import {createClinicalHintLedger,hintAdjustedXP} from './clinical-hint-ledger.js';

const binding={roomId:'guard',encounterId:'guard:care:patient',patientUid:'patient',actorId:'a'};
const hint={key:'treatment:x',text:'Una instrucción.',chargeable:true,action:{kind:'treatment',id:'x'}};
const request=(op,extra={})=>({...binding,requestId:crypto.randomUUID(),op,...extra});
function reveal(ledger,b=binding,h=hint){
 const prepared=ledger.request(request('prepare',b),h);
 const verified=ledger.request(request('revalidate',{...b,offerId:prepared.offerId}),h);
 assert.equal(verified.status,'verified');
 return ledger.request(request('displayed',{...b,offerId:prepared.offerId}),h);
}
test('preparing and revalidating do not charge; only a display acknowledgement costs five points',()=>{
 const ledger=createClinicalHintLedger(binding),p=ledger.request(request('prepare'),hint);
 assert.equal(ledger.count('a'),0);assert(!p.text);
 const verified=ledger.request(request('revalidate',{offerId:p.offerId}),hint);assert.equal(verified.text,hint.text);assert.equal(ledger.count('a'),0);
 const r=ledger.request(request('displayed',{offerId:p.offerId}),hint);assert.equal(r.hintCount,1);assert.equal(hintAdjustedXP(133,r.hintCount),126);
});
test('duplicate delivery, repeated reveals and restored checkpoints are idempotent',()=>{
 let l=createClinicalHintLedger(binding);const p=l.request(request('prepare'),hint),display=request('displayed',{offerId:p.offerId});
 l.request(request('revalidate',{offerId:p.offerId}),hint);l.request(display,hint);l.request(display,hint);reveal(l);
 assert.equal(l.count('a'),1);l=createClinicalHintLedger(binding,l.checkpoint());reveal(l);assert.equal(l.count('a'),1);
});
test('fees reach zero after 20 hints, never go negative and preserve clinical score',()=>{
 const l=createClinicalHintLedger(binding);
 for(let n=0;n<25;n++)reveal(l,binding,{...hint,key:'action:'+n});
 assert.equal(l.count('a'),25);
 for(const [n,expected] of [[0,100],[1,95],[5,75],[10,50],[15,25],[19,5],[20,0],[25,0]])assert.equal(hintAdjustedXP(100,n),expected);
 assert.equal(hintAdjustedXP(133,19),6);
});
test('each doctor has an independent persistent history',()=>{
 const l=createClinicalHintLedger(binding);reveal(l);assert.equal(l.count('b'),0);reveal(l,{...binding,actorId:'b'});
 assert.equal(l.count('a'),1);assert.equal(l.count('b'),1);
});
test('stale clinical state, wrong encounter and discarded offers are free',()=>{
 const l=createClinicalHintLedger(binding),p=l.request(request('prepare'),hint);
 assert.equal(l.request(request('revalidate',{offerId:p.offerId}),{...hint,key:'changed'}).status,'stale');
 assert.equal(l.request(request('displayed',{offerId:p.offerId}),hint).status,'rejected');
 assert.equal(l.request(request('prepare',{encounterId:'another'}),hint).status,'rejected');assert.equal(l.count('a'),0);
});
test('pending, invalid and technical replies can never become a fee',()=>{
 const l=createClinicalHintLedger(binding);reveal(l,binding,{...hint,chargeable:false});assert.equal(l.count('a'),0);
 const p=l.request(request('prepare'),{...hint,action:null});assert.equal(p.status,'unavailable');assert.equal(l.count('a'),0);
});
test('a combined verified offer remains free until display and preserves idempotency',()=>{
 let l=createClinicalHintLedger(binding);
 const prepare=request('prepare',{verify:true,selectionRevision:3}),offered=l.request(prepare,hint);
 assert.equal(offered.status,'verified');assert.equal(offered.text,hint.text);assert.equal(offered.selectionRevision,3);
 assert.equal(l.count('a'),0);assert.deepEqual(l.request(prepare,hint),offered);
 const display=request('displayed',{offerId:offered.offerId,selectionRevision:3});
 l=createClinicalHintLedger(binding,l.checkpoint());
 assert.equal(l.request(display,hint).hintCount,1);
 assert.equal(l.request(display,hint).hintCount,1);
 const repeat=l.request(request('prepare',{verify:true}),hint);
 assert.equal(l.request(request('displayed',{offerId:repeat.offerId}),hint).newHint,false);
 const stale=l.request(request('prepare',{verify:true}),hint);
 assert.equal(l.request(request('displayed',{offerId:stale.offerId}),{...hint,key:'different'}).status,'stale');
 assert.equal(l.count('a'),1);assert.equal(l.count('b'),0);
});
