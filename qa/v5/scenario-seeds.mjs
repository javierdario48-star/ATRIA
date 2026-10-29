// Choose ordinary deterministic admissions; never edit a patient or RNG state.
import {createHash} from 'node:crypto';
import {generatePatientVariation} from '../../src/v5/content/patient-variation.js';
export function chooseClinicalScenarioSeed(c,label,predicate,{mode='solo',limit=1000}={}){
 for(let i=0;i<limit;i++){
  const seed=label+':'+i,digest=createHash('sha256').update(JSON.stringify(seed)).digest('hex');
  const room='cert:'+mode+':'+c.id+':'+digest.slice(0,12);
  const variant=generatePatientVariation(c.variation,room+':patient:'+c.id,{guardSeed:room,patientIndex:0});
  if(predicate(variant))return seed;
 }
 throw Error('no generated admission for '+label);
}
