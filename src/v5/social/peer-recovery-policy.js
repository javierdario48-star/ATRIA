// Only the existing authenticated room poll asks for a reconnect.
// All thresholds are elapsed durations of the CURRENT state, not the age
// of a connection or a succession of timeout patches.
const FAILED=new Set(['closed','failed','disconnected']);
const STALLED=new Set(['connecting','new']);
export function createPeerRecoveryPolicy({failureMs=6000,stalledMs=15000,
 initialBackoffMs=2000,maxBackoffMs=60000}={}){
 if(!(failureMs>0&&stalledMs>0&&initialBackoffMs>0&&maxBackoffMs>=initialBackoffMs))
  throw Error('invalid peer recovery policy');
 const entries=new Map();
 function shouldRestart(id,state,now){
  if(!id||!Number.isFinite(now))return false;
  let entry=entries.get(id);
  if(!entry){entry={state,since:now,attempts:0,retryAt:now};entries.set(id,entry);}
  if(state==='open'){
   entries.set(id,{state,since:now,attempts:0,retryAt:now});return false;
  }
  if(entry.state!==state){
   entry.state=state;entry.since=now;
  }
  const delay=FAILED.has(state)?failureMs:STALLED.has(state)?stalledMs:Infinity;
  if(now-entry.since<delay||now<entry.retryAt)return false;
  entry.attempts++;
  entry.retryAt=now+Math.min(maxBackoffMs,initialBackoffMs*2**Math.min(entry.attempts-1,16));
  entry.state=state;entry.since=now;
  return true;
 }
 return Object.freeze({
  shouldRestart,forget:id=>entries.delete(id),reset:()=>entries.clear(),
  snapshot:id=>{const s=entries.get(id);return s?{...s}:null;}
 });
}
