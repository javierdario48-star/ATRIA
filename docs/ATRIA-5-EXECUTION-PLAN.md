# ATRIA 5.0 — Plan técnico de ejecución

Base auditada: `162d0cf24a936e302e2a3efadcc168e1459d86d5`. Corrección publicada: `7cde6fa905e81ed3d548cf256f1b5201a281ec94`; suite local final 3.167/3.167. Corte de solicitudes: 20/11/2026, Buenos Aires. [Inventario y aceptación por ID](ATRIA-5-REMAINING-TASKS.md) · [Matriz](ATRIA-5-REQUIREMENTS-TRACEABILITY.md) · [Límites históricos](ATRIA-5-HISTORICAL-AUDIT-OCT-NOV-2026.md).

## Prioridad y ejecución

REC-01 mantiene P0 por el impacto del reporte: no se reprodujo una pérdida de progreso o imposibilidad de recuperar una sesión en el entorno actual. No se inventa un parche clínico. B0 es el bloqueo confirmado de certificación P1; después siguen B1 (demoras/recuperación), B2 (evidencia/cierre) y B3 (conversación). Recompensas sociales, voz y capas incompletas van en P2; mapa modular y escala, en P3.

Los esfuerzos corresponden al bloque completo: no sumarlos por cada fila. Las entradas CLIN conservan regresiones específicas de LAB/CLOSE/Vega; no son cuatro implementaciones adicionales de los mismos sistemas. Los 60 números son referencias históricas, no 60 tareas nuevas. Cada pendiente del inventario tiene bloque, prioridad, riesgo, entorno y aceptación.


## B0 · Integridad de certificación y contratos de prueba

**Prioridad:** P1. **Entorno:** CHATGPT NORMAL. **Esfuerzo:** 2–4 días. **Riesgo:** medio.

**IDs:** PHYS-05, VAR-02, QA-01, QA-03.

**Causa e impacto:** Lectura de privacidad y contratos de aceptación desactualizados.

**Dependencias:** ninguna.

**Archivos responsables:** `src/v5/clinical/survival-487-bridge.js`, `qa/v5/mortality-regression.mjs`, `src/v5/content/patient-behavior.js`, `src/v5/content/patient-language.js`, `src/v5/clinical/patient-conversation.js`, `qa/tests/patient-personality-longitudinal.test.mjs`, `.github/workflows/atria-v5-core.yml`, `.github/workflows/atria-v5-integral.yml`, `.github/workflows/atria-v5-transfers.yml`, `qa/v5/transfer-certification.mjs`.

**Funciones y rutas:** Fixtures de personalidad, runDurableMortalityScenario/snapshot, runTransferBot y prueba de nutrición.

**Modificación propuesta:** Las lecturas privadas y la prueba de ayuno/comida ya se corrigieron en 7cde6fa, sin alterar producción. Revisar el bot de traslados según rechazo técnico, decisión insegura ejecutada o destino válido. Reproducir la cancelación de Node 22 antes de alterar reintentos.

**Pruebas dirigidas:** `src/v5/clinical/mortality-regression.test.js`, `src/v5/clinical/native-death-room.test.js`, `qa/tests/patient-personality-longitudinal.test.mjs`, `src/v5/clinical/nursing-nutrition.test.js`, `qa/tests/clinical-case-certification.test.mjs`.

**Aceptación:** Pruebas rojas reproducidas en la base; mismo flujo pasa sin abrir expedientes ajenos, inventar administraciones ni reinstalar bloqueos antiguos. Añadir la condición específica de cada ID y declarar el entorno realmente evaluado.

## B1 · Recuperación, cola durable y latencia

**Prioridad:** P0/P1. **Entorno:** MIXTA. **Esfuerzo:** 3–6 días + aceptación física. **Riesgo:** alto.

**IDs:** PERF-01, VEGA-AUTO-01, LAT-01, MP-01, REC-01, SEL-00, DX-01, NUR-03, COMP-01, SOCIAL-02, CHAT-01, TURN-01, TURN-02, WORLD-02, QA-02, AUTH-02.

**Causa e impacto:** Demoras, recuperación y participación dependen de cola, CAS, plazos y foco confirmado.

**Dependencias:** B0 para certificación.

**Archivos responsables:** `src/v5/ui/clinical-hint-presenter.js`, `src/v5/clinical/clinical-hint-ledger.js`, `src/v5/server/clinical-hints-durable.test.js`, `src/v5/social/durable-cooperative-replica.js`, `src/v5/server/durable-guard-authority.js`, `src/v5/app/application.js`, `src/v5/ui/guard-chat-view.js`, `src/v5/clinical/guard-runtime.js`, `src/v5/social/cooperative-link.js`, `src/v5/server/supabase-account-store.js`, `src/v5/social/room-membership-store.js`, `src/v5/ui/guard-recovery.js`, `src/v5/server/account-gateway.js`, `src/v5/app/patient-selection.js`, `src/v5/ui/clinical-controller.js`, `src/v5/ui/diagnostic-impression.js`, `src/v5/engine/nurse-dispatcher.js`, `src/v5/clinical/guard-session.js`, `src/v5/clinical/guard-communication.js`, `src/v5/ui/guard-communication-view.js`, `src/v5/clinical/guard-clock.js`, `src/v5/clinical/shift-flow.js`, `src/v5/clinical/guard-turn-control.js`, `src/social/remote-motion.js`, `src/v5/app/world.js`, `src/v5/social/room-motion-scope.js`, `qa/v5/guard-entry-preview.mjs`, `qa/v5/shared-guard-preview.mjs`, `qa/v5/shared-guard-auth-browser.mjs`, `src/v5/server/postgres-guard-store.js`.

**Funciones y rutas:** createGuardRecovery.show/run; recoverTurn/synchronize/flushPending; durable authority transact/observe; submitText; selección directa y proyección de recompensas.

**Modificación propuesta:** Medir toque, encolado, salida HTTP, CAS, recibo y DOM con IDs sintéticos y percentiles. Optimizar solo la espera dominante. Mantener Después como navegación local, reintentos con el mismo ID y devolución del control al lobby al vencer el plazo. Probar foco A→B y primera comunicación con 2–4 médicos.

**Pruebas dirigidas:** `src/v5/clinical/clinical-hint-ledger.test.js`, `src/v5/server/clinical-hints-durable.test.js`, `src/v5/social/durable-cooperative-replica.test.js`, `qa/v5/shared-guard-auth-browser.mjs`, `src/v5/server/supabase-social-room-persistence.test.js`, `src/v5/clinical/cooperative-care.test.js`, `qa/v5/shared-guard-preview.mjs`, `src/v5/ui/guard-recovery.test.js`, `qa/v5/guard-recovery-browser.mjs`, `src/v5/app/patient-selection.test.js`, `src/v5/ui/diagnostic-impression.test.js`, `qa/v5/diagnosis-browser.mjs`, `src/v5/engine/nurse-dispatcher.test.js`, `src/v5/server/competitive-durable.test.js`, `qa/tests/clinical-case-certification.test.mjs`, `src/v5/social/cooperative-link.test.js`, `src/v5/clinical/guard-communication.test.js`, `src/v5/ui/guard-communication-view.test.js`, `src/v5/clinical/guard-day-clock.test.js`, `src/v5/clinical/shift-flow-chaos.test.js`, `qa/v5/full-guard-24h.mjs`, `src/v5/clinical/guard-turn-continuity.test.js`, `src/social/remote-motion-continuity.test.js`, `src/social/remote-generation-order.test.js`, `qa/v5/competitive-browser.mjs`, `src/v5/server/durable-guard-authority.test.js`, `src/v5/server/account-gateway.test.js`.

**Aceptación:** Menor latencia bajo la misma carga, sin perder progreso ni duplicar dosis; decisiones de recuperación independientes y cambios vinculados al UID correcto. Añadir la condición específica de cada ID y declarar el entorno realmente evaluado.

**Condición adicional ISSUE-01 / PERF-01:** antes de cambiar transporte, medir lobby/sala/guardia/reconexión con 1, 2 y 4 clientes: requests por endpoint/minuto, p50/p95, CPU si existe, errores y duplicados. Separar espacio, señalización WebRTC y clínica durable. No atribuir 4h13m de CPU a ATRIA sin datos. Proponer solo el cambio mínimo con flag OFF, rollback exacto y misma batería antes/después. Aceptar menor consumo sin peor latencia/fluidez, con progreso/Enfermería/Vega/XP/reconexión intactos; después comparar costos. El ticket llama P0 a estos prerrequisitos de optimización, sin evidencia de P0 jugable actual. No migrar ni desplegar en producción por esta auditoría. PERF-01 comparte instrumentación con LAT-01; no duplica su implementación. Estimación adicional: 2–4 días; Android físico y CPU del proveedor dependen de acceso real.

## B2 · Evidencia clínica, estudios y cierres

**Prioridad:** P1. **Entorno:** MIXTA. **Esfuerzo:** 4–8 días. **Riesgo:** alto.

**IDs:** LAB-01, NUR-01, CLOSE-01, VEGA-COHERENCE-01, NUR-02, MED-02, DX-03, CLIN-CARD08-01, CLIN-VARIX-01, CLIN-HDA-01, NUR-04.

**Causa e impacto:** Alias, muestras y evidencia no pueden confundirse; calidad y seguridad de traslado tienen contratos diferentes.

**Dependencias:** B0; recibos existentes.

**Archivos responsables:** `src/v5/clinical/studies.js`, `src/v5/clinical/study-evidence.js`, `src/v5/clinical/study-collections.js`, `src/v5/clinical/study-order-vocabulary.js`, `src/v5/core/speech-router.js`, `src/v5/clinical/guard-session.js`, `src/v5/clinical/nursing-nutrition.test.js`, `src/v5/engine/nurse-dispatcher.js`, `src/v5/clinical/clinical-policy-closure.js`, `src/v5/clinical/gastro-closure-v5.js`, `src/v5/clinical/consultation-evidence.js`, `src/v5/clinical/clinical-hint-requirements.js`, `src/v5/clinical/clinical-hints.js`, `src/clinical/nurse-scanner-487.js`, `src/v5/content/packs/cardiology-pack.js`, `src/v5/clinical/closure-debrief.js`, `src/v5/ui/case-debrief.js`, `src/clinical/case-completion-487.js`, `src/v5/clinical/gastro-expansion-policies.js`, `src/v5/clinical/transfer-continuation.js`, `src/v5/clinical/additional-case-care.js`, `src/v5/clinical/diagnostic-assessment.js`, `src/v5/ui/clinical-workflow.js`.

**Funciones y rutas:** createStudyService.request/advance/currentStudyResult; studyOrderVocabulary/studyEvidenceId; evaluadores de cierre; consultationEvidenceReview/preparation; routeWardSpeech y nurse dispatcher.

**Modificación propuesta:** Inventariar estudios basales, controles modelados y controles aún ausentes. Materializar cada muestra desde evidencia real y conservar informes previos. Reutilizar el evaluador de destino y sus alternativas; corregir lenguaje en el router compartido. Separar reevaluación rutinaria de decisión médica imprescindible, explicando esta última en Vega.

**Pruebas dirigidas:** `src/v5/clinical/studies-policy.test.js`, `src/v5/clinical/study-orders.test.js`, `src/v5/clinical/study-collections.test.js`, `src/v5/clinical/physical-nursing.test.js`, `src/v5/core/nurse-diagnosis-speech.test.js`, `src/v5/clinical/nursing-nutrition.test.js`, `src/v5/clinical/accepted-transfer.test.js`, `src/v5/clinical/automatic-transfer-runtime.test.js`, `src/v5/clinical/receiver-transfer-contract.test.js`, `src/v5/clinical/clinical-hints.test.js`, `src/v5/clinical/closure-catalog-audit.test.js`, `src/v5/engine/nurse-dispatcher.test.js`, `src/v5/ui/case-debrief.test.js`, `src/v5/clinical/clinical-policy-closure.test.js`, `src/v5/ui/diagnostic-impression.test.js`.

**Aceptación:** Una muestra inmutable por adquisición; controles indicados con tiempo propio; recepción y seguridad verificables; cero trámites ocultos, confirmaciones anticipadas o exigencias prescindibles. Añadir la condición específica de cada ID y declarar el entorno realmente evaluado.

## B3 · Conversación y docencia

**Prioridad:** P1. **Entorno:** MIXTA. **Esfuerzo:** 4–8 días. **Riesgo:** medio.

**IDs:** ANAM-01, VEGA-01, DIALOG-AUTO-01, FAM-01, VEGA-02, VEGA-03, CHAT-02.

**Causa e impacto:** La cobertura de intenciones, fuentes de historia y docencia no se demuestra contando respuestas.

**Dependencias:** B1/B2 para medición y checklist.

**Archivos responsables:** `src/v5/clinical/patient-dialogue.js`, `src/v5/clinical/patient-question-context.js`, `src/v5/content/patient-language.js`, `src/v5/content/legacy-patient-variation.js`, `src/v5/clinical/clinical-hints.js`, `src/v5/clinical/clinical-hint-requirements.js`, `src/v5/ui/clinical-hint-presenter.js`, `src/v5/app/application.js`, `src/v5/ui/guard-message-policy.js`, `src/v5/clinical/patient-conversation.js`, `src/v5/app/world.js`, `src/v5/ui/patient-actions.js`, `src/v5/clinical/vega-guidance.js`, `src/v5/clinical/guard-session.js`, `src/v5/core/speech-router.js`, `src/v5/ui/guard-chat-view.js`, `src/v5/ui/spatial-ward-speech.js`.

**Funciones y rutas:** executePatientDialogue; patient-question-context; speakPatientHistory/spontaneousHistory; selectClinicalHint/currentChecklist; vegaGuidance y representación de acompañante.

**Modificación propuesta:** Reproducir frases originales antes de ampliar intenciones. Añadir antecedentes plausibles y documentados, contexto por médico y fuentes indirectas declaradas. Recuperar docencia multietapa/delegación sobre los contratos existentes. Las aclaraciones teóricas no deben convertirse en diagnósticos ni cobros de nuevas pistas.

**Pruebas dirigidas:** `src/v5/clinical/patient-dialogue.test.js`, `qa/tests/patient-personality-integration.test.mjs`, `src/v5/clinical/clinical-hints.test.js`, `src/v5/ui/clinical-hint-presenter.test.js`, `qa/v5/patient-dialogue-browser.mjs`, `src/v5/core/nurse-diagnosis-speech.test.js`, `src/v5/ui/spatial-ward-speech.test.js`.

**Aceptación:** Cada pregunta responde al tema correcto y fuente real; memoria y hechos sobreviven reconexión; incapacidad verbal prevalece sobre estilo y la pista propone una acción ejecutable. Añadir la condición específica de cada ID y declarar el entorno realmente evaluado.

## B4 · Recompensas cooperativas y sociales

**Prioridad:** P2. **Entorno:** MIXTA. **Esfuerzo:** 4–7 días. **Riesgo:** alto.

**IDs:** XP-COOP, DX-REVEAL, XP-01, XP-02, XP-03, LOBBY-01, SOCIAL-01, SELECT-01, AUTH-01.

**Causa e impacto:** Créditos de cierre y penalizaciones por ayuda siguen políticas diferentes; falta mensajería directa de amigos.

**Dependencias:** B1; política XP del usuario.

**Archivos responsables:** `src/v5/clinical/guard-runtime.js`, `src/v5/clinical/guard-session.js`, `src/v5/clinical/clinical-hint-ledger.js`, `src/v5/server/clinical-reward.js`, `src/v5/ui/case-debrief.js`, `src/v5/clinical/progression.js`, `src/v5/engine/movement-progression.js`, `src/v5/ui/avatar-creator.js`, `src/v5/app/avatar-appearance.js`, `src/v5/ui/guard-scoreboard.js`, `src/v5/app/application.js`, `src/v5/ui/lobby-directory.js`, `src/v5/ui/player-profile-card.js`, `src/v5/server/account-gateway.js`, `src/social/qa-social-server.js`, `src/v5/clinical/guard-selection-policy.js`, `src/v5/ui/welcome-flow.js`, `src/v5/server/supabase-account-store.js`, `src/v5/content/assets/welcome-doctors.webp`.

**Funciones y rutas:** guard-runtime: elegibilidad al cierre y participación; guard-session.rewardFor; hint ledger; clinical-reward; tarjeta social y rutas autorizadas.

**Modificación propuesta:** Integrar la condición cooperativa que incluye pistas, sin reescribir recompensas históricas. Mantener la pausa al salir y el aislamiento competitivo. Incorporar hilos privados entre amigos, no leídos y panel minimizable sin emitir acciones clínicas. Deduplicar animación por recibo, médico y dispositivo.

**Pruebas dirigidas:** `src/v5/server/clinical-reward.test.js`, `src/v5/server/clinical-hints-durable.test.js`, `src/v5/clinical/clinical-hint-ledger.test.js`, `src/v5/clinical/progression.test.js`, `src/v5/server/account-movement.test.js`, `src/v5/ui/avatar-creator.test.js`, `src/v5/app/avatar-appearance.test.js`, `src/v5/ui/guard-scoreboard.test.js`, `src/v5/ui/case-debrief.test.js`, `src/v5/ui/lobby-directory.test.js`, `src/v5/social/player-profile.test.js`, `src/v5/server/guard-selection-integration.test.js`, `src/v5/server/account-gateway.test.js`, `src/v5/server/account-clinical-integration.test.js`.

**Aceptación:** Dos cooperantes reciben la política exacta por evento; el rival no hereda descuentos; el chat directo permanece privado y operativo en guardias distintas. Añadir la condición específica de cada ID y declarar el entorno realmente evaluado.

## B5 · Voz e interacción móvil

**Prioridad:** P2. **Entorno:** MIXTA. **Esfuerzo:** 5–10 días. **Riesgo:** medio/alto.

**IDs:** LAB-02, UI-01, PHYS-06, DX-02, UI-02, EXAM-01, AUDIO-01, AUDIO-02, VOICE-01, VOICE-02, KEYBOARD-01, ANDROID-01, ANDROID-02.

**Causa e impacto:** Las pruebas emuladas no sustituyen captura de voz, IME, altavoz ni red del teléfono.

**Dependencias:** B1; permisos de audio; Android físico.

**Archivos responsables:** `src/v5/clinical/study-order-vocabulary.js`, `src/v5/ui/clinical-autocomplete.js`, `src/v5/core/speech-router.js`, `src/v5/web/game.css`, `src/v5/ui/patient-actions.js`, `src/v5/ui/guard-scoreboard.js`, `src/v5/app/application.js`, `src/v5/clinical/ecg-morphology.js`, `src/v5/clinical/patient-observations.js`, `src/v5/ui/ecg-sweep.js`, `src/v5/ui/diagnostic-impression.js`, `src/v5/ui/clinical-controller.js`, `src/v5/engine/interactions.js`, `src/v5/app/world.js`, `src/v5/content/beds.json`, `src/v5/clinical/observations.js`, `src/v5/ui/clinical-panels.js`, `src/v5/ui/hospital-audio.js`, `src/v5/ui/audio-assets.js`, `src/v5/ui/audio-settings.js`, `src/voice/revision-buffer.js`, `src/voice/android-v2-active-adapter.test.js`, `src/v5/web/index.html`, `src/social/voice-session.js`, `src/v5/social/cooperative-link.js`, `src/v5/ui/atria-keyboard.js`, `qa/v5/navigation-browser.mjs`, `qa/v5/guard-recovery-browser.mjs`, `qa/v5/guard-entry-preview.mjs`, `qa/v5/audio-browser.mjs`.

**Funciones y rutas:** createAtriaKeyboard; application.submitText/lifecycle; hospitalAudio unlock/setChannel/setTrack; revision-buffer y voice-session/PTT legados.

**Modificación propuesta:** Conectar el dictado al mismo envelope clínico con un solo eventId y ciclo inicio/stop/dispose. Separarlo de voz social. Conservar preferencias de audio y desbloqueo por gesto. Validar Android físico con Gboard, rotación, parlante, señal variable, recuperación y recepción de pistas.

**Pruebas dirigidas:** `src/v5/clinical/study-orders.test.js`, `src/v5/ui/clinical-autocomplete.test.js`, `qa/tests/v5-nurse-study-autocomplete.test.mjs`, `qa/tests/v5-guard-score-position.test.mjs`, `qa/v5/navigation-browser.mjs`, `src/v5/clinical/ecg-morphology.test.js`, `src/v5/ui/ecg-sweep.test.js`, `src/v5/ui/diagnostic-impression.test.js`, `qa/v5/diagnosis-browser.mjs`, `src/v5/engine/interactions.test.js`, `src/v5/ui/clinical-bedside-ux.test.js`, `src/v5/clinical/physical-exam.test.js`, `src/v5/ui/examination-feedback.test.js`, `src/v5/ui/hospital-audio.test.js`, `src/v5/ui/audio-assets.test.js`, `qa/v5/audio-browser.mjs`, `src/voice/revision-buffer.test.js`, `src/voice/android-v2-active-adapter.test.js`, `src/social/voice-session.test.js`, `src/v5/ui/atria-keyboard.test.js`, `qa/v5/keyboard-camera-browser.mjs`, `qa/v5/shared-guard-preview.mjs`.

**Aceptación:** Un dictado produce un envío, salida libera el micrófono, audio bidireccional respeta sesión y mute, y controles siguen visibles y pulsables con teclado. Añadir la condición específica de cada ID y declarar el entorno realmente evaluado.

## B6 · Fisiología, seguridad e importación

**Prioridad:** P1/P2. **Entorno:** CHATGPT NORMAL. **Esfuerzo:** 5–10 días por conjunto de mecanismos. **Riesgo:** alto.

**IDs:** SAFE-01, PHYS-02, MED-01, CASE-01, CASE-02, VAR-01, VAR-03.

**Causa e impacto:** Catálogo, administración, exposición y efecto son capas distintas con cobertura acotada.

**Dependencias:** B0/B2 y referencias del caso.

**Archivos responsables:** `src/v5/clinical/native-medication-eligibility.js`, `src/v5/clinical/medication-safety-487.js`, `src/v5/clinical/receipts.js`, `src/v5/clinical/medication-exposure.js`, `src/v5/clinical/native-medications.js`, `src/v5/clinical/medication-harms-487.js`, `src/v5/clinical/pharmacology-catalog.js`, `scripts/import-clinical-case-pack.mjs`, `src/v5/content/compile-clinical-case-pack.js`, `src/v5/content/certified-case-packs.json`, `src/v5/content/packs/respiratory-pack.js`, `src/v5/content/packs/cardiology-pack.js`, `src/v5/content/packs/neurology-pack.js`, `src/v5/content/patient-variation.js`, `src/v5/content/guard-patient-variation.js`, `src/v5/content/patient-name-bank.js`, `src/v5/clinical/complication-eligibility.js`.

**Funciones y rutas:** generatePatientVariation/patientAllergyFacts487; nativeMedicationEligibility/confirmedClinicalTreatment; summarizeIVExposures; importador/compilador y propietarios de complicación/rescate.

**Modificación propuesta:** Mantener una matriz por fármaco, mecanismo y vía: solo catálogo, administrable, efecto, retirada y limitaciones. Completar capas con fuentes y contrapruebas. Cada caso nuevo recorre el cargador normal, cinco capas, varias semillas y escenarios adecuados, tardíos, erróneos y sin intervención.

**Pruebas dirigidas:** `src/v5/clinical/clinical-execution-freedom.test.js`, `src/v5/clinical/medication-harms-487.test.js`, `src/v5/clinical/guard-session-infusion.test.js`, `src/v5/clinical/morphine-487.test.js`, `src/v5/clinical/native-medication-eligibility.test.js`, `scripts/import-clinical-case-pack.test.mjs`, `qa/tests/clinical-case-certification.test.mjs`, `src/v5/content/patient-variation.test.js`, `src/v5/content/guard-patient-variation.test.js`.

**Aceptación:** Cero exposición produce cero efecto; alergia preexiste; rescate requiere recibo causal y una oportunidad real; no aparecen escritores fisiológicos ni evaluadores paralelos. Añadir la condición específica de cada ID y declarar el entorno realmente evaluado.

## B7 · Mundo y presentación RPG

**Prioridad:** P3. **Entorno:** MIXTA. **Esfuerzo:** 2–5 semanas para mapa modular completo. **Riesgo:** alto.

**IDs:** ARCH-04, WORLD-01, WORLD-03, WORLD-04, WORLD-05, SCALE-01.

**Causa e impacto:** La propuesta de mapa modular sigue separada del bitmap y la navegación actuales.

**Dependencias:** B1; decisión visual pendiente para nuevo mapa.

**Archivos responsables:** `src/v5/core/room-authority.js`, `src/v5/adapters/native-clinical-port.js`, `src/v5/app/application.js`, `src/v5/app/world.js`, `src/v5/app/avatar-appearance.js`, `src/v5/render/hospital.js`, `src/v5/content/hospital.json`, `src/v5/engine/navigation.js`, `src/v5/engine/interactions.js`, `src/v5/ui/spatial-ward-speech.js`, `src/v5/ui/reception-board.js`, `src/v5/ui/patient-actions.js`, `src/v5/social/presence-storage.js`, `src/v5/social/room-motion-scope.js`, `src/v5/server/account-gateway.js`.

**Funciones y rutas:** createWorld; createNavigation/move/collision/lineOfSight; renderer del hospital; doctorMovementSpeed y alcance de movimiento por sala.

**Modificación propuesta:** Preservar el mundo vigente hasta aprobar el arte modular. Autorizar instancias con huellas, anclajes, rotación, colisión, puerta y oclusión derivadas de un solo mapa. Medir presupuestos de visibilidad/carga antes de prometer lobby masivo. No difundir historias clínicas para resolver presencia.

**Pruebas dirigidas:** `src/v5/core/room-authority.test.js`, `src/v5/app/avatar-appearance.test.js`, `src/v5/engine/navigation.test.js`, `src/v5/ui/spatial-ward-speech.test.js`, `src/v5/ui/reception-board.test.js`, `src/v5/ui/clinical-bedside-ux.test.js`, `src/v5/social/cooperative-link.test.js`.

**Aceptación:** Acceso a ocho camas y recepción, cámara y movimiento conservados; puertas afectan paso/visión/audio coherentemente y solo se replican estados necesarios. Añadir la condición específica de cada ID y declarar el entorno realmente evaluado.

## B8 · Recuperación de fuentes y continuidad documental

**Prioridad:** P1. **Entorno:** BLOQUEADA. **Esfuerzo:** 1–3 días tras obtener fuentes. **Riesgo:** bajo.

**IDs:** BOTS-02, DEPLOY-01, CONT-02, CONT-03.

**Causa e impacto:** La falta de transcripciones completas impide certificar exhaustividad de solicitudes.

**Dependencias:** historial completo/exportación disponible.

**Archivos responsables:** `qa/v5/certify-clinical-cases.mjs`, `vercel.json`, `src/v5/server/account-gateway.js`, `docs/ATRIA-5-CHATGPT-HANDOFF.md`, `docs/ATRIA-5-HISTORICAL-AUDIT-OCT-NOV-2026.md`, `docs/ATRIA-5-REQUIREMENTS-TRACEABILITY.md`, `qa/v5/browser-harness.mjs`, `src/v5/clinical/clinical-policy-registry.js`.

**Funciones y rutas:** Fuente original → ID estable existente o nuevo → evidencia → estado → matriz; comparación semántica de hunks locales contra el HEAD.

**Modificación propuesta:** Mantener cada referencia 1–60 sin inventar texto hasta obtener la lista original. Conservar lagunas por período y excluir otros proyectos. Comparar material local huérfano con código posterior antes de publicarlo. Un auxiliar técnico encontrado no se convierte automáticamente en una petición del usuario.

**Pruebas dirigidas:** Recuperar fuentes originales; validar correspondencia y diff documental.

**Aceptación:** Nueva fuente no elimina condiciones anteriores; correcciones se integran en la misma entrada y los archivos publicados permiten continuar sin repetir investigación. Añadir la condición específica de cada ID y declarar el entorno realmente evaluado.

## Distribución entre ChatGPT y Work

| Entorno | Trabajo concreto |
| --- | --- |
| CHATGPT NORMAL | B0, correcciones delimitadas de módulos, pruebas Node, builds, análisis, documentación y refactorizaciones justificadas. |
| MIXTA | ChatGPT implementa; una aceptación dirigida de preview, dos cuentas o visual valida la integración cuando sea necesaria. |
| WORK | Navegación e interacción externa que las herramientas de ChatGPT normal no puedan ejecutar. No usarlo para reemplazar un diff o una prueba unitaria. |
| BLOQUEADA | Historial íntegro/lista literal, hardware Android/iPhone, credenciales o dependencias de voz no disponibles. Work tampoco sustituye un dispositivo ausente. |

## Primera tarea ejecutable y comprobaciones

Los tres fixtures/harness siguientes ya se corrigieron en 7cde6fa (26/26 dirigidas; suite completa 3.167/3.167). No repetirlos salvo cambios nuevos o diagnóstico de Node 22:

```bash
node --test qa/tests/patient-personality-longitudinal.test.mjs src/v5/clinical/mortality-regression.test.js src/v5/clinical/nursing-nutrition.test.js
node --test src/v5/social/durable-cooperative-replica.test.js
```

La segunda prueba debe compararse entre Node 22 y 24 por las cancelaciones de CI. Los traslados pueden investigarse sin repetir toda la campaña:

```bash
node qa/v5/transfer-certification.mjs --cases COLON-001,APP-001 --profiles wrong-dx,wrong-destination --output /tmp/atria-transfer-audit
```

No restaurar un rechazo clínico antiguo para hacer pasar un test desactualizado. Una decisión insegura registrada y una negativa técnica son resultados diferentes; preservar efectos, recuperación y XP según el contrato vigente.

Antes de publicar: HEAD remoto, diff, validación de referencias y pruebas afectadas. Solo fast-forward de `atria-5.0-core-rebuild-experimental`, sin force ni cambios en otras ramas. Si el remoto avanzó, integrar y reevaluar conflictos. No repetir campañas de 550 recorridos por editar documentación.
