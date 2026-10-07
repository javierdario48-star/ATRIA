const sections=['general','inspection','palpation','percussion','auscultation'];
export function createPhysicalExam(){return Object.fromEntries(sections.map(k=>[k,{done:false,finding:null,at:null}]))}
export function recordExam(exam,section,finding,at=Date.now()){if(!sections.includes(section))throw new Error('unknown exam section');return{...exam,[section]:{done:true,finding,at}}}
export function examSummary(exam){return sections.filter(k=>exam?.[k]?.done).map(k=>({section:k,finding:exam[k].finding,at:exam[k].at}))}
export{sections as PHYSICAL_EXAM_SECTIONS};