// Opt-in observation of the real browser transport. No clinical or RTC state
// is assigned, no timer is added, and no credentials or SDP secrets are logged.
function installRtcDiagnostics(){
 const Native=window.RTCPeerConnection;let sequence=0;
 if(!Native)return;
 window.RTCPeerConnection=class extends Native{
  constructor(...args){
   super(...args);const id=++sequence;
   const record=(event,extra={})=>console.debug('ATRIA_RTC '+JSON.stringify({id,event,
    signaling:this.signalingState,ice:this.iceConnectionState,gathering:this.iceGatheringState,
    connection:this.connectionState,local:this.localDescription?.type,remote:this.remoteDescription?.type,...extra}));
   const channel=value=>{
    for(const event of ['open','close','error'])value.addEventListener(event,()=>record('channel.'+event,{state:value.readyState}));
    let observed=false;value.addEventListener('message',event=>{if(!observed){observed=true;record('channel.first-message',{bytes:typeof event.data==='string'?event.data.length:null});}});
   };
   for(const event of ['connectionstatechange','iceconnectionstatechange','icegatheringstatechange','signalingstatechange'])
    this.addEventListener(event,()=>record(event));
   this.addEventListener('icecandidate',event=>record('candidate',event.candidate?
    {type:event.candidate.type,protocol:event.candidate.protocol,mdns:/\.local\b/.test(event.candidate.candidate)}:{complete:true}));
   this.addEventListener('icecandidateerror',event=>record('candidate-error',{code:event.errorCode,message:event.errorText}));
   this.addEventListener('datachannel',event=>{record('channel.received');channel(event.channel);});
   const create=this.createDataChannel;this.createDataChannel=(...values)=>{const value=create.apply(this,values);record('channel.created');channel(value);return value;};
   for(const method of ['createOffer','createAnswer','setLocalDescription','setRemoteDescription','addIceCandidate']){
    const invoke=this[method];this[method]=async(...values)=>{
     try{const result=await invoke.apply(this,values);record(method,{descriptionType:values[0]?.type});return result;}
     catch(error){record(method+'.failed',{name:error.name,message:error.message});throw error;}
    };
   }
   record('created');
  }
 };
}
export async function observeRtcBrowser(browser){
 const create=browser.newContext.bind(browser);
 browser.newContext=async(...args)=>{
  const context=await create(...args);await context.addInitScript(installRtcDiagnostics);
  context.on('page',page=>page.on('console',message=>{
   if(message.text().startsWith('ATRIA_RTC '))console.log(message.text());
  }));return context;
 };
 return browser;
}
