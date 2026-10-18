import assert from 'node:assert/strict';
import {comparePeritonitisCase} from './peritonitis-case-parity.mjs';
const report=await comparePeritonitisCase({caseId:'PERI-PBE-001',reportName:'pbe-native-parity',scenarios:[
 {id:'abandonment',orders:[]},
 {id:'reference',orders:['ceftriaxona 1 g','albumina 1.5 g/kg']},
 {id:'without-albumin',orders:['ceftriaxona 1 g']},
 {id:'albumin-without-coverage',orders:['albumina 1.5 g/kg']},
 {id:'alternative',orders:['imipenem 500 mg','albumina 1.5 g/kg']},
 {id:'wrong-nephrotoxic',orders:['amikacina 500 mg']},
 {id:'repeated-nephrotoxic',timeline:[{at:0,orders:['amikacina 500 mg']},{at:24,orders:['amikacina 500 mg']}]},
 {id:'late-rescue',timeline:[{at:30,orders:['ceftriaxona 1 g','albumina 1.5 g/kg','Ringer 500 ml']}]},
 {id:'hypovolemic-diuresis',orders:['furosemida 40 mg']},
 {id:'overload',orders:['Ringer 6000 ml']},
 {id:'albumin-excess',timeline:[{at:0,orders:['albumina 1.5 g/kg']},{at:12,orders:['albumina 1.5 g/kg']},{at:24,orders:['albumina 1.5 g/kg']}]},
 {id:'typing-during-treatment',timeline:[{at:0,orders:['ceftriaxona 1 g','albumina 1.5 g/kg']},{at:10,typing:true},{at:35,typing:false}]}
]});
const final=id=>report.results.find(r=>r.id===id).points.at(-1);
assert(final('reference').phys.effectiveVolume>final('without-albumin').phys.effectiveVolume+.1);
assert(final('reference').phys.renalReserve>final('without-albumin').phys.renalReserve+.04);
assert(final('reference').neuro.verbal===5&&report.results.find(x=>x.id==='reference').points[0].neuro.verbal===4);
assert(final('wrong-nephrotoxic').phys.renalReserve<final('abandonment').phys.renalReserve-.02);
assert(final('overload').vitals.spo2<final('abandonment').vitals.spo2-5);
