import {socialService as core} from './_accounts.js';
import {isSignalingEndpoint} from '../src/v5/social/social-route-policy.js';
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
  // Vercel's catch-all rewrite may send /api/lobby-sync through
  // /api/social?route=lobby-sync. Both must publish the SAME shared presence.
  const signal=signaling||isSignalingEndpoint({path:url.pathname,route:query.route});
  const result=await (signal?core.signalRoute({method:req.method,query,headers:req.headers,body:data}):core.route({method:req.method,path:query.route||url.pathname,query,headers:req.headers,body:data}));
  if(result.cookies?.length)res.setHeader('Set-Cookie',result.cookies);
  res.statusCode=result.status;res.end(JSON.stringify(result.body));
 }catch(e){
  console.error('ATRIA QA social request failed',e?.name||'Error');
  res.statusCode=503;res.end(JSON.stringify({error:'Servicio social QA no disponible'}));
 }
}
