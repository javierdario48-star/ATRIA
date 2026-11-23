// Read-only adaptation of ATRIA 4.8.7 guardScoreModel487.
// XP is taken solely from confirmed per-guard clinical receipts; this UI
// neither grades care nor mutates progression, including multiplayer.
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export function guardScoreModelV5({mode='solo',patient=null,players=[],outcomes=[],penalties=[],ownerId=null}={}){
 if(!['solo','apprentice','coop','competitive'].includes(mode))return null;
 if(mode==='competitive'){
  // This model is wired only after the real competitive room exists.
  const entries=players.slice(0,4).map((p,index)=>{
   const mine=outcomes.filter(o=>o.ownerId===p.id&&o.closed===true);
   const gross=mine.reduce((n,o)=>n+Math.max(0,Number(o.xp)||0),0);
   const loss=penalties.filter(row=>row.actorId===p.id).reduce((n,row)=>n+Math.max(0,Number(row.loss)||0),0);
   return {id:p.id,name:String(p.name||'Médico').slice(0,32),
    resolved:mine.filter(o=>o.survived&&o.score>0).length,
    xp:gross-loss,...(loss?{grossXP:gross,penaltyXP:loss}:{}),
    ...(mine.some(o=>o.creditStatus==='pending')?{xpPending:true}:{}),
    points:mine.reduce((n,o)=>n+(Number(o.points)||0),0),index};
  });
  const sorted=[...entries].sort((a,b)=>b.points-a.points||b.resolved-a.resolved||a.index-b.index);
  const leader=sorted.length&&sorted[0].points>0&&
   (sorted.length===1||sorted[0].points!==sorted[1].points||sorted[0].resolved!==sorted[1].resolved)
    ?sorted[0].id:null;
  return {mode,ownerId,players:entries.map(p=>({...p,leader:p.id===leader,owner:p.id===ownerId}))};
 }
 // V5 currently instantiates one clinical patient per independent guard.
 // A cooperative closure is counted ONCE for the team, never multiplied by players.
 const closure=patient?.closure;
 const completed=!!closure?.closed&&!!patient?.caseEnded&&!patient?.patientDied;
 const settled=new Map();
 for(const outcome of outcomes)if(outcome?.closed&&outcome.patientUid)
  settled.set(outcome.patientUid,outcome);
 if(completed&&patient.uid&&!settled.has(patient.uid))
  settled.set(patient.uid,{closed:true,survived:true,score:closure.quality?.score,xp:closure.xp});
 const done=[...settled.values()];
 const gross=done.reduce((n,x)=>n+Math.max(0,Number(x.xp)||0),0);
 const loss=penalties.reduce((n,row)=>n+Math.max(0,Number(row.loss)||0),0);
 return {mode:mode==='apprentice'?'solo':mode,
  resolved:done.filter(x=>x.survived&&Number(x.score)>0).length,
  xp:gross-loss,...(loss?{grossXP:gross,penaltyXP:loss}:{}),
  ...(done.some(x=>x.creditStatus==='pending')?{xpPending:true}:{})};
}
export function guardScoreboardHTML(model){
 if(!model)return '';
 if(model.mode==='competitive')return '<div class="guard-score-title">GUARDIA COMPETITIVA</div>'+
  '<div class="guard-score-owner">'+(model.ownerId?'Paciente a cargo de '+esc(model.players.find(p=>p.owner)?.name||'médico conectado'):'Paciente disponible · primer contacto')+'</div>'+
  '<div class="guard-score-players">'+model.players.map(p=>
   '<div class="guard-score-player'+(p.leader?' leader':'')+'"><b>'+
    (p.leader?'✦ ':'')+esc(p.name)+'</b><span>Casos '+p.resolved+' · EXP '+(p.xpPending?'pendiente':(p.xp>0?'+':'')+p.xp)+'</span>'+
    (p.penaltyXP?'<span class="guard-score-loss">Sanciones −'+p.penaltyXP+' XP</span>':'')+
    '</div>').join('')+'</div>';
 return '<div class="guard-score-title">'+(model.mode==='coop'?'EQUIPO · GUARDIA ACTUAL':'GUARDIA ACTUAL')+'</div>'+
  '<div class="guard-score-metrics"><div>Casos resueltos <b>'+model.resolved+'</b></div>'+
  '<i aria-hidden="true"></i><div>EXP neta <b>'+(model.xpPending?'pendiente':(model.xp>0?'+':'')+model.xp)+'</b></div></div>'+
  (model.penaltyXP?'<div class="guard-score-breakdown">Ganado +'+model.grossXP+
   ' · <span class="guard-score-loss">Sanciones −'+model.penaltyXP+' XP</span></div>':'');
}
