// Deterministic, case-bound anamnesis routing. Never fuzzy-match "edad" inside "enfermedad".
export function csAnamnesisClassify(input){
 const s=String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ]+/g,' ').replace(/\s+/g,' ').trim();
 if(!s)return null;
 const rules=[
  ['familyHistory',/\b(antecedentes? familiares?|familiares?|hereditari[oa]s?|en tu familia|en su familia)\b/],
  ['surgeries',/\b(cirugi[aa]s?|operad[oa]s?|operaron|operacion(?:es)?|quirurgic[oa]s?)\b/],
  ['allergies',/\b(alergi[aa]s?|alergic[oa]s?|alergeno|alergenos)\b/],
  ['meds',/\b(medicacion|medicamentos?|remedios?|farmacos?|tratamiento habitual|pastillas?|tom[aa]s? alguna medicacion)\b/],
  ['age',/\b(edad|cuantos? anos?|anos? tienes|anos? tiene|anos? tenes)\b/],
  ['pmh',/\b(antecedentes? (?:personales?|medicos?)|enfermedad(?:es)?|patologias?|morbilidad|problemas? de salud|padeces|padece)\b/],
  ['habitsSummary',/\b(habitos?|habitos toxicos)\b/],
  ['tobacco',/\b(tabaco|fumas?|fumador(?:a)?|cigarrillos?|tabaquismo)\b/],
  ['alcohol',/\b(alcohol|bebidas? alcoholicas?|cerveza|vino|whisky)\b/],
  ['drugs',/\b(drogas?|cocaina|cannabis|marihuana|sustancias recreativas)\b/],
  ['otherSymptoms',/\b(otro(?:s)? sintomas?|algo mas|ademas de eso|sintomas? asociados?|que mas sientes?|que mas sentis)\b/],
  ['onset',/\b(desde cuando|hace cuanto|cuando empezo|cuando comenzo|como comenzo|como empezo|inicio del|inicio de los)\b/],
  ['radiation',/\b(irradia|irradiacion|se corre|se extiende|hacia donde va)\b/],
  ['intensity',/\b(intensidad|escala del dolor|escala de dolor|del 1 al 10|del 0 al 10|cuanto (?:te |le )?duele)\b/],
  ['location',/\b(donde duele|donde te duele|donde le duele|localizacion|en que parte|en que zona)\b/],
  ['features',/\b(como es el dolor|que tipo de dolor|caracteristicas del dolor|punzante|opresivo)\b/],
  ['reason',/\b(motivo de consulta|que te trae|que le trae|por que viniste|por que vino|por que estas aqui)\b/],
  ['bowel',/\b(deposiciones?|diarrea|constipacion|estreñimiento|heces|evacuaciones?|ritmo intestinal)\b/],
  ['urinary',/\b(orina|orinar|urinari[oa]|disuria)\b/],
  ['dyspnea',/\b(disnea|falta de aire|respirar|respiracion)\b/],
  ['chestPain',/\b(dolor (?:en el )?pecho|dolor toracico)\b/],
  ['syncope',/\b(sincope|desmayo|desmayaste|perdio el conocimiento)\b/],
  ['nauseaVomiting',/\b(nauseas?|vomitos?|vomitaste)\b/],
  ['occupation',/\b(trabaj[ao]s?|ocupacion|profesion|a que te dedicas|a que se dedica)\b/],
  ['travel',/\b(viajes?|viajaste|viajo)\b/],
  ['contacts',/\b(contactos? enfermos?|alguien enfermo en casa)\b/],
  ['sleep',/\b(sueño|sueno|dormis|duermes|duerme)\b/]
 ];
 for(const [intent,re] of rules)if(re.test(s))return intent;
 return null;
}
export function csAnamnesisFact(caseData,input){
 const intent=csAnamnesisClassify(input);if(!intent)return null;
 const cm=caseData?.common||{},an=caseData?.anamnesis||{};
 const dynamic={
  onset:['onset','course','surgery_history'],
  radiation:['radiation','migration'],
  location:['pain','migration'],
  features:['pain'],
 };
 let source=null,value=null;
 if(Object.prototype.hasOwnProperty.call(cm,intent)){source='common.'+intent;value=cm[intent]}
 else if(Object.prototype.hasOwnProperty.call(an,intent)){source='anamnesis.'+intent;value=an[intent]}
 else if(intent==='intensity'){source='common.pain';value=cm.pain}
 else if(intent==='reason'){source='common.reason';value=cm.reason}
 else if(dynamic[intent]){
  const match=(caseData?.intents||[]).find(x=>dynamic[intent].includes(x.id));
  if(match){source='intents.'+match.id;value=match.answers}
 }
 else if(intent==='alcohol'){
  const match=(caseData?.intents||[]).find(x=>x.id==='alcohol');
  if(match){source='intents.alcohol';value=match.answers}
 }
 const answer=Array.isArray(value)?value.find(x=>typeof x==='string'&&x.trim()):value;
 return {intent,source,text:typeof answer==='string'&&answer.trim()?answer.trim():null,caseId:caseData?.id||null};
}
