export class PerfProbe{
 constructor({windowSize=120}={}){this.frames=[];this.windowSize=windowSize;this.longFrames=0;this.last=null;}
 frame(now=performance.now()){if(this.last!=null){const dt=now-this.last;this.frames.push(dt);if(dt>50)this.longFrames++;if(this.frames.length>this.windowSize)this.frames.shift();}this.last=now;}
 snapshot(){const a=this.frames;if(!a.length)return{fps:0,p95:0,longFrames:this.longFrames};const sorted=[...a].sort((x,y)=>x-y),avg=a.reduce((x,y)=>x+y,0)/a.length;return{fps:Math.round(1000/avg),p95:Math.round(sorted[Math.floor((sorted.length-1)*.95)]),longFrames:this.longFrames};}
}
