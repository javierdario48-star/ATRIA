import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const esbuild=createRequire(import.meta.url)(process.env.ATRIA_ESBUILD_MODULE);
const base='src/v5/content/';
const names={map:'hospital',cases:'cases',algorithms:'algorithms',examSegments:'exam-segments',therapies:'therapies',defaultDoses:'default-doses',beds:'beds',colors:'colors',assets:'assets',certifiedCatalog:'certified-case-packs'};
const raw={};for(const [key,name] of Object.entries(names))raw[key]=JSON.parse(await fs.readFile(base+name+'.json'));
async function uri(file){let mime=file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':file.endsWith('.avif')?'image/avif':file.endsWith('.wav')?'audio/wav':'audio/mp4';return 'data:'+mime+';base64,'+(await fs.readFile(base+file)).toString('base64');}
const assets={};for(const [key,value] of Object.entries(raw.assets))assets[key]=await uri(value.path);
assets.wardrobe=await uri('assets/player-wardrobe.avif');
const audio={};for(const name of ['atria-theme.m4a','atria-theme-aac.m4a','atria-click.wav'])audio[name]=await uri('audio/'+name);
const entry='src/v5/app/__atria_solo_generated__.js';
const code=`import {createClinicalContent} from '../content/clinical-content.js';
import {readCertifiedCaseCatalog} from '../content/certified-case-catalog.js';
import {CLINICAL_POLICY_REGISTRIES} from '../clinical/clinical-policy-registry.js';
import {createApplication} from './application.js';
const raw=${JSON.stringify(raw)},assets=${JSON.stringify(assets)};
const fetchOriginal=window.fetch.bind(window);
window.fetch=(input,opts)=>{let url=new URL(typeof input==='string'?input:input.url,location.href);
if(url.pathname==='/api/account/session'&&(url.protocol==='file:'||url.protocol.startsWith('http')))
return Promise.resolve(new Response(JSON.stringify({account:null,enabled:false}),{status:404,headers:{'content-type':'application/json'}}));
if(['file:','http:','https:'].includes(url.protocol))return Promise.resolve(new Response(JSON.stringify({error:'Solo sin servidor'}),{status:503,headers:{'content-type':'application/json'}}));
return fetchOriginal(input,opts);};
const abort=new AbortController();
(async()=>{try{const {certifiedCatalog,...content}=raw;content.assetUrls=assets;
const c=readCertifiedCaseCatalog(certifiedCatalog,{...CLINICAL_POLICY_REGISTRIES,existingCaseIds:content.cases.map(c=>c.id)});
if(!c.ok)throw Error('Catalogo no certificado: '+c.errors.join('; '));
const app=await createApplication({document,window,content:createClinicalContent(content,{additionalCases:c.cases}),signal:abort.signal});
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
const script=/<script type="module" src="\.\/src\/v5\/app\/main\.js" onerror="[^"]*"><\/script>/;
if(!script.test(html))throw Error('Entry changed');
html=html.replace(script,()=>'<script>'+js.replaceAll('</script','<\\/script')+'</script>');
html=html.replace('</head>','<meta name="atria-source-sha" content="'+(process.env.GITHUB_SHA||'unknown')+'"></head>');
await fs.mkdir('out-solo-html',{recursive:true});const out='out-solo-html/ATRIA-5-Solitario.html';await fs.writeFile(out,html);
const hash=createHash('sha256').update(html).digest('hex');await fs.writeFile('out-solo-html/README.txt','ATRIA 5 Solo, HTML autentico de la rama experimental. Abrir con Chrome. Sin cuentas, multijugador ni guardado en Vercel. SHA '+(process.env.GITHUB_SHA||'unknown')+'\nSHA256 '+hash+'\n');
console.log('BUILT '+out+' bytes='+Buffer.byteLength(html)+' sha256='+hash);
}finally{await fs.rm(entry,{force:true});}
