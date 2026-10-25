import {playerSpriteKey} from '../app/avatar-appearance.js';
/** Canvas presentation consumes snapshots. It never executes clinical actions. */
export async function createHospitalRenderer(canvas,content,{signal,window}={}){
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('El navegador no admite Canvas 2D.');
 const images=Object.fromEntries(await Promise.all(Object.entries(content.assetUrls).map(async([key,url])=>{
  const image=new window.Image();image.src=url;await image.decode();
  if(signal?.aborted)throw new DOMException('disposed','AbortError');return [key,image];
 })));
 // One compressed atlas, decoded once into draw-ready frames; no per-frame
 // asset allocation and no alternate sprite animation implementation.
 if(images.wardrobe&&canvas.ownerDocument?.createElement){
  const coords={'player-female-black':[0,0],'player-female-navy':[1,0],
   'player-female-green':[2,0],'player-female-gray':[3,0],
   'player-female-pink':[0,1],'player-female-teal':[1,1],
   'player-female-burgundy':[2,1],'player-burgundy':[3,1]};
  for(const [key,[col,row]] of Object.entries(coords)){
   const frame=canvas.ownerDocument.createElement('canvas');
   frame.width=72;frame.height=108;
   frame.getContext('2d').drawImage(images.wardrobe,col*72,row*108,72,108,0,0,72,108);
   images[key]=frame;
  }
 }
 let width=0,height=0,dpr=1,scale=1,camera={x:496,y:1348};
 let playBounds=null,anchorX=0,anchorY=null,lastAnchorTime=null,cameraScene=null,lastCameraTime=null;
 const pixel=value=>Math.round(value*dpr)/dpr;
 const [mapWidth,mapHeight]=content.map.source_size_px;
 const screen=(x,y)=>[(x-camera.x)*scale+anchorX,(y-camera.y)*scale+(anchorY??height/2)];
 const toWorld=(x,y)=>{const rect=canvas.getBoundingClientRect();
  return [(x-rect.left-anchorX)/scale+camera.x,(y-rect.top-(anchorY??height/2))/scale+camera.y];};
 function resize(){
  const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
  dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  scale=Math.min(1.38,Math.max(.74,width/590*1.15));anchorX=pixel(width/2);
 }
 function sprite(key,a,h=62){
  const img=images[key]||(key.startsWith('player-female-')?
    images['player-female-navy']||images['player-navy']:
    key.startsWith('player-')?images['player-navy']:null);if(!img)return;const [x,y]=screen(a.x,a.y),hh=h*scale,w=hh*img.width/img.height;
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
 function speechBubble(a,now){
  const bubble=a.speechBubble;if(!bubble||bubble.until<=now)return;
  const [x,y]=screen(a.x,a.y),font=Math.max(9,10*scale),max=188*scale;
  ctx.save();ctx.font='600 '+font+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  const words=String(bubble.text).split(/\s+/),lines=[];let line='';
  for(const word of words){
   const next=line?line+' '+word:word;
   if(line&&ctx.measureText(next).width>max){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);
  const visible=lines.slice(0,3),w=Math.min(max,Math.max(62*scale,...visible.map(t=>ctx.measureText(t).width+20*scale))),
   h=(visible.length*font*1.4)+12*scale,top=y-94*scale-h;
  const role=bubble.role||'doctor';
  ctx.fillStyle=role==='patient'?'rgba(221,243,254,.98)':role==='nurse'?'rgba(255,241,207,.98)':'rgba(255,255,250,.96)';
  ctx.strokeStyle=role==='patient'?'#408fb8':role==='nurse'?'#c88e37':'#23506b';ctx.lineWidth=1.3;
  ctx.beginPath();ctx.roundRect(x-w/2,top,w,h,8*scale);ctx.fill();ctx.stroke();
  ctx.fillStyle='#102f45';
  for(let i=0;i<visible.length;i++)ctx.fillText(visible[i],x,top+12*scale+font*.65+i*font*1.4);
  ctx.restore();
 }
 // The original B4/relocated monitor is an added screen, not baked into the map.
 // Draw the spatial entity only; this code never reads or changes patient signs.
 function monitor(m){
  const [x,y]=screen(m.x,m.y),s=scale;
  ctx.save();ctx.lineWidth=2*s;ctx.strokeStyle='#548791';ctx.beginPath();ctx.moveTo(x,y+11*s);ctx.lineTo(x,y+31*s);
  ctx.moveTo(x-10*s,y+31*s);ctx.lineTo(x+10*s,y+31*s);ctx.stroke();
  ctx.fillStyle='#4d707c';ctx.beginPath();ctx.roundRect(x-16*s,y-13*s,32*s,26*s,4*s);ctx.fill();
  ctx.strokeStyle='#b5d2d6';ctx.lineWidth=1.2*s;ctx.stroke();ctx.fillStyle='#071f2d';
  ctx.beginPath();ctx.roundRect(x-13.5*s,y-10.5*s,27*s,20*s,2*s);ctx.fill();
  ctx.strokeStyle='#69d6db';ctx.lineWidth=s;ctx.beginPath();
  [[-11,0],[-6,0],[-3,-4],[0,5],[3,-6],[5,0],[11,0]].forEach(([a,b],i)=>i?ctx.lineTo(x+a*s,y+b*s):ctx.moveTo(x+a*s,y+b*s));ctx.stroke();
  ctx.fillStyle='#97d8e4';ctx.fillRect(x+8*s,y-8*s,3*s,2*s);ctx.restore();
 }
 function draw(world,now=window.performance.now()){
  const valid=playBounds&&playBounds.bottom>playBounds.top+100;
  const desiredY=valid?playBounds.top+(playBounds.bottom-playBounds.top)*.55:height/2;
  const dt=lastAnchorTime===null?.1:Math.max(0,Math.min(.12,(now-lastAnchorTime)/1000));
  lastAnchorTime=now;
  // Exact old centering is important for the reversible visual parity control.
  // Smooth only into the keyboard layout; restore the original image on hide.
  anchorY=!valid?height/2:pixel(anchorY===null?desiredY:anchorY+(desiredY-anchorY)*(1-Math.exp(-dt/.10)));
  // Follow actual local walking instantly. Only soften small authoritative
  // idle corrections in durable co-op; a remote message must never trigger
  // a camera jump. The world/clinical actor itself is never modified here.
  const scene=world.phase+':'+world.generation;
  const target=world.player,wasFollowing=cameraScene===scene;
  if(!wasFollowing||world.phase!=='guard'||world.mode!=='coop'||target.moving||
     Math.hypot(target.x-camera.x,target.y-camera.y)>180)
   camera={x:target.x,y:target.y};
  else{
   const seconds=lastCameraTime===null?0:Math.max(0,Math.min(.08,(now-lastCameraTime)/1000));
   const smooth=1-Math.exp(-seconds/.14);
   const dx=target.x-camera.x,dy=target.y-camera.y;
   const remaining=Math.hypot(dx,dy)*scale;
   if(remaining>1.5){
    camera={x:camera.x+dx*smooth,y:camera.y+dy*smooth};
   }else if(!target.moving&&remaining>0){
    // Do not leave the camera a world-tile fraction short forever.
    camera={x:target.x,y:target.y};
   }
  }
  cameraScene=scene;lastCameraTime=now;
  // Device-pixel alignment avoids canvas texture shimmer on mobile.
  if(valid)camera={x:pixel(camera.x*scale)/scale,y:pixel(camera.y*scale)/scale};
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
  for(const m of world.entities||[])if(m.kind==='monitor'&&m.added)monitor(m);
  for(const p of world.patients.filter(p=>!p.departed)){
   const [x,y]=screen(p.x,p.y),im=images.patient,h=40*scale,w=h*im.width/im.height;ctx.drawImage(im,x-w/2,y-h/2,w,h);
  }
  const actors=[...world.nurses,...(world.others||[]),...(world.expert?[world.expert]:[]),world.player].sort((a,b)=>a.y-b.y);
  for(const a of actors){sprite(a.id==='self'||a.kind==='doctor'?playerSpriteKey(a):a.kind==='vega'?'vega':'nurse',a,a.kind==='vega'?72:a.kind==='nurse'?57:62);}
  if(world.phase!=='title')label(world.player,world.player.name,world.player.level);
  for(const a of world.others||[])label(a,a.name,a.level);
  if(world.phase==='lobby'||world.phase==='guard')for(const a of [world.player,...world.others])speechBubble(a,now);
  if(world.phase==='guard')for(const a of [...world.patients.filter(p=>!p.departed),...world.nurses,...(world.expert?[world.expert]:[])])speechBubble(a,now);
  if(world.expert)label(world.expert,'Dr. Vega');
  if(world.player.target){const [x,y]=screen(...world.player.target);ctx.strokeStyle='#ffd25f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,9*scale,0,Math.PI*2);ctx.stroke();}
 }
 function setPlayableBounds(bounds){
  playBounds=bounds&&Number.isFinite(bounds.top)&&Number.isFinite(bounds.bottom)?
   {top:Math.max(0,bounds.top),bottom:Math.min(height,bounds.bottom)}:null;
 }
 resize();return Object.freeze({draw,resize,setPlayableBounds,toWorld,screen,
  metrics:()=>({width,height,scale,dpr,anchorX,anchorY,camera:{...camera},
   playableBounds:playBounds?{...playBounds}:null,images:Object.keys(images).length})});
}
