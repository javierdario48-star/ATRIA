import {SCRUB_COLORS,scrubAppearance} from '../app/avatar-appearance.js';

// One selection model supplies preview and submission; the world renderer uses
// the same atlas coordinates. The session lifecycle owns DOM event listeners.
export function createAvatarSelection(initial={}){
 let selected=scrubAppearance(initial.scrubColor,initial.sex);
 return Object.freeze({
  read:()=>({...selected}),
  chooseSex(value){selected=scrubAppearance(selected.color,value);return this.read();},
  cycle(delta){const i=SCRUB_COLORS.indexOf(selected.color);
   selected=scrubAppearance(SCRUB_COLORS[(i+delta+SCRUB_COLORS.length)%SCRUB_COLORS.length],selected.sex);
   return this.read();}
 });
}
const names=Object.freeze({navy:'Azul oscuro',green:'Verde',gray:'Gris',pink:'Rosa',
 teal:'Verde petróleo',burgundy:'Burdeos',black:'Negro'});
const atlasCoords=Object.freeze({black:[0,0],navy:[1,0],green:[2,0],gray:[3,0],
 pink:[0,1],teal:[1,1],burgundy:[2,1]});
/** No second sprite generator, tinting engine or divergent aspect ratios. */
export function avatarAssetSpec({sex,color}){
 const a=scrubAppearance(color,sex);
 if(a.sex==='female'||a.color==='burgundy')return {key:'wardrobe',frame:a.sex==='female'?
  atlasCoords[a.color]:[3,1]};
 return {key:a.color==='black'?'player-navy':'player-'+a.color,frame:null};
}
export function createAvatarCreator({document,window,assetUrls,profile,listen,signal}){
 const model=createAvatarSelection(profile),canvas=document.getElementById('avatarPreview');
 const ctx=canvas.getContext('2d'),assets=new Map(),label=document.getElementById('avatarColorName');
 const load=(key)=>{
  if(assets.has(key))return assets.get(key);
  const img=new window.Image(),url=assetUrls[key];
  const promise=url?(img.src=url,img.decode().then(()=>img).catch(()=>null)):Promise.resolve(null);
  assets.set(key,promise);return promise;
 };
 let revision=0;
 async function paint(){
  const id=++revision,a=model.read(),spec=avatarAssetSpec({sex:a.sex,color:a.color});
  document.getElementById('startingSex').value=a.sex;
  document.getElementById('startingColor').value=a.color;
  for(const b of document.querySelectorAll('[data-avatar-sex]'))
   b.setAttribute('aria-pressed',String(b.dataset.avatarSex===a.sex));
  label.textContent=names[a.color];
  document.getElementById('avatarColorPosition').textContent=
   String(SCRUB_COLORS.indexOf(a.color)+1)+' / '+SCRUB_COLORS.length;
  canvas.setAttribute('aria-label',(a.sex==='female'?'Mujer':'Hombre')+' con ambo '+names[a.color]);
  const img=await load(spec.key);
  if(signal?.aborted||id!==revision)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!img)return;
  const [sx,sy,sw,sh]=spec.frame?
   [spec.frame[0]*img.naturalWidth/4,spec.frame[1]*img.naturalHeight/2,
    img.naturalWidth/4,img.naturalHeight/2]:
   [0,0,img.naturalWidth,img.naturalHeight];
  const scale=Math.min((canvas.width-42)/sw,(canvas.height-20)/sh);
  const dw=sw*scale,dh=sh*scale;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,sx,sy,sw,sh,(canvas.width-dw)/2,canvas.height-dh-7,dw,dh);
 }
 for(const b of document.querySelectorAll('[data-avatar-sex]'))
  listen(b,'click',()=>{model.chooseSex(b.dataset.avatarSex);void paint();});
 listen(document.getElementById('avatarPreviousColor'),'click',()=>{model.cycle(-1);void paint();});
 listen(document.getElementById('avatarNextColor'),'click',()=>{model.cycle(1);void paint();});
 void paint();
 return Object.freeze({read:model.read});
}
