// All 13 real case definitions and native administration/evolution engines.
// Completed results and starting acuity are explicit scenario inputs. Real
// order timers are tested separately; actors and browser surfaces are fixtures.
import assert from 'node:assert/strict';
import {CARE_JOURNEYS_487} from '../../qa/clinical-care-journeys-487.js';
import {createVegaIntegratedRuntime487} from '../../qa/vega-integrated-runtime-487.mjs';
const ids=Object.keys(CARE_JOURNEYS_487),counts={};
assert.equal(ids.length,13);
const count=key=>counts[key]=(counts[key]||0)+1;
function oriented(id){
 const r=createVegaIntegratedRuntime487(id,{stable:true}),{sim:p,C}=r.ctx;
 for(const study of C.studies)p.orders.set(study.id,{...study,status:'done',result:study.result,
  requestedBy:'Jugador',orderedAt:0});
 r.ctx.csSetDiagnosticImpression(C.dx[0],{echo:false});
 r.tick();r.advance(2);return r;
}
for(const id of ids){
 // Unknown patient: one native examination and at most two real requests.
 const pending=createVegaIntegratedRuntime487(id,{stable:true});pending.tick();pending.advance(3);
 const p=pending.ctx.sim,initial=[...p.orders.keys()];
 assert(initial.length>=1&&initial.length<=2,id+' bounded initial workup');
 assert([...p.orders.values()].every(x=>x.status!=='done'),id+' real results have latency');
 assert(!p.diagnosis,id+' no diagnosis from a pending result');
 pending.advance(3);assert.deepEqual([...p.orders.keys()],initial,id+' no parallel cascade');
 count('stableUnknownAndPending');
 // Adequate existing diagnosis/result: no routine requests, one active turn.
 const known=oriented(id),q=known.ctx.sim;
 assert.equal(q.nsVegaCare.phase,'decision487',id+' uses completed native evidence');
 assert.equal(q.orders.size,known.ctx.C.studies.length,id+' pre-existing studies are retained');
 assert.equal(q.administrationLog.length,0,id+' no medication while awaiting a stable decision');
 count('stableOriented');
 // Timer-only turn checks hold a stable scenario constant: silence is never
 // consent. Physiology/medication consequences are checked in the rescue pair.
 known.clock.realSeconds+=20;known.tick();
 const notices=known.messages.filter(x=>x.role==='expert'&&/Te escucho/.test(x.text)).length;
 assert.equal(notices,1,id+' one optional reminder');
 known.clock.realSeconds+=80;known.tick();
 assert.equal(known.messages.filter(x=>x.role==='expert'&&/Te escucho/.test(x.text)).length,1);
 assert.equal(q.nsVegaCare.phase,'decision487');assert.equal(q.administrationLog.length,0);
 count('silence');
 known.reply('administraría propranolol');
 assert.equal(q.nsVegaCare.phase,'decision487',id+' incorrect proposal is not executed');
 assert(!q.pendingTherapies?.has('beta_blocker'));
 assert(known.messages.at(-1).text.includes('Esa medida no trata'),id+' explanation of wrong treatment');
 count('incorrectAnswer');
 // Correct native proposal can proceed through the original clinical API.
 const correct=oriented(id),a=correct.ctx.sim;
 const next=correct.ctx.C.keyInterventions.find(x=>x!=='iv');
 const intervention=correct.ctx.C.interventions.find(x=>x.id===next);
 assert(intervention,id+' native intervention');
 const actionCount=()=>a.administrationLog.length+(a.pendingTherapies?.size||0)+
  a.interventions.size+a.consults.size;
 const beforeAction=actionCount();
 correct.reply(intervention.label);
 assert.equal(a.nsVegaCare.phase,'learner',id+' correct proposal keeps learner autonomy');
 assert(actionCount()>beforeAction,id+' correct proposal must execute a real native clinical action');
 count('correctAnswer');
 const help=oriented(id),h=help.ctx.sim;
 help.reply('no sé');assert.equal(h.nsVegaCare.phase,'reassessment');
 assert.equal(h.nsVegaCare.csOneStep487,true,id+' uncertainty delegates one step');
 help.advance(4);
 assert(h.administrationLog.length<=1,id+' stable help never starts a treatment cascade');
 assert(['decision487','reassessment'].includes(h.nsVegaCare.phase),id+' help has a bounded next state');
 count('uncertainty');
 // Requests that disappeared are paused and need an explicit response.
 const cancelled=initial[0];p.orders.delete(cancelled);pending.advance(1);
 assert.equal(p.nsVegaCare.csPausedStudy487,cancelled,id+' cancelled result cannot strand the tutor');
 const requests=p.orders.size;pending.advance(2);assert.equal(p.orders.size,requests);
 p.liveVitals={sys:60,dia:35,hr:140,rr:30,spo2:78,temp:39};
 pending.clock.realSeconds+=1;pending.tick();
 assert.equal(p.nsVegaCare.phase,'reassessment',id+' critical deterioration overrides a study pause');
 assert(!p.orders.has(cancelled),id+' urgency does not implicitly repeat a cancelled study');
 p.liveVitals={sys:118,dia:76,hr:82,rr:16,spo2:98,temp:36.8};
 pending.clock.realSeconds+=1;pending.tick();
 assert.equal(p.nsVegaCare.phase,'workup487',id+' stabilizing resumes the unresolved study');
 count('cancelledStudyDeterioration');
 pending.reply('no sé');assert(p.orders.has(cancelled));
 count('cancelledStudy');
 // The completed first real dose is reused, rather than indicated twice.
 const reused=oriented(id),u=reused.ctx.sim;
 const drug=reused.ctx.C.keyInterventions.find(x=>reused.ctx.MONITOR_THERAPY_CATALOG.some(t=>t.id===x)&&
  !['source_control','surgery','iv'].includes(x));
 if(drug){
  const item=reused.ctx.C.interventions.find(x=>x.id===drug);
  reused.ctx.addMonitorTherapy(item.label);reused.advance(2);
  const delivered=u.administrationLog.filter(x=>x.id===drug).length;
  assert.equal(delivered,1,id+' native pre-existing dose');
  reused.reply('no sé');reused.advance(3);
  assert.equal(u.administrationLog.filter(x=>x.id===drug).length,delivered,id+' no repeated completed treatment');
 }
 count('alreadyPerformed');
 // Actual critical rescue vs an untreated matched native trajectory.
 const rescue=createVegaIntegratedRuntime487(id,{critical:true});
 const control=createVegaIntegratedRuntime487(id,{critical:true,call:false});
 control.ctx.sim.mentor.enabled=false;
 rescue.tick();assert.equal(rescue.ctx.sim.administrationLog.length,0,id+' orders are not doses');
 rescue.advance(3);control.advance(3);
 const log=rescue.ctx.sim.administrationLog;
 assert(log.some(x=>x.id==='oxygen'),id+' true hypoxemia is treated');
 assert(log.some(x=>x.id==='fluid'),id+' true shock is treated');
 assert(rescue.ctx.sim.liveVitals.spo2>control.ctx.sim.liveVitals.spo2,id+' actual oxygen response');
 assert(rescue.ctx.sim.liveVitals.sys>control.ctx.sim.liveVitals.sys,id+' actual circulatory response');
 if(id==='PERI-SEC-001')assert(rescue.ctx.sim.consults.has('cirugia'),
  'critical peritonism requires urgent surgical evaluation without waiting for all results');
 count('criticalPhysiology');
 // A newly critical patient interrupts the active stable question.
 const worsening=oriented(id),w=worsening.ctx.sim;
 w.liveVitals={...w.liveVitals,sys:60,dia:35,spo2:78,hr:140,rr:30};
 worsening.clock.realSeconds+=1;worsening.tick();
 assert.equal(w.nsVegaCare.phase,'reassessment',id+' deterioration interrupts teaching');
 assert(w.nsVegaCare.csUrgent487);count('deterioration');
 w.liveVitals={...w.liveVitals,sys:118,dia:76,spo2:98,hr:82,rr:16};
 worsening.clock.realSeconds+=1;worsening.tick();
 assert.equal(w.nsVegaCare.phase,'decision487',id+' stable patient returns to teaching');
 count('resumeTeaching');
 // Native clinical permission prevents tutor actions on a rival/mirror.
 const rival=createVegaIntegratedRuntime487(id,{stable:true});
 rival.ctx.window.nsMayExamine=()=>false;rival.ctx.sim.__csRemoteMirror487=true;
 rival.tick();rival.advance(2);
 assert.equal(rival.ctx.sim.orders.size,0);assert.equal(rival.ctx.sim.administrationLog.length,0);
 count('competitivePermissions');
 const ended=oriented(id);ended.ctx.sim.caseEnded=true;ended.clock.realSeconds+=1;ended.tick();
 assert.equal(ended.ctx.sim.nsVegaCare.active,false,id+' transferred/ended patient stops conversation');
 count('endedPatient');
}
console.log('VEGA FULL NATIVE 13-CASE MATRIX PASS',JSON.stringify({cases:ids.length,scenarios:counts,
 nativeMedications:true,nativePhysiology:true,nativeStudyOrders:true,completedResultsAreScenarioInputs:true,
 physicalDevices:false,realNetwork:false}));
