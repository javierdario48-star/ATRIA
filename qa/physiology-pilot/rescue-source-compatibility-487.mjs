/** QA ONLY. Enumerated source revisions for the authorised finite-rescue repair.
 * Frozen clinical numbers/catalogue are retained, never regenerated. */
import assert from 'node:assert/strict';
const revisions={
 'native-fatal-exposure':[
  '7e3dc5eb8f886998d18c7c1408af34acb38c285dc428524ed2c792f066fc3968',
  '190925d14bcde87661c6a66d3a14d1c3501ee29550c32b1babc52cfce6a2519c'],
 'atria-critical-rescue-487':[
  '6f66600ad5feff77b220e3976853dc3f1d24635463c494daf04aebe5c72759fb',
  'f3c2983b961ac26b62a9a21d65ef480a1b8ef0bac8fb5e9c14507f7e2e4136ae'],
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
