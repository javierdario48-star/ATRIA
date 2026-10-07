export class VoiceSession{
 constructor(){this.stream=null;this.peer=null;this.mode=null}
 async open({getUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices),peer,mode='lobby'}={}){
  if(this.stream)return this.stream;
  this.mode=mode;this.peer=peer||null;
  this.stream=await getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  for(const track of this.stream.getAudioTracks())this.peer?.addTrack?.(track,this.stream);
  return this.stream;
 }
 close(){for(const t of this.stream?.getTracks?.()||[])t.stop?.();this.stream=null;this.peer=null;this.mode=null}
}
