// Render the production graph with real Web Audio. Digital levels only;
// this does not measure Android or iPhone loudspeaker output.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const output=process.env.V5_QA_OUTPUT||'qa/v5-audio-level-results';await fs.mkdir(output,{recursive:true});
const h=await browserHarness(),results=[];
try{
 const p=await h.browser.newPage();await p.goto(h.url);
 for(const track of ['new','classic'])for(const scenario of ['default','maximum','maximum-with-clinical','clinical-only']){
  const result=await p.evaluate(async({track,scenario})=>{
   const {createHospitalAudio}=await import('/src/v5/ui/hospital-audio.js');
   const ctx=new OfflineAudioContext(2,20*48000,48000);
   // The production scheduler reads the audio clock while the offline renderer
   // is suspended at a checkpoint. All sources, gains and samples remain real.
   const clock=new Proxy(ctx,{get(target,key){if(key==='state')return 'running';
    if(key==='resume'||key==='close')return ()=>Promise.resolve();
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
   const maximum=scenario!=='default',clinical=scenario.includes('clinical');
   const prefs={enabled:true,volume:maximum?1:.74,musicVolume:maximum?1:.8,effectsVolume:1,
    lobbyTrack:track,guardTrack:track,channels:{music:scenario!=='clinical-only',monitor:clinical,effects:clinical,speech:false,ambient:false}};
   const audio=createHospitalAudio({window:{document:{hidden:false},AudioContext:class{constructor(){return clock;}},fetch:window.fetch.bind(window)},
    storage:{getItem:()=>JSON.stringify(prefs)}});
   audio.unlock();
   const deadline=performance.now()+30000;
   while(audio.state().music.status==='loading'){
    if(performance.now()>deadline)throw Error('theme decode timed out');await new Promise(r=>setTimeout(r,10));
   }
   if(track==='new')assertReady();
   function assertReady(){if(audio.state().music.status!=='ready')throw Error('theme must decode, rather than silently measuring its fallback');}
   const patient={uid:'meter',procedures:{monitor:{connected:true}},lastVitalsKnown:{vitals:{hr:125,sys:75,spo2:85,rr:30}}};
   const tick=t=>{audio.tick(100+t*1000,{phase:'guard',patient});if(clinical&&Math.abs(t-2)<.01)audio.cue('studyReady');};
   tick(0);const checkpoints=[];
   for(let i=1;i<100;i++)checkpoints.push(ctx.suspend(i*.2).then(()=>{tick(ctx.currentTime);return ctx.resume();}));
   const buffer=await ctx.startRendering();await Promise.all(checkpoints);
   let peak=0,sum=0,clipped=0;
   for(let c=0;c<buffer.numberOfChannels;c++)for(const value of buffer.getChannelData(c)){
    peak=Math.max(peak,Math.abs(value));sum+=value*value;if(Math.abs(value)>=1)clipped++;
   }
   const rms=Math.sqrt(sum/(buffer.length*buffer.numberOfChannels));audio.destroy();
   return {track,scenario,seconds:buffer.duration,peak,peakDbfs:20*Math.log10(peak),rmsDbfs:20*Math.log10(rms),clippedSamples:clipped};
  },{track,scenario});
  assert.equal(result.clippedSamples,0,JSON.stringify(result));assert(result.peak<.9,JSON.stringify(result));
  results.push(result);
 }
 const baseline=process.env.V5_AUDIO_BASELINE?JSON.parse(await fs.readFile(process.env.V5_AUDIO_BASELINE,'utf8')):null;
 if(baseline)for(const row of results){
  const before=baseline.results.find(x=>x.track===row.track&&x.scenario===row.scenario);
  row.changeDb=row.rmsDbfs-before.rmsDbfs;
  if(row.scenario==='clinical-only')assert(Math.abs(row.changeDb)<.001,'clinical levels must remain exact');
  else if(!row.scenario.includes('clinical'))assert(Math.abs(row.changeDb-2.92256)<.01,'both compositions need the same moderate music-only gain');
 }
 const report={passed:true,measurement:'20 second real OfflineAudioContext render; RMS dBFS, not LUFS or physical SPL',physicalDevices:false,results};
 await fs.writeFile(output+'/results.json',JSON.stringify(report,null,2));console.log('AUDIO DIGITAL LEVELS PASS '+JSON.stringify(report));
}finally{await h.close();}
