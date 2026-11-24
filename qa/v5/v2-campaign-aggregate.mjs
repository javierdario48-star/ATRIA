import {readdir,readFile,writeFile} from 'node:fs/promises';
const root='campaign-artifacts',expected=Number(process.env.CAMPAIGN_EXPECTED||10000),rows=[],shards=[];
for(const name of await readdir(root).catch(()=>[])){
 const dir=root+'/'+name;
 for(const file of await readdir(dir).catch(()=>[])){
  if(file==='summary.json')shards.push(JSON.parse(await readFile(dir+'/'+file,'utf8')));
  if(file==='rows.jsonl')for(const line of (await readFile(dir+'/'+file,'utf8')).trim().split('\n').filter(Boolean))rows.push(JSON.parse(line));
 }
}
const unique=new Set(rows.map(x=>x.index)),byCase={},counts={pass:0,review:0,integrity:0,gap:0},outcomes={};
for(const r of rows){
 counts[r.status]++;const key=r.caseId+'/'+r.mode+'/'+r.profile;
 const s=byCase[key]??={pass:0,review:0,integrity:0,gap:0};s[r.status]++;
 outcomes[r.outcome??'missing']=(outcomes[r.outcome??'missing']||0)+1;
}
const missing=Array.from({length:expected},(_,i)=>i).filter(i=>!unique.has(i));
const report={sourceSha:process.env.GITHUB_SHA||null,expected,executed:rows.length,unique:unique.size,
 duplicateCount:rows.length-unique.size,missing,counts,outcomes,byCase,
 shards:shards.map(s=>({start:s.start,count:s.count,executed:s.executed,counts:s.counts})),
 findings:rows.filter(r=>r.status!=='pass').map(({index,seed,caseId,mode,profile,status,integrity,review,gap})=>({index,seed,caseId,mode,profile,status,integrity,review,gap}))};
report.complete=missing.length===0&&rows.length===expected&&unique.size===expected;
report.passed=report.complete&&counts.integrity===0&&counts.review===0;
await writeFile('campaign-report.json',JSON.stringify(report,null,2)+'\n');
console.log('ATRIA_CAMPAIGN_AGGREGATE '+JSON.stringify({expected,executed:rows.length,unique:unique.size,counts,outcomes,complete:report.complete,passed:report.passed}));
if(!report.passed)process.exitCode=1;
