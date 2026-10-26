// Lightweight command vocabulary shared by router, UI and clinical policy.
export const EXAM_TECHNIQUES=Object.freeze({general:'Impresión general',inspection:'Inspección',
 auscultation:'Auscultación',percussion:'Percusión',palpation:'Palpación',rectal:'Tacto rectal'});
export const EXAM_REGIONS=Object.freeze({
 general:{label:'General',techniques:['general']},skin:{label:'Piel y mucosas',techniques:['inspection']},
 thorax:{label:'Tórax',techniques:['inspection','auscultation']},
 abdomen:{label:'Abdomen',techniques:['inspection','auscultation','percussion','palpation']},
 liver:{label:'Hígado',techniques:['percussion','palpation']},spleen:{label:'Bazo',techniques:['percussion','palpation']},
 renal:{label:'Región renal',techniques:['percussion']},perineum:{label:'Periné',techniques:['inspection','rectal']},
 pulses:{label:'Pulsos periféricos',techniques:['palpation']}
});
export const GLASGOW_COMPONENTS=Object.freeze({eye:'Apertura ocular',verbal:'Respuesta verbal',motor:'Respuesta motora'});
// Retain legacy case data/checkpoints, but never dispatch a physician's
// examination as a new nurse study or announce an old result as nurse speech.
export const isPhysicianExamStudy=id=>id==='g_fecal_rectal';
// These are physician panel actions, rather than speech to a patient or nurse.
export const isExaminationCommand=text=>/^\s*\/(?:examen|glasgow)(?:\s|$)/i.test(String(text||''));
export const isExaminationKind=kind=>kind==='exam.record'||kind==='exam.glasgow';
export function validExamSelection(regionId,technique){
 return Object.hasOwn(EXAM_REGIONS,regionId)&&EXAM_REGIONS[regionId].techniques.includes(technique);
}
