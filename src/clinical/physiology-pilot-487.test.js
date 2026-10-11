import assert from 'node:assert/strict';
import fs from 'node:fs';
assert(fs.existsSync(new URL('./physiology-pilot-487.js',import.meta.url)),
 'B1 must provide a pure shared physiology kernel before any clinical activation');
const {createPhysiologyState487,stepPhysiology487,observePhysiology487}=await import('./physiology-pilot-487.js');
const {PILOT_DEFINITIONS_487,compilePhysiologyDefinitions487}=await import('./physiology-pilot-definitions-487.js');
let checks=0;
const check=(name,fn)=>{try{fn();checks++;}catch(e){e.message=name+': '+e.message;throw e;}};
const profile=(patch={})=>({schemaVersion:1,modelVersion:'b1-shadow-1',
 baselineVitals:{sys:100,dia:60,hr:110,rr:22,spo2:90,temp:37},
 circulatingVolumeMl:3300,interstitialFluidMl:0,vascularTone:.8,pumpFunction:.9,
 renalFunction:1,hepaticFunction:1,inflammation:.2,infectionBurden:0,sourceControlled:true,
 painDrive:.8,gasExchangeImpairment:8/35,oxygenResponsiveness:.85,
 oxygenTarget:{min:94,max:98},euvolemicVolumeMl:5000,pulmonarySusceptibility:.8,
 natural:{bleedingMlPerMin:0,capillaryLeakMlPerMin:0,inflammationGrowthPerMin:0,
  infectionGrowthPerMin:0,sourceRequired:false,refillMlPerMin:2},...patch});
const fresh=(p=profile(),id='p1')=>createPhysiologyState487(p,id);
const event=(id,drug,amount,unit,at=0,action='bolus',patientId='p1')=>({eventId:id,
 patientId,drugId:drug,status:'administered',action,route:drug==='oxygen'?'inhaled':'iv',
 dose:{amount,unit},atClinicalMinute:at,sequence:0});
const stop=(id,drug,at)=>({...event(id,drug,0,'',at,'stop'),dose:undefined});
const run=(s,events=[],minutes=60)=>stepPhysiology487(s,events,minutes,PILOT_DEFINITIONS_487);
const obs=observePhysiology487;
function deepFreeze(x){if(x&&typeof x==='object'){Object.freeze(x);Object.values(x).forEach(deepFreeze);}return x;}
const epsilon=(a,b,t=.000001)=>assert(Math.abs(a-b)<=t,`${a} vs ${b}`);

check('pure inputs and exact controlled replay',()=>{
 const s=deepFreeze(fresh()),e=deepFreeze([event('fluid-1','fluid',500,'ml')]);
 assert.deepEqual(run(s,e,10),run(s,e,10));
 assert.equal(s.circulatingVolumeMl,3300);assert.equal(e[0].dose.amount,500);
});
check('fixed-grid partition independence including fractional remainders',()=>{
 const e=[event('m1','morphine',4,'mg',.7),event('v1','vasopressor',.05,'mcg/kg/min',1,'start'),stop('v2','vasopressor',13)];
 const whole=run(fresh(),e,20);
 let chunks=run(fresh(),e,.01);for(let i=0;i<1999;i++)chunks=run(chunks,[],.01);
 assert.deepEqual(chunks,whole);
 let coarse=run(fresh(),e,5);for(let i=0;i<3;i++)coarse=run(coarse,[],5);
 assert.deepEqual(coarse,whole);
 let fractional=fresh();for(let i=0;i<7;i++)fractional=run(fractional,[],.25/7);
 assert.deepEqual(fractional,run(fresh(),[],.25),'fractional microseconds must not lose a full physiology quantum');
});
check('pending orders do not expose or treat a patient',()=>{
 const e={...event('pending','morphine',40,'mg'),status:'pending'};
 assert.deepEqual(run(fresh(),[e],10),run(fresh(),[],10));
});
check('zero dose is no exposure in all five mechanisms',()=>{
 for(const [id,unit,action]of [['fluid','ml','bolus'],['morphine','mg','bolus'],
  ['furosemide','mg','bolus'],['oxygen','L/min','start'],['vasopressor','mcg/kg/min','start']]){
  const base=run(fresh(),[],10),zero=run(fresh(),[event('zero-'+id,id,0,unit,0,action)],10);
  assert.deepEqual(obs(zero),obs(base),id);assert.equal(Object.keys(zero.exposures).length,0,id);
 }
});
check('dose units and impossible inputs reject before mutating',()=>{
 const s=deepFreeze(fresh());
 for(const e of [event('bad','morphine',4,'ml'),event('bad','fluid',-1,'ml'),
  event('bad','furosemide',NaN,'mg'),event('bad','vasopressor',.05,'mg','0','start')])
  assert.throws(()=>run(s,[e],1),/unit|dose|time/i);
 assert.throws(()=>run(s,[],-1),/time/i);assert.throws(()=>run(s,[],Infinity),/time/i);
 assert.throws(()=>fresh(profile({baselineVitals:{...profile().baselineVitals,spo2:101}})),/baseline spo2/i);
 assert.throws(()=>fresh(profile({baselineVitals:{...profile().baselineVitals,temp:100}})),/baseline temp/i);
});
check('deduplicated receipt has one physiological effect',()=>{
 const e=event('once','fluid',500,'ml');
 const one=run(fresh(),[e],10),repeated=run(fresh(),[e,e],10);
 assert.deepEqual(one,repeated);
 assert.deepEqual(run(one,[e],1),run(one,[],1));
 assert.throws(()=>run(one,[{...e,dose:{amount:1000,unit:'ml'}}],1),/conflict/i);
});
check('patient isolation',()=>{
 const s=deepFreeze(fresh(profile(),'p2'));
 assert.throws(()=>run(s,[event('other','fluid',500,'ml')],1),/patient/i);
 assert.equal(s.circulatingVolumeMl,3300);
});
check('late new events require explicit replay rather than silent rescheduling',()=>{
 assert.throws(()=>run(run(fresh(),[],5),[event('late','fluid',500,'ml',1)],1),/late/i);
});
check('same-time events use stable sequence independently of input order',()=>{
 const a={...event('start','vasopressor',.05,'mcg/kg/min',0,'start'),sequence:1};
 const b={...stop('stop','vasopressor',0),sequence:2};
 assert.deepEqual(run(fresh(),[a,b],3),run(fresh(),[b,a],3));
 assert.equal(Object.keys(run(fresh(),[a,b],3).exposures).length,0);
});
check('one fluid mechanism benefits current hypovolemia and worsens overload',()=>{
 const hypo=fresh(),a=run(hypo,[],30),b=run(hypo,[event('f','fluid',1000,'ml')],30);
 assert(obs(b).map>obs(a).map);assert(b.circulatingVolumeMl>a.circulatingVolumeMl);
 const congested=fresh(profile({circulatingVolumeMl:5300,interstitialFluidMl:4000}));
 const c=run(congested,[],30),d=run(congested,[event('f','fluid',2000,'ml')],30);
 assert(d.fluidOverloadRisk>c.fluidOverloadRisk);assert(obs(d).spo2<obs(c).spo2);
});
check('successive bolus response decreases after correction of volume',()=>{
 const s=fresh(profile({circulatingVolumeMl:4700}));
 const a=run(s,[event('f1','fluid',1000,'ml')],0);
 const b=run(a,[event('f2','fluid',1000,'ml')],0);
 const c=run(b,[event('f3','fluid',1000,'ml')],0);
 assert(obs(c).map-obs(b).map<obs(a).map-obs(s).map);
});
check('oxygen is bounded, does not improve a normoxemic target, and can be insufficient',()=>{
 const e=event('o','oxygen',8,'L/min',0,'start');
 const s=fresh(),a=run(s,[],10),b=run(s,[e],10);
 assert(obs(b).spo2>obs(a).spo2);assert(obs(b).spo2<=98);
 const normal=fresh(profile({baselineVitals:{sys:100,dia:60,hr:90,rr:18,spo2:98,temp:37},gasExchangeImpairment:0}));
 epsilon(obs(run(normal,[e],10)).spo2,obs(run(normal,[],10)).spo2);
 const refractory=fresh(profile({gasExchangeImpairment:.9,oxygenResponsiveness:.1}));
 assert(obs(run(refractory,[e],10)).spo2<90);
});
check('oxygen support has no observable-feedback oscillation and withdraws',()=>{
 let s=run(fresh(),[event('o','oxygen',4,'L/min',0,'start')],5);const values=[];
 for(let i=0;i<80;i++){s=run(s,[],.25);values.push(obs(s).spo2);}
 assert(Math.max(...values)-Math.min(...values)<.001);
 const removed=run(s,[stop('o-stop','oxygen',s.requestedClinicalMinute)],5);
 assert(obs(removed).spo2<obs(s).spo2);assert(removed.oxygenSupport<.001);
});
check('pressor improves vascular tone, stops and cannot replace circulating volume',()=>{
 const s=fresh(),v=event('v','vasopressor',.05,'mcg/kg/min',0,'start');
 const a=run(s,[],10),b=run(s,[v],10);
 assert(b.vascularTone>a.vascularTone);assert(obs(b).map>obs(a).map);
 epsilon(b.circulatingVolumeMl,a.circulatingVolumeMl);
 const stopped=run(b,[stop('vs','vasopressor',10)],10);
 assert(stopped.vascularTone<b.vascularTone);
 const high=run(s,[event('v-high','vasopressor',.5,'mcg/kg/min',0,'start')],20);
 assert(high.ischemiaRisk>b.ischemiaRisk);assert(high.adverseEvents.some(x=>x.code==='pressor-excess'));
});
check('opioid reduces pain with delay and clears rather than permanent historical penalties',()=>{
 const s=fresh(),e=event('m','morphine',4,'mg');
 const now=run(s,[e],0),early=run(s,[e],30),untreated=run(s,[],30);
 epsilon(now.pain,s.pain);assert(early.pain<untreated.pain);
 let late=run(s,[e],1440);late=run(late,[],1440);
 assert(late.respiratoryDepression<early.respiratoryDepression*.02);
 assert(late.pain>early.pain);assert(late.sedation<early.sedation*.02);
});
check('repeated opioid adds exposure; stopping future dosing does not erase an already given bolus',()=>{
 const s=fresh(),one=run(s,[event('m1','morphine',4,'mg')],45);
 const repeated=run(s,[event('m1','morphine',4,'mg'),event('m2','morphine',4,'mg',15),event('m3','morphine',4,'mg',30)],45);
 assert(repeated.respiratoryDepression>one.respiratoryDepression);
 const stopped=run(repeated,[stop('ms','morphine',45)],0);
 epsilon(stopped.respiratoryDepression,repeated.respiratoryDepression);
 assert(obs(repeated).rr<obs(run(s,[],45)).rr);
});
check('renal and hepatic dysfunction prolong opioid exposure',()=>{
 const e=event('m','morphine',4,'mg');
 const normal=run(fresh(),[e],240);
 const renal=run(fresh(profile({renalFunction:.2})),[e],240);
 const hepatic=run(fresh(profile({hepaticFunction:.3})),[e],240);
 assert(renal.respiratoryDepression>normal.respiratoryDepression);
 assert(hepatic.respiratoryDepression>normal.respiratoryDepression);
});
check('diuretic reduces congested volume but harms hypovolemia and has renal dependence',()=>{
 const e=event('f','furosemide',40,'mg');
 const congestion=profile({circulatingVolumeMl:5100,interstitialFluidMl:4000});
 const a=run(fresh(congestion),[],180),b=run(fresh(congestion),[e],180);
 assert(b.interstitialFluidMl<a.interstitialFluidMl);assert(b.cumulativeUrineMl>a.cumulativeUrineMl);
 const hypo=fresh(),c=run(hypo,[],180),d=run(hypo,[e],180);
 assert(d.perfusion<c.perfusion);assert(d.circulatingVolumeMl<c.circulatingVolumeMl);
 const renal=run(fresh({...congestion,renalFunction:.2}),[e],180);
 assert(renal.cumulativeUrineMl<b.cumulativeUrineMl);
});
check('diuresis is delayed and wanes while physical fluid loss is retained',()=>{
 const s=fresh(profile({circulatingVolumeMl:5100,interstitialFluidMl:4000})),e=event('f','furosemide',40,'mg');
 const early=run(s,[e],1),peak=run(s,[e],30),late=run(s,[e],360);
 assert.equal(early.drugDiuresisMlPerMin,0);assert(peak.drugDiuresisMlPerMin>late.drugDiuresisMlPerMin*10);
 assert(late.cumulativeUrineMl>peak.cumulativeUrineMl);
});
check('support does not resolve infection, source, bleeding or chronic disease',()=>{
 const p=profile({infectionBurden:1,inflammation:.7,sourceControlled:false,
  natural:{bleedingMlPerMin:2,capillaryLeakMlPerMin:2,inflammationGrowthPerMin:.001,
   infectionGrowthPerMin:.001,sourceRequired:true,refillMlPerMin:2}});
 const s=run(fresh(p),[event('f','fluid',500,'ml'),event('v','vasopressor',.05,'mcg/kg/min',0,'start')],60);
 assert.equal(s.sourceControlled,false);assert(s.infectionBurden>=1);assert(s.cumulativeBloodLossMl>0);
});
check('long infusion and repeated boluses stay finite without unbounded dosing ledger',()=>{
 const events=[event('v','vasopressor',.05,'mcg/kg/min',0,'start')];
 for(let i=0;i<50;i++)events.push(event('m'+i,'morphine',4,'mg',i*10));
 let s=run(fresh(),events,1440);s=run(s,[],1440);
 assert(Object.values(obs(s)).filter(x=>typeof x==='number').every(Number.isFinite));
 assert(Object.values(s.exposures).every(x=>x.central<1000));
 assert(Object.keys(s.seenEvents).length===51);
});
check('new mechanism rejects missing physiological axes explicitly',()=>{
 const d=[{...PILOT_DEFINITIONS_487.drugs.get('morphine'),id:'unreviewed',requires:['plateletCount']}];
 assert.throws(()=>compilePhysiologyDefinitions487(d),/plateletCount/);
 assert.throws(()=>run(fresh(),[event('h','anticoagulation',5000,'UI')],1),/unsupported.*anticoagulation/i);
});
check('an existing mechanism is reusable under another validated definition ID',()=>{
 const alias={...PILOT_DEFINITIONS_487.drugs.get('morphine'),id:'synthetic-opioid'};
 const definitions=compilePhysiologyDefinitions487([alias]);
 const e={...event('alias','morphine',4,'mg'),drugId:alias.id};
 const equivalent=stepPhysiology487(fresh(),[e],30,definitions);
 const original=run(fresh(),[event('original','morphine',4,'mg')],30);
 assert.deepEqual(obs(equivalent),obs(original));
});
check('state corruption and mechanism/kinetics mismatches fail explicitly',()=>{
 assert.throws(()=>run({...fresh(),renalFunction:NaN},[],1),/state|renal/i);
 assert.throws(()=>run({...fresh(),integratedUs:15000000,requestedUs:0},[],1),/clock/i);
 const opioid=PILOT_DEFINITIONS_487.drugs.get('morphine');
 assert.throws(()=>compilePhysiologyDefinitions487([{...opioid,kinetics:{kind:'support',responseHalfLifeMin:1}}]),/kinetics|mechanism/i);
 assert.throws(()=>compilePhysiologyDefinitions487([{...opioid,id:{}}]),/identity|id/i);
 assert.throws(()=>compilePhysiologyDefinitions487([{...opioid,requires:['pain']}]),/respiratoryDepression/i);
 const delayed=run(fresh(),[event('delayed','furosemide',40,'mg')],0);
 const broken=structuredClone(delayed);broken.exposures.furosemide.delayed[0].amount=NaN;
 assert.throws(()=>run(broken,[],10),/release|state/i);
 const badTime=structuredClone(delayed);badTime.exposures.furosemide.delayed[0].atUs=Infinity;
 assert.throws(()=>run(badTime,[],10),/release|clock/i);
 assert.throws(()=>run({...fresh(),cumulativeUrineMl:NaN},[],1),/state|urine/i);
 const scheduled=run(fresh(),[event('future','fluid',500,'ml',5)],0);
 const badQueue=structuredClone(scheduled);badQueue.pendingEvents[0].amount=NaN;
 assert.throws(()=>run(badQueue,[],10),/state|queue|dose/i);
 const changedReceipt=structuredClone(scheduled);changedReceipt.pendingEvents[0].amount=1000;
 assert.throws(()=>run(changedReceipt,[],10),/receipt|queued/i);
});
check('norepinephrine pressor support withdraws within the label timing band',()=>{
 const s=run(fresh(),[event('start','vasopressor',.05,'mcg/kg/min',0,'start')],10);
 const after=run(s,[stop('stop','vasopressor',10)],2);
 const without=run(fresh(),[],12);
 assert(after.vascularTone-without.vascularTone<(s.vascularTone-without.vascularTone)*.1);
});
check('adverse event timestamps cannot precede their causal receipt inside a quantum',()=>{
 const s=run(fresh(),[event('late-in-quantum','fluid',10000,'ml',.24)],.25);
 assert(s.adverseEvents.some(e=>e.code==='fluid-overload'));
 assert(s.adverseEvents.every(e=>e.clinicalMinute>=.24));
});
console.log('PURE PHYSIOLOGY B1 PILOT PASS',JSON.stringify({checks,drugs:5,fixedGridMinutes:.25,clinicalCalibration:false,physicalAndroid:false}));
