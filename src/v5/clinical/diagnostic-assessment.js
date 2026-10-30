import {csDxNorm487} from '../../clinical/diagnostic-impression-487.js';

// A read-only interpretation of the recorded impression. The global suggestion
// catalog remains independent of the active patient. No diagnosis is generated.
const normalized=value=>csDxNorm487(value).replace(/^(?:sospecha de|probable|posible|compatible con|impresion diagnostica de) /,'');
export function assessDiagnosticImpression(c,value){
 const n=normalized(value),forms=[...(c.dx||[]),...(c.diagnosticAliases||[])].map(normalized);
 if(!n)return {level:'missing',compatible:false,sufficient:false,factor:0,reasonCode:'diagnosis-missing',
  message:'Falta registrar una impresión diagnóstica para fundamentar la solicitud.'};
 const variceal=forms.some(x=>/varice|variz/.test(x));
 const aortic=forms.some(x=>/diseccion.*(?:aort|stanford)/.test(x));
 const alternatives=variceal?['hemorragia digestiva alta variceal','hemorragia digestiva alta por varices','hda variceal','sangrado variceal','hemorragia variceal']:[];
 if(aortic)alternatives.push('diseccion aortica stanford a','diseccion de aorta tipo a');
 const exact=!/\b(?:descartad[ao]|descarto|sin|no es|no tiene)\b/.test(n)&&[...forms,...alternatives].some(x=>
  n===x||n.startsWith(x+' con ')||n.startsWith(x+' complicada')||n.startsWith(x+' descompensada')||n.endsWith(' por '+x));
 if(exact)return {level:'specific',compatible:true,sufficient:true,factor:1};
 if(variceal&&['hemorragia digestiva alta','sangrado digestivo alto','hda'].includes(n))
  return {level:'syndromic',compatible:true,sufficient:true,factor:.6};
 const broad=aortic&&['diseccion aortica','sindrome aortico agudo'].includes(n)||
  forms.some(x=>x.startsWith('peritonitis'))&&['peritonitis','abdomen agudo','sepsis abdominal'].includes(n);
 if(broad)return {level:'syndromic',compatible:true,sufficient:false,factor:.6,reasonCode:'diagnosis-specificity',
  message:'La impresión sindromática es compatible, pero necesita mayor precisión para justificar este destino.'};
 return {level:'incompatible',compatible:false,sufficient:false,factor:0,reasonCode:'diagnosis-incompatible',
  message:'La impresión registrada no justifica la conducta solicitada con la evaluación disponible. Revisá su compatibilidad clínica.'};
}
