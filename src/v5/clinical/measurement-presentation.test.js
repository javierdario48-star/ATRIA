import test from 'node:test';
import assert from 'node:assert/strict';
import {vitalsHTML} from '../ui/clinical-panels.js';
test('patient history presents a recorded measurement rather than unmeasured later physiology',()=>{
 const measurement={temp:37.2,hr:94,rr:20,sys:108,dia:68,spo2:96};
 const html=vitalsHTML({lastVitalsKnown:{vitals:measurement,nativeMinute:1},liveVitals:{...measurement,hr:91,rr:18}});
 assert.match(html,/FC 94/);assert.doesNotMatch(html,/FC 91/);
});
