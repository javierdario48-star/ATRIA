import {compareMedicalPeritonitisQuality} from './medical-peritonitis-quality.mjs';
await compareMedicalPeritonitisQuality({caseId:'PERI-PBE-001',diagnosis:'peritonitis bacteriana espontanea',destination:'sala',
 questions:{cirrhosis:'¿Tiene cirrosis?',ascites:'¿Tiene ascitis?',fever:'¿Tuvo fiebre?',confusion:'¿Notó confusión?'},
 studies:['pbe_paracentesis','pbe_renal'],orders:spec=>[spec.alternative?'imipenem 500 mg':'ceftriaxona 1 g','albumina 1.5 g/kg'],reportName:'pbe-quality-parity'});
