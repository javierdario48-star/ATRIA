// Pure norepinephrine interpretation contract extracted VERBATIM from
// src/integration/nurse-execution-487.js. Never import that HTML wrapper here.
export function noradrenalineOrderIssue487(raw,original=raw,unfiltered=original){
 const normalize=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[µμ]/g,'u').replace(/,/g,'.').replace(/\b([ievs])\.\s*([vomc])\.?/g,'$1$2');
 const given=normalize(original);
 const name=/\b(?:noradrenalina|norepinefrina|nora)\b/;
 if((given.match(/\b(?:noradrenalina|norepinefrina|nora)\b/g)||[]).length!==1||
   (normalize(unfiltered).match(/\b(?:noradrenalina|norepinefrina|nora)\b/g)||[]).length!==1)
  return 'Especificá una única molécula y tasa de noradrenalina por ejecución.';
 const source=given.replace(/\//g,' ').replace(/\s+/g,' ').trim(),identity=source.match(name);
 if(/\bvia\b(?!\s+(?:iv|ev|intravenos[oa]|endovenos[oa])\b)/.test(source))return 'Especificá una vía IV completa; una vía incompleta no confirma administración.';
 const numbers=source.match(/\d+(?:\.\d+)?/g)||[];
 const rate=source.match(/(?:^|\s)(\d+(?:\.\d+)?)\s+(?:mcg|ug)\s+kg\s+min(?:\s|$)/);
 if(numbers.length&&(!rate||numbers.length!==1||!Number.isFinite(Number(rate[1]))||Number(rate[1])<=0||rate.index<identity.index))
  return 'Indicá después del nombre una tasa positiva en mcg/kg/min IV, con cero inicial para fracciones.';
 // Only an explicit supported command/default or one absolute IV rate is
 // accepted. Unknown route, bolus, spelled/negative dose or modal context cannot
 // silently fall back to the default infusion. Preserve the WHOLE raw clause.
 const rest=source.replace(rate?.[0]||'__no_rate__',' ').replace(name,' ').replace(/\s+/g,' ').trim();
 if(!/^(?:(?:enfermera|enfermero|enfermeria|por|favor|indico|solicito|necesito|pido|quiero|administrar|administra|dar|da|pasar|pasa|iniciar|inicia|infundir|infusion|iv|ev|via|intravenoso|intravenosa|endovenoso|endovenosa|vasopresor)\s*)*$/.test(rest))
  return 'Indicación ambigua o incompatible: especificá noradrenalina en infusión IV y su tasa en mcg/kg/min.';
 if(/[+−–—-]\s*\d|(?:^|\s)[.,]\d/.test(given))return 'Usá una tasa positiva explícita con cero inicial; no se convierten signos ambiguos.';
 return null;
}

const normalizeDottedRoutes=text=>String(text||'').replace(
 /\b(v\.\s*o|p\.\s*o|s\.\s*l|i\.\s*m|s\.\s*c|i\.\s*a|p\.\s*r)\.?/gi,
 route=>route.replace(/[.\s]/g,''));
const normalize=text=>normalizeDottedRoutes(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .replace(/[µμ]/g,'u').replace(/,/g,'.').replace(/[−–—]/g,'-').toLowerCase();
const number='[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
export const SPECIAL_IV_FORMULATIONS_487=Object.freeze({
 albumin:Object.freeze({unit:'g/kg',pattern:new RegExp('(?:^|\\s)('+number+')\\s*g\\s*(?:/\\s*|\\s+)kg\\b','g')}),
 amphotericin:Object.freeze({unit:'mg/kg',pattern:new RegExp('(?:^|\\s)('+number+')\\s*mg\\s*(?:/\\s*|\\s+)kg\\b','g')}),
 transfusion:Object.freeze({unit:'unidad',pattern:new RegExp('(?:^|\\s)('+number+')\\s*(?:unidad(?:es)?|u)\\b','g')}),
 vasopressor:Object.freeze({unit:'µg/kg/min'})
});
/** Interpretation only. Positive, unambiguous original units are accepted;
 * no indication, allergy, pressure or scoring decision can block delivery.
 */
export function parseSpecialIVDose487(id,text,reference,unfiltered=text){
 const form=SPECIAL_IV_FORMULATIONS_487[id];if(!form)return null;
 const raw=normalize(text);
 if(!Number.isFinite(reference?.amount)||reference.amount<=0||reference.unit!==form.unit)throw Error('IV formulation missing');
 if(id==='vasopressor'){
  const issue=noradrenalineOrderIssue487(text,text,unfiltered);if(issue)throw Error('unsupported-noradrenaline-dose-route');
  const rate=raw.replace(/\//g,' ').replace(/\s+/g,' ').match(/(?:^|\s)(\d+(?:\.\d+)?)\s+(?:mcg|ug)\s+kg\s+min(?:\s|$)/);
  const amount=rate?Number(rate[1]):reference.amount;
  return {amount,unit:form.unit,display:amount+' '+form.unit,defaultApplied:!rate};
 }
 if(/\b(?:oral|vo|po|im|intramuscular|sc|subcutane\w*|sl|sublingual|rectal|pr|nasal|ia|intraarterial|intratecal|epidural)\b/.test(raw))throw Error('unsupported-dose-route');
 const matches=[...raw.matchAll(form.pattern)];
 if(matches.length>1)throw Error('ambiguous-dose');
 if(!matches.length){
  if(/\d|\b(?:g|mg|ml|mcg|ug|kg|unidad\w*|gramos?|miligramos?)\b/.test(raw))throw Error('invalid-special-IV-dose');
  return {...reference,defaultApplied:true};
 }
 const match=matches[0],rest=raw.slice(0,match.index)+raw.slice(match.index+match[0].length);
 const amount=Number(match[1]);
 if(!Number.isFinite(amount)||amount<=0)throw Error('invalid-special-IV-dose');
 if(/\d|\b(?:g|mg|ml|mcg|ug|kg|unidad\w*|gramos?|miligramos?)\b/.test(rest))throw Error('ambiguous-dose-qualifier');
 return {amount,unit:form.unit,display:amount+' '+(id==='transfusion'&&amount!==1?'unidades':form.unit),defaultApplied:false};
}

/** Resolve the original study/medicine alias collision only when the doctor
 * gives a medication formulation. Bare albumin remains the original lab alias.
 * Extend lexical phrases for blood units; the original scanner stays intact.
 */
export function nursingFormulationVocabulary487(text,{studies=[],therapies=[]}={}){
 const raw=normalize(text);
 const escaped=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 // A named medicine with an explicit dose and administration route is a
 // formulation. A bare electrolyte name retains its laboratory meaning.
 const formulations=new Set(therapies.flatMap(t=>[t.label,...(t.aliases||[])])
  .filter(alias=>typeof alias==='string'&&alias.trim()).map(alias=>normalize(alias))
  .filter(alias=>new RegExp('(?:^|\\b)'+escaped(alias)+
   '\\s+[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)\\s*(?:mg|g|mcg|ug|ml|iu|ui|u)\\b'+
   '\\s+(?:iv|ev|intravenos[oa]|endovenos[oa]|oral|vo|po|im|sc|nebulizad[oa]s?)\\b').test(raw)));
 const explicitAlbumin=/\balbumina\s+(?:(?:iv|ev|intravenos[oa]|endovenos[oa]|mg|g|ml|kg)\b|[+-]?(?:\d|\.\d))/.test(raw);
 if(explicitAlbumin)formulations.add('albumina');
 const filtered=formulations.size?studies.filter(s=>!formulations.has(normalize(s.label))).map(s=>
  ({...s,aliases:(s.aliases||[]).filter(a=>!formulations.has(normalize(a)))})):studies;
 const bloodDoses=[...raw.matchAll(SPECIAL_IV_FORMULATIONS_487.transfusion.pattern)].map(x=>x[0].trim());
 const vocabulary=bloodDoses.length?therapies.map(t=>t.id==='transfusion'?{...t,aliases:[...(t.aliases||[]),
  ...[t.label,...(t.aliases||[])].flatMap(label=>bloodDoses.map(dose=>label+' '+dose))]}:t):therapies;
 // Preserve dotted route tokens before the original scanner strips periods.
 return {studies:filtered,therapies:vocabulary,text:normalizeDottedRoutes(text)};
}
