# ATRIA 4.8.7 — Matriz farmacológica clínica verificable (30 × 13)

**Alcance:** simulador educativo de una guardia acelerada, no prescripción médica
ni modelo farmacocinético cuantitativo. Documento elaborado a partir del
catálogo real de ATRIA, el evaluador de casos, la prueba automática
\`qa/clinical-matrix-all-487.mjs\` y guías clínicas indicadas al final.

**Tres preguntas INDEPENDIENTES para cada administración:**
1. ¿Se ejecutó de verdad por enfermería o por el buscador del monitor?
2. ¿Era apropiada y/o cumplió el requisito clínico? Una orden equivocada
   también puede ejecutarse y quedar documentada.
3. ¿Qué cambio observable produjo? Puede beneficiar, no cambiar nada
   relevante durante esa guardia o perjudicar. Los efectos adversos
   tienen que depender de los riesgos del paciente, no dispararse siempre.

**Los 390 pares no son 390 indicaciones.** Una entrada no indicada en
un caso sirve como prueba negativa. La ejecución nativa y la clasificación
de reglas están probadas separadamente de la fidelidad clínica de su efecto.
\`clinical-matrix-results/clinical-matrix-487.json\` (artefacto CI) muestra
el estado real de cada pareja y las mediciones frente al caso control.

## Reglas por intervención

| ID | Beneficio o función correcta en guardia | Riesgo / excepción dependiente del paciente | Qué NO debe fingir |
|---|---|---|---|
| oxygen | Aumentar oxigenación si hay hipoxemia; flujo y retirada deberían importar | Hipercapnia en susceptibles, hiperoxia | Ganancia ilimitada cuando ya SpO₂ normal |
| fluid | Mejorar volumen/perfusión si hipovolemia o shock que responde a fluidos | Sobrecarga, edema pulmonar en congestión; falta de respuesta | Corregir cualquier shock sin valorar respuesta |
| albumin | Soporte en PBE y reposición apropiada tras paracentesis voluminosa | Sobrecarga, respuesta limitada según volemia/función cardíaca | Curar infección o restaurar riñón mágicamente |
| vasopressor | Mejorar presión en vasoplejía/shock indicado; titulación real | Isquemia/perfusión distal, exceso de vasoconstricción, arritmia | Resolver hipovolemia o control de foco |
| morphine | Reducir dolor con efecto temporal tras dosis real | Depresión respiratoria, hipotensión, sedación, dosis repetidas | Mejorar siempre el shock o causar apnea obligatoria |
| analgesia | Alivio del dolor/fiebre según agente | **Clase genérica**: fentanilo y paracetamol NO comparten todos los riesgos | Asumir un fármaco molecular no indicado por la orden |
| antiemetic | Reducir náusea/vómitos | QT (ondansetrón), obstrucción/interacciones según molécula | Corregir el íleo mecánico o asumir que todos son iguales |
| ppi | Requisito antisecretor si sospecha de sangrado ulceroso adecuado | Sin reparación hemodinámica aguda; revisar indicación | Detener por sí solo una hemorragia activa |
| transfusion | Mejorar Hb/capacidad de transportar oxígeno cuando indicada; apoyo volumen | Sobrecarga, reacción transfusional | Aumentar automáticamente la SpO₂ por agregar glóbulos rojos |
| paracentesis_ter | Aliviar ascitis tensa tras procedimiento confirmado | Disfunción circulatoria si gran evacuación sin albúmina pertinente | Equivaler a una solicitud pendiente |
| espironolactona | Control de ascitis mantenido, respuesta lenta | Hiperpotasemia y deterioro renal si vulnerable | Diuresis estabilizadora de shock en minutos |
| steroid | Control de inflamación cuando realmente indicado | Infección, hiperglucemia; depende de dosis/molécula | Curar sepsis o Crohn al instante |
| aza | Estrategia de mantenimiento de Crohn seleccionado | Mielotoxicidad, hepatotoxicidad, pancreatitis; seguimiento | Inducción inmediata de remisión durante la guardia |
| ceftriaxone | Cobertura *si pertenece a un régimen aprobado para el caso* | Alergia, riesgo biliar | Subir PAM o curar infección en segundos |
| metronidazole | Cobertura anaerobia junto con agente complementario cuando corresponde | Neurotoxicidad relevante con exposición/contexto | Cobertura general de gramnegativos aerobios por sí solo |
| imipenem | Cobertura amplia cuando indicada | Riesgo neurológico/renal, selección de resistencia | Anular la necesidad de cirugía/drenaje |
| ceftazidime | Cobertura gramnegativa seleccionada | Ajuste renal, espectro particular | Equivalencia automática a un esquema con anaerobios |
| cefoperazone | Cobertura seleccionada | Coagulopatía/sangrado en susceptibles | Presión arterial artificial |
| cefepime | Cobertura seleccionada, asociar anaerobicida si requerido | Neurotoxicidad en insuficiencia renal | Curación del foco sin control anatómico |
| piptazo | Cobertura empírica seleccionada, incluida actividad anaerobia | Alergia, exposición renal | Ser apropiada ante alergia grave o resistencia conocida |
| ampicillin | Cobertura cuando indicada y susceptible | Alergia beta-lactámica, ajuste renal | Cobertura universal de gérmenes abdominales |
| amikacin | Gramnegativos seleccionados según evidencia | Nefro/ototoxicidad, mayor riesgo con exposición/insuficiencia renal | Necrosis renal instantánea tras dosis aislada |
| gentamicin | Igual clase, indicación y susceptibilidad específicas | Nefro/ototoxicidad contextual | Shock renal inmediato automático |
| fluconazole | Tratamiento antifúngico si hay indicación/susceptibilidad | QT, hepatotoxicidad, interacciones | Uso empírico universal en todo abdomen séptico |
| amphotericin | Antifúngico cuando está indicado específicamente | Reacción infusional, lesión renal/electrolitos por exposición | Daño renal instantáneo e inevitable |
| source_control | Control del foco real confirmado, no bolo farmacológico | Riesgos y factibilidad procedimentales | Confundir cirugía aceptada con foco resuelto |
| stop_beta_blocker | Suspensión correcta del agente realmente en curso cuando corresponde | Rebote en algunas circunstancias | Administrar un medicamento imaginario |
| furosemide | Mejorar congestión con diuresis y posible alivio respiratorio | Depleción de volumen, hipoperfusión renal, electrolitos | Estabilizar shock hipovolémico; caída renal instantánea sin contexto |
| beta_blocker | Reducir FC cuando indicado y hemodinámicamente tolerado | Bradycardia, hipotensión, shock; identidad/dosis importan | Beneficio universal con FC alta compensatoria |
| anticoagulation | Heparina IV: condición válida en isquemia tromboembólica seleccionada | Sangrado grave si hemorragia activa; HIT con riesgo trombótico | Subir la PA, revascularizar o impedir ejecución de mala decisión |

**Precauciones:** el riesgo general registrado NO garantiza que ya exista un
efecto fisiológico activo para todos estos peligros. Los agentes genéricos
\`analgesia\`, \`antiemetic\`, \`steroid\`, \`beta_blocker\` requieren identidad
molecular antes de añadir riesgos propios de una molécula. Los índices de
riesgo renal de ATRIA no equivalen a creatinina o lesión renal medida.

## Expectativas clínicas por caso

| Caso | Intervenciones de mayor valor | Errores de alta gravedad que debería poder detectar el juego |
|---|---|---|
| CIRR-001 cirrosis/ascitis | Diuréticos cuando hay estabilidad; paracentesis si tensa y albúmina indicada | Sobrediuresis en hipovolemia, sobrecarga por cristaloides |
| PANC-001 pancreatitis | Hidratación guiada por respuesta, analgesia, control náuseas | Exceso de volumen, ATB sin indicación de infección, falsa mejoría por azatioprina |
| CROHN-001 Crohn | Manejo inflamatorio según escenario; analgesia; azatioprina solo mantenimiento | Tratar azatioprina como rescate en minutos, esteroides sin evaluar infección |
| HDA-001 hemorragia digestiva alta | Reanimación, evaluación transfusional, PPI si corresponde, endoscopia | Heparina con hemorragia, betabloqueo en shock, falsa subida de SpO₂ por transfundir |
| COLON-001 tumor/anemia | Diagnóstico, staging, transfusión si anemia/criterios | ATB universales, dosis innecesarias de vasopresor |
| PERI-PBE-001 peritonitis bacteriana espontánea | ATB apropiado + albúmina cuando corresponda; reevaluar BB con hipotensión/AKI | Falta de albúmina, aminoglucósidos en riesgo renal, sobrecarga |
| PERI-SEC-001 peritonitis secundaria | ATB adecuados, fluidos/vasopresor según shock, control de foco | Confundir antibiótico con cirugía, hipotensión tras diuresis, sobrecarga |
| PERI-TER-001 peritonitis terciaria | Revaluación de foco, ATB guiados, antifúngico solo si indicado | Antifúngicos indiscriminados, nefrotoxicidad en paciente vulnerable |
| APP-001 apendicitis | Cirugía/observación seleccionada; antibióticos según complicación y protocolo | ATB no sustituyen cirugía cuando necesaria |
| CHOLE-001 colecistitis | ATB cuando indicados, control quirúrgico; drenaje en casos seleccionados | Suponer mejoría definitiva solo por ATB |
| ILEO-001 obstrucción | Cristaloides si depleción, control náusea, sonda/descompresión si indicada | Antiemético no desobstruye; exceso de opioides puede agravar íleo |
| MESI-001 isquemia mesentérica | Resucitación, anticoagulación si indicada y segura, revascularización/cirugía | Heparina en sangrado, no confundir anticoagulación con reperfusión |
| CHOLANG-001 colangitis | ATB y drenaje biliar oportuno; fluidos/noradrenalina si shock | ATB no desobstruyen vía biliar, exceso de diurético en shock |

## Contrato para casos futuros

Definir \`pharmacology.traits\`, \`requiredTreatments\`, \`coverageSets\`,
\`riskFlags\`, \`contraindications\` y opcionalmente
\`overrides[drugId]\`. Cada paciente admite \`clinicalFlags\`
diferentes. Heredar las 30 reglas genéricas y permitir *solo* excepciones
justificadas; el mismo medicamento puede ayudar, ser inerte en la ventana de
guardia o perjudicar.

El evaluador de tratamientos NO es el motor de alta/derivación.
Se deben comprobar: diagnóstico, pruebas, procedimientos confirmados,
respuesta a reanimación y destino clínico independientemente.

## Fuentes externas de contraste (guías, no coeficientes de juego)

- SCCM / Surviving Sepsis Campaign 2021, fluidos, vasopresores,
  antimicrobianos y control de foco:
  https://sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-guidelines-2021
- IDSA/SIS infección intraabdominal, antibióticos y control de foco:
  https://academic.oup.com/cid/article/50/2/133/327316
- IDSA 2024 evaluación de infecciones intraabdominales:
  https://www.idsociety.org/practice-guideline/intra-abdominal-infections/
- AASLD 2021 ascitis, PBE, albúmina, BB y AKI:
  https://aasldpubs.onlinelibrary.wiley.com/doi/full/10.1002/hep.31884
- ACG pancreatitis, hidratación dirigida:
  https://gastro.org/clinical-guidance/initial-management-of-acute-pancreatitis-ap/
- ACG enfermedad de Crohn 2025, azatioprina no induce remisión rápida:
  https://doi.org/10.14309/ajg.0000000000003465
- ACG hemorragia digestiva alta 2021:
  https://pubmed.ncbi.nlm.nih.gov/33929377/
- KDIGO AKI y aminoglucósidos:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4057151/
- British Thoracic Society: oxigenoterapia dirigida a saturación:
  https://doi.org/10.1136/THORAXJNL-2016-209729
- ESC insuficiencia cardíaca: diuréticos y sobrecarga:
  https://academic.oup.com/eurjhf/article/24/1/4/8364349

**Revisado:** 2026-10-11. Estas guías sustentan la dirección clínica; no
se han trasladado dosis ni tiempos médicos exactos al motor de juego.
