// Developer-only executable certification. Every clinical fact below is read
// from the ordinary guard runtime after public bedside commands and real time.
// No patient, vital, clock, death, treatment or XP field is assigned by this bot.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createGuardRuntime} from '../../src/v5/clinical/guard-runtime.js';
import {createNavigation} from '../../src/v5/engine/navigation.js';
import {CLINICAL_BOT_PLAYBOOK} from '../../src/v5/clinical/clinical-bot-playbooks.js';
import {isPhysicianExamStudy} from '../../src/v5/clinical/exam-contract.js';
import {nativeTreatmentDefinition} from '../../src/v5/clinical/native-medications.js';
import {clinicalInterventionEligibility} from '../../src/v5/clinical/native-medication-eligibility.js';
import {confirmedClinicalTreatment,isDeliveredClinicalAdministration} from '../../src/v5/clinical/receipts.js';
import {clinicalTransferContinuation} from '../../src/v5/clinical/transfer-continuation.js';
import {generatePatientVariation} from '../../src/v5/content/patient-variation.js';
import {diagnosticRequirements} from '../../src/v5/clinical/diagnostic-evidence.js';

export const CLINICAL_CERTIFICATION_PROFILES=Object.freeze([
 'competent','slow','inexperienced','negligent','omit-studies','wrong-medication',
 'no-allergy-question','abandon','complication-rescue'
]);
export const CLINICAL_CERTIFICATION_MODES=Object.freeze(['solo','apprentice','coop','competitive']);
const checkNames=['history','exam','studies','treatment','trajectory','closure','xp'];
const vitalKeys=['temp','hr','rr','sys','dia','spo2'];
// Changes are compared with the actual initial native patient, never monitor
// display noise. These thresholds exceed floating-point integration noise.
const meaningful={temp:.01,hr:.1,rr:.05,sys:.1,dia:.1,spo2:.1};
const copy=x=>structuredClone(x);
const round=x=>Number(Number(x).toFixed(6));
const unique=xs=>[...new Set(xs)];
const readContent=name=>JSON.parse(readFileSync(new URL('../../src/v5/content/'+name+'.json',import.meta.url)));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const patientIdentity=p=>({patientUid:p.uid,caseId:p.caseId,name:p.name??null,age:p.age??null,
 personality:p.personality??null,opening:p.opening??null,variation:copy(p.variation??null),
 backgroundHistory:copy(p.backgroundHistory??null),allergyHistory:copy(p.allergyHistory||[]),
 allergies:copy(p.allergies||[]),severeAllergies:copy(p.severeAllergies||[]),intolerances:copy(p.intolerances||[])});
// Optional native receipt properties may be undefined in memory. Certification
// is a strict JSON envelope: omit absent object fields without coercing any
// observed number, array entry or other clinical value.
function plainEvidence(value){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){
  if(!Number.isFinite(value))throw Error('nonfinite clinical certification evidence');
  return value;
 }
 if(Array.isArray(value))return value.map(plainEvidence);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
  .filter(([,entry])=>entry!==undefined).map(([key,entry])=>[key,plainEvidence(entry)]));
 throw Error('unsupported clinical certification evidence');
}
function random(seed){
 let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);
 return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
}

/** A pure content composition, before activation. Staged content is not
 * inserted into a production catalog to make its certification possible. */
export async function clinicalCertificationContent(additionalCases=[]){
 const base={map:readContent('hospital'),beds:readContent('beds'),cases:readContent('cases'),
  therapies:readContent('therapies'),defaultDoses:readContent('default-doses')};
 const {createClinicalContent}=await import('../../src/v5/content/clinical-content.js');
 return createClinicalContent(base,{additionalCases});
}

function historyQuestions(c){
 return unique([...(c.requiredHistory||[]),'allergies','meds','pmh']).flatMap(id=>{
  const intent=c.intents?.find(x=>x.id===id),key=intent?.keys?.[0];
  if(key)return [{intentId:id,text:'¿'+key+(!c.clinicalPolicy&&id==='onset'?' empezó el dolor':'')+'?'}];
  const generic={allergies:'¿Tiene alergias?',meds:'¿Qué medicación toma?',pmh:'¿Qué antecedentes tiene?'}[id];
  return generic?[{intentId:id,text:generic}]:[];
 });
}
function firstAllowedTreatmentGroup(c,destination){
 const rule=c.clinicalPolicy?.closure,groups=rule?.treatmentByDestination?.[destination]||rule?.treatment||[];
 // Prefer an authored receiver alternative when the source explicitly offers
 // one. Transfer is never evidence that a definitive operation was performed.
 const receiver=rule?.consult?.[destination]?.length;
 return (receiver?groups.find(group=>group.every(id=>nativeTreatmentDefinition(id,c)?.kind!=='procedure')):null)||groups[0]||[];
}
function targetedExam(selection){
 const [region,technique]=selection.split(':');
 if(['heart','lungs'].includes(region)&&technique==='auscultation')return '/examen thorax auscultation';
 return region==='neurological'?'/examen neurological neurological':
  technique?'/examen '+region+' '+technique:'/examen '+region;
}

/** Case policy is data; this selects a declared clinical strategy rather than
 * creating another closure, medication or physiology implementation. */
export function deriveClinicalCertificationPlan(c,content){
 if(!c?.id)throw Error('clinical certification requires a case definition');
 const legacy=CLINICAL_BOT_PLAYBOOK[c.id],policy=c.clinicalPolicy,rule=policy?.closure;
 const baselineSys=Number(String(c.vitals?.bp).split('/')[0]);
 const critical=baselineSys<90||c.vitals?.spo2<90||c.vitals?.hr>=140||c.vitals?.rr>=30;
 const destinations=rule?.destinations||[legacy?.dest].filter(Boolean);
 const surgicalTransfer=destinations.includes('quirofano')&&(policy?.definitiveInterventions||[])
  .some(id=>nativeTreatmentDefinition(id,c)?.kind==='procedure');
 const receiverAlternative=destinations.find(id=>rule?.treatmentByDestination?.[id]&&rule?.consult?.[id]?.length);
 const destination=critical&&destinations.includes('uti')?'uti':surgicalTransfer?'quirofano':receiverAlternative||destinations[0];
 if(!destination)throw Error(c.id+': no declared executable destination');
 const treatmentIds=policy?unique([...firstAllowedTreatmentGroup(c,destination),...(rule.dischargeTreatments||[])]):
  (c.keyInterventions||[]).filter(id=>!['surgery','source_control'].includes(id));
 if(policy){
  const offered=new Set((c.interventions||[]).map(x=>x.id));
  // These are ordinary support indications, evaluated again by the real
  // medication owner. They cannot turn a receiving service into a procedure.
  if(c.vitals?.spo2<94&&offered.has('oxygen')&&!treatmentIds.includes('oxygen'))treatmentIds.unshift('oxygen');
  if(baselineSys<90&&policy.trajectory?.fluidResponse>0&&offered.has('fluid')&&!treatmentIds.includes('fluid'))treatmentIds.unshift('fluid');
  if(baselineSys<90&&offered.has('vasopressor')&&!treatmentIds.includes('vasopressor'))treatmentIds.unshift('vasopressor');
  if(treatmentIds.some(id=>policy.eligibility?.[id]?.requiresSafeSwallowOrEnteralTube)&&offered.has('swallow_screen'))
   treatmentIds.unshift('swallow_screen');
 }
 const pendingStudyIds=policy?[]:unique(legacy?.pendingStudies||[]);
 const studyIds=unique([...(policy||!Array.isArray(legacy?.studies)?c.keyStudies||[]:legacy.studies),...pendingStudyIds,...(rule?.requiredStudies||[]),
  ...(rule?.study||[]).flat(),
  ...treatmentIds.flatMap(id=>[...(policy?.eligibility?.[id]?.requiredStudies||[]),
   ...(policy?.eligibility?.[id]?.requiresStudiesAfterTreatments||[]).map(rule=>rule.studyId)])]).filter(id=>!isPhysicianExamStudy(id));
 const exams=unique(['general','inspection','auscultation','percussion','palpation'].map(x=>'/examen '+x)
  .concat((legacy?.exams||[]),(rule?.requiredExams||[]).map(targetedExam),
   policy?.neurologyBaseline?['/glasgow all']:[]));
 const consults=rule?unique(rule.consult?.[destination]||[]):
  legacy?.consult?[legacy.consult.replace(/^\/consulta\s+/,'')]:[];
 // Giving a steroid before an antibiotic is an authored administration
 // requirement, not a reason to hold early antibiotics for a study result.
 if(treatmentIds.includes('dexamethasone')){
  treatmentIds.splice(treatmentIds.indexOf('dexamethasone'),1);treatmentIds.unshift('dexamethasone');
 }
 const history=[...(legacy?.history||[]).map((text,index)=>({intentId:'native-question-'+index,text})),...historyQuestions(c)];
 return {caseId:c.id,diagnosis:legacy?.dx||c.dx?.[0],destination,history,exams,
  studyIds,pendingStudyIds,treatmentIds,consults,legacyMedicationCommands:policy?null:(legacy?.meds||[]),
  minimumObservationSeconds:legacy?.wait??0,critical};
}

function treatmentDefinition(content,id,c){
 const source=content.clinicalTreatments;
 return nativeTreatmentDefinition(id,c)||(source instanceof Map?source.get(id):source?.[id])||content.therapies.find(x=>x.id===id);
}
export function treatmentCommand(c,content,id){
 if(id==='iv')return 'Enfermera una vía';
 if(id==='monitor')return '/monitor conectar';
 const definition=treatmentDefinition(content,id,c),regimen=c.clinicalPolicy?.regimens?.[id];
 if(definition?.kind==='procedure'||definition?.kind==='conduct')return '/tratamiento '+id;
 const dose=regimen?.dose||definition?.dose||content.defaultDoses?.[id];
 const route=regimen?.route||definition?.route;
 const unit=dose?.unit?.replace(/[µμ]g/g,'mcg');
 // The native noradrenaline contract requires the molecule name as well as
 // its rate; a generic vasopressor identifier is deliberately insufficient.
 const molecule=id==='vasopressor'?' noradrenalina':'';
 return '/tratamiento '+id+molecule+(dose?' '+dose.amount+' '+unit:'')+(route?' '+route:'');
}
function roomForScenario(c,mode,seed,profile){
 const prefix='cert:'+mode+':'+c.id+':'+hash(String(seed)).slice(0,12);
 if(profile!=='complication-rescue'||!c.variation||!c.clinicalPolicy?.complications?.length)return prefix;
 // Select a documented deterministic candidate by searching ordinary patient
 // identities. No clinical state or RNG result is injected into the runtime.
 for(let ordinal=0;ordinal<256;ordinal++){
  const roomId=prefix+':'+ordinal,uid=roomId+':patient';
  const variation=generatePatientVariation(c.variation,uid+':'+c.id,{guardSeed:roomId,patientIndex:0});
  if(variation.complicationCandidates.length)return roomId;
 }
 return prefix;
}
function snapshot(view){
 const s=view.clinical,p=s.patient;
 return {atRealSecond:round(s.clock.clinicalMinute),atNativeMinute:round(s.clock.nativeMinute),
  patientUid:p.uid,vitals:Object.fromEntries(vitalKeys.map(k=>[k,round(p.liveVitals?.[k])])),
  administrations:p.administrationLog?.length??0,treatments:p.treatments?.length??0,
  studiesDone:p.orders.filter(x=>x.status==='done').length,pending:p.pendingTreatments?.length??0,
  critical:!!p.survival?.observedCritical,died:!!p.patientDied,deathReason:p.deathReason??null,
  deathAtRealSecond:p.patientDied?(p.survival?.atRealSecond??null):null,
  closed:!!p.closure?.closed,destination:p.closure?.destination??null,xp:s.progress.xp,
  shiftEnded:!!s.shift?.ended,shiftElapsedSeconds:s.shift?.elapsedSeconds??null,
  exposureNativeMinutes:round(p.survival?.exposureNativeMinutes??0)};
}
function failedCase(c,options,error){
 return {caseId:c?.id??null,passed:false,profile:options.profile||'competent',mode:options.mode||'solo',
  checks:Object.fromEntries(checkNames.map(k=>[k,false])),failures:[String(error?.message||error)]};
}
function collectReceipts(state){
 const receipts=[];
 for(const event of state.room.events){
  if(['chat.posted','clinical.completed'].includes(event.type))for(const item of event.clinical||[])
   if(item.status==='executed'&&item.receipt)receipts.push({...copy(item.receipt),
    commandId:event.commandId||event.message?.id,kind:item.kind,id:item.id});
 }
 return receipts;
}
function actualTreatment(p,id,minute){
 if(id==='iv')return p.venousAccessCount>0&&p.procedures.iv?.patientUid===p.uid;
 if(id==='monitor')return p.procedures.monitor?.connected&&p.procedures.monitor.patientUid===p.uid;
 return !!confirmedClinicalTreatment(p,id,minute);
}

/** A read-only decision over evidence collected at the public runtime boundary.
 * A check that was not requested is null, never represented as a successful
 * restart, network exchange or observed rescue. */
export function assessClinicalCertificationEvidence(row){
 const observations=row.observations||[],initial=row.initial,final=row.final;
 const validRecovery=r=>!!r&&['samePatient','sameClinicalPatient','sameAdministrations','sameXP',
  'sameEventIds','sameClock','sameClaims'].every(key=>r[key]===true)&&
  (!r.replayedCommandId||r.replayUnchanged===true);
 const clock=!!initial&&!!final&&observations.length>=2&&observations.every((sample,index)=>
  Number.isFinite(sample.atRealSecond)&&Number.isFinite(sample.atNativeMinute)&&
  sample.patientUid===row.patientUid&&vitalKeys.every(key=>Number.isFinite(sample.vitals?.[key]))&&
  sample.atRealSecond>=(observations[index-1]?.atRealSecond??initial.atRealSecond)&&
  Math.abs(sample.atNativeMinute-initial.atNativeMinute-(sample.atRealSecond-initial.atRealSecond)*.12)<1e-5);
 const tasks=row.nursing?.tasks||[],administrations=row.administrations||[];
 const nursing=tasks.every(task=>task.patientUid===row.patientUid&&typeof task.eventId==='string')&&
  administrations.every(a=>tasks.some(task=>task.eventId===a.sourceEventId&&task.stage==='confirmed'&&
   typeof task.nurseId==='string'&&task.patientUid===a.patientUid));
 const closure=row.closureReceipt,views=row.sharedViews||[],members=row.memberIds||[];
 const expectedRecipients=closure?.closed?(row.mode==='competitive'?[row.careActorId]:members):[];
 const expectedAdministrations=administrations.map(a=>a.sourceEventId);
 const validClaims=claims=>Array.isArray(claims)&&claims.length===expectedRecipients.length&&
  new Set(claims.map(([,claim])=>claim.actorId)).size===claims.length&&claims.every(([,claim])=>
   expectedRecipients.includes(claim.actorId)&&claim.patientUid===row.patientUid&&
   claim.eventId===closure?.eventId&&claim.xp===closure?.xp);
 const sync=members.length>0&&views.length===members.length&&
  new Set(views.map(view=>view.actorId)).size===members.length&&views.every(view=>
   members.includes(view.actorId)&&view.patientUid===row.patientUid&&view.patientDigest===row.patientDigest&&
   hash(view.administrationEventIds)===hash(expectedAdministrations)&&
   view.progressXP===row.progress?.xp&&view.closureEventId===(closure?.eventId??null)&&
   hash(view.deathEvents)===hash(views[0].deathEvents)&&validClaims(view.claims));
 const score=closure?.quality?.score;
 const expectedXP=Number.isFinite(score)?score===0?0:Math.max(4,Math.round((16+score*.95)*(row.mode==='solo'?1.2:1))):null;
 const performanceXP=closure?.closed?Number.isFinite(score)&&score>=0&&score<=100&&
  closure.xp===expectedXP&&row.progress?.xp===expectedXP:
  row.progress?.xp===0&&(row.xpReceipts||[]).length===0;
 const definitions=row.complicationDefinitions||[],episodes=row.complications||[];
 const complicationRescue=row.profile!=='complication-rescue'||!definitions.length?null:
  episodes.length>0&&episodes.every(episode=>{
   const observed=(row.complicationObservations||[]).find(x=>x.id===episode.id);
   const definition=definitions.find(def=>def.id===episode.id);
   // A definitive operation owned by the accepting surgical receiver is a
   // verified handoff of the active complication, never a recovered episode.
   const transferred=(definition?.rescueAllOf||[]).filter(id=>row.receiverOwnedDefinitiveProcedures?.includes(id));
   if(transferred.length&&closure?.closed&&closure.destination==='quirofano')return !!observed&&
    Number.isFinite(episode.onsetAt)&&episode.status!=='recovered'&&
    !row.treatments.some(t=>transferred.includes(t.id))&&
    row.plan.consults.some(id=>row.consultations.some(c=>c.id===id&&c.accepted===true&&c.status==='done'));
   return definitions.some(def=>def.id===episode.id)&&observed&&episode.status==='recovered'&&
    Number.isFinite(episode.onsetAt)&&episode.rescueAt>=episode.onsetAt&&episode.recoveredAt>episode.onsetAt&&
    episode.rescueEvents?.length>0&&episode.rescueEvents.every(eventId=>row.treatments.some(t=>
     t.sourceEventId===eventId&&t.patientUid===row.patientUid))&&
    (row.rescueActions||[]).some(action=>action.complicationId===episode.id&&
     action.issuedAtNativeMinute>=observed.atNativeMinute&&row.treatments.some(t=>
      t.id===action.treatmentId&&t.patientUid===row.patientUid&&
      t.administeredAtNativeMinute>=action.issuedAtNativeMinute));
  });
 const terminal=final?.died?!!row.terminalIntegrity&&Object.values(row.terminalIntegrity).every(value=>value===true)&&
  (row.deathEvents||[]).length===1&&!closure?.closed:
  closure?.closed?!!row.closureIntegrity&&['replayUnchanged','singleClosureReceipt','singleXPReceipt','noDeathEvent']
   .every(key=>row.closureIntegrity[key]===true):null;
 const integrityChecks={clock,nursing,persistence:row.recoveryRequested?
  validRecovery(row.recovery)&&validRecovery(row.recovery?.final):null,sync,performanceXP,complicationRescue,terminal};
 const failures=checkNames.filter(key=>row.checks?.[key]!==true).map(key=>'missing actual '+key+' evidence');
 for(const [key,value] of Object.entries(integrityChecks))if(value===false)failures.push('failed runtime integrity '+key+' evidence');
 if(final?.died)failures.push('native patient death: '+final.deathReason);
 return {integrityChecks,failures,passed:failures.length===0};
}
function finalEvidence(row,view,checkpoint,c,plan){
 const s=view.clinical,p=s.patient,receipts=collectReceipts(s);
 row.patientIdentity.final=patientIdentity(p);
 row.patientIdentity.identityUnchanged=hash(row.patientIdentity.initial)===hash(row.patientIdentity.final);
 row.final=snapshot(view);row.history=copy(p.intentHistory||[]);row.examLog=copy(p.examLog||[]);
 row.studies=copy(p.orders);row.administrations=copy(p.administrationLog||[]);
 row.treatments=copy(p.treatments);row.consultations=copy(p.consults||[]);
 row.adverseEvents=copy(p.adverseEvents||[]);row.complications=copy(p.policyState?.complications||p.clinicalComplications||p.complications||[]);
 row.closureReceipt=copy(p.closure??null);row.xpReceipts=copy(s.progress.receipts);row.progress=copy(s.progress);
 row.readiness=copy(s.closure);row.eligibleDestinations=copy(s.eligibleDestinations);
 row.pendingTreatments=copy(p.pendingTreatments||[]);row.policyState=copy(p.policyState??null);
 row.patientDigest=hash(p);row.complicationDefinitions=copy(c.clinicalPolicy?.complications||[]);
 row.receiverOwnedDefinitiveProcedures=(c.clinicalPolicy?.definitiveInterventions||[])
  .filter(id=>nativeTreatmentDefinition(id,c)?.kind==='procedure');
 row.safetyHistory={allergyQuestionAsked:row.history.some(x=>x.id==='allergies'||x.id==='anamnesis:allergies'),
  medicationQuestionAsked:row.history.some(x=>x.id==='meds'||x.id==='anamnesis:meds'),
  documentedAllergies:copy(p.allergies||[]),severeAllergies:copy(p.severeAllergies||[])};
 row.clinicalReceipts=receipts;
 row.deathEvents=copy(s.room.events.filter(x=>x.type==='clinical.patient-died'));
 row.nursing={tasks:copy((checkpoint.world.nursing?.tasks||[]).map(([,x])=>x).filter(x=>x.patientUid===p.uid)),
  confirmedEventIds:(checkpoint.world.nursing?.tasks||[]).map(([,x])=>x)
   .filter(x=>x.patientUid===p.uid&&x.stage==='confirmed').map(x=>x.eventId)};
 const answered=new Set(row.history.filter(x=>x.patientUid===p.uid&&x.eventId&&x.answer).map(x=>x.id));
 const done=new Set(p.orders.filter(x=>x.patientUid===p.uid&&x.status==='done'&&x.sourceEventId&&x.result&&
  x.readyAtMinute<=s.clock.clinicalMinute+1e-8).map(x=>x.id));
 const examExecuted=row.examLog.length>0&&row.examLog.every(x=>x.patientUid===p.uid&&x.eventId)&&p.examDone;
 const requiredExams=(c.clinicalPolicy?.closure?.requiredExams||diagnosticRequirements(c).examinations);
 const targeted=requiredExams.every(selection=>{
  const [region,technique]=selection.split(':');
  if(region==='neurological')return row.examLog.some(x=>x.regionId==='neurological'||x.technique==='neurological');
  if(['heart','lungs'].includes(region)&&technique==='auscultation')return !!p.examFindings?.thorax?.auscultation;
  return row.examLog.some(x=>x.regionId===region&&x.technique===technique)||!!p.examFindings?.[region]?.[technique];
 });
 const legacyActions=row.legacyTreatmentActions||[];
 const handoff=p.closure?.closed?p.closure.handoff:null;
 const continuing=(handoff?.continuingAdministrations||[]).filter(proof=>p.administrationLog.some(a=>
  a.id===proof.id&&a.sourceEventId===proof.sourceEventId&&a.deliveryFraction===proof.deliveredFraction&&
  isDeliveredClinicalAdministration(p,a,s.clock.nativeMinute)));
 const ongoingIds=new Set(continuing.map(x=>x.id)),ongoingEvents=new Set(continuing.map(x=>x.sourceEventId));
 const deferredTreatments=(handoff?.deferredTreatmentIds||[]).filter(id=>c.clinicalPolicy?.eligibility?.[id]?.requiresCompletedTreatments?.some(prior=>ongoingIds.has(prior)));
 const deferredStudies=(handoff?.deferredStudyIds||[]).filter(id=>c.studies.find(s=>s.id===id)?.requiresCompletedTreatments?.some(prior=>ongoingIds.has(prior)));
 row.handoffContinuations={continuingAdministrations:copy(continuing),deferredTreatments,deferredStudies};
 const nativeTreatments=c.clinicalPolicy?plan.treatmentIds.every(id=>actualTreatment(p,id,s.clock.nativeMinute)||ongoingIds.has(id)||deferredTreatments.includes(id)):
  legacyActions.length>0&&legacyActions.every(action=>receipts.some(receipt=>receipt.patientUid===p.uid&&
   receipt.commandId===action.commandId&&receipt.id===action.id&&receipt.kind===action.kind));
 const administrativeIntegrity=row.administrations.every(a=>a.patientUid===p.uid&&a.sourceEventId&&
  (p.treatments.filter(t=>t.sourceEventId===a.sourceEventId&&t.id===a.id).length===1||ongoingEvents.has(a.sourceEventId)))&&
  new Set(row.administrations.map(x=>x.sourceEventId)).size===row.administrations.length;
 const pendingStudyIds=plan.pendingStudyIds||[];
 const confirmedStudies=plan.studyIds.length>0?plan.studyIds.every(id=>done.has(id)||deferredStudies.includes(id)||pendingStudyIds.includes(id)&&
  p.orders.some(order=>order.id===id&&order.patientUid===p.uid&&order.sourceEventId&&order.status==='pending'&&
   order.requestedAtMinute<=s.clock.clinicalMinute&&order.readyAtMinute>s.clock.clinicalMinute)):
  requiredExams.length>0&&targeted; // A required physician examination is explicitly diagnostic evidence.
 const closure=p.closure;
 const actualClosure=!!closure?.closed&&closure.patientUid===p.uid&&closure.destination===plan.destination&&
  typeof closure.eventId==='string'&&receipts.some(x=>x.closure?.eventId===closure.eventId&&x.closure.closed);
 const xp=!!closure&&closure.xp>0&&s.progress.receipts.length===1&&s.progress.receipts[0].patientUid===p.uid&&
  s.progress.receipts[0].eventId===closure.eventId&&s.progress.receipts[0].xp===closure.xp&&s.progress.xp===closure.xp;
 const sourceQuestions=CLINICAL_BOT_PLAYBOOK[c.id]?.history||[];
 const nativeHistory=!c.clinicalPolicy&&sourceQuestions.length>0&&sourceQuestions.every(text=>
  row.commands.filter(command=>command.text===text).some(command=>command.clinical.some(item=>item.kind==='history.ask'&&
   item.status==='executed'&&receipts.some(receipt=>receipt.commandId===command.id&&receipt.patientUid===p.uid&&receipt.answer))));
 row.checks={history:nativeHistory||(c.requiredHistory||[]).length>0&&(c.requiredHistory||[]).every(id=>answered.has(id)),
  exam:!!examExecuted&&targeted,studies:confirmedStudies,
  treatment:(c.clinicalPolicy?plan.treatmentIds.length>0:legacyActions.length>0)&&nativeTreatments&&administrativeIntegrity,
  trajectory:!!row.firstMeaningfulPhysiologicalDelta,
  closure:actualClosure&&(!plan.consults.length||plan.consults.some(id=>p.consults.some(x=>x.id===id&&x.patientUid===p.uid&&x.accepted&&x.status==='done'))),
  xp};
 Object.assign(row,assessClinicalCertificationEvidence(row));
 row.outcome=p.patientDied?'native-death':closure?.closed?'accepted-destination':'alive-unclosed';
 row.evidenceDigest=hash({caseId:c.id,initial:row.initial,final:row.final,administrations:row.administrations,
  studies:row.studies,closure:row.closureReceipt,xp:row.xpReceipts,deathEvents:row.deathEvents});
 return row;
}

/** One real player journey. The runtime owns fixed world steps and the native
 * clinical rate. Advancing wall time never assigns its native clock directly. */
export async function runClinicalCaseScenario(c,{content,mode='solo',profile='competent',
 seed='clinical-certification-v1',horizon=1440,recovery=false,traceEvery=10,source={},
 wrongMedicationCommand='Enfermera furosemida 40 mg'}={}){
 if(!CLINICAL_CERTIFICATION_PROFILES.includes(profile)||!CLINICAL_CERTIFICATION_MODES.includes(mode)||
  !Number.isFinite(horizon)||horizon<=0||horizon>1440)throw Error('invalid clinical certification scenario');
 const options={mode,profile},row={caseId:c.id,profile,mode,seed:String(seed),authority:'createGuardRuntime',
  source:{...copy(source),caseId:c.id,caseDefinitionDigest:hash(c),nativePolicy:c.clinicalPolicy?'declarative-v5':'legacy-native'},
  horizonRealSeconds:horizon,clockStepRealSeconds:{initial:.25,longitudinal:1},
  commands:[],observations:[],firstMeaningfulPhysiologicalDelta:null,recovery:null,recoveryRequested:recovery,
  complicationObservations:[],rescueActions:[]};
 let runtime;
 try{
  content??=await clinicalCertificationContent([c]);
  c=content.cases.find(candidate=>candidate.id===c.id)||c;
  row.source.caseDefinitionDigest=hash(c);
  const plan=deriveClinicalCertificationPlan(c,content);row.plan=copy(plan);
  // The authored receiving surgical pathway is a handoff, not an operation
  // performed at the bedside. Keep the native complication active until an
  // actual procedural receipt exists; never queue that operation across transfer.
  const transferredProcedures=new Set(plan.destination==='quirofano'?
   (c.clinicalPolicy?.definitiveInterventions||[]).filter(id=>treatmentDefinition(content,id,c)?.kind==='procedure'):[]);
  const seeded=random(seed),roomId=roomForScenario(c,mode,seed,profile);
  const members=mode==='coop'||mode==='competitive'?
   [{id:'host',name:'Certificación anfitrión'},{id:'doctor',name:'Certificación médico'}]:[{id:'doctor',name:'Certificación médico'}];
  const hostId=members[0].id,actorId='doctor';let nowMs=1700000000000,sequence=0;
  row.memberIds=members.map(member=>member.id);row.careActorId=actorId;
  const factory=checkpoint=>createGuardRuntime({content,roomId,caseId:c.id,members,hostId,mode,nowMs,checkpoint});
  runtime=await factory(null);let view=runtime.view(actorId);const uid=view.clinical.patient.uid;
  row.patientIdentity={patientUid:uid,initial:patientIdentity(view.clinical.patient),restoredIdentityUnchanged:true};
  row.patientUid=uid;row.initial=snapshot(view);const baseline=copy(view.clinical.patient.liveVitals);
  const observe=force=>{
   view=runtime.view(actorId);const sample=snapshot(view),previous=row.observations.at(-1);
   if(!row.firstMeaningfulPhysiologicalDelta){
    const delta=Object.fromEntries(vitalKeys.map(k=>[k,round(view.clinical.patient.liveVitals[k]-baseline[k])]));
    if(vitalKeys.some(k=>Math.abs(delta[k])>=meaningful[k]))row.firstMeaningfulPhysiologicalDelta={
     atRealSecond:sample.atRealSecond,atNativeMinute:sample.atNativeMinute,delta,vitals:copy(sample.vitals),
     administrationsAtObservation:sample.administrations};
   }
   if(force||!previous||sample.atRealSecond-previous.atRealSecond>=traceEvery-1e-8||
    sample.administrations!==previous.administrations||sample.studiesDone!==previous.studiesDone||
    sample.closed!==previous.closed||sample.died!==previous.died)row.observations.push(sample);
   for(const episode of view.clinical.patient.policyState?.complications||[])if(!row.complicationObservations.some(x=>x.id===episode.id))
    row.complicationObservations.push({id:episode.id,atRealSecond:sample.atRealSecond,atNativeMinute:sample.atNativeMinute,
     onsetAt:episode.onsetAt,status:episode.status});
   return view;
  };
  const recoveryEvidence=(before,after)=>({samePatient:after.clinical.patient.uid===before.clinical.patient.uid,
   sameClinicalPatient:hash(after.clinical.patient)===hash(before.clinical.patient),
   sameAdministrations:hash(after.clinical.patient.administrationLog)===hash(before.clinical.patient.administrationLog),
   sameXP:hash(after.clinical.progress)===hash(before.clinical.progress),
   sameEventIds:hash(after.clinical.room.events)===hash(before.clinical.room.events),
   sameClock:hash(after.clinical.clock)===hash(before.clinical.clock),sameClaims:hash(after.claims)===hash(before.claims),
   sameIdentity:hash(patientIdentity(after.clinical.patient))===hash(patientIdentity(before.clinical.patient))});
  const advance=async seconds=>{
   const left=horizon-view.clinical.clock.clinicalMinute;
   if(left<=1e-8)return observe(false);
   nowMs+=Math.max(1,Math.round(Math.min(left,seconds)*1000));
   let advanced=await runtime.advanceTo(nowMs,{maxSteps:3600});
   while(advanced.recovering)advanced=await runtime.advanceTo(nowMs,{maxSteps:3600});
   return observe(false);
  };
  const send=async(text,id=null)=>{
   const commandId=id||'care-'+(++sequence),ack=await runtime.post(actorId,{id:commandId,text,targetPatientUid:uid});
   row.commands.push({id:commandId,text,atRealSecond:round(view.clinical.clock.clinicalMinute),
    status:ack.status,reason:ack.reason??null,routeError:ack.routeError??null,clinical:copy(ack.clinical||[])});
   observe(false);return {id:commandId,ack,text,issuedAtRealSecond:view.clinical.clock.clinicalMinute};
  };
  observe(true);
  const admission=view.clinical.shift.patients.find(x=>x.uid===uid);
  row.reception={arrival:{patientUid:uid,caseId:admission.caseId,bedId:admission.bedId,
   arrivalAtRealSecond:admission.arrivalAt,triage:copy(admission.triage)},confirmedFocusPatientUid:null};
  const nav=createNavigation(content.map),atBed=nav.center(...content.beds.find(b=>b.id===admission.bedId).approach);
  if(profile!=='abandon'){
   if(!runtime.motion(actorId,[atBed.x,atBed.y],1))throw Error('doctor path to admitted patient rejected');
   while(view.clinical.clock.clinicalMinute<Math.min(horizon,30)&&!runtime.claim(actorId,uid))await advance(.25);
   view=runtime.view(actorId);row.reception.confirmedFocusPatientUid=view.clinical.shift.confirmedFocusPatientUid;
   if(row.reception.confirmedFocusPatientUid!==uid)throw Error('no real bedside reception claim');
  }
  const competent=['competent','complication-rescue','no-allergy-question','slow','omit-studies'].includes(profile);
  const pace=profile==='slow'?()=>3+seeded()*7:()=>0;
  const action=async text=>{const out=await send(text),delay=pace();if(delay)await advance(delay);return out;};
  const history=plan.history.filter(x=>profile!=='no-allergy-question'||x.intentId!=='allergies');
  let firstOrder=null;const requestedStudies=new Set();
  const canRequestStudy=(id,state)=>!(c.studies.find(study=>study.id===id)?.requiresCompletedTreatments||[])
   .some(treatmentId=>!confirmedClinicalTreatment(state.patient,treatmentId,state.clock.nativeMinute));
  if(profile!=='abandon'){
   await action('Hola, ¿qué le pasó?');
   for(const question of profile==='negligent'?[]:profile==='inexperienced'?history.slice(0,1):history)await action(question.text);
   await action('/signos');
   if(!['inexperienced','negligent'].includes(profile))await action('/monitor conectar');
   for(const text of profile==='negligent'?[]:profile==='inexperienced'?plan.exams.slice(0,2):plan.exams)await action(text);
   if(profile!=='negligent')await action('/diagnostico '+plan.diagnosis);
   if(!['omit-studies','inexperienced','negligent'].includes(profile))for(const id of plan.studyIds)if(canRequestStudy(id,view.clinical)){
    await action('/estudio '+id);requestedStudies.add(id);
   }
   if(competent){
    if(c.clinicalPolicy){
     // Access is requested through the nurse owner, before IV medication can
     // leave preparation. Its pending receipt is never counted as access.
     const needsAccess=plan.treatmentIds.some(id=>id==='iv'||treatmentDefinition(content,id,c)?.requiresAccess||
      (c.clinicalPolicy.regimens?.[id]?.route||treatmentDefinition(content,id,c)?.route)==='iv');
     if(needsAccess)firstOrder=await action('Enfermera una vía');
   }else for(const text of plan.legacyMedicationCommands){
    const ordered=await action(text);firstOrder??=ordered;
    row.legacyTreatmentActions??=[];
    row.legacyTreatmentActions.push(...(ordered.ack.clinical||[]).filter(item=>
     ['therapy.request','procedure.request','monitor.set'].includes(item.kind)).map(item=>
     ({id:item.id,kind:item.kind,commandId:ordered.id})));
   }
   }else if(profile==='wrong-medication'){
    await action('Enfermera una vía');
    row.unsafeMedicationCommand=wrongMedicationCommand;firstOrder=await action(wrongMedicationCommand);
   }
  }
  const requested=new Set(),consulted=new Map(),rescued=new Set();let nextReassessment=0,recovered=false;
  let lastCloseAttempt=-Infinity,wrongRepeatAt=0;
  while(view.clinical.clock.clinicalMinute<horizon-1e-8){
   const s=view.clinical,p=s.patient,second=s.clock.clinicalMinute;
   if(p.patientDied||p.closure?.closed||s.shift?.ended)break;
   if(competent&&c.clinicalPolicy){
    if(profile!=='omit-studies')for(const id of plan.studyIds)if(!requestedStudies.has(id)&&canRequestStudy(id,s)){
     await action('/estudio '+id);requestedStudies.add(id);
    }
    const done=new Set(p.orders.filter(x=>x.status==='done').map(x=>x.id));
    for(const id of plan.treatmentIds){
     if(requested.has(id)||id==='iv')continue;
     const eligibility=c.clinicalPolicy.eligibility?.[id];
     if((eligibility?.requiredStudies||[]).some(x=>!done.has(x)))continue;
     if(clinicalInterventionEligibility(p,c,id,s.clock))continue;
     if(eligibility?.requiresSafeSwallowOrEnteralTube&&!actualTreatment(p,'swallow_screen',s.clock.nativeMinute))continue;
     if(id==='lung_protective_ventilation'&&!actualTreatment(p,'intubation',s.clock.nativeMinute))continue;
     const ordered=await action(treatmentCommand(c,content,id));requested.add(id);firstOrder??=ordered;
    }
    const oxygen=confirmedClinicalTreatment(p,'oxygen',s.clock.nativeMinute);
    if(oxygen&&s.clock.nativeMinute-oxygen.administeredAtNativeMinute>=5&&p.liveVitals.spo2<85&&
     c.interventions.some(x=>x.id==='intubation')&&!requested.has('intubation')&&!rescued.has('intubation')&&
     !actualTreatment(p,'intubation',s.clock.nativeMinute)&&!clinicalInterventionEligibility(p,c,'intubation',s.clock)){
     const command=await action(treatmentCommand(c,content,'intubation'));rescued.add('intubation');
     row.rescueActions.push({complicationId:'refractory-hypoxemia',treatmentId:'intubation',commandId:command.id,
      issuedAtNativeMinute:s.clock.nativeMinute,issuedAtRealSecond:command.issuedAtRealSecond});
    }
   }
   if(competent)for(const service of plan.consults)if(!p.consults.some(row=>row.id===service&&row.accepted)&&
    !p.pendingConsults.some(row=>row.id===service)&&second-(consulted.get(service)??-Infinity)>=15){
    await action('/consulta '+service);consulted.set(service,second);
   }
   if(competent&&second>=nextReassessment){await action('/reevaluar');nextReassessment=second+15;}
   // Rescue is triggered by an observed native complication. No seed, flag,
   // physiology or complication candidate is assigned to force it to occur.
   if(competent){
    const emerged=[...(p.policyState?.complications||[]),...(p.clinicalComplications||[]),...(p.complications||[]),...(p.adverseEvents||[])];
    for(const def of c.clinicalPolicy?.complications||[]){
     const active=emerged.some(x=>x.id===def.id||x.complicationId===def.id||x.kind===def.id);
     if(!active)continue;
     for(const id of [...(def.rescueAllOf||[]),...(def.rescueAnyOf||[]).slice(0,1)])if(!transferredProcedures.has(id)&&!rescued.has(id)&&!actualTreatment(view.clinical.patient,id,view.clinical.clock.nativeMinute)){
      const issuedAtNativeMinute=view.clinical.clock.nativeMinute,command=await action(treatmentCommand(c,content,id));rescued.add(id);
      row.rescueActions.push({complicationId:def.id,treatmentId:id,commandId:command.id,issuedAtNativeMinute,
       issuedAtRealSecond:command.issuedAtRealSecond});
     }
    }
   }
   if(profile==='wrong-medication'&&second>=wrongRepeatAt&&second<120){
    await send(wrongMedicationCommand);wrongRepeatAt=second+10;
   }
   if(recovery&&!recovered&&firstOrder&&second>=firstOrder.issuedAtRealSecond+1){
    const saved=await runtime.checkpoint(),before=runtime.view(actorId),beforeP=before.clinical.patient;
    runtime.dispose();runtime=await factory(saved);const restored=runtime.view(actorId),afterP=restored.clinical.patient;
    row.recovery={atRealSecond:round(second),pendingBefore:beforeP.pendingTreatments.length,
     ...recoveryEvidence(before,restored),
     hostId,members:members.map(x=>x.id)};
    row.patientIdentity.restoredIdentityUnchanged&&=row.recovery.sameIdentity;
    const beforeReplay=runtime.view(actorId),again=await send(firstOrder.text,firstOrder.id),afterReplay=runtime.view(actorId);
    row.recovery.replayedCommandId=again.id;
    row.recovery.replayUnchanged=hash(beforeReplay.clinical.patient)===hash(afterReplay.clinical.patient)&&
     hash(beforeReplay.clinical.progress)===hash(afterReplay.clinical.progress)&&
     hash(beforeReplay.clinical.room.events)===hash(afterReplay.clinical.room.events);
    recovered=true;observe(false);
   }
   const current=runtime.view(actorId).clinical;
   const continuation=clinicalTransferContinuation(current.patient,c,plan.destination,current.clock.nativeMinute);
   const allStudies=plan.studyIds.every(id=>continuation.deferredStudyIds.includes(id)||current.patient.orders.some(o=>o.id===id&&
    (o.status==='done'||plan.pendingStudyIds.includes(id)&&o.status==='pending'&&o.sourceEventId)));
   const allTreatments=plan.treatmentIds.every(id=>actualTreatment(current.patient,id,current.clock.nativeMinute)||
    continuation.continuingAdministrations.some(row=>row.id===id)||continuation.deferredTreatmentIds.includes(id));
   // Original case owners decide their own native conduct/receipt contract.
   // A policy-only prefilter must not prevent asking that owner for handoff.
   const canAttempt=['omit-studies','inexperienced','negligent','wrong-medication'].includes(profile)||
    allStudies&&(!c.clinicalPolicy||allTreatments);
   const complicationObservationComplete=profile!=='complication-rescue'||!c.clinicalPolicy?.complications?.length||
    (current.patient.policyState?.complications||[]).some(episode=>episode.status==='recovered'||
     (c.clinicalPolicy.complications.find(def=>def.id===episode.id)?.rescueAllOf||[]).some(id=>transferredProcedures.has(id)));
   if(profile!=='abandon'&&canAttempt&&complicationObservationComplete&&
    (profile==='negligent'||second>=plan.minimumObservationSeconds)&&second-lastCloseAttempt>=15){
    await action('/reevaluar');await action('/disposicion '+plan.destination);lastCloseAttempt=second;
   }
   if(runtime.view(actorId).clinical.patient.caseEnded)break;
   await advance(second<40?.25:1);
  }
  observe(true);
  if(view.clinical.patient.patientDied){
   const before=runtime.view(actorId).clinical;
   const rejected=[];
   for(const text of ['Enfermera Ringer 500 ml','/disposicion '+plan.destination]){
    const result=await send(text);rejected.push(result.ack);
   }
   const saved=await runtime.checkpoint();runtime.dispose();runtime=await factory(saved);
   await advance(Math.min(1,horizon-view.clinical.clock.clinicalMinute));
   const after=runtime.view(actorId).clinical;
   row.terminalIntegrity={postmortemCommandsRejected:rejected.every(ack=>ack.status==='rejected'||
     ack.status==='received-not-executed'&&!!ack.routeError&&!ack.clinical?.length||
     ack.clinical?.length&&ack.clinical.every(item=>item.status==='rejected')),
    checkpointRestored:true,noResurrection:after.patient.patientDied===true,
    unchangedVitals:hash(before.patient.liveVitals)===hash(after.patient.liveVitals),
    unchangedAdministrations:hash(before.patient.administrationLog)===hash(after.patient.administrationLog),
    unchangedXP:hash(before.progress)===hash(after.progress),
    singleDeathEvent:after.room.events.filter(x=>x.type==='clinical.patient-died').length===1};
  }
  if(view.clinical.patient.closure?.closed){
   const before=runtime.view(actorId),closureEvent=before.clinical.room.events.find(event=>
    event.clinical?.some(item=>item.receipt?.closure?.eventId===before.clinical.patient.closure.eventId)),
    command=row.commands.findLast(x=>x.id===closureEvent?.commandId||x.clinical.some(item=>item.receipt?.closure?.closed));
   if(!command)throw Error('native closure has no public command receipt');
   await send(command.text,command.id);const after=runtime.view(actorId);
   row.closureIntegrity={replayUnchanged:hash(before)===hash(after),
    singleClosureReceipt:collectReceipts(after.clinical).filter(x=>x.closure?.closed).length===1,
    singleXPReceipt:after.clinical.progress.receipts.filter(x=>x.patientUid===uid).length===1,
    noDeathEvent:!after.clinical.room.events.some(x=>x.type==='clinical.patient-died')};
  }
  if(recovery){
   const saved=await runtime.checkpoint(),before=runtime.view(actorId);
   runtime.dispose();runtime=await factory(saved);const restored=runtime.view(actorId);
   const finalRecovery=recoveryEvidence(before,restored);
   row.recovery??={atRealSecond:round(before.clinical.clock.clinicalMinute),
    pendingBefore:before.clinical.patient.pendingTreatments.length,...finalRecovery};
   row.recovery.final=finalRecovery;observe(false);
   row.patientIdentity.restoredIdentityUnchanged&&=finalRecovery.sameIdentity;
  }
  const checkpoint=await runtime.checkpoint();
  row.sharedViews=members.map(m=>{
   const shared=runtime.view(m.id),p=shared.clinical.patient;
   return {actorId:m.id,patientUid:p.uid,patientDigest:hash(p),progressXP:shared.clinical.progress.xp,
    closureEventId:p.closure?.eventId??null,administrationEventIds:p.administrationLog.map(x=>x.sourceEventId),
    deathEvents:shared.clinical.room.events.filter(x=>x.type==='clinical.patient-died')
     .map(x=>({roomId:x.roomId,patientUid:x.patientUid,revision:x.revision,atNativeMinute:x.atNativeMinute,cause:x.cause})),
    claims:copy(shared.claims.filter(([,x])=>x.patientUid===uid))};
  });
  return plainEvidence(finalEvidence(row,runtime.view(actorId),checkpoint,c,plan));
 }catch(error){
  try{return plainEvidence({...row,...failedCase(c,options,error)});}
  catch{return failedCase(c,options,error);}
 }
 finally{runtime?.dispose();}
}

/** The activation registry consumes this exact envelope. Failure of one real
 * case prevents certification of the complete staged pack. */
export async function certifyClinicalCases(staged){
 if(!staged||!Array.isArray(staged.cases)||!staged.cases.length)throw Error('nonempty staged clinical pack required');
 const identity={packId:staged.packId,version:staged.version,digest:staged.digest};
 let content;
 try{content=await clinicalCertificationContent(staged.cases);}
 catch(error){return {ok:false,...identity,evidence:staged.cases.map(c=>failedCase(c,{},error))};}
 const evidence=[];
 for(const c of staged.cases)evidence.push(await runClinicalCaseScenario(c,{content,
  seed:staged.digest+':'+c.id,profile:'competent',mode:'solo',recovery:true}));
 return {ok:evidence.every(x=>x.passed),...identity,evidence};
}

/** Separately requested longitudinal evidence. Outcomes are observations, not
 * asserted deaths: a stable chronic case may correctly survive abandonment.
 * By default modes rotate over cases/profiles, covering all four without
 * multiplying an already large clinical matrix by four. */
export async function runClinicalOutcomeMatrix({cases,content,profiles=CLINICAL_CERTIFICATION_PROFILES,
 modes=CLINICAL_CERTIFICATION_MODES,seed='outcomes-v1',horizon=720,allModes=false,onRow=()=>{}}={}){
 if(!Array.isArray(cases)||!cases.length||!modes.length)throw Error('outcome matrix cases and modes required');
 content??=await clinicalCertificationContent(cases);const evidence=[];
 for(const [index,c] of cases.entries())for(const [profileIndex,profile] of profiles.entries()){
  const selected=allModes?modes:[modes[(index+profileIndex)%modes.length]];
  for(const mode of selected){
   const row=await runClinicalCaseScenario(c,{content,profile,mode,horizon,
    seed:seed+':'+c.id+':'+profile,recovery:['coop','competitive'].includes(mode)});
   evidence.push(row);await onRow(row);
  }
 }
 return {schemaVersion:1,kind:'atria-native-clinical-outcomes',seed,horizonRealSeconds:horizon,
  scenarioCount:evidence.length,caseIds:cases.map(x=>x.id),profiles:copy(profiles),modes:copy(modes),
  modeCounts:Object.fromEntries(modes.map(mode=>[mode,evidence.filter(x=>x.mode===mode).length])),
  outcomes:Object.fromEntries(['native-death','accepted-destination','alive-unclosed'].map(outcome=>
   [outcome,evidence.filter(x=>x.outcome===outcome).length])),evidence};
}
