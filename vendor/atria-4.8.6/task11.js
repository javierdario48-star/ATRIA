(()=>{
'use strict';
if(window.__atriaVoiceAnamnesis484)return;
window.__atriaVoiceAnamnesis484=true;
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[¿?¡!.,;:]+/g,' ').replace(/\s+/g,' ');
function canonicalQuestion(raw){
 const n=norm(raw); if(!n||raw.trim().startsWith('/'))return raw;
 const rules=[
  [/(\b(toma|tomas|toman|usa|usas|consume|consumis|consumes)\b.*\b(medicacion|medicamentos|medicamento|remedios|remedio|pastillas|farmacos|fármacos)\b)|(\bmedicacion habitual\b)/,'¿Qué medicación habitual toma?'],
  [/\b(alergia|alergias|alergico|alergica)\b/,'¿Tiene alergias a medicamentos o de otro tipo?'],
  [/\b(antecedentes medicos|antecedentes personales|enfermedades previas|enfermedades de base|que enfermedades tiene|alguna enfermedad)\b/,'¿Qué antecedentes médicos tiene?'],
  [/\b(cirugias|cirugia previa|operaciones|operado|operada|lo operaron|la operaron)\b/,'¿Tuvo cirugías previas?'],
  [/\b(internaciones|internado antes|internada antes|hospitalizaciones|hospitalizado antes)\b/,'¿Tuvo internaciones previas?'],
  [/\b(fuma|fumador|fumadora|tabaco|cigarrillos|tabaquismo)\b/,'¿Fuma o fumó?'],
  [/\b(alcohol|bebe|toma alcohol|cerveza|vino)\b/,'¿Consume alcohol?'],
  [/\b(drogas|cocaina|marihuana|sustancias|consumo recreativo)\b/,'¿Consume drogas u otras sustancias?'],
  [/\b(antecedentes familiares|familia.*enfermedad|padres.*enfermedad|hermanos.*enfermedad)\b/,'¿Tiene antecedentes familiares relevantes?'],
  [/\b(donde.*duele|localizacion.*dolor|dolor.*donde|en que parte.*duele)\b/,'¿Dónde le duele exactamente?'],
  [/\b(cuando.*empezo|cuando.*comenzo|desde cuando|inicio.*dolor|hace cuanto.*dolor)\b/,'¿Cuándo comenzó el dolor?'],
  [/\b(cuanto.*duele|intensidad.*dolor|del 1 al 10|del uno al diez|escala.*dolor)\b/,'¿Qué intensidad tiene el dolor del 0 al 10?'],
  [/\b(irradia|corre.*dolor|se va.*dolor|se extiende.*dolor)\b/,'¿El dolor se irradia a algún sitio?'],
  [/\b(como es.*dolor|tipo.*dolor|caracter.*dolor|punzante|opresivo|quemante|colico)\b/,'¿Cómo describiría el dolor?'],
  [/\b(empeora.*comer|mejora.*comer|relacion.*comida|despues.*comer|con las comidas)\b/,'¿El dolor cambia con las comidas?'],
  [/\b(movimiento.*dolor|respirar.*dolor|tos.*dolor|posicion.*dolor|que lo empeora|que lo mejora)\b/,'¿Qué empeora o mejora el dolor?'],
  [/\b(fiebre|temperatura|escalofrios)\b/,'¿Tuvo fiebre o escalofríos?'],
  [/\b(nausea|nauseas|vomito|vomitos|vomita|vomitado)\b/,'¿Tuvo náuseas o vómitos?'],
  [/\b(diarrea|constipacion|estrenimiento|deposiciones|evacuaciones|materia fecal|heces)\b/,'¿Cómo fueron sus últimas deposiciones?'],
  [/\b(sangre.*materia fecal|sangre.*heces|melena|rectorragia|sangrado digestivo)\b/,'¿Notó sangre en las deposiciones o materia fecal negra?'],
  [/\b(orina|orinar|diuresis|disuria|ardor.*orinar|hematuria|sangre.*orina)\b/,'¿Tuvo cambios al orinar, ardor o sangre en la orina?'],
  [/\b(perdio peso|perdida.*peso|adelgazo|adelgazado)\b/,'¿Tuvo pérdida de peso involuntaria?'],
  [/\b(apetito|hambre|come menos|falta.*apetito)\b/,'¿Cómo está su apetito?'],
  [/\b(embarazo|embarazada|ultima menstruacion|fum|fecha.*menstruacion)\b/,'¿Hay posibilidad de embarazo y cuándo fue su última menstruación?'],
  [/\b(anticoagul|aspirina|clopidogrel)\b/,'¿Usa anticoagulantes o antiagregantes?'],
  [/\b(antibiotico|antibioticos recientes)\b/,'¿Tomó antibióticos recientemente?'],
  [/\b(viaje|viajo|viajado)\b/,'¿Viajó recientemente?'],
  [/\b(contacto.*enfermo|contactos enfermos)\b/,'¿Tuvo contacto con personas enfermas?']
 ];
 for(const [re,c] of rules)if(re.test(n))return c;
 return raw;
}
function nativeSet(el,v){const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const d=Object.getOwnPropertyDescriptor(p,'value');if(d&&d.set)d.set.call(el,v);else el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function isClinicalInput(el){if(!el||!el.matches?.('input,textarea'))return false;const p=(el.getAttribute('placeholder')||'')+' '+(el.getAttribute('aria-label')||'');return /hablar cerca|anamnes|paciente|chat/i.test(p)}
function bindInput(el){if(!isClinicalInput(el)||el.dataset.atriaAnamnesis484)return;el.dataset.atriaAnamnesis484='1';el.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.shiftKey||e.isComposing)return;const raw=el.value||'',c=canonicalQuestion(raw);if(c!==raw)nativeSet(el,c)},true)}
function scanInputs(){document.querySelectorAll('input,textarea').forEach(bindInput)}
scanInputs();const mi=new MutationObserver(scanInputs);if(document.body)mi.observe(document.body,{childList:true,subtree:true});
let recognition=null,listening=false,ownedButton=null,transcript='',targetInput=null;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function nearestClinicalInput(btn){let n=btn;for(let i=0;n&&i<6;i++,n=n.parentElement){const f=[...n.querySelectorAll('input,textarea')].find(isClinicalInput);if(f)return f}return [...document.querySelectorAll('input,textarea')].filter(x=>x.offsetParent!==null).find(isClinicalInput)||null}
function isDictationButton(btn){if(!btn||!SR)return false;const sig=((btn.textContent||'')+' '+(btn.getAttribute('aria-label')||'')+' '+(btn.getAttribute('title')||'')).toLowerCase();if(!/(🎤|micr[oó]fono|dictado|voz a texto|speech)/i.test(sig))return false;return !!nearestClinicalInput(btn)}
function createRecognition(){if(!SR)return null;const r=new SR();r.lang='es-AR';r.continuous=false;r.interimResults=true;r.maxAlternatives=1;r.onstart=()=>{listening=true;transcript='';if(targetInput)targetInput.dataset.atriaListening='1'};r.onresult=e=>{let text='';for(let i=e.resultIndex;i<e.results.length;i++)text+=(e.results[i][0]?.transcript||'')+' ';text=text.trim();if(text){transcript=(transcript+' '+text).trim();if(targetInput)nativeSet(targetInput,transcript)}};r.onerror=e=>{console.warn('ATRIA dictado',e.error);listening=false;if(targetInput)delete targetInput.dataset.atriaListening};r.onend=()=>{listening=false;if(targetInput)delete targetInput.dataset.atriaListening;const el=targetInput,finalText=(el?.value||transcript||'').trim();if(el&&finalText){const c=canonicalQuestion(finalText);nativeSet(el,c);setTimeout(()=>{el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true}));el.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',bubbles:true,cancelable:true}))},80)}targetInput=null;ownedButton=null;transcript=''};return r}
if(SR)recognition=createRecognition();
function startDictation(btn,e){if(!recognition||listening)return false;const el=nearestClinicalInput(btn);if(!el)return false;targetInput=el;ownedButton=btn;transcript='';try{recognition.start();if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}return true}catch(err){console.warn('ATRIA dictado start',err);targetInput=null;ownedButton=null;return false}}
document.addEventListener('pointerdown',e=>{const btn=e.target?.closest?.('button,[role="button"]');if(isDictationButton(btn))startDictation(btn,e)},true);
document.addEventListener('click',e=>{const btn=e.target?.closest?.('button,[role="button"]');if(ownedButton&&btn===ownedButton){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}},true);
window.atriaAnamnesis484={canonicalize:canonicalQuestion,speechRecognitionAvailable:!!SR,listening:()=>listening};
})();