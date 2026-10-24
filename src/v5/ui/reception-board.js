// Reception only reads confirmed admission and clinical triage state.
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[x]));
export function receptionBoardHTML(shift,cases=[],selfId=null){
 if(!shift)return '<h2>Recepción</h2><p>Sin guardia activa.</p>';
 const lookup=new Map(cases.map(c=>[c.id,c]));
 const remaining=Math.ceil(shift.remainingSeconds??0);
 const items=(shift.patients||[]).map(p=>{
  const c=lookup.get(p.caseId),triage=p.triage||{state:'unknown',label:'SIN DATOS'};
  const owner=p.ownerId?(p.ownerId===selfId?'A tu cargo':'A cargo de otro médico'):'Sin asignar';
  return '<div class="reception-patient" data-acuity="'+esc(triage.state)+'" data-patient-uid="'+esc(p.uid)+'">'+
   '<span class="reception-priority">'+esc(triage.label)+'</span>'+
   '<div><strong>'+esc(p.bedId)+' · '+esc(c?.demo||'Paciente')+'</strong>'+
   '<small>'+esc(c?.chief||c?.selector||'Consulta clínica')+'</small>'+
   '<small>'+esc(p.closed?'Atención cerrada':owner)+' · Ingreso min '+Math.floor((p.arrivalAt||0)/60)+'</small></div>'+
   '<button type="button" data-action="reception-approach" data-patient-uid="'+esc(p.uid)+'" '+(p.closed?'disabled':'')+'>Ir al box</button></div>';
 }).join('');
 return '<h2>Recepción · Guardia '+esc(shift.mode)+'</h2><p>'+
  (shift.ended?'Jornada finalizada.':'24 min reales = 24 horas del hospital')+
  ' · Tiempo restante: '+String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0')+'</p>'+
  '<p class="note">Triaje de ingreso; el monitor conectado indica mediciones posteriores.</p>'+
  '<div class="reception-list">'+(items||'<p>Sin pacientes ingresados.</p>')+'</div>'+
  '<div class="actions"><button data-action="close">Volver a la guardia</button></div>';
}
