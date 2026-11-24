// Pure deterministic QA planning, not a clinical decision engine.
import {CLINICAL_CERTIFICATION_MODES as modes,CLINICAL_CERTIFICATION_PROFILES as profiles} from './certify-clinical-cases.mjs';
import {createHash} from 'node:crypto';
export const CAMPAIGN_TOTAL=10000,PILOT_TOTAL=240;
export function campaignScenario(cases,index,namespace='atria-v2-campaign-1'){
 if(!Number.isSafeInteger(index)||index<0||index>=CAMPAIGN_TOTAL||!cases.length)throw Error('invalid campaign index');
 const c=cases[index%cases.length],mode=modes[Math.floor(index/cases.length)%modes.length];
 const profile=profiles[Math.floor(index/(cases.length*modes.length))%profiles.length];
 const repetition=Math.floor(index/(cases.length*modes.length*profiles.length));
 const seed=namespace+':'+index+':'+c.id+':'+mode+':'+profile;
 const bytes=createHash('sha256').update(seed).digest();
 const rule=c.clinicalPolicy.closure;
 const local=rule.destinations.filter(d=>!rule.escalationDestinations?.includes(d));
 const destinations=profile==='complication-rescue'&&rule.escalationDestinations?.length?
  rule.escalationDestinations:local.length?local:rule.destinations;
 // Cycle, rather than relying on chance, over alternatives in every stratum.
 const destination=destinations[repetition%destinations.length];
 const groups=rule.treatmentByDestination?.[destination]||rule.treatment||[];
 const studies=(rule.study||[]).flat();
 const group=groups.length?Math.floor(repetition/destinations.length)%groups.length:null;
 const study=studies.length?studies[Math.floor(repetition/(destinations.length*Math.max(1,groups.length)))%studies.length]:null;
 const qaPerturbation={actionDelayMax:bytes[0]%5,shuffleHistory:!!(bytes[1]&1),shuffleExams:!!(bytes[2]&1),
  shuffleStudies:!!(bytes[3]&1),wrongRepeatInterval:5+bytes[4]%16,wrongRepeatUntil:50+bytes[5]%71};
 return {index,caseId:c.id,mode,profile,repetition,seed,destination,group,study,
  recovery:true,horizon:720,qaPerturbation,doseMultiplier:[.5,1,2][bytes[6]%3]};
}
export function campaignRange(start,count){
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(count)||start<0||count<1||start+count>CAMPAIGN_TOTAL)
  throw Error('invalid campaign range');
 return Array.from({length:count},(_,i)=>start+i);
}
