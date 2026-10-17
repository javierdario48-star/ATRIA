// Built ESM + real spatial nursing on desktop/Pixel emulation. No live-state
// injection, fake administration, forced nurse arrival or hand-edited vital.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results',reports=[];
try{
 await fs.mkdir(out,{recursive:true});
 for(const mobile of [false,true])for(const mode of ['solo','apprentice']){
  const context=await h.browser.newContext(mobile?h.devices['Pixel 5']:{viewport:{width:1200,height:850}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(h.url);
  await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  const report=await page.evaluate(async({mode})=>{
   const [{createWorld},{createGuardSession},{historyHTML}]=await Promise.all([
    import('/src/v5/app/world.js'),import('/src/v5/clinical/guard-session.js'),import('/src/v5/ui/clinical-panels.js')]);
   const names={map:'hospital',beds:'beds',cases:'cases',therapies:'therapies',defaultDoses:'default-doses'},content={};
   for(const [key,name] of Object.entries(names))content[key]=await(await fetch('/src/v5/content/'+name+'.json')).json();
   const world=createWorld(content,{name:'Morphine QA',scrubColor:'navy'});
   world.enterLobby();world.enterGuard({mode,caseId:'CIRR-001'});
   const patient=world.snapshot().patients[0];
   const s=createGuardSession({roomId:'browser-morphine',mode,actorId:'doc',actorName:'Doctor',patient,content,
    resolveContext:()=>({patientUid:patient.uid}),nursing:{enqueue:x=>world.enqueueNurseJourney(x),
     takeArrivals:()=>world.takeNurseArrivals(),accept:x=>world.acceptNurseClinicalResult(x)}});
   const check=(v,label)=>{if(!v)throw Error(label);};
   let id=0;const send=text=>s.post({id:'m'+(++id),text});
   const tick=()=>{world.step(1/30);s.finishNurseArrivals();s.advance(1/30);};
   const step=async seconds=>{for(let t=0;t<seconds-1e-9;t+=1/30)tick();await s.flush();};
   const until=async(fn,label)=>{for(let i=0;i<1800&&!fn();i++)tick();await s.flush();check(fn(),label);};
   try{
    const order={id:'actual-dose',text:'Enfermera monitor y morfina 12 mg IV'};
    const ack=await s.post(order);
    check(ack.clinical.length===3&&ack.clinical.every(x=>x.status==='pending'),'shared IV preflight');
    check(s.read().patient.administrationLog.length===0,'opioid acted before nurse');
    await until(()=>s.read().patient.administrationLog.length===1&&s.read().patient.procedures.monitor?.connected,'actual morphine receipt');
    await step(15);
    const impaired=s.read(),row=impaired.patient.administrationLog[0];
    check(row.id==='morphine'&&row.dose.amount===12,'wrong actual opioid dose');
    check(impaired.patient.liveVitals.spo2<94&&impaired.patient.liveVitals.rr<12.5,'missing respiratory depression');
    check(impaired.patient.adverseEvents.length===1,'complication missing or duplicated');
    check(impaired.room.events.filter(x=>x.type==='clinical.complication'&&x.kind==='opioid-respiratory-depression').length===1,'missing global nurse warning');
    check(impaired.closure.quality.penalty>=5,'missing confirmed complication penalty');
    await s.post(order);await step(1);
    check(s.read().patient.administrationLog.length===1,'transport replay redosed opioid');
    await send('Enfermera oxígeno 4 L/min');
    await until(()=>s.read().patient.administrationLog.some(x=>x.id==='oxygen'),'actual oxygen support');
    await step(10);
    const supported=s.read();
    check(supported.patient.liveVitals.spo2>impaired.patient.liveVitals.spo2+2,'real support did not improve saturation');
    const panel=document.createElement('section');panel.id='morphine-history';
    panel.style.cssText='position:fixed;inset:0;overflow:auto;background:#10212b;color:white;padding:20px;z-index:99999';
    panel.innerHTML=historyHTML(supported.patient);document.body.append(panel);
    return {mode,impaired:impaired.patient.liveVitals,supported:supported.patient.liveVitals,
     receipts:supported.patient.administrationLog.map(x=>({id:x.id,amount:x.dose.amount})),
     penalty:supported.closure.quality.penalty,complications:supported.patient.adverseEvents.length,
     journeys:world.nurseJourneySnapshot().map(x=>x.stage)};
   }finally{s.dispose();}
  },{mode});
  assert.equal(errors.length,0,JSON.stringify(errors));
  await page.screenshot({path:out+'/morphine-'+mode+'-'+(mobile?'mobile':'desktop')+'.png'});
  reports.push({mobile,...report});await context.close();
 }
 await fs.writeFile(out+'/morphine.json',JSON.stringify(reports,null,2)+'\n');
 console.log('V5 MORPHINE BROWSER',JSON.stringify(reports));
}finally{await h.close();}
