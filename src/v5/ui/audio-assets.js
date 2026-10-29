const ASSETS=Object.freeze({
 theme:[new URL('../content/audio/atria-theme.m4a',import.meta.url).href,
  new URL('../content/audio/atria-theme-aac.m4a',import.meta.url).href],
 click:[new URL('../content/audio/atria-click.wav',import.meta.url).href]
});

/** One promise and decoded buffer per asset, in the owner's existing context. */
export function createAudioAssetCache({window,context}){
 const cache=new Map(),controller=new AbortController();let destroyed=false;
 function load(key){
  if(destroyed)return Promise.reject(Error('audio assets destroyed'));
  if(cache.has(key))return cache.get(key);
  const task=(async()=>{
   let failure;
   for(const url of ASSETS[key]||[]){
    try{
     const response=await window.fetch(url,{signal:controller.signal,cache:'force-cache'});
     if(!response.ok)throw Error('audio HTTP '+response.status);
     const buffer=await context.decodeAudioData(await response.arrayBuffer());
     if(destroyed)throw Error('audio assets destroyed');
     // Only 128 frames at each seam (2.7ms at 48kHz). No trimming, added
     // silence, pitch, speed or instrumentation changes; the click is untouched.
     if(key==='theme'&&buffer.getChannelData){
      const frames=Math.min(128,Math.floor(buffer.length/2));
      for(let c=0;c<buffer.numberOfChannels;c++){
       const samples=buffer.getChannelData(c);
       for(let i=0;i<frames;i++){
        const gain=i/frames;samples[i]*=gain;samples[samples.length-1-i]*=gain;
       }
      }
     }
     return buffer;
    }catch(error){failure=error;if(destroyed)throw error;}
   }
   throw failure||Error('unknown audio asset: '+key);
  })();
  cache.set(key,task);return task;
 }
 return Object.freeze({load,destroy(){destroyed=true;controller.abort();cache.clear();}});
}
