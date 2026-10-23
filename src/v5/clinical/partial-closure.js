import {CASE_CLOSURE_RULES_487} from '../../clinical/case-completion-487.js';
import {csDxMatchesCase487,csDxNorm487} from '../../clinical/diagnostic-impression-487.js';

// V5 opt-in partial evaluation using the *existing* native score, safety data,
// consultation and closure receipt owner. No second case executor or XP ledger.
const PERITONITIS_DESTINATIONS=Object.freeze({
 'PERI-PBE-001':({sys,spo2})=>(sys<90||spo2<90?'uti':'sala'),
 'PERI-SEC-001':()=> 'quirofano',
 'PERI-TER-001':({sys,spo2,baselineVitals})=>
  (sys<90||spo2<90||baselineVitals?.sys<90?'uti':'sala')
});
const BROAD_DIAGNOSIS=Object.freeze({
 'CIRR-001':/\b(ascitis|hepatopatia|enfermedad hepatica|sindrome ascitico|hipertension portal)\b/,
 'APP-001':/\b(abdomen agudo|dolor abdominal|apendicular|inflamacion abdominal)\b/,
 'PERI-PBE-001':/\b(peritonitis|sepsis abdominal|infeccion del liquido ascitico|abdomen agudo)\b/,
 'PERI-SEC-001':/\b(peritonitis|abdomen agudo|infeccion intraabdominal|sepsis abdominal)\b/,
 'PERI-TER-001':/\b(peritonitis|abdomen agudo|sepsis abdominal|infeccion posoperatoria)\b/
});
export function diagnosticMultiplier(p,c,cases){
 const value=csDxNorm487(p.diagnosis);
 if(!value)return 0;
 if(csDxMatchesCase487(cases,c.id,p.diagnosis))return 1;
 return BROAD_DIAGNOSIS[c.id]?.test(value)?.6:0;
}
export function partialDisposition(p,c,destination,assessment,{cases}={}){
 if(p.caseEnded||p.patientDied)return {ready:false,missing:['Atención ya finalizada.']};
 const rule=CASE_CLOSURE_RULES_487[c.id];
 const allowed=rule?.destinations||[PERITONITIS_DESTINATIONS[c.id]?.({
  sys:p.liveVitals.sys,spo2:p.liveVitals.spo2,baselineVitals:p.baselineVitals
 })].filter(Boolean);
 if(!allowed.includes(destination))return {ready:false,
  missing:['El servicio o destino solicitado no corresponde al estado actual del paciente.']};
 if((destination==='alta'||destination==='sala'||destination==='observacion')&&
  (p.liveVitals.sys<90||p.liveVitals.spo2<90))
  return {ready:false,missing:['El paciente está inestable; no corresponde cerrar con ese destino.']};
 if(destination==='quirofano'&&!csDxMatchesCase487(cases,c.id,p.diagnosis))
  return {ready:false,missing:['Cirugía rechaza el traslado: la impresión diagnóstica no justifica la indicación.']};
 if(['quirofano','uti','procedimiento'].includes(destination)){
  const service=destination==='quirofano'?'cirugia':destination==='uti'?'uti':'gastro';
  if(!p.consults?.some(x=>x.id===service&&x.status==='done'&&x.accepted))
   return {ready:false,missing:['El servicio receptor aún no aceptó la derivación. Solicitá la interconsulta y aguardá su respuesta.']};
 }
 const original=assessment?.quality;
 if(!original||!Number.isFinite(original.score))
  return {ready:false,missing:['El evaluador clínico no confirmó la puntuación.']};
 const factor=diagnosticMultiplier(p,c,cases);
 const raw=original.score,score=Math.max(0,Math.min(100,Math.round(raw*factor)));
 const quality={...original,score,diagnosticFactor:factor,scoreBeforeDiagnosticFactor:raw,
  diagnosticPenalty:raw-score};
 return {ready:true,action:destination,choices:[destination],missing:[],quality,
  partial:!assessment?.ready||factor!==1};
}
