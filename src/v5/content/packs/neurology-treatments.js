// Declarative adult neurological treatments. The shared V5 medication owner,
// nursing confirmation, access checks and receipts execute these definitions.
// Weight-based amounts are per kg; regimen caps apply to the total dose.
export const NEUROLOGY_TREATMENTS = Object.freeze({
 alteplase_stroke: {
  id: 'alteplase_stroke', classId: 'thrombolytic', label: 'Alteplasa IV para ACV isquémico elegible',
  aliases: ['alteplasa', 'alteplase', 'rtpa', 'rt-pa', 'trombolisis cerebral', 'trombólisis iv'],
  kind: 'medication', route: 'iv', dose: {amount: 0.9, unit: 'mg/kg', display: '0,9 mg/kg IV (máximo 90 mg); 10% en bolo de 1 min y resto en 60 min'},
  min: 0.9, max: 0.9, preparationSeconds: 60, latencyMinutes: 5, peakMinutes: 60, durationMinutes: 120,
  hazards: ['intracranial_hemorrhage', 'active_bleeding', 'orolingual_angioedema', 'uncontrolled_hypertension', 'recent_anticoagulant_exposure'],
  indications: ['eligible_disabling_ischemic_stroke'], requiresAccess: true,
  regimen: {maximumTotalMg: 90, bolusFraction: 0.1, bolusMinutes: 1, infusionMinutes: 60, maximumStandardOnsetMinutes: 270,
   avoidAntithromboticsMinutes: 1440, followupImagingBeforeAntithrombotics: true,
   contraindications: ['intracranial hemorrhage', 'suspected subarachnoid hemorrhage', 'active internal bleeding', 'BP above 185/110 despite treatment', 'INR above 1.7 with VKA', 'recent DOAC with relevant anticoagulant effect unless specialist testing excludes it', 'recent intracranial surgery or severe head injury']}
 },
 thrombectomy: {
  id: 'thrombectomy', classId: 'procedure', label: 'Trombectomía mecánica cerebral',
  aliases: ['trombectomia', 'trombectomía mecánica', 'thrombectomy', 'reperfusión endovascular cerebral'],
  kind: 'procedure', route: 'procedure', dose: {amount: 1, unit: 'procedure', display: '1 procedimiento endovascular por equipo neurointervencionista, tras selección por imagen'},
  min: 1, max: 1, preparationSeconds: 180, latencyMinutes: 15, peakMinutes: 90, durationMinutes: 1440,
  hazards: ['intracranial_hemorrhage', 'arterial_injury', 'contrast_reaction', 'reperfusion_injury'],
  indications: ['selected_large_vessel_occlusion'], requiresAccess: true,
  regimen: {executionMinutes: 45, requiresCompletedReceipt: true, requiresVascularImaging: true, requiresEligibleImagingProfile: true, maximumSelectedOnsetMinutes: 1440,
   transferIsNotProcedure: true, contraindications: ['no treatable large-vessel occlusion', 'intracranial hemorrhage', 'ineligible imaging or clinical profile']}
 },
 stroke_prevention: {
  id: 'stroke_prevention', classId: 'conduct', label: 'Plan de unidad ACV y prevención secundaria',
  aliases: ['prevencion secundaria acv', 'prevención secundaria', 'unidad acv', 'codigo acv', 'código ictus', 'plan ait'],
  kind: 'conduct', route: 'procedure', dose: {amount: 1, unit: 'plan', display: 'Unidad ACV, evaluación de deglución, monitor cardíaco y plan etiológico de prevención secundaria'},
  min: 1, max: 1, preparationSeconds: 30, latencyMinutes: 60, peakMinutes: 1440, durationMinutes: 10080,
  hazards: ['delay_of_reperfusion_if_used_as_substitute', 'aspiration_if_oral_intake_before_swallow_screen'],
  indications: ['ischemic_stroke', 'high_risk_tia'], requiresAccess: false,
  regimen: {executionMinutes: 2, requiresCompletedReceipt: true, includesMedicationAdministration: false, swallowScreenBeforeOralIntake: true, rhythmMonitoring: true,
   note: 'No equivale a administrar aspirina, clopidogrel o estatina; requiere indicaciones y recibos propios. No sustituye reperfusión elegible.'}
 },
 nicardipine: {
  id: 'nicardipine', classId: 'vasodilator', label: 'Nicardipino IV titulado',
  aliases: ['nicardipino', 'nicardipina', 'nicardipine', 'control tensional iv'],
  kind: 'medication', route: 'iv', dose: {amount: 5, unit: 'mg/h', display: 'Iniciar 5 mg/h IV; titular 2,5 mg/h cada 5–15 min, máximo 15 mg/h según objetivo'},
  min: 3, max: 15, preparationSeconds: 60, latencyMinutes: 5, peakMinutes: 20, durationMinutes: 60,
  hazards: ['hypotension', 'reflex_tachycardia', 'cerebral_hypoperfusion_if_excessive', 'advanced_aortic_stenosis'],
  indications: ['hypertensive_intracerebral_hemorrhage', 'stroke_blood_pressure_control'], requiresAccess: true,
  regimen: {titrationStepMgPerHour: 2.5, titrationIntervalMinutes: [5, 15], continuousBloodPressureMonitoring: true,
   stopForHypotension: true, contraindications: ['advanced aortic stenosis', 'hypotension']}
 },
 anticoagulation_reversal: {
  id: 'anticoagulation_reversal', classId: 'reversalAgent', label: 'Reversión urgente de warfarina con 4F-PCC y vitamina K IV',
  aliases: ['revertir warfarina', 'reversion anticoagulacion', 'reversión de anticoagulación', 'pcc y vitamina k', 'complejo protrombinico', '4f-pcc'],
  kind: 'medication', route: 'iv', dose: {amount: 25, unit: 'IU/kg', display: 'Para INR 2–<4: 4F-PCC 25 UI/kg (máx. 2500 UI) + vitamina K 10 mg IV lenta'},
  min: 25, max: 50, preparationSeconds: 90, latencyMinutes: 5, peakMinutes: 30, durationMinutes: 1440,
  hazards: ['thrombosis', 'hypersensitivity', 'heparin_induced_thrombocytopenia_if_heparin_containing_product', 'wrong_anticoagulant_reversal'],
  indications: ['warfarin_associated_intracranial_hemorrhage'], requiresAccess: true,
  regimen: {anticoagulant: 'warfarin', vitaminK: {amount: 10, unit: 'mg', route: 'iv'},
   bands: [{inrMin: 2, inrMaxExclusive: 4, unitsPerKg: 25, maximumUnits: 2500}, {inrMin: 4, inrMaxInclusive: 6, unitsPerKg: 35, maximumUnits: 3500}, {inrMinExclusive: 6, unitsPerKg: 50, maximumUnits: 5000}],
   maximumDosingWeightKg: 100, doNotRepeatRoutinely: true, repeatINRMinutes: 30,
   note: 'La reversión depende del anticoagulante. Esta orden combinada es para antagonistas de vitamina K; no sustituye idarucizumab, andexanet o protamina cuando están indicados.'}
 },
 nimodipine: {
  id: 'nimodipine', classId: 'vasodilator', label: 'Nimodipino enteral en HSA aneurismática',
  aliases: ['nimodipino', 'nimodipina', 'nimodipine'],
  kind: 'medication', route: 'oral', dose: {amount: 60, unit: 'mg', display: '60 mg por vía oral/enteral cada 4 h durante 21 días, ajustar si hipotensión'},
  min: 30, max: 60, preparationSeconds: 30, latencyMinutes: 60, peakMinutes: 120, durationMinutes: 240,
  hazards: ['hypotension', 'never_intravenous', 'cyp3a4_interactions', 'aspiration_if_unsafe_swallow'],
  indications: ['aneurysmal_subarachnoid_hemorrhage'], requiresAccess: false,
  regimen: {intervalMinutes: 240, days: 21, enteralOnly: true, preventsDelayedCerebralIschemia: true,
   note: 'No controla por sí solo el aneurisma ni revierte inmediatamente un déficit. Nunca inyectar una formulación oral.'}
 },
 aneurysm_control: {
  id: 'aneurysm_control', classId: 'procedure', label: 'Oclusión neurovascular del aneurisma roto',
  aliases: ['embolizacion aneurisma', 'embolización aneurismática', 'coiling', 'clipado aneurisma', 'control de aneurisma'],
  kind: 'procedure', route: 'procedure', dose: {amount: 1, unit: 'procedure', display: 'Oclusión del aneurisma roto por embolización o clipado, preferentemente dentro de 24 h'},
  min: 1, max: 1, preparationSeconds: 180, latencyMinutes: 30, peakMinutes: 120, durationMinutes: 1440,
  hazards: ['intracranial_hemorrhage', 'cerebral_ischemia', 'arterial_injury', 'anesthetic_complications'],
  indications: ['ruptured_intracranial_aneurysm'], requiresAccess: true,
  regimen: {executionMinutes: 120, requiresCompletedReceipt: true, requiresConfirmedAneurysm: true, transferIsNotProcedure: true, specialistPerformed: true}
 },
 lorazepam: {
  id: 'lorazepam', classId: 'benzodiazepine', label: 'Lorazepam IV para estado epiléptico',
  aliases: ['lorazepam', 'benzodiacepina iv', 'lorazepam endovenoso'],
  kind: 'medication', route: 'iv', dose: {amount: 0.1, unit: 'mg/kg', display: '0,1 mg/kg IV (máximo 4 mg) en 2 min; puede repetirse una vez si persiste la crisis'},
  min: 0.1, max: 0.1, preparationSeconds: 20, latencyMinutes: 1, peakMinutes: 5, durationMinutes: 120,
  hazards: ['respiratory_depression', 'hypotension', 'sedation', 'additive_opioid_sedation'],
  indications: ['convulsive_status_epilepticus'], requiresAccess: true,
  regimen: {maximumDoseMg: 4, administrationMinutes: 2, mayRepeatOnce: true, repeatAfterMinutes: 5, airwayMonitoringRequired: true}
 },
 levetiracetam: {
  id: 'levetiracetam', classId: 'antiepileptic', label: 'Carga IV de levetiracetam',
  aliases: ['levetiracetam', 'levetiracetam carga', 'keppra', 'segunda linea anticonvulsivante'],
  kind: 'medication', route: 'iv', dose: {amount: 60, unit: 'mg/kg', display: 'Carga 60 mg/kg IV (máximo 4500 mg) en 10–15 min tras benzodiacepina'},
  min: 60, max: 60, preparationSeconds: 45, latencyMinutes: 10, peakMinutes: 20, durationMinutes: 720,
  hazards: ['somnolence', 'behavioral_adverse_effects', 'renal_accumulation', 'rare_hypersensitivity'],
  indications: ['benzodiazepine_refractory_status_epilepticus', 'encephalitis_with_seizures'], requiresAccess: true,
  regimen: {maximumDoseMg: 4500, administrationMinutes: 15, renalAdjustmentForMaintenance: true,
   note: 'La carga no sustituye la benzodiacepina inicial. Estado persistente requiere UTI, vía aérea y EEG continuo.'}
 },
 vancomycin_iv: {
  id: 'vancomycin_iv', classId: 'antibiotic', label: 'Vancomicina IV para infección del SNC',
  aliases: ['vancomicina iv', 'vancomicina endovenosa', 'vancomycin iv', 'vancomicina parenteral'],
  kind: 'medication', route: 'iv', dose: {amount: 20, unit: 'mg/kg', display: 'Dosis inicial 20 mg/kg IV; luego 15–20 mg/kg cada 8–12 h según función renal y monitorización'},
  min: 15, max: 25, preparationSeconds: 60, latencyMinutes: 60, peakMinutes: 1440, durationMinutes: 720,
  hazards: ['nephrotoxicity', 'infusion_reaction', 'hypersensitivity', 'renal_accumulation'],
  indications: ['suspected_resistant_pneumococcal_meningitis'], requiresAccess: true,
  regimen: {intervalMinutes: 720, administrationMinutes: 120, maximumInfusionRateMgPerMinute: 10,
   renalAdjustmentRequired: true, therapeuticDrugMonitoringRequired: true,
   note: 'Ajustar dosis/intervalo a peso, función renal, niveles y susceptibilidad; vía IV, no formulación oral.'}
 },
 dexamethasone: {
  id: 'dexamethasone', classId: 'steroid', label: 'Dexametasona IV adyuvante en meningitis',
  aliases: ['dexametasona', 'dexamethasone', 'dexametasona iv'],
  kind: 'medication', route: 'iv', dose: {amount: 10, unit: 'mg', display: '10 mg IV cada 6 h hasta 4 días; primera dosis antes o con el primer antibiótico'},
  min: 10, max: 10, preparationSeconds: 30, latencyMinutes: 60, peakMinutes: 360, durationMinutes: 360,
  hazards: ['hyperglycemia', 'gastrointestinal_bleeding', 'infection_risk', 'not_a_substitute_for_antibiotics'],
  indications: ['suspected_bacterial_meningitis_in_non_epidemic_setting'], requiresAccess: true,
  regimen: {intervalMinutes: 360, days: 4, firstDoseBeforeOrWithAntibiotics: true,
   stopIfCSFNotBacterial: true, note: 'No demorar antibióticos para administrarla. Reevaluar con LCR y agente aislado; no rutinaria durante epidemia meningocócica.'}
 },
 acyclovir: {
  id: 'acyclovir', classId: 'antiviral', label: 'Aciclovir IV empírico para encefalitis',
  aliases: ['aciclovir', 'acyclovir', 'aciclovir iv', 'antiviral encefalitis'],
  kind: 'medication', route: 'iv', dose: {amount: 10, unit: 'mg/kg', display: '10 mg/kg IV cada 8 h, infundido en al menos 1 h; ajustar a función renal'},
  min: 10, max: 10, preparationSeconds: 60, latencyMinutes: 120, peakMinutes: 1440, durationMinutes: 480,
  hazards: ['crystal_nephropathy', 'neurotoxicity_with_renal_accumulation', 'hypersensitivity'],
  indications: ['suspected_herpes_simplex_encephalitis'], requiresAccess: true,
  regimen: {intervalMinutes: 480, intervalHours: 8, administrationMinutes: 60, days: [14, 21],
   renalAdjustmentRequired: true, hydrationAndCreatinineMonitoringRequired: true,
   note: 'Iniciar ante sospecha sin esperar PCR; si la primera PCR es precoz negativa y la sospecha persiste, repetir LCR/PCR a los 3–7 días.'}
 },
 ivig: {
  id: 'ivig', classId: 'immunoglobulin', label: 'Inmunoglobulina IV para crisis neuromuscular',
  aliases: ['inmunoglobulina', 'inmunoglobulina iv', 'ivig', 'gammaglobulina', 'igiv'],
  kind: 'medication', route: 'iv', dose: {amount: 0.4, unit: 'g/kg', display: '0,4 g/kg/día IV durante 5 días (total 2 g/kg); infusión según producto y tolerancia'},
  min: 0.4, max: 0.4, preparationSeconds: 120, latencyMinutes: 2880, peakMinutes: 10080, durationMinutes: 20160,
  hazards: ['thrombosis', 'acute_kidney_injury', 'hemolysis', 'hypersensitivity', 'volume_overload'],
  indications: ['severe_guillain_barre', 'myasthenic_crisis'], requiresAccess: true,
  regimen: {intervalMinutes: 1440, days: 5, totalGPerKg: 2, onsetDays: [2, 5],
   note: 'No sustituye la ventilación. Persiste la debilidad durante la guardia; respuesta motora en días/semanas. No combinar rutinariamente con plasmaféresis.'}
 },
 plasma_exchange: {
  id: 'plasma_exchange', classId: 'procedure', label: 'Plasmaféresis terapéutica',
  aliases: ['plasmaferesis', 'plasmaféresis', 'recambio plasmatico', 'plasma exchange', 'plex'],
  kind: 'procedure', route: 'procedure', dose: {amount: 1, unit: 'exchange', display: 'Iniciar recambio plasmático por equipo de aféresis; curso de 4–5 sesiones según enfermedad'},
  min: 1, max: 1, preparationSeconds: 180, latencyMinutes: 1440, peakMinutes: 5760, durationMinutes: 20160,
  hazards: ['hypotension', 'hypocalcemia', 'line_infection', 'bleeding', 'removes_recent_ivig'],
  indications: ['severe_guillain_barre', 'myasthenic_crisis'], requiresAccess: true,
  regimen: {executionMinutes: 180, requiresCompletedReceipt: true, sessions: [4, 5], courseDays: [7, 14], gbsTotalExchangedLiters: [12, 15], onsetDays: [1, 3],
   note: 'La primera sesión no revierte de inmediato la insuficiencia ventilatoria. No realizar después de IVIG de forma rutinaria.'}
 },
 swallow_screen: {
  id: 'swallow_screen', classId: 'conduct', label: 'Evaluación de deglución antes de vía oral',
  aliases: ['evaluar deglucion', 'evaluacion de deglucion', 'cribado de disfagia', 'prueba de deglucion', 'swallow screen'],
  kind: 'conduct', route: 'procedure', dose: {amount: 1, unit: 'evaluación', display: 'Cribado de deglución por personal capacitado, con resultado documentado antes de vía oral'},
  min: 1, max: 1, preparationSeconds: 1, latencyMinutes: 0, peakMinutes: 0, durationMinutes: 1440,
  hazards: ['aspiration_if_inappropriately_performed'], indications: ['acute_neurological_disease_before_oral_intake'], requiresAccess: false,
  regimen: {executionMinutes: 5, requiresCompletedReceipt: true, noAcuteVitalBenefit: true,
   protocol: 'Mantener ayuno hasta evaluación. Cribado validado por personal capacitado si el nivel de conciencia lo permite; interrumpir ante tos, voz húmeda u otro fallo y solicitar evaluación especializada/alternativa enteral. Un pedido no acredita deglución segura.'}
 }
});
