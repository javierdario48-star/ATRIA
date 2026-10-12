/* ATRIA Object Editor v0.1 — independent map experiment; source BG unchanged.
   P31 is a supervised CANDIDATE, not visually approved. No generated pixels. */
(function(){
'use strict';
const DATA = [{"id":"P01","center":[457,24],"extent":[19,31],"family":"foliage_pot"},{"id":"P02","center":[572,25],"extent":[19,31],"family":"foliage_pot"},{"id":"P03","center":[26,147],"extent":[21,35],"family":"foliage_pot"},{"id":"P04","center":[169,143],"extent":[21,35],"family":"foliage_pot"},{"id":"P05","center":[208,222],"extent":[23,32],"family":"foliage_pot"},{"id":"P06","center":[379,182],"extent":[20,32],"family":"foliage_pot"},{"id":"P07","center":[412,209],"extent":[20,34],"family":"foliage_pot"},{"id":"P08","center":[559,105],"extent":[19,29],"family":"foliage_pot"},{"id":"P09","center":[611,216],"extent":[22,32],"family":"foliage_pot"},{"id":"P10","center":[842,256],"extent":[19,32],"family":"foliage_pot"},{"id":"P11","center":[992,146],"extent":[21,30],"family":"foliage_pot"},{"id":"P12","center":[376,355],"extent":[25,35],"family":"foliage_pot"},{"id":"P13","center":[649,334],"extent":[26,37],"family":"foliage_pot"},{"id":"P14","center":[803,353],"extent":[20,31],"family":"foliage_pot"},{"id":"P15","center":[992,358],"extent":[20,35],"family":"foliage_pot"},{"id":"P16","center":[329,515],"extent":[27,39],"family":"foliage_pot"},{"id":"P17","center":[651,515],"extent":[29,39],"family":"foliage_pot"},{"id":"P18","center":[723,540],"extent":[28,40],"family":"foliage_pot"},{"id":"P19","center":[412,621],"extent":[21,30],"family":"small"},{"id":"P20","center":[613,625],"extent":[23,32],"family":"small"},{"id":"P21","center":[211,635],"extent":[21,31],"family":"foliage_pot"},{"id":"P22","center":[30,686],"extent":[21,29],"family":"foliage_pot"},{"id":"P23","center":[993,682],"extent":[22,31],"family":"foliage_pot"},{"id":"P24","center":[815,642],"extent":[21,29],"family":"foliage_pot"},{"id":"P25","center":[30,835],"extent":[21,30],"family":"foliage_pot"},{"id":"P26","center":[212,824],"extent":[20,33],"family":"foliage_pot"},{"id":"P27","center":[342,795],"extent":[28,39],"family":"foliage_pot"},{"id":"P28","center":[697,771],"extent":[25,36],"family":"foliage_pot"},{"id":"P29","center":[814,828],"extent":[22,30],"family":"foliage_pot"},{"id":"P30","center":[993,832],"extent":[20,33],"family":"foliage_pot"},{"id":"P31","center":[322,957],"extent":[26,39],"family":"foliage_pot"},{"id":"P32","center":[696,957],"extent":[27,39],"family":"foliage_pot"},{"id":"P33","center":[409,1001],"extent":[23,35],"family":"foliage_pot"},{"id":"P34","center":[616,1001],"extent":[23,35],"family":"foliage_pot"},{"id":"P35","center":[510,1037],"extent":[20,30],"family":"small"},{"id":"P36","center":[45,1004],"extent":[22,35],"family":"small"},{"id":"P37","center":[229,1011],"extent":[24,35],"family":"small"},{"id":"P38","center":[890,1083],"extent":[21,29],"family":"small"},{"id":"P39","center":[346,1155],"extent":[26,36],"family":"foliage_pot"},{"id":"P40","center":[670,1155],"extent":[26,36],"family":"foliage_pot"},{"id":"P41","center":[385,1317],"extent":[26,38],"family":"foliage_pot"},{"id":"P42","center":[638,1316],"extent":[26,38],"family":"foliage_pot"},{"id":"P43","center":[948,1262],"extent":[22,31],"family":"foliage_pot"},{"id":"P44","center":[982,1350],"extent":[20,32],"family":"foliage_pot"},{"id":"P45","center":[700,1429],"extent":[24,34],"family":"foliage_pot"},{"id":"P46","center":[318,1435],"extent":[31,43],"family":"large"}];
const RECORDS = new Map(DATA.map(p=>[p.id,p]));
const P31_BOX=[288,905,68,115];
const POT31=[[23,59],[27,57],[32,57],[37,58],[43,59],[46,61],[48,64],[48,70],[48,76],[47,82],[44,86],[40,89],[36,90],[31,90],[27,89],[23,87],[21,84],[20,80],[20,76],[20,70],[20,65],[21,62]];
const FOL31=[[16,31],[20,29],[26,29],[29,28],[30,25],[33,23],[36,24],[39,29],[42,32],[46,30],[49,31],[50,33],[49,37],[46,40],[51,41],[54,44],[54,47],[50,51],[52,54],[52,57],[48,59],[44,59],[42,62],[38,64],[33,64],[28,62],[25,60],[21,60],[18,59],[15,58],[14,54],[14,48],[15,44],[19,41],[20,37],[17,35]];
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const state={active:false,tool:'alpha',selected:'P31',paint:'erase',brush:3,hardness:100,zoom:1,panX:0,panY:0,bg:'checker',compare:false,objects:new Map(),undo:[],redo:[],pointer:new Map(),previewPointers:new Map(),drag:null,dirty:false};
const cutCanvas=document.createElement('canvas'),cutCtx=cutCanvas.getContext('2d',{willReadFrequently:true});
const inPoly=(x,y,pts)=>{let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside};
const rgbHsv=(r,g,b)=>{r/=255;g/=255;b/=255;let max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,h=0;if(d){switch(max){case r:h=((g-b)/d)%6;break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h=(h*60+360)%360;}return [h,max?d/max:0,max]};
function boxFor(p){if(p.id==='P31')return P31_BOX.slice();const rx=p.extent[0],ry=p.extent[1],x=p.center[0],y=p.center[1];let x0=Math.max(0,x-rx-8),y0=Math.max(0,y-ry-13);return [x0,y0,Math.min(1024,x+rx+8)-x0,Math.min(1536,y+ry+24)-y0]}
function makeObject(p){
 const bb=boxFor(p),[x,y,w,h]=bb;
 cutCanvas.width=w;cutCanvas.height=h;cutCtx.clearRect(0,0,w,h);cutCtx.drawImage(sceneImg,x,y,w,h,0,0,w,h);
 const rgb=cutCtx.getImageData(0,0,w,h).data,alpha=new Uint8Array(w*h),foliage=new Uint8Array(w*h),occlusion=new Uint8Array(w*h),pot=new Uint8Array(w*h);
 const lx=p.center[0]-x,ly=p.center[1]-y,rx=p.extent[0],ry=p.extent[1];
 const green=new Uint8Array(w*h);
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
   const i=yy*w+xx,k=i*4,[hue,sat,val]=rgbHsv(rgb[k],rgb[k+1],rgb[k+2]);
   const inCrown=((xx-lx)/(rx*1.13))**2+((yy-ly)/(ry*1.1))**2<=1;
   const candidate=p.id==='P31'?inPoly(xx+.5,yy+.5,FOL31):inCrown&&yy<ly+ry*.61;
   green[i]=candidate&&hue>=50&&hue<=190&&sat>.18&&val>.09?1:0;
 }
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
   const i=yy*w+xx;
   if(p.id==='P31'){
     const inLeaf=inPoly(xx+.5,yy+.5,FOL31)&&yy<=64;
     const k=i*4,[hh,ss]=rgbHsv(rgb[k],rgb[k+1],rgb[k+2]);
     let near=!!green[i];
     for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(xx+dx>=0&&xx+dx<w&&yy+dy>=0&&yy+dy<h&&green[(yy+dy)*w+xx+dx])near=true;
     foliage[i]=inLeaf&&near&&!(hh>=192&&hh<=272&&ss>.18)?255:0;
     pot[i]=inPoly(xx+.5,yy+.5,POT31)?255:0;
   } else {
     let near=!!green[i];
     for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(xx+dx>=0&&xx+dx<w&&yy+dy>=0&&yy+dy<h&&green[(yy+dy)*w+xx+dx])near=true;
     foliage[i]=near&&yy<ly+ry*.65?255:0;
     const fx=(xx-lx)/Math.max(7,rx*.52),fy=(yy-(ly+ry*.70))/Math.max(8,ry*.46);
     pot[i]=fx*fx+fy*fy<=1?255:0;
   }
   alpha[i]=Math.max(pot[i],foliage[i]);occlusion[i]=foliage[i];
 }
 const c=p.id==='P31'?{x:322,y:988,rx:13,ry:7,rearLift:6,rearExtraY:5,frontExtraY:0,sideExtraX:0,charRadius:7}:{x:p.center[0],y:Math.round(p.center[1]+ry*.68),rx:Math.max(5,rx*.48),ry:Math.max(5,ry*.21),rearLift:6,rearExtraY:5,frontExtraY:0,sideExtraX:0,charRadius:7};
 const depth=p.id==='P31'?995:Math.round(p.center[1]+ry*.75);
 const obj={id:p.id,bbox:bb,rgb,alpha,foliage,occlusion,pot,originalAlpha:alpha.slice(),originalFoliage:foliage.slice(),originalOcclusion:occlusion.slice(),collision:c,originalCollision:{...c},depth,originalDepth:depth,approved:false,modified:false,cache:null};
 state.objects.set(obj.id,obj);return obj;
}
function get(id){if(!state.objects.has(id)){if(!sceneImg.complete||!sceneImg.naturalWidth)throw Error('El mapa original aún no cargó');return makeObject(RECORDS.get(id))}return state.objects.get(id)}
function sprite(o,layer){
 if(!o.cache)o.cache={};
 if(o.cache[layer])return o.cache[layer];
 const [,,w,h]=o.bbox,can=document.createElement('canvas');can.width=w;can.height=h;const c=can.getContext('2d'),im=c.createImageData(w,h),mask=o[layer];im.data.set(o.rgb);
 for(let i=0;i<mask.length;i++)im.data[i*4+3]=mask[i];
 c.putImageData(im,0,0);o.cache[layer]=can;return can;
}
function flush(o){o.cache=null;state.dirty=true;}
function blockedPot(o,x,y){const c=o.collision,behind=y<c.y,cy=behind?c.y-c.rearLift:c.y;
 const ry=Math.max(1,c.ry+c.charRadius+(behind?c.rearExtraY:c.frontExtraY));
 const rx=Math.max(1,c.rx+c.sideExtraX+c.charRadius);
 return ((x-c.x)/rx)**2+((y-cy)/ry)**2<1;
}
function capture(o){return {id:o.id,alpha:o.alpha.slice(),foliage:o.foliage.slice(),occlusion:o.occlusion.slice(),collision:{...o.collision},depth:o.depth,approved:o.approved,modified:o.modified}}
function restore(v){const o=get(v.id);o.alpha=v.alpha.slice();o.foliage=v.foliage.slice();o.occlusion=v.occlusion.slice();o.collision={...v.collision};o.depth=v.depth;o.approved=v.approved;o.modified=v.modified;flush(o);if(o.id===state.selected)drawPreview();}
function remember(){const o=get(state.selected);state.undo.push(capture(o));if(state.undo.length>24)state.undo.shift();state.redo=[];o.modified=true;state.dirty=true;}
function undo(){if(!state.undo.length)return;const s=state.undo.pop();state.redo.push(capture(get(s.id)));restore(s);select(s.id,false)}
function redo(){if(!state.redo.length)return;const s=state.redo.pop();state.undo.push(capture(get(s.id)));restore(s);select(s.id,false)}
function renderOverlay(){
 const obj=get(state.selected);
 const d=view.dpr,scale=view.scale;ctx.save();ctx.setTransform(d*scale,0,0,d*scale,d*(view.w/2-view.cx*scale),d*(view.h/2-view.cy*scale));
 if(occlusion){for(const o of state.objects.values()){
    const [x,y,w,h]=o.bbox;
    if(player.y<o.depth&&player.y>y-65&&player.x>x-40&&player.x<x+w+40)
       ctx.drawImage(sprite(o,'occlusion'),x,y);
 }}
 if(state.active){
   const [x,y,w,h]=obj.bbox;ctx.lineWidth=1.2;ctx.strokeStyle='#89e8ea';ctx.setLineDash([4,3]);ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);
   if(state.tool==='collision'){
    const c=obj.collision;ctx.fillStyle='#ff44443b';ctx.strokeStyle='#ff4545';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(c.x,c.y-c.rearLift,c.rx+c.sideExtraX+c.charRadius,c.ry+c.charRadius+c.rearExtraY,0,Math.PI,2*Math.PI);ctx.lineTo(c.x+c.rx+c.sideExtraX+c.charRadius,c.y);ctx.ellipse(c.x,c.y,c.rx+c.sideExtraX+c.charRadius,c.ry+c.charRadius+c.frontExtraY,0,0,Math.PI);ctx.closePath();ctx.fill();ctx.stroke();
    for(const [xx,yy] of [[c.x,c.y],[c.x,c.y-c.rearLift-c.ry-c.charRadius-c.rearExtraY],[c.x+c.rx+c.sideExtraX+c.charRadius,c.y],[c.x,c.y+c.ry+c.charRadius+c.frontExtraY]]){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(xx,yy,4,0,Math.PI*2);ctx.fill();}
   }
   if(state.tool==='depth'){ctx.strokeStyle='#16edff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-20,obj.depth);ctx.lineTo(x+w+20,obj.depth);ctx.stroke();}
 }
 ctx.restore();
}
const basePaint=paint,baseMove=move,baseBlocked=circleBlocked;
paint=function(){
 const prevO=occlusion,prevShow=showMasks,prevEdit=editing;
 occlusion=false;showMasks=false;editing=false;basePaint();
 occlusion=prevO;showMasks=prevShow;editing=prevEdit;
 if(sceneImg.complete&&sceneImg.naturalWidth){renderOverlay();}
};
move=function(dt){if(state.active)return;baseMove(dt);};
circleBlocked=function(x,y,r){if(baseBlocked(x,y,r))return true;
 for(const o of state.objects.values())if((o.id==='P31'||o.modified)&&Math.abs(x-o.collision.x)<65&&Math.abs(y-o.collision.y)<65&&blockedPot(o,x,y))return true;
 return false;
};
const style=document.createElement('style');style.textContent=
 '#tools{max-width:150px;right:8px;top:72px}#tools #edit,#tools #add,#tools #remove,#tools #save,#tools #load,#tools #debug{display:none}'+
 '#oePanel{position:fixed;z-index:7;bottom:max(10px,env(safe-area-inset-bottom));right:8px;width:min(350px,calc(100vw - 16px));max-height:min(85dvh,750px);overflow-y:auto;overscroll-behavior:contain;border:1px solid #5baaa6;border-radius:15px;background:#102b30f2;color:#edfefa;padding:10px;box-shadow:0 8px 24px #0008;font:12px system-ui}'+
 '#oePanel[hidden]{display:none!important}#oePanel button{min-height:36px;padding:6px 8px;font-size:12px}#oePanel select,#oePanel input{color:#fff;background:#23474e;border:1px solid #638a91;min-height:34px;border-radius:7px}'+
 '#oePanel .oeRow{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin:5px 0}#oePanel .oeRow>*{flex:1}#oePanel .oeRow button.current{background:#b4ffdd;color:#0d3637}'+
 '#oePreview{width:100%;height:240px;display:block;touch-action:none;border:1px solid #5b8b8c;border-radius:8px;background:#242f30;image-rendering:pixelated}#oePanel label{display:flex;gap:5px;align-items:center}#oeStatus{font-size:11px;color:#d8d7a3;line-height:1.4}'+
 '@media(max-width:650px){#oePanel{bottom:max(7px,env(safe-area-inset-bottom));right:4px;max-height:68dvh;width:min(340px,calc(100vw - 8px))}#oePreview{height:190px}#oePanel button{min-height:39px}#tools{top:64px}#bottom{font-size:10px}}';
document.head.append(style);
const launcher=document.createElement('button');launcher.id='objectEditBtn';launcher.textContent='✎ Editar objeto';document.getElementById('tools').prepend(launcher);
const panel=document.createElement('section');panel.id='oePanel';panel.hidden=true;
panel.innerHTML='<div class="oeRow"><strong style="font-size:14px">Editor de objetos · Plantas</strong><button id="oeClose">✕</button></div>'+
'<div class="oeRow"><select id="oePick" aria-label="Seleccionar planta"></select><button id="oeFocus">Ir a planta</button></div>'+
'<div class="oeRow" id="oeModes"><button data-mode="alpha">Silueta</button><button data-mode="foliage">Follaje</button><button data-mode="occlusion">Oclusión</button><button data-mode="collision">Colisión</button><button data-mode="depth">Profundidad</button></div>'+
'<canvas id="oePreview" aria-label="Vista ampliada editable de planta"></canvas>'+
'<div class="oeRow" id="oeBgs"><select id="oeBg"><option value="checker">Cuadriculado</option><option value="white">Blanco</option><option value="black">Negro</option><option value="grey">Gris</option><option value="source">Original</option></select><button id="oeCompare">Antes / después</button><button id="oeReset">Restaurar</button></div>'+
'<div class="oeRow"><button id="oeAdd">+ Agregar</button><button id="oeErase">− Quitar</button><label>Pincel <input id="oeBrush" type="range" min="1" max="14" value="3"></label><label>Dureza <input id="oeHard" type="range" min="0" max="100" value="100"></label></div>'+
'<div class="oeRow"><button id="oeUndo">↶ Deshacer</button><button id="oeRedo">↷ Rehacer</button><button id="oeZoomIn">Zoom +</button><button id="oeZoomOut">Zoom −</button></div>'+
'<div id="oeGeometry" hidden><div class="oeRow" id="oeParams"></div></div>'+
'<div class="oeRow"><button id="oeTrial">▶ Probar personaje</button><button id="oeSave">Guardar JSON</button><button id="oeImport">Importar</button><input type="file" id="oeFile" accept=".json,application/json" hidden></div>'+
'<div class="oeRow"><button id="oeExport">PNG RGBA</button><button id="oeZip">ZIP completo</button><button id="oePreset">Guardar plantilla física</button><button id="oeApplyPreset">Aplicar plantilla</button></div>'+
'<div class="oeRow"><button id="oeApprove">Marcar aprobación visual</button></div><div id="oeStatus"></div>';
document.body.append(panel);
const $=id=>document.getElementById(id);
for(const p of DATA){const o=document.createElement('option');o.value=p.id;o.textContent=p.id+' · '+p.family;$('oePick').append(o)}
$('oePick').value='P31';
const preview=$('oePreview'),pctx=preview.getContext('2d',{willReadFrequently:true});
let previewView={scale:1,ox:0,oy:0};
function select(id,reset=true){
 if(!RECORDS.has(id))return;state.selected=id;$('oePick').value=id;if(reset){state.zoom=1;state.panX=0;state.panY=0;}
 const o=get(id);$('oeStatus').textContent=id+(o.approved?' · Aprobación manual':' · PENDIENTE DE APROBACIÓN VISUAL')+' · RGB original conservado · edición local';
 document.querySelectorAll('#oeModes button').forEach(b=>b.classList.toggle('current',b.dataset.mode===state.tool));
 $('oeGeometry').hidden=state.tool!=='collision'&&state.tool!=='depth';
 $('oeApprove').textContent=o.approved?'Revocar aprobación':'Marcar aprobación visual';
 drawParams();drawPreview();
}
function focusObject(){const o=get(state.selected);window.ATRIA_OBJECT_EDITOR_FOCUS={x:o.collision.x,y:o.depth-12};overview=false;zoom=clamp(zoom,3,6);}
function setActive(value){state.active=value;panel.hidden=!value;launcher.classList.toggle('active',value);launcher.textContent=value?'✎ Editando objeto':'✎ Editar objeto';window.ATRIA_OBJECT_EDITOR_EDITING=value;window.ATRIA_OBJECT_EDITOR_FOCUS=value?{x:get(state.selected).collision.x,y:get(state.selected).depth-12}:null;player.path=[];keys.clear();pad.clear();if(value){select(state.selected);focusObject();}else notify('Modo juego: controles normales');}
launcher.onclick=()=>setActive(!state.active);$('oeClose').onclick=()=>setActive(false);$('oeTrial').onclick=()=>setActive(false);$('oePick').onchange=e=>{select(e.target.value);focusObject()};$('oeFocus').onclick=focusObject;
for(const b of document.querySelectorAll('#oeModes button'))b.onclick=()=>{state.tool=b.dataset.mode;select(state.selected,false);};
$('oeBg').onchange=e=>{state.bg=e.target.value;drawPreview()};$('oeCompare').onclick=()=>{state.compare=!state.compare;$('oeCompare').classList.toggle('current',state.compare);drawPreview()};
$('oeAdd').onclick=()=>{state.paint='add';$('oeAdd').classList.add('current');$('oeErase').classList.remove('current')};
$('oeErase').onclick=()=>{state.paint='erase';$('oeErase').classList.add('current');$('oeAdd').classList.remove('current')};$('oeErase').click();
$('oeBrush').oninput=e=>state.brush=Number(e.target.value);$('oeHard').oninput=e=>state.hardness=Number(e.target.value);
$('oeZoomIn').onclick=()=>{state.zoom=clamp(state.zoom*1.4,1,12);drawPreview()};$('oeZoomOut').onclick=()=>{state.zoom=clamp(state.zoom/1.4,1,12);drawPreview()};
$('oeUndo').onclick=undo;$('oeRedo').onclick=redo;
$('oeReset').onclick=()=>{if(!confirm('¿Restaurar la máscara y física original de esta planta?'))return;remember();const o=get(state.selected);o.alpha=o.originalAlpha.slice();o.foliage=o.originalFoliage.slice();o.occlusion=o.originalOcclusion.slice();o.collision={...o.originalCollision};o.depth=o.originalDepth;o.approved=false;flush(o);select(o.id,false)};
function drawParams(){
 const o=get(state.selected),area=$('oeParams');area.replaceChildren();
 if(state.tool==='depth'){const lbl=document.createElement('label');lbl.textContent='Profundidad Y';const v=document.createElement('input');v.type='number';v.value=o.depth;v.style.width='90px';v.onchange=()=>{remember();o.depth=clamp(Number(v.value),0,1536);drawPreview();};lbl.append(v);area.append(lbl);return}
 if(state.tool!=='collision')return;
 const keysC=['rx','ry','rearLift','rearExtraY','frontExtraY','sideExtraX'];
 for(const k of keysC){const label=document.createElement('label');label.style.flex='0 1 45%';label.textContent=k+' ';const v=document.createElement('input');v.type='number';v.step='1';v.min='0';v.value=o.collision[k];v.style.width='60px';v.onchange=()=>{remember();o.collision[k]=clamp(Number(v.value)||0,0,100);drawPreview()};label.append(v);area.append(label)}
}
function drawPreview(){
 if(!sceneImg.complete||!sceneImg.naturalWidth)return;
 const o=get(state.selected),[, ,w,h]=o.bbox;
 const dpr=Math.min(devicePixelRatio||1,2),width=Math.round(preview.clientWidth||310),height=Math.round(preview.clientHeight||220);
 preview.width=Math.round(width*dpr);preview.height=Math.round(height*dpr);
 pctx.setTransform(dpr,0,0,dpr,0,0);pctx.clearRect(0,0,width,height);
 if(state.bg==='checker'){for(let y=0;y<height;y+=12)for(let x=0;x<width;x+=12){pctx.fillStyle=(x/12+y/12)%2===0?'#dfe3e2':'#a6b0ae';pctx.fillRect(x,y,12,12)}}else{pctx.fillStyle={black:'#101010',white:'#fff',grey:'#888',source:'#343b3d'}[state.bg]||'#888';pctx.fillRect(0,0,width,height)}
 const scl=Math.min((width-12)/w,(height-12)/h)*state.zoom,ox=(width-w*scl)/2+state.panX,oy=(height-h*scl)/2+state.panY;
 previewView={scale:scl,ox,oy};
 pctx.save();pctx.translate(ox,oy);pctx.scale(scl,scl);pctx.imageSmoothingEnabled=false;
 if(state.bg==='source')pctx.drawImage(sceneImg,o.bbox[0],o.bbox[1],w,h,0,0,w,h);
 const layer=['alpha','foliage','occlusion'].includes(state.tool)?state.tool:'alpha';
 if(state.compare){const original={alpha:o.originalAlpha,foliage:o.originalFoliage,occlusion:o.originalOcclusion}[layer];const can=document.createElement('canvas');can.width=w;can.height=h;const c=can.getContext('2d'),im=c.createImageData(w,h);im.data.set(o.rgb);for(let i=0;i<original.length;i++)im.data[i*4+3]=original[i];c.putImageData(im,0,0);pctx.drawImage(can,0,0)}else pctx.drawImage(sprite(o,layer),0,0);
 if(state.tool==='collision'){const c=o.collision;const cx=c.x-o.bbox[0],cy=c.y-o.bbox[1];pctx.strokeStyle='#fa4343';pctx.lineWidth=1;pctx.beginPath();pctx.ellipse(cx,cy-c.rearLift,c.rx+c.charRadius+c.sideExtraX,c.ry+c.charRadius+c.rearExtraY,0,Math.PI,2*Math.PI);pctx.ellipse(cx,cy,c.rx+c.charRadius+c.sideExtraX,c.ry+c.charRadius+c.frontExtraY,0,0,Math.PI);pctx.stroke()}
 if(state.tool==='depth'){pctx.strokeStyle='#00e2ff';pctx.lineWidth=1;pctx.beginPath();pctx.moveTo(0,o.depth-o.bbox[1]);pctx.lineTo(w,o.depth-o.bbox[1]);pctx.stroke()}
 pctx.restore();
 $('oeStatus').textContent=state.selected+(o.approved?' · aprobado manualmente':' · PENDIENTE QA')+(state.dirty?' · cambios sin exportar':'')+' · PNG 1:1 · fuente original';
}
function applyBrush(o,xx,yy){
 const mask=o[state.tool],w=o.bbox[2],h=o.bbox[3];
 const rad=state.brush,inner=rad*state.hardness/100;
 for(let y=Math.max(0,Math.floor(yy-rad));y<Math.min(h,Math.ceil(yy+rad));y++)for(let x=Math.max(0,Math.floor(xx-rad));x<Math.min(w,Math.ceil(xx+rad));x++){
  const dist=Math.hypot(x+.5-xx,y+.5-yy);if(dist>rad)continue;
  const t=dist<=inner?1:clamp((rad-dist)/Math.max(.01,rad-inner),0,1);
  const i=y*w+x,current=mask[i],target=state.paint==='add'?255:0;mask[i]=Math.round(current+(target-current)*t);
 }
 if(state.tool==='alpha'){for(let i=0;i<mask.length;i++){o.foliage[i]=Math.min(o.foliage[i],o.alpha[i]);o.occlusion[i]=Math.min(o.occlusion[i],o.alpha[i]);}}
 if(state.tool==='foliage'){for(let i=0;i<mask.length;i++){o.foliage[i]=Math.min(o.alpha[i],o.foliage[i]);o.occlusion[i]=Math.min(o.alpha[i],o.occlusion[i]);}}
 if(state.tool==='occlusion'){for(let i=0;i<mask.length;i++)o.occlusion[i]=Math.min(o.alpha[i],o.occlusion[i]);}
 flush(o);drawPreview();
}
function previewPoint(e){const rect=preview.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;return {x:(x-previewView.ox)/previewView.scale,y:(y-previewView.oy)/previewView.scale,clientX:x,clientY:y}}
let stroke=false,pinch=null;
preview.addEventListener('pointerdown',e=>{
 if(!state.active)return;preview.setPointerCapture(e.pointerId);const p=previewPoint(e);state.previewPointers.set(e.pointerId,p);
 if(state.previewPointers.size===2){stroke=false;const vals=[...state.previewPointers.values()];pinch={dist:Math.hypot(vals[0].clientX-vals[1].clientX,vals[0].clientY-vals[1].clientY),zoom:state.zoom,panX:state.panX,panY:state.panY,midX:(vals[0].clientX+vals[1].clientX)/2,midY:(vals[0].clientY+vals[1].clientY)/2};return;}
 if(state.tool==='alpha'||state.tool==='foliage'||state.tool==='occlusion'){remember();stroke=true;applyBrush(get(state.selected),p.x,p.y)}
});
preview.addEventListener('pointermove',e=>{
 if(!state.previewPointers.has(e.pointerId))return;const p=previewPoint(e);state.previewPointers.set(e.pointerId,p);
 if(state.previewPointers.size===2&&pinch){const vals=[...state.previewPointers.values()],dist=Math.hypot(vals[0].clientX-vals[1].clientX,vals[0].clientY-vals[1].clientY);state.zoom=clamp(pinch.zoom*dist/Math.max(1,pinch.dist),1,12);state.panX=pinch.panX+(vals[0].clientX+vals[1].clientX)/2-pinch.midX;state.panY=pinch.panY+(vals[0].clientY+vals[1].clientY)/2-pinch.midY;drawPreview();return;}
 if(stroke&&state.previewPointers.size===1&&['alpha','foliage','occlusion'].includes(state.tool))applyBrush(get(state.selected),p.x,p.y);
});
function endPreview(e){state.previewPointers.delete(e.pointerId);stroke=false;if(state.previewPointers.size<2)pinch=null}
preview.addEventListener('pointerup',endPreview);preview.addEventListener('pointercancel',endPreview);
function mapPoint(e){return screenToWorld(e.clientX,e.clientY)}
cvs.addEventListener('pointerdown',e=>{
 if(!state.active)return;e.stopImmediatePropagation();e.preventDefault();cvs.setPointerCapture(e.pointerId);const p=mapPoint(e);state.pointer.set(e.pointerId,{...p,cx:e.clientX,cy:e.clientY});
 if(state.pointer.size>1){state.drag=null;return}
 const candidate=DATA.find(v=>{const [x,y,w,h]=boxFor(v);return p.x>=x-7&&p.x<=x+w+7&&p.y>=y-12&&p.y<=y+h+12});
 if(candidate&&candidate.id!==state.selected){select(candidate.id);focusObject();return}
 const o=get(state.selected),c=o.collision;
 if(state.tool==='collision'){remember();const headY=c.y-c.rearLift-c.ry-c.charRadius-c.rearExtraY,outerX=c.x+c.rx+c.sideExtraX+c.charRadius,bottomY=c.y+c.ry+c.charRadius+c.frontExtraY;
 state.drag={tool:'collision',handle:Math.hypot(p.x-c.x,p.y-headY)<13?'rear':Math.hypot(p.x-outerX,p.y-c.y)<13?'side':Math.hypot(p.x-c.x,p.y-bottomY)<13?'front':'center',start:{...c},at:p};}
 else if(state.tool==='depth'){remember();state.drag={tool:'depth',start:o.depth,at:p};}
},true);
cvs.addEventListener('pointermove',e=>{
 if(!state.active)return;e.stopImmediatePropagation();if(!state.pointer.has(e.pointerId))return;
 const p=mapPoint(e),old=state.pointer.get(e.pointerId);state.pointer.set(e.pointerId,{...p,cx:e.clientX,cy:e.clientY});
 if(state.pointer.size===2){const vals=[...state.pointer.values()],dist=Math.hypot(vals[0].cx-vals[1].cx,vals[0].cy-vals[1].cy);if(state.prevMapDist)zoom=clamp(zoom*dist/state.prevMapDist,1,9);state.prevMapDist=dist;return}
 if(state.drag){const o=get(state.selected),c=o.collision;if(state.drag.tool==='depth'){o.depth=clamp(Math.round(state.drag.start+p.y-state.drag.at.y),0,1536);}
 else {const s=state.drag.start,dx=p.x-state.drag.at.x,dy=p.y-state.drag.at.y;
 if(state.drag.handle==='center'){c.x=Math.round(s.x+dx);c.y=Math.round(s.y+dy)}
 if(state.drag.handle==='rear')c.rearExtraY=clamp(Math.round(s.rearExtraY-dy),0,100);
 if(state.drag.handle==='side')c.rx=clamp(Math.round(s.rx+dx),1,90);
 if(state.drag.handle==='front')c.frontExtraY=clamp(Math.round(s.frontExtraY+dy),0,90);}
 drawParams();drawPreview();}
},true);
function endMap(e){if(!state.active)return;e.stopImmediatePropagation();state.pointer.delete(e.pointerId);if(state.pointer.size<2)state.prevMapDist=0;state.drag=null}
cvs.addEventListener('pointerup',endMap,true);cvs.addEventListener('pointercancel',endMap,true);
const encodeMask=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s)};
const decodeMask=(s,n)=>{const raw=atob(s);if(raw.length!==n)throw Error('Máscara con tamaño incorrecto');return Uint8Array.from(raw,c=>c.charCodeAt(0))};
function pack(){
 return {schema:'atria-objects-editor-v1',source:'vendor/atria-4.8.6/index.html:BG_SRC',world:[1024,1536],inventory:DATA.map(p=>({id:p.id,center:p.center,extent:p.extent,family:p.family})),
  objects:[...state.objects.values()].map(o=>({id:o.id,bbox:o.bbox,alpha:encodeMask(o.alpha),foliage:encodeMask(o.foliage),occlusion:encodeMask(o.occlusion),collision:o.collision,depth:o.depth,approved:o.approved,modified:o.modified})),presets:state.presets||[]};
}
function restorePack(doc){
 if(doc.schema!=='atria-objects-editor-v1'||doc.source!=='vendor/atria-4.8.6/index.html:BG_SRC'||!Array.isArray(doc.objects)||doc.objects.length>47)throw Error('Versión, fuente o cantidad no válidas');
 const prepared=[];
 for(const v of doc.objects){if(!RECORDS.has(v.id))throw Error('ID desconocido '+v.id);const o=get(v.id),same=JSON.stringify(v.bbox)===JSON.stringify(o.bbox);if(!same)throw Error('Bounding box incompatible: '+v.id);const n=o.bbox[2]*o.bbox[3];if(!v.collision||!Number.isFinite(v.depth))throw Error('Geometría incorrecta: '+v.id);prepared.push({o,a:decodeMask(v.alpha,n),f:decodeMask(v.foliage,n),oc:decodeMask(v.occlusion,n),c:{...v.collision},depth:v.depth,approved:!!v.approved,modified:!!v.modified});}
 for(const v of prepared){v.o.alpha=v.a;v.o.foliage=v.f;v.o.occlusion=v.oc;v.o.collision=v.c;v.o.depth=v.depth;v.o.approved=v.approved;v.o.modified=v.modified;flush(v.o)}
 state.presets=Array.isArray(doc.presets)?doc.presets:[];state.undo=[];state.redo=[];select(state.selected,false);return prepared.length;
}
function download(bytes,name,type){const blob=bytes instanceof Blob?bytes:new Blob([bytes],{type:type||'application/octet-stream'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000)}
$('oeSave').onclick=()=>{download(JSON.stringify(pack(),null,2),'ATRIA_objetos_configuracion.json','application/json');state.dirty=false;drawPreview();notify('JSON guardado; conservar el archivo descargado')};
$('oeImport').onclick=()=>$('oeFile').click();
$('oeFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>8_000_000)throw Error('Archivo demasiado grande');const n=restorePack(JSON.parse(await f.text()));notify(n+' objetos restaurados exactamente desde JSON');}catch(err){notify('Importación cancelada: '+err.message)}finally{$('oeFile').value=''}};
function pngBlob(o,layer){return new Promise((resolve,reject)=>sprite(o,layer).toBlob(b=>b?resolve(b):reject(Error('PNG falló')),'image/png'))}
$('oeExport').onclick=async()=>{try{const o=get(state.selected);download(await pngBlob(o,'alpha'),'ATRIA_'+o.id+'_RGBA.png','image/png');notify('PNG '+o.id+' exportado (follaje y oclusión en ZIP)')}catch(e){notify(e.message)}};
const CRC_TABLE=new Uint32Array(256);for(let i=0;i<256;i++){let k=i;for(let j=0;j<8;j++)k=(k&1)?(0xedb88320^(k>>>1)):(k>>>1);CRC_TABLE[i]=k>>>0}
function crc32(data){let c=0xffffffff;for(const b of data)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function zipStored(entries){
 const enc=new TextEncoder(),parts=[],center=[];let offset=0;
 const header=(length)=>new DataView(new ArrayBuffer(length));
 for(const item of entries){
   const name=enc.encode(item.name),data=item.bytes,crc=crc32(data);
   const local=header(30);local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(26,name.length,true);local.setUint32(14,crc,true);local.setUint32(18,data.length,true);local.setUint32(22,data.length,true);parts.push(new Uint8Array(local.buffer),name,data);
   const cd=header(46);cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint32(16,crc,true);cd.setUint32(20,data.length,true);cd.setUint32(24,data.length,true);cd.setUint16(28,name.length,true);cd.setUint32(42,offset,true);center.push(new Uint8Array(cd.buffer),name);
   offset+=30+name.length+data.length;
 }
 const centerLength=center.reduce((n,p)=>n+p.length,0),end=header(22);
 end.setUint32(0,0x06054b50,true);end.setUint16(8,entries.length,true);end.setUint16(10,entries.length,true);end.setUint32(12,centerLength,true);end.setUint32(16,offset,true);
 return new Blob([...parts,...center,new Uint8Array(end.buffer)],{type:'application/zip'});
}
$('oeZip').onclick=async()=>{
 try{const enc=new TextEncoder();const cfg=pack();const files=[{name:'ATRIA_objetos_configuracion.json',bytes:enc.encode(JSON.stringify(cfg,null,2))}];
   for(const o of state.objects.values())for(const [part,name] of [['alpha','RGBA'],['foliage','foliage'],['occlusion','occlusion']]){
      files.push({name:o.id+'/'+o.id+'_'+name+'.png',bytes:new Uint8Array(await (await pngBlob(o,part)).arrayBuffer())});
   }
   download(zipStored(files),'ATRIA_Objetos_Editor_Exportacion.zip','application/zip');state.dirty=false;drawPreview();notify('ZIP '+files.length+' archivos descargado');
 }catch(err){notify('Error ZIP: '+err.message)}
};
$('oeApprove').onclick=()=>{const o=get(state.selected);remember();o.approved=!o.approved;select(o.id,false)};
$('oePreset').onclick=()=>{const o=get(state.selected);const name=prompt('Nombre de plantilla física:',o.id+' maceta');if(!name)return;state.presets=state.presets||[];state.presets.push({name,source:o.id,collision:{...o.collision}});notify('Plantilla física guardada; no se copian máscaras')};
$('oeApplyPreset').onclick=()=>{const presets=state.presets||[];if(!presets.length){notify('Primero guardá una plantilla física');return}const idx=Number(prompt('Índice de plantilla (1 a '+presets.length+'): ',String(presets.length)));if(!(idx>=1&&idx<=presets.length))return;const pr=presets[idx-1],o=get(state.selected),base=RECORDS.get(pr.source),target=RECORDS.get(o.id);remember();
 const f=target.extent[0]/base.extent[0],g=target.extent[1]/base.extent[1];const old=o.collision;o.collision={...pr.collision,x:old.x,y:old.y,rx:pr.collision.rx*f,ry:pr.collision.ry*g,rearLift:pr.collision.rearLift*g,rearExtraY:pr.collision.rearExtraY*g,frontExtraY:pr.collision.frontExtraY*g,sideExtraX:pr.collision.sideExtraX*f};drawParams();drawPreview();notify('Solo física reutilizada; máscara individual intacta')};
window.ATRIA_OBJECT_EDITOR_TEST={
 get(){return state},pack,restorePack,blockedPot,
 assert(){
  const o=get('P31'),before=pack(),n=o.alpha.length;
  if(o.bbox.join(',')!=='288,905,68,115'||n!==68*115)throw Error('P31 dimensión');
  if(o.alpha.every(v=>v===255)||!o.alpha.some(v=>v===255))throw Error('P31 máscara alfa no selectiva');
  const old=crc32(o.alpha);restorePack(before);
  if(crc32(get('P31').alpha)!==old)throw Error('persistencia alfa');
  if(!blockedPot(get('P31'),322,988))throw Error('colisión maceta');
  if(blockedPot(get('P31'),500,988))throw Error('colisión externa');
  return {ok:true,p31:{bbox:o.bbox,alphaPixels:o.alpha.filter(Boolean).length},objects:state.objects.size};
 }
};
sceneImg.decode().then(()=>{get('P31');select('P31');window.ATRIA_OBJECT_EDITOR_READY=true;}).catch(e=>notify('Editor: no se pudo preparar P31: '+e.message));
})();
