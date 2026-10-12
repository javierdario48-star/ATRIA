/* QA ONLY: generated source in actual script order, including previously omitted
 * V412 nurse/send reassignment and ns422 experience policy. Local native nurse
 * actor/path/DOM surfaces are fixtures; this is not a browser or Android test. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {apply487} from '../src/integration/apply-487.js';
import {liveNativeJourneySources487} from './physiology-live/native-journey-487.mjs';
import {createNativeReferenceRuntime487} from './physiology-pilot/native-reference-487.mjs';

export const generatedAndroidCandidate487=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const html=generatedAndroidCandidate487;
const script=id=>{
 const marker='<script id="'+id+'">';assert.equal(html.split(marker).length,2,id);
 return html.split(marker)[1].split('</script>')[0];
};
const between=(source,a,b)=>{
 const i=source.indexOf(a),j=source.indexOf(b,i+a.length);
 assert(i>=0&&j>i,a);return source.slice(i,j);
};
const v412=script('cs-v412-box-vega-audio');
const lateNursing=[
 '(function(){const base={natural:nurseNatural,send:sendMessage};',
 'const nurseFor=()=>nurse,withNurse=(actor,fn)=>fn(),roomToken=()=>"local-QA";',
 'const mayTreat=(target=sim)=>!!target&&!target.caseEnded&&!target.patientDied&&window.nsMayExamine?.()!==false;',
 between(v412,' const diminutives={',' mentorMessageIntent=function('),
 between(v412,' nurseNatural=function(text){',' processCommand=function('),
 between(v412,' sendMessage=function(text){',' window.csLanguageV412='),
 '})();'
].join('\n');
const v19=script('cs-safe-v0190');
const score=between(v19,'  // ============================================================\n  // 7) SCORE V2','  function csDebriefMoments(){');
const finish=between(html,"finishCase=function(reason='completed'){",'\nfunction csHasTherapy(id){');
const completed=liveNativeJourneySources487.compiled.map(x=>[x.id,x.id==='cs-safe-v0190-clinical'?
 x.code.slice(0,-7)+'\nwindow.qaEnsureV19=csEnsureV19;window.qaLogAction=csLogAction;\n})();':x.code]);
const v19Index=completed.findIndex(([id])=>id==='cs-safe-v0190-clinical');
completed.splice(v19Index+1,0,['cs-safe-v0190-score',score]);
// Install the genuine finalizer before the adapters that wrap finishCase.
completed.splice(v19Index+1,0,['cs-safe-v0180-finish',finish]);
const recognition=completed.findIndex(([id])=>id==='cs-v412-monitor-recognition');
completed.splice(recognition+1,0,['cs-v412-nurse-dispatch',lateNursing]);
const state=completed.findIndex(([id])=>id==='ns421-clinical-state');
completed.splice(state+1,0,['ns422-experience-policy',script('ns422-experience-policy')]);
const compiled=completed.map(([id,code])=>({id,code,compiled:new vm.Script(code,{filename:'android-generated-qa/'+id+'.js'})}));
const nativeProfileCode=[
 ...['const CS_PROFILE_KEY=','const CS_XP_PER_LEVEL=','function csSaveProfile(){',
  'function csLevel(','function csLevelProgress(){','function csLoadProfile(){']
  .map(prefix=>html.split('\n').find(line=>line.startsWith(prefix))),
 between(html,'function csDefaultProfile(){','function csLoadProfile(){'),
 between(html,'function csRefreshProfileSurfaces(){','function csEnsureSelectorCareer(){')
].join('\n');
const nativeHUDCode='(function(){const menu={querySelector:()=>({disabled:false})};\n'+
 between(html,' let previousXP=null,gainUntil=0;',' function close(){menu.classList.remove')+
 between(html,' const oldProfile=csRefreshProfileSurfaces;csRefreshProfileSurfaces=function(){',' const oldHud=updateHud;')+'\n})();';
const launch=script('ns420-launch');
const practiceCode='(function(){\n'+launch.split('\n').find(x=>x.startsWith(' const organs='))+'\n'+
 launch.split('\n').find(x=>x.startsWith(' function normalize(x={}'))+'\n'+
 'let active=null,selection={};\n'+launch.split('\n').find(x=>x.startsWith(' window.nsPracticeReward='))+'\n'+
 'window.qaSelectPractice487=id=>{const organ=Object.keys(organs).find(k=>organs[k].ids.includes(id));selection=normalize({area:"gastro",organ,pathology:id});return selection;};\n})();';
const complexityCode=between(html,' window.nsCaseComplexity=function(c=C){',' const oldFinish=csFinishHTML;csFinishHTML=function(score,b,career){');

export function createAndroidIntegratedRuntime487(caseId='PERI-SEC-001',{confirmedIV=0,mode='solo'}={}){
 const r=createNativeReferenceRuntime487({caseId,sources:{...liveNativeJourneySources487,compiled}});
 const {ctx}=r,noop=()=>{};
 Object.assign(ctx,{nurse:{task:null,queue:[],path:[],pathIndex:0,state:'idle',returnTile:[8,14]},
  wardNurses:[],player:{bubble:'',bubbleUntil:0},chatRole:'nurse',pendingAddress:null,
  pathTo:()=>false,advanceActor:()=>true,toast:noop,csPlaySound:noop,
  formatVitalsInline:()=>'',csRefreshProfileSurfaces:noop,csCheckCoatUnlock:()=>false,
  csLevel:()=>Math.floor((ctx.csProfile.xp||0)/200)+1,csFinishHTML:()=>'',csShowOutcome:noop,
  csCloseOutcome:noop,csReturnToCases:noop,csSaveProfile:noop,
  csEnsureV19:ctx.window.qaEnsureV19,csLogAction:ctx.window.qaLogAction});
 ctx.window.nsMayExamine=()=>true;
 vm.runInContext(practiceCode,ctx);vm.runInContext(complexityCode,ctx);
 ctx.sim.nsPractice=ctx.window.qaSelectPractice487(caseId);
 ctx.selectedPlayMode=mode;
 Object.assign(ctx.csProfile,{xp:0,totalPatients:0,soloPatients:0,apprenticePatients:0,shiftPatients:0,
  resolvedPatients:0,safePatients:0,criticalSafePatients:0,recentScores:[],reputation:50,
  streak:0,bestStreak:0,bestScore:0});
 ctx.sim.playMode=mode;
 ctx.sim.patientInstance.bed={approach:[24,17],label:'local QA box'};
 ctx.sim.venousAccessCount=confirmedIV;
 ctx.sim.venousAccessTypes=Array(confirmedIV).fill('confirmed fixture peripheral IV');
 ctx.sim.chats||={nurse:[]};
 ctx.sim.consults||=new Map();
 ctx.refreshChatDock=noop;
 // This fixture excludes the universal study transport; retain the current
 // case's real study catalogue for V412 matching, without fabricated results.
 ctx.csStudyCatalog=()=>ctx.C.studies;
 ctx.findStudy=()=>null;
 ctx.document.createElement=()=>({style:{},appendChild:noop,classList:{add:noop},onclick:null,textContent:''});
 r.elements=[];
 ctx.document.body.appendChild=element=>r.elements.push(element);
 r.persistedProfiles=[];
 r.messages=[];
 ctx.addGlobalChat=(role,text)=>r.messages.push({role,text});
 const storage=new Map();
 ctx.crypto=webcrypto;
 ctx.localStorage={getItem:key=>storage.get(key)||null,
  setItem:(key,value)=>{storage.set(key,value);r.persistedProfiles.push(JSON.parse(value));}};
 r.hud=Object.fromEntries(['profileBtn','nsPlayerName','nsPlayerLevel','nsXPText','nsXPFill','nsXPBar','nsXPGain','nsMenuMode'].map(id=>{
  const attrs=new Map();return [id,{textContent:'',style:{},classList:{toggle:noop},
   getAttribute:k=>attrs.get(k),setAttribute:(k,v)=>attrs.set(k,v)}];
 }));
 ctx.document.getElementById=id=>r.hud[id]||null;
 ctx.csEscape=x=>String(x||'');
 vm.runInContext(nativeProfileCode,ctx,{filename:'android-generated-qa/native-profile.js'});
 vm.runInContext(nativeHUDCode,ctx,{filename:'android-generated-qa/native-hud.js'});
 ctx.window.nsRefreshPlayerHUD();
 return r;
}

// Expand one journey with actual native interview, physical examination and
// study collection/timers. UI rendering/pathfinding remain fixture surfaces.
export function installAndroidClinicalJourney487(r){
 const {ctx}=r,exam=script('ns421-clinical-exam');
 ctx.renderContent=()=>{};ctx.showFloatCard=()=>{};
 vm.runInContext(html.split('\n').find(x=>x.startsWith('function recordVitals(source){')),ctx);
 vm.runInContext(html.split('\n').find(x=>x.startsWith('const csStudyTiming=')),ctx);
 vm.runInContext(between(html,'function chatNorm(s){','function patientInHearingRange(){'),ctx);
 vm.runInContext(between(html,'function csStudyDurationMs(s){','function csNormalStudyResult('),ctx);
 vm.runInContext(html.split('\n').find(x=>x.startsWith("function orderStudy(s,quiet=false,requestedBy='Jugador'){")),ctx);
 vm.runInContext(between(exam,'(function(){',' const oldExam=performExamRegion;')+'\n})();',ctx);
}
