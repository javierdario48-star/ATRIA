// Real PostgreSQL interpreter, actual runtime checkpoints, no hosted writes.
// Provision @electric-sql/pglite@0.5.17 in a temporary directory, then set
// ATRIA_PGLITE_MODULE to its absolute dist/index.js path. This is NOT staging,
// a network/reconnect certificate, or a multi-connection concurrency test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createGuardRuntime} from '../../../src/v5/clinical/guard-runtime.js';
import {createGuardSession} from '../../../src/v5/clinical/guard-session.js';
import {createProgressionLedger} from '../../../src/v5/clinical/progression.js';
import {clinicalContent as content} from '../../../src/v5/server/content.js';
import {createNavigation} from '../../../src/v5/engine/navigation.js';

if(!process.env.ATRIA_PGLITE_MODULE)throw Error('Set ATRIA_PGLITE_MODULE to @electric-sql/pglite@0.5.17 dist/index.js (see this file header).');
const {PGlite}=await import(pathToFileURL(process.env.ATRIA_PGLITE_MODULE).href);
const actor=i=>'qa_'+String(i).padStart(30,'0');
const migration='supabase/migrations/20261122013909_cooperative_rewards_and_disposition_debt.sql';
const sql=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create table auth.sessions(id uuid primary key,user_id uuid);
  create table public.atria_clinical_guards(room_id text primary key,state jsonb,updated_at timestamptz default now());
  alter table public.atria_clinical_guards enable row level security;
  grant select on public.atria_clinical_guards to service_role;`);
 await db.exec(sql('docs/migration/20261027043549_atria_v5_persistent_accounts.sql').split('-- A narrow definer')[0]);
 for(const path of ['docs/migration/20261027182110_atria_v5_guard_selection_rewards.sql',
  'supabase/migrations/20261112030000_unsafe_discharge_rewards.sql',
  'supabase/migrations/20261112133500_diagnosis_reveal_rewards.sql',migration])await db.exec(sql(path));
 for(let i=1;i<=3;i++){
  const auth='00000000-0000-4000-8000-'+String(i).padStart(12,'0');
  await db.query('insert into auth.users values($1)',[auth]);
  await db.query(`insert into public.atria_v5_accounts(auth_user_id,actor_id,username,name,sex,scrub_color,avatar,legacy_key,social_token)
   values($1,$2,$3,$4,'male','navy','player-green',$5,$6)`,
   [auth,actor(i),'doctor'+i,'Doctor '+i,'local-qa-key-000000000000'+i,String(i).repeat(40)]);
 }
 return db;
}
async function fixture(mode='coop'){
 const members=Array.from({length:mode==='coop'?3:mode==='competitive'?2:1},(_,i)=>({id:actor(i+1),name:'Doctor '+(i+1)}));
 const roomId='sql-reward-'+mode,uid=roomId+':patient';
 let r=await createGuardRuntime({content,roomId,caseId:'CIRR-001',members,hostId:actor(1),mode,nowMs:0});
 const point=createNavigation(content.map).center(...content.beds[0].approach);
 for(const m of members)r.motion(m.id,[point.x,point.y]);
 await r.advanceTo(20000);
 for(const m of members)if(mode!=='competitive'||m.id===actor(1))assert(r.claim(m.id,uid));
 return {get r(){return r;},roomId,uid,
  send:(id,key,text)=>r.post(actor(id),{id:key,text,targetPatientUid:uid}),
  control:(id,op)=>r.shiftControl(actor(id),{op,requestId:crypto.randomUUID(),turnId:r.view(actor(id)).clinical.shift.turn.id}),
  async hint(){
   const binding=r.view(actor(1)).clinical.hintBinding;
   const offer=await r.hint(actor(1),{...binding,op:'prepare',verify:true,requestId:crypto.randomUUID()});
   assert.equal(offer.status,'verified');
   return r.hint(actor(1),{...binding,op:'displayed',offerId:offer.offerId,requestId:crypto.randomUUID()});
  },async snapshot(){return {schemaVersion:1,roomId,epoch:1,lease:null,runtime:await r.checkpoint()};},
  async restore(){const checkpoint=await r.checkpoint();r.dispose();r=await createGuardRuntime({content,roomId,checkpoint,nowMs:20000});},
  dispose(){r.dispose();}};
}
async function save(db,f,state){
 await db.query(`insert into public.atria_clinical_guards(room_id,state) values($1,$2)
  on conflict(room_id) do update set state=excluded.state,updated_at=now()`,[f.roomId,JSON.stringify(state||await f.snapshot())]);
}
async function award(db,id,room){
 await db.exec('set role service_role');
 try{return (await db.query('select public.atria_v5_award_verified($1,$2) result',[actor(id),room])).rows[0].result;}
 finally{await db.exec('reset role');}
}
async function balance(db,id){
 const r=(await db.query('select xp,xp_debt,cases_resolved from public.atria_v5_accounts where actor_id=$1',[actor(id)])).rows[0];
 return Object.fromEntries(Object.entries(r).map(([k,v])=>[k,Number(v)]));
}

test('actual cooperative checkpoint shares hint/debt, excludes absence, survives restore and settles once from later XP',async()=>{
 const db=await database(),f=await fixture();
 try{
  assert.equal(f.control(3,'leave').status,'accepted');await f.hint();
  await f.send(1,'bad-alta','/disposicion alta');await f.send(1,'bad-observation','/disposicion observacion');
  await save(db,f);
  for(const i of [1,2,3]){await award(db,i,f.roomId);await award(db,i,f.roomId);}
  for(const i of [1,2])assert.deepEqual(await balance(db,i),{xp:0,xp_debt:30,cases_resolved:0});
  assert.deepEqual(await balance(db,3),{xp:0,xp_debt:0,cases_resolved:0});
  await f.restore();assert.equal(f.control(3,'resume').status,'accepted');
  await f.send(1,'dx','/diagnostico cirrosis descompensada');await f.send(1,'close','/cierre-parcial observacion');
  const gross=f.r.view(actor(1)).clinical.caseReward.xp;
  assert(gross>30);await save(db,f);
  for(const i of [1,2,3]){await award(db,i,f.roomId);await award(db,i,f.roomId);}
  for(const i of [1,2])assert.deepEqual(await balance(db,i),{xp:gross-30,xp_debt:0,cases_resolved:1});
  assert.equal((await balance(db,3)).xp,f.r.view(actor(3)).clinical.caseReward.xp);
  assert((await balance(db,3)).xp>gross,'returning colleague has no retrospective hint charge');
  const receipts=(await db.query('select kind,count(*)::int n from public.atria_v5_progress_receipts group by kind')).rows;
  assert.deepEqual(Object.fromEntries(receipts.map(r=>[r.kind,r.n])),{'clinical.unsafe-discharge':2,'clinical.unsafe-observation':2,'clinical.closure':3});
 }finally{f.dispose();await db.close();}
});

for(const mode of ['solo','apprentice','competitive'])test(mode+': the same native unsafe decisions persist debt without charging a rival',async()=>{
 const db=await database(),f=await fixture(mode);
 try{
  await f.send(1,'unsafe','/disposicion alta');await save(db,f);
  await award(db,1,f.roomId);await award(db,1,f.roomId);
  assert.deepEqual(await balance(db,1),{xp:0,xp_debt:15,cases_resolved:0});
  if(mode==='competitive'){
   await award(db,2,f.roomId);
   assert.deepEqual(await balance(db,2),{xp:0,xp_debt:0,cases_resolved:0});
  }
 }finally{f.dispose();await db.close();}
});

test('a forged or foreign native proof cannot create account debt',async()=>{
 const db=await database(),f=await fixture();
 try{
  await f.send(1,'bad','/disposicion alta');const state=await f.snapshot();
  state.runtime.session.port.receipts=[];await save(db,f,state);
  await award(db,1,f.roomId);await award(db,2,f.roomId);
  assert.deepEqual(await balance(db,1),{xp:0,xp_debt:0,cases_resolved:0});
  assert.deepEqual(await balance(db,2),{xp:0,xp_debt:0,cases_resolved:0});
 }finally{f.dispose();await db.close();}
});

test('two different authors share two distinct unsafe events; retries cannot collapse or double their costs',async()=>{
 const db=await database(),f=await fixture();
 try{
  await f.send(1,'bad-a','/disposicion alta');await f.send(2,'bad-b','/disposicion alta');
  await save(db,f);
  for(const i of [1,2,3]){
   await award(db,i,f.roomId);await award(db,i,f.roomId);
   assert.equal((await balance(db,i)).xp_debt,30);
   assert.equal(f.r.view(actor(i)).clinical.progress.xpDebt,30);
  }
 }finally{f.dispose();await db.close();}
});

for(const authorActive of [true,false])test('native causal death shares a bounded debit only with the active cohort; author active='+authorActive,async()=>{
 const db=await database(),roomId='local-causal-'+authorActive,uid='attributable-death-freedom';
 const members=[1,2,3].map(i=>({id:actor(i),name:'Doctor '+i}));
 const progress=createProgressionLedger();
 progress.award({kind:'clinical.closure',patientUid:'previous',eventId:'previous',actorId:actor(1),xp:30,closed:true});
 const s=createGuardSession({roomId,mode:'coop',actorId:actor(1),actorName:'Doctor 1',members,content,
  patient:{uid,caseId:'CIRR-001'},progress,authenticate:id=>({id,roomId}),resolveContext:()=>({patientUid:uid}),
  activeParticipants:()=>[...(authorActive?[actor(1)]:[]),actor(2)]});
 try{
  await db.query('update public.atria_v5_accounts set xp=30');
  await s.post({id:'iv',text:'Enfermera una vía'},actor(1));
  await s.post({id:'harm',text:'Enfermera Ringer 10 l'},actor(1));
  s.advance(720);await s.flush();s.advance(20);await s.flush();
  assert.equal(s.read().patient.deathAttribution.classification,'treatment-contributed');
  const checkpoint=await s.checkpoint();
  assert.equal(checkpoint.progress.penalties.filter(p=>p.kind==='clinical.death').length,1);
  const f={roomId};
  await save(db,f,{schemaVersion:1,roomId,epoch:1,runtime:{mode:'coop',members,session:checkpoint,claims:[]}});
  for(const i of [1,2,3]){await award(db,i,roomId);await award(db,i,roomId);}
  assert.equal((await balance(db,1)).xp,authorActive?15:30);
  assert.equal((await balance(db,2)).xp,15);
  assert.equal((await balance(db,3)).xp,30);
  assert.equal((await balance(db,2)).xp_debt,0,'retain the historical bounded-death rule');
 }finally{s.dispose();await db.close();}
});

test('migration retains invoker authority and no public account/RPC privileges',async()=>{
 const db=await database();
 try{
  const r=(await db.query(`select prosecdef,has_function_privilege('anon','public.atria_v5_award_verified(text,text)','execute') anon,
   has_function_privilege('authenticated','public.atria_v5_award_verified(text,text)','execute') authenticated
   from pg_proc where oid='public.atria_v5_award_verified(text,text)'::regprocedure`)).rows[0];
  assert.deepEqual(r,{prosecdef:false,anon:false,authenticated:false});
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from public.atria_v5_accounts'),/permission denied/);
  await db.exec('reset role');
 }finally{await db.close();}
});
