(function(){
'use strict';
if(window.__ATRIA_TASK4_468__)return;
window.__ATRIA_TASK4_468__=true;
var style=document.createElement('style');
style.id='atria-task4-468-style';
style.textContent="\nbody.nsLobbyMode #chatDock.nsLobbyChat .chatRecent{\n  display:block!important;position:absolute!important;top:auto!important;left:2px!important;right:2px!important;bottom:50px!important;\n  height:auto!important;min-height:22px!important;max-height:78px!important;overflow:hidden!important;padding:4px 8px!important;margin:0 0 4px!important;\n  background:rgba(3,16,23,.15)!important;border:1px solid rgba(181,226,233,.08)!important;border-radius:9px!important;\n  box-shadow:none!important;backdrop-filter:blur(1.5px)!important;-webkit-backdrop-filter:blur(1.5px)!important;pointer-events:none!important\n}\nbody.nsLobbyMode #chatDock.nsLobbyChat .nsLobbyLine{\n  display:block!important;margin:1px 0!important;padding:2px 4px!important;border:0!important;border-radius:6px!important;\n  background:rgba(3,16,23,.06)!important;font-size:10.2px!important;line-height:1.28!important;color:#f1f9fb!important\n}\nbody.nsLobbyMode.keyboardOpen #chatDock.nsLobbyChat .chatRecent{display:none!important}\nbody.nsLobbyMode #chatDock.nsLobbyChat .nsLobbyHistory{\n  background:rgba(3,17,26,.90)!important;backdrop-filter:blur(7px)!important;-webkit-backdrop-filter:blur(7px)!important\n}\n@media(max-width:700px){\n  body:not(.keyboardOpen) #chatDock .chatRecent{max-height:66px!important;padding:3px 6px!important}\n  body:not(.keyboardOpen) #chatDock .chatRecentLine,\n  body:not(.keyboardOpen) #chatDock .nsLobbyLine{\n    font-size:9.35px!important;line-height:1.18!important;padding:1px 3px!important;margin:1px 0!important\n  }\n  body.nsLobbyMode #chatDock.nsLobbyChat{height:44px!important;bottom:max(5px,env(safe-area-inset-bottom))!important}\n  body.nsLobbyMode #chatDock.nsLobbyChat .chatGlass{height:44px!important}\n  body.nsLobbyMode #chatDock.nsLobbyChat .chatRecent{bottom:47px!important;height:44px!important;min-height:44px!important;max-height:44px!important;padding:2px 5px!important}\n  body.nsLobbyMode #chatDock.nsLobbyChat .nsLobbyHistory{bottom:47px!important;max-height:min(38dvh,260px)!important}\n}";
document.head.appendChild(style);

function clinicalActive(){
  try{
    if(document.body&&document.body.classList.contains('nsLobbyMode'))return false;
    return !!((typeof C!=='undefined'&&C)||(typeof sim!=='undefined'&&sim)||(typeof csV41Challenge!=='undefined'&&csV41Challenge&&csV41Challenge.active));
  }catch(_){return false}
}
function keyboardDown(){
  try{
    var a=document.activeElement;
    if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName))a.blur();
    document.body.classList.remove('keyboardOpen');
  }catch(_){}
}
async function returnLobbyNow(){
  keyboardDown();
  try{
    if(window.nsSocial&&typeof window.nsSocial.room==='function'&&window.nsSocial.room()&&typeof window.nsSocial.leave==='function')await window.nsSocial.leave(true);
  }catch(err){console.warn('ATRIA salida de grupo',err)}
  try{
    if(typeof csReturnToCases==='function')csReturnToCases();
  }catch(err){console.warn('ATRIA cierre de guardia',err)}
  try{if(typeof closeSheet==='function')closeSheet()}catch(_){}
  try{if(typeof hideRadial==='function')hideRadial()}catch(_){}
  try{if(typeof closeFloatCard==='function')closeFloatCard()}catch(_){}
  try{if(typeof closeDiegeticChat==='function')closeDiegeticChat()}catch(_){}
  try{if(typeof C!=='undefined')C=null}catch(_){}
  try{if(typeof sim!=='undefined')sim=null}catch(_){}
  try{if(typeof shiftSession!=='undefined')shiftSession=null}catch(_){}
  try{if(typeof player!=='undefined'){player.bubble='';player.bubbleUntil=0}}catch(_){}
  try{if(typeof near!=='undefined')near='none'}catch(_){}
  try{
    document.body.classList.remove('selectorMode','qaMode');
    var selector=document.getElementById('selector');if(selector)selector.style.display='none';
  }catch(_){}
  await new Promise(function(r){setTimeout(r,0)});
  try{
    if(window.nsLobby&&typeof window.nsLobby.enter==='function')await window.nsLobby.enter();
  }catch(err){console.warn('ATRIA entrada al lobby',err)}
  setTimeout(repairLobby,40);setTimeout(repairLobby,180);setTimeout(repairLobby,500);
}
function syncReturnButton(){
  var menuHome=document.querySelector('#nsGameMenu [data-ns-menu="home"]');
  if(menuHome&&menuHome.textContent!=='Volver al lobby')menuHome.textContent='Volver al lobby';
  var b=document.getElementById('caseBtn');
  if(!b)return;
  if(clinicalActive()){
    if(b.textContent!=='Volver al lobby')b.textContent='Volver al lobby';
    if(b.getAttribute('aria-label')!=='Volver al lobby')b.setAttribute('aria-label','Volver al lobby');
    if(b.title!=='Volver al lobby')b.title='Volver al lobby';
  }
  if(b.dataset.atriaLobbyReturn468)return;
  b.dataset.atriaLobbyReturn468='1';
  b.addEventListener('click',function(ev){
    if(!clinicalActive())return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    keyboardDown();
    returnLobbyNow();
  },true);
}
function repairLobby(){
  try{
    if(clinicalActive())return;
    if(!document.body.classList.contains('nsLobbyMode'))return;
    var splash=document.getElementById('nsSplash');
    if(splash&&splash.classList.contains('show'))splash.classList.remove('show');
    if(splash)splash.setAttribute('aria-hidden','true');
    var selector=document.getElementById('selector');
    if(selector)selector.style.display='none';
    document.body.classList.remove('selectorMode');
    if(!document.getElementById('nsLobbyHud')&&window.nsLobby&&typeof window.nsLobby.renderHud==='function')window.nsLobby.renderHud();
    var dock=document.getElementById('chatDock');
    if((!dock||!dock.classList.contains('nsLobbyChat')||!dock.innerHTML.trim())&&window.nsLobby&&typeof window.nsLobby.renderChat==='function'){
      window.nsLobby.renderChat();
      dock=document.getElementById('chatDock');
    }
    if(dock){dock.classList.add('show','nsLobbyChat');dock.setAttribute('aria-hidden','false')}
  }catch(err){console.warn('ATRIA lobby repair',err)}
}
function compactMobileSpeech(){
  try{
    if(typeof speech!=='function'||speech.__atriaTask4Wrapped)return;
    var old=speech;
    var wrapped=function(text,x,y,color,until){
      try{
        var vv=window.visualViewport;
        var width=Math.min(window.innerWidth||9999,(vv&&vv.width)||9999);
        if(width<=700){
          var sc=(typeof scale==='number'&&scale>0)?scale:1;
          y=Number(y)+(12/sc);
        }
      }catch(_){}
      return old(text,x,y,color,until);
    };
    wrapped.__atriaTask4Wrapped=true;
    speech=wrapped;
  }catch(_){}
}
function ensureVisibleReturn(){
  var id='nsVisibleLobbyReturn',x=document.getElementById(id);
  if(!clinicalActive()){if(x)x.remove();return}
  var h=document.getElementById('nsPlayerHeader');if(!h)return;
  if(!x){
    x=document.createElement('button');x.id=id;x.type='button';x.textContent='Volver al lobby';x.setAttribute('aria-label','Volver al lobby');x.title='Volver al lobby';
    var ref=document.getElementById('nsWardBtn');x.className=(ref&&ref.className)||'';
    x.style.whiteSpace='nowrap';x.style.flex='0 0 auto';x.style.minHeight='32px';x.style.padding='0 8px';x.style.fontSize='9.5px';
    x.onclick=function(e){e.preventDefault();e.stopPropagation();returnLobbyNow()};
    var menu=document.getElementById('nsMenuBtn');h.insertBefore(x,menu||null);
  }
}
function tick(){syncReturnButton();ensureVisibleReturn();compactMobileSpeech();repairLobby()}
window.addEventListener('pageshow',tick);
window.addEventListener('resize',tick,{passive:true});
setInterval(tick,700);
tick();
})();