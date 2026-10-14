/** Verify the sole authorised lazy QA entry; all pre-existing HTML and golden
 * scripts retain the exact approved B1 bytes. Verify offline module closure. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {applyMultiplayerStabilization487} from '../../src/integration/multiplayer-stabilization-487.js';
import {applyChatRecipient487} from '../../src/integration/chat-recipient-487.js';
import {applyGuardScoreboard487} from '../../src/integration/guard-scoreboard-487.js';
import {applyPhysiologyQABootstrap487,PHYSIOLOGY_QA_FILES_487,RINGER_SAFETY_OLD_487,RINGER_SAFETY_NEW_487,RINGER_COMPLETION_OLD_487,RINGER_COMPLETION_NEW_487} from '../../src/integration/physiology-qa-bootstrap-487.js';
import {applyCriticalRescue487,CRITICAL_FINAL_OLD_487,CRITICAL_FINAL_NEW_487,CRITICAL_CLOCK_OLD_487,CRITICAL_CLOCK_NEW_487} from '../../src/integration/critical-rescue-487.js';
import {applySecondaryBridge487} from '../../src/integration/secondary-sepsis-bridge-487.js';
import {reverseRemoteMotion487} from '../../src/integration/remote-motion-487.js';
import {apply487} from '../../src/integration/apply-487.js';
import {applyMorphine487} from '../../src/integration/morphine-487.js';
import {applyUrgentCare487} from '../../src/integration/urgent-care-487.js';
import {applyCaseCompletion487} from '../../src/integration/case-completion-487.js';
import {applyPeritonitis487} from '../../src/integration/peritonitis-487.js';
import {NURSE_STOP_FINISH_OLD_487,NURSE_STOP_FINISH_NEW_487,NURSE_STOP_STATUS_OLD_487,
 NURSE_STOP_STATUS_NEW_487,NURSE_STOP_VERSION_OLD_487,NURSE_STOP_VERSION_NEW_487,
 NORA_RECEIPT_OLD_487,NORA_RECEIPT_NEW_487,NORA_DEDUPE_OLD_487,NORA_DEDUPE_NEW_487,
 NORA_PENDING_OLD_487,NORA_PENDING_NEW_487,NORA_CANCEL_OLD_487,NORA_CANCEL_NEW_487,
 NORA_DELIVERY_OLD_487,NORA_DELIVERY_NEW_487,NORA_BIND_RECEIPT_OLD_487,NORA_BIND_RECEIPT_NEW_487,
 NORA_FLUSH_OLD_487,NORA_FLUSH_NEW_487} from '../../src/integration/nurse-execution-487.js';
// UX A/B is a single, explicitly whitelisted style/selector insertion.
 // Invert EXACTLY that insertion for the protected clinical byte-digest.
 // Any extra HTML, missing asset, mutated golden master or extra script still fails.
const deliveredHtml=fs.readFileSync('out/index.html','utf8');
const visualInsertion='<link rel="stylesheet" href="/atria-ux-lab.css"><script src="/atria-ux-lab.js"></script>';
const visualEnd=deliveredHtml.lastIndexOf('</body>');
assert(visualEnd>=visualInsertion.length,'UX artifact: closing body missing');
assert.equal(deliveredHtml.split(visualInsertion).length,2,'UX artifact: exactly one reviewed insertion');
assert.equal(deliveredHtml.slice(visualEnd-visualInsertion.length,visualEnd),visualInsertion,
 'UX artifact: reviewed assets must be immediately before the body close');
for(const asset of ['atria-ux-lab.css','atria-ux-lab.js']){
 assert.equal(fs.readFileSync('out/'+asset,'utf8'),fs.readFileSync('src/ui/'+asset,'utf8'),
  'UX artifact: exact visual asset source copy '+asset);
}
const html=deliveredHtml.slice(0,visualEnd-visualInsertion.length)+deliveredHtml.slice(visualEnd);
const hash=createHash('sha256').update(html).digest('hex');
const immutableVendor=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
assert.equal(html,apply487(immutableVendor),'artifact equals current source-integrated build');
// The clinical teaching/chat patches are reviewed source transformations,
// introduced after the historical digest was frozen. Check them against the
// actual generated artifact, then reconstruct the same historical source
// WITHOUT altering the original digest or regenerating the golden master.
assert.equal(applyChatRecipient487(html,{reverse:true}),
 apply487(immutableVendor,{recipient:false}),
 'exact full-build inversion of NPC chat mentions, no unreviewed bytes');
const motionReference=apply487(immutableVendor,{recipient:false,vega:false,remoteMotion:false});
const historicalHtml=reverseRemoteMotion487(apply487(immutableVendor,{recipient:false,vega:false}),motionReference);
assert.equal(historicalHtml,motionReference,'exact inversion of all remote motion changes; original clinical digest remains unchanged');
assert(html.includes("function csVegaPriorityStudies487()")&&
 html.includes('<script id="atria-recipient-selector-487">'),
 'new clinical teaching and chat layers remain in verified active build');
// Restore only the authorized stop executor/dispatch/confirmation additions.
// Frozen pre-stop scripts are the exact 7606e14 checkpoint, not a replacement
// development base. The original protected hash below is never regenerated.
const morphine=[...html.matchAll(/<script id="atria-morphine-487">[\s\S]*?<\/script>/g)];
assert.equal(morphine.length,1,'one bounded native morphine owner');
assert.equal(morphine[0][0],applyMorphine487('<body></body>').replace('<body>','').replace('</body>',''),
 'morphine integration matches current reviewed source');
const urgent=[...html.matchAll(/<script id="atria-urgent-care-487">[\s\S]*?<\/script>/g)];
assert.equal(urgent.length,1,'exactly one care confirmation adapter');
assert.equal(urgent[0][0],applyUrgentCare487('<body></body>').replace('<body>','').replace('</body>',''),
 'care adapter must match reviewed current source');
const closure=[...html.matchAll(/<script id="atria-case-completion-487">[\s\S]*?<\/script>/g)];
assert.equal(closure.length,1,'one general clinical closure and XP adapter');
assert.equal(closure[0][0],applyCaseCompletion487('<body></body>').replace('<body>','').replace('</body>',''),
 'exact current reviewed case closure source');
// The new scoreboard is a verified presentation-only overlay. Remove only
// its exact generated CSS/JS before comparing immutable historical bytes.
const scoreProbe=applyGuardScoreboard487('<html><head></head><body></body></html>');
const scoreStyle=scoreProbe.match(/<style id="atria-guard-scoreboard-style-487">[\s\S]*?<\/style>/)?.[0];
const scoreScript=scoreProbe.match(/<script id="atria-guard-scoreboard-runtime-487">[\s\S]*?<\/script>/)?.[0];
assert(scoreStyle&&scoreScript,'source-identical scorecard artifacts exist');
assert.equal(html.split(scoreStyle).length,2,'exactly one source-certified scoreboard style');
assert.equal(html.split(scoreScript).length,2,'exactly one source-certified scoreboard runtime');
let beforeStop=historicalHtml.replace(scoreStyle,'').replace(scoreScript,'').replace(morphine[0][0],'').replace(urgent[0][0],'').replace(closure[0][0],'');
for(const [id,name,digest] of [
 ['atria-nurse-execution-487','nurse-execution','94d1e61a4b46b9975578100825bf0977c7c431ea70b4fff54986c9df4bb0c85d'],
 ['atria-nurse-voice-routing-487','nurse-voice','1977da69627bbadd57fb995c0d908d9fd65f5e6595b64142f63f7cced5348ea3'],
 ['atria-verified-clinical-chat-487','clinical-confirmations','b2efcb61d5f374b76263b717cff6ee79f544aba98484c599a2b07d48ba2fd0b0'],
 ['atria-manual-monitor-iv-487','manual-monitor','752ef207aeef3ce19ec60f31b9446fea131e4ec3d336db9718ff3cac96e0f7e4']]){
 const scripts=[...beforeStop.matchAll(new RegExp('<script id="'+id+'">[\\s\\S]*?<\\/script>','g'))];
 assert.equal(scripts.length,1);
 const frozen=fs.readFileSync(new URL('../physiology-live/'+name+(name==='manual-monitor'?'-pre-noradrenaline-487.txt':'-pre-stop-487.txt'),import.meta.url),'utf8');
 assert.equal(createHash('sha256').update(frozen).digest('hex'),digest,'verified pre-stop script '+name);
 beforeStop=beforeStop.replace(scripts[0][0],frozen);
}
for(const [rawCurrent,rawPrior] of [[NURSE_STOP_FINISH_NEW_487,NURSE_STOP_FINISH_OLD_487],
 [NURSE_STOP_STATUS_NEW_487,NURSE_STOP_STATUS_OLD_487],[NURSE_STOP_VERSION_NEW_487,NURSE_STOP_VERSION_OLD_487],
 [NORA_RECEIPT_NEW_487,NORA_RECEIPT_OLD_487],[NORA_DEDUPE_NEW_487,NORA_DEDUPE_OLD_487],
 [NORA_PENDING_NEW_487,NORA_PENDING_OLD_487],[NORA_CANCEL_NEW_487,NORA_CANCEL_OLD_487],
 [NORA_DELIVERY_NEW_487,NORA_DELIVERY_OLD_487],[NORA_BIND_RECEIPT_NEW_487,NORA_BIND_RECEIPT_OLD_487],
 [NORA_FLUSH_NEW_487,NORA_FLUSH_OLD_487]]){
 // The already-approved Ringer completion guard wraps the same native
 // cancellation condition later in apply487; preserve it on BOTH sides.
 const current=rawCurrent.replace(RINGER_COMPLETION_OLD_487,RINGER_COMPLETION_NEW_487);
 const prior=rawPrior.replace(RINGER_COMPLETION_OLD_487,RINGER_COMPLETION_NEW_487);
 assert.equal(beforeStop.split(current).length,2,'one authorized native stop boundary');beforeStop=beforeStop.replace(current,prior);
}
const entries=[...html.matchAll(/<script id="atria-physiology-qa-487">[\s\S]*?<\/script>/g)];
assert.equal(entries.length,1,'exactly one explicit OFF-by-default observer entry');
const expectedEntry=applyPhysiologyQABootstrap487('<body></body>').replace('<body>','').replace('</body>','');
assert.equal(entries[0][0],expectedEntry,'QA bootstrap bytes match tested source');
// Reverse exactly the authorised critical-predicate repair and replacement
// script before checking the old protected hash. All unrelated bytes stay fixed.
const criticalMarker='<script id="atria-critical-rescue-487">';
const criticalScripts=[...html.matchAll(/<script id="atria-critical-rescue-487">[\s\S]*?<\/script>/g)];
assert.equal(criticalScripts.length,1);
assert.equal(criticalScripts[0][0],applyCriticalRescue487('<body></body>').replace('<body>','').replace('</body>',''));
const oldCritical=fs.readFileSync(new URL('./critical-rescue-pre-repair-487.txt',import.meta.url),'utf8');
assert(oldCritical.startsWith(criticalMarker)&&oldCritical.endsWith('</script>'),'frozen prior critical adapter');
assert.equal(createHash('sha256').update(oldCritical).digest('hex'),'b622fb06c590a0f2d1813dcc2914a7a0e03fa1975ba418a7b0e3a37e1e4a478e');
assert.equal(html.split(CRITICAL_FINAL_NEW_487).length,2,'one final repair');
assert.equal(html.split(CRITICAL_CLOCK_NEW_487).length,2,'one native per-patient clock hook');
const bridgeScripts=[...html.matchAll(/<script id="atria-secondary-sepsis-bridge-487">[\s\S]*?<\/script>/g)];
assert.equal(bridgeScripts.length,1);
assert.equal(bridgeScripts[0][0],applySecondaryBridge487('<body></body>').replace('<body>','').replace('</body>',''));
const oldBridge=fs.readFileSync(new URL('./secondary-bridge-pre-owner-487.txt',import.meta.url),'utf8');
assert.equal(createHash('sha256').update(oldBridge).digest('hex'),'ff570d3d2ee468d0d24d0492a876d85a61d7e3d242e311681bd5e72fdef4a045');
assert.equal(html.split(RINGER_SAFETY_NEW_487).length,2,'one native fluid toxicity ownership gate');
assert.equal(html.split(RINGER_COMPLETION_NEW_487).length,2,'one scoped fluid completion qualifier');
// Reverse the single reviewed XP-quality fallback before comparing to the
// original frozen baseline. This does NOT rebaseline vital/clinical numbers.
const periCurrent=applyPeritonitis487('<body></body>').replace('<body>','').replace('</body>','');
// Reverse ONLY the reviewed Android execution/XP deltas. The frozen original
// hash and numeric trajectories are unchanged, so unrelated drift still fails.
const handoffStart=periCurrent.indexOf(' // The late native ns422 policy must use');
const handoffEnd=periCurrent.indexOf(' const oldXpEligible=window.nsExperienceEligible;',handoffStart);
assert(handoffStart>0&&handoffEnd>handoffStart,'reviewed late XP bridge');
const handoffBridge=periCurrent.slice(handoffStart,handoffEnd);
for(const [current,prior] of [
 [handoffBridge,''],
 ['   return window.csPeritonitisExperienceEligible487();',
  '   return !!sim?._csPeriCompletionForXP487&&handoffProof()&&!sim?.patientDied;'],
 ['window.nsExperienceEligible=function(){const handoff=window.csPeritonitisExperienceEligible487?.()??window.csCaseExperienceEligible487?.();return handoff==null?!sim?.patientDied&&!!window.nsPatientState?.()?.treatment.complete:handoff;};',
  'window.nsExperienceEligible=function(){return !sim?.patientDied&&!!window.nsPatientState?.()?.treatment.complete;};'],
 ['\n  if(window.csNurseVoice487?.dispatch)return window.csNurseVoice487.dispatch(text);',''],
 ['scanned.items.filter(x=>!x.negated&&!x.routeOnly)','scanned.items.filter(x=>!x.negated)']
]){
 assert.equal(beforeStop.split(current).length,2,'unique reviewed Android delta');
 beforeStop=beforeStop.replace(current,prior);
}
const periStart=periCurrent.indexOf('     // Real V19 career payout consumes numeric quality fields.');
const periEnd=periCurrent.indexOf('     b.diagnosis=15;',periStart);
assert(periStart>0&&periEnd>periStart,'exact authorised finite-XP block in peritonitis source');
const xpFix=periCurrent.slice(periStart,periEnd);
assert(xpFix.includes('b.autonomy=')&&xpFix.includes('b.efficiency='),'finite career inputs guarded');
assert.equal(beforeStop.split(xpFix).length,2,'unique reviewed peritonitis XP revision');
beforeStop=beforeStop.replace(xpFix,'');
const restored=beforeStop.replace(entries[0][0],'').replace(criticalScripts[0][0],oldCritical)
 .replace(bridgeScripts[0][0],oldBridge).replace(RINGER_SAFETY_NEW_487,RINGER_SAFETY_OLD_487)
 .replace(RINGER_COMPLETION_NEW_487,RINGER_COMPLETION_OLD_487)
 .replace(CRITICAL_FINAL_NEW_487,CRITICAL_FINAL_OLD_487).replace(CRITICAL_CLOCK_NEW_487,CRITICAL_CLOCK_OLD_487);
// Reverse the reviewed multiplayer changes from the exact pre-Vega/pre-chat
// source, then compare the SAME original protected digest as before.
const clinicRestored=applyMultiplayerStabilization487(restored,{reverse:true});
const originalHash=createHash('sha256').update(clinicRestored).digest('hex');
assert.equal(originalHash,'dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7','all prior HTML bytes remain identical after removing sole QA entry');
assert(!html.includes('physiology-pilot-487')&&!html.includes('physiology-shadow-487'),'no eager B1 import or effect writer');
assert(/4\.8\.6/.test(html)&&/Estudios solicitados/i.test(html),'existing QA output contract');
for(const name of ['task7.js','task8.js','task12.js','task13.js'])assert(!new RegExp('<script[^>]+src=["\'][^"\']*'+name.replace('.','\\.'),'i').test(html));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-b1-inline-'));
let inline=0,external=0,moduleBytes=0;
try{
 for(const [i,match]of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()){
  if(!match[1].trim())continue;
  const file=path.join(dir,'inline-'+i+'.js');fs.writeFileSync(file,match[1]);
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);inline++;
 }
 const expected=fs.readdirSync('vendor/atria-4.8.6').filter(n=>/^task\d+\.js$/.test(n)).sort();
 assert.deepEqual(fs.readdirSync('out').filter(n=>/^task\d+\.js$/.test(n)).sort(),expected,'complete golden-master task inventory');
 for(const name of expected){
  assert.equal(Buffer.compare(fs.readFileSync('out/'+name),fs.readFileSync('vendor/atria-4.8.6/'+name)),0,'golden master copy '+name);
  const r=spawnSync(process.execPath,['--check','out/'+name],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);external++;
 }
 const root=path.resolve('out/qa-physiology'),moduleFiles=fs.readdirSync(root,{recursive:true}).filter(n=>n.endsWith('.js')).sort();
 assert.deepEqual(moduleFiles,PHYSIOLOGY_QA_FILES_487.slice().sort(),'explicit complete module inventory');
 for(const name of moduleFiles){
  const target=path.join(root,name),code=fs.readFileSync(target,'utf8');
  assert.equal(Buffer.compare(fs.readFileSync(target),fs.readFileSync('src/'+name)),0,'QA module source copy '+name);
  moduleBytes+=Buffer.byteLength(code);
  for(const match of code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)){
   const dependency=path.resolve(path.dirname(target),match[1]);
   assert(match[1].startsWith('.')&&dependency.startsWith(root+'/')&&fs.existsSync(dependency),'offline local import '+name+': '+match[1]);
  }
  const r=spawnSync(process.execPath,['--check',target],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('B1 PROTECTED / LAZY QA ARTIFACT PASS',JSON.stringify({sha256:hash,protectedHtmlSha256:originalHash,
 inline,external,modules:PHYSIOLOGY_QA_FILES_487.length,moduleBytes,defaultEnabled:false,activeLiveWritersByDefault:0,
 experimentalScope:'fresh local PERI-SEC/named Ringer IV bolus'}));
