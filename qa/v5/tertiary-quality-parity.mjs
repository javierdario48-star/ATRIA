import {compareMedicalPeritonitisQuality} from './medical-peritonitis-quality.mjs';
await compareMedicalPeritonitisQuality({caseId:'PERI-TER-001',diagnosis:'peritonitis terciaria',destination:'uti',
 questions:{surgery_history:'¿Cuántas operaciones previas?',course:'¿Evolución desde la cirugía?',immuno:'¿Tiene defensas bajas?'},
 studies:['ter_cbc','ter_ct'],pendingStudies:['ter_culture'],consult:true,
 orders:spec=>['Ringer 1000 ml',spec.alternative?'imipenem 500 mg':'piperacilina tazobactam 4.5 g','noradrenalina 0.05 mcg/kg/min IV','oxigeno 4 L/min'],reportName:'tertiary-quality-parity'});
