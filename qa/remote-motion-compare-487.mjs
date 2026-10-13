import assert from 'node:assert/strict';
import fs from 'node:fs';
const before=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),after=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const comparison={referenceSHA:'2f13db3ce1c47f58618c0955ca6e3c900f7f9aab',realNetwork:true,physicalAndroid:false,scenes:{}};
for(const scene of ['lobby','guard']){
 const rows=['AB','BA'].map(direction=>{const b=before[scene][direction],a=after[scene][direction];
  assert(Number.isFinite(a.alignedErrorPx)&&Number.isFinite(b.alignedErrorPx));assert(a.speed.n>5&&b.speed.n>5);
  // Allow at most one measured packet interval extra: the former chase lag
  // must not be traded for a second large fixed rendering delay.
  const lagBudget=b.followLagMs+b.packetIntervals.mean+2000/Math.max(1,a.fps.mean);
  assert(a.followLagMs<=lagBudget,scene+' '+direction+' does not buy smoothness with excessive delay');
  assert.equal(a.orientationErrors,0);assert.equal(a.stepsWithoutMovement,0);assert(a.movingWithoutSteps<=1);assert(a.phaseDistanceErrorPx<.001);
  assert(a.speed.cv<b.speed.cv,scene+' '+direction+' speed variation improves');
  assert(a.alignedErrorPx<b.alignedErrorPx,scene+' '+direction+' aligned path error improves');
  return {direction,before:b,after:a,lagBudgetMs:lagBudget};
 });
 const average=(key,version)=>rows.reduce((s,r)=>s+r[version][key],0)/rows.length;
 const cv=version=>rows.reduce((s,r)=>s+r[version].speed.cv,0)/rows.length;
 assert(cv('after')<cv('before'),scene+' artificial velocity variation decreases in crossed tests');
 assert(average('alignedErrorPx','after')<average('alignedErrorPx','before'),scene+' displayed path tracks its source more closely');
 comparison.scenes[scene]={rows,meanSpeedCVBefore:cv('before'),meanSpeedCVAfter:cv('after')};
}
fs.writeFileSync(process.argv[4]||'qa/remote-motion-results/comparison.json',JSON.stringify(comparison,null,2));
console.log('REMOTE_MOTION_BEFORE_AFTER',JSON.stringify(comparison));
