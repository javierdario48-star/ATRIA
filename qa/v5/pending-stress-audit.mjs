// Exact inventory census and merge of the existing native transfer-bot certificates.
// Output is a working audit artifact; the historical 88-ID inventory is never overwritten.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),output=path.join(root,'qa/v5-pending-stress-report');
fs.mkdirSync(output,{recursive:true});
const raw=fs.readFileSync('docs/ATRIA-5-REMAINING-TASKS.md','utf8');
const first=raw.indexOf('## Registro maestro único vigente');
const last=raw.indexOf('## Fichas de verificación',first);
assert(first>=0&&last>first,'canonical inventory section missing');
const lines=raw.slice(first,last).split('\n').filter(x=>/^\| [A-Z][A-Z0-9-]+ \|/.test(x));
const items=lines.map(x=>x.split('|').slice(1,-1).map(s=>s.trim()))
 .filter(a=>a[0]!=='ID').map(([id,subsystem,status,request,pending])=>({id,subsystem,status,request,pending}));
assert.equal(items.length,88,'unexpected number of catalogued requirements');
assert.equal(new Set(items.map(x=>x.id)).size,88);
const counts={};for(const x of items)counts[x.status]=(counts[x.status]||0)+1;
const active=items.filter(x=>!['COMPLETADO Y VERIFICADO','REEMPLAZADO'].includes(x.status));
assert.equal(active.length,76,'historic active count changed');
const infrastructure=new Set('PERF-01 SCALE-01 DEPLOY-01 AUTH-01 AUTH-02 ANDROID-01 ANDROID-02'.split(' '));
const platform=new Set(('LAT-01 MP-01 XP-COOP DX-REVEAL REC-01 SEL-00 DX-01 UI-01 ARCH-02 ARCH-03 ARCH-04 XP-01 XP-02 XP-03 COMP-01 LOBBY-01 SOCIAL-01 SOCIAL-02 CHAT-01 CHAT-02 TURN-01 TURN-02 SELECT-01 SELECT-OLD UI-02 EXAM-01 WORLD-01 WORLD-02 WORLD-03 WORLD-04 WORLD-05 AUDIO-01 AUDIO-02 VOICE-01 VOICE-02 KEYBOARD-01 KEYBOARD-OLD QA-01 QA-02 QA-03 BOTS-01 BOTS-02 CONT-01 CONT-02 CONT-03').split(' '));
const gameBot=new Set('UI-01 UI-02 WORLD-01 AUDIO-01 AUDIO-02 KEYBOARD-01 TURN-01 SELECT-01 SEL-00 CHAT-02 DX-01 NUR-01 NUR-02 EXAM-01 ARCH-02 AUTH-01'.split(' '));
const multiBot=new Set('MP-01 COMP-01 CHAT-01 CHAT-02 TURN-02 REC-01 NUR-03 DX-02 SEL-00 LOBBY-01 SOCIAL-02 WORLD-02 AUTH-02 QA-01 XP-COOP XP-03'.split(' '));
const clinicalBot=new Set('NUR-01 NUR-02 NUR-03 SAFE-01 CLOSE-01 DX-03 PHYS-01 PHYS-02 PHYS-03 PHYS-04 PHYS-05 MED-01 MED-02 CASE-01 CASE-02 VAR-01 VAR-03 CLIN-HEPAT-01 CLIN-CARD08-01 CLIN-VARIX-01 CLIN-HDA-01 XP-01 XP-COOP DX-REVEAL VEGA-01 VEGA-AUTO-01 VEGA-COHERENCE-01 BOTS-01 QA-02 QA-03'.split(' '));
const priority0=new Set('LAT-01 REC-01 MP-01 COMP-01 CHAT-01 NUR-03 TURN-02 AUTH-02 DEPLOY-01 PERF-01 QA-01'.split(' '));
const priority1=new Set('NUR-01 NUR-02 UI-01 UI-02 SEL-00 DX-01 CHAT-02 WORLD-02 KEYBOARD-01'.split(' '));
function category(x){return infrastructure.has(x.id)?'INFRAESTRUCTURA/ANDROID':
 platform.has(x.id)?'PLATAFORMA':'MOTOR Y CASOS CLINICOS';}
function priority(x){return priority0.has(x.id)?'P0':priority1.has(x.id)?'P1':'P2';}
const rows=items.map(x=>({...x,category:category(x),priority:priority(x),
 active:!['COMPLETADO Y VERIFICADO','REEMPLAZADO'].includes(x.status),
 relatedEvidence:[gameBot.has(x.id)?'HTML53/53':null,multiBot.has(x.id)?'QA_MULTIJUGADOR':null,
 clinicalBot.has(x.id)?'QA_CLINICA':null].filter(Boolean),
 acceptedNow:false}));
const byCategory={};for(const x of rows){byCategory[x.category]??={total:0,active:0};byCategory[x.category].total++;
 if(x.active)byCategory[x.category].active++;}
const inventory={sourceSha:process.env.GITHUB_SHA||'unknown',sourceFile:'docs/ATRIA-5-REMAINING-TASKS.md',
 total:88,active:76,counts,byCategory,warning:'relatedEvidence is partial scope, never full acceptance',
 historicalStaleState:'QA-01 is historically marked defective; a later 30/30 core run passed',
 rows};
fs.writeFileSync(output+'/inventory.json',JSON.stringify(inventory,null,2)+'\n');
const quote=x=>'"'+String(x??'').replaceAll('"','""').replaceAll('\n',' ')+'"';
fs.writeFileSync(output+'/inventory.csv',['ID','AREA','PRIORIDAD','ESTADO HISTORICO','SIN CIERRE','PRUEBA RELACIONADA','PENDIENTE'].join(',')+'\n'+
 rows.map(x=>[x.id,x.category,x.priority,x.status,x.active,x.relatedEvidence.join(';'),x.pending].map(quote).join(',')).join('\n')+'\n');
const markdown=['# ATRIA 5.0 — Auditoría de 88 requisitos','',
 'Fuente intacta: docs/ATRIA-5-REMAINING-TASKS.md · SHA '+inventory.sourceSha,'',
 'Total: **88**. Sin cierre definitivo: **76** (no son 76 errores).','',
 ...Object.entries(counts).map(([s,n])=>'- '+s+': '+n),'',
 ...Object.entries(byCategory).map(([s,n])=>'- '+s+': '+n.active+' activos de '+n.total),'',
 '## Pendientes operativos P0 y P1',...rows.filter(x=>x.active&&x.priority!=='P2').map(x=>'- '+x.id+' ['+x.status+']: '+x.pending),
 '','## Reglas de lectura',
 '- Ninguna fila se marca como completamente aceptada solo por una prueba relacionada.',
 '- Para el detalle de las 88 filas, abrir inventory.csv.',''];
fs.writeFileSync(output+'/inventory.md',markdown.join('\n')+'\n');
console.log('ATRIA_INVENTORY_AUDIT='+JSON.stringify({total:88,active:76,counts,byCategory}));

if(process.argv.includes('--aggregate')){
 const profiles=['competent','missing-dx','wrong-dx','insufficient-preparation','wrong-destination',
  'slow','iatrogenic','nursing-recovery','closure-recovery','multiplayer'];
 const groups=[],missing=[],ids=new Set();
 for(const profile of profiles){
  const p='qa/v5-pending-stress-profiles/atria-v5-stress-'+profile+'/summary.json';
  if(!fs.existsSync(p)){missing.push(profile);continue;}
  const r=JSON.parse(fs.readFileSync(p,'utf8'));
  if(r.profiles.join(',')!==profile||r.caseCount!==55||r.executions!==55)missing.push(profile+':invalid');
  for(const id of r.cases)ids.add(id);
  groups.push({profile,cases:r.caseCount,executions:r.executions,passed:r.passed,
   outcomes:r.outcomes,failures:r.failures});
 }
 const executions=groups.reduce((n,x)=>n+x.executions,0);
 const passed=groups.reduce((n,x)=>n+x.passed,0);
 const failures=groups.flatMap(x=>x.failures.map(y=>({profile:x.profile,...y})));
 const report={sha:process.env.GITHUB_SHA||'unknown',cases:ids.size,profiles:groups.length,
  executions,passed,failures,missing,
  multiplayerBrowserJob:process.env.STRESS_BROWSER_RESULT||'unknown',
  allProfilesPassed:missing.length===0&&ids.size===55&&executions===550&&passed===550,
  physicalAndroid:false,productionVercel:false,
  guarantees:'Only per-bot contract assertions; actual adverse outcomes are not software failures',
  scopes:'55 cases x 10 strategies; four game modes via existing multiplayer and single-player validators'};
 fs.writeFileSync(output+'/clinical-stress.json',JSON.stringify(report,null,2)+'\n');
 const body=['# Estrés clínico real de ATRIA 5','',
  'SHA '+report.sha+'; casos '+report.cases+'; perfiles '+report.profiles+'; ejecuciones '+report.executions+
  '; certificados '+report.passed+'; navegador 4 jugadores '+report.multiplayerBrowserJob,'',
  ...groups.map(x=>'- '+x.profile+': '+x.passed+'/'+x.executions+
   ' | desenlaces '+JSON.stringify(x.outcomes)),
  '','## Fallos en criterios de bot',
  ...(!failures.length?['- Ninguno en los escenarios cubiertos.']:
   failures.map(x=>'- '+x.caseId+'/'+x.profile+': '+JSON.stringify(x.failures))),
  '','## Límites','- Un desenlace adverso previsto NO es defecto de software.',
  '- No certifica todos los controles en Android físico ni el servidor Vercel real.',
  '- No sustituye la revisión médica individual por planilla.',''];
 fs.writeFileSync(output+'/clinical-stress.md',body.join('\n')+'\n');
 console.log('ATRIA_STRESS_AGGREGATE='+JSON.stringify({cases:report.cases,profiles:report.profiles,
  executions,passed,missing,failures:failures.length,browser:report.multiplayerBrowserJob}));
 if(!report.allProfilesPassed)process.exitCode=1;
}