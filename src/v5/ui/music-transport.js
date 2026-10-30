const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const CROSSFADE=2.5,MUTE_FADE=.25,THEME_TRIM=.22,MUSIC_GAIN=1.4;

/** Gain automation and a single looping source; never owns a clock or context. */
export function createMusicTransport({context,destination,loadBuffer,initialLevel=1}){
 const level=context.createGain(),classic=context.createGain(),theme=context.createGain(),trim=context.createGain(),output=context.createGain();
 // +2.92 dB on music only. Keep the relative composition trim and clinical
 // master unchanged; user volume, mute and crossfades remain upstream.
 output.gain.value=MUSIC_GAIN;
 classic.connect(level);theme.connect(trim).connect(level);level.connect(output).connect(destination);
 trim.gain.value=THEME_TRIM;
 let destroyed=false,paused=false,requested=null,track=null,buffer=null,loading=null,status='unloaded',error=null,
  source=null,startedAt=0,offset=0,starts=0;
 const now=()=>context.currentTime;
 const envelope=(node,value)=>({node,from:value,to:value,start:now(),end:now()});
 const mix={new:envelope(theme,0),classic:envelope(classic,0)},volume=envelope(level,clamp(initialLevel));
 theme.gain.value=0;classic.gain.value=0;level.gain.value=clamp(initialLevel);
 function value(e){
  if(e.end<=e.start||now()>=e.end)return e.to;
  return e.from+(e.to-e.from)*Math.max(0,(now()-e.start)/(e.end-e.start));
 }
 function ramp(e,to,duration){
  const from=value(e),t=now(),param=e.node.gain;
  param.cancelScheduledValues?.(t);param.setValueAtTime(from,t);
  if(duration>0&&param.linearRampToValueAtTime)param.linearRampToValueAtTime(to,t+duration);
  else param.setValueAtTime(to,t);
  Object.assign(e,{from,to,start:t,end:t+duration});
 }
 function position(){return buffer?(offset+(source?now()-startedAt:0))%buffer.duration:offset;}
 function release(){
  if(!source)return;
  offset=position();const old=source;source=null;
  old.onended=null;try{old.stop();}catch{}try{old.disconnect();}catch{}
 }
 function ensureSource(){
  if(destroyed||paused||status==='error'||source||!buffer||!(volume.to>0||value(volume)>0)||
   !(mix.new.to>0||value(mix.new)>0))return;
  let next;
  try{
   next=context.createBufferSource();next.buffer=buffer;next.loop=true;
   next.loopStart=0;next.loopEnd=buffer.duration;next.connect(theme);
   next.start(0,offset%buffer.duration);source=next;startedAt=now();starts++;
  }catch(e){try{next?.disconnect();}catch{}status='error';error=e.message;transition('classic');}
 }
 function transition(next,duration=track?CROSSFADE:.35){
  if(destroyed||next===track){ensureSource();return;}
  track=next;
  ramp(mix.new,next==='new'?1:0,duration);ramp(mix.classic,next==='classic'?1:0,duration);
  ensureSource();
 }
 function select(next){
  if(destroyed)return;
  requested=next==='new'?'new':'classic';
  if(requested==='classic'||status==='error'){transition('classic');return;}
  if(buffer){transition('new');return;}
  if(loading)return;
  status='loading';
  try{loading=Promise.resolve(loadBuffer('theme'));}catch(e){loading=Promise.reject(e);}
  loading.then(result=>{
   loading=null;if(destroyed)return;buffer=result;status='ready';
   if(requested==='new')transition('new');
  },e=>{
   loading=null;if(destroyed)return;status='error';error=e.message;
   if(requested==='new')transition('classic');
  });
 }
 function tick(){
  if(destroyed||paused)return;
  if((value(mix.new)===0&&mix.new.to===0)||(value(volume)===0&&volume.to===0))release();
  else ensureSource();
 }
 return Object.freeze({classicOutput:classic,
  select,tick,
  setLevel(amount,enabled=true){if(destroyed)return;ramp(volume,enabled?clamp(amount):0,MUTE_FADE);ensureSource();},
  classicAudible:()=>!destroyed&&!paused&&(value(volume)>0||volume.to>0)&&
   (value(mix.classic)>0||mix.classic.to>0),
  pause(){if(destroyed||paused)return;paused=true;release();},
  resume(){if(destroyed)return;paused=false;ensureSource();},
  state:()=>({requested,track,status,error,paused,level:value(volume),targetLevel:volume.to,
   mix:{new:value(mix.new),classic:value(mix.classic)},position:position(),
   duration:buffer?.duration||null,starts,sourceCount:source?1:0,
   transitionRemaining:Math.max(0,mix.new.end-now(),mix.classic.end-now())}),
  destroy(){if(destroyed)return;destroyed=true;release();buffer=null;loading=null;
   for(const node of [classic,theme,trim,level,output])try{node.disconnect();}catch{}}
 });
}
