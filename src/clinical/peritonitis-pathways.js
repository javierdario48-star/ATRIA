// ATRIA 4.8.7 QA — three existing peritonitis seeds, one lightweight disposition contract.
// This module owns NO timers, diagnosis generation, nurse tasks, browser state or new physiology.
// It inspects confirmed evidence and completed actions from the existing clinical engine.
export const PERITONITIS_IDS_V487 = Object.freeze([
  'PERI-PBE-001','PERI-SEC-001','PERI-TER-001'
]);

// Accepts ordinary JSON; keep function self-contained for safe build-time injection.
export function csPeritonitisEvaluate487(snapshot = {}) {
  const id=String(snapshot.caseId||'');
  if(!['PERI-PBE-001','PERI-SEC-001','PERI-TER-001'].includes(id))return null;
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const dx=normalize(snapshot.diagnosis);
  const done=new Set(snapshot.studiesDone||[]);
  const medications=new Set(snapshot.administered||[]);
  const consultations=snapshot.consultsDone||[];
  const hasDrug=id=>medications.has(id);
  const consult=id=>consultations.includes(id);
  const missing=[];
  const initialSys=Number(snapshot.initialSys||snapshot.sys||120);
  const critical=Number(snapshot.sys||120)<90||Number(snapshot.spo2||98)<90||snapshot.color==='ROJO';
  // A patient resuscitated from shock still needs an appropriate critical-care handoff.
  const recentShock=initialSys<90;
  const alteredPerfusion=Number(snapshot.sys||120)<95||initialSys<95;
  const historyOk=Number(snapshot.historyCount||0)>=1;
  const examOk=!!snapshot.examDone||Number(snapshot.examRegionsCount||0)>=2;
  const vitalsOk=!!snapshot.vitalsKnown;
  // In documented secondary-peritonitis shock, delaying a surgical handoff
  // solely for elective history questions is unsafe; hand off that history as
  // incomplete instead, while preserving all therapy/consultation gates.
  const emergencySecondary=id==='PERI-SEC-001'&&(initialSys<90||critical)&&vitalsOk&&examOk;
  if(snapshot.patientDied||snapshot.caseEnded)return {caseId:id,ready:false,action:null,missing:['Atención ya finalizada o paciente fallecido.'],critical};
  if(!historyOk&&!emergencySecondary)missing.push('Obtener anamnesis pertinente.');
  if(!vitalsOk)missing.push('Registrar signos vitales.');
  if(!examOk && !(critical&&Number(snapshot.historyCount||0)>=2))
    missing.push('Realizar examen abdominal dirigido.');

  const diagnostic={
    'PERI-PBE-001':/(peritonitis.*espontanea|pbe\b|espontanea.*peritonitis)/.test(dx),
    'PERI-SEC-001':/(peritonitis.*secundaria|peritonitis.*perforacion|perforacion.*diverticular|diverticulitis.*perforada)/.test(dx),
    'PERI-TER-001':/(peritonitis.*terciaria|peritonitis.*persistente)/.test(dx)
  }[id];
  if(!diagnostic&&snapshot.diagnosticCompatible!==true)missing.push('Registrar una impresión diagnóstica etiológica, no solo el síndrome.');

  if(id==='PERI-PBE-001'){
    // Ascitic cell count matters, not merely guessing the word "PBE".
    if(!done.has('pbe_paracentesis'))missing.push('Confirmar el cuadro con paracentesis diagnóstica.');
    if(!(['ceftriaxone','imipenem','piptazo'].some(hasDrug)))
      missing.push('Iniciar antibiótico apropiado y confirmar administración.');
    if(!hasDrug('albumin'))missing.push('Administrar albúmina según el protocolo del caso.');
  }
  if(id==='PERI-SEC-001'){
    // In extremis, peritoneal signs + history permit surgical transfer before CT.
    const imaging=done.has('peri_ct')||done.has('peri_rx');
    const urgentClinical=(critical||recentShock)&&vitalsOk&&examOk;
    if(!imaging&&!urgentClinical)missing.push('Obtener imagen orientadora o justificar urgencia por clínica grave.');
    const coverage=(hasDrug('ceftriaxone')&&hasDrug('metronidazole'))||
      (hasDrug('ceftazidime')&&hasDrug('metronidazole'))||
      (hasDrug('cefoperazone')&&hasDrug('metronidazole'))||
      hasDrug('piptazo')||hasDrug('imipenem');
    if(!coverage)missing.push('Administrar cobertura antibiótica intraabdominal adecuada.');
    if(!consult('cirugia'))missing.push('Obtener respuesta de interconsulta quirúrgica.');
    // A surgical referral is NOT equivalent to a source-control procedure already done.
  }
  if(id==='PERI-TER-001'){
    // Cultures are obtained promptly if useful, but results are NEVER a prerequisite
    // for empiric antimicrobial treatment or a safe ICU/OR transfer.
    const reviewed=done.has('ter_ct')||((critical||recentShock)&&examOk&&Number(snapshot.historyCount||0)>=1);
    if(!reviewed)missing.push('Reevaluar el foco con TC si está estable o priorizar el deterioro grave por clínica.');
    const coverage=hasDrug('piptazo')||hasDrug('imipenem')||
      (hasDrug('ampicillin')&&hasDrug('amikacin')&&(hasDrug('fluconazole')||hasDrug('amphotericin')));
    if(!coverage)missing.push('Iniciar tratamiento antimicrobiano coherente con el cuadro.');
    // Late microbiology provides a handoff recommendation, never a closure gate.
    // Selected high-risk patients may warrant empiric antifungal coverage BEFORE cultures.
    if(!consult('uti')&&!consult('cirugia'))missing.push('Obtener respuesta del equipo receptor (UTI o Cirugía).');
    // Source control in tertiary peritonitis is conditional on a residual focus.
  }

  if(alteredPerfusion&&!hasDrug('fluid')&&!hasDrug('vasopressor'))
    missing.push('Iniciar soporte hemodinámico para la hipoperfusión.');
  if(Number(snapshot.spo2||98)<90&&!hasDrug('oxygen'))
    missing.push('Proporcionar soporte de oxígeno ante hipoxemia.');

  const destination=id==='PERI-PBE-001'?(critical?'uti':'sala'):
    id==='PERI-SEC-001'?'quirofano':((critical||recentShock)?'uti':'sala');
  const labels={sala:'Internar en sala',uti:'Derivar a UTI',quirofano:'Derivar a quirófano'};
  const ready=missing.length===0;
  return {caseId:id,ready,critical,historyDeferredForEmergency:emergencySecondary&&!historyOk,diagnostic,evidenceSufficient:missing.every(x=>!(/anamnesis|signos|examen|impresi|imagen|paracentesis|foco/.test(normalize(x)))),
    action:ready?destination:null,label:ready?labels[destination]:null,
    missing,allowedDestinations:ready?[destination]:[],
    followUp:(id==='PERI-TER-001'&&/candida/i.test(String(snapshot.studyResults?.ter_culture||''))&&
      !hasDrug('fluconazole')&&!hasDrug('amphotericin'))?
      'Resultado tardío con Candida: comunicar al equipo receptor y revisar antifúngico según riesgo, especie y sensibilidad.':null,
    // The evaluator only authorizes a safe handoff. No surgery is silently performed.
    procedurePerformed:!!snapshot.sourceControlled
  };
}

// Reads EXISTING runtime data; no new clinical state is manufactured.
export function csPeritonitisSnapshot487(s,c) {
  if(!s||!c)return null;
  const consultations=typeof s.consults?.entries==='function'?[...s.consults.entries()].filter(([,x])=>x?.status==='done').map(([id])=>id):[];
  return {
    caseId:c.id,diagnosis:s.diagnosis||'',
    // Shared autocomplete recognizer; no different private diagnosis field.
    // Absent in pure Node bots or older runtimes: legacy safe matcher remains.
    diagnosticCompatible:typeof window!=='undefined'&&typeof window.csDx487?.matchesCase==='function'?
      window.csDx487.matchesCase(c.id,s.diagnosis||''):undefined,
    historyCount:(s.intentHistory||[]).filter(x=>x&&typeof x.id==='string').length,
    examDone:!!s.examDone,examRegionsCount:s.examRegions?.size||0,
    vitalsKnown:!!s.lastVitalsKnown,
    studiesDone:[...(s.orders?.entries?.()||[])].filter(([,o])=>o?.status==='done').map(([id])=>id),
    studyResults:Object.fromEntries([...(s.orders?.entries?.()||[])].filter(([,o])=>o?.status==='done').map(([id,o])=>[id,String(o.result||'').slice(0,700)])),
    administered:(s.administrationLog||[]).filter(x=>x&&typeof x.id==='string').map(x=>x.id),
    consultsDone:consultations,sys:Number(s.liveVitals?.sys||0)||120,
    initialSys:Number(s.nsCareBaseline?.sys)||Number(String(c.vitals?.bp||'').split('/')[0])||Number(s.liveVitals?.sys)||120,
    spo2:Number(s.liveVitals?.spo2||0)||98,
    patientDied:!!s.patientDied,caseEnded:!!s.caseEnded,
    sourceControlled:!!s.phys?.sourceControlled
  };
}
