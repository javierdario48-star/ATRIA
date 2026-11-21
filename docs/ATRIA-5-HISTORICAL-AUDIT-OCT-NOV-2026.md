# ATRIA 5.0 — Auditoría histórica: octubre–noviembre de 2026

Fecha de corte de solicitudes: **1 de octubre–20 de noviembre de 2026 inclusive**, calendario de Buenos Aires. Esta ejecución empezó en la noche del 20/11; el host ya indicaba 21/11 UTC. La verificación técnica describe el HEAD recuperado y los cambios publicados en esta ejecución, no un supuesto estado aceptado por el usuario.

## Dictamen y alcance

**Se publicó trabajo real de Work.** El remoto inicial es `162d0cf24a936e302e2a3efadcc168e1459d86d5`, idéntico al último HEAD conocido. Su último commit es del 13/11, mientras el último traspaso está en `1b17484833c9ec9ffec879c43ff52577cf068851` del 12/11. Hay ocho commits posteriores que el inventario vigente no había incorporado. La ausencia de respuesta final de Work no demuestra ausencia de publicación.

**La recuperación histórica es parcial y no se presenta como exhaustiva.** Se buscaron el proyecto, sus nombres anteriores Clinical Shift/Night Shift, síntomas y solicitudes informales, con consultas temporales y por subsistema. Se recuperaron extractos, entregas y archivos locales; no se pudieron abrir todas las conversaciones ni ejecuciones íntegras. No existe evidencia suficiente para reconstruir la redacción y asignación individual original de 1–60. La matriz conserva cada número y las correspondencias documentadas, sin inventar 60 títulos ni sumar 60 tareas ficticias.

El inventario tiene **87 entradas de seguimiento**: conserva 20 IDs de familias anteriores, amplía criterios y áreas recuperadas, incluye 2 especificaciones reemplazadas y 3 entradas de continuidad/recuperación. Son entradas con criterios de aceptación, **no 87 citas originales independientes** ni un porcentaje de finalización. Las condiciones sucesivas de cada solicitud están reunidas en su entrada. [Datos con criterios/evidencias](evidence/historical-audit-2026-11-20/requirements.json) · [Matriz](ATRIA-5-REQUIREMENTS-TRACEABILITY.md) · [Plan](ATRIA-5-EXECUTION-PLAN.md).

## Método y jerarquía de evidencia

1. **Solicitud original recuperada:** mensaje actual íntegro. Un extracto generado de otro chat no se convierte en transcripción literal.
2. **Solicitud documentada indirectamente:** extracto de recuperación o contrato/entrega del repositorio. Su fecha es la de la fuente o la indicada por la recuperación; la fecha original desconocida se declara.
3. **Inferencia técnica:** implementación, diffs, pruebas, dependencia ausente o cambio local. No se atribuye al usuario.
4. **Información no recuperable:** texto/fecha/conversación no accesibles. No se rellena con memoria ni se da por descartada una petición.

Los resultados de recuperación a veces mezclaron Albúmina, ATELIER, stickers y medicina teórica o reprodujeron el texto de la propia consulta como supuesto mensaje antiguo. Se excluyeron esos elementos. Los índices locales `c0/c1` no son identificadores canónicos de chats y no se publican como enlaces. Se conserva la redacción como paráfrasis, no como cita literal garantizada. Una mención de título en un extracto no acredita haber abierto la conversación.

Se consultó el log completo accesible de la rama desde octubre (**2.152 commits en la ventana inicialmente indexada**), se inspeccionaron diffs y fuentes dirigidos por requisito y los ocho commits del 12–13/11. No se afirma revisión manual de cada uno de 2.152 diffs ni de todos los binarios históricos. Se indexaron 109 documentos Markdown de `docs` y 30 de `qa` antes de crear esta entrega; contratos, manuales y entregas relevantes se leyeron de forma dirigida. [Índice documental](evidence/historical-audit-2026-11-20/repository-document-index.json) · [Log verificable](evidence/historical-audit-2026-11-20/commits.tsv).

## Fuentes accesibles y límites

| Fuente | Fecha de fuente | Naturaleza | Contenido/localizador | Lectura | Límite |
| --- | --- | --- | --- | --- | --- |
| U-AUDIT | 2026-11-20 | Solicitud original recuperada | Mensaje íntegro de esta ejecución: auditoría y ejemplos repetidos; Conversación actual | Sí | Las fechas originales de los ejemplos repetidos no están dadas. |
| DOC-INVENTARIO | 2026-11-11/12 | Documentación indirecta | docs/ATRIA-5-REMAINING-TASKS.md en 98b4baf y 1b17484; Git | Sí | Conserva correspondencias por rango, no textos individuales de 1–60. |
| DOC-HANDOFF | 2026-11-11/12 | Entrega técnica | docs/ATRIA-5-CHATGPT-HANDOFF.md; Git | Sí | No acredita aceptación de usuario ni hardware. |
| DOC-EXACT | 2026-11-11/12 | Entrega técnica | docs/ATRIA-5-EXACT-CONTINUATION.md; Git | Sí | Estado documental anterior al HEAD de código. |
| DOC-CONTRATO | vigente en HEAD | Contrato técnico | docs/ATRIA-5-CASE-INTEGRATION-CONTRACT.md y AGENTS.md; Git | Sí | Cinco capas y libertad clínica vigentes; no es la transcripción original. |
| MIG-PLAN | 2026-10-16 y etapas | Documentación indirecta | docs/ATRIA_50_MIGRATION_MASTER_PLAN.md; docs/migration/STATUS.md; C01–C25; Git | Sí, archivos principales | Su tabla de pendientes es histórica, no inventario actual. |
| MIG-MANUAL | referencia de migración | Documentación indirecta | docs/migration/ATRIA_50_MANUAL_MAESTRO_FUNCIONAL.md; Git | Sí | Caracterización histórica V4/V5; restricciones posteriores pueden sustituirla. |
| DOC-QA26 | 2026-10-26 | Entrega técnica | docs/qa/2026-10-26-quality-results.md; Git | Sí | Resultados del SHA de esa entrega. |
| DOC-MORTALITY | 2026-10-26/27 | Entrega técnica | docs/qa/2026-10-26-mortality-results.md; Git | Sí | No repetir automáticamente166escenarios por una edición documental. |
| DOC-RPG | 2026-10-27 | Entrega técnica | docs/qa/2026-10-27-rpg-results.md; Git | Sí | La velocidad inicial205fue reducida después a184,5px/s. |
| DOC-GUARDSELECTION | 2026-10-27 | Entrega técnica | docs/qa/2026-10-27-guard-selection-results.md; Git | Sí | Multiplicadores actuales1,5/1,2/1,0. |
| DOC-WELCOME | 2026-10-27 | Entrega técnica | docs/qa/2026-10-27-welcome-results.md; Git | Sí | La imagen de referencia no aportó texto legible al intentar leerla. |
| DOC-AUDIO | 2026-10-29/30 | Entrega técnica | docs/ATRIA-5-BOTS-AUDIO-VISUAL.md; src/v5/content/audio/README.md; Git | Sí | Instrumentación no certifica calidad sonora percibida. |
| LIB-FARMACOS | 2026-10-10 | Entrega técnica | ATRIA_Prueba_Farmacos_648ab59.md; libfile_cf6de0a181488191b2c3699a6d7d6ded | Sí | HallazgosV4contrastados con módulosV5; no copiarlos como defectos actuales. |
| LIB-STABILIZATION | 2026-10-10 y actualizaciones | Entrega técnica | ATRIA_487_STABILIZATION_CHECKPOINTS.md; libfile_e7c38743be6c819195b4e4ebf6c23ca1 | Sí | Protección3+2ycréditoposterior pertenecen a revisiones distintas. |
| LIB-SQM | 2026-10-25/26 | Borrador técnico | ATRIA_V5_SQM_catalogo_y_fisica.md; libfile_da56f3f33afc819198ef25d2b34bf0bd | Sí | Dice expresamente no implementado;32 familias propuestas no son32órdenes originales. |
| LIB-CS412 | 2026-10-03 | Entrega técnica | Clinical_Shift_V4_1_2_QA.md; libfile_917dc29122108191b14acd85c53d46a8 | Sí | 234 atenciones enDOMemulado; sin prueba física. |
| LIB-ANDROID | 2026-10-05 | Entrega técnica | NIGHT_SHIFT_V4_2_7_PRUEBA_ANDROID.md; libfile_51f24dde8b488191b32f13176f3392d1 | Sí | Explicita0comprobacionesvisualesnuevas yGboardpendiente. |
| DOC-CONTINUIDAD | 2026-10-26 | Prompt/entrega derivada | ATRIA-5.0-prompt-continuidad.md; libfile_b0e3d18b0a348191a40f242d44b11752 | Sí | Checkpoint257a0a1; no contiene todo el historial. |
| GIT-13 | 2026-11-12/13 | Implementación primaria | Ocho commits 7afa707..162d0cf posteriores a1b17484; Git | Sí, diffs dirigidos | Ninguna modificación remota posterior al13/11al comienzo de esta ejecución. |
| RUN-HEAD | 2026-11-13; consultado2026-11-20 | Ejecución primaria | Actions43435355473,43435355500,43435355599 y logsdejobs fallidos; GitHub | Sí | Lista de runs por API pública porque conector solo devuelve pull-request runs. |
| LOCAL-WORK | workspacesprevios | Trabajo local | Siete checkouts anteriores, dos con cambios funcionales sincommit; Scratch disponible | Sí, estado/diffs dirigidos | No tocar/limpiar esos workspaces; algunos cambios están integrados de otra forma. |
| PC-01 | 2026-10-01 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta history_1; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-02 | 2026-10-02 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta discovery_1; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-03-07 | 2026-10-03..07 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta deep_1; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-08-14 | 2026-10-08..14 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta hist_batch_1_0; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-15-23 | 2026-10-15..23 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta hist_batch_1_1; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-17-23 | 2026-10-17..23 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta audit_step_2; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-23 | 2026-10-23 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta audit_step_2; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-24-31 | 2026-10-24..31 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta hist_batch_2_0; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-NOV | 2026-11-01..10 /04..08 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta hist_batch_2_1,last_history_2; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-11-20 | 2026-11-11..20 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta hist_batch_3_0; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-12-20 | 2026-11-12..20 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta audit_step_3; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-SOCIAL | 2026-10..11 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta next_4; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-03-04 | 2026-10-03..04 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta history_final_0; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |
| PC-09-10 | 2026-11-09..10 | Solicitud documentada indirectamente | Extractos de recuperación contextual; consulta history_final_1; Sin URL/ID canónico de conversación | Parcial | No se abrió chat íntegro. No usar referencias c0/c1 locales como IDs canónicos; pueden mezclar títulos/otros proyectos. |

Se leyeron 47 resultados de textos guardados, incluidos informesV4, continuidadV5 y archivos de transferencia de arte. Parte del registro crudo extenso de bots quedó en lectura parcial; no se utiliza para inventar peticiones. Los archivos de imagen/HTML/ZIP encontrados por búsqueda son metadatos o evidencias técnicas, no transcripciones completas. La imagen «Dos médicos sobre fondo oscuro.png» no devolvió texto legible: sus requisitos no se atribuyen a una lectura inexistente; se contrastan con contratos/entregas de Git.

Fuentes inaccesibles o incompletas:

- Historial completo de conversaciones normales y Work, comentarios intermedios, mensajes editados y pantallas anteriores. La navegación a ChatGPT mostró «Log in», sin sesión de la cuenta; no se pidió detener la auditoría para autenticarse.
- Lista literal original 1–60 y su fecha/título/ID canónico. El primer documentoGit recuperado conserva rangos y reconoce la pérdida de correspondencia individual. Cada número se reserva con texto individual **NO VERIFICABLE**.
- Todos los estados internos de ejecuciones Work interrumpidas. Siete checkouts anteriores sí están disponibles; no equivalen al registro conversacional de esas ejecuciones.
- Dispositivo Android físico, Gboard/parlante/cuentas afectadas y red móvil. Chromium Pixel emulado no acredita esos entornos. WebKit/iPhone tampoco se verificaron en esta ejecución.
- Índice íntegro del libro original y aceptación estética definitiva del nuevo mapaSQM. No se presume cobertura de todo el libro por tener55casos.

Issues yPR: búsquedas de todo el repositorio devolvieron0 resultados en ambos casos. La consulta inicial de issues por fecha también devolvió0. No se afirma revisión de comentarios inexistentes/devueltos en vacío ni cobertura de recursos que el conector no pudiera devolver.

## Cronología de solicitudes y correcciones

Las fechas de extractos son las indicadas por recuperación; pueden serUTC, mientras las entregas usan su fecha documental. Cuando no hay hora original no se inventa una conversión de día. Las filas con intervalos son cronología parcial. Las frases entre comillas son ejemplos conservados por fuentes indirectas, no garantía de literalidad del chat original. La matriz enlaza cada entrada con implementación, pruebas y pendientes.

| Fecha de fuente (2026) | Fuente | Solicitud/defecto recuperado | Referencias | Evolución y límite |
| --- | --- | --- | --- | --- |
| 1/10 | PC-01 | Gratis y sin Replit; libro completo y un caso por tema; RPG libre con comandos, burbujas, barras mínimas, agilidad y teclado nativo. | DEPLOY-01, CASE-01, CHAT-02, WORLD-01, KEYBOARD-OLD | La preferencia de teclado cambió después; no se prometen cuotas ilimitadas del proveedor. |
| 2/10 | PC-02 | Separar duda, hipótesis, diagnóstico y pregunta; ABC antes de etiología; receptor contextual e historial clínico único; bata desbloqueable, voz, personajes HD, piernas, memoria docente y bots incompetentes. | VEGA-02/03, CHAT-02, SAFE-01, XP-01/02, VOICE-01, WORLD-01, BOTS-01 | Las pistas no equivalen a migrar toda la docencia o la delegación. |
| 3/10 | PC-03-04; LIB-CS412 | Café cierra el chat antes de caminar; recepción muestra cola, box y responsables; monitor por cama y monitor faltante, flechas e ingresos simultáneos; ocultar teclado al enviar, conservando mensajes; bots en cuatro modos y guardia de 24 minutos. | WORLD-05, UI-02, NUR-02, TURN-01, KEYBOARD-01, BOTS-01 | El informe de 234 atenciones usó DOM emulado, sin aceptación física. |
| 4/10 | PC-03-04 | Examen por técnicas/órganos, ALiCIA/Glasgow, colores y respuestas según estado; paneles legibles; Vega ante «no sé/hazlo tú»; XP, curación/muerte; selección área/sistema/patología ×5/×3/×1; amigos, música original sin ruido blanco e intento TestSprite. | EXAM-01, PHYS-06, VEGA-02/03, DX-03, SELECT-OLD, SOCIAL-01, AUDIO-02, BOTS-02 | Los multiplicadores se sustituyeron el 27/10; el intento de TestSprite no acredita ejecución. |
| 5/10 | PC-03-07; PC-SOCIAL | Night Shift pasa a llamarse ATRIA; conservar diseño y proporciones, ambo/gorra #0D635C; amigos sin conexión, chat privado, presencia e invitaciones sin códigos. | WORLD-01, AUTH-01, SOCIAL-01/02, LOBBY-01 | La marca posterior reemplaza el nombre anterior; no autoriza rediseñar los personajes. |
| 6/10 | PC-03-07; PC-SOCIAL | Corregir roles paciente/enfermera y teclado en tratamiento/monitor; pantalla negra «Skip to content»; colega visible un segundo y luego congelado/desaparecido, aunque el chat sincroniza; voz/PTT y parlante Android pendientes. | NUR-01, WORLD-02, VOICE-01/02, ANDROID-01 | Defectos históricos V4; no se trasladan automáticamente al diagnóstico de V5. |
| 7/10 | PC-03-07 | Lag local/remoto, teletransporte y visibilidad asimétrica; continuidad con checkpoints y límites de reintentos ante atasco; QA aislado, preservar main/golden master y evitar parches de strings; navegador/móvil/dos clientes. | LAT-01, WORLD-02, CONT-01, ARCH-03, QA-01/02 | Un verde anterior no invalida un reporte posterior del usuario. |
| 8/10 | PC-08-14 | Lipasa/amilasa y «enfermera + estudio» no reconocidos; voz duplica «Hola Hola», inicio tardío/micrófono persistente y /vozdiag; «¿otra enfermedad?» devuelve edad; entrada a guardia desincronizada. | LAB-02, NUR-01, VOICE-01, ANAM-01, MP-01 | Los tests de voz legados no certifican una entrada V5 que no está conectada. |
| 9/10 | PC-08-14; MIG-MANUAL | Resolver chat, examen, permisos, órdenes, cierre y Vega; Box 2B/B4 no abre examen y hay problemas con historial/teclado; conservar estudios; censo de 54 controles sin 54 clics demostrados. | UI-02, CHAT-02, EXAM-01, QA-02 | Conservar la diferencia entre inventario de controles y aceptación de cada control. |
| 10/10 | PC-08-14; LIB-STABILIZATION | Paciente muere a los 2–3 minutos mientras se hace anamnesis/vías; monitor/vías no ejecutan, Cirugía acepta pero no llega y el resumen omite tratamientos; Enfermería hace solo la primera tarea; «solo metronidazol» activa ambos antibióticos; vasopresina no disponible. | PHYS-04, NUR-01/02, CLOSE-01, MED-01, DX-03 | La indisponibilidad técnica histórica de vasopresina no demuestra implementación actual. |
| 10/10 | LIB-FARMACOS; LIB-STABILIZATION | Auditorías técnicas: instalación farmacológica incompatible con heparina, dosis cero con efecto, offsets sin eliminación, feedback artificial de oxígeno y beneficios sin administración; propuesta de núcleo híbrido determinista. | PHYS-01/02/03, MED-01, ARCH-01 | Son hallazgos de entregas técnicas; no citas originales del usuario ni fallos V5 actuales por defecto. |
| 12–26/10 | LIB-SQM; PC-24-31 | Pasar del bitmap/malla a mapa SQM con objetos y física propia; preservar cámara/movimiento/multijugador; una geometría para puertas, sonido, camas/monitores y rutas. | WORLD-03/04 | El borrador del 25/10 dice no implementado; la revisión artística del prototipo sigue pendiente. |
| 13/10 | PC-08-14 | Chat multijugador hereda Solitario, con input que asciende al abrir teclado; órdenes combinadas de vías/monitor/Ringer/O2; no avatares antiguos; reparar integridad sin cambiar hash ni debilitar pruebas. | CHAT-02, NUR-02, WORLD-02, ARCH-03, QA-01 | El requisito posterior de escala no prueba un lobby masivo implementado. |
| 14/10 | PC-08-14; PC-SOCIAL | «Parece maqueta»: pide entrar y tocar el juego real; paciente/monitor Box 2B difíciles; responde otro paciente, ingreso nuevo en PC ausente en teléfono; tocar colega debe abrir amistad; preferencia por teclado propio. | UI-01/02, SEL-00, CHAT-02, LOBBY-01, KEYBOARD-01, QA-02 | La aceptación visual requiere interfaz real; una imagen generada no la sustituye. |
| 15/10 | PC-15-23; MIG-PLAN | Reconstrucción modular experimental inspirada en TFS, reutilizando lo funcional; CIRR desde UI hasta fisiología, estudios, reevaluación, destino/cierre y XP única; handoff reproducible en GitHub. | ARCH-01/02/03/04, CONT-01 | La autorización histórica del rebuild no autoriza reiniciar ahora. |
| 16/10 | PC-15-23; MIG-PLAN; MIG-MANUAL | Sistemas antes de casos nuevos; conservar mapa/sprites/cámara/teclado aprobados; libertad para decisiones erróneas y consecuencias, rescate y muerte; no equiparar catálogo a tratamientos ejecutables. | SAFE-01, MED-01, PHYS-05, CASE-02, KEYBOARD-01, WORLD-01 | La restricción temporal de casos nuevos fue sustituida por la expansión autorizada del 27–28/10. |
| 17–19/10 | PC-17-23 | Bots competentes/perjudiciales y evolución/rescate; persistencia/recuperación C5.b; continuar C5.b.3 sin reconstruir, conservar clínica y multijugador; albúmina y estudio renal en peritonitis. | BOTS-01, AUTH-02, NUR-03, MED-01, MP-01 | Blob suspendido es un antecedente; después se documenta Supabase CAS real. |
| 20/10 | PC-SOCIAL | Chat privado ausente; invitación no avisa o exige invitación mutua; reutilizar el funcionamiento anterior. | SOCIAL-01/02 | No se recuperó aceptación posterior del chat directo V5. |
| 22–23/10 | PC-SOCIAL | Solicitudes de amistad visibles con contador; lag al caminar/hablar y globos ausentes; retroceso, teletransporte y repetición de recorrido. | LOBBY-01, CHAT-02, WORLD-02, LAT-01 | Conservar correcciones sucesivas; no atribuir aceptación física al último commit. |
| 23/10 | PC-17-23; PC-23 | Paciente por defecto y Enfermería explícita; XP proporcional, editor diagnóstico cierra al registrar, rueda menor; una pregunta de Enfermería por vez; diagnóstico tras evaluación mínima; panel de cierre persistente; música/monitor por FC y quitar textos de simulación. | CHAT-02, DX-01/03, UI-01, NUR-01, VEGA-02, AUDIO-02, PHYS-06 | Los guiones «—» para datos desconocidos no permiten inventar mediciones ni esconder incertidumbre clínica. |
| 24–26/10 | PC-24-31; DOC-QA26; DOC-MORTALITY | Cirugía cierra al aceptar derivación, sin operación simulada; fisiología causal, variaciones y bots sobre 25 casos; tacto rectal real; mortalidad y recuperación sin resurrección. | CLOSE-01, PHYS-03/05, EXAM-01, VAR-01, BOTS-01 | 166 escenarios/62 muertes y 500 recorridos son evidencia del SHA de esa entrega. |
| 27/10 | PC-24-31; DOC-RPG; DOC-GUARDSELECTION; DOC-WELCOME | Perfil social completo; sonido más fuerte/eco; velocidad inicial −10%, reloj AM/PM y sol/luna; selección ×1,5/×1,2/×1,0; bienvenida original, nombre único y contraseña ≥12, cuentas y guardias desde otro dispositivo. | XP-01, AUDIO-02, AUTH-01/02, SELECT-01, TURN-01, LOBBY-01 | Conservar sustituciones de velocidad/multiplicadores y distinguir cuenta de recuperación obligatoria. |
| 28/10 | PC-24-31 | Añadir 30 casos respiratorios/cardiológicos/neurológicos, 55 totales, clásicos y difíciles; compilador, estudios, tratamientos, alergias, infusiones, variación y complicaciones; cierres reales con bots en cuatro modos. | CASE-01/02, VAR-01/03, BOTS-01, ARCH-01 | El catálogo compuesto tiene 55 casos; cases.json base mantiene 25 y no debe confundirse con catálogo jugable. |
| 29/10 | PC-24-31; DOC-AUDIO | Música nueva al abrir y en lobby, clásica en guardia; ajuste de tema, silencio permanente solo música, click de menús, crossfade y preferencias; recuperar publicación de audio interrumpida. | AUDIO-01/02, CONT-01 | f6ba34f publicó audio; la nota anterior de publicación pendiente quedó superada. |
| 30/10 | PC-24-31; PC-SOCIAL | CARD-08/HDA/VARIX, peritonitis, receptor, infusiones, Enfermería y cierres; chat privado minimizable y autocompletado completo de estudios. | CLIN-CARD08-01, CLIN-HDA-01, CLIN-VARIX-01, MED-02, CLOSE-01, NUR-03, SOCIAL-01, LAB-02 | La corrección posterior de betabloqueo contraindicado pertenece al mismo requisito CARD-08. |
| 1–3/11 | PC-NOV; U-AUDIT | No se recuperaron mensajes originales fechados en estos tres días; los reportes del prompt actual no aportan su fecha original. | CONT-02 | No afirmar ausencia de solicitudes: es una laguna de recuperación. |
| 4–6/11 | PC-NOV; PC-SOCIAL | Sin trámites ocultos y reevaluaciones rutinarias por Enfermería; Vega no repite estudios y acepta repreguntas; libertad clínica; XP cooperativa compartida incluso pistas; mensajes ausentes que aparecen juntos; informante ante incapacidad, VEDB y UTI por gravedad. | CLOSE-01, NUR-01/04, VEGA-COHERENCE-01, ANAM-01, XP-COOP, MP-01, FAM-01, LAB-02 | Créditos de cierre compartidos no cumplen por sí solos compartir penalizaciones de pistas. |
| 9–10/11 | PC-09-10 | Nunca «pendiente de confirmación»; demoras graves en pistas/respuestas/diagnóstico/selección; verificar trabajo real de Work sin rehacer selección; revelar diagnóstico −50%, XP visible/animada y recuperación. | LAT-01, VEGA-AUTO-01, DX-01, SEL-00, DX-REVEAL, XP-03, REC-01 | Respuesta ágil no equivale a administración o crédito ficticio antes del recibo. |
| 11/11 | PC-11-20; DOC-INVENTARIO | Una pregunta/respuesta y un toque/pista; conservar 60 referencias; NUR y cierre sin NPO oculto; 403 al invitado tras aceptar; CHOLE/ILEO; errores restan XP sin cerrar; guardia guardada no fuerza retomar: Después/lobby. | DIALOG-AUTO-01, VEGA-AUTO-01, NUR-01, MP-01, CLOSE-01, REC-01 | Pruebas publicadas sin ejecución en ChatGPT se diferencian de las verificaciones posteriores de Work por SHA. |
| 12–13/11 | PC-12-20; GIT-13 | Anamnesis incompleta no bloquea cierre; alergia preexiste; alta/observación mantienen evolución y penalización; XP se pausa al salir, rival independiente; estudios seriados y rescates. | CLOSE-01, SAFE-01, XP-COOP, COMP-01, LAB-01, VAR-03 | Ocho commits después del handoff: no hay base para decir que Work no publicó nada. |
| 14–19/11 | GIT-13; PC-12-20 | No hay commits nuevos en la rama ni transcripciones recuperadas de estos días para confirmar solicitudes adicionales. | CONT-02 | Silencio de Git no acredita ausencia de peticiones o de trabajo local. |
| 20/11 | PC-12-20; U-AUDIT | Encontrar último Work bloqueado; reconstruir todas las solicitudes desde octubre, conservar historia/60 referencias, contrastar código y publicar auditoría, matriz, inventario, plan y traspaso; corregir P0 seguros. | CONT-01/02/03, QA-01 | Solo el mensaje actual está disponible íntegro como solicitud original; el resto se etiqueta según fuente. |

## Ocho correcciones que el traspaso del 12/11 no reflejaba

| Commit | Comportamiento | Requisitos afectados |
| --- | --- | --- |
| 7afa707 | Entrevista contribuye a calidad, no a elegibilidad de disposición. | CLOSE-01,DX-03 |
| f2b104a | Expediente competitivo no tomado es privado antes del acceso a cama. | COMP-01,VAR-02 |
| 1e0da7c | Rehidratación oral confirmada tiene recuperación diferida documentada. | PHYS-03,VAR-03 |
| 3431230 | Susceptibilidad alérgica independiente de haber preguntado. | SAFE-01,VAR-03 |
| c0e9ed4 | Seguimiento/ayuno de sala se puntúan sin bloquear destino. | CLOSE-01,NUR-01,DX-03 |
| 775ccda | Camas disponibles siguen visibles sin exponer expediente. | COMP-01,UI-02 |
| 4c8fdcb | Órdenes seriadas se vinculan a evidencia de muestra disponible. | LAB-01,LAB-02 |
| 162d0cf | Certificador exige recibos causales de rescate y oportunidades temporales realistas. | BOTS-01,VAR-03,QA-01 |

## Solicitudes olvidadas y pérdida de condiciones

La letraA significa ausencia como criterio explícito en el **inventario recuperado**; sin la lista original literal no se puede afirmar que nunca haya aparecido en los60originales.

| Tipo | Hallazgo | Evidencia / consecuencia | Seguimiento |
| --- | --- | --- | --- |
| A | Chat privado de amigos minimizable durante guardia. | Equipo existe solo dentro deCooperativo; tarjeta social no tiene hilo directo ni ruta de mensajes entre amigos. | SOCIAL-01 |
| A | Voz dictada y voz/PTT entre jugadores; desbloqueo de bata; acción de café; mapaSQM; cobertura por capítulos. | Legacy y planes contienen requisitos que la lista de 20 áreas no seguía explícitamente. No reintroducirlos como si ya hubieran sido aceptados en V5. | VOICE-01/02,XP-02,WORLD-03/05,CASE-01 |
| B | XP cooperativa simplificada a créditos de cierre. | El usuario pidió compartir incluso pistas; ledger yrewardFor conservan conteo/penalización por médico. Pausa/resume sí se añadió. | XP-COOP |
| B | Pistas coherentes simplificadas a55cierresguiados. | No equivale a cada destino/alternativa/control/estado adverso; motor es compartido pero cobertura longitudinal requiere evidencia. | VEGA-COHERENCE-01,LAB-01 |
| C | Módulos de voz ydocencia antigua sin integraciónV5 completa. | No hay control de dictado/PTT enapplication/index; vegaGuidance remite a pista sin todo el diálogo/delegaciónC09. | VOICE-01/02,VEGA-02/03 |
| D | Pruebas publicadas antes de ser ejecutadas; nuevas correcciones posteriores con suites rojas. | Checkpoints11/11 lo reconocen. Pruebas posteriores verdes no cubren automáticamente cambios13/11. Se reproducen3fallos locales y cancelacionesNode 22 en CI. | QA-01,QA-03 |
| E | Privacidad competitiva corregida dos veces. | 33f85e3 protegió cama liberada;f2b104a también cama nunca tomada;775ccda preservó visibilidad pública. Matriz43289556288 terminó6/8;43435355500sí 8/8. | COMP-01 |
| E | Reportes repetidos de recuperación, Enfermería, selección y pistas tras entregas satisfactorias. | El prompt actual mantiene esas observaciones. Su reproducción física posterior no está accesible; quedan pendientes de aceptación/diagnóstico, no completados definitivamente. | REC-01,NUR-01,LAT-01,VEGA-AUTO-01 |
| F | Paridad perdida o sustitución consciente incompleta. | Voz/tutor no están completamente migrados. No se demuestra que fuera eliminación accidental. Teclado y multiplicadores sí fueron sustituidos explícitamente. | VOICE-01/02,VEGA-02/03,KEYBOARD-OLD,SELECT-OLD |
| G | Trabajo local sin publicar existe, pero parte ya está integrado. | Ver comparación de workspaces. No aplicar parches viejos por igualdad de nombre/ausencia de commit. | CONT-03 |

## Trabajo de Work recuperado sin sobrescribirlo

Se inspeccionaron siete checkouts anteriores. Dos conservan modificaciones funcionales sincommit:

- `81946b15abba/ATRIA` en23ce429: harness, certificador, cierre/políticas, compilador, bienvenida y archivosQA nuevos. El compilador y test de registro coinciden conHEAD; el resto requiere comparación semántica. `qa/v5/rtc-diagnostics.mjs` no existe en el árbolGit actual: es auxiliar local, no prueba de funcionalidad pedida perdida.
- `bd5f051b931b/ATRIA` en52cedd4: ledger,revelación,guard-session,angio-TC yregresiones. El ledger ytestdurable coinciden byte por byte con HEAD; guard-session/vocabulario difieren porque hubo correcciones posteriores. No es correcto afirmar que nada llegóaGitHub.

Los otros checkouts son referencias técnicas de susSHA. No se limpiaron, no se publicaron binarios antiguos y no se hizo reset de trabajo ajeno. La edición se realizó en uncheckoutaislado basado en elHEADremoto.

## Estado de verificación real

| Ámbito | SHA | Resultado | Alcance |
| --- | --- | --- | --- |
| Suite localV5,Node 24.22.3 | 162d0cf24a936e302e2a3efadcc168e1459d86d5 | 3164/3167;3 fallos,0 canceladas | Sin ocultar fallos: personalidad competitiva, harness de mortalidad competitivo, expectativa de evaluación NPO. |
| BuildV5/core y frontera | 162d0cf24a936e302e2a3efadcc168e1459d86d5 | Aprobados;217 archivos,190 módulos | No prueban servidor desplegado ni teléfono. |
| CIExperimentalGame43435355473 | 162d0cf24a936e302e2a3efadcc168e1459d86d5 | 28/30jobsaprueban | Clean-core yNPC fallan;Clean-core incluye cancelaciónNode 22enrecoverytests. |
| CIClinicalTransfers43435355599 | 162d0cf24a936e302e2a3efadcc168e1459d86d5 | 7/11jobsaprueban | Wrong-dx,missing-dx,wrong-destination,insufficient-preparation fallan por expectativas de initialRefusal. |
| CINativeClinicalMatrix43435355500 | 162d0cf24a936e302e2a3efadcc168e1459d86d5 | 8/8jobsaprueban | 550 recorridos planeados por manifiesto; no se descargaron/releyeron todos los8ZIPen estaejecución. No se afirma550certificadosclínicosestrictos. |
| Matriz histórica43289556288 | 9db7037 | 6/8jobsaprueban;2fallan | Elhandoff12/11 la dejaba encola; ya no está encola. |
| Estado combinado de Vercel | 162d0cf24a936e302e2a3efadcc168e1459d86d5 | success | DeployexitosonoequivaleaCIglobalverde. |
| Preview/multicuenta/Android físicoactual | HEAD de estas salidas | No ejecutado aquí | Se reutiliza evidencia por SHAde CI/entregas; no se inventa aceptación nueva. |

Los fallos de certificación exigen diagnóstico, no una reversión automática del motor. Dos fixturesleen datos que el nuevo control de privacidad retira hasta elclaim; alimentación cambia el puntaje al cambiar una indicación. Los bots de traslados todavía esperan rechazo genérico, incompatible con alta insegura ejecutada y evaluación separada. La cancelación de reintentosNode 22requiere reproducir el ciclo de espera antes de clasificarlo como defecto del jugador.

## Causas raíz y prioridades

| Bloque | Causa compartida | Prioridad | Entorno |
| --- | --- | --- | --- |
| B0 | Fixtures leen expedientes privados antes del claim; expectativas de rechazo incompatibles con libertad clínica; cambios NPO sin actualizar contrato de calidad. | P1 | CHATGPT NORMAL |
| B1 | Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. | P0/P1 | MIXTA |
| B2 | Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. | P1 | MIXTA |
| B3 | Intenciones finitas y datos redactados; docencia antigua no migrada por completo; fuente indirecta limitada al contenido declarado. | P1 | MIXTA |
| B4 | Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. | P2 | MIXTA |
| B5 | Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. | P2 | MIXTA |
| B6 | Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. | P1/P2 | CHATGPT NORMAL |
| B7 | Fondo hospitalario monolítico y malla; objetos/colliders independientes siguen siendo una propuesta. | P3 | MIXTA |
| B8 | No hay transcripciones completas ni correspondencia literal individual de 1–60; documentos antiguos conservan estados de su SHA. | P1 | BLOQUEADA |

**P0 confirmado de juego:** no se reprodujo en esta auditoría una pérdida de progreso, fuga de expediente actual, doble administración o imposibilidad real de recuperar una guardia. REC-01 conserva prioridadP0por impacto del reporte del usuario y aceptación pendiente. No se inventa unP0para justificar un parche clínico. LaCI roja es un bloqueo de certificaciónP1y se atiende tras completar esta matriz.

**Siguiente ejecución:** B0 reparación dirigida de fixtures y contratos, después B1 medición/recuperación y B2 evidencia/cierre. Implementación acotada y pruebasNode sonChatGPT normal; Work solo para aceptación de navegador/cuentas/entorno que las herramientas disponibles no puedan reproducir. Android físico y fuentes de chats íntegros siguen bloqueados por acceso/dispositivo, aunque se utiliceWork.

La auditoría puede ampliarse sin rehacerla: nueva fuente→mismaentradaoIDnuevo→evidencia→estado→matriz. No se infiere resolución porque un problema dejó de mencionarse. Los criterios de finalización de la misión relativos a todas las conversaciones y redacción1–60 **no se dan por cumplidos** con el acceso actual.
