/** Isolated QA replay/counterfactuals, never imported by build or game. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFrozenNativeReference487,loadNativeReferenceSources487} from './native-reference-487.mjs';
import {createPhysiologyShadow487,samplePhysiologyShadow487} from '../../src/integration/physiology-shadow-487.js';
import {createPilotProfile487} from '../../src/clinical/physiology-pilot-cases-487.js';
import {createPhysiologyState487,stepPhysiology487,observePhysiology487} from '../../src/clinical/physiology-pilot-487.js';

const TIMES=[0,1,2,5,10,20,30,60,120,240,360];
const administration=(drugId,amount,unit,atClinicalMinute=0,action='bolus')=>({drugId,amount,unit,atClinicalMinute,action});
const o=(dose=4,at=0)=>administration('oxygen',dose,'L/min',at,'start');
const f=(dose=500,at=0)=>administration('fluid',dose,'ml',at);
const v=(dose=.05,at=0)=>administration('vasopressor',dose,'mcg/kg/min',at,'start');
const m=(dose=4,at=0)=>administration('morphine',dose,'mg',at);
const d=(dose=40,at=0)=>administration('furosemide',dose,'mg',at);
const stop=(id,at)=>administration(id,0,'',at,'stop');
const hypoxemia=p=>({...p,gasExchangeImpairment:.4});
const congestion=p=>({...p,circulatingVolumeMl:5300,interstitialFluidMl:p.interstitialFluidMl+4000});
const renal=p=>({...p,renalFunction:.2});
export const PILOT_SCENARIOS_487=Object.freeze([
 {id:'untreated',events:[]},
 {id:'oxygen-low',events:[o(1)]},{id:'oxygen-reference',events:[o()]},{id:'oxygen-high',events:[o(12)]},
 {id:'hypoxemia-untreated',events:[],profile:hypoxemia},
 {id:'hypoxemia-oxygen',events:[o()],profile:hypoxemia},
 {id:'refractory-oxygen',events:[o()],profile:p=>({...hypoxemia(p),oxygenResponsiveness:.1})},
 {id:'oxygen-stop',events:[o(),stop('oxygen',20)]},
 {id:'fluid-low',events:[f(125)]},{id:'fluid-reference',events:[f()]},{id:'fluid-high',events:[f(2000)]},
 {id:'fluid-repeat',events:[0,5,10,15,20].map(t=>f(1000,t))},
 {id:'pressor-low',events:[v(.01)]},{id:'pressor-reference',events:[v()]},{id:'pressor-high',events:[v(.5)]},
 {id:'pressor-stop',events:[v(),stop('vasopressor',20)]},
 {id:'morphine-low',events:[m(1)]},{id:'morphine-reference',events:[m()]},{id:'morphine-high',events:[m(12)]},
 {id:'morphine-repeat',events:[m(),m(4,15),m(4,30)]},{id:'renal-morphine',events:[m()],profile:renal},
 {id:'diuretic-low',events:[d(10)]},{id:'diuretic-reference',events:[d()]},{id:'diuretic-high',events:[d(160)]},
 {id:'diuretic-repeat',events:[d(),d(40,30),d(40,60)]},{id:'renal-diuretic',events:[d()],profile:renal},
 {id:'congestion-untreated',events:[],profile:congestion},
 {id:'congestion-fluid',events:[f(2000)],profile:congestion},
 {id:'congestion-diuretic',events:[d()],profile:congestion},
 {id:'combined-support',events:[o(),f(1000),v(),stop('vasopressor',120)]},
 {id:'morphine-stop',events:[m(),stop('morphine',20)]},
 {id:'diuretic-stop',events:[d(),stop('furosemide',20)]},
 {id:'hepatic-morphine',events:[m()],profile:p=>({...p,hepaticFunction:.2})},
 {id:'pending-fluid',events:[{...f(2000),status:'pending'}]}
]);
function nativePatient(t,p){
 return {gameMinute:p.nativeMinute,patientInstance:{uid:'native-reference-'+t.caseId},
  liveVitals:{...p.vitals},phys:p.physiology?structuredClone(p.physiology):null,
  administrationLog:t.administrations.filter(a=>a.clinicalMinute<=p.clinicalMinute+1e-9)
   .map(a=>({id:a.id,m:a.nativeMinute,count:a.count,doseDisplay:a.doseDisplay,defaultApplied:a.defaultApplied}))};
}
export function runPhysiologyPilot487(){
 const baseline=readFrozenNativeReference487(),cases=loadNativeReferenceSources487().cases;
 const nativeComparison=baseline.trajectories.map(t=>{
  const initial=nativePatient({...t,administrations:[]},t.initial);
  let shadow=createPhysiologyShadow487(cases.find(c=>c.id===t.caseId),initial,
   {clock:{mode:'native-no-typing',nativeMinutesPerClinicalMinute:.12}});
  const points=[];
  for(const p of t.points){
   const native=nativePatient(t,p),before=JSON.stringify(native);
   shadow=samplePhysiologyShadow487(shadow,native,{typing:false});
   if(JSON.stringify(native)!==before)throw Error('shadow mutated native patient');
   const sample=shadow.samples.at(-1),experimentalInitialVitals=Object.fromEntries(
    ['sys','dia','map','hr','rr','spo2','temp'].map(k=>[k,sample.experimental[k]]));
   points.push({...sample,administeredFluidMl:shadow.state.administeredFluidMl,
    ...(points.length===0?{experimentalInitialVitals}:{})});
  }
  return {caseId:t.caseId,scenarioId:t.scenarioId,orders:t.orders,actualAdministrations:t.administrations,
   points,issues:shadow.issues};
 });
 const timing=[];
 const newScenarios=baseline.caseEngines.flatMap(({id:caseId})=>{
  const t=baseline.trajectories.find(t=>t.caseId===caseId&&t.scenarioId==='untreated');
  const profile=createPilotProfile487(cases.find(c=>c.id===caseId),{liveVitals:t.initial.vitals,phys:t.initial.physiology});
  for(const [drugId,amount]of [['morphine',4],['furosemide',40]]){
   const id='timing-'+caseId,events=[{eventId:'timing',patientId:id,drugId,status:'administered',
    action:'bolus',route:'iv',dose:{amount,unit:'mg'},atClinicalMinute:0}];
   let state=createPhysiologyState487(profile,id),peak=0,peakMinute=0;
   for(let i=0;i<960;i++){
    state=stepPhysiology487(state,i===0?events:[],.25);
    const value=drugId==='morphine'?state.exposures[drugId]?.effect??0:state.drugDiuresisMlPerMin;
    if(value>peak){peak=value;peakMinute=state.clinicalMinute;}
   }
   timing.push({caseId,drugId,endpoint:drugId==='morphine'?'shared-opioid-effect':'urine-rate',
    peakMinute,peakValue:peak,clinicalCalibration:'pending'});
  }
  return PILOT_SCENARIOS_487.map(scenario=>{
   const patientId='counterfactual-'+caseId;
   let state=createPhysiologyState487(scenario.profile?scenario.profile(profile):profile,patientId),last=0;
   const events=scenario.events.map((e,i)=>({eventId:patientId+':'+scenario.id+':'+i,patientId,
    drugId:e.drugId,status:e.status??'administered',action:e.action,
    route:e.drugId==='oxygen'?'inhaled':'iv',dose:e.action==='stop'?undefined:{amount:e.amount,unit:e.unit},
    atClinicalMinute:e.atClinicalMinute,sequence:i}));
   const points=TIMES.map(time=>{
    state=stepPhysiology487(state,time===0?events:[],time-last);last=time;
    return {...observePhysiology487(state),inflammation:state.inflammation,infectionBurden:state.infectionBurden,
     cumulativeUrineMl:state.cumulativeUrineMl,cumulativeBloodLossMl:state.cumulativeBloodLossMl,
     exposures:Object.fromEntries(Object.entries(state.exposures).map(([id,x])=>[id,{central:x.central,effect:x.effect}]))};
   });
   return {caseId,scenarioId:scenario.id,events,points,
    final:{sourceControlled:state.sourceControlled,infectionBurden:state.infectionBurden,
     cumulativeBloodLossMl:state.cumulativeBloodLossMl,cumulativeUrineMl:state.cumulativeUrineMl,
     administeredFluidMl:state.administeredFluidMl,adverseEvents:state.adverseEvents}};
  });
 });
 return {schema:'atria-physiology-pilot/v1',modelVersion:'b1-shadow-1',baselineCommit:baseline.baselineCommit,
  clock:baseline.clock,scope:baseline.scope,nativeWrites:0,runtimeHooks:0,clinicalValidated:false,
  stochasticModel:false,nativeComparison,newScenarios,timing};
}
const n=x=>Number(x).toFixed(1),vitals=p=>`${n(p.sys)}/${n(p.dia)} · ${n(p.hr)} · ${n(p.rr)} · ${n(p.spo2)}`;
export function renderPhysiologyPilot487(result){
 const lines=['# ATRIA B1 — comparación fisiológica aislada','',
  'Baseline: `'+result.baselineCommit+'`. Modelo: `b1-shadow-1`. No hay activación clínica, escritura en pacientes, despliegue ni validación médica de magnitudes.',
  '', '## Reloj y alcance','',
  '24 trayectorias nativas y 120 muestras congeladas; 34 escenarios nuevos por caso, 102 trayectorias y 1.122 muestras hasta 360 minutos clínicos. Las órdenes nativas se convierten exclusivamente después de administrarse.',
  'Comparación sin escribir mientras el motor actual sigue siendo responsable del paciente. QA de VM/replay, sin instalación automática en el navegador. El adaptador global sigue rechazado por heparina.',
  '', 'El motor antiguo usa 0,12 minutos nativos por segundo real (0,03 al escribir); la guardia comprime un minuto clínico en un segundo real. La comparación divide por 0,12 con escritura desactivada. El núcleo integra cada 0,25 minutos clínicos y conserva el resto; la muestra declara ambos tiempos. No se corrige ningún reloj existente.',
  '', '## Misma administración: motor actual frente a sombra','',
  'Última muestra: 125 minutos clínicos, 15 minutos nativos, 125 segundos reales, dentro de protección de muerte temprana. PA sistólica/diastólica · FC · FR · SpO₂. Diferencia numérica no demuestra superioridad clínica.',
  '', '| Caso | Escenario | Actual | Sombra | Δ PAM | Δ SpO₂ |','|---|---|---|---|---:|---:|'];
 for(const t of result.nativeComparison){const p=t.points.at(-1);
  lines.push(`| ${t.caseId} | ${t.scenarioId} | ${vitals(p.native)} | ${vitals(p.experimental)} | ${n(p.delta.map)} | ${n(p.delta.spo2)} |`);
 }
 lines.push('','## Beneficio, daño y evolución del modelo nuevo','',
  'Estos son escenarios de soporte y contrafactuales del simulador. Ninguna de estas cinco intervenciones realiza hemostasia o control del foco. El tratamiento completo de sepsis/HDA/ascitis excede B1.',
  '', '| Caso | Escenario | PA · FC · FR · SpO₂ a 60 min | Volumen efectivo mL a 60 min | Perfusión a 60 min | Diuresis acumulada a 360 min mL | Eventos de riesgo modelados |',
  '|---|---|---|---:|---:|---:|---|');
 const show=new Set(['untreated','fluid-reference','combined-support','fluid-repeat','pressor-high','morphine-repeat',
  'diuretic-reference','congestion-fluid','congestion-diuretic','renal-morphine','renal-diuretic']);
 for(const t of result.newScenarios.filter(t=>show.has(t.scenarioId))){const p=t.points.find(p=>p.clinicalMinute===60);
  lines.push(`| ${t.caseId} | ${t.scenarioId} | ${vitals(p)} | ${n(p.circulatingVolumeMl)} | ${n(p.perfusion)} | ${n(t.final.cumulativeUrineMl)} | ${t.final.adverseEvents.map(e=>e.code).join(', ')||'—'} |`);
 }
 lines.push('','## Tiempos del modelo y calibración pendiente','',
  '| Caso | Medicamento IV | Pico calculado en minutos clínicos | Endpoint |','|---|---|---:|---|');
 for(const t of result.timing)lines.push(`| ${t.caseId} | ${t.drugId} | ${n(t.peakMinute)} | ${t.endpoint} |`);
 lines.push('', 'Furosemida se contrasta con el pico de diuresis regulatorio dentro de 30 minutos. El compartimento compartido de morfina **no distingue pico analgésico del pico de depresión del SNC**: sus picos aproximados de 40–45 minutos requieren revisión frente a endpoints regulatorios diferentes (analgesia IV dentro de 20 minutos en la ficha DBL; máximo SNC puede demorarse aproximadamente 30 minutos). No se declara validado ese tiempo ni se ajustaron ganancias para aprobar comparaciones contra el motor antiguo.',
  '', '## Arquitectura y API','',
  'Funciones puras, definiciones inmutables indexadas por ID, PK analítica y fisiología no lineal sobre una grilla fija. Las variables internas son volumen circulante/intersticial, tono vascular, bomba, perfusión, intercambio gaseoso, soporte de oxígeno, riesgo de sobrecarga, dolor, depresión respiratoria/sedación, función renal/hepática, inflamación/infección, estado de foco e isquemia. PA, FC, FR, SpO₂ y temperatura se derivan después; no son la entrada del efecto farmacológico.',
  '', '```mermaid','flowchart TD','  O["Orden"] --> N["Motor actual y ledger"]','  N --> E["Administración confirmada"]','  E --> K["Exposición y fisiología sombra"]','  P["Copia del estado inicial"] --> K','  K --> V["Observaciones sombra"]','  N --> C["Comparación QA"]','  V --> C','```',
  '', '```js',
  "const state = createPhysiologyState487(profile, 'patient-id');",
  'const next = stepPhysiology487(state, administeredEvents, deltaClinicalMinutes, definitions);',
  'const signs = observePhysiology487(next);',
  "const shadow = createPhysiologyShadow487(caseDef, initialPatient, {clock: {mode: 'native-no-typing', nativeMinutesPerClinicalMinute: 0.12}});",
  'const sampled = samplePhysiologyShadow487(shadow, patientSnapshot, {typing: false});','```',
  '', 'El contrato de evento contiene `eventId`, `patientId`, `drugId`, `status:administered`, acción, vía, dosis/unidad, minuto clínico y secuencia. Duplicados idénticos no actúan otra vez; payloads conflictivos o administraciones tardías nuevas exigen replay. Detener una infusión elimina su entrada, mientras detener bolos futuros no deshace un bolo recibido. Parámetros y nuevas dependencias están documentados en `parameters-487.md` y en el plan de escalabilidad.',
  '', '## Lectura y límites','',
  '- PERI-SEC: soporte puede elevar presión u oxigenación mientras siguen infección, inflamación y fuga capilar; el foco permanece sin controlar.',
  '- HDA: fluidos pueden mejorar presión; la pérdida de sangre continúa. Diuréticos agravan la depleción y el modelo todavía no representa Hb/transporte de oxígeno.',
  '- CIRR: el líquido intersticial puede disminuir con diuresis, sin curación instantánea de cirrosis/ascitis; el fallo renal reduce respuesta. Volemia efectiva baja y ascitis pueden coexistir.',
  '- La dosis alta/repetida puede mostrar riesgos; exposición excesiva de noradrenalina eleva presión sin garantizar perfusión, morfina reduce dolor y ventilación.',
  '- En HDA/CIRR no existe volumen/perfusión nativos que comparar; el JSON conserva `nativePhysiology:null`.',
  '- El historial antiguo se limita a80 filas y no suministra suspensiones completas. Para esos escenarios el núcleo recibe eventos tipados explícitos; no se infiere suspensión desde la última dosis.',
  '- Aún pendientes: calibración profesional de magnitudes y picos, hemoglobina/CO₂/electrolitos, balance renal ordinario, resistencia/antimicrobianos/control real del foco, muerte posprotección y Android/iOS físico.',
  '- Superioridad demostrada: propiedad informática de reutilización y efectos finitos dependientes del estado; ausencia de bonificación de oxígeno en normoxemia y separación de diuresis/ascitis de una penalización fija de PA. **Superioridad cuantitativa clínica todavía no demostrada.**',
  '', '## Reproducción','',
  '`npm run qa:physiology-pilot` genera el análisis en memoria. `npm run qa:physiology-pilot -- --write` actualiza explícitamente este informe y su JSON. Los tests no regeneran snapshots.',
  '`npm run qa:physiology-benchmark` mide exclusivamente Node. Las hipótesis clínicas independientes y sus fuentes están en `clinical-expectations-487.json` y `ATRIA_487_PHYSIOLOGY_PILOT_EVIDENCE.md`.','');
 const benchmarkPath=new URL('./benchmark-487.json',import.meta.url);
 if(fs.existsSync(benchmarkPath)){
  const b=JSON.parse(fs.readFileSync(benchmarkPath,'utf8'));
  lines.push('## Rendimiento medido','',`Node ${b.runtime}, ${b.platform}/${b.arch}, ${b.cpu}. Núcleo solamente; sin renderizado, motor antiguo, red o retención de muestras sombra. No es Android/iOS físico. 100 pasos de calentamiento y 600 mediciones por escenario.`,
   '', '| Pacientes | Intervenciones | Definiciones instaladas | p50 lote ms | p95 lote ms | p99 lote ms |',
   '|---:|---:|---:|---:|---:|---:|');
  for(const x of b.measurements)lines.push(`| ${x.patientCount} | ${x.treatmentCount} | ${x.registrySize} | ${x.batchP50Ms.toFixed(3)} | ${x.batchP95Ms.toFixed(3)} | ${x.batchP99Ms.toFixed(3)} |`);
  lines.push('', `Heap retenido estimado con GC: ${n(b.memory.estimatedHeapBytesPerPatient)} bytes/paciente (${b.memory.patients} pacientes). Estado JSON típico: ${b.memory.serializedStateBytes} bytes; con 2.048 recibos: ${b.memory.serializedStateBytesAt2048Receipts} bytes. Son medidas distintas; el historial tiene un límite explícito y requiere checkpoints antes de ampliar retención en móvil.`,
   '', 'El tick cuesta O(pacientes × (fármacos activos + mecanismos activos + eventos pendientes acotados)). Compilar el catálogo cuesta O(definiciones) una vez. Copiar el índice de deduplicación cuesta O(historial) únicamente al ingresar nuevos recibos; no se recorre en cada tick. El observador QA retiene hasta 256 muestras y no satisface por sí solo un presupuesto de memoria de ejecución móvil. Los presupuestos y ensayos de dispositivo pendientes están en el plan de escalabilidad.','');
 }
 return lines.join('\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=runPhysiologyPilot487();
 if(process.argv.includes('--write')){
  fs.writeFileSync(new URL('./pilot-comparison-487.json',import.meta.url),JSON.stringify(result)+'\n');
  fs.writeFileSync(new URL('../ATRIA_487_PHYSIOLOGY_PILOT_RESULTS.md',import.meta.url),renderPhysiologyPilot487(result));
 }
 console.log(JSON.stringify({model:result.modelVersion,baseline:result.baselineCommit,nativeTrajectories:24,
  newTrajectories:result.newScenarios.length,nativeWrites:0,clinicalValidated:false,reportsWritten:process.argv.includes('--write')}));
}
