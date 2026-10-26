// Explicitly connected case policies, shared by composition and presentation.
// Catalogue/profile presence alone never marks a case as clinically playable.
export const CLINICAL_EXECUTORS=Object.freeze({
 'CIRR-001':'cirr','APP-001':'app','CHOLANG-001':'cholangitis',
 'CHOLE-001':'chole','PANC-001':'panc',
 'CROHN-001':'additional','HDA-001':'additional','COLON-001':'additional',
 'ILEO-001':'additional','MESI-001':'additional',
 ...Object.fromEntries(['VARIX-001','ENCEF-001','UC-AS-001','CDI-001','DIVERT-001','LGIB-001',
  'HEPAT-001','DIARR-001','FECAL-001','PUD-001','CELIAC-001','ACAL-001'].map(id=>[id,'additional'])),
 'PERI-SEC-001':'peritonitis','PERI-PBE-001':'peritonitis','PERI-TER-001':'peritonitis'
});
