import {studyNorm} from './study-registry.js';
const verbs=new Set(['pedi','pedime','pedir','solicita','solicito','solicitar','haceme','hace','hacer','quiero','ordena','ordenar','necesito','realiza','realizar','sacame']);
const negative=/\b(no|nunca|tampoco|sin|evita|evitar|cancelar|cancela|descarta)\b/;
const question=/[?¿]/;
function tokens(s){return studyNorm(s).split(' ').filter(Boolean)}
function candidates(st){return [st.label,...(st.aliases||[])].filter(Boolean)}
export function parseNaturalStudyOrders(input,caseStudies,catalog){
 const text=studyNorm(input),parts=tokens(input);
 if(!parts.some(x=>verbs.has(x))||negative.test(text)||question.test(String(input)))return [];
 const matches=[];
 for(const study of [...(caseStudies||[]),...(catalog||[])]){
  for(const alias of candidates(study)){
   const ts=tokens(alias);if(!ts.length)continue;
   for(let i=0;i<=parts.length-ts.length;i++){
    if(ts.every((t,j)=>parts[i+j]===t))matches.push({study,start:i,end:i+ts.length,size:ts.length});
   }
  }
 }
 matches.sort((a,b)=>b.size-a.size||a.start-b.start);
 const selected=[],occupied=new Set(),seen=new Set();
 for(const m of matches){
  if(seen.has(m.study.id))continue;
  if(Array.from({length:m.end-m.start},(_,i)=>m.start+i).some(i=>occupied.has(i)))continue;
  selected.push(m.study);seen.add(m.study.id);
  for(let i=m.start;i<m.end;i++)occupied.add(i);
 }
 return selected;
}
