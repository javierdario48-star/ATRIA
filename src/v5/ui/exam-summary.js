import {EXAM_REGIONS,EXAM_TECHNIQUES} from '../clinical/exam-contract.js';

// Only confirmed observations may be summarized. The legacy placeholder is
// missing scenario coverage, NOT a normal physical exam.
const absent=/^(?:Sin hallazgo específico modelado en este escenario\.?|—)$/i;
export function visibleExamFinding(text){
 const value=String(text||'').trim();
 if(!value||absent.test(value)||/no disponible en esta simulaci[oó]n/i.test(value))return '—';
 return value.replace(/,?\s*sin focalidad neurol[oó]gica modelada\.?/i,'').trim().replace(/\.$/,'')||'—';
}
const coords=Object.freeze({
 general:[70,44],skin:[27,142],thorax:[70,82],abdomen:[70,137],
 liver:[83,132],spleen:[55,135],renal:[84,151],
 perineum:[70,179],pulses:[91,252],neurological:[70,29]
});
export function examMissing(text){return !text||absent.test(String(text).trim());}
function relevantText(text){
 const clean=String(text||'').trim();
 return examMissing(clean)?null:visibleExamFinding(clean);
}
function compactText(text,max=104){
 const input=String(text||'').trim();
 if(input.length<=max)return input;
 const clauses=input.split(/;\s*|\.\s+/).map(x=>x.trim()).filter(Boolean);
 let short='';
 for(const clause of clauses){
  if(short.length+clause.length+2>max)break;
  short+=(short?' · ':'')+clause;
 }
 return short||input.slice(0,max-1).replace(/\s+\S*$/,'')+'…';
}
export function examinedRegions(patient){
 const records=patient?.examFindings||{};
 const sections=[];
 for(const [regionId,region] of Object.entries(EXAM_REGIONS)){
  const entries=records[regionId];
  if(!entries)continue;
  const methods=[];
  for(const technique of region.techniques){
   const entry=entries[technique];if(!entry)continue;
   const findings=(entry.rows||[]).map(row=>({organ:row.organ,text:visibleExamFinding(row.text),
    known:!!relevantText(row.text)}));
   methods.push({id:technique,label:EXAM_TECHNIQUES[technique],findings});
  }
  if(!methods.length)continue;
  const details=methods.flatMap(m=>m.findings.filter(f=>f.known).map(f=>f.text));
  const summary=details.length?compactText(details.slice(0,2).join(' · '),140):
   '—';
  sections.push({id:regionId,label:region.label,methods,details,
   status:details.length?'observed':'unmodeled',summary,
   marker:coords[regionId]||null});
 }
 if(patient?.glasgow&&['eye','verbal','motor'].some(k=>patient.glasgow[k])){
  const entries=['eye','verbal','motor'].filter(k=>patient.glasgow[k]);
  sections.push({id:'neurological',label:'Neurológico',methods:[],details:entries.map(k=>
   patient.glasgow[k].text),status:'observed',
   summary:patient.glasgow.total==null?'Glasgow parcial':'Glasgow '+patient.glasgow.total+'/15',
   marker:coords.neurological});
 }
 return sections;
}
export function progressiveExamImpression(patient){
 const sections=examinedRegions(patient);
 const findings=sections.filter(s=>s.status==='observed').map(s=>({
  region:s.label,text:compactText(s.details[0],96),regionId:s.id
 }));
 return {
  examined:sections.length,
  pending:Object.keys(EXAM_REGIONS).length-sections.filter(s=>s.id!=='neurological').length,
  findings,
  summary:findings.length?findings.slice(0,4).map(f=>f.region+': '+f.text).join(' · '):
   sections.length?'—':
    'Pendiente de exploración.'
 };
}
export function examRegionStatus(patient,regionId){
 const section=examinedRegions(patient).find(s=>s.id===regionId);
 return section?.status||'pending';
}
