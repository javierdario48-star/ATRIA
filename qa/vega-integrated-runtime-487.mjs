// Native physiology, administration, study timers and full generated Vega
// controller. Movement/DOM/arrival are fixtures; this is not a browser.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {generatedAndroidCandidate487 as html,createAndroidIntegratedRuntime487,
 installAndroidClinicalJourney487} from './android-integrated-runtime-487.mjs';
import {advanceLiveNativeJourney487 as advance} from './physiology-live/native-journey-487.mjs';
const part=(source,a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i+a.length);
 assert(i>=0&&j>i,a);return source.slice(i,j)};
const script=id=>html.split('<script id="'+id+'">')[1].split('</script>')[0];
const v412=script('cs-v412-box-vega-audio');
const algorithm=html.split('\n').find(x=>x.startsWith('const CASE_ALGORITHMS='))+'\n'+
 html.split('\n').find(x=>x.startsWith('function caseAlgorithm(){'));
const mentorIntent=part(html,'function mentorDiagnosisMatches(text){','function mentorGuideRecognition(intent){');
const language='(function(){const base={intent:mentorMessageIntent};\n'+
 part(v412,' const diminutives={',' const oldSupport=mentorStabilizationActionMatches;')+'\n})();';
const dx=part(html,'  function csSetDiagnosticImpression(','  // ---------- nurse procedures:');
export function createVegaIntegratedRuntime487(caseId,{stable=false,critical=false,iv=1,call=true}={}){
 const r=createAndroidIntegratedRuntime487(caseId,{confirmedIV:iv}),c=r.ctx;
 installAndroidClinicalJourney487(r);
 const noop=()=>{};
 Object.assign(c,{mentorBegin:noop,mentorImmediateStabilize:noop,mentorStartStabilization:noop,mentorUserMessage:noop,
  mentorTick:noop,updateExpert:noop,mentorReactToAdministration:noop,
  mentorStabilizationActionMatches:()=>false,mentorAcuity:()=>({level:'stable'}),
  csSetDiagnosticImpression:noop,csSetDisposition:c.window.csSetDisposition,
  expert:{x:0,y:0,path:[],pathIndex:0},player:{x:0,y:0},
  choose:a=>a[0],esc:x=>String(x),queueMicrotask,
  nearestPassable:()=>[0,0],TW:32,TH:32});
 c.sim.chats={expert:[],patient:[],nurse:[]};
 c.sim.mentor={enabled:true,introTimers:[]};
 c.sim.nsVegaCalled=true;c.sim.nsVegaArrived=true;
 c.sim.patientInstance.bed.patient=[0,0];c.patient.ix=0;c.patient.iy=0;
 c.sim.monitorConnected=true;c.sim.lastVitalsKnown=true;
 // The starting severity is a scenario input. Afterwards all evolution and
 // clinical consequences come from the real native engine.
 if(stable){
  c.C.vitals={...c.C.vitals,bp:'118/76',hr:82,rr:16,spo2:98,temp:36.8};
  c.sim.liveVitals={hr:82,sys:118,dia:76,rr:16,spo2:98,temp:36.8};
 }
 if(critical){
  c.C.vitals={...c.C.vitals,bp:'60/35',hr:140,rr:30,spo2:78,temp:38.5};
  c.sim.liveVitals={hr:140,sys:60,dia:35,rr:30,spo2:78,temp:38.5};
 }
 vm.runInContext(algorithm+'\n'+mentorIntent+'\n'+language+'\n'+dx,c);
 c.window.csCallVega=()=>{c.sim.nsVegaCalled=true;c.sim.nsVegaArrived=true;return true;};
 vm.runInContext(script('ns422-vega-rescue'),c,{timeout:4000});
 r.call=()=>c.window.csCallVega();
 if(call)r.call();
 r.tick=()=>c.window.nsVegaBackgroundTick();
 r.advance=seconds=>advance(r,seconds,{dt:1/6});
 r.reply=text=>c.mentorUserMessage(text);
 r.order=id=>{const study=c.C.studies.find(x=>x.id===id);assert(study,id);return c.orderStudy(study,true,'Jugador');};
 return r;
}
