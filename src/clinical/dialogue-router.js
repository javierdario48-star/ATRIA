const n=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function classifyClinicalUtterance(text){
 const x=n(text);
 if(/^(hola|buen dia|buenas|como esta|como estas|que tal)/.test(x))return{intent:'greeting',target:'patient'};
 if(/(medicacion|medicamentos|remedios|toma algo|farmacos|tratamiento habitual)/.test(x))return{intent:'medication-history',target:'patient'};
 if(/(dolor|duele|molestia|sintoma|que siente|que le pasa)/.test(x))return{intent:'symptoms',target:'patient'};
 if(/^\/(hemograma|monitor|vega)\b/.test(x))return{intent:'command',target:x.startsWith('/vega')?'vega':'nurse'};
 return{intent:'free',target:'patient'};
}
export function routeSpeaker({explicitTarget,intentTarget,nearPatient=true,nearNurse=false}){
 if(explicitTarget)return explicitTarget;
 if(intentTarget==='nurse')return nearNurse?'nurse':'nurse';
 if(intentTarget==='vega')return'vega';
 return nearPatient?'patient':nearNurse?'nurse':'patient';
}
