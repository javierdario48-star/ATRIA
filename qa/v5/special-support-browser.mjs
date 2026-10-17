// Built ESM in real Chromium, unchanged spatial nursing and real receipts.
// This explicit admission fixture never injects administrations or live vitals.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results',reports=[];
try{
 await fs.mkdir(out,{recursive:true});
 for(const mobile of [false,true])for(const mode of ['solo','apprentice']){
  const context=await h.browser.newContext(mobile?h.devices['Pixel 5']:{viewport:{width:1200,height:850}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  const report=await page.evaluate(async({mode})=>{
   const [{createWorld},{createGuardSession},{historyHTML}]=await Promise.all([
    import('/src/v5/app/world.js'),import('/src/v5/clinical/guard-session.js'),import('/src/v5/ui/clinical-panels.js')]);
   const content={},names={map:'hospital',beds:'beds',cases:'cases',therapies:'therapies',defaultDoses:'default-doses'};
   for(const [key,name] of Object.entries(names))content[key]=await(await fetch('/src/v5/content/'+name+'.json')).json();
   const world=createWorld(content,{name:'Soporte QA',scrubColor:'navy'});
   world.enterLobby();world.enterGuard({mode,caseId:'CIRR-001'});const patient=world.snapshot().patients[0];
   const s=createGuardSession({roomId:'browser-support',mode,actorId:'doctor',actorName:'Doctor',patient,content,
    resolveContext:()=>({patientUid:patient.uid}),nursing:{enqueue:x=>world.enqueueNurseJourney(x),
     takeArrivals:()=>world.takeNurseArrivals(),accept:x=>world.acceptNurseClinicalResult(x)}});
   const check=(v,label)=>{if(!v)throw Error(label);};let id=0;
   const send=text=>s.post({id:'s'+(++id),text});
   const until=async(fn,label)=>{
    for(let i=0;i<3600&&!fn();i++){world.step(1/60);s.finishNurseArrivals();s.advance(1/60);}
    await s.flush();check(fn(),label);
   };
   try{
    for(const text of ['Enfermera monitor y transfusion 1 unidad VO','Enfermera monitor y anfotericina 0.7 mg/kg P.O.',
     'Enfermera monitor y noradrenalina 0.05 mg IV']){
     const denied=await send(text);check(denied.routeError&&denied.clinical.length===0,'invalid batch executed');
    }
    check(world.nurseJourneySnapshot().length===0,'invalid order summoned a nurse');
    const order={id:'combined-special',text:'Enfermera monitor y albumina 1.5 g/kg y transfusion 1 unidad y anfotericina 0.7 mg/kg IV y noradrenalina 0.05 mcg/kg/min IV'};
    const ack=await s.post(order);check(ack.clinical.length===6&&ack.clinical.every(x=>x.status==='pending'),'common IV preflight');
    s.advance(5);await s.flush();check(s.read().patient.administrationLog.length===0,'time fabricated bedside arrival');
    await until(()=>s.read().patient.administrationLog.length===4,'four real special medicine receipts');
    const administered=s.read(),rows=administered.patient.administrationLog;
    check(administered.patient.venousAccessCount===1&&administered.patient.procedures.monitor.connected,'real IV/monitor missing');
    check(administered.patient.orders.length===0,'albumin incorrectly ordered a hepatogram');
    const expected=[['albumin',1.5,'g/kg'],['transfusion',1,'unidad'],['amphotericin',.7,'mg/kg'],['vasopressor',.05,'µg/kg/min']];
    check(JSON.stringify(rows.map(x=>[x.id,x.dose.amount,x.dose.unit]))===JSON.stringify(expected),'lost actual formulation');
    await s.post(order);check(s.read().patient.administrationLog.length===4,'transport replay redosed medicine');
    await send('Enfermera noradrenalina 0.02 mcg/kg/min IV');
    s.advance(3);await s.flush();check(s.read().patient.procedures.vasopressor.dose.amount===.05,'rate changed before arrival');
    await until(()=>s.read().patient.administrationLog.length===5,'real rate change');
    check(s.read().patient.administrationLog[4].action==='setRate','titration missing its receipt');
    await send('Enfermera suspender noradrenalina');s.advance(3);await s.flush();
    check(s.read().patient.procedures.vasopressor.active,'pending stop already withdrew support');
    await until(()=>s.read().patient.procedures.vasopressor.active===false,'real physical infusion stop');
    const final=s.read(),stop=final.patient.administrationLog.at(-1);
    check(stop.action==='stop'&&stop.dose===undefined&&stop.previousDose.amount===.02,'stop became a dose');
    check(final.exposure.byDrug.vasopressor.administrations===2&&final.exposure.byDrug.vasopressor.currentRate===0,'rate/amount ledger conflated');
    check(world.nurseJourneySnapshot().every(x=>x.stage==='confirmed'),'unconfirmed nursing job');
    check(final.patient.administrationLog.every(x=>x.patientUid===patient.uid),'cross-patient receipt');
    const panel=document.createElement('section');panel.id='special-support-history';
    panel.style.cssText='position:fixed;inset:0;overflow:auto;background:#10212b;color:white;padding:18px;z-index:99999';
    panel.innerHTML=historyHTML(final.patient);document.body.append(panel);
    return {mode,physicalAndroid:false,initialAck:ack.clinical.map(x=>[x.id,x.status]),
     receipts:final.patient.administrationLog.map(x=>({id:x.id,action:x.action||'administration',dose:x.dose,previousDose:x.previousDose,sourceEventId:x.sourceEventId})),
     beforeStop:administered.patient.liveVitals,afterStop:final.patient.liveVitals,
     exposure:final.exposure.byDrug.vasopressor,orders:final.patient.orders.length,
     journeys:world.nurseJourneySnapshot().map(x=>x.stage)};
   }finally{s.dispose();world.enterLobby();}
  },{mode});
  assert.deepEqual(errors,[]);assert.equal(report.receipts.length,6);
  await page.locator('#special-support-history').getByText('Tratamiento y consultas',{exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/special-support-'+mode+'-'+(mobile?'mobile':'desktop')+'.png'});
  reports.push({mobile,...report});await context.close();
 }
 await fs.writeFile(out+'/special-support.json',JSON.stringify(reports,null,2)+'\n');
 console.log('V5 SPECIAL SUPPORT BROWSER',JSON.stringify(reports));
}finally{await h.close();}
