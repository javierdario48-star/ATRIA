export function assertBootReady(doc=document){
 const required=['canvas','chatDock'];
 const missing=required.filter(id=>!doc.getElementById(id));
 if(missing.length)throw new Error('ATRIA boot missing: '+missing.join(', '));
 return true;
}
export function installFatalBoundary(win=window,doc=document){
 const show=(reason)=>{let el=doc.getElementById('atriaFatal');if(!el){el=doc.createElement('div');el.id='atriaFatal';Object.assign(el.style,{position:'fixed',inset:'0',zIndex:'999999',background:'#07181a',color:'#fff',padding:'24px',fontFamily:'system-ui'});doc.body.appendChild(el)}el.textContent='ATRIA no pudo iniciar correctamente. '+String(reason||'Error desconocido');};
 win.addEventListener('error',e=>show(e.error?.message||e.message));win.addEventListener('unhandledrejection',e=>show(e.reason?.message||e.reason));return show;
}
