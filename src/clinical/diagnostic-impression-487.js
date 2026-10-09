// ATRIA 4.8.7 QA — shared, case-independent diagnostic vocabulary.
// A new case contributes diagnoses through its existing C.dx (and optional
// diagnosticTerms/diagnosticAliases). The editor NEVER filters by active case:
// doing so would disclose the hidden answer.
//
// Curated variants extend language coverage without overriding source cases.
// Keep all classification pure so new case onboarding can be tested in Node.
export const DX_EXTRA_TERMS_487 = Object.freeze([
 {label:'Peritonitis bacteriana espontánea',aliases:['PBE','peritonitis espontánea del cirrótico','peritonitis espontánea']},
 {label:'Peritonitis secundaria',aliases:['peritonitis por perforación','peritonitis por perforación intestinal','peritonitis secundaria por perforación','abdomen agudo perforativo','perforación de víscera hueca con peritonitis']},
 {label:'Peritonitis terciaria',aliases:['peritonitis posoperatoria persistente','peritonitis persistente posoperatoria']},
]);
export function csDxNorm487(s) {
 return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
   .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
export function csDxCatalog487(cases,extras=DX_EXTRA_TERMS_487) {
 const known=new Map(),add=(name,aliases=[])=>{
   const label=String(name||'').trim(),id=csDxNorm487(label);
   if(!id||id.length<3)return;
   const all=[label,...aliases].map(x=>String(x||'').trim()).filter(Boolean);
   if(!known.has(id))known.set(id,{label,aliases:[]});
   const item=known.get(id);
   for(const term of all)if(!item.aliases.some(x=>csDxNorm487(x)===csDxNorm487(term)))item.aliases.push(term);
 };
 for(const entry of extras||[])add(entry.label,entry.aliases||[]);
 for(const c of cases||[]) {
   if(!Array.isArray(c?.dx))continue;
   // The reference catalogue is data-driven and global, not patient-specific.
   // The first dx is a canonical display label, while equivalents can still
   // appear as selectable refinements (e.g. 'peritonitis por perforación').
   for(const term of [...c.dx,...(c.diagnosticTerms||[]),...(c.diagnosticAliases||[])])add(term);
 }
 return [...known.values()];
}
export function csDxSuggest487(catalog,query,limit=8) {
 const n=csDxNorm487(query);
 if(n.length<2)return [];
 const tokens=n.split(' ').filter(Boolean);
 const entries=[];
 for(const item of catalog||[]) {
  const forms=[item.label,...(item.aliases||[])].map(csDxNorm487);
  let score=0;
  for(const f of forms){
   if(f===n)score=Math.max(score,105);
   else if(f.startsWith(n+' '))score=Math.max(score,95);
   else if(f.startsWith(n))score=Math.max(score,90);
   else if(f.includes(' '+n))score=Math.max(score,70);
   else if(tokens.every(t=>f.split(' ').some(w=>w.startsWith(t))))score=Math.max(score,58);
  }
  if(score)entries.push({label:item.label,score});
 }
 entries.sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label,'es'));
 return entries.slice(0,Math.max(1,Math.min(12,limit))).map(x=>x.label);
}
export function csDxSpecificity487(cases,value,extras=DX_EXTRA_TERMS_487) {
 const n=csDxNorm487(value);
 if(!n)return {level:'empty',specific:false,tip:'Escribí tu impresión diagnóstica.'};
 const catalog=csDxCatalog487(cases,extras);
 // Do not indicate whether a diagnosis matches the active patient.
 // Only notify when the term is semantically incomplete.
 const exact=catalog.some(x=>x.aliases.some(a=>csDxNorm487(a)===n));
 if(/^(peritonitis|abdomen agudo|infeccion abdominal|sepsis|dolor abdominal|infeccion intraabdominal)$/.test(n)||
    (!exact&&csDxSuggest487(catalog,n,4).length>=2&&n.split(' ').length<=2)) {
  return {level:'broad',specific:false,tip:'Es una impresión amplia. Podés precisar el tipo o la causa; mirá las opciones sin que indiquen cuál es correcta para este paciente.'};
 }
 return {level:'specific',specific:true,tip:'Impresión registrada. Su adecuación clínica se valorará al cerrar el caso.'};
}
export function csDxMatchesCase487(cases,caseId,value,extras=DX_EXTRA_TERMS_487){
 const n=csDxNorm487(value);if(!n||!csDxSpecificity487(cases,value,extras).specific)return false;
 const c=(cases||[]).find(x=>x?.id===caseId);if(!c)return false;
 const aliases=[...(c.dx||[]),...(c.diagnosticAliases||[])];
 // Additional clinically equivalent language across multiple phrasings.
 const supplemental={
  'PERI-PBE-001':['peritonitis espontánea','infección espontánea del líquido ascítico'],
  'PERI-SEC-001':['abdomen agudo perforativo','peritonitis por perforación intestinal','perforación intestinal con peritonitis'],
  'PERI-TER-001':['peritonitis posoperatoria persistente','infección intraabdominal posoperatoria persistente']
 };
 aliases.push(...(supplemental[caseId]||[]));
 return aliases.some(a=>{const x=csDxNorm487(a);return x&&(n===x||n.startsWith(x+' ')||n.endsWith(' '+x));});
}
