// Read-only outcome presentation, with the same earned/lost/missing/unnecessary
// divisions used in ATRIA 4.8.7. Source is the unique native closure receipt.
import {esc} from './clinical-panels.js';
import {GUARD_SCOPES} from '../clinical/guard-selection-policy.js';
export function caseDebriefHTML(closure){
 if(!closure)return '';
 const q=closure.quality||{},b=closure.debrief;
 const dest={quirofano:'Derivación a quirófano',sala:'Internación en sala',
  observacion:'Observación',alta:'Alta',uti:'Unidad de cuidados intensivos',
  procedimiento:'Procedimiento'}[closure.destination]||closure.destination;
 const section=(name,items,points=false)=>'<section class="case-score-section"><h4>'+name+'</h4>'+
  (items?.length?items.map(item=>'<div class="case-score-row"><span>'+
   esc(points?item.label:item)+'</span>'+(points?'<b class="'+(item.points<0?'score-loss':'score-gain')+'">'+
    (item.points>=0?'+':'')+item.points+'</b>':'')+'</div>').join(''):
   '<p class="case-score-empty">Ninguno</p>')+'</section>';
 const row=(label,value,tone='')=>'<div class="case-score-row"><span>'+label+'</span><b'+
  (tone?' class="'+tone+'"':'')+'>'+esc(value)+'</b></div>';
 const base=closure.baseXP??closure.xp,factor=closure.rewardMultiplier??1;
 const hints=closure.hintCount??0,penalty=closure.hintPenaltyPercent??0;
 const scope=GUARD_SCOPES[closure.rewardScope]?.label;
 const beforeHints=Math.round(base*factor),lost=beforeHints-closure.xp;
 const hintDiscount=penalty?'−'+penalty+'%'+(closure.creditStatus!=='pending'&&lost>0?' · −'+lost+' XP':''):'0%';
 const experience='<section class="case-score-section case-experience"><h4>Experiencia obtenida</h4>'+
  (closure.creditStatus==='ineligible'?'<p class="case-score-empty">Tu cuenta no recibe XP por esta atención.</p>':
   row('XP base del caso',base+' XP')+
   (factor!==1?row(scope||'Modalidad de selección','×'+String(factor).replace('.',','))+
    row('XP antes de pistas',beforeHints+' XP'):'')+
   row('Pistas nuevas utilizadas',hints)+
   row('Penalización por pistas',hintDiscount,penalty?'score-loss':'')+
   (closure.creditStatus==='pending'?'<p class="case-score-empty">XP pendiente de acreditación.</p>':
    row('XP final obtenida',closure.xp+' XP','score-gain')))+
  '</section>';
 return '<div class="case-scorecard"><h3>Caso cerrado</h3>'+
  '<p>'+esc(dest)+' · Puntuación clínica: '+esc(q.score)+'/100</p>'+experience+
  (b?'<div class="case-score-grid">'+
   section('Sumaste puntos',b.earned.filter(x=>x.points>0),true)+
   section('Te descontaron',b.deductions,true)+
   section('Te faltó',b.missing)+
   section('No debías hacer',b.unnecessary)+'</div>':'')+'</div>';
}
