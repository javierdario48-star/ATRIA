import assert from 'node:assert/strict';
import {comparePeritonitisCase} from './peritonitis-case-parity.mjs';
const report=await comparePeritonitisCase({caseId:'PERI-TER-001',reportName:'tertiary-native-parity',scenarios:[
 {id:'abandonment',orders:[]},
 {id:'piptazo-only',orders:['piperacilina tazobactam 4.5 g']},
 // Oxygen retains the already-certified V5 bedside device contract. Its
 // spatial arrival, rather than V4's separate .55s preparation, is not an
 // identical medication timeline; test that device in session/public UI.
 {id:'supported',orders:['Ringer 1000 ml','piperacilina tazobactam 4.5 g','noradrenalina 0.05 mcg/kg/min IV']},
 {id:'late-rescue',timeline:[{at:30,orders:['Ringer 1000 ml','piperacilina tazobactam 4.5 g','noradrenalina 0.05 mcg/kg/min IV']}]},
 {id:'repeat-antibiotic',timeline:[{at:0,orders:['piperacilina tazobactam 4.5 g']},{at:24,orders:['piperacilina tazobactam 4.5 g']}]},
 {id:'delayed-antibiotic',timeline:[{at:0,orders:['Ringer 1000 ml']},{at:45,orders:['piperacilina tazobactam 4.5 g']}]},
 {id:'inadequate-ceftriaxone',orders:['ceftriaxona 1 g']},
 {id:'legacy-imipenem',orders:['imipenem 500 mg']},
 {id:'hypovolemic-diuresis',orders:['furosemida 40 mg']},
 {id:'repeated-diuresis',timeline:[{at:0,orders:['furosemida 40 mg']},{at:24,orders:['furosemida 40 mg']}]},
 {id:'overload',orders:['Ringer 6000 ml']},
 {id:'repeated-amikacin',timeline:[{at:0,orders:['amikacina 500 mg']},{at:24,orders:['amikacina 500 mg']}]},
 {id:'typing',timeline:[{at:0,orders:['Ringer 1000 ml','piperacilina tazobactam 4.5 g']},{at:10,typing:true},{at:35,typing:false}]}
]});
const final=id=>report.results.find(r=>r.id===id).points.at(-1);
assert(final('supported').vitals.sys>final('abandonment').vitals.sys+25);
assert(final('supported').phys.inflammation>.9,'persistent source is not cured at the bedside');
assert(final('piptazo-only').phys.inflammation<final('abandonment').phys.inflammation-.2);
assert(final('repeated-diuresis').phys.renalReserve<final('hypovolemic-diuresis').phys.renalReserve);
assert(final('repeated-amikacin').phys.renalStress>0);
