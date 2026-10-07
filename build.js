import fs from 'node:fs/promises';
const base='vendor/atria-4.8.6',out='out';
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile(base+'/MANIFEST.json','utf8'));
if(manifest.version!=='4.8.6')throw new Error('expected local stable 4.8.6 golden master');
const files=Object.keys(manifest.files||{});
if(!files.includes('index.html'))throw new Error('golden master index missing');
for(const name of files){if(name!=='index.html'&&!/^task\d+\.js$/.test(name))continue;await fs.copyFile(base+'/'+name,out+'/'+name)}
const html=await fs.readFile(out+'/index.html','utf8');
if(!html.includes('4.8.6'))throw new Error('golden master marker missing');
const diag=`<!doctype html><meta name="viewport" content="width=device-width"><title>ATRIA QA diagnostic</title><style>body{font:15px system-ui;background:#07181a;color:#eaf7f5;padding:18px}pre{white-space:pre-wrap}</style><h2>ATRIA QA diagnostic</h2><pre id="o">running…</pre><iframe id="g" src="/" style="width:1px;height:1px;border:0;position:absolute;left:-9999px"></iframe><script>
const out=document.getElementById('o'),g=document.getElementById('g');g.onload=()=>setTimeout(()=>{let d={};try{const w=g.contentWindow,x=g.contentDocument;d={href:w.location.href,ready:x.readyState,canvas:!!x.querySelector('canvas'),selector:!!x.getElementById('selector'),chatDock:!!x.getElementById('chatDock'),act:!!x.getElementById('act'),scripts:[...x.scripts].map(s=>s.src||s.id||'inline').slice(-25),bodyClasses:x.body.className,hasUpdateFrame:typeof w.updateFrame==='function',hasPlayer:typeof w.player!=='undefined',hasMap:typeof w.MAP!=='undefined',errors:w.__ATRIA_DIAG_ERRORS||[]}}catch(e){d={error:String(e)}}out.textContent=JSON.stringify(d,null,2)},2500);
</script>`;
await fs.writeFile(out+'/qa-diagnostic.html',diag);
console.log('ATRIA local golden-master build: 4.8.6; files',files.length);
