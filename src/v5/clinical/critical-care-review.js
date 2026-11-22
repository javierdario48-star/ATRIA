import {hasAcuteInstability} from './clinical-risk.js';
/** Effective V19 mentorAcuity + csConsultAdvice('uti'). The original reply
 * declines a critical bed while stable and accepts higher-complexity care
 * otherwise. No diagnosis, treatment, operation or vital write is inferred.
 */
export function criticalCareReview487(v,{recentShock=false,criticalIllness=false}={}){
 const unstable=hasAcuteInstability(v);
 const accepted=unstable||recentShock||criticalIllness;
 if(criticalIllness&&!unstable)return {accepted:true,status:'accepted',reason:
  'UTI acepta el cuadro crítico con soporte y vigilancia continuos; la estabilidad bajo soporte no elimina la necesidad de ingreso crítico.'};
 if(recentShock&&!unstable)return {accepted:true,status:'accepted',reason:
  'UTI evalúa: antecedente reciente de shock pese a la respuesta al soporte. Aceptamos el ingreso crítico; mantener reanimación y vigilancia durante el traslado.'};
 return {accepted,status:accepted?'accepted':'stable',reason:accepted?
  'UTI evalúa: cuadro con criterios de alta complejidad; mantener reanimación y preparar ingreso crítico.':
  'UTI evalúa: por ahora no requiere cama crítica si mantiene estabilidad; reevaluar ante deterioro.'};
}
