export function bootSnapshot(doc=document,win=window){
 const visible=id=>{const e=doc.getElementById(id);if(!e)return false;const s=win.getComputedStyle?win.getComputedStyle(e):e.style||{};return s.display!=='none'&&s.visibility!=='hidden'};
 return{canvas:!!doc.querySelector('canvas'),chatDock:!!doc.getElementById('chatDock'),selectorVisible:visible('selector'),activeCase:!!win.C,playerReady:!!win.player,hud:!!doc.getElementById('hud')||!!doc.getElementById('act')};
}
export function assertBootReady(doc=document,win=window){
 const s=bootSnapshot(doc,win);
 if(!s.canvas||!s.chatDock)throw new Error('ATRIA shell incomplete');
 const stateReady=s.selectorVisible||(s.activeCase&&s.playerReady&&s.hud);
 if(!stateReady)throw new Error('ATRIA map-only boot detected');
 return s;
}
export function installFatalBoundary(win=window,doc=document){
 const show=reason=>{let el=doc.getElementById('atriaFatal');if(!el){el=doc.createElement('div');el.id='atriaFatal';Object.assign(el.style,{position:'fixed',inset:'0',zIndex:'999999',background:'#07181a',color:'#fff',padding:'24px',fontFamily:'system-ui'});doc.body.appendChild(el)}el.textContent='ATRIA no pudo iniciar correctamente. '+String(reason||'Error desconocido')};
 win.addEventListener('error',e=>show(e.error?.message||e.message));win.addEventListener('unhandledrejection',e=>show(e.reason?.message||e.reason));return show;
}
