import {EXAM_REGIONS,EXAM_TECHNIQUES,GLASGOW_COMPONENTS} from '../clinical/physical-exam.js';
import {esc,examHTML} from './clinical-panels.js';
import {setHTML} from './render-content.js';

export function examinationHTML(){return `<h2>Examen físico</h2>
 <p>Elegí una región y después la técnica que vas a realizar.</p>
 <div class="anatomy-layout">
 <svg class="anatomy-body" viewBox="0 0 140 300" aria-label="Regiones anatómicas">
  <path class="body-outline" d="M52 57 Q30 62 24 88 L12 163 Q11 175 22 176 L39 109 L42 168 L42 280 Q42 290 56 288 L70 202 L84 288 Q98 290 98 280 L98 168 L101 109 L118 176 Q129 175 128 163 L116 88 Q110 62 88 57 L82 50 L58 50 Z"/>
  <g data-exam-region="neurological" role="button" tabindex="0" aria-label="Neurológico y Glasgow"><circle cx="70" cy="29" r="22"/><text x="70" y="34">GCS</text></g>
  <g data-exam-region="thorax" role="button" tabindex="0" aria-label="Tórax"><path d="M47 66 L93 66 L98 112 L42 112 Z"/><text x="70" y="94">Tórax</text></g>
  <g data-exam-region="abdomen" role="button" tabindex="0" aria-label="Abdomen"><path d="M43 117 L97 117 L95 162 L45 162 Z"/><text x="70" y="144">Abd.</text></g>
  <g data-exam-region="perineum" role="button" tabindex="0" aria-label="Periné"><path d="M45 167 L95 167 L88 186 L70 197 L52 186 Z"/></g>
  <g data-exam-region="skin" role="button" tabindex="0" aria-label="Piel y mucosas"><rect x="15" y="119" width="22" height="47" rx="8"/></g>
  <g data-exam-region="pulses" role="button" tabindex="0" aria-label="Pulsos periféricos"><rect x="81" y="229" width="20" height="47" rx="8"/></g>
 </svg>
 <nav id="examRegions" class="anatomy-regions" aria-label="Selección anatómica">
 ${Object.entries({...EXAM_REGIONS,neurological:{label:'Neurológico · Glasgow'}}).map(([id,r])=>
  `<button data-exam-region="${id}" aria-pressed="false">${esc(r.label)}</button>`).join('')}
 </nav></div>
 <section class="exam-techniques"><h3 id="examRegionTitle"></h3><div id="examTechniques" class="row"></div></section>
 <div id="examResults" aria-live="polite"></div>
 <details class="clinical-section"><summary>Registro completo del examen</summary><div id="examRecord"></div></details>
 <p class="note">Cada acción registra únicamente lo explorado. Un órgano sin dato modelado no equivale a un examen normal.</p>
 <div class="actions"><button data-action="patient-chart">Volver al paciente</button></div>`;}

export function renderExamination(document,p,regionId){
 if(!document.getElementById('examRegions'))return;
 for(const b of document.querySelectorAll('[data-exam-region]')){
  b.setAttribute('aria-pressed',String(b.dataset.examRegion===regionId));
  b.classList.toggle('selected',b.dataset.examRegion===regionId);
 }
 const neuro=regionId==='neurological',r=EXAM_REGIONS[regionId];
 document.getElementById('examRegionTitle').textContent=neuro?'Neurológico · Glasgow':r.label;
 const controls=document.getElementById('examTechniques');
 if(controls.dataset.region!==regionId){setHTML(controls,neuro?
  Object.entries(GLASGOW_COMPONENTS).map(([id,label])=>`<button data-glasgow="${id}" ${p.caseEnded?'disabled':''}>${esc(label)}</button>`).join(''):
  r.techniques.map(id=>`<button data-exam-section="${id}">${esc(EXAM_TECHNIQUES[id])}</button>`).join(''));
  controls.dataset.region=regionId;
 }
 for(const b of controls.querySelectorAll('button')){
  b.disabled=p.caseEnded;
  if(b.dataset.examSection)b.textContent=EXAM_TECHNIQUES[b.dataset.examSection]+(p.examFindings?.[regionId]?.[b.dataset.examSection]?' ✓':'');
 }
 const observations=neuro?Object.entries(p.glasgow||{}).filter(([k])=>GLASGOW_COMPONENTS[k])
  .map(([k,v])=>'<p><b>'+esc(GLASGOW_COMPONENTS[k])+': '+(v.score??'NT')+'</b> · '+esc(v.text)+'</p>').join('')+
   (p.glasgow?'<p>Total: '+(p.glasgow.total==null?'faltan componentes o no son evaluables':p.glasgow.total+'/15')+'</p>':''):
  Object.entries(p.examFindings?.[regionId]||{}).map(([id,entry])=>'<section class="clinical-section"><b>'+esc(EXAM_TECHNIQUES[id])+'</b>'+
   entry.rows.map(row=>'<p><strong>'+esc(row.organ)+':</strong> '+esc(row.text)+'</p>').join('')+'</section>').join('');
 setHTML(document.getElementById('examResults'),observations||'<p>Esta región todavía no fue explorada.</p>');
 setHTML(document.getElementById('examRecord'),examHTML(p));
}
