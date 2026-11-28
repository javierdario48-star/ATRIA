// Presentation-only guard selector. Case IDs and multipliers come from the
// shared selection policy; no separate case admission or reward engine.
import {guardCaseSpecialty,GUARD_SCOPES} from '../clinical/guard-selection-policy.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Legacy cases have a symptom-based selector and no authored title.
// Explicit presentation labels never change the diagnosis or its aliases.
const legacyTitles=Object.freeze({
 'CIRR-001':'Cirrosis descompensada','PANC-001':'Pancreatitis aguda','CROHN-001':'Enfermedad de Crohn',
 'HDA-001':'Hemorragia digestiva alta','COLON-001':'Cáncer de colon','PERI-PBE-001':'Peritonitis bacteriana espontánea',
 'PERI-SEC-001':'Peritonitis secundaria','PERI-TER-001':'Peritonitis terciaria','APP-001':'Apendicitis aguda',
 'CHOLE-001':'Colecistitis aguda','ILEO-001':'Íleo mecánico','MESI-001':'Isquemia mesentérica aguda',
 'CHOLANG-001':'Colangitis aguda','VARIX-001':'Hemorragia digestiva variceal','ENCEF-001':'Encefalopatía hepática',
 'UC-AS-001':'Colitis ulcerosa aguda grave','CDI-001':'Infección por Clostridioides difficile',
 'DIVERT-001':'Diverticulitis aguda','LGIB-001':'Hemorragia digestiva baja','HEPAT-001':'Hepatitis aguda',
 'DIARR-001':'Gastroenteritis aguda','FECAL-001':'Fecaloma','PUD-001':'Enfermedad ulcerosa péptica',
 'CELIAC-001':'Enfermedad celíaca','ACAL-001':'Acalasia esofágica'
});
export function pathologyName(c){
 const title=c.title||legacyTitles[c.id]||c.dx?.[0];
 if(!title)throw Error('Missing pathology display title for '+c.id);
 return title.charAt(0).toLocaleUpperCase('es')+title.slice(1);
}
export const isV2=c=>c.clinicalRevision==='v2-candidate';
export const pathologyLabel=c=>pathologyName(c)+(isV2(c)?' · V2':'');
export function guardMenuModel(cases,playableIds){
 const allowed=new Set(playableIds),eligible=cases.filter(c=>allowed.has(c.id));
 const groups=[...new Set(eligible.map(guardCaseSpecialty))].map(name=>({
  name,count:eligible.filter(c=>guardCaseSpecialty(c)===name).length
 }));
 const pathology=[...eligible].sort((a,b)=>Number(isV2(b))-Number(isV2(a))||pathologyName(a).localeCompare(pathologyName(b),'es'));
 return {eligible,groups,pathology,revisions:pathology.filter(isV2)};
}
const formatXP=scope=>'×'+GUARD_SCOPES[scope].multiplier.toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})+' XP';
const systemIcon=name=>{
 const n=name.toLowerCase();
 if(n.includes('cardio'))return '<path d="M3 12h4l2-6 4 12 2-6h6"/><path d="M12 21C7 17 2 14 2 8a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 6-5 9-10 13Z"/>';
 if(n.includes('resp'))return '<path d="M12 3v9m0-4-3 3m3-3 3 3M9 7C5 4 3 9 2 14c-1 5 2 8 6 6 2-1 2-4 2-7M15 7c4-3 6 2 7 7 1 5-2 8-6 6-2-1-2-4-2-7"/>';
 if(n.includes('neuro'))return '<path d="M12 5a4 4 0 0 0-7 2 4 4 0 0 0-2 7 4 4 0 0 0 4 5 4 4 0 0 0 5 1V5Zm0 0a4 4 0 0 1 7 2 4 4 0 0 1 2 7 4 4 0 0 1-4 5 4 4 0 0 1-5 1M5 7l2 2m12-2-2 2M7 14l2 2m8-2-2 2"/>';
 return '<path d="M9 3v5c0 2 2 3 4 2 4-2 7 1 7 5 0 5-4 7-8 6-5-1-8-4-8-8 0-3 1-5 3-6V3"/><path d="M10 15c1 2 4 3 6 1"/>';
};
export function renderGuardBanners(cases,playableIds,{offline=false}={}){
 const {eligible,groups,pathology,revisions}=guardMenuModel(cases,playableIds);
 return `<section class="guard-choice" aria-label="Selección de casos">
  <div class="guard-section-heading"><span>01 · DESAFÍO</span><span>${eligible.length} CASOS</span></div>
  <label class="guard-banner guard-random">
   <input type="radio" name="guardScope" value="random" checked aria-label="Casos aleatorios">
   <span class="guard-lightning" aria-hidden="true"><svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice"><path d="M166 -8 123 48l33-6-32 45 25-7-39 68"/><path d="m240 19-53 42 28 1-33 26 19 3-52 57"/><path d="M96 -8 63 29l25-4-16 27"/></svg></span>
   <span class="guard-banner-copy"><small>DESAFÍO DE GUARDIA</small><strong>Casos aleatorios</strong><span>Sin conocer el diagnóstico · todos los sistemas</span></span>
   <span class="guard-xp guard-xp-gold"><b>${formatXP('random')}</b><small>RECOMPENSA</small></span>
  </label>
  <div class="guard-section-heading"><span>02 · POR SISTEMA</span><span>${formatXP('specialty')}</span></div>
  <label class="guard-scope-heading"><input type="radio" name="guardScope" value="specialty"> Elegir un sistema</label>
  <div class="guard-system-grid">${groups.map((g,i)=>`<button type="button" class="guard-system" data-guard-system="${esc(g.name)}" data-tone="${i%4}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true">${systemIcon(g.name)}</svg><span><b>${esc(g.name)}</b><small>${g.count} casos</small></span><span class="guard-system-arrow" aria-hidden="true">›</span></button>`).join('')}</div>
  <label class="field" id="guardSpecialtyField" hidden>Sistema seleccionado<select id="guardSpecialty">${groups.map(g=>`<option value="${esc(g.name)}">${esc(g.name)}</option>`).join('')}</select></label>
  <div class="guard-section-heading"><span>03 · POR PATOLOGÍA</span><span>${formatXP('specific')}</span></div>
  <label class="guard-scope-heading"><input type="radio" name="guardScope" value="specific"> Elegir una patología</label>
  ${revisions.length?`<div class="guard-revision-heading">NUEVAS REVISIONES · V2</div><div class="guard-revision-grid">${revisions.map(c=>`<button type="button" class="guard-path-card" data-guard-case="${esc(c.id)}" aria-pressed="false"><span><b>${esc(pathologyName(c))}</b><small>${esc(guardCaseSpecialty(c))}</small></span><span class="guard-v2">V2</span></button>`).join('')}</div>`:''}
  <label class="field" id="guardCaseField" hidden>Todas las patologías<select id="caseChoice">${pathology.map(c=>`<option value="${esc(c.id)}">${esc(pathologyLabel(c))}</option>`).join('')}</select></label>
  <p class="guard-reward-note">${offline?'Multiplicadores de XP de carrera en modo conectado. En práctica offline se conserva la XP local habitual.':'El multiplicador de carrera se valida en el servidor al cerrar un caso.'}</p>
 </section>`;
}
// Same input/select contract used by existing guard starts, automation and server.
export function refreshGuardBanners(root){
 const scope=root.querySelector('input[name="guardScope"]:checked')?.value||'random';
 const specialty=root.querySelector('#guardSpecialty'),specific=root.querySelector('#caseChoice');
 const sf=root.querySelector('#guardSpecialtyField'),cf=root.querySelector('#guardCaseField');
 if(sf)sf.hidden=scope!=='specialty';if(cf)cf.hidden=scope!=='specific';
 for(const button of root.querySelectorAll('[data-guard-system]'))button.setAttribute('aria-pressed',String(scope==='specialty'&&button.dataset.guardSystem===specialty?.value));
 for(const button of root.querySelectorAll('[data-guard-case]'))button.setAttribute('aria-pressed',String(scope==='specific'&&button.dataset.guardCase===specific?.value));
 const section=root.querySelector('.guard-choice');if(section)section.dataset.scope=scope;
}
export function selectGuardBanner(root,button){
 const scope=button.dataset.guardSystem?'specialty':button.dataset.guardCase?'specific':null;
 if(!scope)return false;
 const input=root.querySelector('input[name="guardScope"][value="'+scope+'"]'),select=root.querySelector(scope==='specialty'?'#guardSpecialty':'#caseChoice');
 const value=scope==='specialty'?button.dataset.guardSystem:button.dataset.guardCase;
 if(!input||!select||![...select.options].some(o=>o.value===value))return false;
 input.checked=true;select.value=value;refreshGuardBanners(root);return true;
}
