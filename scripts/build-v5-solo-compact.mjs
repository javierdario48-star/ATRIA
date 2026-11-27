import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {navyScrubPixels} from '../src/v5/render/avatar-palette.js';
const respiratory=process.argv.includes('--resp01-v2');
const varix=process.argv.includes('--varix-v2');
const combined=process.argv.includes('--all-v2');
if([respiratory,varix,combined].filter(Boolean).length>1||process.argv.slice(2).some(x=>!['--resp01-v2','--varix-v2','--all-v2'].includes(x)))
 throw Error('Select at most one offline revision');
const revision=combined?'all-v2-experimental':respiratory?'resp01-v2-experimental':varix?'varix-v2-experimental':'v1';
const sourceSha=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const offline={buildId:sourceSha+(combined?':all-v2':respiratory?':resp01-v2':varix?':varix-v2':':v1'),
 storageScope:combined?'all-v2-offline':respiratory?'resp01-v2-offline':varix?'varix-v2-offline':'solo-offline-v1',
 label:combined?'ATRIA 5 · RESP-01, VARIX-001, CARD-08 y NEUR-01 V2 experimental':respiratory?'RESP-01 V2 experimental · original conservado en el HTML V1':
  varix?'VARIX-001 V2 experimental · original conservado en el HTML V1':'ATRIA 5 · 55 casos V1'};
const esbuild=createRequire(import.meta.url)(process.env.ATRIA_ESBUILD_MODULE);
const base='src/v5/content/';
const names={map:'hospital',cases:'cases',algorithms:'algorithms',examSegments:'exam-segments',therapies:'therapies',defaultDoses:'default-doses',beds:'beds',colors:'colors',assets:'assets',certifiedCatalog:'certified-case-packs'};
const raw={};for(const [key,name] of Object.entries(names))raw[key]=JSON.parse(await fs.readFile(base+name+'.json'));
async function uri(file){let mime=file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':file.endsWith('.avif')?'image/avif':file.endsWith('.wav')?'audio/wav':'audio/mp4';return 'data:'+mime+';base64,'+(await fs.readFile(base+file)).toString('base64');}
const assets={};for(const [key,value] of Object.entries(raw.assets))assets[key]=await uri(value.path);
assets.wardrobe=await uri('assets/player-wardrobe.avif');
// Embed the shared palette as pixels; local content:// documents can prohibit
// runtime canvas readback. Preview and hospital use the identical bitmap.
const sharp=createRequire(process.env.ATRIA_ESBUILD_MODULE+'/package.json')('sharp');
const {data,info}=await sharp(base+raw.assets['player-green'].path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const blue=await sharp(Buffer.from(navyScrubPixels(data)),{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
assets['player-navy-derived']='data:image/png;base64,'+blue.toString('base64');
const audio={};for(const name of ['atria-theme.m4a','atria-theme-aac.m4a','atria-click.wav'])audio[name]=await uri('audio/'+name);
const entry='src/v5/app/__atria_solo_generated__.js';
const code=`import {createClinicalContent} from '../content/clinical-content.js';
import {readCertifiedCaseCatalog} from '../content/certified-case-catalog.js';
import {CLINICAL_POLICY_REGISTRIES} from '../clinical/clinical-policy-registry.js';
import {createApplication} from './application.js';
${combined?"import {stageOfflineV2Packs} from '../content/packs/offline-v2-packs.js';":respiratory?"import {resp01V2Candidate,resp01V2ExperimentalPack} from '../content/packs/respiratory-v2-candidate.js';\nimport {compileClinicalCasePack} from '../content/compile-clinical-case-pack.js';":
 varix?"import {varixV2Candidate,varixV2ExperimentalPack} from '../content/packs/varix-v2-candidate.js';\nimport {compileClinicalCasePack} from '../content/compile-clinical-case-pack.js';":''}
const raw=${JSON.stringify(raw)},assets=${JSON.stringify(assets)};
const fetchOriginal=window.fetch.bind(window);
window.fetch=(input,opts)=>{
// Chrome for Android opens a downloaded HTML through content:// instead of file://.
// Match /api routes BEFORE URL resolution, which may fail for content:// origins.
const target=typeof input==='string'?input:input.url;
let pathname=target;
if(!target.startsWith('/api/')){try{pathname=new URL(target,location.href).pathname;}catch{}}
if(pathname==='/api/account/session')
return Promise.resolve(new Response(JSON.stringify({account:null,enabled:false}),{status:404,headers:{'content-type':'application/json'}}));
if(pathname.startsWith('/api/'))
return Promise.resolve(new Response(JSON.stringify({error:'Sin servidor en la copia Solitario'}),{status:503,headers:{'content-type':'application/json'}}));
return fetchOriginal(input,opts);};
const abort=new AbortController();
(async()=>{try{const {certifiedCatalog,...content}=raw;content.assetUrls=assets;
const c=readCertifiedCaseCatalog(certifiedCatalog,{...CLINICAL_POLICY_REGISTRIES,existingCaseIds:content.cases.map(c=>c.id)});
if(!c.ok)throw Error('Catalogo no certificado: '+c.errors.join('; '));
let additionalCases=c.cases;
${combined?"({baseCases:content.cases,additionalCases}=stageOfflineV2Packs(content.cases,c.cases));":respiratory?"const staged=compileClinicalCasePack(resp01V2ExperimentalPack,CLINICAL_POLICY_REGISTRIES);if(!staged.ok)throw Error(staged.errors.join('; '));\nadditionalCases=c.cases.filter(x=>x.id!==resp01V2Candidate.id).concat(staged.cases);":
 varix?"const staged=compileClinicalCasePack(varixV2ExperimentalPack,{...CLINICAL_POLICY_REGISTRIES,existingCaseIds:[...content.cases.filter(x=>x.id!==varixV2Candidate.id).map(x=>x.id),...c.cases.map(x=>x.id)]});if(!staged.ok)throw Error(staged.errors.join('; '));\ncontent.cases=content.cases.map(x=>x.id===varixV2Candidate.id?staged.cases[0]:x);":''}
const composed=createClinicalContent(content,{additionalCases});
if(composed.cases.length!==55||new Set(composed.cases.map(c=>c.id)).size!==55)throw Error('Offline catalog must retain 55 unique logical cases');
const app=await createApplication({document,window,content:composed,signal:abort.signal,offline:${JSON.stringify(offline)}});
document.body.dataset.clinicalRevision=${JSON.stringify(revision)};
Object.defineProperty(window,'atriaV5',{value:app,writable:false});document.body.dataset.boot='ready';}
catch(e){abort.abort();document.body.dataset.boot='failed';document.getElementById('fatalText').textContent=e.message;document.getElementById('fatal').hidden=false;console.error(e);}})();`;
try{await fs.writeFile(entry,code);
const plugin={name:'offline-audio',setup(b){b.onLoad({filter:/[\\/]src[\\/]v5[\\/]ui[\\/]audio-assets\.js$/},async args=>{
let contents=await fs.readFile(args.path,'utf8');for(const [name,data] of Object.entries(audio)){
const source="new URL('../content/audio/"+name+"',import.meta.url).href";
if(!contents.includes(source))throw Error('Missing audio source '+name);
contents=contents.replace(source,JSON.stringify(data));}return {contents,loader:'js'};});}};
const result=await esbuild.build({entryPoints:[entry],bundle:true,write:false,format:'iife',platform:'browser',target:'chrome112',minify:true,plugins:[plugin]});
const js=result.outputFiles[0]?.text;if(!js)throw Error('Missing game bundle');
let html=await fs.readFile('src/v5/web/index.html','utf8');let css=await fs.readFile('src/v5/web/game.css','utf8');
const style='<link rel="stylesheet" href="./src/v5/web/game.css">';if(!html.includes(style))throw Error('CSS changed');
html=html.replace(style,'<style>'+css.replaceAll('</style','<\\/style')+'</style>');
// The welcome image is referenced directly by HTML, not by assets.json.
const welcomeSrc='./src/v5/content/assets/welcome-doctors.webp';
if(!html.includes('src="'+welcomeSrc+'"'))throw Error('Welcome artwork reference changed');
html=html.replace('src="'+welcomeSrc+'"','src="'+await uri('assets/welcome-doctors.webp')+'"');
const script=/<script type="module" src="\.\/src\/v5\/app\/main\.js" onerror="[^"]*"><\/script>/;
if(!script.test(html))throw Error('Entry changed');
html=html.replace(script,()=>'<script>'+js.replaceAll('</script','<\\/script')+'</script>');
html=html.replace('</head>','<meta name="atria-source-sha" content="'+sourceSha+'"><meta name="atria-clinical-revision" content="'+(revision)+'"></head>');
await fs.mkdir('out-solo-html',{recursive:true});const out='out-solo-html/'+(combined?'ATRIA-5-V2-Laboratorio.html':respiratory?'ATRIA-5-RESP01-V2-Experimental.html':
 varix?'ATRIA-5-VARIX-V2-Experimental.html':'ATRIA-5-Solitario.html');await fs.writeFile(out,html);
const hash=createHash('sha256').update(html).digest('hex');await fs.writeFile(out+'.sha256',hash+'  '+out.split('/').at(-1)+'\n');
await fs.writeFile('out-solo-html/README.txt',`ATRIA 5 — pruebas personales offline\nSHA de fuentes: ${sourceSha}\n\nATRIA-5-Solitario.html: 55 casos V1.\nATRIA-5-V2-Laboratorio.html (si incluido): 55 IDs, RESP-01, VARIX-001, CARD-08 y NEUR-01 V2; los otros 51 conservan V1. Seleccionar por patología específica. Guardado propio.\nATRIA-5-RESP01-V2-Experimental.html (si incluido): mismo catálogo de 55 identidades, RESP-01 V2 aislado; V1 permanece en el otro archivo.
ATRIA-5-VARIX-V2-Experimental.html (si incluido): mismo catálogo de 55 identidades, VARIX-001 V2 aislado; V1 permanece en ATRIA-5-Solitario.html.\n\nAbrir el HTML en Chrome de escritorio. No requiere Vercel ni servidor HTTP. En Android la apertura depende del navegador/gestor (file:// o content://); el teléfono físico sigue pendiente de aceptación.\nAprendiz/Solitario disponibles. Cooperativo/Competitivo conservan su implementación compartida y requieren servidor: esta copia no simula otros médicos.\n\nPara RESP-01 V2: Hacer guardia > Solitario > Caso específico > neumonía de bajo riesgo.
Para VARIX-001 V2: Hacer guardia > Solitario > Caso específico > cirrosis y hematemesis masiva. Entrar, Recepción, elegir paciente; usar menú del paciente para historia, examen, estudios, medicación y Dr. Vega.\nGuardar y salir desde menú o fin de turno; Hacer guardia > Retomar guardia guardada. El tiempo se pausa al cerrar. Guardar explícitamente antes de cerrar la pestaña.\nGuardado y XP son locales a este navegador, archivo/revisión y perfil. Las distintas ediciones usan espacios separados y no sobrescriben el progreso de la otra. Conservar el HTML original para recuperar guardias guardadas por esa revisión. No trasladar XP local a una cuenta como recompensa verificada.\n\nSin conexión no se certifican cuentas, backend, voz entre jugadores, Supabase, Preview ni Android físico. No es una autorización de Production.\nCada HTML tiene un archivo .sha256; el manifiesto de CI contiene evidencia de interfaz, jugabilidad y recuperación del mismo SHA.\n`);
console.log('BUILT '+out+' bytes='+Buffer.byteLength(html)+' sha256='+hash);
}finally{await fs.rm(entry,{force:true});}
