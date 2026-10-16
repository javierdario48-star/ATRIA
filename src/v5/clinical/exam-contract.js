// Lightweight command vocabulary shared by router, UI and clinical policy.
export const EXAM_TECHNIQUES=Object.freeze({general:'Impresión general',inspection:'Inspección',
 auscultation:'Auscultación',percussion:'Percusión',palpation:'Palpación'});
export const EXAM_REGIONS=Object.freeze({
 general:{label:'General',techniques:['general']},skin:{label:'Piel y mucosas',techniques:['inspection']},
 thorax:{label:'Tórax',techniques:['inspection','auscultation']},
 abdomen:{label:'Abdomen',techniques:['inspection','auscultation','percussion','palpation']},
 liver:{label:'Hígado',techniques:['percussion','palpation']},spleen:{label:'Bazo',techniques:['percussion','palpation']},
 renal:{label:'Región renal',techniques:['percussion']},perineum:{label:'Periné',techniques:['inspection']},
 pulses:{label:'Pulsos periféricos',techniques:['palpation']}
});
export const GLASGOW_COMPONENTS=Object.freeze({eye:'Apertura ocular',verbal:'Respuesta verbal',motor:'Respuesta motora'});
export function validExamSelection(regionId,technique){
 return Object.hasOwn(EXAM_REGIONS,regionId)&&EXAM_REGIONS[regionId].techniques.includes(technique);
}
