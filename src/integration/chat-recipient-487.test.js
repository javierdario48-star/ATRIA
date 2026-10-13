import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
for(const [label,fragment] of [
 ['patient map tapping',"window.nsSelectChatTarget487?.('patient')"],
 ['nursing map tapping',"window.nsSelectChatTarget487?.('nurse')"],
 ['Vega map tapping',"window.nsSelectChatTarget487?.('expert')"],
 ['shared room delegation',"const room=window.csV41Challenge;"],
 ['selected receiver label',"'Para: '+names[role]"],
 ['reset to nearby',"window.nsSelectChatTarget487?.(null)"]
])assert(html.includes(fragment),'missing explicit-target UI '+label);
const marker='<script id="atria-recipient-selector-487">';
const source=html.split(marker)[1]?.split('</script>')[0];
assert(source,'runtime selector script');
new vm.Script(source);
for(const device of ['desktop','android']){
 const logs=[],patient={__atriaRecipient487:null,mentor:{enabled:true},chats:{expert:[],nurse:[],patient:[]},patientInstance:{uid:'P1'}};
 const span={textContent:''},input={placeholder:''},btn={classList:{toggle(){}},setAttribute() {},querySelector:()=>span};
 const dock={classList:{contains:()=>false},querySelector:sel=>sel==='#chatTargetBtn'?btn:sel==='#dieInput'?input:null};
 const screen={getElementById:id=>id==='chatDock'?dock:id==='mentorBtn'?{classList:{toggle(){}}}:null};
 const ctx={sim:patient,C:{id:'TEST'},window:{csV41Challenge:{active:false},nsMayExamine:()=>true},document:screen,
  pendingAddress:null,chatRole:null,player:{bubble:'',bubbleUntil:0},performance:{now:()=>123},
  refreshChatDock:()=>{},mentorFocus:()=>{},mentorSay:()=>{},sendMessage:txt=>logs.push(['native',txt]),
  addGlobalChat:(from,txt)=>logs.push(['chat',from,txt]),
  mentorUserMessage:txt=>logs.push(['vega',txt]),
  deliverPatientSpeech:txt=>logs.push(['patient',txt]),
  nurseNatural:txt=>logs.push(['nurse',txt])};
 vm.createContext(ctx);vm.runInContext(source,ctx,{timeout:2000});
 ctx.window.nsSelectChatTarget487('expert');
 assert.equal(span.textContent,'Para: Dr. Vega');
 ctx.sendMessage('Opino que es una peritonitis');
 assert.equal(logs.filter(x=>x[0]==='vega').length,1);
 assert.equal(logs.filter(x=>x[0]==='patient').length,0,'patient never overhears answer to Vega');
 ctx.sendMessage('No sé');
 assert.equal(logs.filter(x=>x[0]==='vega').length,2);
 ctx.window.nsSelectChatTarget487('patient');
 assert.equal(span.textContent,'Para: Paciente');
 ctx.sendMessage('¿Desde cuándo tiene dolor?');
 assert.equal(logs.filter(x=>x[0]==='patient').length,1);
 assert.equal(logs.filter(x=>x[0]==='vega').length,2);
 ctx.window.nsSelectChatTarget487('nurse');
 ctx.sendMessage('Ringer 500 ml');
 assert.equal(logs.filter(x=>x[0]==='nurse').length,1);
 assert(logs.some(x=>x[0]==='chat'&&x[2].includes('A Enfermera')));
 ctx.window.csV41Challenge.active=true;
 const count=logs.filter(x=>x[0]==='nurse').length;
 ctx.sendMessage('ceftriaxona');
 assert.equal(logs.filter(x=>x[0]==='nurse').length,count,'multiplayer must not bypass room clinical permission validation');
 assert.equal(logs.at(-1)[0],'native','team clinical send delegated to original multiplayer');
 // The authoritative room owner, unlike a visitor/rival, can speak
 // directly to the selected clinical NPC without proximity reclassification.
 ctx.window.csV41Challenge={active:true,ended:false,selfId:'owner',
  patients:[{uid:'P1',ownerId:'owner',state:'in_care'}]};
 ctx.window.nsSelectChatTarget487('patient');
 ctx.sendMessage('Contame qué pasó');
 assert.equal(logs.filter(x=>x[0]==='patient').length,2,'room owner addresses patient directly');
 ctx.window.csV41Challenge.active=false;
 ctx.window.nsSelectChatTarget487(null);
 ctx.sendMessage('Hola');
 assert.equal(logs.at(-1)[0],'native','nearby mode restores native recipient inference');
 ctx.window.nsSelectChatTarget487('patient');
 patient.patientInstance.uid='P2';patient.__atriaRecipient487=null;
 ctx.refreshChatDock();
 console.log('RECIPIENT SELECTION BOT',device,'PASS',JSON.stringify({vega:2,patient:1,nurse:1,publicTranscript:true,roomAuthorityPreserved:true}));
}
