// Academic GI case expansion for V5. These are declarative case rules, NOT
// a parallel runtime. Timing, drugs, patients, XP and end-of-shift remain V5-owned.
const rules={
 'VARIX-001':{destinations:['procedimiento','uti'],study:[['g_varix_cbc']],treatment:[['iv','fluid','ceftriaxone','terlipressin'],['iv','transfusion','ceftriaxone','terlipressin']],consult:{procedimiento:['gastro'],uti:['uti']}},
 'ENCEF-001':{destinations:['sala','uti'],study:[['g_encef_liver'],['g_encef_infect']],treatment:[['lactulose']],consult:{uti:['uti']}},
 'UC-AS-001':{destinations:['sala','uti'],study:[['g_uc_labs'],['g_uc_cdi']],requiredStudies:['g_uc_cdi'],treatment:[['methylprednisolone']],consult:{uti:['uti']}},
 'CDI-001':{destinations:['sala'],study:[['g_cdi_toxin']],treatment:[['fidaxomicin'],['vancomycin_po']]},
 'DIVERT-001':{destinations:['alta','sala'],study:[['g_divert_ct']],treatment:[],dischargeTreatments:['followup']},
 'LGIB-001':{destinations:['procedimiento','uti'],study:[['g_lgib_cbc'],['g_lgib_cta']],treatment:[['iv','fluid'],['iv','transfusion']],consult:{procedimiento:['gastro'],uti:['uti']}},
 'HEPAT-001':{destinations:['alta','observacion'],study:[['g_hepat_inr']],treatment:[],dischargeTreatments:['followup']},
 'DIARR-001':{destinations:['alta','observacion'],study:[['g_diarr_elect']],treatment:[['oral_rehydration'],['fluid']]},
 'FECAL-001':{destinations:['alta','observacion'],study:[],requiredExams:['perineum:rectal'],treatment:[['disimpaction']]},
 'PUD-001':{destinations:['alta'],study:[['g_pud_hpy'],['g_pud_egd']],treatment:[['ppi_oral']],dischargeTreatments:['followup']},
 'CELIAC-001':{destinations:['alta'],study:[['g_celiac_biopsy']],treatment:[['followup']]},
 'ACAL-001':{destinations:['alta','observacion'],study:[['g_achal_manometry'],['g_achal_egd']],requiredStudies:['g_achal_manometry','g_achal_egd'],treatment:[['followup']]}
};
export const GASTRO_CASE_RULES=Object.freeze(Object.fromEntries(Object.entries(rules).map(([id,rule])=>[id,Object.freeze({...rule})])));
export const GASTRO_CASE_CONDUCTS=Object.freeze({
 'VARIX-001':[],
 'ENCEF-001':['lactulose','rifaximin'],
 'UC-AS-001':[],
 'CDI-001':['fidaxomicin','vancomycin_po'],
 'DIVERT-001':['oral_hydration','followup'],
 'LGIB-001':[],
 'HEPAT-001':['followup','oral_hydration'],
 'DIARR-001':['oral_rehydration'],
 'FECAL-001':['disimpaction','enema','followup'],
 'PUD-001':['ppi_oral','followup'],
 'CELIAC-001':['glutenfree_plan','followup'],
 'ACAL-001':['swallow_precaution','followup']
});
export const GASTRO_DYNAMICS=Object.freeze({
 // Offsets temp, pulse, respiratory rate, systolic, diastolic, saturation.
 // Only volume replacement and vasoactive variceal bridging have a bounded
 // circulatory response here. Inflammation has a slower, limited fever/pulse
 // response; it cannot restore blood pressure or oxygenation directly.
 'VARIX-001':{early:[0,21,3,-18,-9,-1],late:[0,14,4,-16,-8,-2],earlyEnd:100,lateEnd:360,therapy:'terlipressin',protection:.36,protectionAxes:['hr','sys','dia'],fluidResponse:.75},
 'ENCEF-001':{early:[.1,6,1,-2,-1,0],late:[.1,4,1,-2,-1,-.3],earlyEnd:220,lateEnd:800,therapy:'lactulose',protection:0,fluidResponse:0},
 'UC-AS-001':{early:[.3,8,2,-5,-2,-.3],late:[.5,10,2,-9,-4,-.5],earlyEnd:150,lateEnd:550,therapy:'methylprednisolone',protection:.2,protectionAxes:['temp','hr'],onset:60,peak:240,fluidResponse:.45},
 'CDI-001':{early:[.3,10,2,-8,-4,-.2],late:[.5,12,3,-12,-7,-.6],earlyEnd:140,lateEnd:500,therapy:['fidaxomicin','vancomycin_po'],protection:.3,protectionAxes:['temp','hr'],onset:60,peak:240,fluidResponse:.8},
 'DIVERT-001':{early:[.1,3,0,-1,0,0],late:[.1,2,0,-1,0,0],earlyEnd:280,lateEnd:1100,therapy:null,protection:0,fluidResponse:0},
 'LGIB-001':{early:[0,15,3,-12,-7,-.4],late:[0,18,3,-13,-7,-1],earlyEnd:130,lateEnd:460,therapy:null,protection:0,fluidResponse:.9},
 'HEPAT-001':{early:[.1,3,0,-1,-1,0],late:[.1,2,1,-1,0,0],earlyEnd:300,lateEnd:1100,therapy:null,protection:0,fluidResponse:0},
 'DIARR-001':{early:[.1,10,1,-7,-4,0],late:[.15,11,2,-9,-5,-.1],earlyEnd:180,lateEnd:620,therapy:'oral_rehydration',protection:.5,protectionAxes:['hr','sys','dia'],fluidResponse:.8},
 'FECAL-001':{early:[0,2,0,-1,0,0],late:[0,2,0,-1,0,0],earlyEnd:350,lateEnd:1200,therapy:'disimpaction',protection:0,fluidResponse:0},
 'PUD-001':{early:[0,2,0,0,0,0],late:[0,1,0,0,0,0],earlyEnd:420,lateEnd:1200,therapy:null,protection:0,fluidResponse:0},
 'CELIAC-001':{early:[0,1,0,0,0,0],late:[0,1,0,0,0,0],earlyEnd:600,lateEnd:1200,therapy:null,protection:0,fluidResponse:0},
 'ACAL-001':{early:[0,1,0,0,0,0],late:[0,1,0,0,0,0],earlyEnd:600,lateEnd:1200,therapy:null,protection:0,fluidResponse:0}
});
export const GASTRO_CLOSURE_TEXT=Object.freeze({
 'VARIX-001':'Transferencia para endoscopía/UTI aceptada. No se documenta ligadura de várices realizada.',
 'ENCEF-001':'Paciente derivado para búsqueda y control de precipitantes; no se presume resolución de encefalopatía.',
 'UC-AS-001':'Internación por colitis ulcerosa grave: respuesta a corticoides se evaluará a 72 horas, fuera de esta guardia.',
 'CDI-001':'Seguimiento de infección confirmada y manejo de volumen, con tratamiento dirigido.',
 'DIVERT-001':'Diverticulitis no complicada: plan de seguimiento y señales de alarma, sin antibiótico rutinario obligatorio.',
 'LGIB-001':'Traslado hemodinámico/endoscópico aceptado. No se afirma hemostasia realizada.',
 'HEPAT-001':'Evaluación de hepatitis e INR documentada; no confundir hepatitis aguda con insuficiencia hepática aguda.',
 'DIARR-001':'Reposición de pérdidas, tolerancia y seguimiento; evitar antibiótico empírico rutinario en diarrea acuosa.',
 'FECAL-001':'Impactación abordada con reevaluación y prevención, sin cirugía ficticia.',
 'PUD-001':'Plan de inhibición ácida y H. pylori; erradicación requiere evaluación y tratamiento completo posterior.',
 'CELIAC-001':'Diagnóstico investigado y seguimiento nutricional; no se atribuye curación inmediata.',
 'ACAL-001':'Derivación para estudio de motilidad y tratamiento definitivo; ningún procedimiento fue simulado.'
});
