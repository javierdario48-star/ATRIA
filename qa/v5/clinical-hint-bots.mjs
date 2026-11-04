import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {clinicalContent as content} from '../../src/v5/server/content.js';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {clinicalHintCoverage} from '../../src/v5/clinical/clinical-hints.js';

const output=process.env.V5_HINT_OUTPUT||'qa/v5-hint-results';
await mkdir(output,{recursive:true});
const census=clinicalHintCoverage(content);assert.deepEqual(census.errors,[]);assert.equal(census.cases.length,55);
const ids=process.env.V5_HINT_CASES?.split(',')||content.cases.map(c=>c.id);
const results=[];
for(const caseId of ids){
 const c=content.cases.find(c=>c.id===caseId);
 const session=createGuardSession({roomId:'hint-bot-'+caseId,mode:'solo',actorId:'hint-bot',actorName:'QA',patient:{uid:'patient',caseId},content,
  resolveContext:()=>({patientUid:'patient'})});
 const steps=[],failures=[];
 try{
  for(let n=0;n<720&&!session.read().patient.caseEnded;n++){
   const before=structuredClone(session.read().patient),h=session.clinicalHint();
   assert.deepEqual(session.read().patient,before,'hint must never execute an intervention');
   if(!h?.action){failures.push({reason:h?.error||'empty-hint'});break;}
   const a=h.action;steps.push({kind:a.kind,id:a.id,key:h.key,chargeable:h.chargeable});
   if(a.kind==='wait'){assert.equal(h.chargeable,false);session.advance(2);await session.flush();continue;}
   // The bot chooses a diagnosis itself. The hint never supplies one.
   const commands=a.kind==='examination'?a.commands:
    a.kind==='diagnosis'?['/diagnostico '+c.dx[0]]:[a.command];
   for(const text of commands){
    const r=await session.post({id:crypto.randomUUID(),text});
    const rejected=r.clinical?.filter(x=>x.status==='rejected')||[];
    if(r.status==='rejected'||r.routeError||rejected.length){failures.push({text,reason:r.reason||r.routeError||rejected.map(x=>x.reason)});break;}
   }
   if(failures.length)break;
   session.advance(.25);await session.flush();
  }
  const state=session.read(),row={caseId,closed:state.patient.caseEnded===true,died:state.patient.patientDied===true,
   destination:state.patient.closure?.destination,score:state.patient.closure?.quality?.score,
   xp:state.patient.closure?.xp,steps,failures,missing:state.closure?.missing};
  row.passed=row.closed&&!row.died&&!row.failures.length;results.push(row);
  console.log(JSON.stringify({caseId,passed:row.passed,steps:steps.length,tail:steps.slice(-5),failures,missing:row.closed?undefined:row.missing}));
 }finally{session.dispose();}
}
const report={casesChecked:55,census,representativeBots:results.length,passed:results.filter(x=>x.passed).length,results};
await writeFile(output+'/clinical-hints.json',JSON.stringify(report,null,2)+'\n');
assert.equal(report.passed,results.length,'hint-guided clinical trajectories must all close without impossible actions');
