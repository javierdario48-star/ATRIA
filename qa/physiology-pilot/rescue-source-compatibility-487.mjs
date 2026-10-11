/** QA ONLY. Enumerated source revisions for finite rescue + opt-in fluid ownership.
 * Frozen clinical numbers/catalogue are retained, never regenerated. */
import assert from 'node:assert/strict';
const revisions={
 'native-therapy':[
  'daaedf87c4da9baddf3e7549dbeaf4a44a0201cae77594fd8ef6b561b9a6ab6a',
  '2cdc142f1f01e4fbd12104809b362295abf79fd8cefb7ee0f450798d18d15fd7'],
 'cs-safe-v0190-clinical':[
  '2a422d156aa3d1ad8b11566fab30fbafc19b5cadd5abe7fd8be891550c3b88c4',
  '17a54d0294bbe4f8b16a3e479501b95b3cba0b6ada7a3e3244c3824b28a26c42'],
 'atria-secondary-sepsis-bridge-487':[
  'c526cd450bff277cb54280fe015befec93ec7ffd7843464fb94b8ae342bf5ff5',
  'c64b8ff301f891d0bd987d18c3b3e28139185db3b5eb2a0822df517782ca6f2f'],
 'native-fatal-exposure':[
  '7e3dc5eb8f886998d18c7c1408af34acb38c285dc428524ed2c792f066fc3968',
  '190925d14bcde87661c6a66d3a14d1c3501ee29550c32b1babc52cfce6a2519c'],
 'atria-critical-rescue-487':[
  '6f66600ad5feff77b220e3976853dc3f1d24635463c494daf04aebe5c72759fb',
  'f16c3caf80dd101d6ae8951d6757bb9d8ae75b6621a59aa6998df4cf9dba3a04'],
 'ns423-evolution':[
  'ed41fef4a518f6f7c875d0c67860855786a94c6abb89a674714c7bd1e8bfc77b',
  'f8c8f30ca9985b3913f49890130f6088e2f66f35bd8925702d21357ecb047b5f']
};
export function assertRescueSourceRevisions487(actual,prior){
 assert.deepEqual(Object.keys(actual).sort(),Object.keys(prior).sort());
 for(const id of Object.keys(prior)){
  const revision=revisions[id];
  assert.equal(prior[id],revision?.[0]??actual[id],'frozen source '+id);
  assert.equal(actual[id],revision?.[1]??prior[id],'current source '+id);
 }
}
