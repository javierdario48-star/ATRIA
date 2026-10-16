// Effective cs413-monitor-walk-v4_1_3 screen centres on the unchanged artwork.
const screens=Object.freeze({B1:[48,361],B2:[184,371],B3:[830,394],B4:[978,391],
 B5:[48,588],B6:[48,766],B7:[976,589],B8:[976,766]});
export function bedsideMonitor(patient,map,beds){
 const bed=beds.find(b=>b.id===patient.bedId),point=screens[patient.bedId];
 const mapped=bed&&point&&Math.hypot(patient.x-bed.patient[0],patient.y-bed.patient[1])<2;
 const [x,y]=mapped?point:[patient.x+(patient.x<map.source_size_px[0]/2?-42:42),patient.y-43];
 return {x,y,width:38,height:34,added:!mapped||patient.bedId==='B4'};
}
