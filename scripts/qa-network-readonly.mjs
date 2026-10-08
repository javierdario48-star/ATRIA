// Read-only probe. No registrations, presence writes, or production mutation.
const raw=process.env.QA_BASE||'',base=raw.endsWith('/')?raw.slice(0,-1):raw;
if(!base.startsWith('https://'))throw Error('HTTPS QA_BASE required');
async function get(path){
 const res=await fetch(base+path,{headers:{Accept:'application/json'},redirect:'follow',signal:AbortSignal.timeout(12000)});
 const body=await res.text();let json=null;try{json=JSON.parse(body)}catch{}
 return {status:res.status,contentType:res.headers.get('content-type'),json,preview:body.slice(0,90).replace(/\s+/g,' ')};
}
let h;
for(let attempt=0;attempt<3;attempt++){
 try{h=await get('/api/health');if(h.status===200)break}catch(e){h={error:String(e)}}
 if(attempt<2)await new Promise(r=>setTimeout(r,5000));
}
console.log('READONLY /api/health:',JSON.stringify(h));
if(h.status!==200||!(h.json?.version||h.json?.protocol))throw Error('No compatible social health response from QA preview');
let rtc;
try{rtc=await get('/api/lobby-sync?roster=1')}catch(e){rtc={error:String(e)}}
console.log('READONLY RTC:',JSON.stringify(rtc));
if(rtc.status===200&&!Array.isArray(rtc.json?.players))throw Error('RTC endpoint 200 without players array');
console.log('Read-only backend reachability passed; this is not multiplayer browser E2E.');
