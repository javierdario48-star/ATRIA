import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardRecovery,guardRecoveryHTML} from './guard-recovery.js';

const saved=(roomId='guard-a',actorId='doctor-a')=>({actorId,activeGuardId:roomId,
 guardRecovery:roomId?{status:'available',roomId}: {status:'none',roomId:null}});
function fixture(options={}){
 let current=saved();const renders=[],calls=[],notices=[];let hidden=0;
 const account={read:()=>structuredClone(current),restore:async()=>structuredClone(current)};
 const recovery=createGuardRecovery({account,render:s=>renders.push(s),hide:()=>hidden++,notify:s=>notices.push(s),
  resume:async target=>{calls.push(['resume',target.roomId]);return true;},
  release:async target=>{calls.push(['release',target.roomId]);return true;},...options});
 return {account,recovery,renders,calls,notices,get hidden(){return hidden;},set:value=>current=value};
}
test('a saved account is checked before offering recovery; a missing guard never offers the two controls',async()=>{
 const f=fixture();f.account.restore=async()=>{f.set(saved(null));return f.account.read();};
 assert.equal(await f.recovery.show(),false);assert.deepEqual(f.renders.map(s=>s.phase),['checking']);
 assert.equal(f.hidden,1);assert.equal(f.calls.length,0);
 assert.doesNotMatch(guardRecoveryHTML(f.renders[0]),/data-action="account-(?:recover|release)"/);
});
for(const op of ['resume','release'])test(op+' is bound to the checked guard, visibly pending and waits for confirmation',async()=>{
 let finish;const f=fixture({[op]:target=>new Promise(resolve=>{f.calls.push([op,target.roomId]);finish=resolve;})});
 await f.recovery.show();assert.equal(f.renders.at(-1).phase,'available');
 const action=f.recovery.run(op);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.recovery.busy(),true);assert.equal(f.hidden,0);
 const pending=guardRecoveryHTML(f.renders.at(-1));assert.match(pending,/role="status"/);
 assert.match(pending,/data-action="account-recover" disabled/);assert.match(pending,/data-action="account-release" disabled/);
 assert.equal(await f.recovery.run(op),false);assert.deepEqual(f.calls,[[op,'guard-a']]);
 finish(true);assert.equal(await action,true);assert.equal(f.hidden,1);assert.equal(f.recovery.busy(),false);
});
for(const op of ['resume','release'])test('Después can cancel '+op+' while the native response is pending',async()=>{
 let reply,target;
 const f=fixture({[op]:request=>{target=request;return new Promise(resolve=>reply=resolve);}});
 await f.recovery.show();
 const action=f.recovery.run(op);await new Promise(resolve=>setImmediate(resolve));
 const pending=guardRecoveryHTML(f.renders.at(-1));
 assert.match(pending,/<button data-action="close">Después<\/button>/);
 f.recovery.cancel();
 assert.equal(target.signal.aborted,true);
 reply(true);assert.equal(await action,false);assert.equal(f.hidden,0);
});
test('an unavailable guard keeps a visible retry error and never offers an unverified recovery',async()=>{
 const f=fixture();f.account.restore=async()=>{throw Error('Servidor no disponible');};
 assert.equal(await f.recovery.show(),true);const html=guardRecoveryHTML(f.renders.at(-1));
 assert.match(html,/role="alert"/);assert.match(html,/Servidor no disponible/);assert.match(html,/account-check/);
 assert.doesNotMatch(html,/data-action="account-(?:recover|release)"/);assert.equal(f.hidden,0);
});
for(const value of [saved('guard-b'),saved('guard-a','doctor-b')])test('a changed guard/account cannot act on the previous offer: '+value.actorId+'/'+value.activeGuardId,async()=>{
 const f=fixture();await f.recovery.show();f.set(value);assert.equal(await f.recovery.run('release'),false);
 assert.equal(f.calls.length,0);assert.match(guardRecoveryHTML(f.renders.at(-1)),/role="alert"/);
 assert.doesNotMatch(guardRecoveryHTML(f.renders.at(-1)),/data-action="account-release"/);
});
test('a guard released on another device closes the old offer without invoking native actions',async()=>{
 const f=fixture();await f.recovery.show();f.set(saved(null));assert.equal(await f.recovery.run('resume'),true);
 assert.equal(f.calls.length,0);assert.equal(f.hidden,1);
});
test('native recovery failure stays visible inside the dialog and can be retried',async()=>{
 let fail=true;const f=fixture({resume:async()=>{if(fail)throw Error('No se confirmó la recuperación');return true;}});
 await f.recovery.show();assert.equal(await f.recovery.run('resume'),false);
 assert.match(guardRecoveryHTML(f.renders.at(-1)),/role="alert"/);assert.match(guardRecoveryHTML(f.renders.at(-1)),/No se confirmó/);
 assert.equal(f.hidden,0);fail=false;assert.equal(await f.recovery.run('resume'),true);assert.equal(f.hidden,1);
});
test('a silent early return is a visible failure rather than successful recovery',async()=>{
 const f=fixture({resume:async()=>undefined});await f.recovery.show();assert.equal(await f.recovery.run('resume'),false);
 assert.equal(f.hidden,0);assert.match(guardRecoveryHTML(f.renders.at(-1)),/role="alert"/);
});
test('cancellation ignores late checks and cannot reopen a closed or newer dialog',async()=>{
 let finish;const f=fixture();f.account.restore=()=>new Promise(resolve=>finish=resolve);
 const check=f.recovery.show();f.recovery.cancel();finish(saved());await check;
 assert.equal(f.renders.length,1);assert.equal(f.hidden,0);assert.equal(f.calls.length,0);
});
test('a stalled native operation becomes a visible retryable error',async()=>{
 const f=fixture({operationTimeoutMs:20,resume:()=>new Promise(()=>{})});await f.recovery.show();let timer;
 try{
  assert.equal(await Promise.race([f.recovery.run('resume'),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('unbounded recovery')),100))]),false);
 }finally{clearTimeout(timer);}
 assert.equal(f.recovery.busy(),false);assert.equal(f.hidden,0);assert.match(guardRecoveryHTML(f.renders.at(-1)),/role="alert"/);
});
test('an unreadable checkpoint is a retryable error rather than proof that a guard is absent',async()=>{
 const f=fixture();f.set({...saved(),guardRecovery:{status:'unavailable',roomId:'guard-a'}});
 assert.equal(await f.recovery.show(),true);assert.equal(f.hidden,0);
 assert.doesNotMatch(guardRecoveryHTML(f.renders.at(-1)),/data-action="account-(?:recover|release)"/);
 assert.match(guardRecoveryHTML(f.renders.at(-1)),/role="alert"/);
});
test('a late native response cannot hide a newer recovery offer for another guard',async()=>{
 let finish;const f=fixture({resume:()=>new Promise(resolve=>finish=resolve)});
 await f.recovery.show();const old=f.recovery.run('resume');await new Promise(resolve=>setImmediate(resolve));
 f.recovery.cancel();f.set(saved('guard-b'));await f.recovery.show();
 const newer=f.renders.at(-1);finish(true);assert.equal(await old,false);
 assert.deepEqual(f.renders.at(-1),newer);assert.equal(f.hidden,0);
});
