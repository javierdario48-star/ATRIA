(()=>{
'use strict';
if(window.__atriaStudyFallback483)return;
window.__atriaStudyFallback483=true;

const KEY='atria.studyFallback.v483';
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const reserved=new Set([
 'vega','monitor','via','dx','resolver','historia','examinar','ayuda','help',
 'tratamiento','tratar','medicacion','medicar','oxigeno','analgesia','expandir',
 'cristaloides','antibioticos','antibiotico','noradrenalina','adrenalina',
 'intubar','intubacion','cirugia','alta','ingresar','internar','derivar',
 'reanimar','rcp','desfibrilar','cardioversion'
]);

const normal={
 hemograma:'Hb 13,8 g/dL · Hto 41% · Leucocitos 7.400/mm³ · Plaquetas 245.000/mm³.',
 amilasa:'Amilasa 62 U/L, dentro de rango.',
 lipasa:'Lipasa 34 U/L, dentro de rango.',
 glucemia:'Glucemia 94 mg/dL.',
 urea:'Urea 31 mg/dL.',
 creatinina:'Creatinina 0,92 mg/dL · eGFR >90 mL/min/1,73 m².',
 'funcion renal':'Urea 31 mg/dL · Creatinina 0,92 mg/dL · eGFR >90 mL/min/1,73 m².',
 ionograma:'Na 139 mmol/L · K 4,2 mmol/L · Cl 103 mmol/L.',
 sodio:'Na 139 mmol/L.',
 potasio:'K 4,2 mmol/L.',
 calcio:'Calcio 9,3 mg/dL.',
 magnesio:'Magnesio 2,0 mg/dL.',
 hepatograma:'AST 24 U/L · ALT 27 U/L · FA 92 U/L · BT 0,7 mg/dL.',
 pcr:'PCR 3 mg/L.',
 vsg:'VSG 12 mm/h.',
 lactato:'Lactato 1,2 mmol/L.',
 gasometria:'pH 7,40 · pCO₂ 40 mmHg · HCO₃⁻ 24 mmol/L · lactato 1,2 mmol/L.',
 coagulograma:'TP 12,1 s · INR 1,0 · aPTT 30 s.',
 orina:'Orina sin proteinuria, hematuria, nitritos ni leucocituria.',
 hemocultivos:'Hemocultivos sin desarrollo bacteriano.',
 coprocultivo:'Coprocultivo negativo para enteropatógenos habituales.',
 calprotectina:'Calprotectina fecal 38 µg/g, normal.',
 troponina:'Troponina ultrasensible <6 ng/L, negativa.',
 'dimero d':'Dímero D 260 ng/mL FEU, dentro de rango.',
 tsh:'TSH 2,1 mUI/L.',
 't4 libre':'T4 libre 1,18 ng/dL.',
 ferritina:'Ferritina 118 ng/mL.',
 hierro:'Hierro sérico 92 µg/dL.',
 b12:'Vitamina B12 420 pg/mL.',
 'vitamina b12':'Vitamina B12 420 pg/mL.',
 folato:'Folato 8,6 ng/mL.',
 'vitamina d':'25-OH vitamina D 31 ng/mL.',
 electrocardiograma:'Ritmo sinusal, 76 lpm. Sin cambios isquémicos agudos.',
 ecocardiograma:'Función biventricular conservada. FEVI 62%. Sin valvulopatía significativa.',
 radiografia:'Sin hallazgos radiográficos agudos.',
 ecografia:'Ecografía sin alteraciones agudas relevantes.',
 tomografia:'TC sin hallazgos agudos ni signos de complicación.',
 resonancia:'RM sin alteraciones agudas relevantes.',
 colonoscopia:'Mucosa colónica de aspecto conservado, sin lesiones inflamatorias ni sangrado.',
 endoscopia:'Mucosa esofagogastroduodenal sin lesiones significativas.',
 hiv:'HIV Ag/Ac: no reactivo.',
 hbsag:'HBsAg: no reactivo.',
 'anti hcv':'Anti-HCV: no reactivo.'
};

const alias={
 tac:'tomografia',tc:'tomografia','tomografia abdominal':'tomografia',
 rmn:'resonancia',rm:'resonancia','resonancia magnetica':'resonancia',
 eco:'ecografia','ecografia abdominal':'ecografia','eco abdominal':'ecografia',
 rx:'radiografia','radiografia de abdomen':'radiografia','radiografia abdomen':'radiografia',
 'gasometria arterial':'gasometria','gases arteriales':'gasometria',
 electrolitos:'ionograma','perfil renal':'funcion renal','perfil hepatico':'hepatograma',
 'proteina c reactiva':'pcr','d-dimero':'dimero d','d dimero':'dimero d',
 troponinas:'troponina','tsh ultrasensible':'tsh','calprotectina fecal':'calprotectina',
 eda:'endoscopia','endoscopia digestiva alta':'endoscopia'
};
const canonical=s=>alias[norm(s)]||norm(s);

function generic(name){
 const n=canonical(name);
 if(normal[n])return normal[n];
 if(/cultivo/.test(n))return 'Sin desarrollo microbiológico significativo.';
 if(/serolog|anticuerpo|antigen|hiv|hbsag|hcv|vdrl/.test(n))return 'Resultado negativo / no reactivo.';
 if(/tomograf|tac|\btc\b|resonan|rmn|\brm\b|ecograf|eco|radiograf|\brx\b|pet|gammagraf/.test(n))return 'Sin hallazgos patológicos agudos relacionados con el cuadro actual.';
 if(/endosc|colonosc|broncosc|cistosc/.test(n))return 'Sin lesiones macroscópicas significativas relacionadas con el cuadro actual.';
 if(/biops|anatomia patolog|citolog/.test(n))return 'Sin alteraciones histopatológicas específicas relacionadas con el cuadro actual.';
 if(/electrocard|ecg|holter|ergometr|espirometr|electroencef|emg/.test(n))return 'Estudio funcional dentro de parámetros esperables, sin hallazgos agudos relevantes.';
 return 'Resultado dentro de parámetros de referencia, sin alteraciones clínicamente significativas.';
}

// Game clock: 1 real second = 1 in-game minute; 60 real seconds = 1 in-game hour.
function delayFor(study){
 const n=norm(study);
 const urgent=/\burgente\b|\bstat\b/.test(n);
 if(/glucemia capilar|saturacion|oximetr|test rapido/.test(n)) return urgent?8000:15000; // 8–15 game min
 if(/hemograma|lactato|gasometr|ionograma|electrol|glucemia|urea|creatin|hepatograma|amilasa|lipasa|tropon|coagul|pcr\b|vsg/.test(n)) return urgent?20000:40000; // 20–40 game min
 if(/orina|sedimento|embarazo|beta hcg|d dimero|dimero d/.test(n)) return urgent?25000:50000; // 25–50 game min
 if(/radiograf|\brx\b|electrocard|ecg/.test(n)) return urgent?30000:60000; // 0.5–1 game h
 if(/ecograf|doppler/.test(n)) return urgent?45000:90000; // 0.75–1.5 game h
 if(/tomograf|tac|\btc\b|angio/.test(n)) return urgent?60000:105000; // 1–1.75 game h
 if(/resonan|rmn|\brm\b/.test(n)) return urgent?120000:240000; // 2–4 game h
 if(/endosc|colonosc|broncosc|cistosc/.test(n)) return urgent?120000:210000; // 2–3.5 game h
 if(/biops|anatomia patolog|citolog/.test(n)) return urgent?180000:360000; // 3–6 game h (accelerated educational turnaround)
 if(/hemocult|coprocult|urocult|cultivo/.test(n)) return urgent?180000:300000; // 3–5 game h accelerated
 if(/serolog|anticuerpo|antigen|hiv|hbsag|hcv|vdrl|tsh|t4|ferrit|b12|vitamina|folato/.test(n)) return urgent?90000:180000; // 1.5–3 game h
 return urgent?30000:60000;
}

function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function write(v){try{localStorage.setItem(KEY,JSON.stringify(v.slice(-100)))}catch{}}

function studyFrom(raw){
 raw=(raw||'').trim(); if(!raw)return null;
 if(/^\/estudio\s+/i.test(raw))return raw.replace(/^\/estudio\s+/i,'').trim();
 if(/^\/orden\s+/i.test(raw))return raw.replace(/^\/orden\s+/i,'').trim();
 if(raw.startsWith('/')){
   const q=raw.slice(1).trim(),first=norm(q).split(' ')[0];
   if(reserved.has(first))return null;
   return q;
 }
 const m=raw.match(/^(?:pedir|solicitar|hacer|quiero|hagamos)\s+(?:un|una|el|la)?\s*(.+)$/i);
 return m?m[1].trim():null;
}

let last=null;
function capture(el){
 const study=studyFrom(el?.value||'');
 if(study)last={study,ts:Date.now(),handled:false};
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.target?.matches?.('input,textarea'))capture(e.target)},true);
document.addEventListener('submit',e=>{const el=e.target?.querySelector?.('input,textarea');if(el)capture(el)},true);
document.addEventListener('click',e=>{
 const b=e.target?.closest?.('button,[role="button"]'); if(!b)return;
 const s=norm((b.textContent||'')+' '+(b.getAttribute('aria-label')||'')+' '+(b.getAttribute('title')||''));
 if(/enviar|send|enter|retorno|↵/.test(s)){
   const el=[...document.querySelectorAll('input,textarea')].filter(x=>x.offsetParent!==null&&!x.disabled).find(x=>(x.value||'').trim().length);
   if(el)capture(el);
 }
 if(/\bestudios\b/.test(s))setTimeout(render,80);
},true);

function rejectionText(s){
 const n=norm(s);
 return /no reconozco ese estudio en este caso|no pude traducir esa orden|estudio no disponible|no esta disponible|no se puede solicitar|proba \/estudio|probá \/estudio/.test(n);
}
function latest(){return last&&!last.handled&&Date.now()-last.ts<12000?last:null}

function createFallback(study){
 const all=read();
 const rec={id:'s'+Date.now()+Math.random().toString(36).slice(2,6),study,status:'pending',requestedAt:Date.now(),result:null,etaMs:delayFor(study)};
 all.push(rec);write(all);render();
 setTimeout(()=>{
   const rows=read(),x=rows.find(r=>r.id===rec.id);
   if(!x)return;
   x.status='ready';x.result=generic(x.study);x.readyAt=Date.now();write(rows);render();
 },rec.etaMs);
 return rec;
}

function handleMutation(root){
 const x=latest(); if(!x)return;
 const nodes=[];
 if(root.nodeType===3)nodes.push(root);
 else if(root.nodeType===1){nodes.push(root);nodes.push(...root.querySelectorAll('*'))}
 for(const n of nodes){
   if(!rejectionText(n.textContent||''))continue;
   x.handled=true;
   const target=n.nodeType===3?n:n.firstChild||n;
   if(target.nodeType===3)target.nodeValue=(target.nodeValue||'').replace(/No reconozco ese estudio en este caso\.?/i,x.study+' solicitado. Resultado pendiente.').replace(/No pude traducir esa orden\.[^.]*/i,x.study+' solicitado. Resultado pendiente.').replace(/Estudio no disponible[^.]*/i,x.study+' solicitado. Resultado pendiente.').replace(/No se puede solicitar ese estudio\.?/i,x.study+' solicitado. Resultado pendiente.');
   createFallback(x.study);return;
 }
}
const obs=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)handleMutation(n)});
if(document.body)obs.observe(document.body,{childList:true,subtree:true,characterData:true});

function findRequestedBox(){
 const els=[...document.querySelectorAll('div,section,article')].filter(e=>e.offsetParent!==null);
 let best=null,bestLen=1e9;
 for(const el of els){
   const t=norm(el.textContent||'');
   if(t.includes('estudios solicitados')&&t.length<bestLen){best=el;bestLen=t.length}
 }
 return best;
}
function fmtEta(ms){const gm=Math.round(ms/1000);return gm<60?gm+' min de juego':'~'+(gm/60).toFixed(gm%60?1:0)+' h de juego'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function render(){
 const box=findRequestedBox(); if(!box)return;
 let host=box.querySelector('#atria-fallback-studies-483');
 if(!host){host=document.createElement('div');host.id='atria-fallback-studies-483';host.style.cssText='margin-top:8px;display:grid;gap:8px';box.appendChild(host)}
 const rows=read();
 for(const el of [...box.querySelectorAll('*')]){
   if(el===host||host.contains(el))continue;
   if(norm(el.textContent||'')==='todavia no solicitaste estudios.')el.style.display=rows.length?'none':'';
 }
 host.innerHTML=rows.map(r=>{
   const body=r.status==='pending'
    ?'<div style="opacity:.76;font-size:.92em">Solicitado · pendiente · ETA '+fmtEta(r.etaMs||60000)+'</div>'
    :'<div style="font-size:.92em;line-height:1.35">'+esc(r.result)+'</div>';
   return '<div style="padding:9px 10px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.03)"><div style="font-weight:800">'+esc(r.study)+'</div>'+body+'</div>';
 }).join('');
}
window.addEventListener('atria:study-result',render);
setInterval(()=>{if(findRequestedBox())render()},1500);
})();