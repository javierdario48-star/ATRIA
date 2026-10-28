// Pure clinical preflight shared by nursing and the native bedside executor.
// This reads documented evidence; it never orders a study or changes a patient.
import {confirmedClinicalTreatment} from './receipts.js';
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const noBleedingDrugs=new Set(['aspirin','ticagrelor','clopidogrel','enoxaparin','heparin_therapeutic','alteplase_stroke','alteplase_pe']);
const fail=(reason,message)=>({reason,message});
const complete=(p,id,minute)=>confirmedClinicalTreatment(p,id,minute);

export function clinicalInterventionEligibility(p,c,id,clock={}){
 const policy=c?.clinicalPolicy;if(!policy)return null; // The 25 GI contracts retain their exact freedom of execution.
 const rule=policy.eligibility?.[id]||{},traits=new Set([...(policy.traits||[]),...(p.clinicalTraits||[])]);
 const minute=Number.isFinite(clock.nativeMinute)?clock.nativeMinute:0;
 const studies=(p.orders||[]).filter(o=>o.patientUid===p.uid&&o.status==='done'&&
  (!Number.isFinite(o.readyAtMinute)||!Number.isFinite(clock.clinicalMinute)||o.readyAtMinute<=clock.clinicalMinute+1e-9));
 const done=new Set(studies.map(o=>o.id));
 const history=new Set((p.intentHistory||[]).filter(x=>x.patientUid===undefined||x.patientUid===p.uid)
  .map(x=>typeof x.id==='string'?x.id.replace(/^anamnesis:/,''):x.id));
 const evidence=studies.map(o=>norm(o.result)).join('\n');
 const v=p.liveVitals||{},unstable=v.sys<90||v.spo2<90||v.hr>=150||v.rr>=35;
 const excluded=[...(rule.excludeTraits||[])];
 if(noBleedingDrugs.has(id))excluded.push('activeBleeding','intracranialBleed','intracranialBleeding','aorticDissection');
 if(excluded.some(t=>traits.has(t)))return fail('clinical-contraindication','La indicación tiene una contraindicación clínica documentada; no ejecutada.');
 if((rule.requiredStudies||[]).some(s=>!done.has(s))&&!(rule.unlessUnstable&&unstable)||
  (rule.requiresHistory||[]).some(h=>!history.has(h)))
  return fail('clinical-evidence-required','Completar los estudios y antecedentes requeridos antes de esta intervención.');
 if((rule.requiresCompletedTreatments||[]).some(treatmentId=>!complete(p,treatmentId,minute)))
  return fail('clinical-treatment-required','Confirmar la finalización real del tratamiento previo antes de esta intervención.');
 for(const prerequisite of rule.requiresStudiesAfterTreatments||[]){
  const treatment=complete(p,prerequisite.treatmentId,minute);
  if(!treatment)return fail('clinical-treatment-required','Confirmar la finalización real del tratamiento previo antes de esta intervención.');
  const completedAt=treatment.completedAtNativeMinute??treatment.administeredAtNativeMinute;
  const after=studies.some(o=>o.id===prerequisite.studyId&&typeof o.sourceEventId==='string'&&o.sourceEventId&&
   (p.orders||[]).filter(x=>x.sourceEventId===o.sourceEventId).length===1&&
   Number.isFinite(o.sampledAtNativeMinute)&&o.sampledAtNativeMinute>=completedAt&&o.sampledAtNativeMinute<=minute);
  if(!after)return fail('clinical-post-treatment-study-required','Confirmar el estudio de control obtenido después de completar el tratamiento previo.');
 }
 const bp=rule.bpLimit;
 if(bp&&(!Number.isFinite(v.sys)||!Number.isFinite(v.dia)||
  Number.isFinite(bp.min)&&v.sys<bp.min||Number.isFinite(bp.max)&&v.sys>bp.max||
  Number.isFinite(bp.sys)&&v.sys>bp.sys||Number.isFinite(bp.dia)&&v.dia>bp.dia))
  return fail('clinical-blood-pressure-limit','La presión actual no está dentro de los límites de esta indicación.');
 const limit=rule.onsetLimitMinutes??rule.maxOnsetMinutes;
 const onset=rule.onsetMinutes??policy.onsetMinutes??policy.lastKnownWellMinutes;
 if(Number.isFinite(limit)&&(!Number.isFinite(onset)||onset+minute>limit+1e-9))
  return fail('clinical-onset-window-exceeded','La ventana temporal de esta intervención no está confirmada o está superada.');
 if(rule.requiresNoIntracranialBleed){
  const imaging=studies.filter(o=>o.type==='imaging'||/(?:^|_)ct$|cran|cerebr/i.test(o.id));
  if(!imaging.some(o=>/sin\s+(?:evidencia de\s+)?hemorragia|no\s+(?:hay\s+)?(?:evidencia de\s+)?hemorragia/.test(norm(o.result))))
   return fail('clinical-evidence-required','Confirmar imagen cerebral sin hemorragia antes de esta intervención.');
 }
 if(rule.requiresLargeVesselOcclusion&&!studies.some(o=>/cta|angio/i.test(o.id)&&
  /oclusion|trombo/.test(norm(o.result))&&!/sin\s+oclusion|no\s+(?:hay\s+)?oclusion/.test(norm(o.result))))
  return fail('clinical-evidence-required','Falta confirmar una oclusión de gran vaso tratable.');
 if(rule.requiresFavorablePerfusion&&!studies.some(o=>/perfusion/i.test(o.id)&&/favorable|mismatch/.test(norm(o.result))))
  return fail('clinical-evidence-required','Falta confirmar un perfil de perfusión elegible.');
 if(rule.requiresConfirmedAneurysm&&!studies.some(o=>/cta|angio/i.test(o.id)&&
  /aneurisma/.test(norm(o.result))&&!/sin\s+aneurisma|no\s+(?:hay\s+)?aneurisma/.test(norm(o.result))))
  return fail('clinical-evidence-required','Falta confirmación vascular del aneurisma.');
 if(rule.requiresCoronaryAnatomy&&!studies.some(o=>/coronario|angiografia|coronariografia/.test(norm(o.label)+' '+norm(o.id))&&
  !/no (?:realizada|disponible)|pendiente/.test(norm(o.result)))&&!p.procedures?.coronary_angiography?.performed)
  return fail('clinical-evidence-required','Definir la anatomía coronaria antes de elegir esta carga de P2Y12.');
 if(rule.anticoagulant&&!norm(c.history?.meds).includes(norm(rule.anticoagulant)))
  return fail('clinical-anticoagulant-mismatch','La reversión solicitada no corresponde al anticoagulante documentado.');
 if(Number.isFinite(rule.minimumPlatelets)){
  const value=evidence.match(/plaquetas\s*([\d.,]+)/)?.[1];
  if(value&&Number(value.replace(/[.,]/g,''))<rule.minimumPlatelets)
   return fail('clinical-contraindication','Recuento plaquetario incompatible con esta indicación.');
 }
 if(Number.isFinite(rule.maximumINR)){
  const value=evidence.match(/inr\s*([\d.,]+)/)?.[1];
  if(value&&Number(value.replace(',','.'))>rule.maximumINR)
   return fail('clinical-contraindication','INR incompatible con esta indicación.');
 }
 if(rule.disablingDeficit===true&&(p.neurology?.nihss??policy.neurologyBaseline?.nihss)===0)
  return fail('clinical-contraindication','No se documentó un déficit incapacitante actual.');
 if(Number.isFinite(rule.afterThrombolysisMinutes)){
  const lytic=(p.administrationLog||[]).find(t=>t.patientUid===p.uid&&t.id==='alteplase_stroke'&&t.action!=='stop'&&
   (t.dose?.amount>0||t.status==='administering'));
  if(lytic&&minute-lytic.administeredAtNativeMinute<rule.afterThrombolysisMinutes)
   return fail('clinical-post-thrombolysis-restriction','Respetar la espera y neuroimagen de control posteriores a la trombólisis.');
 }
 if(rule.requiresSafeSwallowOrEnteralTube){
  const screen=complete(p,'swallow_screen',minute);
  const safe=screen?.resultSafe===true&&p.swallowScreen?.patientUid===p.uid&&p.swallowScreen?.safe===true;
  const tube=Object.values(p.procedures||{}).some(t=>t.patientUid===p.uid&&t.performed&&t.active!==false&&
   ['enteral_tube','ngt'].includes(t.id));
  if(!safe&&!tube)return fail('clinical-swallow-assessment-required','Confirmar evaluación de deglución segura o una sonda enteral colocada antes de administrar.');
 }
 // These high-risk drugs have an explicit indication, not a universal default.
 if(id==='alteplase_stroke'&&!policy.eligibility?.alteplase_stroke)
  return fail('clinical-indication-not-supported','No se documentó elegibilidad para trombólisis cerebral.');
 if(id==='alteplase_pe'){
  if(!traits.has('obstructiveShockPE'))return fail('clinical-indication-not-supported','La trombólisis pulmonar está reservada a TEP de alto riesgo elegible.');
  if(!history.has('bleeding')||!history.has('meds')||!studies.some(o=>/echo|ctpa/.test(o.id)))
   return fail('clinical-evidence-required','Documentar riesgo hemorrágico, medicación y evidencia de TEP de alto riesgo antes de reperfundir.');
 }
 if(id==='lung_protective_ventilation'&&!complete(p,'intubation',minute))
  return fail('clinical-airway-required','Confirmar intubación antes de ajustar ventilación invasiva protectora.');
 if(id==='niv'&&(traits.has('unprotectedAirway')||traits.has('undrainedPneumothorax')||traits.has('neuromuscularWeakness')))
  return fail('clinical-contraindication','La presentación requiere protección de vía aérea o drenaje; VNI no validada.');
 return null;
}
