export class NetworkScheduler{
 constructor({movingMs=110,idleMs=220,audioMs=500,maxBuffered=65536}={}){Object.assign(this,{movingMs,idleMs,audioMs,maxBuffered});this.lastState=0;this.lastAudio=0;}
 tick(now,{moving=false,channel,sendState,updateAudio=()=>{}}){
  let stateSent=false,audioUpdated=false;
  const cadence=moving?this.movingMs:this.idleMs;
  if(channel?.readyState==='open'&&now-this.lastState>=cadence&&(channel.bufferedAmount||0)<this.maxBuffered){this.lastState=now;sendState();stateSent=true;}
  if(now-this.lastAudio>=this.audioMs){this.lastAudio=now;updateAudio();audioUpdated=true;}
  return{stateSent,audioUpdated,backpressured:!!channel&&((channel.bufferedAmount||0)>=this.maxBuffered)};
 }
}
