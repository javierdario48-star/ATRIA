(()=>{
'use strict';
if(window.__atriaStudyAutocomplete483)return;
window.__atriaStudyAutocomplete483=true;
const studies=[
'hemograma','glucemia','urea','creatinina','función renal','ionograma','sodio','potasio','calcio','magnesio',
'hepatograma','AST','ALT','bilirrubina','fosfatasa alcalina','GGT','amilasa','lipasa','PCR','VSG','lactato',
'gasometría arterial','coagulograma','TP','INR','KPTT','troponina','CK-MB','dímero D','procalcitonina',
'orina completa','sedimento urinario','urocultivo','hemocultivos','coprocultivo','calprotectina fecal','sangre oculta en heces',
'beta-hCG','TSH','T4 libre','ferritina','hierro','vitamina B12','folato','vitamina D',
'HIV','HBsAg','anti-HCV','VDRL',
'electrocardiograma','ecocardiograma','Holter','ergometría',
'radiografía de tórax','radiografía de abdomen','ecografía abdominal','ecografía renal','ecografía hepatobiliar','Doppler vascular',
'tomografía abdominal','tomografía de tórax','tomografía cerebral','angio-TC abdominal','angio-TC de tórax',
'resonancia abdominal','resonancia cerebral','colangio-RM',
'endoscopia digestiva alta','colonoscopia','broncoscopia','cistoscopia',
'biopsia','anatomía patológica','citología','PET-CT','centellograma'
];
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
let box=null,active=-1,currentInput=null,items=[];

function ensure(){
 if(box)return box;
 box=document.createElement('div');
 box.id='atria-study-autocomplete-483';
 box.style.cssText='position:fixed;z-index:2147483005;display:none;max-height:42vh;overflow:auto;background:rgba(6,26,34,.98);border:1px solid rgba(116,216,224,.45);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.45);padding:6px;color:#eefcff;font-family:inherit';
 document.body.appendChild(box);
 return box;
}
function setValue(el,v){
 const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
 const d=Object.getOwnPropertyDescriptor(p,'value'); if(d&&d.set)d.set.call(el,v); else el.value=v;
 el.dispatchEvent(new Event('input',{bubbles:true})); el.focus();
}
function query(raw){
 raw=(raw||'').trim();
 if(!raw.startsWith('/'))return null;
 let q=raw.slice(1);
 if(/^estudio\s+/i.test(q))q=q.replace(/^estudio\s+/i,'');
 else if(/^estudio$/i.test(q))q='';
 return norm(q);
}
function update(el){
 const q=query(el.value); if(q===null){hide();return}
 currentInput=el;
 items=studies.filter(s=>norm(s).includes(q));
 active=items.length?0:-1;
 render();position(el);
}
function render(){
 const b=ensure();
 if(!items.length){hide();return}
 b.innerHTML=items.map((s,i)=>'<div data-i="'+i+'" style="padding:9px 10px;border-radius:8px;cursor:pointer;'+(i===active?'background:rgba(116,216,224,.18);':'')+'"><span style="font-weight:700">'+s+'</span><span style="opacity:.55;font-size:.82em"> · /estudio '+s+'</span></div>').join('');
 b.style.display='block';
}
function position(el){
 const b=ensure(),r=el.getBoundingClientRect(),margin=8,w=Math.min(Math.max(r.width,320),window.innerWidth-margin*2);
 b.style.width=w+'px';b.style.left=Math.max(margin,Math.min(r.left,window.innerWidth-w-margin))+'px';
 const estimated=Math.min(b.scrollHeight||260,window.innerHeight*.42);
 const top=r.top-estimated-8;
 b.style.top=(top>margin?top:Math.min(window.innerHeight-estimated-margin,r.bottom+8))+'px';
}
function choose(i){
 if(!currentInput||!items[i])return;
 setValue(currentInput,'/estudio '+items[i]);hide();
}
function hide(){if(box)box.style.display='none';active=-1;items=[]}
document.addEventListener('input',e=>{if(e.target?.matches?.('input,textarea'))update(e.target)},true);
document.addEventListener('focusin',e=>{if(e.target?.matches?.('input,textarea')&&(e.target.value||'').startsWith('/'))update(e.target)},true);
document.addEventListener('keydown',e=>{
 if(!currentInput||!box||box.style.display==='none')return;
 if(e.key==='ArrowDown'){e.preventDefault();active=(active+1)%items.length;render();position(currentInput)}
 else if(e.key==='ArrowUp'){e.preventDefault();active=(active-1+items.length)%items.length;render();position(currentInput)}
 else if(e.key==='Tab'&&items.length){e.preventDefault();choose(active<0?0:active)}
 else if(e.key==='Enter'&&items.length&&query(currentInput.value)!==null&&norm(currentInput.value)!==norm('/estudio '+items[active])){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();choose(active<0?0:active)}
 else if(e.key==='Escape')hide();
},true);
document.addEventListener('pointerdown',e=>{
 const row=e.target?.closest?.('#atria-study-autocomplete-483 [data-i]');
 if(row){e.preventDefault();choose(Number(row.dataset.i));return}
 if(box&&!box.contains(e.target)&&e.target!==currentInput)hide();
},true);
window.addEventListener('resize',()=>{if(currentInput&&box?.style.display!=='none')position(currentInput)});
})();