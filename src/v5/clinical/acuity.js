// Single read-only physiological severity rule for reception and connected monitors.
// Initial high-risk referrals can be urgent; current measurements always take precedence.
const finite = value => value === null || value === undefined || value === '' ? NaN : Number(value);
const abnormalRhythms = new Set(['asystole','ventricular_fibrillation','ventricular_tachycardia']);
export function clinicalAcuity(vitals, {dead=false, rhythm=null, highRisk=false}={}){
 const v=vitals||{};
 const pressure=String(v.bp??'').split('/');
 const sys=finite(v.sys??pressure[0]),dia=finite(v.dia??pressure[1]);
 const hr=finite(v.hr),spo2=finite(v.spo2),rr=finite(v.rr),temp=finite(v.temp);
 const result=(state,label,color,priority,reason)=>({state,label,color,priority,reason});
 if(dead||abnormalRhythms.has(rhythm))
  return result('critical','CRÍTICO','red',3,'Paro, muerte o arritmia grave');
 if(![sys,dia,hr,spo2,rr].every(Number.isFinite))
  return result('unknown','SIN DATOS','gray',0,'Signos vitales incompletos');
 const map=(sys+2*dia)/3;
 if(sys<80||map<55||spo2<90||hr<40||hr>=130||rr<8||rr>=35)
  return result('critical','CRÍTICO','red',3,'Signos vitales críticos');
 if(highRisk||sys<95||map<65||spo2<92||hr<50||hr>=120||rr<10||rr>=30)
  return result('urgent','URGENTE','orange',2,'Requiere valoración prioritaria');
 if(sys<105||map<75||spo2<96||hr<55||hr>=100||rr>=22||
   (Number.isFinite(temp)&&(temp<35||temp>=38)))
  return result('warning','VIGILANCIA','yellow',1,'Alteración de signos vitales');
 return result('stable','ESTABLE','green',0,'Sin signos de alarma');
}
