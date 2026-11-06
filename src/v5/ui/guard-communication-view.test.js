import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardChannelView,guardActivityRows,guardTurnDialogHTML} from './guard-communication-view.js';

const team=id=>({id,text:'Yo me encargo del ECG',name:'Ana',actorId:'a',role:'player'});
const activity=id=>({id,text:'Hemocultivos solicitados',name:'Enfermera',actorName:'Ana',role:'nurse',patientName:'Luz Pérez',bedId:'B2',patientUid:'p2'});
test('team and activity are separate histories with discreet unread counts and preserved seen IDs after recovery',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const c=createGuardChannelView({storage});
 const update=rows=>c.update({roomId:'r',actorId:'b',communication:{channelAvailable:true,team:rows,activity:[]}});
 update([team('old')]);assert.equal(c.state().unread.team,0,'restored history is not a burst of new messages');
 update([team('old'),team('new')]);assert.equal(c.state().unread.team,1);
 assert.equal(c.select('team'),true);update([team('old'),team('new')]);
 assert.equal(c.state().unread.team,0);
 c.select('clinical');update([team('old'),team('new'),team('later')]);
 const recovered=createGuardChannelView({storage});
 recovered.update({roomId:'r',actorId:'b',communication:{channelAvailable:true,team:[team('old'),team('new'),team('later')],activity:[]}});
 assert.equal(recovered.state().unread.team,1);
 recovered.update({roomId:'other',actorId:'b',communication:{channelAvailable:false,activity:[]}});
 assert.equal(recovered.select('team'),false);assert.equal(recovered.state().active,'clinical');
});
test('each shared clinical row names its patient and author and preserves its stable source identity',()=>{
 const rows=guardActivityRows([activity('source')]);
 assert.match(rows[0].name,/Ana/);assert.match(rows[0].name,/B2/);assert.match(rows[0].name,/Luz Pérez/);
 assert.equal(rows[0].id,'source');assert.equal(rows[0].text,'Hemocultivos solicitados');
});
test('turn completion offers explicit continuation and saving, and a cooperative vote cannot impersonate consensus',()=>{
 const turn={id:'r:turn-1',number:1,status:'decision',canContinue:true,canLeave:true,canResume:false,
  actor:{participating:true,continued:false},requiredIds:['a','b'],continuedIds:[]};
 const html=guardTurnDialogHTML(turn,{mode:'coop'});
 assert.match(html,/Guardia finalizada/);assert.match(html,/Completaste tu turno\. Tu progreso está guardado\./);
 assert.match(html,/Continuar otra guardia — 24 minutos/);assert.match(html,/Guardar y salir/);
 const waiting=guardTurnDialogHTML({...turn,canContinue:false,continuedIds:['a'],actor:{participating:true,continued:true}},{mode:'coop'});
 assert.match(waiting,/Esperando/);assert.match(waiting,/disabled/);
 assert.match(guardTurnDialogHTML({...turn,status:'paused',canContinue:false,canLeave:false,canResume:true}),/data-action="resume-shift"/);
});
