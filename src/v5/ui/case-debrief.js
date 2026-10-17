// Read-only outcome presentation, with the same earned/lost/missing/unnecessary
// divisions used in ATRIA 4.8.7. Source is the unique native closure receipt.
import {esc} from './clinical-panels.js';
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
 return '<div class="case-scorecard"><h3>Caso cerrado · '+esc(q.score)+'/100</h3>'+
  '<p>'+esc(dest)+' · +'+esc(closure.xp)+' XP</p>'+
  (b?'<div class="case-score-grid">'+
   section('Sumaste puntos',b.earned.filter(x=>x.points>0),true)+
   section('Te descontaron',b.deductions,true)+
   section('Te faltó',b.missing)+
   section('No debías hacer',b.unnecessary)+'</div>':'')+'</div>';
}
