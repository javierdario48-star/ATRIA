import {csMergeSpeech} from './transcript-normalizer.js';

// Web Speech indexes are revisable hypotheses. The latest final for the index wins
// until that index is committed to the chat.
// Only select an ASR-provided alternative when it has comparable confidence
// AND differs solely by a repeated adjacent word. Never hallucinate missing audio.
export function csVoiceChooseConfirmed(result){
 const first=String(result?.[0]?.transcript||'').trim();
 const confidence=Number(result?.[0]?.confidence);
 if(!first||!Number.isFinite(confidence)||confidence<=0)return first;
 const words=first.split(/\s+/);
 const normalize=w=>String(w||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const alternatives=Number.isInteger(result?.length)?result.length:1;
 for(let j=1;j<Math.min(alternatives,5);j++){
  const alternative=String(result[j]?.transcript||'').trim();
  const altConfidence=Number(result[j]?.confidence);
  if(!alternative||!Number.isFinite(altConfidence)||altConfidence<=0||altConfidence+0.12<confidence)continue;
  const shorter=alternative.split(/\s+/);
  if(shorter.length!==words.length-1)continue;
  for(let i=1;i<words.length;i++){
   if(normalize(words[i])!==normalize(words[i-1]))continue;
   const candidate=words.filter((_,k)=>k!==i);
   if(candidate.every((w,k)=>normalize(w)===normalize(shorter[k])))return alternative;
  }
 }
 return first;
}
export function csVoiceStageRevisions(pending,delivered,event,chooseFinal){
 const results=event?.results||[];
 let hasInterim=false;
 for(let i=0;i<results.length;i++){
  if(delivered.has(i))continue;
  const result=results[i],raw=String(result?.isFinal&&chooseFinal?chooseFinal(result):result?.[0]?.transcript||'').trim();
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
