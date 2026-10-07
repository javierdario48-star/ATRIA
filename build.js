import fs from 'node:fs/promises';
const BASE='https://night-shift-clinical.vercel.app',out='out';
await fs.mkdir(out,{recursive:true});
const r=await fetch(BASE+'/',{headers:{'cache-control':'no-cache'}});
if(!r.ok)throw new Error('baseline '+r.status);
const html=await r.text();
if(!html.includes('4.8.6'))throw new Error('expected stable 4.8.6 baseline');
const scripts=[...new Set([...html.matchAll(/<script[^>]+src=["'](\/task\d+\.js[^"']*)["']/g)].map(m=>m[1]))];
for(const src of scripts){const u=new URL(src,BASE),q=await fetch(u,{headers:{'cache-control':'no-cache'}});if(!q.ok)throw new Error('asset '+u.pathname);await fs.writeFile(out+'/'+u.pathname.split('/').pop(),await q.text())}
await fs.writeFile(out+'/index.html',html);
const diag=`<!doctype html><meta name="viewport" content="width=device-width"><title>ATRIA QA diagnostic</title><style>body{font:15px system-ui;background:#07181a;color:#eaf7f5;padding:18px}pre{white-space:pre-wrap}</style><h2>ATRIA QA diagnostic</h2><pre id="o">running…</pre><iframe id="g" src="/" style="width:1px;height:1px;border:0;position:absolute;left:-9999px"></iframe><script>
const out=document.getElementById('o'),g=document.getElementById('g');g.onload=()=>setTimeout(()=>{let d={};try{const w=g.contentWindow,x=g.contentDocument;d={href:w.location.href,ready:x.readyState,canvas:!!x.querySelector('canvas'),selector:!!x.getElementById('selector'),chatDock:!!x.getElementById('chatDock'),act:!!x.getElementById('act'),scripts:[...x.scripts].map(s=>s.src||s.id||'inline').slice(-25),bodyClasses:x.body.className,hasUpdateFrame:typeof w.updateFrame==='function',hasPlayer:typeof w.player!=='undefined',hasMap:typeof w.MAP!=='undefined',errors:w.__ATRIA_DIAG_ERRORS||[]}}catch(e){d={error:String(e)}}out.textContent=JSON.stringify(d,null,2)},2500);
</script>`;
await fs.writeFile(out+'/qa-diagnostic.html',diag);
console.log('ATRIA CLEAN CONTROL: byte-faithful 4.8.6 mirror; no runtime overrides; tasks',scripts.length);
