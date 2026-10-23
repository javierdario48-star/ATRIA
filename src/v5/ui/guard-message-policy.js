// Pure UI conversation policy. The clinical engine owns findings and XP.
export const publicClinicalText=value=>String(value||'')
 .replace(/Sin hallazgo específico modelado en este escenario\.?/gi,'—')
 .replace(/(?:Inspección|Auscultación|Percusión|Palpación) no disponible en esta simulación\.?/gi,'—')
 .replace(/,?\s*sin focalidad neurológica modelada\.?/gi,'.');
const CLOSE_TEXT=Object.freeze({
 observacion:'De acuerdo, queda en observación.',
 sala:'De acuerdo, preparo la internación en sala.',
 alta:'De acuerdo, preparo el alta y las indicaciones.',
 quirofano:'Cirugía aceptó al paciente. Preparo el traslado a quirófano.',
 uti:'UTI aceptó al paciente. Preparo el traslado.',
 procedimiento:'El servicio receptor aceptó. Preparo el traslado al procedimiento.'
});
export function activeNurseGuidance(rows,cue,patientId){
 const id=cue?'nurse-guidance:'+patientId+':'+cue.id:null;
 return id?rows.filter(row=>row.id===id):[];
}
export function visibleClinicalRows(rows,{concluded=false}={}){
 return !concluded?rows:rows.filter(row=>row.role!=='nurse'||
  !/^Caso cerrado\s*:/i.test(row.text));
}
export function selectNurseGuidance({cue,patientId,concluded=false,freshPatient=false,
 now=0,lastCueAt=-Infinity,lastPatientAt=-Infinity,seen}={}){
 if(!cue||!patientId||concluded||freshPatient||
  now-lastCueAt<28000||now-lastPatientAt<12000||
  seen?.has(patientId+':'+cue.id))return null;
 return {id:'nurse-guidance:'+patientId+':'+cue.id,name:'Enfermera',role:'nurse',text:cue.text};
}
export function finalNurseMessage(state){
 const patient=state?.patient,receipt=patient?.closure;
 if(!patient||!receipt?.closed||!CLOSE_TEXT[receipt.destination])return null;
 return {id:'nurse-final:'+patient.uid+':'+receipt.eventId,
  name:'Enfermera',role:'nurse',text:CLOSE_TEXT[receipt.destination]};
}
