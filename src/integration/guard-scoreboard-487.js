/**
 * Compact in-guard performance HUD for ATRIA 4.8.7 QA.
 * Read-only presentation. Player XP comes from confirmed native career
 * receipts, never from competitive points or estimated clinical quality.
 */
export function guardScoreModel487({mode,players=[],patients=[],solo={}}={}){
 const num=x=>Number.isFinite(Number(x))?Number(x):0;
 const integer=x=>Math.max(-100000,Math.min(100000,Math.round(num(x))));
 if(mode==='solo'||mode==='coop'){
  const resolved=mode==='solo'?Math.max(0,integer(solo.resolved)):
   patients.filter(p=>p?.result?.safe===true&&p.state==='done').length;
  const xp=mode==='solo'?integer(solo.xp):
   players.reduce((s,p)=>s+integer(p?.xpGuard487),0);
  return {mode,players:[],resolved,xp};
 }
 if(mode!=='competitive')return null;
 const entries=players.slice(0,4).map((p,index)=>{
  const mine=patients.filter(c=>c.ownerId===p.id&&c.result&&c.state==='done');
  return {id:String(p.id||''),name:String(p.name||'Jugador').slice(0,40),
   resolved:mine.filter(c=>c.result.safe===true).length,
   xp:integer(p.xpGuard487),
   points:mine.reduce((s,c)=>s+integer(c.result.points),0),
   safe:mine.filter(c=>c.result.safe===true).length,
   index};
 });
 const ranked=[...entries].sort((a,b)=>b.points-a.points||b.safe-a.safe||a.index-b.index);
 const lead=ranked.length&&ranked[0].points>0&&
  (ranked.length===1||ranked[0].points!==ranked[1].points||ranked[0].safe!==ranked[1].safe)
   ?ranked[0].id:null;
 return {mode,players:entries.map(p=>({...p,leader:p.id===lead})),resolved:0,xp:0};
}
function bootGuardScore487(compute){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const show=x=>Number(x)>=0?'+'+Number(x):String(x);
 const fmt=x=>String(Math.max(0,Math.floor(Number(x)||0))).padStart(2,'0');
 let session=null,solo={resolved:0,xp:0},seen=new WeakSet(),previous='',card=null;
 function soloSession(){
  const root=typeof shiftSession!=='undefined'&&shiftSession?.active?shiftSession:
   typeof sim!=='undefined'?sim:null;
  if(root!==session){session=root;solo={resolved:0,xp:0};seen=new WeakSet();}
 }
 const baseRegister=window.nsRegisterOutcome;
 if(typeof baseRegister==='function')window.nsRegisterOutcome=function(target,id){
  const value=baseRegister.apply(this,arguments);
  const challenge=window.csV41Challenge;
  if(!challenge?.active&&target?.playMode==='solo'&&!target?.__csRemoteMirror487){
   soloSession();
   const c=target.__nsCareerReceipt||target.nsOutcome?.career;
   if(c&&!c.pending&&!seen.has(target)){
    seen.add(target);
    if(c.resolved===true)solo.resolved++;
    solo.xp+=Number.isFinite(Number(c.xpDelta))?Number(c.xpDelta):Number(c.xp)||0;
   }
   render();
  }
  return value;
 };
 function view(){
  const c=window.csV41Challenge;
  if(c?.active&&(c.mode==='coop'||c.mode==='competitive'))
   return compute({mode:c.mode,players:c.players,patients:c.patients});
  if(typeof sim==='undefined'||!sim||sim.playMode!=='solo')return null;
  soloSession();
  return compute({mode:'solo',solo});
 }
 function render(){
  if(!card){card=document.createElement('section');card.id='atriaGuardScore487';
   card.setAttribute('aria-label','Marcador de esta guardia');
   card.setAttribute('aria-live','off');document.body.appendChild(card);}
  if(document.body.classList.contains('selectorMode')||
     document.body.classList.contains('nsLobbyMode')||
     document.body.classList.contains('qaMode')){
   card.dataset.visible='0';previous='';return;
  }
  const model=view();
  if(!model){card.dataset.visible='0';previous='';return;}
  const signature=JSON.stringify(model);
  card.dataset.visible='1';card.dataset.mode=model.mode;
  card.dataset.count=String(model.players?.length||0);
  if(signature===previous)return;
  previous=signature;
  if(model.mode!=='competitive'){
   const word=model.mode==='coop'?'EQUIPO · GUARDIA ACTUAL':'GUARDIA ACTUAL';
   card.innerHTML='<div class="ags-shell ags-summary"><div class="ags-eyebrow">'+word+'</div>'+
    '<div class="ags-metrics"><div class="ags-stat"><span>CASOS RESUELTOS</span><strong>'+fmt(model.resolved)+'</strong></div>'+
    '<i aria-hidden="true"></i><div class="ags-stat"><span>EXP EN ESTA GUARDIA</span><strong class="ags-xp">'+show(model.xp)+'</strong></div></div></div>';
  }else{
   const cards=model.players.map(p=>'<div class="ags-player'+(p.leader?' ags-leading':'')+'">'+
    '<div class="ags-player-name">'+(p.leader?'<b class="ags-crown" aria-label="Líder">✦</b>':'')+
    '<span title="'+esc(p.name)+'">'+esc(p.name)+'</span></div>'+
    '<div class="ags-player-stats"><div><small>CASOS</small><strong>'+fmt(p.resolved)+'</strong></div>'+
    '<div><small>EXP</small><strong>'+show(p.xp)+'</strong></div></div></div>').join('');
   card.innerHTML='<div class="ags-shell ags-competition">'+
    '<div class="ags-eyebrow"><span class="ags-live"></span> GUARDIA COMPETITIVA</div>'+
    '<div class="ags-grid">'+cards+'</div></div>';
  }
 }
 window.atriaGuardScore487={render,model:()=>view()};
 window.setInterval(render,500);
 render();
}
export function applyGuardScoreboard487(html){
 if(typeof html!=='string'||html.split('</head>').length!==2||html.split('</body>').length!==2)
  throw Error('ATRIA guard scoreboard: HTML close tags are not unique');
 const css=[
 '#atriaGuardScore487{position:fixed;z-index:85;top:calc(112px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 18px);pointer-events:none;display:none;box-sizing:border-box;font-family:inherit;color:#e8f6f3;font-variant-numeric:tabular-nums;}',
 '#atriaGuardScore487[data-visible="1"]{display:block;}',
 '#atriaGuardScore487[data-mode="coop"],#atriaGuardScore487[data-mode="competitive"]{top:calc(116px + env(safe-area-inset-top));}',
 '#atriaGuardScore487 .ags-shell{background:rgba(6,27,33,.79);border:1px solid rgba(132,205,189,.25);border-radius:15px;box-shadow:0 9px 25px rgba(0,0,0,.22);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:7px 12px 9px;}',
 '#atriaGuardScore487 .ags-eyebrow{font-size:8px;letter-spacing:1.6px;text-align:center;color:#a4cabe;font-weight:750;margin-bottom:5px;white-space:nowrap;}',
 '#atriaGuardScore487 .ags-metrics{display:flex;align-items:center;justify-content:center;gap:13px;}',
 '#atriaGuardScore487 .ags-metrics>i{display:block;width:1px;height:28px;background:rgba(144,203,190,.24);}',
 '#atriaGuardScore487 .ags-stat{display:flex;flex-direction:column;align-items:center;gap:1px;white-space:nowrap;}',
 '#atriaGuardScore487 .ags-stat>span{font-size:8px;color:#a6bcb9;font-weight:680;letter-spacing:.4px;}',
 '#atriaGuardScore487 .ags-stat>strong{font-size:18px;line-height:1.1;font-weight:760;color:#f1fbf7;}',
 '#atriaGuardScore487 .ags-stat>strong.ags-xp{color:#9ce8c9;}',
 '#atriaGuardScore487 .ags-competition{width:min(592px,calc(100vw - 24px));padding:7px 8px 8px;}',
 '#atriaGuardScore487 .ags-live{display:inline-block;width:5px;height:5px;border-radius:50%;background:#67c7a8;vertical-align:1px;margin-right:3px;}',
 '#atriaGuardScore487 .ags-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;}',
 '#atriaGuardScore487 .ags-player{min-width:0;padding:6px 8px 5px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(183,225,216,.10);}',
 '#atriaGuardScore487 .ags-player.ags-leading{background:rgba(206,172,93,.09);border-color:rgba(223,187,104,.4);}',
 '#atriaGuardScore487 .ags-player-name{display:flex;align-items:center;justify-content:center;gap:4px;min-width:0;font-size:10px;font-weight:750;margin-bottom:5px;}',
 '#atriaGuardScore487 .ags-player-name>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
 '#atriaGuardScore487 .ags-crown{font-size:12px;color:#edc783;font-weight:900;}',
 '#atriaGuardScore487 .ags-player-stats{display:flex;justify-content:space-around;gap:5px;align-items:baseline;}',
 '#atriaGuardScore487 .ags-player-stats>div{display:flex;align-items:baseline;gap:4px;white-space:nowrap;}',
 '#atriaGuardScore487 .ags-player-stats small{font-size:8px;color:#a8c9bf;font-weight:700;letter-spacing:.2px;}',
 '#atriaGuardScore487 .ags-player-stats strong{font-size:15px;line-height:1;font-weight:770;color:#f2faf6;}',
 '#atriaGuardScore487 .ags-leading .ags-player-stats strong{color:#f3ddac;}',
 '@media(min-width:700px){#atriaGuardScore487[data-count="3"] .ags-grid{grid-template-columns:repeat(3,minmax(0,1fr));}#atriaGuardScore487[data-count="4"] .ags-grid{grid-template-columns:repeat(4,minmax(0,1fr));}}',
 '@media(max-width:430px){#atriaGuardScore487 .ags-shell{padding:6px 8px 7px;border-radius:12px;}#atriaGuardScore487 .ags-stat>span{font-size:7px;}#atriaGuardScore487 .ags-metrics{gap:9px;}#atriaGuardScore487 .ags-player{padding:5px 6px;}#atriaGuardScore487 .ags-player-name{font-size:9px;}#atriaGuardScore487 .ags-player-stats small{font-size:7px;}#atriaGuardScore487 .ags-player-stats strong{font-size:13px;}}',
 'body.nsLobbyMode #atriaGuardScore487,body.selectorMode #atriaGuardScore487,body.qaMode #atriaGuardScore487{display:none!important;}'
 ].join('');
 const script='<script id="atria-guard-scoreboard-runtime-487">(function(){const compute='+guardScoreModel487.toString()+';('+bootGuardScore487.toString()+')(compute);})();</script>';
 return html.replace('</head>','<style id="atria-guard-scoreboard-style-487">'+css+'</style></head>')
  .replace('</body>',script+'</body>');
}
