/** QA source-backed model + VM runtime for the guard scorecard. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../src/integration/apply-487.js';
import {guardScoreModel487} from '../src/integration/guard-scoreboard-487.js';
const patients=[
 {ownerId:'a',state:'done',result:{safe:true,points:195}},
 {ownerId:'a',state:'done',result:{safe:false,points:0}},
 {ownerId:'b',state:'done',result:{safe:true,points:180}},
 {ownerId:'c',state:'done',result:{safe:true,points:140}},
 {ownerId:'d',state:'in_care',result:null}
];
const players=[
 {id:'a',name:'Doctor A',xpGuard487:90},
 {id:'b',name:'Doctor B',xpGuard487:210},
 {id:'c',name:'Doctor C',xpGuard487:70},
 {id:'d',name:'Doctor D',xpGuard487:0}
];
const co=guardScoreModel487({mode:'coop',players,patients});
assert.deepEqual({resolved:co.resolved,xp:co.xp},{resolved:3,xp:370},
 'cooperative totals are shared safe cases and REAL guard XP, not points');
const solo=guardScoreModel487({mode:'solo',solo:{resolved:2,xp:-50}});
assert.equal(solo.resolved,2);assert.equal(solo.xp,-50,'actual XP penalties are signed');
const multi=guardScoreModel487({mode:'competitive',players,patients});
assert.equal(multi.players.length,4);
assert.deepEqual(multi.players.map(p=>p.resolved),[1,1,1,0]);
assert.deepEqual(multi.players.map(p=>p.xp),[90,210,70,0]);
assert.deepEqual(multi.players.map(p=>p.leader),[true,false,false,false],
 'leader respects certified competitive points rather than arbitrary XP totals');
for(const size of [2,3,4])assert.equal(guardScoreModel487({
 mode:'competitive',players:players.slice(0,size),patients}).players.length,size);
const tied=guardScoreModel487({mode:'competitive',players:[{id:'a',name:'A'},{id:'b',name:'B'}],patients:[]});
assert.equal(tied.players.filter(p=>p.leader).length,0,'no false leader on initial zero tie');
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
assert.equal(html.split('<style id="atria-guard-scoreboard-style-487">').length,2,'single score CSS');
// Native #nsWardNotice starts at 64px, with at least 40px occupied height.
// The centered score must begin strictly below it, including coop/VS layouts.
const style=html.split('<style id="atria-guard-scoreboard-style-487">')[1].split('</style>')[0];
assert(style.includes('top:calc(112px + env(safe-area-inset-top))'),
 'solo score clears bedside notice and preserves safe-area inset');
assert(style.includes('top:calc(116px + env(safe-area-inset-top))'),
 'team and competitive score also clear bedside notice');
assert(style.includes('left:50%;transform:translateX(-50%)'),
 'score remains centered on both desktop and mobile');
assert.equal(html.split('<script id="atria-guard-scoreboard-runtime-487">').length,2,'single runtime');
assert(html.includes("recordGuardXP487('case:'+p.uid,sim.__csSharedCareer?.xpDelta)"),
 'score comes from the confirmed actual native XP award');
assert(html.includes("recordGuardXP487('assist:'+p.uid,xp)"),
 'awarded help XP is included');
assert(html.includes("if(m.kind==='score_xp')"),
 'host accepts authenticated player XP messages');
assert(html.includes("xpGuard487:challenge.players.find"),
 'room roster refresh preserves player earnings');
assert(html.includes('guardXP487=0;guardXPReceipts487.clear()'),
 'new room resets earned XP');
assert(html.includes('if(!same){guardXP487=0;guardXPReceipts487.clear()}'),
 'joiner resets earnings on room change');
const source=html.split('<script id="atria-guard-scoreboard-runtime-487">')[1].split('</script>')[0];
new vm.Script(source,{filename:'atria-scoreboard-generated.js'});
const el=()=>({dataset:{},innerHTML:'',setAttribute(){},style:{}});
const box={current:null,classes:new Set(),classList:{contains(x){return box.classes.has(x)}},appendChild(e){box.current=e}};
const document={body:box,createElement:el};
const tasks=[];
const window={setInterval:fn=>tasks.push(fn),nsRegisterOutcome(target){window.nsLastOutcome=target},
 csV41Challenge:null};
const ctx={document,window,sim:{playMode:'solo'},shiftSession:null,Math,JSON,Number,WeakSet};
vm.createContext(ctx);new vm.Script(source).runInContext(ctx);
const scoreboard=window.atriaGuardScore487;
assert(scoreboard&&tasks.length===1,'one efficient 500ms guard update');
let dom=box.current;
assert.equal(dom.dataset.mode,'solo');assert.match(dom.innerHTML,/CASOS RESUELTOS/);
assert.match(dom.innerHTML,/EXP EN ESTA GUARDIA/);
assert.match(dom.innerHTML,/>00</);
const case1={playMode:'solo',__nsCareerReceipt:{resolved:true,xpDelta:115}};
ctx.sim=case1;window.nsRegisterOutcome(case1,'CIRR-001');
dom=box.current;
assert.equal(scoreboard.model().resolved,1);assert.equal(scoreboard.model().xp,115);
window.nsRegisterOutcome(case1,'CIRR-001');
assert.equal(scoreboard.model().xp,115,'duplicate completion must never grant visual XP twice');
const case2={playMode:'solo',__nsCareerReceipt:{resolved:false,xpDelta:-25}};
ctx.shiftSession={active:true};ctx.sim=case2;scoreboard.render();
window.nsRegisterOutcome(case2,'PERI-SEC-001');
assert.equal(scoreboard.model().resolved,0,'unsafe patient is not counted as successfully resolved');
assert.equal(scoreboard.model().xp,-25,'guard XP includes actual signed losses');
const case3={playMode:'solo',__nsCareerReceipt:{resolved:true,xpDelta:38}};
ctx.sim=case3;window.nsRegisterOutcome(case3,'APP-001');
assert.deepEqual({cases:scoreboard.model().resolved,xp:scoreboard.model().xp},{cases:1,xp:13},
 'continuous shift retains case and XP across different patient instances');
box.classes.add('selectorMode');scoreboard.render();
assert.equal(dom.dataset.visible,'0','hides on case selector');
box.classes.delete('selectorMode');
ctx.shiftSession=null;ctx.sim={playMode:'solo'};scoreboard.render();
assert.equal(scoreboard.model().xp,0,'fresh solo guard starts from zero');
ctx.sim={playMode:'apprentice'};scoreboard.render();
assert.equal(dom.dataset.visible,'0','apprentice mode not changed by request');
ctx.sim={playMode:'solo'};
window.csV41Challenge={mode:'competitive',active:true,players:[{id:'a',name:'<script>alert(1)</script>',xpGuard487:200},...players.slice(1)],
 patients};
scoreboard.render();
assert.equal(dom.dataset.mode,'competitive');assert.equal(dom.dataset.count,'4');
assert.match(dom.innerHTML,/&lt;script&gt;/,'player names HTML escaped');
assert(!dom.innerHTML.includes('<script>alert(1)</script>'),'no HTML injection from nickname');
assert.match(dom.innerHTML,/GUARDIA COMPETITIVA/);
assert.match(dom.innerHTML,/ags-leading/);
window.csV41Challenge.mode='coop';scoreboard.render();
assert.equal(dom.dataset.mode,'coop');assert.match(dom.innerHTML,/EQUIPO/);
assert.match(dom.innerHTML,/>\+480</,'team XP aggregates reported player credits');
window.csV41Challenge.active=false;box.classes.add('nsLobbyMode');scoreboard.render();
assert.equal(dom.dataset.visible,'0','lobby always hides guard UI');
box.classes.delete('nsLobbyMode');
ctx.sim={playMode:'solo'};scoreboard.render();
assert.equal(scoreboard.model().xp,0,'return from room cannot leak previous guard earnings');
// Execute the actual integrated native XP ledger in its lexical scope.
const p=html.indexOf('function recordGuardXP487('),q=html.indexOf('\n function ',p+1);
assert(p>0&&q>p,'native ledger extracted');
const log=[];
const state={challenge:{mode:'coop',id:'room-x',active:true,players:[{id:'host'}],revision:1},
 selfId:'host',guardXP487:0,guardXPReceipts487:new Set(),
 shared:()=>true,host:()=>true,publish:()=>log.push('published'),
 send:(kind,body)=>log.push({kind,body})};
vm.createContext(state);new vm.Script(html.slice(p,q)).runInContext(state);
state.recordGuardXP487('case:p1',110);state.recordGuardXP487('case:p1',110);
state.recordGuardXP487('assist:p2',22);
assert.equal(state.guardXP487,132);
assert.equal(state.challenge.players[0].xpGuard487,132);
assert.equal(log.length,2,'idempotent owner XP publication');
state.recordGuardXP487('bad',999999);
assert.equal(state.guardXP487,132,'reject absurd untrusted XP receipts');
state.host=()=>false;
state.recordGuardXP487('case:p3',-40);
assert.equal(JSON.stringify(log.at(-1)),JSON.stringify({kind:'score_xp',body:{xp:92}}),
 'guest reports genuine cumulative signed total to host');
console.log('ATRIA AESTHETIC FOUR-MODE SCOREBOARD BOT PASS',JSON.stringify({
 scenarios:['solo','coop','competitive','apprentice-hidden','2–4-player','lobby-reset'],
 clinicalCases:13,realXPNotPoints:true,transcriptDuplicatesRejected:true,
 safeNicknames:true,hostGuestXPRelay:true,css:true,jsSyntax:true,
 browser:false,network:false
}));
