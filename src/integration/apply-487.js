const replaceOnce=(s,from,to,label)=>{const i=s.indexOf(from);if(i<0)throw new Error('integration anchor missing: '+label);if(s.indexOf(from,i+from.length)>=0)throw new Error('integration anchor ambiguous: '+label);return s.slice(0,i)+to+s.slice(i+from.length)};
export function apply487(html){
 let s=html;
 const oldFind=`function findStudy(text){const n=norm(text);let best=null,score=0;for(const s of C.studies)for(const a of [s.label,...s.aliases]){const na=norm(a);if(n.includes(na)&&na.length>score){best=s;score=na.length}}return best}`;
 const newFind=`function findStudy(text){const n=norm(text);let best=null,score=0,native=false;const nativeIds=new Set((C.studies||[]).map(x=>x.id)),pool=[...(C.studies||[])];for(const c of CASES||[])for(const x of c.studies||[])if(!pool.some(y=>y.id===x.id))pool.push(x);for(const st of pool)for(const a of [st.label,...(st.aliases||[])]){const na=norm(a);if(na&&n.includes(na)&&na.length>score){best=st;score=na.length;native=nativeIds.has(st.id)}}return best&&!native?{...best,result:'Sin alteraciones significativas para esta patología.',universalFallback:true}:best}`;
 s=replaceOnce(s,oldFind,newFind,'universal-study-resolution');
 let direct=0;s=s.replace(/s\.delay\*1000/g,()=>{direct++;return 'Math.max(1,Number(s.gameHours??s.delayHours??s.delay??1))*60000'});if(direct!==1)throw new Error('direct study timing anchor expected 1, got '+direct);
 let lab=0;s=s.replace(/t\.study\.delay\*1000/g,()=>{lab++;return 'Math.max(1,Number(t.study.gameHours??t.study.delayHours??t.study.delay??1))*60000'});if(lab!==1)throw new Error('lab study timing anchor expected 1, got '+lab);
 const oldPeer=`function csSendPeerState(){\n if(!csCoop.dc||csCoop.dc.readyState!=='open'||!csProfile)return;`;
 const newPeer=`function csSendPeerState(){\n if(!csCoop.dc||csCoop.dc.readyState!=='open'||!csProfile)return;\n if((csCoop.dc.bufferedAmount||0)>65536)return;`;
 s=replaceOnce(s,oldPeer,newPeer,'peer-backpressure');
 const disabledVoice=` // Player radio needs a voice transport; this release provides clinical data and text only.\n const refreshVoice=csRefreshVoiceButtons;\n csRefreshVoiceButtons=function(){const r=refreshVoice.apply(this,arguments),b=document.getElementById('radioPttBtn');if(b){b.disabled=true;b.hidden=true;b.title='La sala comparte texto y acciones. Radio de voz pendiente.';}return r;};\n csRefreshVoiceButtons();`;
 s=replaceOnce(s,disabledVoice,` // Existing WebRTC audio transport is enabled; task13 handles mic permission priming.\n csRefreshVoiceButtons();`,'social-voice-enable');
 return s;
}
