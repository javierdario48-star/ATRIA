# ATRIA 4.8.7 — Clasificación operativa de las 30 terapias para guardia de urgencias

**Checkpoint QA aislado.** Basado en rama verde grace-nursing (7606e145) y revisión del trabajo existente de Work en pharm-shadow-qa (e1ef9471). No modifica runtime, titulares de fisiología, cuidado enfermería, circuitos de cirugía/alta ni producción.

**D = efecto clínico dinámico observable dentro de la guardia** (incluye síntoma y procedimiento, NO significa que todos alteren presión arterial). **C = cumplimiento/causalidad clínica mediante confirmación real**, con efectos adversos contextuales y sin mejoría instantánea artificial. Una etiqueta C NO significa medicamento inocuo ni administración suficiente para el alta. Son roles primarios, no motores nuevos.

| # | ID actual | Rol | Consecuencia educativa mínima | Riesgo o excepción contextual |
|---:|---|:---:|---|---|
| 1 | oxygen | D | SpO2 y soporte respiratorio contextual | Hipercapnia/hiperoxia; no tercer escritor de saturación |
| 2 | fluid | D | Volemia, PAM, FC y posible congestión | Solo bolo confirmado; Ringer B1 experimental OFF por defecto |
| 3 | albumin | D | Volumen efectivo en indicaciones seleccionadas | Ascitis/PBE, sobrecarga; no expansión universal |
| 4 | vasopressor | D | Tono vascular y PAM dependientes de perfusión | No sustituye volumen; isquemia/arritmia; no duplicar rescate |
| 5 | morphine | D | Dolor, frecuencia respiratoria, sedación y posible PAM | Depresión respiratoria/hipotensión; dosis y exposición |
| 6 | analgesia | D | Dolor y eventualmente FC secundaria al dolor | Clase inespecífica: no inventar molécula ni toxicidad |
| 7 | antiemetic | D | Náuseas y síntomas, no PAM por defecto | Clase inespecífica; QT/interacciones solo al identificar agente |
| 8 | ppi | C | Protección ácida o pauta indicada en HDA | No detiene por sí solo una hemorragia activa |
| 9 | transfusion | D | Capacidad transportadora de O2, volemia, perfusión | No elevar SpO2 ficticiamente; reacción/sobrecarga |
| 10 | paracentesis_ter | D | Descompresión de ascitis una vez ejecutada | Hipotensión posparacentesis/albumina contextual |
| 11 | espironolactona | C | Indicación de ascitis/control crónico, sin mejoría instantánea | Potasio, reserva renal, volemia; efecto lento |
| 12 | steroid | C | Indicación antiinflamatoria o uso seleccionado en shock | Hiperglucemia, infección; excepciones si indicación aguda |
| 13 | aza | C | Tratamiento de mantenimiento cuando corresponde | No cura brote agudo; mielosupresión/hepatotoxicidad |
| 14 | ceftriaxone | C | Cobertura de germen/foco solo si administración confirmada | Alergia, efectos biliares; no subir PAM directamente |
| 15 | metronidazole | C | Cobertura anaerobia según esquema del caso | No sustituye otra cobertura necesaria |
| 16 | imipenem | C | Cobertura antimicrobiana contextual | Ajuste renal/neurotoxicidad; no recuperación instantánea |
| 17 | ceftazidime | C | Cobertura antimicrobiana contextual | Ajuste renal; espectro incompleto según foco |
| 18 | cefoperazone | C | Cobertura antimicrobiana contextual | Coagulopatía/hemorragia si relevante |
| 19 | cefepime | C | Cobertura antimicrobiana contextual | Neurotoxicidad y ajuste renal |
| 20 | piptazo | C | Cobertura antimicrobiana contextual | Alergia/función renal; no normalizar signos instantáneamente |
| 21 | ampicillin | C | Cobertura antimicrobiana contextual | Alergia y ajuste renal |
| 22 | amikacin | C | Cobertura bacteriana si está indicada y administrada | Riesgo nefro/ototóxico dependiente de exposición y función renal; NO lesión renal inmediata tras una dosis |
| 23 | gentamicin | C | Cobertura bacteriana si está indicada y administrada | Riesgo nefro/ototóxico dependiente de exposición y función renal; NO lesión renal inmediata tras una dosis |
| 24 | fluconazole | C | Cobertura antifúngica solo si hay indicación | QT, función hepática e interacciones |
| 25 | amphotericin | C | Cobertura antifúngica solo si hay indicación | Reacción aguda a infusión; nefrotoxicidad/electrolitos según tiempo y formulación |
| 26 | source_control | C | Condición causal: control de foco REALMENTE ejecutado | No equivale a consulta aceptada ni cura instantánea |
| 27 | stop_beta_blocker | C | Suspensión ejecutada de un medicamento realmente activo | Reevaluar FC/PAM según exposición; posible rebote, no acción fantasma |
| 28 | furosemide | D | Diuresis, congestión, volemia, PAM y posible deterioro renal | Hipovolemia/shock y electrolitos; no funciona como bolo beneficioso universal |
| 29 | beta_blocker | D | FC y PAM si agente/dosis específicos son conocidos | Bradicardia, hipotensión y shock; orden genérica no implica sustancia precisa |
| 30 | anticoagulation | C | Requisito cuando hay indicación y confirmación reales | Heparina V19 BLOQUEADA: falta mecanismo mínimo de hemorragia/trombosis |

**Conteo: 11 D / 19 C.** Se conserva exactamente el catálogo ejecutable de 30: 29 entradas nativas literales más anticoagulation añadida en bootstrap V19. Algunas entradas son clases genéricas o procedimientos, no moléculas individuales.

## Contrato mínimo sin otro motor

1. **Administración y cumplimiento:** utilizar administrationLog, monitorTherapies, tareas de enfermería y procedimientos actuales. Ordenado o pendiente NO es administrado. Esquema completo exige miembros del conjunto de cobertura correspondiente, sin inventar sensibilidad del microorganismo.
2. **D: titular fisiológico único.** Solo la ruta activa autorizada aplica el efecto; no superponer B1, native, puente de sepsis y rescate. Efectos dependen de caso, reserva y tratamiento confirmado. La acción puede mejorar, no mejorar o perjudicar; las órdenes genéricas carecen de farmacodinámica específica.
3. **C: condición inmediata de guardia cuando está correctamente ejecutada.** Antibióticos/antifúngicos indicados satisfacen cobertura al administrarse; NO exigen esperar horas de respuesta antiinfecciosa para traslado, ni cambian de inmediato PAM, SpO2 o curación del foco. Fuente quirúrgica requiere procedimiento efectuado para marcar sourceControlled, no aceptación de interconsulta.
4. **Toxicidad:** mantener alertas contextuales sin introducir daño temporal imposible. Aminoglucósidos habitualmente generan nefrotoxicidad clínica tras varios días, por lo que una administración aislada durante esta guardia no debe reducir automáticamente renalReserve/filtrado. Función renal previa afecta idoneidad y ajustes. Amphotericin puede producir reacción de infusión; su daño renal no se presume inmediato. Deterioro renal por choque, hipovolemia o diuresis excesiva SÍ puede ser relevante en la guardia.
5. **Egreso/derivación:** disponer según el evaluador existente, diagnóstico, estabilidad, evidencia y procedimiento; condiciones C no dan alta automáticamente ni deben retrasar evaluación quirúrgica urgente a la espera de curación farmacológica.
6. **Heparina:** permanecer bloqueada para instalación global; no fingir hemostasia/coagulación ni añadir un efecto de PAM artificial.

## Reutilizar sin duplicar

- src/clinical/pharmacology-registry-487.js: 29 contratos literales, perfiles de 13 casos y mecanismos; no rehacerlos.
- src/clinical/pharmacology-outcomes-487.js: ya reconoce coberturaComplete desde administración confirmada y registra un índice no vital de riesgo renal. El nombre renalInjuryIndex NO representa una lesión renal clínica documentada; no conectarlo directamente a renalReserve tras una dosis.
- src/clinical/secondary-sepsis-bridge-487.js y src/clinical/surgical-review-487.js: conservar la aceptación clínica y el soporte durante la derivación. La aceptación NO ejecuta control de foco.
- qa/ATRIA_487_B1_FUNCTIONAL_COVERAGE_30.md y rama pharm-shadow-qa: reusar pruebas y mecanismos B1; shadow NO conectado a la guardia activa.
- src/integration/pharmacology-boot-487.test.js: el adaptador farmacológico global actualmente rechaza el catálogo post-bootstrap por heparina sin contrato. CI verde con rechazo seguro NO es despliegue clínico completo.

## Contexto de los 13 casos: foco de las decisiones

| Caso | Prioridad en guardia: evaluar, estabilizar y decidir |
|---|---|
| CIRR-001 | Ascitis/descompensación; paracentesis si corresponde, volumen/albúmina contextual, riesgos renales |
| PANC-001 | Analgesia, reanimación según hipovolemia, síntomas, vigilancia de gravedad; no antibiótico universal |
| CROHN-001 | Manejo del brote y complicaciones; azatioprina NO revierte síntomas agudos |
| HDA-001 | Hemorragia, perfusión, hemoderivados si corresponden, tratamiento etiológico; PPI no garantiza hemostasia |
| COLON-001 | Anemia/diagnóstico y disposición; no inventar recuperación inmediata por medicamentos no indicados |
| PERI-PBE-001 | Cobertura inicial apropiada, albúmina cuando esté indicada, vigilancia de perfusión y función renal |
| PERI-SEC-001 | Fluidos/soporte según shock, antibióticos iniciales confirmados, cirugía y traslado sin espera de curación |
| PERI-TER-001 | Cobertura contextual, estabilización, foco persistente, evaluación de derivación |
| APP-001 | Control de foco si indicado y cobertura adecuada; analgesia y soporte sintomático |
| CHOLE-001 | Decisión sobre foco biliar/quirúrgico, cobertura si indicada, analgesia y antiemético |
| ILEO-001 | Reanimación/descompresión si indicada, vómitos/aspiración, corrección de volumen y decisión quirúrgica |
| MESI-001 | Reconocimiento de isquemia, reanimación, valoración quirúrgica urgente; no esperar curación farmacológica |
| CHOLANG-001 | Cobertura inicial, perfusión en sepsis y drenaje/control de foco cuando indicado |

**Estado:** matriz de diseño + contratos QA; no afirmar que los 30 tratamientos ya estén implementados/validados clínicamente, ni modificar criterios de alta actuales sin pruebas de casos. Próximo trabajo de Work: conectar criterios C al evaluador existente usando evidencia de ejecución, revisar riesgos excepcionales y validar los flujos clínicos caso por caso. No trasplantar el motor shadow entero.
