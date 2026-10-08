import {csMergeSpeech} from './transcript-normalizer.js';

// Web Speech indexes are revisable hypotheses. The latest final for the index wins
// until that index is committed to the chat.
export function csVoiceStageRevisions(pending,delivered,event){
 const results=event?.results||[];
 let hasInterim=false;
 for(let i=0;i<results.length;i++){
  if(delivered.has(i))continue;
  const result=results[i],raw=String(result?.[0]?.transcript||'').trim();
  if(!result?.isFinal){pending.delete(i);if(raw)hasInterim=true;continue;}
  if(raw)pending.set(i,raw);else pending.delete(i);
 }
 for(const index of pending.keys())if(index>=results.length)pending.delete(index);
 const text=[...pending.entries()].sort((a,b)=>a[0]-b[0]).reduce((acc,[,v])=>csMergeSpeech(acc,v),'');
 return {text,hasInterim,finalCount:pending.size};
}
export function csVoiceCommitRevisions(pending,delivered){
 const indexes=[...pending.keys()].sort((a,b)=>a-b);
 const text=indexes.reduce((acc,i)=>csMergeSpeech(acc,pending.get(i)),'');
 for(const i of indexes)delivered.add(i);
 pending.clear();
 return text;
}
