// One collection vocabulary shared by orders, reports and evidence. A counted
// collection in the authored catalog is different from an organism/antibiogram
// result. Ordinary laboratory definitions retain their existing result model.
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const numbers={cero:0,un:1,uno:1,una:1,otro:1,otra:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12};
const quantityValue=value=>Object.hasOwn(numbers,value)?numbers[value]:Number(value.replace(',','.'));
export const validStudyQuantity=value=>Number.isSafeInteger(value)&&value>0;
const quantity='(?:'+Object.keys(numbers).join('|')+'|[-+]?\\d+(?:[.,]\\d+)?)';
const pairRequest=new RegExp('(?<![a-z0-9])('+quantity+')\\s+(?:solo\\s+)?par(?:es)?\\s+(?:(?:mas|adicionales?|nuevos?)\\s+)?de\\s+(?:hemocultivos|cultivos de sangre)(?:\\s+(?:mas|adicionales?|nuevos?))?\\b','g');
const trailingPairRequest=new RegExp('\\b(?:hemocultivos|cultivos de sangre)[,:]?\\s+('+quantity+')\\s+(?:solo\\s+)?par(?:es)?(?:\\s+(?:mas|adicionales?|nuevos?))?\\b','g');

export function studyCollectionDefinition(study){
 const authored=/^(\w+) par(?:es)? de hemocultivos\b/.exec(normalize(study?.label)),
  count=authored&&quantityValue(authored[1]),separator=String(study?.result??'').indexOf(';'),
  pendingReport=separator>=0?study.result.slice(separator+1).trim():'';
 if(study?.type!=='lab'||!validStudyQuantity(count)||! /\bpendientes\b/.test(normalize(pendingReport)))return null;
 return {unit:'blood-culture-pair',requiredCount:count,pendingReport};
}

export function studyCollectionRequests(phrase){
 return [pairRequest,trailingPairRequest].flatMap(pattern=>[...normalize(phrase).matchAll(pattern)]).map(match=>({
  quantity:quantityValue(match[1]),additional:/\b(?:otro|otra|mas|adicionales?|nuevos?)\b/.test(match[0]),
  text:match[0],index:match.index
 })).sort((a,b)=>a.index-b.index);
}
export const studyCollectionScanText=phrase=>normalize(phrase).replace(pairRequest,'hemocultivos').replace(trailingPairRequest,'hemocultivos');

export function studyCollectionPhrase(count){
 const number=['','Un','Dos','Tres','Cuatro','Cinco','Seis','Siete','Ocho','Nueve','Diez','Once','Doce'][count]??String(count);
 return number+(count===1?' par':' pares')+' de hemocultivos';
}

export function studyCollectionResult(definition,count){
 const collection=studyCollectionDefinition(definition);
 if(!collection||!validStudyQuantity(count))return definition.result;
 // Preserve the authored pending microbiology facts and its 24–72 h horizon.
 // A later sample cannot inherit an assertion that it preceded antibiotics.
 return studyCollectionPhrase(count)+(count===1?' obtenido y enviado':' obtenidos y enviados')+
  ' a incubación; '+collection.pendingReport;
}
