(()=>{
'use strict';
if(window.__atriaStudyRejectFallback482)return;
window.__atriaStudyRejectFallback482=true;

const KEY='atria.studyFallback.v481';
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const recent=[];

function extract(raw){
  raw=(raw||'').trim();
  if(!raw)return null;
  let m=raw.match(/^\/estudio\s+(.+)$/i);
  if(m)return m[1].trim();
  m=raw.match(/^\/orden\s+(.+)$/i);
  if(m)return m[1].trim();
  return null;
}

function remember(raw){
  const study=extract(raw);
  if(!study)return;
  const now=Date.now();
  recent.push({study,ts:now,used:false});
  while(recent.length>20)recent.shift();
}

document.addEventListener('input',e=>{
  if(e.target?.matches?.('input,textarea'))remember(e.target.value);
},true);
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target?.matches?.('input,textarea'))remember(e.target.value);
},true);
document.addEventListener('submit',e=>{
  const el=e.target?.querySelector?.('input,textarea');
  if(el)remember(el.value);
},true);

function latest(){
  const now=Date.now();
  for(let i=recent.length-1;i>=0;i--){
    const x=recent[i];
    if(!x.used && now-x.ts<20000)return x;
  }
  return null;
}

function generic(study){
  const n=norm(study);
  const fixed={
    lipasa:'Lipasa 34 U/L, dentro de rango.',
    amilasa:'Amilasa 62 U/L, dentro de rango.',
    tsh:'TSH 2,1 mUI/L.',
    troponina:'Troponina ultrasensible <6 ng/L, negativa.',
    'vitamina b12':'Vitamina B12 420 pg/mL.',
    b12:'Vitamina B12 420 pg/mL.',
    ferritina:'Ferritina 118 ng/mL.',
    lactato:'Lactato 1,2 mmol/L.',
    gasometria:'pH 7,40 · pCO₂ 40 mmHg · HCO₃⁻ 24 mmol/L · lactato 1,2 mmol/L.'
  };
  if(fixed[n])return fixed[n];
  if(/cultivo/.test(n))return 'Sin desarrollo microbiológico significativo.';
  if(/serolog|anticuerpo|antigen|hiv|hbsag|hcv|vdrl/.test(n))return 'Resultado negativo / no reactivo.';
  if(/tomograf|tac|\btc\b|resonan|rmn|\brm\b|ecograf|eco|radiograf|\brx\b|pet|gammagraf/.test(n))return 'Sin hallazgos patológicos agudos relacionados con el cuadro actual.';
  if(/endosc|colonosc|broncosc|cistosc/.test(n))return 'Sin lesiones macroscópicas significativas relacionadas con el cuadro actual.';
  if(/biops|anatomia patolog|citolog/.test(n))return 'Sin alteraciones histopatológicas específicas relacionadas con el cuadro actual.';
  return 'Resultado dentro de parámetros de referencia, sin alteraciones clínicamente significativas.';
}

function delayFor(study){
  const n=norm(study);
  if(/tomograf|tac|resonan|rmn|ecograf|radiograf|\brx\b|pet|gammagraf/.test(n))return 6000;
  if(/endosc|colonosc|broncosc|cistosc|biops/.test(n))return 8000;
  return 3500;
}

function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function save(a){try{localStorage.setItem(KEY,JSON.stringify(a.slice(-80)))}catch{}}

function createFallback(study){
  const rows=load();
  const sig=norm(study);
  const duplicate=rows.find(x=>norm(x.study)===sig && Date.now()-(x.requestedAt||0)<1500);
  if(duplicate)return;
  const rec={id:'u'+Date.now()+Math.random().toString(36).slice(2,6),study,status:'pending',requestedAt:Date.now(),result:null};
  rows.push(rec); save(rows);
  window.dispatchEvent(new CustomEvent('atria:study-result',{detail:rec}));
  setTimeout(()=>{
    const a=load(),x=a.find(v=>v.id===rec.id);
    if(!x)return;
    x.status='ready';x.result=generic(study);x.readyAt=Date.now();save(a);
    window.dispatchEvent(new CustomEvent('atria:study-result',{detail:x}));
  },delayFor(study));
}

function isRejectionText(s){
  const n=norm(s);
  return n.includes('no reconozco ese estudio en este caso') ||
         n.includes('no pude traducir esa orden') ||
         n.includes('estudio no disponible en este caso') ||
         n.includes('no se puede solicitar ese estudio');
}

function scan(){
  const x=latest();
  if(!x)return;
  const root=document.body;
  if(!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let n;
  while((n=w.nextNode())){
    if(!n.nodeValue || !isRejectionText(n.nodeValue))continue;
    x.used=true;
    n.nodeValue=n.nodeValue.replace(/No reconozco ese estudio en este caso\.?/i, x.study+' solicitado. Resultado pendiente.')
                           .replace(/No pude traducir esa orden\.[^.]*/i, x.study+' solicitado. Resultado pendiente.')
                           .replace(/Estudio no disponible en este caso\.?/i, x.study+' solicitado. Resultado pendiente.')
                           .replace(/No se puede solicitar ese estudio\.?/i, x.study+' solicitado. Resultado pendiente.');
    createFallback(x.study);
    break;
  }
}

const mo=new MutationObserver(scan);
if(document.body)mo.observe(document.body,{childList:true,subtree:true,characterData:true});
const iv=setInterval(scan,180);
setTimeout(()=>clearInterval(iv),1000*60*60);
})();