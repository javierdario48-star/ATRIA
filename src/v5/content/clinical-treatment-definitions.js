// Content only. The existing native bedside executor owns preparation,
// administration, procedural completion and receipts for these definitions.
import {RESPIRATORY_TREATMENTS} from './packs/respiratory-treatments.js';
import {CARDIOLOGY_TREATMENTS} from './packs/cardiology-treatments.js';
import {NEUROLOGY_TREATMENTS} from './packs/neurology-treatments.js';
import {SAFETY_TREATMENTS} from './packs/safety-treatments.js';

function freeze(value) {
 if (value && typeof value === 'object') {
  for (const child of Object.values(value)) freeze(child);
  Object.freeze(value);
 }
 return value;
}
const combined = Object.create(null);
for (const pack of [RESPIRATORY_TREATMENTS, CARDIOLOGY_TREATMENTS, NEUROLOGY_TREATMENTS, SAFETY_TREATMENTS]) {
 for (const [id, definition] of Object.entries(pack)) {
  if (Object.hasOwn(combined, id)) throw Error('duplicate clinical treatment ' + id);
  if (definition?.id !== id) throw Error('clinical treatment identity mismatch ' + id);
  combined[id] = definition;
 }
}
export const CLINICAL_TREATMENTS = freeze(combined);
export const clinicalTreatmentDefinition = id => Object.hasOwn(CLINICAL_TREATMENTS, id) ? CLINICAL_TREATMENTS[id] : null;
