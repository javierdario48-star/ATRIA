// Stable behavior lives on the patient. Mutable emotions and conversational
// memory live per authenticated doctor, inside the ordinary checkpoint.
import {languageHash,realizeClinicalFact} from '../content/patient-language.js';
import {TRAIT_KEYS} from '../content/patient-behavior.js';
const normalize=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const clamp=x=>Math.max(0,Math.min(4,x));

export function patientRelationship(context,actorId,behavior,raw){
 context.relationships??={};
 const key=String(actorId),existing=Object.hasOwn(context.relationships,key)?context.relationships[key]:null;
 const r=existing??{turn:0,trust:behavior.trust,anxiety:behavior.anxiety,frustration:0,
  cooperation:behavior.cooperation,lastRemarkTurn:-10,usedRemarks:[],asked:{},volunteered:[]};
 Object.defineProperty(context.relationships,key,{value:r,writable:true,enumerable:true,configurable:true});
 const text=normalize(raw),explanation=/le explico|te explico|estas preguntas ayudan|para entender|necesito saber.*para/.test(text),
  empathy=/con calma|t[oó]mese su tiempo|tomate tu tiempo|le escucho|te escucho|entiendo que|sin apuro/.test(text),
  brusque=/conteste rapido|no tengo tiempo|deje de hablar|apurate|apurese|no moleste/.test(text);
 r.turn++;
 if(explanation||empathy){
  r.trust=clamp(r.trust+(explanation?.45:.2));r.anxiety=clamp(r.anxiety-(empathy?.5:.25));
  r.cooperation=clamp(r.cooperation+.25);r.frustration=clamp(r.frustration-.3);
 }
 if(brusque){r.trust=clamp(r.trust-.25);r.anxiety=clamp(r.anxiety+.25);r.frustration=clamp(r.frustration+.5+behavior.sensitivity*.15);}
 return {relationship:r,explanation,empathy,brusque};
}

export function spontaneousHistory(c,behavior,relationship,topic,primary){
 // Reservation limits volunteered information, never information requested.
 if(behavior.verbosity<3||behavior.sociability<3||relationship.cooperation<1.5)return [];
 if(!['reason','onset','symptoms'].includes(topic))return [];
 const candidates=[
  {id:'interview:associated',canonical:c.anamnesis?.otherSymptoms||c.history?.associated||c.history?.symptoms,
   source:c.anamnesis?.otherSymptoms?'case.anamnesis.otherSymptoms':c.history?.associated?'case.history.associated':'case.history.symptoms'},
  {id:'interview:current',canonical:Array.isArray(c.common?.current)?c.common.current[0]:c.common?.current,source:'case.common.current'}
 ];
 const selected=[];
 for(const fact of candidates){
  if(!fact.canonical||relationship.volunteered.includes(fact.id)||primary.some(p=>p.canonical.includes(fact.canonical)))continue;
  // Unsolicited treatment/allergy disclosures and proxy reports cannot become
  // a patient's spontaneous assertion. Those require their factual domain.
  if(/alerg|medic|antibi[oó]tic|familiar:|acompañante:|no esperar|riesgo de/i.test(fact.canonical))continue;
  selected.push({...fact,spontaneous:true});relationship.volunteered.push(fact.id);
  if(selected.length>=(behavior.verbosity===4&&topic==='reason'?2:1))break;
 }
 return selected;
}

export function composePatientConversation(facts,{behavior,seed,relationship:r,topic,question,interaction,sensitive=false,greeting=false,limited=false}){
 seed=seed+':behavior:'+behavior.version+':'+behavior.archetype+':'+TRAIT_KEYS.map(k=>behavior[k]).join(',');
 const signature=String(languageHash(facts.filter(f=>!f.spontaneous).map(f=>f.id+':'+f.canonical).join('|')));
 const repeat=Object.hasOwn(r.asked,signature)?r.asked[signature]:0;
 if(repeat)r.frustration=clamp(r.frustration+behavior.urgency*.1);
 // Bound checkpoint growth without changing personality or physiology.
 if(Object.keys(r.asked).length>=64&&!Object.hasOwn(r.asked,signature))delete r.asked[Object.keys(r.asked)[0]];
 r.asked[signature]=repeat+1;
 const realized=facts.map(f=>({...f,...realizeClinicalFact(f.canonical,{behavior,seed,topic:f.id,repeat,sensitive:sensitive||limited})}));
 let remark=null;
 if(!sensitive&&!limited&&r.turn-r.lastRemarkTurn>=4){
  let candidates=[];
  if(repeat&&behavior.urgency>=3&&r.frustration>=.5)candidates=['Ya se lo había contado; voy a repetirlo.','¿Necesita que lo diga de otra manera?'];
  else if(repeat&&/confirmar|aclar|repet/i.test(question)&&behavior.verbosity>=2)candidates=
   r.anxiety>=3?['¿Hay algo que no haya quedado claro?','¿Necesita que vuelva al principio?']:
    behavior.sociability>=3?['Voy a contarlo otra vez.','Le cuento de nuevo cómo fue.']:['Lo aclaro otra vez.'];
  else if(interaction.explanation&&behavior.explanation>=3&&r.turn>1)candidates=['Así entiendo para qué me pregunta.','Con esa explicación puedo seguirle mejor.'];
  else if(topic==='reason'&&r.cooperation<1)candidates=['Prefiero ir respondiendo de a poco.','Me cuesta hablar de esto; pregúnteme de a una cosa.'];
  else if(topic==='reason'&&r.trust<1.5&&behavior.explanation>=2)candidates=['Antes de seguir, quisiera saber para qué son estas preguntas.','¿Me cuenta por qué necesita saber estos detalles?'];
  else if(['reason','symptoms'].includes(topic)&&r.anxiety>=3&&behavior.expressiveness>=3)candidates=[
   '¿Qué van a hacer ahora?','Me cuesta no pensar en lo que puede estar pasando.','Necesito que me vaya explicando los pasos.'];
  else if(interaction.brusque&&behavior.sensitivity>=3)candidates=['Necesito un momento para responderle.','Puedo contestar, pero me cuesta si me apura.'];
  const unused=candidates.filter(x=>!r.usedRemarks.includes(x));
  if(unused.length){remark=unused[languageHash(seed+':remark:'+topic)%unused.length];r.usedRemarks.push(remark);r.lastRemarkTurn=r.turn;}
 }
 const text=[...realized.map(f=>f.spoken),...(remark?[remark]:[])].join(' ');
 return {answer:(greeting?'Hola, doctor. ':'')+(limited&&!sensitive?'(Responde con pausas.) ':'')+text,
  evidence:{facts:realized,remark,repeat,limited,topic,styleApplied:!sensitive&&!limited,
   emotion:{anxiety:r.anxiety,trust:r.trust,cooperation:r.cooperation,frustration:r.frustration}}};
}
