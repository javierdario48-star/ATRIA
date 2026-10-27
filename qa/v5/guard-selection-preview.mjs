// Real deployed account/cookie/clinical/reward acceptance. No credentials,
// sessions, HAR or physiological state injection are written to evidence.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {clinicalBotAssessmentActions,CLINICAL_BOT_PLAYBOOK} from '../../src/v5/clinical/clinical-bot-playbooks.js';
import {createNavigation} from '../../src/v5/engine/navigation.js';
const origin=new URL(process.env.V5_BROWSER_URL).origin;
assert(origin.startsWith('https://')&&origin.endsWith('.vercel.app'));
const {chromium}=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const proxy=process.env.V5_USE_ENV_PROXY==='1'?new URL(process.env.HTTPS_PROXY||process.env.HTTP_PROXY):null;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
 args:['--no-sandbox','--disable-dev-shm-usage'],...(proxy?{proxy:{server:proxy.origin,
  ...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}}:{})});
const password=randomBytes(24).toString('base64url'),suffix=Date.now().toString(36),contexts=[],errors=[];
const summary={preview:origin,physicalDevice:false,checks:[],rewards:[]};
let stage='registration';
async function open(width=1280,height=960){
 const c=await browser.newContext({viewport:{width,height},ignoreHTTPSErrors:!!proxy});contexts.push(c);
 const p=await c.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin);await p.waitForFunction(()=>document.body.dataset.boot==='ready');return p;
}
async function api(p,path,body){return p.evaluate(async({path,body})=>{
 const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,body:await r.json()};
},{path,body});}
async function credentials(p,kind,username){
 if(kind==='register'){
  await p.locator('#enterButton').click();await p.locator('#profileButton').click();await p.locator('[data-action="account-register"]').click();
 }else await p.locator('#accountLoginButton').click();
 await p.locator('#accountUsername').fill(username);await p.locator('#accountPassword').fill(password);
 const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/account/'+kind&&r.request().method()==='POST');
 await p.locator('#accountForm button[type="submit"]').click();const r=await response,data=await r.json();
 assert.equal(r.status(),200,JSON.stringify(data));await p.waitForFunction(()=>document.getElementById('splash').hidden);return data.account;
}
const scopeInput=scope=>({scope,selection:scope==='specific'?'FECAL-001':scope==='specialty'?'Gastroenterología':''});
try{
 const a=await open(),b=await open(393,851),other=await open(851,393);
 await a.locator('#playerName').fill('QA Selección A');await b.locator('#playerName').fill('QA Selección B');
 const aa=await credentials(a,'register','qa_scope_a_'+suffix),bb=await credentials(b,'register','qa_scope_b_'+suffix);
 assert.equal((await credentials(other,'login',aa.username)).actorId,aa.actorId);
 summary.accounts=[{username:aa.username,actorId:aa.actorId},{username:bb.username,actorId:bb.actorId}];
 summary.checks.push('real registration, portrait creation and landscape second-device login');
 // Account host reload before acceptance must retain its server invitation.
 stage='pending invitation recovery';await a.locator('#guardButton').click();await a.locator('[data-mode="coop"]').click();
 await a.locator('input[name="guardScope"][value="specific"]').check();await a.locator('#caseChoice').selectOption('FECAL-001');
 await a.locator('#coopDoctors label').filter({hasText:bb.name}).locator('input').check();
 await a.locator('[data-action="start-guard"]').click();await b.locator('#coopInviteNotice').waitFor({state:'visible'});
 await a.reload();await a.waitForFunction(()=>document.body.dataset.boot==='ready'&&document.getElementById('splash').hidden);
 await b.locator('#coopInviteAccept').click();
 await Promise.all([a,b].map(p=>p.waitForFunction(()=>atriaV5.diagnostics().cooperative.durable)));
 for(const p of [a,b])assert.equal((await p.evaluate(()=>atriaV5.snapshot().clinical.shift.guardSelection)).selection,'FECAL-001');
 summary.checks.push('same-account reload retains pending host invitation and both doctors enter');
 for(const p of [a,b]){await p.locator('#guardButton').click();await p.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');}
 // Wait for the existing release pipeline, never override its controller.
 for(const p of [a,b])await p.waitForFunction(async()=>!(await (await fetch('/api/account/session')).json()).account.activeGuardId);
 const beds=JSON.parse(readFileSync(new URL('../../src/v5/content/beds.json',import.meta.url))),map=JSON.parse(readFileSync(new URL('../../src/v5/content/hospital.json',import.meta.url)));
 let total=(await api(a,'account/session')).body.account.xp;
 for(const [scope,factor] of [['random',1.5],['specialty',1.2],['specific',1]]){
  stage='native reward '+scope;const roomId='scope-reward-'+crypto.randomUUID(),call=extra=>api(a,'clinical',{roomId,...extra});
  let r=await call({action:'start',mode:'solo',caseId:'FORGED',guardSelection:{...scopeInput(scope),multiplier:999,xp:999999}});
  assert.equal(r.status,200,JSON.stringify(r.body));const uid=r.body.clinical.patient.uid,caseId=r.body.clinical.patient.caseId;
  const plan=CLINICAL_BOT_PLAYBOOK[caseId],bed=beds.find(x=>x.id===r.body.clinical.shift.patients[0].bedId),point=createNavigation(map).center(...bed.approach);
  assert.equal(r.body.clinical.shift.guardSelection.multiplier,factor);
  await call({action:'sync',motion:[point.x,point.y],motionSequence:1});
  const arrival=Date.now()+60000;let arrived=false;
  while(Date.now()<arrival){await new Promise(resolve=>setTimeout(resolve,1000));r=await call({action:'sync'});assert.equal(r.status,200);
   const d=r.body.spatial.doctors.find(x=>x.id===aa.actorId);
   if(!d.moving&&!d.target&&Math.hypot(d.x-point.x,d.y-point.y)<3){arrived=true;break;}}
  assert(arrived,'doctor must physically arrive');
  const texts=clinicalBotAssessmentActions({id:caseId},'competent'),startedAt=r.body.clinical.shift.elapsedSeconds;
  for(let i=0;i<texts.length;i+=16){r=await call({action:'sync',commands:texts.slice(i,i+16).map((text,j)=>({id:'care-'+scope+'-'+(i+j),text,targetPatientUid:uid}))});assert.equal(r.status,200);}
  const deadline=Date.now()+360000;let ready=false;
  while(Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,1500));r=await call({action:'sync'});assert.equal(r.status,200);
   assert.equal(!!r.body.clinical.patient.patientDied,false,'competent control must remain alive');
   if(r.body.clinical.shift.elapsedSeconds-startedAt>=plan.wait){
    r=await call({action:'sync',commands:[{id:'reassess-'+Date.now(),text:'/reevaluar',targetPatientUid:uid}]});
    if(r.body.clinical.eligibleDestinations.includes(plan.dest)){ready=true;break;}
   }
  }
  assert(ready,'native indicated destination must become eligible');
  const command={id:'close-'+scope,text:'/disposicion '+plan.dest,targetPatientUid:uid};
  const closed=await call({action:'sync',commands:[command]});assert.equal(closed.status,200);
  const closure=closed.body.clinical.patient.closure;assert(closure?.closed,JSON.stringify(closed.body.acknowledgements));
  const expected=Math.round(closure.xp*factor);assert.equal(closed.body.account.xp-total,expected);
  const repeated=await call({action:'sync',commands:[command],xp:999999,multiplier:999,guardSelection:{scope:'random'}});
  assert.equal(repeated.body.account.xp,closed.body.account.xp);
  assert.equal((await api(other,'account/session')).body.account.xp,closed.body.account.xp);
  summary.rewards.push({scope,roomId,caseId,patientUid:uid,nativeXP:closure.xp,factor,awardedXP:expected,total:closed.body.account.xp});
  total=closed.body.account.xp;await api(a,'account/release-guard',{});console.log('VERIFIED REWARD',scope,caseId,closure.xp,expected);
 }
 stage='deployed four-mode recovery';summary.modes=[];
 for(const mode of ['solo','apprentice','coop','competitive'])for(const scope of ['random','specialty','specific']){
  const selection=scopeInput(scope);let roomId='scope-check-'+crypto.randomUUID();
  if(['coop','competitive'].includes(mode)){
   const invitation=await api(a,'rooms',{mode,invitees:[bb.actorId],peerId:'scope-host',guardSelection:selection});
   assert.equal(invitation.status,201);roomId=invitation.body.room.id;
   assert.equal((await api(b,'rooms/join',{roomId,peerId:'scope-guest'})).status,200);
  }
  const started=await api(a,'clinical',{action:'start',mode,roomId,guardSelection:selection});assert.equal(started.status,200,JSON.stringify(started.body));
  const recovered=await api(a,'clinical',{action:'sync',roomId,guardSelection:{scope:'hack'},multiplier:999});
  assert.equal(recovered.status,200);assert.deepEqual(recovered.body.clinical.shift.guardSelection,started.body.clinical.shift.guardSelection);
  if(['coop','competitive'].includes(mode)){
   const shared=await api(b,'clinical',{action:'sync',roomId});assert.equal(shared.status,200);
   assert.deepEqual(shared.body.clinical.shift.patients.map(x=>[x.uid,x.caseId]),started.body.clinical.shift.patients.map(x=>[x.uid,x.caseId]));
   await api(b,'account/release-guard',{});await api(a,'rooms/'+roomId+'/leave',{});await api(b,'rooms/'+roomId+'/leave',{});
  }
  await api(a,'account/release-guard',{});summary.modes.push({mode,scope,recovered:true});
 }
 summary.checks.push('12 deployed mode/scope combinations, server recovery, fixed shared sequences and manipulation rejection');
 assert.deepEqual(errors,[]);summary.pass=true;
 if(process.env.V5_SELECTION_EVIDENCE)writeFileSync(process.env.V5_SELECTION_EVIDENCE,JSON.stringify(summary,null,2)+'\n');
 console.log('GUARD SELECTION PREVIEW PASS',JSON.stringify(summary));
}catch(error){console.error('GUARD SELECTION PREVIEW FAILED',stage,error.message);throw error;}
finally{for(const c of contexts){const p=c.pages()[0];if(p)for(const path of ['account/release-guard','account/logout'])await api(p,path,{}).catch(()=>{});await c.close();}await browser.close();}
