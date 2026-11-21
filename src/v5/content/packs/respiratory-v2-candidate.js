// Experimental RESP-01 clinical revision. No active catalog registration.
// Reuses defineClinicalCase and the *same* V5 medication, time, complication,
// consultation, closure, scoring, nursing and persistence owners as V1.
// Logical ID remains RESP-01; compare against V1 in an isolated test catalog.
import {defineClinicalCase} from '../clinical-case-definition.js';
import {respiratoryCaseDefinitions} from './respiratory-pack.js';

const original=respiratoryCaseDefinitions.find(c=>c.id==='RESP-01');
if(!original)throw Error('RESP-01 V1 source missing');
const candidate=structuredClone(original);
candidate.clinicalRevision='v2-candidate';
candidate.revisionSource='atria-respiratory@1.0.0:RESP-01';
candidate.title='Neumonía adquirida en la comunidad de bajo riesgo';
candidate.difficulty='intermedia'; // Includes chance of an unpredictable setback.
// No fabricated laboratory result is sent at diagnosis time: a new sample is
// acquired and, if dynamic, reads the real native physiology at collection time.
candidate.studies.push(
 {id:'g_resp01_v2_gas',label:'Gasometría arterial de reevaluación',
  aliases:['gasometria arterial','gases arteriales','gasometría'],type:'lab',
  delay:5,repeatable:true,dynamic:true,
  result:'Aire ambiente: pH 7,41, PaCO2 36 mmHg, PaO2 84 mmHg, HCO3 23 mmol/l.'},
 {id:'g_resp01_v2_lactate',label:'Lactato de reevaluación',
  aliases:['lactato','lactato arterial','acido lactico'],type:'lab',
  delay:6,repeatable:true,dynamic:true,
  result:'Lactato 1,2 mmol/l; sin hipoperfusión significativa en la muestra basal.'}
);
candidate.interventionIds.push('oxygen');
candidate.keyInterventions=['amoxicillin'];
const policy=candidate.clinicalPolicy;
// This is a GAME scenario chance, not an epidemiological incidence or a
// medical prediction. A seeded candidate may arise even after correct therapy;
// progression is owned by the native complication engine, not scripted here.
policy.complications=[{
 id:'resp01_v2_hypoxemic_setback',
 progressionId:'offset-ramp-v1',rescueId:'confirmed-rescue-v1',
 probability:0.2,minMinute:3,requiredState:{spo2:{lt:97}},
 offsets:[0.6,12,6,-4,-2,-6],riseMinutes:12,recoveryMinutes:15,
 rescueAllOf:['amoxicillin','oxygen'],
 rationale:'Complicación intercurrente hipoxémica simulada aun con atención inicial adecuada; requiere reevaluar y aportar oxígeno.',
 manifestation:'Empeora la disnea y desciende la saturación; reevaluar, administrar oxígeno y considerar observación o internación.'
}];
const closure=policy.closure;
closure.destinations=['alta','observacion','sala'];
closure.treatmentByDestination={
 alta:[['amoxicillin']],
 observacion:[['amoxicillin']],
 sala:[['amoxicillin','oxygen']]
};
closure.consult={sala:['clinica']};
// Opt-in generic guard: unresolved active deterioration cannot be dismissed
// simply by temporarily raising SpO2. Existing V1 cases do not enable it.
closure.dischargeRequiresResolvedComplications=true;
closure.minimumObservationMinutes=5;
closure.summary='Evaluar NAC, tratamiento apropiado confirmado y reevaluación. Una complicación hipoxémica seleccionada por semilla puede aparecer incluso con antibiótico correcto. No dar de alta durante complicación activa; rescate fisiológico real y observación o sala según respuesta. La aceptación de Clínica no sustituye la estabilización ni el plan de seguimiento.';

export const resp01V2Candidate=defineClinicalCase(candidate);
export const resp01V2ExperimentalPack=Object.freeze({
 schemaVersion:1,packId:'atria-respiratory-resp01-v2-staging',
 version:'2.0.0-candidate.1',cases:[resp01V2Candidate]
});
