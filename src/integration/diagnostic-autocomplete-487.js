import {DX_EXTRA_TERMS_487,csDxNorm487,csDxCatalog487,csDxSuggest487,csDxSpecificity487,csDxMatchesCase487} from '../clinical/diagnostic-impression-487.js';

// A late, additive UI integration; sim.diagnosis remains the single source of truth.
export function applyDiagnosticImpression487(html){
 if(html.includes('id="atria-diagnostic-autocomplete-487"'))throw Error('diagnostic autocomplete installed twice');
 if(!html.includes('</body>'))throw Error('missing body');
 const css=String.raw`<style id="atria-diagnostic-style-487">
 #csDxBadge487{position:fixed;z-index:1208;transform:translate(-50%,-100%);max-width:min(228px,70vw);min-height:35px;padding:7px 10px;
  border:1px solid #81cabb;border-radius:11px;color:#f1fffd;background:#10343ddb;font:700 12px/1.3 system-ui,sans-serif;
  box-shadow:0 4px 14px #001925ad;cursor:pointer;touch-action:manipulation;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
 #csDxBadge487.csDxGlow487{animation:csDxPulse487 2.3s ease-in-out infinite}
 #csDxBadge487.csDxBroad487{border-color:#efca86;animation:csDxPulse487 3s ease-in-out infinite}
 @keyframes csDxPulse487{0%,100%{box-shadow:0 0 8px #69dcc54a}50%{box-shadow:0 0 23px #70e7dba8}}
 #csDxDialog487{position:fixed;inset:0;z-index:2147482200;display:none;background:#06101bb9;backdrop-filter:blur(3px);touch-action:pan-y}
 #csDxDialog487.open{display:block}
 #csDxDialog487 .card{position:absolute;box-sizing:border-box;left:50%;transform:translateX(-50%);
  width:min(440px,calc(100vw - 18px));max-height:calc(100dvh - 26px);overflow:auto;overscroll-behavior:contain;
  padding:14px;background:#0d2633;color:#ecf9f9;border:1px solid #6baab4;border-radius:15px;
  box-shadow:0 12px 38px #000d;font:13px/1.4 system-ui,sans-serif}
 #csDxDialog487 .head,#csDxDialog487 .footer{display:flex;align-items:center;justify-content:space-between;gap:8px}
 #csDxDialog487 .head b{font-size:16px}
 #csDxDialog487 button{cursor:pointer;touch-action:manipulation;color:#eaf8fa;font:inherit}
 #csDxDialog487 .close{border:0;background:transparent;font-size:24px;min-width:38px;min-height:38px}
 #csDxDialog487 .hint{font-size:11px;color:#b4cfd8;margin:4px 0 9px}
 #csDxDialog487 input{box-sizing:border-box;width:100%;min-height:43px;border-radius:10px;border:1px solid #80b9bd;
   padding:10px;background:#071822;color:#fff;font:16px system-ui,sans-serif}
 #csDxDialog487 .suggestions{display:flex;flex-direction:column;gap:3px;max-height:min(34dvh,226px);overflow-y:auto;margin-top:7px}
 #csDxDialog487 .suggestions button{text-align:left;background:#10323d;border:1px solid #285763;border-radius:8px;min-height:35px;padding:7px 9px}
 #csDxDialog487 .info{min-height:24px;margin:9px 0;color:#bdd9dd;font-size:11px}
 #csDxDialog487 .info[data-level="broad"]{color:#ffe09d}
 #csDxDialog487 .footer{justify-content:flex-end;margin-top:7px}
 #csDxDialog487 .footer button{border:1px solid #537983;background:#173743;border-radius:9px;padding:9px 13px;min-height:39px}
 #csDxDialog487 .footer .save{background:#126459;border-color:#83cebd;font-weight:750}
 @media(prefers-reduced-motion:reduce){#csDxBadge487{animation:none!important}}
 </style>`;
 const runtime=String.raw`<script id="atria-diagnostic-autocomplete-487">
 (function(){
  'use strict';
  if(window.__csDxAutocomplete487)return;window.__csDxAutocomplete487=true;
  const DX_EXTRA_TERMS_487=${JSON.stringify(DX_EXTRA_TERMS_487)};
  ${csDxNorm487.toString()}
  ${csDxCatalog487.toString()}
  ${csDxSuggest487.toString()}
  ${csDxSpecificity487.toString()}
  ${csDxMatchesCase487.toString()}
  const cases=()=>typeof CASES!=='undefined'&&Array.isArray(CASES)?CASES:[];
  let catalog=csDxCatalog487(cases()),count=cases().length;
  function allTerms(){if(count!==cases().length){count=cases().length;catalog=csDxCatalog487(cases())}return catalog}
  window.csDx487={suggest:input=>csDxSuggest487(allTerms(),input),
   specificity:input=>csDxSpecificity487(cases(),input),
   matchesCase:(id,input)=>csDxMatchesCase487(cases(),id,input)};
  let badge=null,dialog=null,card=null,input=null,suggestions=null,info=null,editor=null,lastAt=0;
  const byId=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function active(){
   return !!sim&&!!C&&!sim.caseEnded&&!sim.patientDied&&!window.nsBackgroundPhysiology&&
    !['selectorMode','nsLobbyMode','qaMode','editorMode'].some(x=>document.body.classList.contains(x))&&
    byId('selector')?.style?.display==='none';
  }
  const canEdit=()=>window.nsMayExamine?.()!==false;
  function init(){
   if(badge)return;
   badge=document.createElement('button');badge.id='csDxBadge487';badge.type='button';
   badge.setAttribute('aria-label','Editar impresión diagnóstica');
   document.body.appendChild(badge);
   badge.addEventListener('pointerdown',e=>e.stopPropagation());
   badge.onclick=e=>{e.stopPropagation();open()};
   dialog=document.createElement('div');dialog.id='csDxDialog487';
   dialog.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-labelledby="csDxTitle487">'+
    '<div class="head"><b id="csDxTitle487">Impresión diagnóstica</b><button type="button" class="close" aria-label="Cerrar">×</button></div>'+
    '<p class="hint">Escribí tu sospecha. Las opciones pertenecen a todo el catálogo; no indican la solución del paciente.</p>'+
    '<input id="csDxInput487" aria-label="Diagnóstico" autocomplete="off" spellcheck="false">'+
    '<div id="csDxSuggestions487" class="suggestions" role="listbox"></div>'+
    '<p id="csDxInfo487" class="info" aria-live="polite"></p>'+
    '<div class="footer"><button type="button" class="clear">Borrar</button>'+
    '<button type="button" class="save">Guardar</button></div></div>';
   document.body.appendChild(dialog);
   dialog.addEventListener('pointerdown',e=>e.stopPropagation());
   dialog.addEventListener('click',e=>{if(e.target===dialog)close();e.stopPropagation()});
   card=dialog.querySelector('.card');input=byId('csDxInput487');
   suggestions=byId('csDxSuggestions487');info=byId('csDxInfo487');
   dialog.querySelector('.close').onclick=close;
   dialog.querySelector('.save').onclick=save;
   dialog.querySelector('.clear').onclick=()=>{
    if(!editor||!canEdit()||sim!==editor.patient||C?.id!==editor.caseId){close();return}
    sim.diagnosis='';const native=byId('dxInput');if(native)native.value='';
    sim.events?.push({m:sim.gameMinute,t:'Impresión diagnóstica borrada'});
    close();render();
   };
   input.oninput=updateChoices;
   input.onfocus=()=>document.body.classList.add('keyboardOpen');
   input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close()}
    else if(e.key==='Enter'&&!e.isComposing){e.preventDefault();save()}};
   window.visualViewport?.addEventListener('resize',position);
   window.visualViewport?.addEventListener('scroll',position);
   window.addEventListener('resize',position);
  }
  function position(){
   if(!dialog?.classList.contains('open'))return;
   const v=window.visualViewport,top=Math.max(0,v?.offsetTop||0),h=Math.max(175,v?.height||window.innerHeight);
   const margin=h<380?5:12;
   card.style.top=(top+margin)+'px';card.style.maxHeight=Math.max(158,h-2*margin)+'px';
  }
  function open(){
   if(!active())return;init();editor={patient:sim,caseId:C.id};
   dialog.classList.add('open');input.value=sim.diagnosis||'';input.readOnly=!canEdit();
   dialog.querySelector('.save').disabled=!canEdit();
   dialog.querySelector('.clear').disabled=!canEdit();
   updateChoices();position();
   if(canEdit())requestAnimationFrame(()=>input.focus({preventScroll:true}));
  }
  function close(){
   if(!dialog)return;
   if(document.activeElement===input)input.blur();
   dialog.classList.remove('open');document.body.classList.remove('keyboardOpen');editor=null;
  }
  function updateChoices(){
   if(!input||!suggestions)return;
   suggestions.innerHTML='';
   const summary=csDxSpecificity487(cases(),input.value);
   info.textContent=summary.tip;info.dataset.level=summary.level;
   if(input.readOnly)return;
   for(const label of csDxSuggest487(allTerms(),input.value,8)){
    const choice=document.createElement('button');choice.type='button';choice.textContent=label;
    choice.setAttribute('role','option');choice.addEventListener('pointerdown',e=>e.preventDefault());
    choice.onclick=()=>{input.value=label;updateChoices();input.focus({preventScroll:true})};
    suggestions.appendChild(choice);
   }
  }
  function save(){
   if(!editor||!canEdit()||sim!==editor.patient||C?.id!==editor.caseId||sim.caseEnded){close();return}
   const text=input.value.trim();if(!text){info.dataset.level='broad';info.textContent='Escribí una impresión o presioná Borrar.';return}
   const ok=typeof window.csSetDiagnosticImpression==='function'?
     window.csSetDiagnosticImpression(text,{echo:false}):(sim.diagnosis=text,true);
   if(ok){const native=byId('dxInput');if(native)native.value=sim.diagnosis;close();render()}
  }
  function render(){
   if(!active()){if(badge)badge.style.display='none';if(editor)close();return}
   init();
   if(editor&&(editor.patient!==sim||editor.caseId!==C.id))close();
   if(dialog.classList.contains('open')||document.body.classList.contains('keyboardOpen')){badge.style.display='none';return}
   const pos=worldToScreen(patient.x,patient.y);
   if(!pos||!Number.isFinite(pos[0])||!Number.isFinite(pos[1])||
      pos[0]<-20||pos[0]>window.innerWidth+20||pos[1]<32||pos[1]>window.innerHeight-80){
    badge.style.display='none';return;
   }
   const dx=String(sim.diagnosis||'').trim(),specific=csDxSpecificity487(cases(),dx);
   badge.textContent=!dx?'✎ Impresión diagnóstica':!specific.specific?'✎ Precisar: '+dx:'🩺 '+dx+' ✎';
   badge.title=dx||'Registrar impresión diagnóstica';
   badge.classList.toggle('csDxGlow487',!dx);badge.classList.toggle('csDxBroad487',!!dx&&!specific.specific);
   badge.style.display='block';
   badge.style.left=clamp(pos[0],102,window.innerWidth-102)+'px';
   badge.style.top=clamp(pos[1]-74,90,window.innerHeight-170)+'px';
  }
  const previous=updateSimulation;
  updateSimulation=function(dt){const out=previous.apply(this,arguments),now=performance.now();
   if(now-lastAt>230){lastAt=now;render()}return out};
  window.csDx487Refresh=render;
 })();
 </script>`;
 return html.replace('</head>',css+'</head>').replace('</body>',runtime+'</body>');
}
