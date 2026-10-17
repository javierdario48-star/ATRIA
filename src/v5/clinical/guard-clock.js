import {createClinicalClock487,advanceClinicalClock487} from '../../clinical/clinical-clock-487.js';

/** Reuses the validated native/study clock. Seal a bounded history epoch before
 * its 128 rate segments fill; receipts retain their own absolute timestamps.
 * The public clock is cumulative, not an unbounded inverse-time lookup table.
 */
export function createGuardClock(authorityId){
 let current=createClinicalClock487({authorityId}),clinicalOffsetUs=0,nativeOffsetQuanta=0,epochs=0;
 // The effective V4 guard advances its DISPLAY clock one in-game minute per
 // real second: 24 real minutes == 24 game hours. Native pharmacokinetic time
 // is deliberately separate (.12/.03 native minute per second according to
 // keyboard focus) and must NOT be multiplied just to fix the HUD.
 const read=()=>{
  const gameMinute=(clinicalOffsetUs+current.clinicalUs)/60000000;
  return Object.freeze({authorityId,clinicalMinute:gameMinute,gameMinute,
   nativeMinute:(nativeOffsetQuanta+current.nativeQuanta)/6000000000,
   segmentCount:current.segments.length,sealedEpochs:epochs});
 };
 return Object.freeze({read,
  advance(deltaRealSeconds,typing=false){
   const rate=typing?.03:.12,numerator=typing?3:12;
   if(current.segments.length>=128&&current.segments.at(-1).nativeNumerator!==numerator){
    clinicalOffsetUs+=current.clinicalUs;nativeOffsetQuanta+=current.nativeQuanta;
    const remainder=current.clinicalRemainderUs;current=Object.freeze({...createClinicalClock487({authorityId}),clinicalRemainderUs:remainder});epochs++;
   }
   current=advanceClinicalClock487(current,{deltaRealSeconds,nativeMinutesPerRealSecond:rate});return read();
  }
 });
}
