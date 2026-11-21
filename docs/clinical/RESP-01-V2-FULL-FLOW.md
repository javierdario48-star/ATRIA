# ATRIA 5.0 — Grafo clínico transversal completo y piloto RESP-01 V2

**Ámbito:** solo rama experimental; diseño de referencia y candidata V2 aislada, no activada. **Verdad diagnóstica simulada**, **decisión del médico**, **criterio del receptor** y **puntuación** son conceptos distintos. El reloj sigue corriendo durante todas las ramas. Un intento rechazado no borra los recibos; la guardia admite reintento, rescate y recuperación.

## Diagrama 1. Flujo íntegro: del ingreso a la evaluación y la siguiente guardia

~~~mermaid
flowchart TB
  START([Guardia iniciada · autoridad única]) --> ADMIT["Ingreso · UID de paciente · cama · modalidad · semilla y revisión fijas"]
  ADMIT --> HIDDEN["Verdad oculta: enfermedad, antecedentes, alergias, dificultad, severidad, evolución y candidatos de complicación"]
  HIDDEN --> RECEPTION["Recepción y triaje visibles: queja, prioridad y estado inicial"]
  RECEPTION --> CLAIM{"¿Médico con permiso de atención y paciente correcto?"}
  CLAIM -- No --> AUTH["Proteger historia privada; adquirir/esperar foco clínico"]
  AUTH --> CLAIM
  CLAIM -- Sí --> LOOP["Atención libre · los pasos pueden ejecutarse en paralelo"]

  subgraph ASSESS["Información clínica y razonamiento"]
    direction TB
    HISTORY["Anamnesis universal: pregunta, intención, repregunta, alergias, antecedentes, fármacos, tiempo, apoyos"]
    HISREC["Respuesta del paciente/familiar: personalidad, memoria, conciencia, variación · guardar evidencia"]
    EXAM["Exploración: signos, monitor real y maniobras anatómicas"]
    FINDINGS["Hallazgos ligados a paciente, técnica y minuto"]
    STUDY["Solicitar estudio global: pertinencia, tipo, muestra, protocolo, serie"]
    STUDYRESULT{"¿La técnica es ejecutable y el informe está disponible?"}
    STUDYPENDING["Solicitud en curso · latencia y muestra independientes"]
    STUDYDONE["Informe ligado a UID/tiempo; repetición solo con nueva muestra"]
    DX["Impresión diagnóstica del médico: editable, específica, sindromática, errónea o incierta"]
    HISTORY --> HISREC
    EXAM --> FINDINGS
    STUDY --> STUDYRESULT
    STUDYRESULT -- Sí --> STUDYPENDING --> STUDYDONE
    STUDYRESULT -- No --> UNAVAILABLE["No inventar análisis ni resultados; informar indisponibilidad"]
    HISREC --> DX
    FINDINGS --> DX
    STUDYDONE --> DX
  end

  subgraph TREAT["Tratamientos, tiempo y fisiología con un solo propietario"]
    direction TB
    ORDER["Orden libre: fármaco, procedimiento, soporte, dosis, vía, duración, destinatario"]
    TECH{"¿Acción técnicamente ejecutable?"}
    REJECTTECH["Rechazo técnico con motivo; sin administración ni efecto"]
    NURSE["Enfermería prepara, comprueba paciente, vía, dosis, alergia; cola durable"]
    ADMIN{"¿Administración/ejecución confirmada por recibo único?"}
    WAITADMIN["Pendiente, sin efecto ni crédito de tratamiento ejecutado"]
    CONDITIONAL["Tratamiento condicional: antibiótico u otro mecanismo diferido"]
    DIRECT["Tratamiento fisiológico: oxígeno, volumen, vasopresor, ventilación y daño posible"]
    EXPOSURE["Exposición real, inicio, latencia, intensidad y retirada por propietario común"]
    NATURAL["Historia natural: evolución sin tratamiento; retraso y omisión"]
    RNG["Semilla persistente: candidato probabilístico, nunca resultado forzado"]
    ELIGIBLE{"¿Tiempo y estado fisiológico permiten episodio?"}
    COMPLICATION["Complicación real; modifica síntomas, monitor y prioridades"]
    RESCUE{"¿Rescate indicado y ejecutado/confirmado?"}
    RECOVER["Recuperación temporal con recibos, sin curación instantánea"]
    ADVERSE["Iatrogenia, alergia, sobredosis o tratamiento erróneo · causalidad"]
    CRITICAL{"¿Fallece, entra en shock o empeora?"}
    TERMINAL["Muerte irreversible; guardar evento único; no XP ficticia"]
    ORDER --> TECH
    TECH -- No --> REJECTTECH
    TECH -- Sí --> NURSE --> ADMIN
    ADMIN -- No --> WAITADMIN
    ADMIN -- Sí --> CONDITIONAL
    ADMIN -- Sí --> DIRECT
    CONDITIONAL --> EXPOSURE
    DIRECT --> EXPOSURE
    EXPOSURE --> ADVERSE
    NATURAL --> RNG
    RNG --> ELIGIBLE
    ELIGIBLE -- Sí --> COMPLICATION
    ELIGIBLE -- No --> NATURAL
    COMPLICATION --> RESCUE
    RESCUE -- Sí --> RECOVER --> CRITICAL
    RESCUE -- No --> CRITICAL
    ADVERSE --> CRITICAL
    CRITICAL -- Muerte --> TERMINAL
  end

  subgraph HELP["Pistas de Dr. Vega · misma fuente de requisitos"]
    direction TB
    HINT["Pedir pista del paciente activo"]
    READ["Leer requisitos de cierre, riesgos actuales, observaciones y recibos"]
    PRIORITY{"¿Existe acción clínica prioritaria, válida y no completada?"}
    HINTNEXT["Mostrar UNA orden/control real; no revelar diagnóstico oculto"]
    HINTWAIT["Esperar estudio, enfermería o receptor; no cobrar repetición/espera"]
    HINTCHARGE["Descontar 5 % XP por nueva acción cobrada; historial idempotente"]
    HINT --> READ --> PRIORITY
    PRIORITY -- Sí --> HINTNEXT --> HINTCHARGE
    PRIORITY -- No --> HINTWAIT
  end

  subgraph DISPO["Destino y receptor · no consultar la respuesta clínica oculta"]
    direction TB
    REEVAL["Reevaluar: signos medidos, respuesta, riesgos, tratamiento realizado, tiempo"]
    DEST["Elegir alta, observación, sala, UTI, procedimiento o quirófano"]
    ACTIVE{"¿Solo vigilancia activa sin cierre formal?"}
    OBSERVE["Continuar atención; evolución, estudios y reevaluación"]
    EXTERNAL{"¿El destino requiere servicio receptor?"}
    ELECTIVE{"¿Alta/observación clínicamente segura, con plan y requisitos duros?"}
    PUBLICDX{"¿Impresión DECLARADA y datos visibles justifican este servicio?"}
    UNSUPPORTED["Rechazar: diagnóstico declarado/datos no justifican destino"]
    STABILIZED{"¿Preparación mínima, estudio urgente y estabilidad de traslado?"}
    PREPARE["Rechazar con pendientes concretos; corregir y reintentar"]
    CONSULT["Solicitud asíncrona al servicio · solo expediente comunicado"]
    ACCEPT{"¿Aceptación documentada? · acto receptor no es cirugía realizada"}
    REJECTRECV["Rechazo informado, expediente sigue activo"]
    CLOSE["Cierre inicial único por UID, destino y evento; XP aún no decidido"]
    REEVAL --> DEST --> ACTIVE
    ACTIVE -- Sí --> OBSERVE
    ACTIVE -- No --> EXTERNAL
    EXTERNAL -- No --> ELECTIVE
    ELECTIVE -- Sí --> CLOSE
    ELECTIVE -- No --> PREPARE
    EXTERNAL -- Sí --> PUBLICDX
    PUBLICDX -- No --> UNSUPPORTED
    PUBLICDX -- Sí --> STABILIZED
    STABILIZED -- No --> PREPARE
    STABILIZED -- Sí --> CONSULT --> ACCEPT
    ACCEPT -- Sí --> CLOSE
    ACCEPT -- No --> REJECTRECV
  end

  subgraph SCORE["Evaluación DESPUÉS del cierre y continuidad"]
    direction TB
    TRUTH["Evaluador compara actuaciones con la enfermedad verdadera oculta"]
    QUALITY["Desglose: precisión diagnóstica · historia · examen/seguridad · estudios · tratamiento · eficiencia"]
    PENALTY["Penalizar pruebas injustificadas, retrasos, omisiones y daño causal documentado"]
    XP["Un solo recibo de XP / penalizaciones; cero o incluso débito según política, sin retroalterar recepción"]
    DEBRIEF["Debrief clínico: aciertos, faltantes, riesgo, alternativas; no confundir aceptación con acierto"]
    GUARD{"¿Fin de guardia, continuar otra o guardar/salir?"}
    SAVE["Checkpoint: pacientes, orden, complicación, historial, pista, XP y reloj"]
    NEXT["Siguiente guardia; pacientes y decisiones según persistencia"]
    TRUTH --> QUALITY --> PENALTY --> XP --> DEBRIEF --> GUARD
    GUARD -- Guardar/salir --> SAVE
    GUARD -- Continuar --> NEXT
    SAVE --> NEXT
  end

  LOOP --> HISTORY
  LOOP --> EXAM
  LOOP --> STUDY
  LOOP --> ORDER
  LOOP --> NATURAL
  LOOP --> HINT
  LOOP --> REEVAL
  DX --> REEVAL
  EXPOSURE --> REEVAL
  CRITICAL -- Vivo --> REEVAL
  HINTNEXT --> LOOP
  HINTWAIT --> LOOP
  WAITADMIN --> LOOP
  REJECTTECH --> LOOP
  UNAVAILABLE --> LOOP
  OBSERVE --> LOOP
  PREPARE --> LOOP
  UNSUPPORTED --> LOOP
  REJECTRECV --> LOOP
  CLOSE --> TRUTH
~~~

## Diagrama 2. Piloto RESP-01: de NAC ambulatoria V1 a candidata V2

~~~mermaid
flowchart TD
  A["RESP-01 · fiebre, tos, dolor pleurítico; signos inicialmente estables"] --> H["Anamnesis (onset, alergias, antecedentes, apoyo) y examen torácico"]
  H --> S["Radiografía: consolidación basal; hemograma y función renal según necesidad"]
  S --> DX["Impresión presuntiva: NAC u otro diagnóstico del jugador"]
  DX --> ABX{"¿Antibiótico correcto administrado?"}
  ABX -- Sí --> RX["Amoxicilina 1 g VO, efecto diferido; no mejora instantánea"]
  ABX -- No --> OMIT["Enfermedad sigue evolucionando; omisión/error afecta calidad y riesgo"]
  RX --> CHANCE{"¿Complicación seleccionada por semilla (20 % sintético) y estado/tiempo elegibles?"}
  OMIT --> CHANCE
  CHANCE -- No --> ASSESS["Reevaluar signos, oxigenación, estudios y respuesta"]
  CHANCE -- Sí --> HYPOX["Nuevo episodio hipoxémico; disnea y descenso real de SpO2"]
  HYPOX --> STABILIZE["Oxígeno según necesidad, antibiótico indicado y reevaluación"]
  STABILIZE --> RESCUE{"¿Recibos de rescate y tiempo de recuperación cumplidos?"}
  RESCUE -- No --> HYPOX
  RESCUE -- Sí --> ASSESS
  ASSESS --> TRIAGE{"¿Paciente clínicamente seguro para alta?"}
  TRIAGE -- Sí, sin complicación activa --> DISCHARGE["Alta con primera dosis, indicaciones, seguimiento y señales de alarma"]
  TRIAGE -- Incierto y requiere vigilancia --> OBS["Cierre hacia Observación con evaluación segura"]
  TRIAGE -- Requiere internación --> WARD["Solicitud a Clínica médica: impresión comunicada, examen, resultados, estabilización"]
  WARD --> ACCEPT{"¿Receptor acepta y preparación mínima completa?"}
  ACCEPT -- No --> HYPOX
  ACCEPT -- Sí --> HANDOFF["Internación aceptada; no equivale a curación"]
  DISCHARGE --> SCORE["Evaluar verdad oculta, estudio oportuno, antibiótico administrado, anamnesis, recursos y daño"]
  OBS --> SCORE
  HANDOFF --> SCORE
  SCORE --> XP["XP/descuento y desglose; cierre idempotente"]
~~~

## Encaje del caso original y diferencias específicas

| Subcontrato | RESP-01 V1 observado | RESP-01 V2 candidata |
| --- | --- | --- |
| Identificador y motor | RESP-01, ejecutor agudo compartido | Exactamente el mismo RESP-01 y ejecutor |
| Anamnesis | Inicio, alergias, antecedentes, apoyo; sistema de preguntas compartido | Conserva hechos y respuestas; personalidad ya proviene de semilla, no necesita motor distinto |
| Estudios | Radiografía basal, hemograma, renal | Conserva anteriores y agrega gasometría/lactato de reevaluación dinámicos opcionales |
| Diagnóstico | NAC, varios alias aceptados | Mismo diagnóstico real; la impresión del jugador continúa editable |
| Tratamiento principal | Amoxicilina oral; respuesta diferida | Igual; oxígeno resuelve una complicación seleccionada por semilla, con recibo |
| Aleatoriedad | Sin complicación declarada | 20 % de *selección de candidato* por semilla, no 20 % de muerte ni incidencia real; episodio además necesita tiempo/estado |
| Trayectoria fisiológica | Natural y respuesta a antibiótico | Conservada, más deterioro hipoxémico y recuperación de dueño compartido |
| Destinos | Alta | Alta segura, Observación, Sala con aceptación de Clínica |
| Guardas de seguridad | Solo signos de alta y protocolo original | Opt-in: alta bloqueada si episodio nativo no se resolvió |
| Dr. Vega | Requisitos vigentes de cierre V1 | Requisitos vigentes de V2, incluido rescate/espera, sin motor de pistas nuevo |
| Puntuación | Calculador histórico V4/V5 | MISMO calculador; no se alteran pesos ni penalizaciones todavía |
| Producción | V1 activa | V2 solo en módulo experimental, catálogo activo intacto |

**Nota de alcance:** la elección de 20 % y las magnitudes de deterioro son parámetros de *juego* sujetos a calibración, no pronóstico clínico. Las respuestas a tratamientos y las latencias pertenecen al motor compartido y no se duplican. Esta candidata todavía no está validada médica ni funcionalmente; el bot debe determinar qué rutas funcionan y qué brechas quedan. El selector V1/V2 de producción continúa pendiente.

## Pruebas de comparación: criterios de validez

El bot de la rama experimental crea un catálogo aislado con V1 y otro con V2, sin registrarlas juntas. Cada par utiliza el mismo texto de semilla, perfil y modalidad, pero un caso de complicación confirmada selecciona un UID que produzca candidato en V2; se informa explícitamente esa asimetría. Se recorren las rutas de médico competente, lento, inexperto, negligente, sin estudios, medicamento equivocado, omisión de pregunta de alergias, abandono y rescate de complicación en Solitario, además de pilotos en Aprendiz, Cooperativo y Competitivo. Registra recibos, trayectoria de signos, tiempos, resultado final, XP, calidad, recursos, reconexión y diferencias.

La nueva versión solo será aprobada si mejora integridad **sin empeorar** las garantías existentes: mismo motor, mismo UID persistido, ningún doble recibo, pistas y requisitos consistentes, estabilidad y cierre seguros, sin tratamientos inventados y sin secretos filtrados al servicio. Se debe comparar rendimiento en un entorno controlado distinto del tiempo bruto de CI, y distinguir funcionalidades más ricas de mayor velocidad. Una V2 más lenta por una observación real y justificada puede ser más correcta, pero debe documentarse.

**Brecha aún ajena al piloto:** aceptación de una derivación errónea por un servicio que NO conoce el caso verdadero. Las reglas actuales de servicios siguen consultando datos específicos de la enfermedad. Este cambio transversal requiere contrapruebas separadas con APP-001 y pacientes de enfermedades alternativas y no se resuelve falsificando un resultado del bot de RESP-01.

## Certificación experimental por pares — segundo ciclo corregido

**Código auditado:** `2b077626a109a1d429ac92e384cde984d0cbf765`. [Workflow nativo (SUCCESS)](https://github.com/javierdario48-star/ATRIA/actions/runs/44934331942), jobs `staging-contract` y `paired-native-bot` en verde. La documentación posterior con `[skip ci]` no cambia ese código certificado.

**Pruebas:** 4/4 contratos dirigidos de candidata (integración aislada, aleatoriedad determinista/identidad paritaria, restricción de alta e internación indebida, pista real de Dr. Vega), 10/10 regresiones de cierre original; 15 pares emparejados (30 recorridos nativos) con `errors=[]` del comparador y 4/4 recorridos competentes V2 aprobados. Rutas adversas se registran como resultados observados, no como tratamiento exitoso ficticio.

**Defecto encontrado y corregido entre campañas:** en [primer ciclo](https://github.com/javierdario48-star/ATRIA/actions/runs/44933530702), el bot elegía Sala para NAC estable sin deterioro y aun así lograba 100 de calidad. La revisión añade una política reusable `escalationDestinations` para exigir deterioro manifiesto o episodio efectivamente ocurrido (nunca solo candidato aleatorio), y deja al comparador optar explícitamente por alta en escenarios ambulatorios. En el [segundo ciclo](https://github.com/javierdario48-star/ATRIA/actions/runs/44934331942), RESP-01 V2 **termina en alta** en los casos competentes estables, manteniendo calidad 100 y XP 133 en Solitario; el episodio aleatorio en Aprendiz se **recupera antes del alta**. La ruta con episodio y necesidad de cuidados puede transferir a Sala con recepción documentada y queda cerrada sin ejecutar un procedimiento ficticio.

**Comparación de eficiencia:** V2 no es más rápida por definición. En Solitario competente estable, V2 realizó seis acciones adicionales y 30,75 segundos de guardia simulada más por la observación requerida; el manejo con rescate forzado consumió doce acciones adicionales y 137,75 segundos más. No confundir segundos simulados de atención con CPU ni latencia de Android. El beneficio demostrado es **mayor cobertura de un escenario clínico y menor riesgo de derivación innecesaria**, no una mejora de velocidad cuantificada.

**Pendientes reales antes de activar:** política de receptor ajena a la verdad oculta para diagnósticos falsos plausibles; evaluación médica independiente del modelo de descompensación y tratamiento; estudio por estudio de catálogo universal; pruebas de pistas completas, variabilidad y rehabilitación; comparación de rendimiento real 1/2/4 clientes; selector transaccional V1/V2 con rollback y persistencia compatible; Vercel/Android físicos. **V2 permanece candidata aislada y V1 sigue siendo la única versión activa.**
