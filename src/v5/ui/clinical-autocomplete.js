import {monitorOrderExamples,normalizeOrderQuery} from './monitor-order-suggestions.js';
import {isPhysicianExamStudy} from '../clinical/exam-contract.js';
import {spanishWordSuggestions,spanishAutoReplace,spanishCorrectCase,
 spanishKnownWord,spanishAccentSuggestions} from './spanish-spellcheck.js';

// One case-scoped input aid for the ward composer and bedside monitor.
// The canonical clinical speech router still validates all submitted text.
// Autocomplete never diagnoses, sends a message, or selects a drug for a patient.
export const normalizeClinicalQuery=normalizeOrderQuery;
const safe=s=>String(s||'').trim();
const clean=safe;
const commonFixes=Object.freeze({
 'qeu':'que','qe':'que','porqe':'porque','porqeu':'porque',
 'enfemera':'enfermera','enfemero':'enfermero',
 'pacinte':'paciente','pasiente':'paciente','dotor':'doctor',
 'sintmas':'síntomas','diagnotico':'diagnóstico','diganostico':'diagnóstico',
 'exman':'examen','abdomne':'abdomen','estudioo':'estudio'
});
// Small offline Spanish vocabulary for high-confidence single-letter typos.
// All medicine, dosages and unrecognized clinical words require explicit choice.
const everydayWords=new Set(`
hola gracias buenos buenas buen buenísimo por para porque pero como
cuando donde quien quienes cuanto cuantos que qué cual cuáles
yo tu tú el ella ellos ellas usted ustedes nosotros nosotras vos
soy eres es somos son estoy estas está estamos están estuve
tengo tienes tiene tenemos tienen hay había fue fueron
hoy ayer mañana tarde noche día dias días semana mes año años
si sí no nada algo alguien alguno alguna todo todos todas mucho mucha muchos
poco poca pocos más menos muy bastante casi siempre nunca
bien mal mejor peor bueno buena lindo linda
quiero quieres quiere queremos puedo puedes puede podemos
hacer haces hace hacemos hice hizo hacen decir dice dije digo
ir voy vas va vamos venir viene vengo
chau adiós adios buenasnoches buenosdias
ahora luego después antes pronto recién entonces ya todavía aun aún
tambien también además solo sola solos
aquí ahi ahí allá acá afuera dentro arriba abajo lado
amigo amiga amigos amigas familia mamá papá hermano hermana
casa trabajo escuela universidad libro mesa mano cabeza pie brazo
hombre mujer niño niña doctor doctora persona paciente
esto esta este estos estas eso esa ese esos esas aquello
tener estar ser haber hacer dar tomar poner pasar saber salir
comer beber dormir estudiar leer escribir hablar escuchar mirar
necesito necesitas necesita necesitamos disculpa perdón
favor porfavor perfecto excelente terrible genial
feliz triste cansado cansada tranquilo tranquila
pasa claro seguro segura verdad mentira
saludos nos vemos
`.trim().split(/\s+/).map(normalizeClinicalQuery));
function everydayCorrection(word){
 const normalized=normalizeClinicalQuery(word);
 const direct=commonFixes[normalized];
 if(direct)return direct;
 if(spanishKnownWord(word))return null;
 if(normalized.length<4||normalized.length>15||everydayWords.has(normalized))return null;
 let match=null;
 for(const candidate of everydayWords){
  if(Math.abs(candidate.length-normalized.length)>1)continue;
  if(editDistance(normalized,candidate,1)!==1)continue;
  if(match!==null&&match!==candidate)return null; // Ambiguous: leave unchanged.
  match=candidate;
 }
 return match;
}
const prefix=/^\s*enfermer(?:a|o|ia)\s*[,.:]?\s*/i;
export function shortNursePrefix(text){
 const value=String(text||'');
 return prefix.test(value)?value:'Enfermera, '+value;
}
export function activeClinicalClause(text){
 const input=String(text||'');
 const stripped=input.replace(prefix,'');
 const separators=[...stripped.matchAll(/(?:\s+y\s+|[,;]\s*)/gi)];
 const cut=separators.length?separators.at(-1).index+separators.at(-1)[0].length:0;
 const sourceStart=input.length-stripped.length+cut;
 return {query:stripped.slice(cut).trimStart(),start:sourceStart+
  (stripped.slice(cut).length-stripped.slice(cut).trimStart().length)};
}
export function replaceClinicalClause(text,command,{mode='chat'}={}){
 const content=String(text||'');
 const {start}=activeClinicalClause(content);
 if(mode==='monitor')return clean(command);
 return shortNursePrefix(content.slice(0,start)+clean(command));
}
function editDistance(a,b,limit=2){
 if(Math.abs(a.length-b.length)>limit)return limit+1;
 let prev=Array.from({length:b.length+1},(_,i)=>i),row;
 for(let i=1;i<=a.length;i++){
  row=[i];
  for(let j=1;j<=b.length;j++)
   row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
  if(Math.min(...row)>limit)return limit+1;
  prev=row;
 }
 return prev[b.length];
}
function rank(query,term){
 if(!query||!term)return 0;
 if(term===query)return 105;
 if(term.startsWith(query))return 90;
 if(term.split(/[\s/.-]+/).some(x=>x.startsWith(query)))return 78;
 if(query.length>=4&&!spanishKnownWord(query)&&term.includes(query))return 65;
 // Fuzzy only for near-complete words, preventing dangerous 'morfina'
 // matches on an unrelated short 'mor' prefix.
 if(query.length>=5&&term.length>=5&&Math.abs(query.length-term.length)<=2){
  const distance=editDistance(query,term,query.length>=7?2:1);
  if(distance<=2)return 48-distance*7;
 }
 return 0;
}
function option(id,kind,label,command,aliases=[]){
 const values=[label,command,...aliases].filter(Boolean).map(normalizeClinicalQuery);
 return {id,kind,label,command,terms:[...new Set(values)]};
}
export function clinicalVocabulary({caseId,cases=[],therapies=[],studies=[]}={}){
 const current=cases.find(c=>c.id===caseId);
 const studyList=studies.length?studies:current?.studies||[];
 const items=[],seen=new Set();
 const add=item=>{if(!seen.has(item.kind+':'+item.id)){seen.add(item.kind+':'+item.id);items.push(item);}};
 // Reuse the established dose-specific monitor vocabulary when available.
 for(const value of monitorOrderExamples(caseId,'',{hint:true,limit:12}))
  add(option('known:'+value.id,'order',value.label,value.command));
 for(const item of studyList){
  if(isPhysicianExamStudy(item.id))continue;
  // Single-letter/abbreviated first aliases may be valid search keys but
  // invalid spoken orders (e.g. `tc`). Prefer a documented full alias.
  const spoken=item.aliases?.find(a=>normalizeClinicalQuery(a).length>=5)||
   item.aliases?.[0]||item.label;
  add(option('study:'+item.id,'study',item.label,spoken,
   [item.id,...(item.aliases||[])]));
 }
 for(const item of therapies){
  // Do not duplicate an already certified native dose phrase with a
  // weaker undosed alias on the same monitor suggestion row.
  const alias=normalizeClinicalQuery(item.aliases?.[0]||item.label);
  const isNative=items.some(x=>x.id.startsWith('known:')&&
   x.terms.some(term=>term.startsWith(alias)&&alias.length>=5));
  if(!isNative)add(option('therapy:'+item.id,'therapy',item.label,
   item.aliases?.[0]||item.label,[item.id,...(item.aliases||[])]));
 }
 for(const item of current?.interventions||[])
  add(option('intervention:'+item.id,'procedure',item.label,
   item.aliases?.[0]||item.label,[item.id,...(item.aliases||[])]));
 for(const [id,label,command,aliases] of [
  ['monitor','Conectar monitor','monitor',['monitorizar','monitoreo']],
  ['vitals','Registrar signos vitales','signos vitales',['constantes','presion']],
  ['iv','Colocar vía periférica','una vía',['via','acceso venoso']],
  ['two-iv','Colocar dos vías periféricas','dos vías',['dos accesos','2 vias']],
  ['surgery','Interconsulta con cirugía','interconsulta a cirugía',['cirugia','cirujano']],
  ['uti','Interconsulta con UTI','interconsulta a uti',['terapia intensiva']]
 ])add(option('procedure:'+id,'procedure',label,command,aliases));
 return items;
}
export function clinicalCompletions(text,{mode='chat',caseId,cases,therapies,studies,limit=5}={}){
 const clause=mode==='monitor'?String(text||'').replace(prefix,'').trim():activeClinicalClause(text).query;
 const query=normalizeClinicalQuery(clause);
 if(query.length<2)return [];
 const vocabulary=clinicalVocabulary({caseId,cases,therapies,studies});
 const rows=vocabulary.map(item=>({
  ...item,score:Math.max(0,...item.terms.map(x=>rank(query,x)))
 })).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label,'es'));
 // A spoken prescription must have ONE selectable command even if the
 // shared dose catalog and a case-specific therapy register the same phrase.
 // Recognition and actual administration remain owned by speech-router.
 const seenCommands=new Set(),unique=rows.filter(row=>{
  const phrase=normalizeClinicalQuery(row.command);
  if(seenCommands.has(phrase))return false;
  seenCommands.add(phrase);return true;
 });
 return unique.slice(0,Math.max(0,Math.min(limit,8))).map(x=>({
  id:x.id,kind:x.kind,label:x.label,command:x.command,
  replacement:replaceClinicalClause(text,x.command,{mode}),score:x.score
 }));
}
export function spellingSuggestions(text,{limit=3}={}){
 const full=String(text||''),found=/([a-záéíóúñü]+)$/i.exec(full);
 if(!found)return [];
 const word=found[1],preceding=full.slice(0,-word.length);
 const prev=/([a-záéíóúñü]+)\s*$/i.exec(preceding)?.[1]||'';
 const direct=everydayCorrection(word);
 const accentChoices=spanishAccentSuggestions(word,{limit});
 const guesses=direct?[direct]:accentChoices.length?accentChoices:
  spanishWordSuggestions(word,{previous:prev,limit});
 return guesses.slice(0,limit).map(x=>{
  const value=spanishCorrectCase(word,typeof x==='string'?x:x.word);
  return {label:value,replacement:preceding+value,kind:'spelling'};
 });
}
// Conservative autocorrection for everyday typos only; clinical drug and
// diagnostic names always require the user to explicitly select a suggestion.
export function correctEverydayBeforeSpace(value,cursor){
 const prefix=String(value).slice(0,cursor);
 const m=/([a-záéíóúñü]+)$/i.exec(prefix);
 if(!m)return null;
 const context=prefix.slice(0,-m[1].length);
 const previous=/([a-záéíóúñü]+)\s*$/i.exec(context)?.[1]||'';
 const inNurseOrder=/^\s*enfermer(?:a|o|ia)\s*[,.:]/i.test(prefix);
 const legacyFix=everydayCorrection(m[1]);
 const fix=legacyFix||
  spanishAutoReplace(m[1],{previous,clinical:inNurseOrder});
 if(!fix||fix.toLowerCase()===m[1].toLowerCase())return null;
 // Preserve earlier case conventions for the curated exact typo map.
 const word=legacyFix||spanishCorrectCase(m[1],fix);
 const start=cursor-m[1].length;
 return {value:String(value).slice(0,start)+word+String(value).slice(cursor),
  cursor:start+word.length};
}
