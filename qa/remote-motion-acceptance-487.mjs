import assert from 'node:assert/strict';
import fs from 'node:fs';
const measured=JSON.parse(fs.readFileSync(new URL('./remote-motion-baseline.json',import.meta.url),'utf8'));
// Budgets come from the actual sender cadence, original HTTP polling interval,
// observed render period, and the injected transport's maximum delay/loss gap.
export function assertMotionPair(p,{cadence,poll=0,impaired=false}){
 assert(p.frames>60&&p.localFrames>60,'independent local and remote render coverage');
 assert(p.fps.n>=p.frames*.7,'frame gaps cannot erase the measurement');
 assert(p.localTravelPx>18&&p.remoteTravelPx>18&&p.orientationFrames>10,'both actors must actually traverse at least one original stride');
 assert(p.speed.n>5&&p.sourceSpeed.n>5&&p.speed.mean>p.sourceSpeed.mean*.5,'a frozen or persistently half-speed companion cannot pass');
 assert(Number.isFinite(p.alignedErrorPx),'alignment requires a moving source and finite error');
 const frame=1000/Math.max(1,p.fps.mean),extra=impaired?270+cadence*2:0,lagBudget=cadence*1.5+poll+frame*3+extra;
 assert(p.followLagMs<=lagBudget,'following delay fits measured transport and FPS');
 assert(p.alignedErrorPx<=205*(cadence+extra+frame*2)/1000,'displayed path stays within packet/frame travel uncertainty');
 const referenceCV=Math.max(measured[cadence===220?'guard':'lobby'].AB.speed.cv,measured[cadence===220?'guard':'lobby'].BA.speed.cv);
 assert(p.speed.cv<=referenceCV+p.sourceSpeed.cv+p.packetIntervals.cv+p.fps.cv,'variation cannot exceed the measured old implementation plus observed source/network/frame variability');
 assert(p.stopAnimationMs.n>0,'an actual start/stop is observed');
 assert(p.stopAnimationMs.max<=lagBudget+cadence+frame*2,'animation stops after the known packet and render budget');
 assert.equal(p.orientationErrors,0,'orientation follows displayed displacement');
 assert.equal(p.stepsWithoutMovement,0,'foot phase cannot advance independently');
 assert(p.phaseDistanceErrorPx<.001,'original 18-pixel stride follows displayed travel');
 if(!impaired)assert(p.movingWithoutSteps<=1,'normal transport has no untagged sliding beyond initial appearance');
 return {lagBudgetMs:lagBudget,pathBudgetPx:205*(cadence+extra+frame*2)/1000};
}
