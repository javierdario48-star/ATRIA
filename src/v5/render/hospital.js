/** Canvas presentation consumes snapshots. It never executes clinical actions. */
export async function createHospitalRenderer(canvas,content,{signal,window}={}){
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('El navegador no admite Canvas 2D.');
 const images=Object.fromEntries(await Promise.all(Object.entries(content.assetUrls).map(async([key,url])=>{
  const image=new window.Image();image.src=url;await image.decode();
  if(signal?.aborted)throw new DOMException('disposed','AbortError');return [key,image];
 })));
 let width=0,height=0,dpr=1,scale=1,camera={x:496,y:1348},lastWorld=null;
 let playBounds=null,anchorX=0,anchorY=null,lastAnchorTime=null;
 const pixel=value=>Math.round(value*dpr)/dpr;
 const [mapWidth,mapHeight]=content.map.source_size_px;
 const screen=(x,y)=>[(x-camera.x)*scale+anchorX,(y-camera.y)*scale+(anchorY??height/2)];
 const toWorld=(x,y)=>[(x-anchorX)/scale+camera.x,(y-(anchorY??height/2))/scale+camera.y];
 function resize(){
  const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
  dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  scale=Math.min(1.38,Math.max(.74,width/590*1.15));anchorX=pixel(width/2);
 }
 function sprite(key,a,h=62){
  const img=images[key]||(key.startsWith('player-')?images['player-navy']:null);if(!img)return;const [x,y]=screen(a.x,a.y),hh=h*scale,w=hh*img.width/img.height;
  const east=/^(E|NE|SE)$/.test(a.dir),west=/^(W|NW|SW)$/.test(a.dir),right=key==='vega';
  const flip=right?(west?-1:east?1:(a.lastSide||1)<0?-1:1):(east?-1:west?1:(a.lastSide||-1)>0?-1:1);
  const phase=(a.walkPhase||0)*Math.PI*2,swing=Math.sin(phase),moving=a.moving;
  ctx.save();ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();ctx.ellipse(x,y+2*scale,15*scale,5*scale,0,0,Math.PI*2);ctx.fill();
  ctx.translate(x,y-hh+8*scale-(moving?Math.abs(swing)*.75*scale:0));ctx.scale(flip,1);
  if(moving){
   // Original final walking proportions; one authoritative animation implementation.
   const fraction=key==='vega'?.85:key==='nurse'?.78:.72,srcY=Math.floor(img.height*fraction),split=Math.floor(img.width/2),hip=hh*srcY/img.height;
   for(const side of [0,1]){
    const sx=side?split:0,sw=side?img.width-split:split,dx=-w/2+w*sx/img.width,dw=w*sw/img.width,pivot=dx+dw*.5,step=swing*(side?-1:1);
    ctx.save();ctx.translate(pivot,hip-Math.max(0,step)*.6*scale);ctx.rotate(step*.13);
    ctx.drawImage(img,sx,srcY,sw,img.height-srcY,dx-pivot,0,dw,hh-hip);ctx.restore();
   }
   const overlap=Math.min(img.height-srcY,2);ctx.drawImage(img,0,0,img.width,srcY+overlap,-w/2,0,w,hh*(srcY+overlap)/img.height);
  }else ctx.drawImage(img,-w/2,0,w,hh);
  ctx.restore();
 }
 function label(a,text,level=null){
  const [x,y]=screen(a.x,a.y),size=Math.max(8,9*scale),sub=Math.max(6.5,7*scale),top=y-61*scale;
  ctx.save();ctx.font='900 '+size+'px ui-rounded,system-ui';
  const name=String(text).slice(0,18),w=ctx.measureText(name).width+12*scale;
  ctx.fillStyle='rgba(6,28,41,.88)';ctx.strokeStyle='rgba(126,213,245,.55)';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(x-w/2,top-10*scale,w,16*scale,5*scale);ctx.fill();ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#eefaff';ctx.fillText(name,x,level?top-3*scale:top);
  if(level){ctx.font='800 '+sub+'px system-ui';ctx.fillStyle='#8edcf5';ctx.fillText('Nv.'+level,x,top+4*scale);}
  ctx.restore();
 }
 function draw(world,now=window.performance.now()){
  lastWorld=world;
  const valid=playBounds&&playBounds.bottom>playBounds.top+100;
  const desiredY=valid?playBounds.top+(playBounds.bottom-playBounds.top)*.55:height/2;
  const dt=lastAnchorTime===null?.1:Math.max(0,Math.min(.12,(now-lastAnchorTime)/1000));
  lastAnchorTime=now;
  anchorY=pixel(anchorY===null?desiredY:anchorY+(desiredY-anchorY)*(1-Math.exp(-dt/.10)));
  // Snap the camera origin to device pixels. Otherwise canvas texture
  // resampling produces the shimmer visible during subpixel walks on mobile.
  camera=valid?{x:pixel(world.player.x*scale)/scale,y:pixel(world.player.y*scale)/scale}:{x:world.player.x,y:world.player.y};
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  const tile=512*scale,left=camera.x-anchorX/scale,top=camera.y-anchorY/scale;
  const sx=-((left*scale)%tile+tile)%tile,sy=-((top*scale)%tile+tile)%tile;
  for(let y=sy-tile;y<height+tile;y+=tile)for(let x=sx-tile;x<width+tile;x+=tile)ctx.drawImage(images.pavement,x,y,tile+1,tile+1);
  const [gx,gy]=screen(-190,0),[rx]=screen(mapWidth,0);ctx.globalAlpha=.88;
  ctx.drawImage(images.garden,0,0,190,1536,gx,gy,190*scale,mapHeight*scale);
  ctx.drawImage(images.garden,834,0,190,1536,rx,gy,190*scale,mapHeight*scale);ctx.globalAlpha=1;
  for(const [wx,wy] of [[mapWidth*.39,mapHeight+44],[mapWidth*.61,mapHeight+44],[mapWidth*.39,-44],[mapWidth*.61,-44]]){
   const [x,y]=screen(wx,wy),light=ctx.createRadialGradient(x,y,0,x,y,62*scale);
   light.addColorStop(0,'rgba(255,209,121,.17)');light.addColorStop(1,'rgba(255,209,121,0)');
   ctx.fillStyle=light;ctx.fillRect(x-62*scale,y-62*scale,124*scale,124*scale);
  }
  const [mx,my]=screen(0,0);ctx.drawImage(images.hospital,mx,my,mapWidth*scale,mapHeight*scale);
  for(const p of world.patients){
   const [x,y]=screen(p.x,p.y),im=images.patient,h=40*scale,w=h*im.width/im.height;ctx.drawImage(im,x-w/2,y-h/2,w,h);
  }
  const actors=[...world.nurses,...(world.expert?[world.expert]:[]),world.player].sort((a,b)=>a.y-b.y);
  for(const a of actors){sprite(a.id==='self'?'player-'+a.color:a.kind==='vega'?'vega':'nurse',a,a.kind==='vega'?72:a.kind==='nurse'?57:62);}
  if(world.phase!=='title')label(world.player,world.player.name,world.player.level);
  if(world.expert)label(world.expert,'Dr. Vega');
  if(world.player.target){const [x,y]=screen(...world.player.target);ctx.strokeStyle='#ffd25f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,9*scale,0,Math.PI*2);ctx.stroke();}
 }
 function hit(x,y){
  if(!lastWorld)return null;
  const [wx,wy]=toWorld(x,y);
  const candidates=[...lastWorld.patients.map(p=>({...p,kind:'patient'})),...lastWorld.nurses,
   ...(lastWorld.expert?[lastWorld.expert]:[])];
  return candidates.map(a=>({a,d:Math.hypot(wx-a.x,wy-(a.y-(a.kind==='patient'?0:22)))}))
   .filter(x=>x.d<32).sort((a,b)=>a.d-b.d)[0]?.a||null;
 }
 function setPlayableBounds(bounds){
  playBounds=bounds&&Number.isFinite(bounds.top)&&Number.isFinite(bounds.bottom)?
   {top:Math.max(0,bounds.top),bottom:Math.min(height,bounds.bottom)}:null;
 }
 resize();return Object.freeze({draw,resize,setPlayableBounds,toWorld,screen,hit,
  metrics:()=>({width,height,scale,dpr,anchorX,anchorY,camera:{...camera},
   playableBounds:playBounds?{...playBounds}:null,images:Object.keys(images).length})});
}
