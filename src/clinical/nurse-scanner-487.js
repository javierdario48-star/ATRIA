// Shared lexical scanner: every new case contributes its studies/interventions.
// Pure, no case answers, diagnosis inference, or hidden medical management.
export function csNurseScan487(text,studies=[],therapies=[],interventions=[]){
 const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 const s=norm(text),withoutPrefix=s.replace(/^(?:(?:enfermera|enfermero|enfermeria|por favor|solicito|necesito|pido|quiero|orden|indico)\s+)+/,'');
 const input=withoutPrefix;
 const aliases=[];
 const add=(kind,id,term,priority=1)=>{
  const phrase=norm(term);if(phrase.length<3&&phrase!=='o2')return;
  aliases.push({kind,id,phrase,priority});
 };
 const defs=[
  ['monitor','monitor',['monitor','monitorizar','monitorear','monitorizacion','monitoreo','conectar monitor','poner monitor','pone monitor']],
  ['iv','iv',['vias','via','dos vias','2 vias','accesos venosos','acceso venoso','vias perifericas','via periferica','accesos perifericos','acceso periferico','dos accesos perifericos','2 accesos perifericos','dos accesos venosos','2 accesos venosos','cateter venoso','cateter periferico','canalizar','canalizacion','venoclisis']],
  ['therapy','fluid',['expansion','expandir','expande','expansion con cristaloides','expandir con cristaloides','reposicion','reposicion de volumen','expansor de volumen','pasar volumen']],
  ['vitals','vitals',['signos vitales','tomar signos','tomar presion','presion arterial','control de signos','controlar signos','saturacion','constantes vitales']],
  ['surgery','cirugia',['cirugia','cirujano','cirujana','quirofano','operar','laparotomia','control del foco','control de foco']],
 ];
 for(const [kind,id,list] of defs)for(const alias of list)add(kind,id,alias,4);
 for(const item of studies||[])for(const alias of [item.label,...(item.aliases||[])])add('study',item.id,alias,3);
 for(const item of therapies||[])for(const alias of [item.label,...(item.aliases||[])])add('therapy',item.id,alias,2);
 for(const item of interventions||[])for(const alias of [item.label,...(item.aliases||[])])
  add(item.id==='source_control'||item.id==='surgery'?'surgery':'therapy',item.id==='source_control'||item.id==='surgery'?'cirugia':item.id,alias,2);
 // Scan distinct word boundaries; longer clinical phrases take precedence.
 const offers=[];
 for(const a of aliases){
  let from=0,i;
  while((i=input.indexOf(a.phrase,from))>=0){
   from=i+1;
   if((i===0||input[i-1]===' ')&&(i+a.phrase.length===input.length||input[i+a.phrase.length]===' '))
    offers.push({...a,start:i,end:i+a.phrase.length});
  }
 }
 offers.sort((a,b)=>(b.end-b.start)-(a.end-a.start)||b.priority-a.priority||a.start-b.start);
 const chosen=[];
 for(const x of offers)if(!chosen.some(y=>x.start<y.end&&y.start<x.end))chosen.push(x);
 chosen.sort((a,b)=>a.start-b.start);
 const result=[];
 const relevantNegation=/\b(?:no|sin|evitar|evita|nunca|suspender|suspende|cancelar)\b/;
 for(let index=0;index<chosen.length;index++){
  const item=chosen[index];
  const before=input.slice(index?chosen[index-1].end:0,item.start).replace(/\s+/g,' ');
  const scoped=before.split(/\b(?:y|pero|luego|despues|ademas|,)\b/).pop();
  const negated=relevantNegation.test(scoped||'');
  const phrase=input.slice(item.start,chosen.find(x=>x.start>item.start)?.start??input.length)
   .replace(/\s+(?:y|e|ademas|mas)\s*$/,'').trim();
  const count=item.kind==='iv'&&/\b(?:dos|2)\s+(?:vias|accesos)/.test(input.slice(Math.max(0,item.start-5),item.end+9))?2:1;
  const duplicate=result.some(x=>x.id===item.id&&x.kind===item.kind&&!x.negated);
  if(!duplicate)result.push({...item,text:phrase,count,negated});
 }
 // Unknown trailing clauses should be explicitly rejected, not silently lost.
 const segments=[];
 let previous=0;
 for(const x of chosen){segments.push(input.slice(previous,x.start));previous=x.end;}
 segments.push(input.slice(previous));
 const neutral=/\b(?:enfermera|enfermero|por|favor|y|e|ademas|mas|pero|con|de|del|la|el|los|las|un|una|al|para|que|me|le|lo|podes|puedes|quiero|pido|necesito|indico|solicito|poner|pone|pongan|pongas|poneme|ponga|canaliza|canalicen|canalizame|conecta|conectame|dar|pasar|pasale|prepara|hacer|hace|tomar|tomale|colocar|controlar|dos|2|una|1|no|sin|evitar|ml|mg|g|litros|litro|cuatro|tres|cinco|seis|canula|nasal|mascara|lpm|min|por|iv|endovenoso|intravenoso|l|cada|ahora|primero|despues|cuanto|tanto)\b/g;
 const unknown=segments.map(x=>x.replace(neutral,' ').replace(/\b\d+(?:\s*\d+)?\b/g,' ').replace(/\s+/g,' ').trim()).filter(x=>x.length>=4);
 return {addressed:/^(?:enfermera|enfermero|enfermeria)\b/.test(s),items:result,unknown,
  active:!/\?/.test(String(text))&&!/^(?:no|nunca|sin|evitar)\b/.test(input)};
}
