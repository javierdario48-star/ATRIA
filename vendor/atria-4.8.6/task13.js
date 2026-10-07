(()=>{
'use strict';
if(window.__atriaSocialVoice486)return;
window.__atriaSocialVoice486=true;

const state={permission:'unknown',priming:false,lastPrime:0};

function socialVoiceButton(){
  return document.getElementById('radioPttBtn') ||
    [...document.querySelectorAll('button,[role="button"]')].find(b=>{
      const s=((b.id||'')+' '+(b.getAttribute('title')||'')+' '+(b.getAttribute('aria-label')||'')+' '+(b.textContent||'')).toLowerCase();
      return /radio|push.?to.?talk|ptt|compañero|companero|amigos|voz social|voice chat/.test(s);
    }) || null;
}

function styleButton(){
  const b=socialVoiceButton();
  if(!b)return;
  // Keep the existing element and its handlers; only normalize the initial UI.
  if((b.textContent||'').trim()==='📻') b.textContent='🎤';
  b.title='Mantener para hablar con amigos';
  b.setAttribute('aria-label','Mantener para hablar con amigos');
  b.dataset.atriaSocialVoice='1';
}

async function microphoneGranted(){
  try{
    if(navigator.permissions?.query){
      const p=await navigator.permissions.query({name:'microphone'});
      state.permission=p.state;
      p.onchange=()=>{state.permission=p.state;styleButton()};
      return p.state==='granted';
    }
  }catch{}
  return false;
}

async function primeMic(){
  if(state.priming)return false;
  if(Date.now()-state.lastPrime<700)return state.permission==='granted';
  state.priming=true;state.lastPrime=Date.now();
  let stream=null;
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('getUserMedia unavailable');
    stream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
      video:false
    });
    state.permission='granted';
    return true;
  }catch(e){
    state.permission='denied';
    console.warn('ATRIA social voice mic preflight',e);
    return false;
  }finally{
    if(stream)for(const t of stream.getTracks())t.stop();
    state.priming=false;
    styleButton();
  }
}

let heldButton=null;
async function beginSocialPTT(btn,e){
  if(!btn)return;
  // If the original radio handler is globally available, own the first gesture so
  // permission is completed before transmission starts.
  if(typeof window.csRadioDown!=='function')return;
  e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  heldButton=btn;
  const ok=state.permission==='granted' || await primeMic();
  if(!ok){heldButton=null;return}
  try{window.csRadioDown()}catch(err){console.warn('ATRIA social voice start',err)}
}
function endSocialPTT(e){
  if(!heldButton)return;
  e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  try{if(typeof window.csRadioUp==='function')window.csRadioUp()}catch(err){console.warn('ATRIA social voice stop',err)}
  heldButton=null;
}

document.addEventListener('pointerdown',e=>{
  const b=e.target?.closest?.('button,[role="button"]');
  if(!b)return;
  styleButton();
  if(b===socialVoiceButton())beginSocialPTT(b,e);
},true);
document.addEventListener('pointerup',endSocialPTT,true);
document.addEventListener('pointercancel',endSocialPTT,true);

function wrapRefreshes(){
  try{
    if(typeof window.csInjectVoiceButtons==='function'&&!window.csInjectVoiceButtons.__atria486){
      const base=window.csInjectVoiceButtons;
      const wrapped=function(){const r=base.apply(this,arguments);queueMicrotask(styleButton);return r};
      wrapped.__atria486=true;window.csInjectVoiceButtons=wrapped;
    }
    if(typeof window.refreshChatDock==='function'&&!window.refreshChatDock.__atria486){
      const base=window.refreshChatDock;
      const wrapped=function(){const r=base.apply(this,arguments);queueMicrotask(styleButton);return r};
      wrapped.__atria486=true;window.refreshChatDock=wrapped;
    }
  }catch(e){console.warn('ATRIA social voice wrap',e)}
}
function scan(){wrapRefreshes();styleButton()}
scan();
const mo=new MutationObserver(scan);
if(document.body)mo.observe(document.body,{childList:true,subtree:true});
window.addEventListener('pageshow',scan);
microphoneGranted().then(styleButton);

window.atriaSocialVoice486={primeMic,state:()=>({...state})};
})();