import {monitorAcuity} from './monitor-acuity.js';
// ATRIA V5 hospital soundscape: V4.13 melody, notification motifs and
// HR-dependent bedside monitor, all driven by the ONE application RAF.
// No media asset, clinical state writer, extra timer, or animation loop.
const DEFAULTS=Object.freeze({enabled:true,volume:.62,channels:{
 music:true,monitor:true,speech:true,effects:true,ambient:true},track:'guardia'});
const CHORDS=Object.freeze([[52,55,59,66],[48,52,55,59],[50,57,60,64],[47,54,57,62]]);
const MELODY=Object.freeze([[71,null,null,66,67,null,64,null],
 [67,null,71,null,66,null,null,64],[69,null,null,72,71,null,67,null],
 [66,null,62,null,64,null,66,null]]);
const MIDI=n=>440*Math.pow(2,(n-69)/12);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function monitorBeatIntervalMs(hr){
 return Number.isFinite(hr)&&hr>0?60000/clamp(hr,20,240):null;
}
export function audibleMonitorVitals(patient){
 const vitals=patient?.lastVitalsKnown?.vitals;
 if(!patient?.procedures?.monitor?.connected||patient.caseEnded||patient.patientDied||
  !Number.isFinite(vitals?.hr)||vitals.hr<=0)return null;
 return vitals;
}
export function createHospitalAudio({window,storage}){
 let data;try{data=JSON.parse(storage?.getItem('atria.v5.audio.v1')||'null');}catch{}
 const prefs={enabled:data?.enabled!==false,volume:clamp(Number(data?.volume??DEFAULTS.volume)||0,0,1),
  channels:{...DEFAULTS.channels,...(data?.channels||{})},track:data?.track==='enfoque'?'enfoque':'guardia'};
 let context=null,master=null,lastTick=-Infinity,nextBeat=0,monitorId=null,lastHR=null,alarm='none',
  lastAlarm=-Infinity,musicStep=0,nextMusic=0,musicTrack=null,nextFoley=0,noise=null,
  lastUiCue=-Infinity;
 const active=new Set(),counters={music:0,monitor:0,alarm:0,speech:0,effects:0,ambient:0};
 function save(){try{storage?.setItem('atria.v5.audio.v1',JSON.stringify(prefs));}catch{}}
 const playing=()=>prefs.enabled&&prefs.volume>0&&!window.document?.hidden&&context?.state==='running';
 const channel=name=>playing()&&prefs.channels[name];
 function cleanup(item){
  active.delete(item);try{item.osc.disconnect();item.gain?.disconnect();item.filter?.disconnect();}catch{}
 }
 function stop(group){
  for(const item of [...active])if(!group||item.group===group){
   try{item.osc.stop();}catch{}cleanup(item);
  }
  if(!group||group==='music'){musicStep=0;nextMusic=0;musicTrack=null;}
  if(!group||group==='monitor'){nextBeat=0;monitorId=null;lastHR=null;alarm='none';lastAlarm=-Infinity;}
 }
 function unlock(){
  if(!prefs.enabled||prefs.volume===0||window.document?.hidden)return false;
  const Constructor=window.AudioContext||window.webkitAudioContext;
  if(!Constructor)return false;
  try{
   if(!context||context.state==='closed'){
    context=new Constructor();master=context.createGain();master.gain.value=prefs.volume*.68;
    master.connect(context.destination);
   }
   if(context.state==='suspended'||context.state==='interrupted')
    context.resume()?.catch?.(()=>{});
   master.gain.value=prefs.volume*.68;
   return true;
  }catch{return false;}
 }
 function tone(hz,{group='effects',duration=.12,offset=0,peak=.11,type='sine',kind='tone'}={}){
  if(!channel(group))return false;
  const t=context.currentTime+offset,osc=context.createOscillator(),gain=context.createGain();
  osc.type=type;osc.frequency.value=hz;
  gain.gain.setValueAtTime(.0001,t);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.04,duration));
  osc.connect(gain).connect(master);
  const item={osc,gain,group,kind};active.add(item);osc.onended=()=>cleanup(item);
  osc.start(t);osc.stop(t+duration+.02);return true;
 }
 function cue(kind){
  // Short, original notification motifs. User can mute effects in Ajustes.
  const quiet={uiTap:[[590,0,.046],[790,.045,.022]],
   uiChange:[[730,0,.042],[950,.06,.023]],
   uiBack:[[630,0,.03],[470,.055,.023]],
   uiInvite:[[480,0,.043],[620,.08,.036],[810,.16,.027]],
   uiAccept:[[520,0,.045],[740,.09,.036],[990,.17,.027]]};
  if(quiet[kind]){
   const now=context?.currentTime??0;
   if(now-lastUiCue<.085)return;
   lastUiCue=now;
   for(const [hz,offset,peak] of quiet[kind])
    tone(hz,{group:'effects',offset,duration:.095,peak});
   if(channel('effects'))counters.effects++;
   return;
  }
  const sounds={ok:[620,820],level:[660,880,1100],death:[220,175],
   monitorOpen:[500,740],monitorActivate:[520,880],studyOrder:[390,520,650],
   studyReady:[740,960],iv:[420,600],connect:[520,720]};
  (sounds[kind]||sounds.ok).forEach((hz,i)=>
   tone(hz,{group:'effects',offset:.075*i,duration:.11,peak:.08}));
  if(channel('effects'))counters.effects++;
 }
 function speech(role){
  if(role==='patient'){
   // Distinctive low-volume two-note text alert, not a commercial ringtone.
   tone(970,{group:'speech',duration:.09,peak:.042});
   tone(1290,{group:'speech',offset:.11,duration:.10,peak:.036});
  }else if(role==='nurse'){
   // Important but soft; second passage is a diminishing synthetic echo.
   for(const [hz,offset,peak] of [[510,0,.05],[680,.095,.043],[850,.18,.036],
    [510,.28,.012],[680,.365,.009],[850,.45,.006]])
    tone(hz,{group:'speech',offset,duration:.11,peak});
  }else if(role==='mentor'){
   tone(490,{group:'speech',duration:.09,peak:.029});
   tone(610,{group:'speech',offset:.085,duration:.09,peak:.027});
  }else return;
  if(channel('speech'))counters.speech++;
 }
 function musicTick(){
  if(!channel('music')){if(musicTrack!==null)stop('music');return;}
  const track=prefs.track,bpm=track==='enfoque'?78:72,seconds=30/bpm;
  if(musicTrack!==track){stop('music');musicTrack=track;nextMusic=context.currentTime+.06;}
  if(nextMusic<context.currentTime-.25)nextMusic=context.currentTime+.04;
  let count=0;
  while(nextMusic<context.currentTime+.22&&count++<3){
   const step=musicStep%8,bar=Math.floor(musicStep/8),phrase=bar%4;
   const offset=Math.max(0,nextMusic-context.currentTime),chord=CHORDS[phrase];
   if(step===0){
    for(const n of chord.slice(1))tone(MIDI(n),{group:'music',offset,duration:seconds*7.8,peak:.013});
    tone(MIDI(chord[0]-12),{group:'music',offset,duration:seconds*3.8,peak:.024});
   }
   let note=MELODY[phrase][step];
   if(note!==null){
    if(Math.floor(bar/4)%2&&step>=5)note+=(phrase===3?-2:2);
    tone(MIDI(note),{group:'music',offset,duration:seconds*1.35,
     peak:track==='guardia'?.052:.04,type:'triangle'});counters.music++;
   }
   if(step===0||step===4)tone(MIDI(chord[0]-12),{group:'music',offset,duration:.2,peak:.025});
   if(step===3||step===6)tone(MIDI(chord[0]-5),{group:'music',offset,duration:seconds*.55,peak:.018,type:'triangle'});
   musicStep++;nextMusic+=seconds;
  }
 }
 function monitorTick(patient){
  const v=channel('monitor')?audibleMonitorVitals(patient):null;
  if(!v){if(monitorId!==null)stop('monitor');return;}
  const id=patient.uid||patient.caseId||'patient',now=context.currentTime,hr=v.hr;
  if(id!==monitorId){stop('monitor');monitorId=id;nextBeat=now+.03;}
  if(lastHR!==null&&Math.abs(hr-lastHR)>5){
   for(const n of [...active])if(n.group==='monitor'&&n.kind==='beat'){
    try{n.osc.stop();}catch{}cleanup(n);
   }
   nextBeat=now+.03;
  }
  if(nextBeat<now-.08)nextBeat=now+.025;
  const interval=monitorBeatIntervalMs(hr)/1000;
  let count=0;
  while(nextBeat<now+.18&&count++<3){
   if(tone(880,{group:'monitor',offset:Math.max(0,nextBeat-now),duration:.055,peak:.055,kind:'beat'}))
    counters.monitor++;
   nextBeat+=interval;
  }
  lastHR=hr;
  // Visual severity and audible alarm use the same original V4-derived
  // thresholds. This derives sound only, never modifies patient physiology.
  const visual=monitorAcuity(patient,{rhythm:patient.ecg?.rhythm}).state;
  const severity=visual==='critical'?'high':['warning','urgent'].includes(visual)?'medium':'none';
  if(severity!==alarm){alarm=severity;lastAlarm=-Infinity;}
  if(severity!=='none'&&now-lastAlarm>=(severity==='high'?3.6:7)){
   (severity==='high'?[0,.18,.36,.72,.9]:[0,.24,.48]).forEach((offset,i)=>
    tone(severity==='high'?(i<3?660:780):530,{group:'monitor',kind:'alarm',offset,duration:.11,peak:.055}));
   lastAlarm=now;counters.alarm++;
  }
 }
 function ambientTick(now){
  if(!channel('ambient'))return;
  if(!nextFoley)nextFoley=now+18000;
  if(now<nextFoley)return;
  // Hospital room tone: very soft distant low notes, not an extra looping source.
  tone(175,{group:'ambient',duration:.9,peak:.006});
  tone(238,{group:'ambient',duration:.6,offset:.18,peak:.004});
  counters.ambient++;nextFoley=now+20000+Math.random()*8000;
 }
 function tick(now,{phase,patient}={}){
  if(now-lastTick<95)return;
  lastTick=now;
  if(!playing()||!['lobby','guard'].includes(phase)){stop();return;}
  musicTick();ambientTick(now);
  if(phase==='guard')monitorTick(patient);else if(monitorId!==null)stop('monitor');
 }
 function setVolume(value){prefs.volume=clamp(Number(value)||0,0,1);save();
  if(master)master.gain.value=prefs.volume*.68;
  if(!prefs.volume)stop();}
 function setEnabled(value){prefs.enabled=!!value;save();if(!prefs.enabled)stop();}
 function setChannel(key,value){if(!Object.hasOwn(prefs.channels,key))return;
  prefs.channels[key]=!!value;save();if(!value)stop(key);}
 function setTrack(value){prefs.track=value==='enfoque'?'enfoque':'guardia';save();stop('music');}
 const state=()=>({...prefs,channels:{...prefs.channels},contextState:context?.state||'uninitialized',
  counters:{...counters},activeNodes:active.size,monitorHR:lastHR});
 return Object.freeze({unlock,tick,cue,speech,setVolume,setEnabled,setChannel,setTrack,
  state,pause:()=>stop(),destroy(){stop();context?.close?.()?.catch?.(()=>{});context=null;master=null;}});
}
