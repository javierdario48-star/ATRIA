import {getCache} from '@vercel/functions';
import {createQaSocialServer} from '../src/social/qa-social-server.js';
const store=getCache(undefined,'atria-social-qa-v1',':');
const core=createQaSocialServer(store);
const maxBytes=16000;
export async function handler(req,res,{signaling=false}={}){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 const origin=req.headers?.origin,host=req.headers?.host;
 if(origin){try{if(new URL(origin).host!==host)throw Error('origin')}catch{res.statusCode=403;res.end(JSON.stringify({error:'Origen no permitido'}));return}}
 try{
  const url=new URL(req.url,'https://'+(host||'localhost'));
  let data=req.body??{};
  if(typeof data==='string'){if(data.length>maxBytes){res.statusCode=413;res.end(JSON.stringify({error:'Solicitud demasiado extensa'}));return}data=JSON.parse(data||'{}')}
  if(Buffer.isBuffer(data)){if(data.byteLength>maxBytes){res.statusCode=413;res.end(JSON.stringify({error:'Solicitud demasiado extensa'}));return}data=JSON.parse(data.toString('utf8'))}
  const query=Object.fromEntries(url.searchParams);
  const result=await (signaling?core.signalRoute({method:req.method,query,headers:req.headers,body:data}):core.route({method:req.method,path:url.pathname,query,headers:req.headers,body:data}));
  res.statusCode=result.status;res.end(JSON.stringify(result.body));
 }catch(e){
  console.error('ATRIA QA social request failed',e?.name||'Error');
  res.statusCode=503;res.end(JSON.stringify({error:'Servicio social QA no disponible'}));
 }
}
