import assert from 'node:assert/strict';
import {createVegaIntegratedRuntime487} from '../../qa/vega-integrated-runtime-487.mjs';

// First pin the confirmed regression: existing adequate evidence is reused.
const r=createVegaIntegratedRuntime487('PERI-PBE-001',{stable:true}),p=r.ctx.sim;
r.order('pbe_paracentesis');r.order('pbe_renal');r.advance(200);
assert.equal(p.orders.get('pbe_paracentesis').status,'done');
r.ctx.csSetDiagnosticImpression(r.ctx.C.dx[0],{echo:false});
r.tick();r.advance(1);
assert.equal(p.nsVegaCare.phase,'decision487');
assert.equal(p.orders.size,2);
// Cancelling the one real pending diagnostic test must yield a decision,
// not an indefinite wait or silent repeat order.
const s=createVegaIntegratedRuntime487('APP-001',{stable:true});
s.tick();s.advance(2);
const cancelled=[...s.ctx.sim.orders.keys()][0];
assert(cancelled);
s.ctx.sim.orders.delete(cancelled);s.advance(1);
assert.notEqual(s.ctx.sim.nsVegaCare.phase,'results','cancelled studies must leave result wait');
assert.equal(s.ctx.sim.orders.has(cancelled),false,'silence cannot reissue cancelled study');
s.reply('no sé');
assert.equal(s.ctx.sim.orders.has(cancelled),true,'explicit help restarts the one cancelled study');
assert.equal(s.ctx.sim.nsVegaCare.phase,'results');
assert.equal(s.ctx.sim.orders.get(cancelled).status,'pending');
const delegated=createVegaIntegratedRuntime487('APP-001',{stable:true}),q=delegated.ctx.sim;
delegated.tick();delegated.advance(2);
// Pre-existing results are scenario inputs, using the actual case result.
for(const [id,entry] of q.orders){entry.status='done';entry.result=delegated.ctx.C.studies.find(x=>x.id===id).result;}
delegated.advance(1);assert.equal(q.nsVegaCare.phase,'decision487');
delegated.reply('administraría propranolol');
assert.equal(q.nsVegaCare.phase,'decision487','incorrect proposal leaves the active decision unresolved');
assert(!q.pendingTherapies?.has('beta_blocker'));
delegated.reply('no sé');assert.equal(q.nsVegaCare.phase,'reassessment');
delegated.advance(5);
assert.equal(q.administrationLog.filter(x=>x.id==='ceftriaxone').length,1,'one real help administration');
assert(!q.pendingTherapies?.has('metronidazole'),'no next stable measure without a new decision');
assert.equal(q.nsVegaCare.phase,'decision487');
// A student who already made one correct proposal can still request one
// real subsequent step with "no sé", rather than receiving a hint loop.
const continued=createVegaIntegratedRuntime487('APP-001',{stable:true}),v=continued.ctx.sim;
for(const study of continued.ctx.C.studies)v.orders.set(study.id,{...study,status:'done'});
continued.ctx.csSetDiagnosticImpression(continued.ctx.C.dx[0],{echo:false});
continued.tick();continued.advance(2);continued.reply('ceftriaxona');continued.advance(3);
assert.equal(v.nsVegaCare.phase,'learner');
assert.equal(v.administrationLog.filter(x=>x.id==='ceftriaxone').length,1);
continued.reply('no sé');continued.advance(4);
assert.equal(v.administrationLog.filter(x=>x.id==='metronidazole').length,1,
 'uncertainty in a later learner turn executes one real next action');
assert.equal(v.nsVegaCare.phase,'decision487');
const deteriorated=createVegaIntegratedRuntime487('APP-001',{stable:true}),d=deteriorated.ctx.sim;
deteriorated.tick();deteriorated.advance(2);d.orders.delete('app_us');deteriorated.advance(1);
assert.equal(d.nsVegaCare.csPausedStudy487,'app_us');
d.liveVitals={sys:60,dia:35,hr:140,rr:30,spo2:78,temp:39};
deteriorated.clock.realSeconds+=1;deteriorated.tick();
assert.equal(d.nsVegaCare.phase,'reassessment','urgency overrides a cancelled-study pause');
assert(d.nsVegaCare.issued.has('ceftriaxone')&&d.nsVegaCare.issued.has('metronidazole'),
 'indicated urgent coverage starts despite the cancelled result');
deteriorated.advance(2);
for(const id of ['ceftriaxone','metronidazole'])assert.equal(
 d.administrationLog.filter(x=>x.id===id).length,1,'one actual urgent administration: '+id);
assert(!d.orders.has('app_us'),'urgent rescue cannot silently reissue the cancelled study');
d.liveVitals={sys:118,dia:76,hr:82,rr:16,spo2:98,temp:36.8};
deteriorated.clock.realSeconds+=1;deteriorated.tick();
assert.equal(d.nsVegaCare.phase,'workup487','stable patient resumes the unresolved study decision');
deteriorated.reply('no sé');
assert.equal(d.orders.get('app_us').status,'pending','one explicit retry after stabilizing');
console.log('VEGA NATIVE FLOW PASS');
