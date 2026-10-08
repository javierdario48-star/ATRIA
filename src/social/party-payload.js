// Lossless transport for large existing cs_room_v411 start/snapshot payloads.
// The QA room API intentionally caps each message at 6,000 characters.
// Never discard patient clinical state to make a room fit the limit.
export async function csPartyEncode(value, roomId, id, maxPayload=3200) {
 const raw=String(value||'');
 if(raw.length<=4500)return [JSON.parse(raw)];
 if(typeof CompressionStream!=='function')throw Error('Este navegador no admite compresión de estado compartido');
 const compressed=await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 const bytes=new Uint8Array(compressed);
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const b64=btoa(binary),parts=[];
 for(let i=0;i<b64.length;i+=maxPayload)parts.push(b64.slice(i,i+maxPayload));
 if(parts.length<1||parts.length>90)throw Error('La guardia compartida supera el límite seguro de transferencia');
 return parts.map((data,index)=>({type:'atria_room_fragment',roomId,id,index,total:parts.length,codec:'gzip',data}));
}
export async function csPartyDecode(parts,maxBytes=1200000) {
 if(!Array.isArray(parts)||!parts.length||parts.length>90||parts.some(x=>typeof x!=='string'||x.length>3600||!/^[A-Za-z0-9+/=]+$/.test(x)))throw Error('Fragmentos de guardia inválidos');
 if(typeof DecompressionStream!=='function')throw Error('Este navegador no puede descomprimir la guardia compartida');
 const b=b64toBytes(parts.join(''));
 const restored=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 if(restored.byteLength>maxBytes)throw Error('Estado de guardia excede tamaño seguro');
 const obj=JSON.parse(new TextDecoder().decode(restored));
 if(obj?.type!=='cs_room_v411'||!['start','snapshot'].includes(obj.kind))throw Error('Tipo de mensaje compartido inválido');
 return obj;
}
export function b64toBytes(base64) {
 const binary=atob(base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return bytes;
}
