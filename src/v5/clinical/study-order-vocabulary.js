import {isPhysicianExamStudy} from './exam-contract.js';
import {studyCollectionDefinition,studyCollectionRequests,studyCollectionPhrase,studyCollectionScanText,validStudyQuantity} from './study-collections.js';

export const normalizeStudyOrder=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

const troponinLongNames=['','s'].flatMap(s=>['',' cardiaca'+s].flatMap(cardiac=>
 ['',' ultrasensible'+s,' de alta sensibilidad',' alta sensibilidad'].map(sensitivity=>'troponina'+s+cardiac+sensitivity)));
const ctFamilies=new Map([
 ['tc_cerebral',['tc cerebro','tc de cerebro','tc cerebral','tc craneo','tc de craneo','tc craneal',
  'tac cerebro','tac craneo','tac cerebral','tomografia cerebral','tomografia de craneo','tomografia de cerebro']],
 ['tc_torax',['tc torax','tc de torax','tc toracica','tac torax','tac de torax','tac toracica','tomografia de torax','tomografia toracica']],
 ['tc',['tc abdomen','tc de abdomen','tc abdominal','tc abdominopelvica','tac abdomen','tac abdominal',
  'tomografia abdominal','tomografia de abdomen','tomografia abdominopelvica']]
]);
const contrastMethods=['con','sin'];
const angioCtNames=['angio tc','angiotc','angio tac','angiotac','angio tomografia','angiotomografia','tc angiografia','tac angiografia',
 ...['angio tomografia','angiotomografia'].flatMap(name=>[name+' computada',name+' computarizada'])];
const angioCtPattern='(?:'+[...angioCtNames].sort((a,b)=>b.length-a.length).join('|')+')\\b';
const angioCtPrefix=new RegExp('^'+angioCtPattern);
const angioCtMention=new RegExp('\\b'+angioCtPattern+'|\\b(?:tc|tac) de (?:la )?aorta\\b','g');
const angioCtControlOrder='(?:control(?:ar)?(?: de(?:l)?)?|repetir|repite|repita)(?: el| la| un| una)? ';
const angioCtControlAtStart=new RegExp('^'+angioCtControlOrder);
const angioCtControlBeforeMention=new RegExp('\\b'+angioCtControlOrder+'$');
const authoredAngioCtPrefix=new RegExp('^(?:'+angioCtControlOrder+')?'+angioCtPattern);
const angioCtFamilies=new Map([
 ['angio_aorta',['de aorta','de la aorta','aortica','de torax aortica','de aorta toracoabdominal','de la aorta toracoabdominal'],
  ['tc de aorta','tc de la aorta','tac de aorta','tac de la aorta']],
 ['angio_pulmonar',['pulmonar','de torax pulmonar','de arterias pulmonares','de las arterias pulmonares']],
 ['angio_mesenterica',['mesenterica','de vasos mesentericos','de los vasos mesentericos']],
 ['angio_cabeza_cuello',['de cabeza y cuello','cabeza cuello','cabeza y cuello']],
 ['angio_cerebral',['cerebral']]
].map(([family,targets,other=[]])=>[family,[...targets.flatMap(target=>angioCtNames.map(name=>name+' '+target)),...other]]));
const thoracicAngioCt=/^(?:de )?(?:torax|toracic[ao]|pecho|toracoabdominal)\b/;
const abdominalAngioCt=/^(?:de )?(?:abdomen|abdominal)\b/;
const unspecifiedAngioCt=/^(?:$|(?:y|e|o|urgente|ahora|por favor|con|sin|de control)\b)/;
const angioCtModifier=/^(?:(?:urgente|ahora|inicial) )*(?:(?:de )?control|repetid[ao]|post|tras|sin contraste|con contraste)\b/;
const groups=[
 ['troponina',[...troponinLongNames,'hs ctn','hsctn','ctn']],
 ['hemograma',['hemograma','hemograma completo','biometria','biometria hematica','cuadro hematico','recuento sanguineo','cbc',
  'leucocitos','recuento leucocitario','recuento de leucocitos']],
 ['pcr',['pcr','proteina c reactiva']],
 ['colonoscopia',['colonoscopia','colonoscopia con biopsia','colonoscopia biopsia','videocolonoscopia','videocolonoscopia biopsia',
  'video colonoscopia','videoendoscopia digestiva baja','video endoscopia digestiva baja','endoscopia digestiva baja','vedb','vcc']],
 ['eda',['endoscopia digestiva alta','endoscopia alta','videoendoscopia digestiva alta','video endoscopia digestiva alta','eda','veda','gastroscopia','videogastroscopia']],
 ['electrocardiograma',['electrocardiograma','ecg','ekg','electrocardiograma de 12 derivaciones','ecg de 12 derivaciones','ekg de 12 derivaciones']],
 ['glucemia',['glucemia','glicemia','glucosa','glucemia capilar','glicemia capilar','glucosa capilar','glucosa en sangre']],
 ['hepatograma',['hepatograma','perfil hepatico','funcion hepatica','pruebas hepaticas','enzimas hepaticas']],
 ['coagulograma',['coagulograma','coagulacion','perfil de coagulacion','pruebas de coagulacion']],
 ...ctFamilies,...angioCtFamilies
];
const assayNames=Object.fromEntries(['i','t'].map(assay=>[assay,[...troponinLongNames.flatMap(name=>[
 name+' '+assay,name.replace(/^(troponinas?)/,'$1 '+assay)
 ]),'hs ctn'+assay,'hs ctn '+assay,'hsctn'+assay,'hsctn '+assay,'ctn'+assay,'ctn '+assay]]));
const troponinRoot='(?:troponinas?|(?:hs ?)?ctn(?:[it])?)';
const troponinPattern=new RegExp('\\b'+troponinRoot+'\\b');
const qualifier='(?:cardiacas?|ultrasensibles?|(?:de )?alta sensibilidad)';
const specimenAssay=/\b(?:troponinas?(?: cardiacas?)? ([it])|(?:hs ?)?ctn ?([it]))\b/;
const assaySuffix=new RegExp('\\b'+troponinRoot+'(?: '+qualifier+')* ([it])\\b');
const assayPattern=new RegExp(specimenAssay.source+'|'+assaySuffix.source,'g');
const ambiguousAssay=new RegExp('\\b'+troponinRoot+'(?: '+qualifier+')* [it](?: [yo])? [it]\\b|\\b(?:hs ?)?ctn[it] [it]\\b');
const unsupportedAssay=new RegExp('\\b'+troponinRoot+'(?: '+qualifier+')* [a-df-hj-suv-xz]\\b');
const highSensitivity=new RegExp('\\b(?:hs ?ctn(?: ?[it])?|'+troponinRoot+
 '(?: [it]| cardiacas?)*(?: ultrasensibles?| (?:de )?alta sensibilidad))\\b');
const capillaryGlucose=/\b(?:glucemia|glicemia|glucosa) capilar\b/;
const measuredCapillaryGlucose=/\b(?:glucemia|glicemia|glucosa) capilar(?: inicial| basal)? \d+(?: \d+)? (?:mg dl|mmol l)\b/;
const troponinMeasurement=new RegExp('\\b'+troponinRoot+'(?: (?:[it]|'+qualifier+'|inicial|basal|de control))* '+
 '(?=\\d+(?: \\d+)? (?:ng|pg) (?:l|ml)\\b|(?:no )?elevad[ao]s?\\b|normales?\\b|(?:y bnp )?dentro de limites)','g');
const serialWords='(?:seriad[ao]s?|en serie|de control|control|repetid[ao]s?|serial(?:es)?)';
const serialPrefix='(?:serie de|repetir|repite|repita|segunda muestra de|control de)(?: las?)?';
const timedTroponin=new RegExp('\\b'+troponinRoot+'(?: (?:[it]|'+qualifier+'|'+serialWords+'))* '+
 '(?:\\d|cada\\b|a (?:\\d|las?\\b|los?\\b|una? hora)|al (?:cabo|minuto)\\b|en (?:\\d|una? hora))');
const multipleTroponin=new RegExp('\\b(?:(?:dos|tres|[2-9]\\d*) '+troponinRoot+'|'+troponinRoot+
 '(?: (?:ahora|[it]|'+qualifier+'))* (?:x ?\\d+|y (?:a (?:las?|los?)|en) \\d+))\\b');
const explicitSeries=new RegExp('\\b'+serialPrefix+' '+troponinRoot+'\\b|\\b'+troponinRoot+
 '(?: (?:[it]|'+qualifier+'))* '+serialWords+'\\b');

const measuredTroponin=study=>[...normalizeStudyOrder(study.result).matchAll(troponinMeasurement)].map(match=>match[0].trim());
const troponinDocumentation=study=>[...terms(study),...measuredTroponin(study)].join(' ; ');
function assayOfStudy(study){
 const documented=troponinDocumentation(study);
 if(ambiguousAssay.test(documented))return null;
 const assays=new Set([...documented.matchAll(assayPattern)].map(m=>m[1]||m[2]||m[3]));
 return assays.size===1?[...assays][0]:null;
}

// The initial result and turnaround remain on the ordinary definition. Each
// additional sample supplies its own result and a strictly increasing offset
// from the initial sample on the native clinical clock.
export function authoredTroponinSeries(study){
 const samples=study?.seriesSamples;
 if(!study||!isTroponinStudy(study)||study.type!=='lab'||study.dynamic||
    typeof study.result!=='string'||!study.result.trim()||!Array.isArray(samples)||!samples.length)return false;
 let previous=0;
 for(const sample of samples){
  if(!sample||!Number.isFinite(sample.afterNativeMinutes)||sample.afterNativeMinutes<=previous||
   typeof sample.result!=='string'||!sample.result.trim())return false;
  previous=sample.afterNativeMinutes;
 }
 return true;
}

const terms=study=>[study.label,...(study.aliases||[])].map(normalizeStudyOrder);
const containsTerm=(text,word)=>(' '+text+' ').includes(' '+word+' ');
const startsWithTerm=(text,term)=>text===term||text.startsWith(term+' ');
const isAngioCt=study=>terms(study).some(term=>authoredAngioCtPrefix.test(term));
const documentedCRP=/\b(?:proteina c reactiva|pcr (?:(?:moderadamente|marcadamente|discretamente) )?(?:elevada|normal|\d+(?: \d+)? mg))\b/;
export function isTroponinStudy(study){
 return terms(study).some(term=>troponinPattern.test(term))||measuredTroponin(study).length>0;
}

function seriesNames(names){
 return names.flatMap(name=>[name+' seriada',name+' seriadas',name+' en serie',name+' de control',name+' serial',
  'serie de '+name,'repetir '+name,'repetir la '+name,'segunda muestra de '+name,'control de '+name]);
}
const genericOptions=new Map(groups.flatMap(([family,aliases])=>aliases.map(alias=>[alias,{family}])));
for(const [family,aliases] of ctFamilies)for(const method of contrastMethods)
 for(const alias of aliases)genericOptions.set(alias+' '+method+' contraste',{family,ctMethod:method});
for(const [family,aliases] of angioCtFamilies)for(const alias of aliases)
 genericOptions.set(alias+' con contraste',{family});
for(const assay of ['i','t'])for(const alias of assayNames[assay])genericOptions.set(alias,{family:'troponina',assay});
for(const [alias,descriptor] of [...genericOptions])if(descriptor.family==='troponina'){
 for(const name of seriesNames([alias]))genericOptions.set(name,{...descriptor,series:true});
}

function studyRank(study,group,aliases){
 // A post-intervention control is never selected by the unqualified request.
 if(study.requiresCompletedTreatments?.length)return 0;
 const [label,...authored]=terms(study);
 // An angio-TC, perfusion sequence or authored control is a separate study.
 if(ctFamilies.has(group)&&(!/^(?:tc|tac|tomografia) /.test(label)||containsTerm(label,'de control')))return 0;
 if(angioCtFamilies.has(group)&&(containsTerm(label,'de control')||angioCtControlAtStart.test(label)))return 0;
 // PCR de un patógeno is molecular testing, even when the abbreviation matches.
 if(group==='pcr'&&label.startsWith('pcr de ')&&!containsTerm(label,'proteina c reactiva'))return 0;
 if(aliases.includes(label))return 4;
 if(authored.some(term=>aliases.includes(term)))return 3;
 if(aliases.some(term=>containsTerm(label,term)))return 2;
 // An authored panel can report the assay without listing a redundant alias.
 if(group==='pcr'&&documentedCRP.test(normalizeStudyOrder(study.result)))return 1;
 return authored.some(name=>aliases.some(term=>containsTerm(name,term)))||
  group==='troponina'&&isTroponinStudy(study)?1:0;
}

export function studyOrderLabel(study,{series=false,quantity}={}){
 if(quantity!==undefined&&studyCollectionDefinition(study))return studyCollectionPhrase(quantity);
 const label=isTroponinStudy(study)?study.label.replace(/\s+seriad[ao]s?\b/i,''):study.label;
 return series?label+' seriada':label;
}

/** Prefer the current case, then the existing catalog for a named protocol.
 * A vascular CT without a target needs clarification before it is requested.
 * Foreign panels remain available by their IDs.
 * Results are read only to recognize an explicitly documented native assay. */
export function studyOrderVocabulary(studies=[],nativeStudies=studies){
 const native=nativeStudies.filter(x=>!isPhysicianExamStudy(x.id)),nativeById=new Map(native.map(x=>[x.id,x]));
 const byId=new Map(nativeById);
 for(const study of studies)if(!byId.has(study.id)&&!isPhysicianExamStudy(study.id)&&
  (study.id==='troponina'||!isTroponinStudy(study)))byId.set(study.id,study);
 const catalog=[...byId.values()],angiographic=catalog.filter(isAngioCt),
  nativeAngiographic=angiographic.filter(study=>nativeById.has(study.id));
 const collections=native.filter(study=>studyCollectionDefinition(study));
 const collection=collections.length===1?collections[0]:null;
 const byFamily=new Map();
 const preferred=(family,aliases,candidates=native)=>candidates
  .map(study=>({study,rank:studyRank(study,family,aliases)})).filter(x=>x.rank)
  .sort((a,b)=>b.rank-a.rank)[0]?.study;
 for(const [family,aliases] of groups){
  const selected=angioCtFamilies.has(family)?preferred(family,aliases,nativeAngiographic)??preferred(family,aliases,angiographic):
   preferred(family,aliases)??byId.get(family);
  if(selected)byFamily.set(family,selected);
 }
 const ctByMethod=new Map();
 for(const [family,aliases] of ctFamilies)for(const method of contrastMethods){
  const candidates=native.filter(study=>terms(study).some(term=>containsTerm(term,method+' contraste')));
  ctByMethod.set(family+':'+method,preferred(family,aliases,candidates));
 }
 const authoredAngioCt=new Map();
 for(const study of angiographic)for(const name of terms(study)){
  const prefix=authoredAngioCtPrefix.exec(name);
  if(!prefix)continue;
  const target=name.slice(prefix[0].length).trim();
  if(!thoracicAngioCt.test(target)&&!abdominalAngioCt.test(target)&&!unspecifiedAngioCt.test(target)&&!authoredAngioCt.has(name))
   authoredAngioCt.set(name,study);
 }
 const availableAngioCt=[...angioCtFamilies].filter(([family])=>byFamily.has(family));
 const namedAngioCt=[...new Set([...authoredAngioCt.keys(),...availableAngioCt.flatMap(([,aliases])=>
  aliases.flatMap(alias=>[alias,alias+' con contraste']))])].sort((a,b)=>b.length-a.length);
 const angioCtIssue=word=>{
  for(const match of word.matchAll(angioCtMention)){
   const control=angioCtControlBeforeMention.exec(word.slice(0,match.index)),phrase=word.slice(control?.index??match.index);
   const name=namedAngioCt.find(alias=>startsWithTerm(phrase,alias));
   if(name&&!angioCtModifier.test(phrase.slice(name.length).trim()))continue;
   const target=word.slice(match.index+match[0].length).trim();
   const region=thoracicAngioCt.exec(target)||abdominalAngioCt.exec(target);
   const qualifier=target.slice(region?.[0].length??0).trim();
   if(!name&&!control&&!/^(?:(?:urgente|ahora|inicial) )*(?:sin contraste|(?:de )?control)\b/.test(qualifier)&&
    (region||unspecifiedAngioCt.test(target)))return 'study-protocol-ambiguous';
   return 'study-method-unavailable';
  }
  return null;
 };
 const angioCtChoices=word=>{
  const target=word.replace(angioCtPrefix,'').trim();
  const matches=new Map();
  for(const [family,[command]] of availableAngioCt){
   if(thoracicAngioCt.test(target)&&family!=='angio_aorta'&&family!=='angio_pulmonar')continue;
   const study=byFamily.get(family);
   if(!matches.has(study.id))matches.set(study.id,{study,command});
  }
  return [...matches.values()].sort((a,b)=>Number(nativeById.has(b.study.id))-Number(nativeById.has(a.study.id)));
 };
 const troponin=byFamily.get('troponina'),nativeTroponin=troponin&&nativeById.get(troponin.id),
  assay=nativeTroponin&&assayOfStudy(nativeTroponin),hasSeries=authoredTroponinSeries(nativeTroponin),
  hasHighSensitivity=!!nativeTroponin&&highSensitivity.test(troponinDocumentation(nativeTroponin)),
  capillary=native.find(study=>!study.requiresCompletedTreatments?.length&&
   (terms(study).some(term=>capillaryGlucose.test(term))||measuredCapillaryGlucose.test(normalizeStudyOrder(study.result))));
 const studyIssue=(word,raw=word)=>{
  const requests=studyCollectionRequests(raw);
  if(requests.length&&(!collection||requests.length>1||requests.some(request=>!validStudyQuantity(request.quantity))))
   return 'study-quantity-unavailable';
  const protocolIssue=angioCtIssue(word);
  if(protocolIssue)return protocolIssue;
  if(capillaryGlucose.test(word)&&!capillary)return 'study-method-unavailable';
  if(!troponinPattern.test(word))return null;
  if(timedTroponin.test(word)||multipleTroponin.test(word)||explicitSeries.test(word)&&!hasSeries)return 'study-series-unavailable';
  if(ambiguousAssay.test(word)||unsupportedAssay.test(word))return 'study-assay-unavailable';
  for(const match of word.matchAll(assayPattern))if((match[1]||match[2]||match[3])!==assay)return 'study-assay-unavailable';
  if(highSensitivity.test(word)&&!hasHighSensitivity)return 'study-method-unavailable';
  return null;
 };
 const resolveWord=(word,raw=word)=>{
  const requests=studyCollectionRequests(raw);
  if(requests.length){
   const issue=studyIssue(word,raw);if(issue)return {error:issue};
   return {study:collection,command:word,quantity:requests[0].quantity,...(requests[0].additional?{additional:true}:{})};
  }
  const name=genericOptions.get(word);
  if(!name){
   const issue=studyIssue(word);
   if(issue)return {error:issue};
   const authored=authoredAngioCt.get(word);
   if(authored)return {study:authored,command:word};
   if(troponinPattern.test(word)&&(explicitSeries.test(word)||timedTroponin.test(word)))
    return {error:'study-series-unavailable'};
   return null;
  }
  if(name.ctMethod){
   const study=ctByMethod.get(name.family+':'+name.ctMethod);
   return study?{study,command:word}:{error:'study-method-unavailable'};
  }
  const capillaryRequested=name.family==='glucemia'&&capillaryGlucose.test(word),
   study=capillaryRequested?capillary:byFamily.get(name.family);
  if(name.assay&&name.assay!==assay)return {error:'study-assay-unavailable'};
  if(name.family==='troponina'&&highSensitivity.test(word)&&!hasHighSensitivity||capillaryRequested&&!capillary)
   return {error:'study-method-unavailable'};
  if(name.series&&!hasSeries)return {error:'study-series-unavailable'};
  return study?{study,command:word,...(name.series?{series:true}:{})}:
   {error:angioCtFamilies.has(name.family)?'study-method-unavailable':'unknown-study'};
 };
 const resolve=phrase=>resolveWord(normalizeStudyOrder(phrase),phrase);
 const search=phrase=>{
  const word=normalizeStudyOrder(phrase),exact=resolveWord(word,phrase);
  if(exact?.error==='study-protocol-ambiguous')return {...exact,choices:angioCtChoices(word)};
  if(exact?.error==='study-method-unavailable'&&angioCtPrefix.test(word)&&namedAngioCt.some(alias=>alias.startsWith(word)))return null;
  if(exact||word.length<4||!(/^(?:trop|hs |hsct|ctn)/.test(word)))return exact;
  let unavailable=null;
  for(const [alias,name] of genericOptions)if(name.family==='troponina'&&alias.startsWith(word)){
   const match=resolveWord(alias);
   if(match.study)return match;
   unavailable??=match;
  }
  return unavailable;
 };
 const extraAliases=new Map();
 for(const [alias] of genericOptions){
  const result=resolveWord(alias);
  if(!result?.study)continue;
  if(!extraAliases.has(result.study.id))extraAliases.set(result.study.id,[]);
  extraAliases.get(result.study.id).push(alias);
 }
 const isAliasFor=(text,id)=>{
  const result=resolve(text);
  if(result)return result.study?.id===id;
  if(nativeById.has(id))return true;
  const components=String(text).split(/[,+]|\s+(?:y|e|con)\s+/i);
  // A foreign panel name cannot consume several locally recognized orders.
  return components.length===1||components.every(part=>{
   const study=resolve(part)?.study;
   return !study||study.id===id;
  });
 };
 const lexicon=catalog.map(study=>{
  const authored=(study.aliases||[]).filter(alias=>isAliasFor(alias,study.id)),aliases=extraAliases.get(study.id)||[];
  return {...study,label:studyOrderLabel(study),aliases:[...new Set(angiographic.includes(study)?[...aliases,...authored]:[...authored,...aliases])]};
 });
 const seriesLexiconId=hasSeries?troponin.id+':series':null;
 const scanLexicon=lexicon.flatMap(study=>{
  const entry=isAliasFor(study.label,study.id)?study:{...study,label:''};
  if(!hasSeries||study.id!==troponin.id)return [entry];
  const aliases=entry.aliases.filter(alias=>resolve(alias)?.series);
  return [{...entry,aliases:entry.aliases.filter(alias=>!resolve(alias)?.series)},
   {id:seriesLexiconId,label:'',aliases}];
 });
 const orderable=lexicon.filter(study=>!byFamily.has(study.id)||byFamily.get(study.id).id===study.id||nativeById.has(study.id));
 const duplicateAngioCt=study=>{
  const label=normalizeStudyOrder(study.label);
  if(!angioCtPrefix.test(label)||nativeById.has(study.id)||containsTerm(label,'de control'))return false;
  return availableAngioCt.some(([family,aliases])=>{
   const primary=byFamily.get(family);
   if(primary.id===study.id)return false;
   const primaryLabel=normalizeStudyOrder(primary.label);
   return aliases.some(alias=>startsWithTerm(label,alias)&&startsWithTerm(primaryLabel,alias));
  });
 };
 return {resolve,search,studyIssue:phrase=>studyIssue(normalizeStudyOrder(phrase),phrase),
  scanText:phrase=>collection?studyCollectionScanText(phrase):phrase,
  lexicalIntent:(id,phrase)=>{
   if(id===seriesLexiconId)return {id:troponin.id,series:true};
   const request=collection?.id===id?studyCollectionRequests(phrase)[0]:null;
   return {id,...(request?{quantity:request.quantity,...(request.additional?{additional:true}:{})}:{})};
  },
  supportsSeries:id=>hasSeries&&id===troponin.id,
  lexicon:scanLexicon,
  catalog:orderable,
  searchCatalog:orderable.filter(study=>!duplicateAngioCt(study))};
}
