import assert from 'node:assert/strict';
import {csSurgicalReview487} from './surgical-review-487.js';
const c={id:'PERI-SEC-001',keyInterventions:['fluid','ceftriaxone','metronidazole','source_control']};
const stable={diagnosis:'peritonitis secundaria',diagnosticCompatible:true,vitalsKnown:true,examDone:true,examRegions:2,sys:112,initialShock:false,imagingDone:true};
assert.equal(csSurgicalReview487(stable,c).accepted,true,'stable secondary with completed CT accepted');
assert.equal(csSurgicalReview487({...stable,imagingDone:false},c).status,'missing-evidence');
assert.equal(csSurgicalReview487({...stable,diagnosis:''},c).status,'missing-dx');
assert.equal(csSurgicalReview487({...stable,diagnosis:'peritonitis'},c).status,'missing-dx');
assert.equal(csSurgicalReview487({...stable,diagnosticCompatible:false},c).status,'unsubstantiated');
assert.equal(csSurgicalReview487({...stable,examDone:false,examRegions:0},c).status,'missing-exam');
assert.equal(csSurgicalReview487({...stable,vitalsKnown:false},c).status,'missing-exam');
const shock={...stable,sys:78,initialShock:true,imagingDone:false};
assert.equal(csSurgicalReview487(shock,c).accepted,true,'shock with peritonism must not wait for CT');
assert.equal(csSurgicalReview487(shock,c).status,'accepted');
const earlyShock={...shock,examDone:false,examRegions:0};
assert.equal(csSurgicalReview487(earlyShock,c).accepted,true,
 'urgent team evaluation begins in shock before the focused exam is fully completed');
assert.match(csSurgicalReview487(earlyShock,c).reason,/no autoriza todav[ií]a el traslado/i,
 'team acceptance must not imply surgical handoff or completed examination');
assert.equal(csSurgicalReview487({...earlyShock,vitalsKnown:false},c).accepted,false,
 'undocumented vitals still require evaluation');
const spontaneous={id:'PERI-PBE-001',keyInterventions:['ceftriaxone','albumin']};
assert.equal(csSurgicalReview487({...stable,diagnosis:'PBE'},spontaneous).accepted,false,'medical PBE not sent to surgery');
const tertiary={id:'PERI-TER-001',keyInterventions:['ampicillin','amikacin','fluconazole']};
assert.equal(csSurgicalReview487({...shock,diagnosis:'peritonitis terciaria'},tertiary).status,'review',
 'multioperated tertiary patient must not be automatically sent to surgery');
const appendix={id:'APP-001',keyInterventions:['surgery']};
assert.equal(csSurgicalReview487({...stable,diagnosis:'apendicitis aguda'},appendix).accepted,true,
 'shared surgery review can apply to future/current surgical cases');
console.log('SURGICAL REVIEW BOTS PASS',JSON.stringify({acceptance:true,refusals:true,criticalNoCT:true,otherCases:true}));
