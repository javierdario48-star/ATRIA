# ATRIA 5.0 — Manual maestro de diseño, migración y aceptación funcional

**Versión canónica inicial: 17-10-2026.** Basada en ATRIA 4.8.7 ejecutable efectivo, pruebas históricas, código V5 verificado y decisiones expresas del creador durante la migración. Este documento es un **contrato del producto**, no una afirmación de que todas sus funciones ya se encuentran migradas. La implementación tiene que demostrar cada condición con evidencia antes de marcarla completa.

**Repositorio:** javierdario48-star/ATRIA. **Única rama de trabajo:** atria-5.0-core-rebuild-experimental. **Base auditada:** dee1f7f838afa6c1d6ff662be5d7471ebb07ad54 (código funcional 26cc058a30485191749b6df485f2a5221c525676). Revisar HEAD remoto antes de cada nueva ejecución.

**Fuente de verdad, por precedencia:** (1) decisiones explícitas del creador sobre jugabilidad y libertad clínica; (2) reglas y flujos realmente comprobados en la distribución 4.8.7 EFECTIVA, construida con src/integration/apply-487.js sobre vendor/atria-4.8.6/index.html; (3) funciones que ya trabajan correctamente en V5, que deben mantenerse; (4) informes, propuestas y pruebas secundarias. Si el legado contiene errores, reproducirlos y corregirlos sin copiar el defecto. Nunca preferir una interpretación previa del agente sobre una regla verificada.

---

## 1. Identidad del juego y objetivo real

ATRIA es un **RPG 2D médico de guardia**. El jugador se mueve por un hospital, atiende pacientes, habla libremente con ellos y con el equipo, interroga, examina, mide, solicita estudios, indica tratamientos, reevalúa, registra una impresión diagnóstica y decide el destino. El mundo y el chat son parte de la jugabilidad; no es un cuestionario ni un simulador de botones aislados.

El objetivo de V5 NO es inventar otro ATRIA. La arquitectura antigua tenía gran parte del motor clínico, la interfaz de guardia y los cuatro modos. Su principal deuda histórica es la robustez de **multijugador**, sobre todo sincronización clínica/chat, propiedad de pacientes y movimiento remoto. V5 debe reutilizar la clínica funcional y conservar el mapa, los sprites, el teclado propio y la arquitectura modular que ya están construidos.

**NO añadir nuevos casos clínicos hasta migrar los 13 originales. NO agregar funciones sofisticadas nuevas mientras falten funciones ya existentes en 4.8.7.**

## 2. Leyes innegociables de jugabilidad

1. **Libertad médica total.** Una decisión médicamente incorrecta no se bloquea por ser incorrecta: un medicamento alérgeno, heparina con hemorragia, exceso de líquidos, furosemida en shock o un tratamiento innecesario se ejecuta si su orden es técnicamente interpretable y físicamente realizable. Sus consecuencias pueden ser deterioro, complicación, rescate y muerte. El paciente no es invulnerable ni muere automáticamente al primer error.
2. **El conocimiento se obtiene, no se regala.** El médico debe preguntar por antecedentes y alergias, examinar, medir y esperar estudios. Las ventanas nunca revelan por defecto la respuesta diagnóstica ni cifras fisiológicas no medidas. Las sugerencias del diagnóstico son globales, no filtradas según el paciente.
3. **Una orden no es una administración.** Solicitar no equivale a ejecutar. Cada tratamiento, acceso, monitor, estudio, consulta y destino tiene estados genuinos, dependencia, tiempo, UID y comprobante. No se otorgan efectos, tratamiento cumplido ni XP por una orden pendiente.
4. **Una fuente de verdad.** Un único estado clínico mutable por paciente/guardia, un dueño de cada signo vital, una sola autoridad de acciones, un reloj clínico con dominios separados y un evaluador de cierre por caso. No motores paralelos por modalidad, UI, usuario ni medicamento.
5. **El cierre es la resolución de la atención en GUARDIA.** Alta, observación, sala, UTI, quirófano o procedimiento según el caso. Derivar a quirófano NO significa operar; derivar a endoscopia NO exige practicarla en el box; no se exige sourceControlled=true para otorgar el cierre de una derivación segura.
6. **Requisitos mínimos ≠ calidad/XP.** La atención suficientemente fundada habilita el destino; preguntar y estudiar con mayor pertinencia mejora la evaluación. Adivinar un diagnóstico, pedir estudios indiscriminadamente o dañar al paciente empeora la puntuación. Cierre correctamente justificado con menos de 70 puntos puede ganar XP.
7. **El destino aparece al cumplirse los requisitos.** No obligar a adivinar comandos secretos; no mostrar como alcanzable un destino cuyo contrato no está satisfecho. Se puede solicitar una interconsulta de forma anticipada, pero aceptación de la consulta ≠ aprobación del traslado.
8. **Arquitectura multijugador por encima de parches.** Los cuatro modos tienen el mismo núcleo médico; únicamente cambian asistencia, permisos y competición.

## 3. Recorrido clínico canónico del jugador

Secuencia típica: acercarse al paciente → obtener motivo y anamnesis → inspección/examen físico por regiones → registrar signos/monitor → pedir estudios pertinentes → recibir resultados reales → indicar enfermería y esperar ejecución → observar respuesta de enfermedad/tratamiento → reevaluar → registrar impresión diagnóstica → elegir o solicitar destino → verificar requisitos y, de ser necesario, respuesta del servicio → cerrar la atención y obtener evaluación + XP.

**No es una secuencia rígida de puertas.** En una urgencia, el jugador puede administrar soporte y avisar Cirugía antes de completar una anamnesis extensa o esperar TC. El motor distingue lo clínicamente imprescindible para un traslado seguro de lo que aporta más calidad. Una consulta temprana puede estar pendiente/aceptada mientras continúan medidas del box.

Estados mínimos verificables de cada caso: ACTIVE → acciones/estudios/consultas PENDING o COMPLETED → impresión diagnóstica registrada → DESTINATION_ELIGIBLE → disposición CONFIRMED → CASE_ENDED / GRADED. La evolución del paciente, el deterioro, rescate y la muerte suceden en paralelo mientras está activo. Nunca cerrar por cambiar un booleano desde la UI.

## 4. Anamnesis, diálogo, examen y observaciones

**Anamnesis:** conversación natural; buscar contexto, antecedentes, medicación, alergias, evolución y síntomas. En casos dolorosos, ALiCIA (localización, inicio/antigüedad, irradiación, carácter, intensidad, factores agravantes y alivio) produce respuestas coherentes con el caso y el estado actual. Interrogatorio más pertinente/profundo → más puntos de historia; al menos un dato relevante o contextual suele ser requisito mínimo, con excepciones en shock.

**Alergias:** pueden ser datos latentes. El paciente solo revela las que realmente tiene cuando le preguntan; no aparece alerta preventiva, no se inventa anafilaxia por una alergia inespecífica, ni se impide administrar el fármaco. Los perjuicios clínicos se calculan después de un recibo auténtico.

**Examen:** elegir región y técnica (inspección, palpación, percusión, auscultación, examen general, neurología/Glasgow cuando corresponda). Solo se anota lo explorado. Ausencia de hallazgo definido no equivale a normalidad demostrada. Glasgow por componentes, sin inventar total si falta uno. El examen físico dirigido es requisito habitual para destino.

**Monitor:** conectar/desconectar y medir son acciones diferenciadas. Abrir la ventana no genera una medición. Sin monitor, la última lectura conserva su tiempo; un monitor activo refleja el estado actualizado. ECG es patrón de juego derivado de ritmo autorizado, no una prueba electrocardiográfica clínica falsamente diagnosticada.

**Paciente observado:** dolor y síntomas subjetivos pueden cambiar con medicación/estado real; C2.b.1 ya hizo esto para morfina en APP/CIRR. No confundir texto cosmético con fisiología.

Fuentes: [historia V5](../../src/v5/clinical/patient-dialogue.js), [examen V5](../../src/v5/clinical/physical-exam.js), [anamnésis antigua](../../src/clinical/anamnesis-intents.js), [examen antiguo](../../src/clinical/physical-exam.js), [observaciones V5](../../src/v5/clinical/observations.js).

## 5. Impresión diagnóstica: un control sobre el paciente

En el juego 4.8.7 existe un cuadro/badge **sobre el propio paciente**, visible mientras la atención está activa, con texto "Impresión diagnóstica". Se puede pulsar, editar, guardar, borrar, ver sugerencias y volver a editar. Mantiene el mismo valor canónico de diagnóstico que el evaluador y el cierre; no existe otra ficha diagnóstica secreta.

Autocompletado **global** con términos de todos los casos y sinónimos: no restringirlo al paciente seleccionado porque revelaría el diagnóstico. Reconocer equivalencias suficientemente específicas, sin convertir "peritonitis", "abdomen agudo" o "sepsis" en un diagnóstico etiológico que por sí solo habilite derivación. Respetar cambio de paciente/UID, teclado móvil y modo espectador de Competitivo.

**Brecha V5 actual:** la impresión se ingresa en un campo de la ventana clínica "Resolver", no en un control persistente flotante sobre el paciente; el código V4 que ya lo resuelve se encuentra en [integración original](../../src/integration/diagnostic-autocomplete-487.js) y [funciones puras](../../src/clinical/diagnostic-impression-487.js). Migrar su COMPORTAMIENTO y mantener un único estado, sin copiar HTML/wrappers a V5.

## 6. Estudios complementarios: pertinencia, tiempos y resultados

Catálogo amplio de estudios genéricos + específicos por caso, alias naturales, petición única vinculada al UID, tiempos de preparación reales y resultados contextuales. Un pedido puede estar PENDING y todavía no aportar evidencia para cierre. Una solicitud duplicada/reintento no crea dos resultados; dos pedidos clínicos nuevos pueden diferenciarse si el flujo los permite.

El referente original [study-registry.js](../../src/clinical/study-registry.js) usa **1 minuto real por hora de juego** para el turnaround definido por estudio. No imponer tiempos uniformes. Cultivos tardíos no bloquean el manejo empírico ni la derivación urgente cuando el evaluador del caso no los exige.

**Puntuación correcta:** estudiar lo necesario para sustentar la hipótesis da mayor calidad; menos de lo indispensable bloquea cierre salvo excepción clínica urgente; pedir más estudios no prioritarios reduce la puntuación (penalización original de 2 por estudio extra, hasta 5 puntos de eficiencia). Los estudios pertinentes adicionales pueden aumentar calidad aun cuando no sean requisito mínimo. No sumar "cantidad" de estudios como un logro aislado; no inventar resultados clínicos si el caso no los modeló.

Fuentes: [registro antiguo](../../src/clinical/study-registry.js), [orden natural](../../src/clinical/natural-study-orders.js), [estudios V5](../../src/v5/clinical/studies.js), [calidad antigua](../../src/clinical/case-completion-487.js).

## 7. Enfermería: lenguaje natural, presencia física y recibos

Un único canal/flujo para órdenes de chat, monitor, controles UI y, donde esté disponible, voz. Mención automática al tocar Enfermera; también válido escribir "Enfermera, ..." y combinar órdenes. Los alias, separadores, unidades, decimales, negaciones, preguntas y órdenes mixtas se resuelven con [scanner V4](../../src/clinical/nurse-scanner-487.js), sin crear parsers independientes por modalidad.

**Una orden combinada válida debe completar TODAS sus acciones**, no solo reconocerlas. Por ejemplo: dos vías, monitor, Ringer, oxígeno y antibióticos. Los lotes con ambigüedad técnica se aclaran sin ejecutar parcialmente a escondidas. Una decisión clínica perjudicial no se rechaza como si fuera error de sintaxis.

La enfermera recibe, se desplaza hacia el paciente, prepara/ejecuta o comunica espera por acceso venoso. Monitorear/colocar vías/medicar tiene dependencias reales. Cada acción tiene estado y recibo con roomId, actorId, patientUid, eventId/sourceEventId y tiempo. El historial muestra solicitud, preparación, ejecución o rechazo; repetir el MISMO evento no produce otra dosis; una nueva orden independiente a la misma sustancia SÍ puede producir otra administración y nuevas consecuencias.

Comportamiento histórico probado: 421/421 casos combinatorios; F/G/I en navegadores independientes; autoría del paciente y rol de enfermería. No copiar al runtime V5 la cadena de wrappers y sustituciones globales de src/integration/nurse-execution-487.js. V5 ya implementa una cola espacial propia que se debe conservar.

Fuentes: [ejecución legacy](../../src/integration/nurse-execution-487.js), [matriz 421](../../qa/nurse-combinatorial-bot-487.mjs), [enfermería V5](../../src/v5/engine/nurse-dispatcher.js), [ejecutor IV V5](../../src/v5/clinical/native-medications.js).

## 8. Libertad médica, 30 entradas del catálogo y farmacología

El catálogo original [pharmacology-registry-487.js](../../src/clinical/pharmacology-registry-487.js) contempla **30 entradas de intervención**, que NO son 30 moléculas: medicamentos, fluidos, oxígeno, procedimientos, anticoagulación, transfusión y suspensiones.

Inventario literal por grupos:
- **Soporte/volumen/respiración:** oxygen, fluid, albumin, vasopressor, transfusion.
- **Síntomas/gastrointestinal:** morphine, analgesia, antiemetic, ppi, paracentesis_ter.
- **Crónicos/inmunológicos/hemodinámicos:** espironolactona, steroid, aza, stop_beta_blocker, furosemide, beta_blocker.
- **Antimicrobianos:** ceftriaxone, metronidazole, imipenem, ceftazidime, cefoperazone, cefepime, piptazo, ampicillin, amikacin, gentamicin, fluconazole, amphotericin.
- **Conducta/procedimiento:** source_control.
- **Anticoagulación:** anticoagulation (tratamiento heparínico del legado; no inferir formulaciones numéricas que no están modeladas).

**Regla clínica:** administrar una medicación correcta o incorrecta es una decisión del médico. Las contraindicaciones son riesgos, NO prohibiciones automáticas. Validación técnica sí: UID/destino, dosis interpretable y unidad, vía soportada, acceso real, ejecución registrada. Nunca forzar un medicamento no implementado a través de una orden ficticia.

**Modelo de efectos:** fármacos tienen indicaciones, condiciones de eficacia, inicio, pico, dosis/rango cuando se verificó, duración, acumulación o eliminación cuando lo contemple la fuente y efectos adversos según paciente. Antibióticos no causan mejora hemodinámica inmediata mágica. La infección responde a cobertura adecuada según combinaciones, tiempo y necesidad de control del foco. En cierre se exige tratamiento REALMENTE administrado, no simplemente prescrito. Una alergia grave, riesgo hemorrágico o medicación nefrotóxica pueden llevar a deterioro, pero no todas las alertas del catálogo son daños numéricos ya modelados.

**V5 verificado:** 15 entradas IV ejecutables en APP/CIRR en C2.b.1; las 30 entradas tienen catálogo/reglas de lectura, pero aún NO 30 ejecutores completos. C1 integró daño original por alergia grave y anticoagulación tras la entrega; C2.a añadió nueve antimicrobianos; C2.b/B1 morfina con dosis, analgesia, acumulación/eliminación, efectos respiratorios y respuesta subjetiva. Conservar esas funciones; no volver a bloquear al médico.

**Pendientes específicos:** albúmina expresada en g/kg; noradrenalina como infusión modificable y suspendible; transfusión; tratamientos restantes; antifúngicos mg/kg sin perder la unidad; respuesta a diuréticos en hipovolemia; evaluación por caso y cinética del catálogo. Incidencia V4/V5 conocida: "Enfermera monitor y albumina 1.5 g/kg" se confunde con hepatograma en ciertos parsers. Reproducir antes de arreglar.

Fuentes: [C1](C1_CLINICAL_FREEDOM.md), [C2.a](C2A_ANTIMICROBIAL_EXECUTION.md), [C2.b](C2B_MORPHINE_EXECUTION.md), [catálogo V5](../../src/v5/content/therapies.json), [recibos V5](../../src/v5/clinical/native-medications.js).

## 9. Fisiología, evolución, monitor, rescate y muerte

La progresión debe ser **fisiológica pero jugable**, no un modelo biomédico hiperdetallado. Los parámetros (PA, FC, FR, SpO2, temperatura y otras observaciones sustentadas) cambian coherentemente con el paciente actual, gravedad, enfermedad, paso del tiempo y terapéutica realmente administrada. Admitir ligeras oscilaciones visibles dentro de rangos plausibles, sin que ruido de UI cambie el diagnóstico ni fabrique un efecto farmacológico.

**Propiedad exclusiva:** APP/CIRR tienen escritores nativos propios; un motor derivado de V4 que genera offsets no escribe directamente los signos. El módulo puro [sepsis-physiology-487-core.js](../../src/v5/clinical/sepsis-physiology-487-core.js) se contrastó contra VM V4 para las tres peritonitis. Su dueño longitudinal original solo se aplicaba a motores peritonitis/sepsis_source; no importarlo como progresión universal a APP/CIRR.

La fisiología antigua cubre inflamación, fuga a tercer espacio, volumen circulante efectivo, resistencia vascular, contractilidad, oxigenación, reserva/estrés renal, cobertura antimicrobiana, y control de foco cuando corresponda. Falta extraer íntegramente la ruta de tratamientos inmediatos y sus correcciones posteriores antes de activar al ejecutor PERI.

**Líquidos:** ocho órdenes distintas de Ringer 500ml dan ocho recibos; el historial registra 500...4000ml acumulados. Contrafáctico original a tiempo fijo mostró que 1–4 bolos no otorgaban beneficio sistólico incremental en APP/CIRR; la aparente evolución entre los bolos venía del reloj/suavizado. NO fabricar progresión lineal ni copiar B1 experimental con reparto 25/75, toxicidad hipóxica errónea o sin eliminación. La sobrecarga debe responder al contexto.

**Supervivencia:** preservar gracia V4 del orden de 180–480 segundos reales y ventana de rescate finita de 65 segundos donde proceda; validar alteraciones temporales por estudio/preparación y no adelantar muerte arbitraria ni hacerla imposible. Muertes publicadas en la autoridad de sala; una vez fallecido no ejecutar nuevas acciones ni otorgar XP. La toxicidad debe ser consecuencia de recibos, no de un comando que todavía está en cola.

**Defectos históricos abiertos:** 2/5 escenarios de furosemida adversa en hipovolemia sin perjuicio medible (PERI-SEC/CHOLANG según handoff C2.b.1). No permitir que una CI verde o una penalización de puntaje oculte ausencia de daño cuando sí debería existir.

Fuentes: [auditoría V4](STEP_12H_LEGACY_FUNCTIONAL_AUDIT.md), [fisiología verificada](STEP_12J_LEGACY_SEPSIS_PHYSIOLOGY.md), [gracia](../../src/clinical/grace-survival-487.js), [rescate](../../src/clinical/critical-rescue-487.js), [muerte V5](../../src/v5/clinical/survival-487-bridge.js).

## 10. Reloj y tiempos (separar DOMINIOS)

**Contrato visible:** 1 minuto real = 1 hora de guardia; 24 minutos reales = 24 horas visuales. La simulación guarda progreso visible como gameMinute/clinicalMinute; por 1440 s reales transcurren 1440 minutos de reloj visual.

**Dominio farmacodinámico interno heredado:** nativeMinute usa .12 minuto nativo/segundo real en estado normal y .03 durante escritura. Eso equivale a 172.8 minutos nativos después de 24 minutos reales sin escribir. Es distinto del reloj de pantalla, por diseño heredado. No multiplicar todos los efectos/estudios/rescates para igualarlos: primero caracterizar ventanas por mecanismo y corregir inconsistencias de forma local, protegiendo tiempos de enfermería y muerte.

Los resultados de estudios utilizan su propia duración declarada en horas de juego; solicitudes, traslados, preparación, respuesta de servicios, evaluación y muerte necesitan referencias temporales explícitas. Cada salto de tiempo de fisiología se segmenta según el contrato de su dueño (no perder evolución al truncar silenciosamente saltos grandes).

Fuentes: [clock V4](../../src/clinical/clinical-clock-487.js), [clock V5](../../src/v5/clinical/guard-clock.js), [estudios](../../src/clinical/study-registry.js), [revisión del reloj](STEP_12K_MEDICATION_AND_CLOCK_DOMAINS.md).

## 11. Cierre de casos — reglas generales

**Evaluación continua de elegibilidad.** Diagnóstico presuntivo suficientemente específico y compatible, signos medidos, examen dirigido, anamnesis mínimamente pertinente (excepto urgencia grave), estudio orientador realizado o excepción por emergencia, tratamientos imprescindibles ejecutados, reevaluación posterior, paciente vivo, destino adecuado y receptor aceptado cuando corresponde. No bloquear una derivación URGENTE por historia extensa o imagen demorada cuando la regla ya contempla traslado clínico.

**Alta:** exige estabilidad real (en la regla antigua, PA sistólica >=100, SpO2 >=94, FC <=110 y FR <=24 para la evaluación de alta). **Sala:** el mínimo antiguo obliga a reconsiderar destino o estabilización si PA sistólica <90 o SpO2 <90. **UTI/quirófano:** se puede trasladar grave con soporte activo; no exigir normalizar cifras que justifican el traslado.

**Aparición de la opción:** tras satisfacer requisitos, Enfermería avisa que está listo y la UI muestra el destino permitido sobre/desde el paciente. En un control final coherente con las decisiones del creador, no dejar botones de destino incorrectos a la vista ni exigir una palabra secreta. Si faltan elementos, informar lo pendiente; no inventar acciones completadas.

**Intervenciones pertinentes, no medicina de checklist:** listas de tratamiento permiten regímenes alternativos equivalentes. Por ejemplo APP puede cerrar con ceftriaxona + metronidazol, piptazo o imipenem, siempre que el caso acepte el régimen y esté confirmado. No puntuar dosis alérgenas como buena cobertura. El cierre correcto **no** se condiciona a haber intervenido quirúrgicamente al paciente.

Fuentes: [reglas antiguas de los 10 casos](../../src/clinical/case-completion-487.js), [cierres de las tres peritonitis](../../src/clinical/peritonitis-pathways.js), [integración antigua](../../src/integration/case-completion-487.js), [pruebas de 131 cierres](../../qa/closure-xp-combinatorial-487.mjs).

## 12. Destinos de los 13 casos originales (contrato con matices)

| Caso | Destino por estado según 4.8.7 | Mínimo de estudio/terapia/recepción que se debe respetar |
| --- | --- | --- |
| CIRR-001 cirrosis | Sala u observación | Hepatograma, función renal o ecografía; espironolactona según regla original; reevaluar. NO alta universal. |
| PANC-001 pancreatitis | UTI | Lipasa; cristaloides y ayuno; receptor de UTI aceptó. |
| CROHN-001 Crohn | Sala u observación | Marcadores inflamatorios, colonoscopia o entero-RM; corticoide correspondiente. |
| HDA-001 hemorragia digestiva alta | Procedimiento/endoscopia o UTI | Laboratorio de sangrado o grupo; acceso y reposición/hemoderivados + PPI según alternativa; aceptación del equipo gastro/UTI. |
| COLON-001 neoplasia colónica | Alta o sala | Colonoscopia; estabilidad clínica; no exigir cirugía ejecutada. |
| PERI-PBE-001 PBE | Sala si no crítico; UTI si crítico | Paracentesis diagnóstica; antibiótico adecuado confirmado + albúmina; soporte según perfusión. |
| PERI-SEC-001 peritonitis secundaria | Quirófano | Imagen orientadora o urgencia clínica que la suple; cobertura intraabdominal correcta, respuesta de Cirugía, soporte si shock/hipoxemia. La derivación termina el caso. |
| PERI-TER-001 peritonitis terciaria | Sala si estable; UTI si crítico o shock reciente | Reevaluación de foco/imagen o urgencia justificada, antimicrobiano coherente, receptor UTI/Cirugía. Cultivo tardío no bloquea transferencia. |
| APP-001 apendicitis | Quirófano | Ecografía o urgencia, antibióticos adecuados confirmados y consulta de Cirugía aceptada. |
| CHOLE-001 colecistitis | Quirófano | Ecografía biliar; ayuno + cobertura apropiada; Cirugía aceptada. |
| ILEO-001 íleo mecánico | Sala, quirófano o UTI según evolución | Rx/TC, fluidos + SNG + ayuno; requerimientos de consulta dependen del destino. |
| MESI-001 isquemia mesentérica | Quirófano | Angio-TC o urgencia documentada; reanimación y heparina cuando sea segura; hemodinamia/Cirugía aceptan. Con hemorragia activa no obligar a heparinizar para derivar. |
| CHOLANG-001 colangitis | Procedimiento/drenaje o UTI | Hepatograma o ecografía; reposición + cobertura apropiada; Gastro/UTI acepta. No pedir ERCP realizada en el box. |

**Precisiones:** los primeros 10 utilizan CASE_CLOSURE_RULES_487. Las tres peritonitis tienen EVALUADOR APARTE, csPeritonitisEvaluate487, y su prioridad debe prevalecer para esos casos. El cuadro resume elegibilidad de cierre, no la recomendación de terapia clínica humana ni una afirmación de que sus ejecutores están listos en V5.

Fuentes: [10 reglas](../../src/clinical/case-completion-487.js), [peritonitis](../../src/clinical/peritonitis-pathways.js), [prueba de destino nativo 13](../../qa/clinical-destination-contract-487.mjs), [planes de 26 recorridos](../../qa/clinical-care-journeys-487.js).

## 13. Interconsulta quirúrgica y respuesta del servicio

**Es un flujo propio, no un botón que cierra sin preguntas:**

1. El médico puede solicitar interconsulta a través de "Enfermera cirugía", comandos o botón contextual, aun mientras completa parte de la evaluación. La solicitud se muestra **PENDING**; la enfermera confirma que envió el pedido.
2. Cirugía evalúa **la impresión diagnóstica y su especificidad/compatibilidad, signos documentados, examen dirigido, existencia de indicación quirúrgica, imagen o urgencia clínica**. Puede rechazar o pedir correcciones precisas: falta impresión, no concuerda con evidencia, faltan signos/examen o falta estudio suficiente en paciente estable. No revela de forma gratuita cuál es el diagnóstico correcto.
3. Con shock y sospecha quirúrgica suficientemente específica, Cirugía puede aceptar EVALUACIÓN URGENTE antes de terminar el examen o esperar la TC. Eso NO habilita automáticamente el traslado: la evaluación global de cierre aún exige soporte indispensable y medidas correspondientes.
4. Cirugía puede RESPONDER Y ACEPTAR la consulta, mientras Enfermería todavía informa tratamientos/reevaluación pendientes. No afirmar que toda consulta aceptada autoriza XP. El estado de la consulta no equivale a cirugía realizada.
5. Cuando además el evaluador del caso da DESTINATION_ELIGIBLE, la opción **Derivar a quirófano** aparece de forma natural; se confirma el destino, se ejecuta el finalizador nativo y se gana XP único.
6. Negaciones ("no cirugía") y preguntas ("¿cirugía?") no solicitan ni realizan procedimientos; repetir una consulta pendiente no genera múltiples avisos, timers o ingresos duplicados.

**Diferencia V5 ACTUAL:** app-care.js admite interconsulta APP pero el resultado pendiente se convierte automáticamente en accepted=true tras espera y no invoca el evaluador contextual original csSurgicalReview487; los errores se revisan principalmente en readiness al cerrar. Esto tiene que migrarse, no certificarse como terminado. También faltan botones/opciones automáticas equivalentes y el badge permanente de DX V4.

Fuentes: [evaluador quirúrgico puro](../../src/clinical/surgical-review-487.js), [enfermería quirúrgica](../../src/integration/surgical-nursing-487.js), [pruebas QA](../../src/integration/surgery-vega-487.bot.test.js), [APP V5](../../src/v5/clinical/app-care.js).

## 14. Calidad, puntuación, experiencia y finalización

Los seis componentes originales de evaluación suman 100 puntos:
- **Diagnóstico** hasta 15.
- **Anamnesis** hasta 15, según preguntas del caso y contexto útil.
- **Seguridad clínica** hasta 25: signos, examen, reevaluación y destino.
- **Estudios pertinentes** hasta 15, no por cantidad indiscriminada.
- **Tratamiento + destino** hasta 25, solo intervenciones reales; equivalencias de antibióticos aceptadas por el caso.
- **Eficiencia** hasta 5, descuento por estudios superfluos (hasta 5).
- **Eventos adversos** descontados además, con tope original de 20.

La suma se acota 0–100. La experiencia no se calcula con una segunda fórmula inventada: V4 tiene sistema de carrera, autónomía, complejidad y multiplicadores. Mantener evaluación/calidad separada de elegibilidad de cierre; un cierre responsable no se bloquea solo porque su nota sea inferior a 70. Dejar constancia de **sumó / descontó / faltó / no debía hacerse**. Si el caso muere, seguir desenlace de muerte, penalizaciones y cero XP de resolución; no reabrir ni otorgar XP duplicado.

El finalizador original se invoca por disposición autorizada, registra prueba de handoff ligada a UID/caso/destino y paga una vez. El dato sourceControlled de peritonitis secundaria debe permanecer inalterado al derivar (cirugía no realizada). Existe una prueba de **tres cierres peritonitis con XP real y sourceControlled inalterado** en qa/peritonitis-native-finish-xp-487.mjs.

Fuentes: [mínimos y XP](../../qa/ATRIA_487_MINIMUM_HANDOFF_AND_GRADED_XP.md), [calidad](../../src/clinical/case-completion-487.js), [finalizador nativo de peritonitis](../../qa/peritonitis-native-finish-xp-487.mjs), [debrief V5](../../src/v5/clinical/closure-debrief.js).

## 15. Dr. Vega: Aprendiz y mentor

Vega es un docente con estados progresivos, no un bot que repite un checklist o se hace cargo silenciosamente de todos los casos. Flujo acordado: EVALUAR → ESTUDIO → ESPERAR → DIAGNÓSTICO PRESUNTIVO → PREGUNTAR CONDUCTA → ACTUAR → REEVALUAR; urgencia → ESTABILIZAR. Debe hablar poco pero dar orientaciones clínicas útiles; sugerir pasos dependientes de evidencia real; intervenir ante gravedad cuando el modo y la política lo permitan.

No exigir cultivos tardíos antes del diagnóstico presuntivo, ni estudios electivos que demoren shock. No convertir la charla con Vega en tratamiento ejecutado. En Solitario, el jugador puede llamarlo para discutir; en Aprendiz participa más activamente. En coop/competitivo mantiene autoridad y contexto por paciente, sin chatear por canales separados.

Fuentes: [Vega antiguo](../../src/integration/vega-step-coach-487.js), [sus pruebas](../../src/integration/vega-native-flow-487.test.js), [Vega V5 limitado](../../src/v5/clinical/vega-guidance.js). Estado V5: orientación básica para APP/CIRR; la IA docente multietapa original no está plenamente migrada.

## 16. Modos, lobby, chat, permisos y multijugador: principal finalidad de V5

**Aprendiz:** clínica compartida con Solitario, ayuda de Vega.

**Solitario:** clínica completa; todos los sistemas funcionan sin adaptadores exclusivos innecesarios.

**Cooperativo (2–4):** todos los médicos pueden evaluar, indicar y tratar al mismo paciente, viendo una única evolución y una sola enfermería/monitor/historial de guardia.

**Competitivo (2–4):** la primera interacción clínica VÁLIDA adquiere propiedad del paciente; un rival puede observar pero NO administrar, evaluar como propietario ni cerrar. Orden determinado por autoridad, no por quién dibuja primero en el navegador. No otorgar propiedad por un chat inválido/pregunta social, y no permitir dos cierres/XP simultáneos.

**Lobby:** presencia social compartida, amigos/invitaciones/party, retorno al lobby y varias guardias independientes (hasta cuatro por guardia). Diseñar para crecimiento masivo estilo Tibia: vecindad/interés para movimiento y visibilidad, NO difundir todo el mapa y todos los datos a todos los jugadores. La voz y el chat no deben interrumpir movimiento o poner el teclado en estado corrupto.

**Chat:** un único transcript global POR GUARDIA, visible a todos sus participantes; el paciente cercano oye por defecto. Tocar Enfermera/Vega prepara prefijo/mención en el mismo chat y conserva foco/caret; también se puede escribir destinatario manualmente. No crear chat privado de party dentro de la guardia ni un segundo historial solo para órdenes. Un mensaje del invitado debe aparecer para todos y ser oído por el paciente destinatario si está autorizado.

**Envío:** mensaje idempotente y confirmado con IDs; reintentar fallos de transporte sin perder ni duplicar; distinguir no entregado de rechazado clínicamente. Las órdenes de cualquier médico autorizado deben pasar por el MISMO owner clínico. El estado de enfermería, monitor, estudios, vitales, consultas, cierre y XP se replica como eventos confirmados, no como optimismo local.

**Movimiento:** V4 sufrió diferencias al observar sprites/remoto; utilizar interpolación/continuidad y generación de movimiento, pruebas con 2,3,4 navegadores, actualización dependiente de distancia/visibilidad y transiciones lobby/sala. El movimiento propio estable de V5 se conserva.

**Límite actual:** room-authority.js soporta contratos para solo/apprentice/coop/competitive y la CI HTTP prueba 2–4 Chromium, pero la UI de application.js mantiene deshabilitados Cooperativo y Competitivo y guard-session.js acepta sesión clínica local solo en solo/apprentice. **Multijugador clínico V5 aún no está integrado de extremo a extremo**, incluso cuando un protocolo aislado pasa. No confundir un test de relay con gameplay pleno.

Fuentes: [autoridad V5](../../src/v5/core/room-authority.js), [UI V5](../../src/v5/app/application.js), [chat antiguo](../../src/integration/chat-recipient-487.js), [matriz F/G/I](../../qa/clinical-room-browser-487.mjs), [modos 4.8.7](../../qa/multimode-combinatorial-487.mjs).

## 17. Interfaz y experiencia profesional

Mantener **mapa y personajes originales** de V5; no reemplazarlos por una maqueta o una generación visual sin relación con la UI existente. En móvil el usuario eligió **orientación vertical** con **teclado propio ATRIA compacto** y área de gameplay dominante; parte superior profesional con marca ATRIA y comunicación integrada. El teclado del juego debe gestionar foco, selección, composición IME y altura sin teletransportar sprites ni tapar áreas esenciales.

Menús/botones y ventanas deben permitir todas las funciones clínicas. Los registros de enfermería muestran "indicado" / "en preparación" / "administrado" / "suspendido", con identidad paciente y sin confundirlos. El cuadro de impresión diagnóstica flota sobre el paciente. Opciones de destino aparecen CONDICIONALMENTE al satisfacer reglas; para cirugía hay botón para solicitar consulta anticipada, pero el cierre definitivo solo aparece tras aceptación + criterios completos.

V4 se inspeccionó en dos Chromium (uno Pixel emulado): inventario de 12 estados/54 controles, pero solamente SEIS menús abiertos por esa auditoría; **no está certificado un clic por cada uno de los 54 controles ni todas sus combinaciones**. Se exige un nuevo censo accionable progresivo al migrarlos. Android físico sigue sin probar.

Fuentes: [censo visual](../../qa/v5/legacy-gameplay-surface-browser.mjs), [controles pacientes V5](../../src/v5/ui/patient-actions.js), [UI clínica V5](../../src/v5/ui/clinical-controller.js).

## 18. Estado REAL de la migración al HEAD de referencia

| Área | Implementación comprobada V5 | Falta antes de declarar paridad |
| --- | --- | --- |
| Mapa/cámara/sprites, teclado compacto | Sí, conservar | Pulido final y Android físico |
| Anamnesis/examen/monitor/estudios | Sí en APP/CIRR, contratos parciales comunes | Contenido real, observaciones y evaluadores de otros 11 |
| Enfermería física, parser, recibos | Sí para casos activos, combinaciones QA | Todas las intervenciones, ciclo compartido multijugador y alias especiales |
| Catálogo terapéutico | 30 entradas indexadas; **15 entradas IV ejecutables** | Resto de rutas, mecanismos, cinéticas, dosis especiales y casos ejecutores |
| Alergias/heparina y morfina | C1/C2.a/C2.b/B1 verificados | Completar demás daños y tratamiento de complicaciones por caso |
| Fisiología longitudinal peritonitis/sepsis | Módulo puro, comparado con original | Conectar al dueño PERI y tratamiento inmediato sin writer extra |
| Cierres | APP y CIRR completos, evaluación/debrief/XP únicos | 11 ejecutores, destino/contexto/consulta, paridad visual |
| Cirugía | APP: pedido y aceptación simplificados | Respuesta contextual antigua; consulta aceptada separada de elegibilidad |
| Impresión DX sobre paciente | Original V4 probado | Badge/contexto global de autocompletar en V5 |
| Vega | Orientación local APP/CIRR | Mentor docente completo del modo Aprendiz |
| Coop/competitivo, lobby, reconexión | Contratos/relay probados | Modos jugables, sesiones cliente real, WebRTC y estado compartido |
| QA | CI V5 374/374, core 40/40, histórica F/G/I verde | Validación integral 13 casos x modos x fármacos, Android físico |

**Última evidencia concreta antes de este documento:** C1/C2.b.1 sobre código 26cc058a30485191749b6df485f2a5221c525676. CI [V5 39067800949](https://github.com/javierdario48-star/ATRIA/actions/runs/39067800949) y [legado 39067800950](https://github.com/javierdario48-star/ATRIA/actions/runs/39067800950) para HEAD documental dee1f7f838afa6c1d6ff662be5d7471ebb07ad54, ambas completadas con éxito. Preview probada de código 26cc058 en CURRENT_HANDOFF. No afirmar 13 ejecutores ni 30 fármacos completos.

## 19. Matriz de pruebas de aceptación que no puede omitirse

**A. Clínica común:** ingreso real; múltiples preguntas, antecedentes y alergias; ALiCIA; examen regional/Glasgow; signos conocidos vs desconocidos; monitor conectar/desconectar; estudios pendientes vs hechos; alias y resultados correctos; dosis/órdenes repetidas vs eventos distintos; reevaluación; respuesta observable de fármaco; muerte; cierre.

**B. Diagnóstico:** badge visible sobre paciente, editor con autocompletado global no filtrado, impresión errónea/inespecífica/específica/sinónimos, persistencia por UID, espectador solo lectura y cierre sin editor activo.

**C. Altas:** mínimo insuficiente no habilita botón; tras mínimo y paciente estable, aparece automáticamente; cierre paga XP una sola vez; más anamnesis/estudios pertinentes mejora nota, estudios excesivos empeoran nota; alta inestable se rechaza.

**D. Cirugía:** "Enfermera cirugía" y botón mandan MISMA consulta; pendiente, rechazo por diagnóstico inespecífico o no concordante, falta de examen/monitor/estudio; shock no espera TC si es urgente; respuesta de aceptación por servicio; información precisa de pendientes de traslado; antibióticos aún no administrados no cuentan; elegibilidad→botón automático→derivación confirmada→XP único; sourceControlled no cambia.

**E. Otros destinos:** Sala/Observación/UTI/Procedimiento con sus criterios por caso y gravedad. Peritonitis terciaria con shock pasado sigue en UTI. PBE necesita paracentesis+albúmina+antibiótico; HDA/CHOLANG procedimiento es un handoff, no procedimiento realizado.

**F. Libertad/iatrogenia:** administrar ceftriaxona con alergia GRAVE declarada tras omitir anamnesis; daño luego del recibo y en el monitor; posibilidad de rescate; mala evolución/muerte si no se actúa; heparina en hemorragia real; furosemida en hipovolemia; error de tratamiento incluso con sintaxis válida; negar pregunta/orden no administra nada.

**G. Enfermería:** 421 combinaciones históricas, dos vías/monitor/oxígeno/Ringer/antibióticos, tiempos físicos, entrega de medicamento del invitado coop, idempotencia por eventId, reintentos, confirmaciones y recuperación tras recarga.

**H. Farmacología:** 30 entradas auditadas con estado explícito "solo catálogo" / "ejecutable parcial" / "efecto completo"; dosis y unidades g/kg y mg/kg, albúmina, noradrenalina titular/suspender, transfusión, morfina reciente con eliminación, 0–8 bolos y distintos estados hemodinámicos, antagonismo clínico, sobremedicación y dos discrepancias de diuréticos resueltas.

**I. Multijugador:** mismo caso 2–4 coop, movimientos remotos, chats de todos incluyendo invitados, enfermería global única, propietario competitivo por primera interacción válida, rival observador, consulta/cierre/muerte simultáneos, duplicaciones, desconexiones y reconexiones, distintas guardias aisladas y retorno lobby; prueba de móvil real si existe dispositivo accesible.

**J. Pruebas históricas mínimas:** qa/nurse-combinatorial-bot-487.mjs (421), qa/closure-xp-combinatorial-487.mjs (131), qa/iatrogenic-wrong-treatment-487.mjs (39), qa/care-journeys-487.mjs (26 caminos; fixture NO cierra realmente), qa/peritonitis-native-finish-xp-487.mjs (3 cierres+XP), qa/clinical-room-browser-487.mjs (F/G/I), qa/v5/legacy-gameplay-surface-browser.mjs (inventario no recorrido completo). Añadir tests cuando una parte no esté cubierta. **Nunca cambiar pruebas para encubrir un defecto.**

## 20. Arquitectura, orden de trabajo y entregables

Repositorio protegido: no modificar main, ramas viejas ni vendor/atria-4.8.6. Work y otro agente nunca deben editar a la vez la misma rama. Obtener HEAD al comenzar, preferir commits pequeños y publicados, y verificar los hashes de los builds si se despliega.

**Orden inmediato basado en CURRENT_HANDOFF (conservar avances ya realizados):**

- **K1 / C2.c — farmacología:** albúmina, noradrenalina titulable y transfusión desde el ejecutor común; reparar parseo de albúmina g/kg/hepatograma y preservación mg/kg. Continuar familias restantes sin copiar wrappers. Corregir riesgos/dosis sin vetar decisiones incorrectas.
- **K2 / UX y cierre como contrato transversal, concurrente con migración clínica:** reusar diagnóstico global flotante, evaluador contextual de interconsultas, pending/rejected/accepted del servicio y elegibilidad de destino que aparece sola. Antes de migrar cada caso, probar su recorrido desde interacción hasta XP. El botón quirófano no debe aparecer como cierre habilitado por una consulta aceptada prematuramente.
- **K3 / C3 — PERI-SEC, luego PBE/TER:** integrar fisiología ya extraída, fuente antigua inmediata y evaluar caso con csPeritonitisEvaluate487. No exigir operación ni falso control del foco para cerrar.
- **K4 / C4 — 8 casos restantes originales:** migrar en grupos pequeños, conservar destinos, evidencias, tratamientos, respuesta al tiempo y finalizador propio. No inventar casos nuevos.
- **K5 / C5 — multijugador central:** adaptar el clínico único a sala 2–4, mantener chat único y cola de enfermería/UID/propiedad, integrar lobby/transporte/replicación y browser/Android. Este es el motivo principal de la arquitectura V5.
- **K6 / C6 — presentación profesional:** pulir solo tras coherencia clínica y redes, conservando jugabilidad/cámara/teclado/estilo aprobado.

Los checkpoints deben cumplir: cambios fuente → tests V5 → 40 core o más → build V5 y core → auditoría de frontera → regresión 4.8.7 completa → browser real (desktop+Pixel emulado) → HTTP multi-cliente → ambas CI por SHA exacto → preview correspondiente si se puede desplegar → handoff con estado real y próximos límites. **No declarar completo por existir función o etiqueta.**

**Comandos reproducibles:** npm run test:v5, npm run test:v5-core, npm run build:v5, npm run build:v5-core, node scripts/audit-v5-boundary.mjs, npm test, npm run build, npm run qa:case-completion, npm run qa:clinical-destinations, npm run qa:peritonitis-native-finish. Consultar package.json; si algún alias no existe, usar el test Node real documentado, sin crear un atajo ficticio. La preview nunca puede probar hardware Android físico por simple emulación.

## 21. Registro de evidencia, incertidumbres y prohibiciones de afirmación

**Hechos comprobados:** destino y puntuación de los 13 casos en código antiguo; 3 peritonitis con cierre original real y XP; 131 variantes de cierre; 421 pruebas enfermería; 39 casos adversariales; 26 caminos de referencia (sin cierre por configuración de fixture); dos Chromium y censo 54 controles/12 estados/6 menús; C1/C2.b.1 V5 374/374 y CI histórica verde.

**No comprobado aún:** que todos los 54 botones originales fueron pulsados, que el frontend V5 ofrece el flujo contextual de interconsultas, que todos los casos reciben estado y penalización perfectamente equivalentes a V4, que 30 entradas están administrables, que funciona un lobby masivo real, que toda la atención de 2–4 jugadores está desplegada, que Android/iPhone físicos fueron probados o que el experimental B1 era apto para producción.

**Fuentes de seguimiento:** [handoff actual](CURRENT_HANDOFF.md), [matriz de migración](PARITY_MATRIX.md), [auditoría legado](STEP_12H_LEGACY_FUNCTIONAL_AUDIT.md), [C1 libertad](C1_CLINICAL_FREEDOM.md), [C2 fármacos](C2B_MORPHINE_EXECUTION.md), [referencia cierres](../../qa/ATRIA_487_MINIMUM_HANDOFF_AND_GRADED_XP.md).

**Prohibición de regresiones de reglas:** no volver a imponer bloqueo de alergias, cirugía efectivamente hecha antes de derivar, autocompletar diagnóstico según caso oculto, tratamientos por simple orden, múltiples chats, progreso fisiológico arbitrario, múltiples escritores o XP por cierre duplicado. Cualquier diferencia nueva requiere reproducir el caso original, explicar por qué el cambio mejora una falla demostrada y protegerlo con prueba.

---

## Definición final de ATRIA terminado

ATRIA 5.0 estará completo cuando los **13 casos originales puedan atenderse y cerrarse con destino correcto**, manteniendo libertad médica y consecuencias, medicamentos y procedimientos originales realmente ejecutables, evaluación/XP fiel, interfaz coherente y **la misma clínica jugable en los cuatro modos** con movimientos/chat/enfermería/autoridad multijugador estables para 2–4 jugadores, sin perder el mapa ni la experiencia móvil. Se certifica con tests de flujo real y regresiones, no por cantidad de módulos ni por CI de una sola capa.
