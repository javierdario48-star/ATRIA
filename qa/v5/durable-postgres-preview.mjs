// Explicit WAN acceptance against two Preview deployments of the same code.
// Real public UI is reused. After host loss, the guest's albumin event competes
// on both deployments; its original-ID retries recover through the secondary.
// Other UI traffic stays native. No response data or clinical state is mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';

function previewOrigin(value){
 const url=new URL(value);
 assert(url.protocol==='https:'&&url.hostname.endsWith('.vercel.app')&&url.pathname==='/'&&!url.search&&!url.hash);
 return url.origin;
}
const primary=previewOrigin(process.env.V5_BROWSER_URL),secondary=previewOrigin(process.env.V5_SECONDARY_URL);
assert.notEqual(primary,secondary,'two distinct deployments are required');
const capabilityKey=crypto.randomUUID()+crypto.randomUUID();
for(const origin of [primary,secondary]){
 const response=await fetch(origin+'/api/clinical',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({action:'capability',clientKey:capabilityKey})});
 assert.equal(response.status,200);
 const value=await response.json();
 assert(value.clinicalEnabled&&value.durable&&value.kind==='postgres-atomic-cas',
  'only an explicitly enabled PostgreSQL Preview can run this acceptance');
}
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const launch=chromium.launch.bind(chromium),credentials=new Map(),traffic=[];
let browserNumber=0,medicalReplay=null,medicalCommand=null,secondaryMedicalAccepted=false;
chromium.launch=async options=>{
 const index=browserNumber++;
 if(process.env.V5_USE_ENV_PROXY==='1'){
  const proxy=new URL(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);
  options={...options,proxy:{server:proxy.origin,...(proxy.username?{
   username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}};
 }
 const browser=await launch(options),newContext=browser.newContext.bind(browser);
 browser.newContext=async options=>{
  const context=await newContext({...options,
   ...(process.env.V5_ALLOW_PROXY_CA==='1'?{ignoreHTTPSErrors:true}:{})});
  if(process.env.V5_QA_TRACE_INPUT==='1'){
   context.on('page',page=>page.on('console',message=>{
    if(message.text().startsWith('QA_INPUT '))console.log(index,message.text());}));
   await context.addInitScript(()=>document.addEventListener('pointerdown',event=>{
    if(event.target.id!=='game')return;
    const pixel=[event.clientX,event.clientY],camera=atriaV5.diagnostics().renderer;
    queueMicrotask(()=>console.log('QA_INPUT '+JSON.stringify({pixel,camera,player:atriaV5.snapshot().player})));
   }));
  }
  context.on('request',request=>{
   if(new URL(request.url()).pathname!=='/api/clinical'||request.method()!=='POST')return;
   const body=request.postDataJSON();
   if(body.roomId&&body.clientKey)credentials.set(index,{roomId:body.roomId,clientKey:body.clientKey});
  });
  if(index===1)await context.route('**/api/clinical',async route=>{
   try{
    const body=route.request().postDataJSON(),albumin=body.commands?.find(x=>/albumina/i.test(x.text));
    if(process.env.V5_QA_TRACE_INPUT==='1'&&body.motion)console.log('QA_MOTION',index,body.motion);
    if(!albumin||secondaryMedicalAccepted){await route.continue();return;}
    // The same real UI medication event competes on two independent workers.
    // Return the secondary's actual response, including a genuine CAS conflict;
    // the unchanged client must retry that same ID rather than give a new dose.
    const replay=!!albumin&&!medicalReplay;
    if(replay){medicalCommand=structuredClone(albumin);medicalReplay={commandId:albumin.id,statuses:[]};}
    const destinations=replay?[primary,secondary]:[secondary];
    const responses=await Promise.all(destinations.map(async origin=>{
     // Durable sync authenticates the synthetic device key in the original
     // body. Never forward a social Bearer token into request error logs.
     const response=await route.fetch({url:origin+'/api/clinical',
      headers:{'Content-Type':'application/json',Origin:origin}});
     const value=await response.json();
     traffic.push({deployment:origin,status:response.status(),requestId:response.headers()['x-vercel-id']||null});
     if(replay)medicalReplay.statuses.push({deployment:origin,status:response.status(),code:value.code??null});
     if(origin===secondary&&response.status()===200&&value.acknowledgements?.some(x=>x.commandId===albumin.id&&x.status==='received'))
      secondaryMedicalAccepted=true;
     return response;
    }));
    await route.fulfill({response:responses.at(-1)});
   }catch{
    traffic.push({deployment:secondary,status:'transport-error'});
    await route.abort('failed').catch(()=>{});
   }
  });
  return context;
 };
 return browser;
};
process.env.V5_QA_NAME_SUFFIX||='QA'+Date.now().toString(36);
process.env.V5_GUEST_BROWSER_URL=secondary;
try{await import('./durable-cooperative-closure-browser.mjs');}
finally{if(process.env.V5_QA_TRACE_INPUT==='1')console.log('QA_TRAFFIC',JSON.stringify(traffic));}
assert(traffic.some(x=>x.status===200),'guest must actually use the second deployment');
assert(secondaryMedicalAccepted,'the guest must recover its real medication ACK through the second deployment');
assert.equal(medicalReplay?.statuses.length,2,'the actual albumin event must compete on both deployments');
assert(medicalReplay.statuses.every(x=>x.status===200||
 x.status===409&&['busy','fenced'].includes(x.code)),'both workers must accept the event or return an authentic CAS conflict');
const credential=credentials.get(1);assert(credential,'synthetic guest credentials were not observed');
const command={id:'concurrent-'+crypto.randomUUID(),text:'Confirmación de concurrencia de QA'};
async function sync(origin,event=command){
 const response=await fetch(origin+'/api/clinical',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({action:'sync',...credential,commands:[event]})});
 return {deployment:origin,status:response.status,body:await response.json()};
}
const medicalAcks=[];
for(const origin of [primary,secondary]){
 let result=await sync(origin,medicalCommand);
 for(let attempt=0;result.status===409&&['busy','fenced'].includes(result.body.code)&&attempt<4;attempt++)
  result=await sync(origin,medicalCommand);
 assert.equal(result.status,200);
 const ack=result.body.acknowledgements.find(x=>x.commandId===medicalCommand.id);
 assert.equal(ack?.status,'received','the original clinical event must retain its authentic acceptance');medicalAcks.push(ack);
 assert.equal(result.body.clinical.patient.administrationLog.length,2);
}
assert.deepEqual(medicalAcks[0],medicalAcks[1],'the same medical event retains its ACK across workers after reconnect');
medicalReplay.identicalAcceptedAckAcrossDeployments=true;
const initial=await Promise.all([primary,secondary].map(origin=>sync(origin))),accepted=[],acks=[];
for(let result of initial){
 for(let attempt=0;result.status===409&&['busy','fenced'].includes(result.body.code)&&attempt<4;attempt++)
  result=await sync(result.deployment);
 assert.equal(result.status,200,JSON.stringify({status:result.status,code:result.body.code}));
 const state=result.body;
 assert(state.clinical.patient.caseEnded);assert.equal(state.clinical.progress.xp,111);
 assert.equal(state.clinical.patient.administrationLog.length,2);assert.equal(state.clinical.patient.orders.length,2);
 assert.equal(state.clinical.room.transcript.filter(x=>x.id===command.id).length,1,'same event is committed only once across instances');
 assert.equal(state.claims.length,2);
 assert.deepEqual(state.claims.map(([id])=>id).sort(),[...state.clinical.room.members].sort());
 assert(state.claims.every(([id,claim])=>id===claim.actorId&&claim.xp===111));
 assert(state.claims.every(([,claim])=>claim.patientUid===state.clinical.patient.uid&&claim.eventId===state.clinical.patient.closure.eventId));
 assert.equal(state.acknowledgements.length,1);assert.equal(state.acknowledgements[0].commandId,command.id);
 acks.push(state.acknowledgements[0]);
 accepted.push({deployment:result.deployment,epoch:state.epoch,revision:state.clinical.room.revision});
}
assert.deepEqual(acks[0],acks[1],'same event returns the same authentic ACK across deployments');
const out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';
const report={passed:true,primary,secondary,roomId:credential.roomId,realPostgreSQL:true,
 realBrowserUi:true,independentDeployments:true,guestRequestsOnSecondary:traffic.filter(x=>x.deployment===secondary).length,
 nativeUiTraffic:'each browser uses its own deployment',secondaryRecoveredMedicalAckAfterHostLoss:secondaryMedicalAccepted,
 concurrentInitialStatuses:initial.map(x=>x.status),accepted,uniqueCommandAfterRetry:true,
 medicalEventReplay:medicalReplay,identicalAckAcrossDeployments:true,
 uniqueMedicationReceipts:2,uniqueStudies:2,perDoctorXp:111,memberClaims:2,
 proxyUsed:process.env.V5_USE_ENV_PROXY==='1',proxyCertificateException:process.env.V5_ALLOW_PROXY_CA==='1'};
await fs.writeFile(out+'/durable-postgres-preview-summary.json',JSON.stringify(report,null,2)+'\n');
console.log('POSTGRES PREVIEW PASS',JSON.stringify(report));
