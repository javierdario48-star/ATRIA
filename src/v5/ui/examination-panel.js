import {EXAM_REGIONS,EXAM_TECHNIQUES,GLASGOW_COMPONENTS} from '../clinical/physical-exam.js';
import {examinedRegions,examRegionStatus,progressiveExamImpression,examMissing} from './exam-summary.js';
import {esc,examHTML} from './clinical-panels.js';
import {setHTML} from './render-content.js';

// A compact, progressive overlay around the ORIGINAL anatomical selector.
// The source is p.examFindings (server-confirmed); no speculative normal exam.
export function examinationHTML(){return `<h2>Examen físico</h2>
 <p class="note">Elegí una región: se evaluarán sus maniobras y la tarjeta mostrará el resultado. Tocá nuevamente para darla vuelta.</p>
 <section class="exam-progressive" aria-label="Impresión clínica progresiva">
  <div class="exam-progress-heading"><h3>Impresión en construcción</h3><small id="examProgressCount"></small></div>
  <div id="examProgressiveSummary" aria-live="polite"></div>
 </section>
 <div class="anatomy-layout">
 <div class="exam-body-column">
 <svg class="anatomy-body" viewBox="0 0 140 300" aria-label="Regiones anatómicas">
  <path class="body-outline" d="M52 57 Q30 62 24 88 L12 163 Q11 175 22 176 L39 109 L42 168 L42 280 Q42 290 56 288 L70 202 L84 288 Q98 290 98 280 L98 168 L101 109 L118 176 Q129 175 128 163 L116 88 Q110 62 88 57 L82 50 L58 50 Z"/>
  <g data-exam-region="neurological" role="button" tabindex="0" aria-label="Neurológico y Glasgow"><circle cx="70" cy="29" r="22"/><text x="70" y="34">GCS</text></g>
  <g data-exam-region="thorax" role="button" tabindex="0" aria-label="Tórax"><path d="M47 66 L93 66 L98 112 L42 112 Z"/><text x="70" y="94">Tórax</text></g>
  <g data-exam-region="abdomen" role="button" tabindex="0" aria-label="Abdomen"><path d="M43 117 L97 117 L95 162 L45 162 Z"/><text x="70" y="144">Abd.</text></g>
  <g data-exam-region="perineum" role="button" tabindex="0" aria-label="Periné"><path d="M45 167 L95 167 L88 186 L70 197 L52 186 Z"/></g>
  <g data-exam-region="skin" role="button" tabindex="0" aria-label="Piel y mucosas"><rect x="15" y="119" width="22" height="47" rx="8"/></g>
  <g data-exam-region="pulses" role="button" tabindex="0" aria-label="Pulsos periféricos"><rect x="81" y="229" width="20" height="47" rx="8"/></g>
  <g id="examBodyMarkers" aria-hidden="true"></g>
 </svg>
 <div id="examBodyFindings" class="exam-body-findings" aria-label="Hallazgos sobre la figura anatómica"></div>
 </div>
 <nav id="examRegions" class="anatomy-regions" aria-label="Selección anatómica">
 ${Object.entries({...EXAM_REGIONS,neurological:{label:'Neurológico · Glasgow'}}).map(([id,r])=>
  `<button data-exam-region="${id}" aria-pressed="false"><span>${esc(r.label)}</span><small class="exam-nav-state"></small></button>`).join('')}
 </nav></div>
 <details class="exam-advanced"><summary>Exploración individual (opcional)</summary><section class="exam-techniques"><h3 id="examRegionTitle"></h3><div id="examTechniques" class="row"></div></section></details>
 <div id="examResults" aria-live="polite"></div>
 <details class="clinical-section"><summary>Registro completo del examen</summary><div id="examRecord"></div></details>
 <p class="note">Sin dato específico no significa normal. Las maniobras y resultados completos permanecen disponibles.</p>
 <div class="actions"><button data-action="patient-chart">Volver al paciente</button></div>`;}

function landmarks(sections){
 return sections.filter(s=>s.status==='observed'&&s.marker).slice(0,8).map((s,i)=>{
  const [x,y]=s.marker;
  return `<g class="exam-map-pin"><circle cx="${x}" cy="${y}" r="9"/><text x="${x}" y="${y+3}">${i+1}</text></g>`;
 }).join('');
}
function bodySummary(sections){
 return sections.filter(s=>s.status==='observed'&&s.marker).slice(0,8).map((s,i)=>
  `<button type="button" data-exam-region="${esc(s.id)}" title="Ver detalle de ${esc(s.label)}"><strong>${i+1}. ${esc(s.label)}</strong><span>${esc(s.summary)}</span></button>`).join('')||
   '<small>Los hallazgos aparecerán aquí al explorar.</small>';
}
function methodSummary(method){
 const observations=method.findings.filter(f=>f.known);
 return observations.length?observations.map(f=>f.text).join(' · ').slice(0,95)+
   (observations.map(f=>f.text).join(' · ').length>95?'…':''):'Sin dato específico';
}
function methodDetails(method){
 return `<details class="exam-method" data-exam-method="${esc(method.id)}"><summary>
  <b>${esc(method.label)}</b><span>${esc(methodSummary(method))}</span></summary>
  <div class="exam-method-body">${method.findings.map(row=>`<p><strong>${esc(row.organ)}:</strong> ${esc(row.known?row.text:'Sin dato específico modelado; no implica normalidad.')}</p>`).join('')}</div></details>`;
}
export function examFlipHTML(id,region,section,flipped){
 const label=region.label;
 const status=section?.status==='observed'?'Hallazgos':section?'Explorado':'Pendiente';
 const title='<span class="exam-flip-heading">'+esc(label)+'</span>';
 const front='<span class="exam-flip-front">'+title+'<small>'+esc(status)+'</small>'+
  (section?.status==='observed'?'<span class="exam-flip-preview">'+esc(section.summary)+'</span>':'')+'</span>';
 const methods=section?.methods||[];
 const lines=id==='neurological'?(section?.details||[]).map(x=>'<p>'+esc(x)+'</p>'):
  methods.map(m=>'<p><b>'+esc(m.label)+':</b> '+esc(m.findings.filter(x=>x.known).map(x=>x.text).join(' · ')||
   'Sin dato específico modelado')+'</p>');
 const back='<span class="exam-flip-back"><b>'+esc(label)+'</b>'+
  (lines.length?lines.join(''):'<small>Exploración pendiente.</small>')+
  '<small class="exam-flip-return">Tocar para volver</small></span>';
 return '<span class="exam-flip-inner">'+front+back+'</span>';
}
export function renderExamination(document,p,regionId,flippedRegion=null){
 const nav=document.getElementById('examRegions');if(!nav)return;
 const sections=examinedRegions(p),impression=progressiveExamImpression(p);
 const summary=document.getElementById('examProgressiveSummary');
 setHTML(summary,impression.findings.length?
  '<div class="exam-progress-chips">'+impression.findings.map(x=>
   '<span class="exam-progress-chip"><b>'+esc(x.region)+'</b> · '+esc(x.text)+'</span>').join('')+'</div>':
  '<p>'+esc(impression.summary)+'</p>');
 document.getElementById('examProgressCount').textContent=impression.examined+' regiones exploradas';
 setHTML(document.getElementById('examBodyMarkers'),landmarks(sections));
 setHTML(document.getElementById('examBodyFindings'),bodySummary(sections));
 for(const b of document.querySelectorAll('[data-exam-region]')){
  const id=b.dataset.examRegion,bSelected=id===regionId;
  b.setAttribute('aria-pressed',String(bSelected));
  b.classList.toggle('selected',bSelected);
  if(b.closest('#examRegions')){
   b.classList.toggle('is-flipped',id===flippedRegion);
   b.setAttribute('aria-label',EXAM_REGIONS[id]?.label||'Neurológico');
   setHTML(b,examFlipHTML(id,{label:id==='neurological'?'Neurológico · Glasgow':EXAM_REGIONS[id].label},
    sections.find(x=>x.id===id),id===flippedRegion));
  }
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
 const selected=sections.find(s=>s.id===regionId),prior=document.getElementById('examResults');
 const openMethods=new Set([...prior.querySelectorAll('[data-exam-method][open]')].map(x=>x.dataset.examMethod));
 const observations=neuro?Object.entries(p.glasgow||{}).filter(([k])=>GLASGOW_COMPONENTS[k])
  .map(([k,v])=>'<div class="exam-brief"><b>'+esc(GLASGOW_COMPONENTS[k])+': '+(v.score??'NT')+'</b> · '+esc(v.text)+'</div>').join('')+
   (p.glasgow?'<p>Total: '+(p.glasgow.total==null?'faltan componentes o no son evaluables':p.glasgow.total+'/15')+'</p>':''):
  selected?.methods.length?(()=>{
   const detailed=selected.methods.filter(m=>m.findings.some(x=>x.known));
   const withoutDetail=selected.methods.filter(m=>!m.findings.some(x=>x.known));
   const quiet=withoutDetail.length?'<details class="exam-method exam-method-quiet" data-exam-method="unmodeled"><summary>'+
    withoutDetail.length+' maniobra'+(withoutDetail.length===1?'':'s')+' sin dato específico</summary>'+
    '<div class="exam-method-body">'+withoutDetail.map(methodDetails).join('')+'</div></details>':'';
   return '<p class="exam-region-summary">'+esc(selected.summary)+'</p>'+
    detailed.map(methodDetails).join('')+quiet;
  })():'';
 setHTML(prior,observations||'<p class="note">Esta región todavía no fue explorada.</p>');
 for(const detail of prior.querySelectorAll('[data-exam-method]'))
  detail.open=openMethods.has(detail.dataset.examMethod);
 setHTML(document.getElementById('examRecord'),examHTML(p));
}
