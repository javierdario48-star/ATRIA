// Separate review-only rules for therapies without a verified V4 response.
// A new gastrointestinal drug must NEVER borrow an unrelated drug's positive
// pharmacodynamics. Case-specific native physiology owns documented effects.
const items={
 terlipressin:['vasoactive','iv',['ischemic-risk','hyponatremia']],
 methylprednisolone:['steroid','iv',['infection-risk','glucose-risk']],
 lactulose:['osmotic-laxative','oral',['dehydration','diarrhea']],
 rifaximin:['antibiotic','oral',['allergy']],
 fidaxomicin:['antibiotic','oral',['allergy']],
 vancomycin_po:['antibiotic','oral',['allergy']],
 oral_hydration:['fluid','oral',['fluid-overload']],
 oral_rehydration:['fluid','oral',['fluid-overload']],
 followup:['care-plan','documented',[]],
 disimpaction:['procedure','rectal',['trauma']],
 enema:['procedure','rectal',['perforation']],
 ppi_oral:['acid-suppression','oral',['allergy']],
 glutenfree_plan:['nutrition','documented',[]],
 swallow_precaution:['care-plan','documented',[]]
};
export const GASTRO_REVIEW_ONLY=Object.freeze(Object.fromEntries(
 Object.entries(items).map(([id,[classId,route,hazards]])=>[id,
  Object.freeze({classId,route,mechanism:'unmodeled',
   indications:[],hazards,onsetMin:null,peakMin:null})])));
export const GASTRO_CONDUCT_DOSES=Object.freeze({
 lactulose:{amount:30,unit:'ml',route:'oral',label:'Lactulosa 30 ml por boca'},
 rifaximin:{amount:550,unit:'mg',route:'oral',label:'Rifaximina 550 mg por boca'},
 fidaxomicin:{amount:200,unit:'mg',route:'oral',label:'Fidaxomicina 200 mg por boca'},
 vancomycin_po:{amount:125,unit:'mg',route:'oral',label:'Vancomicina oral 125 mg'},
 ppi_oral:{amount:20,unit:'mg',route:'oral',label:'Omeprazol 20 mg por boca'}
});
