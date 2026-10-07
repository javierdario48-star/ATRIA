/**
 * ATRIA frame scheduler.
 * Fixed-step simulation is isolated from presentation and maintenance work.
 */
export class FrameScheduler {
  constructor({stepHz=60,maxCatchUpSteps=5,mobileRenderHz=30,desktopRenderHz=60}={}){
    this.step=1/stepHz;
    this.maxCatchUpSteps=maxCatchUpSteps;
    this.mobileRenderMs=1000/mobileRenderHz;
    this.desktopRenderMs=1000/desktopRenderHz;
    this.acc=0; this.last=null; this.lastRender=0;
  }
  reset(now=performance.now()){this.acc=0;this.last=now;this.lastRender=0;}
  tick(now,{simulate,maintain,render,isMobile=false}){
    if(this.last==null)this.last=now;
    const elapsed=Math.max(0,Math.min(.25,(now-this.last)/1000));
    this.last=now;
    this.acc+=elapsed;
    let steps=0;
    while(this.acc+1e-9>=this.step&&steps<this.maxCatchUpSteps){
      this.acc-=this.step; simulate(this.step); steps++;
    }
    // Drop excess backlog instead of freezing the UI trying to catch up forever.
    if(steps===this.maxCatchUpSteps&&this.acc>=this.step)this.acc%=this.step;
    maintain(now);
    const budget=isMobile?this.mobileRenderMs:this.desktopRenderMs;
    if(now-this.lastRender>=budget){this.lastRender=now;render();}
    return {steps,dropped:steps===this.maxCatchUpSteps};
  }
}
