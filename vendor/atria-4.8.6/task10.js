(()=>{
'use strict';
if(window.__atriaHideLegacyStudyToast483)return;
window.__atriaHideLegacyStudyToast483=true;
const legacyIds=['atria-study-toast-478','atria-study-universal-toast-480'];
function clean(){
 for(const id of legacyIds){const el=document.getElementById(id);if(el)el.remove()}
 const nodes=[...document.querySelectorAll('div')];
 for(const el of nodes){
   const t=(el.textContent||'').trim();
   if(/^Estudio\s*·/i.test(t) && /U\/L|g\/dL|mmol|mUI|negativ|dentro de rango|sin alteraciones/i.test(t)){
     const r=el.getBoundingClientRect();
     if(r.width>250&&r.height>70&&getComputedStyle(el).position==='fixed')el.remove();
   }
 }
}
const mo=new MutationObserver(clean);
if(document.body)mo.observe(document.body,{childList:true,subtree:true});
clean();
})();