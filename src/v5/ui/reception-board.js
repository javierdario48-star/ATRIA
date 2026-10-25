// Reception only reads confirmed admission and clinical triage state.
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[x]));
export function receptionBoardHTML(shift,cases=[],selfId=null){
 if(!shift)return '<h2>Recepción</h2><p>Sin guardia activa.</p>';
 const lookup=new Map(cases.map(c=>[c.id,c]));
 const remaining=Math.ceil(shift.remainingSeconds??0);
 const records=shift.patients||[];
 const active=records.filter(p=>!p.closed&&!p.departed&&!p.patientDied);
 const finished=records.filter(p=>p.closed||p.departed||p.patientDied);
 const names={quirofano:'Quirófano',uti:'UTI',procedimiento:'Procedimientos',
  sala:'Sala',observacion:'Observación',alta:'Alta'};
 const render=p=>{
  const c=lookup.get(p.caseId),triage=p.triage||{state:'unknown',label:'SIN DATOS'};
  const owner=p.ownerId?(p.ownerId===selfId?'A tu cargo':'A cargo de otro médico'):'Sin asignar';
  const occupied=shift.mode==='competitive'&&!!p.ownerId&&p.ownerId!==selfId;
  const unavailable=p.closed||p.departed||p.patientDied;
  const action=shift.mode==='competitive'?(occupied?'Ocupado':p.ownerId?'Volver a mi box':'Atender y asignarme'):'Ir al box';
  return '<div class="reception-patient" data-acuity="'+esc(triage.state)+'" data-patient-uid="'+esc(p.uid)+'">'+
   '<span class="reception-priority">'+esc(triage.label)+'</span>'+
   '<div><strong>'+esc(p.bedId)+' · '+esc(c?.demo||'Paciente')+'</strong>'+
   '<small>'+esc(c?.chief||c?.selector||'Consulta clínica')+'</small>'+
   '<small>'+esc(p.closed?(p.departed?'Derivado a '+(names[p.destination]||'otro servicio')+' · Box liberado':'Atención cerrada'):
    p.patientDied?'Paciente fallecido':owner)+' · Ingreso min '+Math.floor((p.arrivalAt||0)/60)+'</small></div>'+
   '<button type="button" data-action="reception-approach" data-patient-uid="'+esc(p.uid)+'" '+(unavailable||occupied?'disabled':'')+'>'+action+'</button></div>';
 };
 const items='<h3>Pacientes en atención · '+active.length+'</h3>'+
  (active.map(render).join('')||'<p>Sin pacientes pendientes en este momento.</p>')+
  '<h3>Atenciones finalizadas · '+finished.length+'</h3>'+finished.map(render).join('');
 return '<h2>Recepción · Guardia '+esc(shift.mode)+'</h2><p>'+
  (shift.ended?'Jornada finalizada.':'24 min reales = 24 horas del hospital')+
  ' · Tiempo restante: '+String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0')+'</p>'+
  '<p class="note">Triaje de ingreso; el monitor conectado indica mediciones posteriores.</p>'+
  '<div class="reception-list">'+items+'</div>'+
  '<div class="actions"><button data-action="close">Volver a la guardia</button></div>';
}
