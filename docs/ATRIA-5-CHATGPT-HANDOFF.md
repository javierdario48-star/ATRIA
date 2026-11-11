# ATRIA 5.0 · Traspaso a ChatGPT

Actualizado el 11 de noviembre de 2026. Continuar por DX-01 y LAB-02, con cambios pequeños y pruebas dirigidas. La [cola técnica](ATRIA-5-REMAINING-TASKS.md) asigna los 60 requisitos y señala dónde hace falta una comprobación externa.

## Punto de partida

- Repositorio `javierdario48-star/ATRIA`. Única rama autorizada `atria-5.0-core-rebuild-experimental`.
- HEAD remoto recuperado `53a0005f14f43071868813027c4740ebf22a6e38`. Conserva la reconciliación de referencias (`836e978`), controles y errores visibles (`401006a`), recuperación con sala temporal caducada y protección por médico (`de7d42e`), y evidencia previa (`53a0005`).
- Checkpoints nuevos `04b4a7ae61991c082c4a7682b88a99d6ff1f7d45` para la prueba enfocada de recuperación y `448917d5dda2b8e33c5df27293f2335b5d44f3f0` para la entrega de Vega. Este documento y la cola están en el commit de entrega que sigue a ese HEAD de código.
- El HEAD final de la entrega se obtiene con `git log -1 --format=%H -- docs/ATRIA-5-CHATGPT-HANDOFF.md`. Para empezar una nueva corrección, consultar el HEAD remoto actual mediante los comandos de continuidad. La rama puede avanzar después de la entrega.

## Recuperación y Vega

La corrección de guardias ya estaba publicada. Se conservaron las pruebas de dos cuentas, tres modos, sesiones independientes, sala temporal caducada y continuación de 24 minutos. La ejecución principal de GitHub Actions de ese HEAD aprobó 30/30 trabajos. La prueba de preview antigua confundía el intervalo de comprobación asíncrona con la ausencia de una guardia. Ahora espera el control de recuperación. Se recuperaron las capturas de fallo, y el runner permite comprobar solo Solitario sin crear un segundo médico.

La comprobación enfocada del preview de `53a0005` pasó con una cuenta Supabase en dos procesos Chromium y un viewport Pixel 5. Retomar conservó el paciente. Guardar permitió volver a entrar. Finalizar liberó la participación y permitió regresar al lobby. La espera que había fallado al reabrir el dispositivo anterior se completó en esta ejecución. La aceptación en el teléfono físico de las dos cuentas del usuario queda pendiente.

Vega solicita `prepare` con `verify: true`. El mismo procesamiento que autentica médico, guardia, atención, paciente y revisión de selección calcula y verifica la oferta. La primera respuesta trae la instrucción. El cliente antiguo puede seguir pidiendo `prepare` y `revalidate` por separado. La interfaz informa que está buscando la acción desde el toque, ignora pulsaciones repetidas mientras la consulta sigue activa y presenta la pista al recibirla. La confirmación `displayed` sigue después de pintarla. El historial por médico y atención aplica el 5% a una pista nueva, con idempotencia. Una respuesta fuera de contexto se descarta. Se redujeron de dos a una las operaciones necesarias antes de ver la pista. La latencia en segundos depende del transporte y la carga.

## Evidencia reutilizable

| Código y entorno | Resultado observado |
| --- | --- |
| `53a0005`, suite V5 | 2.930 pruebas aprobadas. GitHub Actions principal 30/30. |
| Migración `20261106143151_guard_recovery_reference_reconciliation.sql` instalada | 34 verificaciones PostgreSQL en transacciones revertidas con datos QA. |
| `53a0005`, navegador local autenticado y SQLite CAS | Recuperación y finalización en Solitario, Cooperativo y Competitivo. Dos cuentas, un tercer dispositivo, guardias obsoletas y aislamiento de colegas. |
| `53a0005`, regresión compartida | Reconexión, respuesta perdida, una sola administración por orden y límite de 24 minutos con reloj acelerado. |
| `53a0005`, preview publicado con Supabase | Solitario, una cuenta, dos procesos independientes. Restauración, salida temporal, finalización y reingreso. |
| `448917d`, pruebas dirigidas | 31 aprobadas. Presentador, historial, sesión clínica, CAS, XP y cierre con confirmación en la misma transacción. |
| `448917d`, navegador local | Menú y pista visibles en escritorio/Solitario y Pixel 5 emulado/Aprendiz. Repetición gratuita, descuento visible y XP acreditada coherente. |
| `448917d`, build V5 | `npm run build:v5` completado. |

La ejecución [principal del HEAD recuperado](https://github.com/javierdario48-star/ATRIA/actions/runs/42237570421) conserva evidencia de recuperación. El [fallo del preview anterior](https://github.com/javierdario48-star/ATRIA/actions/runs/42237570430) corresponde al selector prematuro del test. La evidencia del preview de la entrega se identifica por su SHA en Vercel y GitHub Actions. Un build o una prueba local no acreditan una sesión del teléfono físico.

## Mapa de la arquitectura

| Flujo | Entrada, autoridad y presentación |
| --- | --- |
| Pista | `src/v5/app/application.js` → `clinicalHintContext` y menú del paciente → `src/v5/ui/clinical-hint-presenter.js:createClinicalHintPresenter.reveal` → `guardSession.hint` o `src/v5/social/durable-cooperative-replica.js:hint`. `src/v5/clinical/guard-runtime.js:hint` valida selección y acceso. `guard-session.js:clinicalHint` usa `currentChecklist`, `clinical-hint-requirements.js:clinicalHintRequirements` y `clinical-hints.js:selectClinicalHint`. `clinical-hint-ledger.js:createClinicalHintLedger.request` registra oferta y confirmación. |
| Conversación y órdenes | `application.js:submitText` fija `targetPatientUid` e ID de evento → `durable-cooperative-replica.js:post/synchronize/accept` → `src/v5/server/clinical-http.js:createClinicalHttp` → `durable-guard-authority.js:transact` → `guard-runtime.js:post` y `guard-session.js:post`. `src/v5/core/speech-router.js:routeWardSpeech` clasifica. `patient-dialogue.js:executePatientDialogue` y `patient-question-context.js` resuelven hechos y repreguntas. `patient-language.js:speakPatientHistory` expresa esos hechos. `src/v5/engine/nurse-dispatcher.js:createNurseDispatcher` asigna el trabajo físico. |
| Selección y contenido tardío | `src/v5/app/patient-selection.js:directPatientIntent/createDirectPatientSelection/resolveClinicalMessageTarget`. `durable-cooperative-replica.js:claim/observe` mantiene la intención de foco y la vista confirmada. `guard-runtime.js` valida la cama y la propiedad competitiva. `src/v5/ui/guard-chat-view.js:visibleWardChatRows/createWardChatHistory` conserva el historial por guardia, médico y paciente. |
| Estudios y fisiología | `clinical/study-order-vocabulary.js:studyOrderVocabulary` y `ui/clinical-autocomplete.js:studySearchChoices` comparten catálogo. `clinical/study-evidence.js:studyEvidenceId` relaciona identificadores equivalentes. `clinical/studies.js:createStudyService.request/advance` materializa resultados, tiempos y muestras. `currentStudyResult` lee `patient-observations.js:readRespiratoryObservation/readNeurologicalState` y `receipts.js:confirmedClinicalTreatment`. El catálogo base está en `src/clinical/study-registry.js`. |
| Impresión diagnóstica | `src/v5/ui/diagnostic-impression.js:diagnosisEditorHTML` y `clinical-controller.js:showDiagnosis/saveDiagnosis` envían `/diagnostico`. `routeWardSpeech` emite `diagnosis.record`. `acute-care.js` y `cirr-care.js` escriben el diagnóstico. `diagnostic-assessment.js:assessDiagnosticImpression` evalúa pertinencia. La insignia lee el paciente confirmado. |
| Recuperación | `src/v5/social/account-client.js:restore/call` → `server/account-gateway.js:createAccountGateway` → `server/supabase-account-store.js:guardRecovery` y la migración indicada. `ui/guard-recovery.js:createGuardRecovery.show/run` verifica y presenta. `application.js:recoverAccountGuard` transfiere control y solicita `resume` o `leave` a la autoridad nativa. `clinical/guard-turn-control.js:createGuardTurnControl` conserva participación y consenso. |
| XP y equipo | `clinical/guard-session.js:rewardFor` usa `clinical-hint-ledger.js:hintAdjustedXP`. `server/clinical-reward.js:settleClinicalAccount/attachCreditedCaseReward` proyecta recibos privados acreditados. `clinical/progression.js:createProgressionLedger` mantiene eventos únicos. `ui/case-debrief.js` y `ui/guard-scoreboard.js:guardScoreModelV5` presentan XP. `clinical/guard-communication.js` guarda actividad y chat de equipo. `social/cooperative-link.js` recibe avisos de commit y sincroniza presencia. |
| Evaluación y destino | `clinical/guard-session.js:closureReadiness/currentChecklist` → `clinical/clinical-policy-closure.js:evaluateClinicalPolicyDisposition` o `gastro-closure-v5.js:evaluateGastroDisposition`. `consultation-evidence.js:consultationEvidenceReview/consultationPreparationReview` y `surgical-consultation.js:reviewFor` revisan recepción. `clinical/acute-care.js:createAcuteCare` ejecuta decisiones y consecuencias. La UI emite una sola decisión de destino. |

Las rutas `clinical/`, `ui/`, `social/` y `server/` sin prefijo en esta tabla pertenecen a `src/v5/`.

## Demoras identificadas

- **Mensaje y orden.** `submitText` ya muestra el envío local y encola el evento con UID. El chat social de proximidad es un aviso que no se espera para ejecutar. `synchronize` serializa mutaciones. Si falla el envío activo, `flushPending` deja la cola para el siguiente `maintain`. Medir esa espera aparte de la marcha de Enfermería y del tiempo de laboratorio.
- **Confirmación.** `transact` lee el checkpoint, adquiere la reserva con CAS, restaura y avanza el runtime, confirma con otro CAS y devuelve la proyección. La lectura `observe` ya evita la reserva. Después de un cierre, `settleClinicalAccount` puede consultar recibos, acreditar y volver a consultar antes de responder. Es un candidato medible en guardias con varios casos, sin asumir que explica cada demora.
- **Diagnóstico.** `saveDiagnosis` espera `post` antes de cerrar. La continuación compara UID, pero no la instancia del editor. Una respuesta antigua puede alcanzar un editor nuevo del mismo paciente. La modificación requiere conservar el borrador ante rechazo y confirmar la insignia con el recibo real. Queda en DX-01.
- **Pista.** Se eliminó la revalidación de red anterior a la visualización. El envío sigue en la cola nativa y el cobro sigue vinculado a la confirmación de visualización. No hay medición de la mejora en un teléfono físico.
- **Selección.** El flujo directo ya existe y tiene pruebas de cambio rápido. Solo volver a tocarlo si una traza demuestra una espera en la confirmación del foco, no por la demora de un mensaje posterior.

## Tareas delegables

### DX-01 · P1 · ChatGPT

**Problema y causa.** La ventana se mantiene abierta durante `await post` y la continuación usa un UID que puede coincidir con una reapertura posterior.

**Archivos y cambio.** En `clinical-controller.js:saveDiagnosis` capturar sesión, UID, valor e instancia del campo. Marcar un solo envío en curso. Cerrar el editor cuando el comando queda realmente encolado, con estado pendiente que pueda reconciliarse. Usar `application.js:submitText` y el recibo existente para mostrar la confirmación. En rechazo, conservar el borrador asociado a esa atención y dar reintento. La insignia debe reflejar el diagnóstico autorizado.

**Compatibilidad.** Mantener `/diagnostico-borrar`, entrada por voz y vista de solo lectura competitiva. No cerrar un panel posterior, incluso si su UID coincide.

**Prueba y comando.** Retrasar el recibo en `qa/v5/diagnosis-browser.mjs`. Probar doble toque, cambio A→B, reapertura de A, rechazo y recarga. Ejecutar `node --test src/v5/ui/diagnostic-impression.test.js src/v5/core/nurse-diagnosis-speech.test.js` y `npm run build:v5 && node qa/v5/diagnosis-browser.mjs` con Playwright instalado.

**Aceptación.** El editor responde al envío sin esperar la red, conserva el borrador en error y la insignia coincide con lo guardado tras reconectar.

### LAB-02 · P2 · ChatGPT

**Problema e hipótesis.** VEDB y variantes de colonoscopia pueden quedar fuera del vocabulario compartido. Reproducir cada variante contra el catálogo real.

**Archivos y cambio.** Extender `study-order-vocabulary.js:studyOrderVocabulary` y verificar `clinical-autocomplete.js:studySearchChoices` y `speech-router.js:routeWardSpeech`. Mapear VEDB, videocolonoscopia, colonoscopia y endoscopia digestiva baja al estudio inferior disponible, con su ID canónico.

**Compatibilidad.** Mantener rectosigmoidoscopia y endoscopia alta separadas cuando el catálogo las distingue. Conservar troponina I/T, series y tipos de muestra.

**Prueba y comando.** Agregar casos de buscador y orden de Enfermería para las cuatro expresiones, más rechazo de equivalencia con endoscopia alta. Ejecutar `node --test src/v5/clinical/study-orders.test.js src/v5/ui/clinical-autocomplete.test.js qa/tests/v5-nurse-study-autocomplete.test.mjs`.

**Aceptación.** Los alias ejecutan una misma adquisición y repetirla por otro nombre no crea otra orden.

### NUR-01 · P1 · ChatGPT

**Problema e hipótesis.** La consulta corta «Enfermera, alergias», los alias de ayuno y las instrucciones naturales de seguimiento pueden caer en el escáner terapéutico o exigir una frase exacta. «Nada por boca» ya tiene un recorrido probado.

**Archivos y cambio.** Reproducir en `routeWardSpeech`, que delega en `src/clinical/nurse-scanner-487.js:csNurseScan487`. Para alergias, clasificar consulta con UID y fuente clínica conocida. Para NPO y seguimiento, reutilizar la conducta nativa del catálogo y los recibos que consume `evaluateGastroDisposition`. En `guard-session.js` y `createNurseDispatcher` distinguir aclaración necesaria de una orden ya reconocida. Usar la misma ruta de oxígeno y fluidos para variantes que hoy fallen.

**Compatibilidad.** La consulta no administra nada ni inventa antecedentes. Ayuno no es una contraindicación automática para decidir. Las preguntas no deben repetir una prescripción reconocida.

**Prueba y comando.** Probar «alergias», pregunta completa, negación, NPO/ayuno, oxígeno con dosis, «vuelva si aparece fiebre o empeora» y repetición del mismo evento. Ejecutar `node --test src/v5/core/nursing-formulation-routing.test.js src/v5/clinical/chole-care.test.js src/v5/clinical/physical-nursing.test.js src/v5/clinical/clinical-transfer-phrases.test.js`.

**Aceptación.** Cada frase produce la acción o información esperada, con una sola orden y evidencia válida en el cierre.

### LAB-01 · P1 · ChatGPT

**Problema e hipótesis.** Las TC y gasometrías discordantes requieren distinguir dos muestras de dos nombres de la misma adquisición. Los resultados de paneles podrían materializarse de definiciones diferentes. Aún falta un caso reproducible de esas contradicciones.

**Archivos y cambio.** Comparar `createStudyService.request`, `currentStudyResult`, `studyEvidenceId` y `materializeStudy` en `src/clinical/study-registry.js`. Reproducir con IDs, UID, minuto de muestra y tratamiento administrado. Una adquisición debe tener un resultado inmutable. En hemograma, modelar componentes de serie roja, leucocitos, diferencial y plaquetas en la definición/muestra que usa el panel. «Hemograma y PCR» debe reutilizar esos componentes de la misma muestra.

**Compatibilidad.** Mantener controles legítimos como nuevas muestras con hora propia. No usar la fisiología posterior para reescribir un resultado histórico. Las diferencias reales de técnica, contraste y ensayo siguen separadas.

**Prueba y comando.** Añadir fixtures de TC alias, gasometría antes/después de soporte y hemograma individual/combinado. Ejecutar `node --test src/v5/clinical/studies.test.js src/v5/clinical/studies-policy.test.js src/v5/clinical/study-orders.test.js src/v5/clinical/study-collections.test.js`.

**Aceptación.** Alias y paneles compatibles muestran datos idénticos para la misma muestra. Los controles conservan resultados propios compatibles con el momento clínico.

### ANAM-01 · P2 · ChatGPT

**Problema e hipótesis.** Algunas respuestas aún eligen un tema secundario. Distinguir motivo actual, antecedentes, hábito y exposición. Los saludos y la continuidad ya tienen implementación. `executePatientDialogue` restringe el habla según el componente verbal y admite fuentes indirectas.

**Archivos y cambio.** Reproducir con `patient-dialogue.js:openHistoryIntent/executePatientDialogue` y `patient-question-context.js:medicationIntent/followUpQuestion`. Priorizar la intención de la cláusula y conservar el contexto por `cmd.actorId`. Verificar que el estado verbal de `patient-observations.js` usa intubación real. En `content/patient-variation.js:generatePatientVariation`, incluir antecedentes ausentes donde el caso permita esa variante.

**Compatibilidad.** Mantener hechos, negaciones, fuentes indirectas, personalidad y semilla. No acreditar una anamnesis que el paciente no pudo dar.

**Prueba y comando.** Añadir pares «¿qué te pasó hoy?»/«¿qué enfermedades tenías?», saludo con pregunta, paciente intubado y dos interlocutores con checkpoint. Ejecutar `node --test src/v5/clinical/patient-dialogue.test.js src/v5/clinical/patient-natural-history.test.js qa/tests/patient-behavior-conversations.test.mjs`.

**Aceptación.** Las repreguntas siguen al tema correcto, el habla refleja capacidad clínica y recuperar la sesión conserva la misma historia.

### FAM-01 · P3 · ChatGPT y validación puntual en Work

**Problema y punto de partida.** Ya hay información indirecta por `clinicalPolicy.historySource` y aportes espontáneos de `spontaneousHistory`. Falta un familiar seleccionable y una intervención útil de Enfermería con identidad y contexto propios.

**Archivos y cambio.** Reutilizar `patient-dialogue.js:executePatientDialogue`, `patient-conversation.js:spontaneousHistory`, `guard-session.js:messages` y las entidades de `app/world.js`. Añadir interlocutor solo donde el caso provee fuente y hechos. Mantener un evento idempotente por disparador para evitar mensajes repetidos.

**Compatibilidad.** Diferenciar hechos indirectos del relato directo, preservar privacidad competitiva y evitar que un familiar tape controles de cama o suplante al paciente.

**Prueba y comando.** Extender la prueba de conversación con un caso con fuente indirecta y otro sin ella. Ejecutar `node --test src/v5/clinical/patient-dialogue.test.js src/v5/clinical/guard-communication.test.js`. Validar un recorrido móvil del nuevo control antes de publicar.

**Aceptación.** Un familiar existente puede responder sus datos, Enfermería interviene una vez cuando corresponde y la misma interacción se recupera sin duplicados.

### CLOSE-01 · P1 · ChatGPT

**Problema y causa candidata concreta.** `consultationEvidenceReview` puede devolver `missing-dx` o `unsubstantiated` al evaluar una impresión. Reproducir si ese requisito impide que UTI reciba al paciente con gravedad suficiente. Los controles de seguridad y la libertad de ordenar ya existen.

**Archivos y cambio.** En `consultation-evidence.js`, `surgical-consultation.js:reviewFor`, `clinical-policy-closure.js:evaluateClinicalPolicyDisposition` y `gastro-closure-v5.js:evaluateGastroDisposition`, separar aptitud del traslado de evaluación diagnóstica. Aceptar por evidencia de gravedad y soporte cuando corresponda. Conservar requisitos de seguridad, alternativas del evaluador y penalización causal por daño documentado.

**Compatibilidad.** No omitir recepción, estabilización necesaria o requisitos propios de un procedimiento. El cierre automático debe continuar con una sola solicitud. Revisar muerte inevitable contra recibos de daño causal antes de cambiar puntuación.

**Prueba y comando.** Usar el mismo estado grave con diagnóstico correcto/equivocado, un control estable y un traslado inseguro. Ejecutar `node --test src/v5/clinical/clinical-policy-closure.test.js src/v5/clinical/automatic-transfer-runtime.test.js src/v5/clinical/receiver-transfer-contract.test.js src/v5/clinical/native-death-room.test.js`.

**Aceptación.** UTI distingue gravedad real y preparación. La impresión equivocada afecta la evaluación sin impedir un destino médicamente indicado por sí sola.

### VEGA-01 · P1 · ChatGPT y validación puntual en Work

**Problema y estado.** Ya se ahorró una operación antes de mostrar la pista. Queda medir la demora restante en Android físico y reproducir cualquier pista repetida tras un estudio válido.

**Archivos y cambio.** Si hay reproducción, seguir `guard-session.js:currentChecklist/clinicalHint`, `clinical-hint-requirements.js:clinicalHintRequirements`, `clinical-hints.js:selectClinicalHint` y `study-evidence.js:studyEvidenceId`. Corregir la equivalencia en el evaluador compartido. Si el estado ya es correcto, medir cola, CAS y visualización antes de modificar transporte.

**Compatibilidad.** Mantener urgencia, esperas gratuitas, foco confirmado, confirmación tras pintar, historial por actor y deduplicación. No recomendar repetir por diferencia de etiqueta.

**Prueba y comando.** Una adquisición pendiente, una completada normal y otra patológica por alias. Cambiar de paciente durante la respuesta y repetir una oferta conocida. Ejecutar `node --test src/v5/clinical/clinical-hint*.test.js src/v5/ui/clinical-hint-presenter.test.js src/v5/server/clinical-hints-durable.test.js`. El preview registra `hintOperations` y `hintVisibleMs` en `qa/v5/guard-entry-preview.mjs`.

**Aceptación.** La pista pide una acción pendiente y ejecutable. Se observa `prepare` y luego `displayed`, sin `revalidate` en clientes nuevos. Los estados descartados no generan cobro.

### LAT-01 · P1 · ChatGPT y validación puntual en Work

**Problema e hipótesis.** Mensajes, enfermería y confirmaciones pueden quedar detrás de una mutación, un conflicto CAS o una proyección de guardia completa. La causa dominante en teléfono aún no está medida.

**Archivos y cambio.** En `durable-cooperative-replica.js:synchronize/flushPending/maintain/accept` y `durable-guard-authority.js:transact/observe`, medir encolado, salida HTTP, commit, recibo y render con IDs sintéticos. Separar demora de Enfermería del transporte. Si domina el hueco tras un conflicto, ajustar el reintento dentro de la cola existente. Si domina la respuesta, reutilizar proyección/recibos confirmados de `clinical-reward.js:settleClinicalAccount` antes de proponer deltas.

**Compatibilidad.** Una mutación a la vez por cliente, mismo ID al reintentar, recepción solo tras CAS y vistas privadas por actor. Preservar el envío ya registrado y la reconciliación por UID/revisión.

**Prueba y comando.** Inyectar latencia, 409, pérdida de ACK y A→B en el harness. Ejecutar `node --test src/v5/social/durable-cooperative-replica.test.js src/v5/server/clinical-account-projection.test.js src/v5/clinical/guard-communication.test.js`. Reservar `qa/v5/shared-guard-auth-browser.mjs` para cambios con efecto real entre dos sesiones.

**Aceptación.** Menor tiempo entre encolado y confirmación bajo la misma carga. Una ejecución física por evento, historial coherente y respuestas ligadas a su paciente.

### DX-REVEAL · P2 · ChatGPT y validación puntual en Work

**Problema y estado.** La revelación diagnóstica con descuento único del 50% es una función nueva. El historial de pistas tiene deduplicación de ayudas por acción, útil como patrón de persistencia.

**Archivos y cambio.** Diseñar una revelación explícita ligada al encuentro en `clinical-hint-ledger.js` y `guard-session.js:rewardFor`, con texto clínico breve de la definición del caso. Aplicar un modificador separado y visible en `case-debrief.js`. Acordar en el cambio cómo se combina con las pistas y con la futura XP cooperativa. Conservar la impresión realmente escrita en `diagnosis.record`.

**Compatibilidad.** No marcar el checklist como diagnóstico formulado. Un segundo toque, recarga, ACK duplicado o cuenta distinta no deben repetir el descuento. Conservar recibos históricos.

**Prueba y comando.** Agregar pruebas de solicitud, visualización, repetición, recuperación, cierre y combinación con pistas. Ejecutar `node --test src/v5/clinical/clinical-hint-ledger.test.js src/v5/server/clinical-hints-durable.test.js src/v5/server/clinical-reward.test.js src/v5/ui/case-debrief.test.js`.

**Aceptación.** El diagnóstico revelado ayuda a continuar, se distingue de la decisión del médico y cobra 50% una vez con desglose exacto.

### XP-COOP · P2 · ChatGPT y validación puntual en Work

**Problema y estado.** Hoy los descuentos de Vega son individuales, incluso en Cooperativo. La solicitud de compartir créditos, débitos, pistas y mala praxis requiere cambiar la política de recibos. Competitivo ya conserva la propiedad individual.

**Archivos y cambio.** Definir miembros elegibles en `guard-runtime.js:view` y `guard-session.js:rewardFor`. Reutilizar `clinical-reward.js:settleClinicalAccount`, los recibos persistentes de Supabase y el marcador existente. Las animaciones deben dispararse una vez por recibo acreditado, con marca de ya mostrado por médico/dispositivo y guardia. Acordar si quien dejó la participación recibe un evento posterior antes de cambiar el RPC.

**Compatibilidad.** No recalcular recibos anteriores ni sumar XP desde el cliente. Mantener una acreditación por evento y destinatario. Competitivo no comparte débitos ni revela detalle privado.

**Prueba y comando.** Dos cooperantes, una pista, un cierre, daño causal, reintento y reconexión. Ejecutar `node --test src/v5/server/clinical-reward.test.js src/v5/server/clinical-hints-durable.test.js src/v5/ui/guard-scoreboard.test.js`. Usar dos cuentas reales únicamente para verificar el resultado persistido final.

**Aceptación.** Ambos médicos ven exactamente los créditos/débitos que reciben. Una animación por evento, con puntuación clínica separada y aislamiento competitivo.

### MP-01 · P2 · ChatGPT y validación puntual en Work

**Problema e hipótesis.** Una presencia conectada puede aparecer como disponible mientras atiende. `createAccountGateway` ya calcula «en guardia» para el perfil mediante la referencia activa. La lista de invitación debe usar un estado reconciliado equivalente.

**Archivos y cambio.** Revisar `src/v5/ui/lobby-directory.js:createLobbyDirectory.render`, `social/cooperative-link.js`, `social/room-membership-store.js:createV5QaSocialServer` y la proyección de presencia del gateway. Distinguir médico disponible, en guardia y desconectado en la vista de lobby sin inferir exclusividad de pacientes cooperativos.

**Compatibilidad.** No exhibir IDs de guardia privados ni inhabilitar a quien volvió al lobby con referencia obsoleta. Preservar reconexión y entrega del chat.

**Prueba y comando.** Simular dos cuentas, entrada a guardia, salida y presencia tardía. Ejecutar `node --test src/v5/social/presence-signaling.test.js src/v5/social/cooperative-link.test.js src/v5/server/account-movement.test.js`. Verificar con dos navegadores aislados solo el cambio final de estado.

**Aceptación.** El lobby muestra disponibilidad correcta tras cada transición, sin duplicar presencia ni interrumpir actividad compartida.

## Continuidad y uso de Work

```sh
git status --short --branch
git fetch origin atria-5.0-core-rebuild-experimental
git rev-parse FETCH_HEAD
git log --oneline --left-right HEAD...FETCH_HEAD
git diff --check
```

Si el checkout está limpio y el historial permite avance directo, usar `git merge --ff-only FETCH_HEAD` desde la rama autorizada. Revisar cambios locales antes de editar. Conservar commits posteriores y resolver divergencias sin forzar la rama. En una tarea de caso clínico, leer `AGENTS.md` y `docs/ATRIA-5-CASE-INTEGRATION-CONTRACT.md`. Mantener IDs de evento, paciente y médico, contratos de checkpoint y los límites de autorización.

Implementar una tarea por vez. Ejecutar los comandos dirigidos de su sección con Node.js 22 o posterior. Los recorridos de navegador necesitan Playwright y Chromium. En CI se usa Playwright 1.58.2. Si se instala en un directorio de pruebas separado, indicar su módulo con `PLAYWRIGHT_MODULE_PATH` y el binario disponible con `CHROMIUM_EXECUTABLE_PATH`. Añadir la prueba que reproduce el defecto. Si ChatGPT dispone solo de lectura del repositorio, entregar un diff concreto y señalar qué comandos quedan por ejecutar. Publicar cambios mediante avance directo de la rama cuando esté autorizado. Comparar el SHA de GitHub con el del preview antes de usar el enlace. La evidencia de un commit anterior sigue sirviendo para módulos sin cambios y se identifica como tal.

REC-01 se acepta en Android físico con las dos cuentas afectadas o dispositivos controlados por el usuario. Abrir guardia guardada, tocar Retomar, guardar, volver desde otra sesión y tocar Finalizar. Verificar retorno al lobby, continuidad del colega y XP. Si aparece el problema, guardar fase, texto visible y estado HTTP del paso, sin cookies, contraseñas ni contenido de conversaciones. Work se reserva para esa prueba, una medición real con dos cuentas, o un despliegue/migración que ChatGPT no pueda verificar con el acceso disponible.
