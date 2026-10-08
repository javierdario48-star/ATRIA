export function csVoiceWord(word){
 return String(word||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ]/g,'');
}
export function csVoiceCleanSpeech(value){
 const original=String(value||'').trim();if(!original)return '';
 let words=original.split(/\s+/).filter(Boolean),echoFound=false;
 // Android Web Speech can concatenate multiple versions of a finalized phrase.
 for(let pass=0;pass<40;pass++){
  let changed=false;
  outer:for(let i=0;i<words.length-2;i++){
   for(let n=Math.min(10,Math.floor((words.length-i)/2));n>=2;n--){
    const same=words.slice(i,i+n).every((w,j)=>csVoiceWord(w)===csVoiceWord(words[i+n+j]));
    if(!same)continue;
    let end=i+2*n;
    while(end+n<=words.length&&words.slice(i,i+n).every((w,j)=>csVoiceWord(w)===csVoiceWord(words[end+j])))end+=n;
    words.splice(i+n,end-i-n);echoFound=true;changed=true;break outer;
   }
  }
  if(!changed)break;
 }
 // Consecutive partial hypotheses can also be concatenated inside ONE final result.
 // "Hola | Hola qué | Hola qué te | Hola qué te pasó" -> "Hola qué te pasó".
 const key=csVoiceWord(words[0]),starts=[];
 for(let i=0;i<words.length;i++)if(csVoiceWord(words[i])===key)starts.push(i);
 if(starts.length>=3){
  const chunks=starts.map((pos,j)=>words.slice(pos,j+1<starts.length?starts[j+1]:words.length));
  const last=chunks.at(-1);
  if(last.length>=3&&chunks.slice(0,-1).every((chunk,j)=>chunk.length<=last.length&&chunk.every((w,k)=>csVoiceWord(w)===csVoiceWord(last[k]))&&(j===0||chunk.length>=chunks[j-1].length))){
   words=last;echoFound=true;
  }
 }
 // Preserve ordinary double repetitions ("hola hola", "no no") absent an echo loop.
 for(let i=0;i<words.length;){
  let j=i+1;while(j<words.length&&csVoiceWord(words[j])===csVoiceWord(words[i]))j++;
  const keep=echoFound?1:2;
  if(j-i>keep){words.splice(i+keep,j-i-keep);i+=keep;}else i=j;
 }
 return words.join(' ');
}
export function csMergeSpeech(previous,incoming){
 const left=csVoiceCleanSpeech(previous),right=csVoiceCleanSpeech(incoming);
 if(!left)return right;if(!right)return left;
 const lt=left.split(/\s+/),rt=right.split(/\s+/),l=lt.map(csVoiceWord),r=rt.map(csVoiceWord);
 if(r.length>=l.length&&l.every((t,i)=>t===r[i]))return right;
 if(l.length>=r.length&&r.every((t,i)=>t===l[i]))return left;
 for(let k=Math.min(l.length,r.length);k>0;k--)if(l.slice(-k).every((t,i)=>t===r[i]))
  return csVoiceCleanSpeech([left,...rt.slice(k)].join(' '));
 return csVoiceCleanSpeech(left+' '+right);
}
export function csVoiceNovelText(previous,incoming){
 const a=csVoiceCleanSpeech(previous),b=csVoiceCleanSpeech(incoming);
 if(!a)return b;if(!b)return '';
 const at=a.split(/\s+/),bt=b.split(/\s+/),ak=at.map(csVoiceWord),bk=bt.map(csVoiceWord);
 if(ak.join(' ')===bk.join(' '))return '';
 // Reissued cumulative hypotheses after a prior flush must not repeat messages.
 if(bk.length>=ak.length&&ak.every((w,i)=>w===bk[i])){
  const suffix=bt.slice(ak.length);return suffix.length>=3?suffix.join(' '):'';
 }
 if(ak.length>=bk.length&&bk.every((w,i)=>w===ak[i]))return '';
 if(bk.length>=2){
  for(let k=Math.min(ak.length,bk.length);k>=2;k--)if(ak.slice(-k).every((w,i)=>w===bk[i])){
   const suffix=bt.slice(k);return suffix.length>=3?suffix.join(' '):'';
  }
 }
 return b;
}
