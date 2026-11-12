# ATRIA 5.0 · Inventario maestro de requisitos

## Estado vigente · 12 de noviembre de 2026

La ejecución partió de `cf13ec52a71452b0a921d22d921a3476382f6b39` y publicó el código validado en `3dc13907e84b69b9367a3cc28a0be9035c7138af`. Los commits, pruebas y próximos pasos están en [Continuidad exacta](ATRIA-5-EXACT-CONTINUATION.md). Los checkpoints históricos conservan la evidencia de sus respectivos SHA.

### Correspondencia con el inventario original

La columna «Números» conserva la asignación publicada de los 60 requisitos, incluidos los cruces 45 (MP/LAT) y 58 (DX/LAT). Se recuperaron los grupos, criterios y fragmentos de las solicitudes anteriores. La redacción literal y la asignación individual dentro de cada rango siguen pendientes de recuperación. Los identificadores adicionales de esta auditoría tienen estado y evidencia propios.

Solicitudes recuperadas de mensajes anteriores que amplían los criterios de la tabla:

- **LAB-01 y LAB-02.** Identificar las TC y gasometrías discordantes por adquisición. Conservar el hemograma con leucocitos y la PCR como determinación distinguible, incluso al pedirlos juntos. Hacer encontrable VEDB y evitar endoscopias duplicadas.
- **ANAM-01, DIALOG-AUTO-01 y FAM-01.** Entender y devolver saludos, incluido el saludo automático de primer contacto. Distinguir enfermedades previas del cuadro actual y ampliar antecedentes más allá de esguinces. Hacer visible al acompañante cuando el caso dispone de esa fuente.
- **NUR-01 y CLOSE-01.** Comprender «nada por boca» en lenguaje natural. Hacer que Enfermería pregunte si puede alimentar al paciente y registre la decisión. Revisar la solicitud de que el consejo de seguimiento y signos de alarma sea recomendable. En los casos revisados se evalúan como calidad de atención.
- **DX-01, DX-REVEAL, MP-01 y LAT-01.** Guardar la impresión en un solo envío y poder revelar el diagnóstico del caso con un descuento del 50%. Resolver el retraso de respuestas, selección y pistas. Conservar los mensajes entre médicos y la actividad compartida desde el inicio de guardia.

### Registro maestro de estado

Las rutas abreviadas corresponden a `src/v5/`. «Probado» identifica el escenario de la columna de evidencia. La aceptación en el dispositivo físico o el despliegue se indica por separado.

| ID | Números | Estado | Evidencia y archivos | Siguiente acción |
| --- | --- | --- | --- | --- |
| DX-01 | 56–58 | Probado en Node y Chromium. Aceptación física pendiente. | `ui/clinical-controller.js`, `diagnostic-impression.test.js` y `qa/v5/diagnosis-browser.mjs` cubren UID, cierre inmediato, doble toque, borrador, borrado y recibo tardío. El navegador verificó que el diagnóstico revelado no sustituye la impresión. | Verificar edición con pérdida de red y retorno en preview y Android físico. |
| LAB-01 | 1–3, 5–6, 9 | Probado para las adquisiciones cubiertas. Controles adicionales en revisión. | `studies.js`, `study-orders.test.js` y los commits `97ef4f9`, `4ca7286`, `a245215` separan angio-TC aórtica, pulmonar y de sangrado. Una consulta ambigua requiere protocolo. Las pruebas conservan UID, evento, minuto y resultado de hemograma, PCR, gasometría, TC, ecografía y troponina seriada en los casos cubiertos. | Extender los controles por evolución con fuente certificada y comprobar que cada muestra anterior conserva su informe. |
| LAB-02 | 4, 7 | Probado en Node y teclado Chromium. Android físico pendiente. | `study-order-vocabulary.js`, `study-orders.test.js`, `clinical-autocomplete.test.js` y Chromium Pixel 5 emulado verificaron VEDB, VCC y videocolonoscopia en CROHN/COLON con una adquisición canónica. La endoscopia alta conserva su identidad. | Confirmar búsqueda y orden desde el teclado Android físico. |
| ANAM-01 | 10–13, 16–17 | Precisión de antecedentes familiares corregida. Antecedentes personales históricos parcialmente defectuosos. | `3dc1390`, `patient-dialogue.test.js` y `patient-conversation.test.js`. RESP-05 responde cuando desconoce los antecedentes familiares, sin tomar prestados datos personales. DIVERT/PUD reproducen la mezcla de motivo actual y antecedentes en `legacy-patient-variation.js`. La certificación previa de 10.010 anamnesis corresponde a su SHA. | Corregir la fuente PMH en 12 casos, ampliar variantes y verificar un checkpoint anterior por hash. |
| NUR-01 | 18–19, 21–24 | Probado en Node para decisiones de alimentación y recibos. Android físico pendiente. | `ebba52e`, `nursing-nutrition.test.js`, `physical-nursing.test.js` y `nurse-diagnosis-speech.test.js`. La pregunta proactiva se activa en cinco casos que declaran ayuno y su respuesta persiste en los cuatro modos. Se conserva el recibo de la conducta y la administración idempotente. | Verificar alimentación, alergias, oxígeno y seguimiento en Android físico. Reproducir el silencio de Enfermería fuera de los flujos cubiertos si vuelve a aparecer. |
| CLOSE-01 | 25–32 | Probado para altas y recorridos principales. Otras alternativas en revisión. | `faf1f00`, `accepted-transfer.test.js`, `clinical-plausibility.test.js`, `competitive-durable.test.js` y `closure-catalog-audit.test.js`. Alta insegura con débito único y paciente recuperable. Seguimiento mejora la calidad de alta en DIVERT, HEPAT y PUD. CHOLE e ILEO cierran con recibos reales de preparación y recepción. Los 55 casos cerraron en los bots de Vega. | Ejercitar otras omisiones menores y destinos, así como evolución adversa tras una decisión registrada. Mantener cada requisito indispensable clínicamente explícito. |
| VEGA-01 | 8, 33–34, 53 | Probado en Node y navegador en los recorridos ejecutados. Aceptación física pendiente. | `ui/clinical-hint-presenter.js`, `clinical-hints.test.js`, `clinical-hint-ledger.test.js`, `server/clinical-hints-durable.test.js` y `qa/v5/clinical-hint-bots.mjs`. 55 casos cerraron. El navegador confirmó una pulsación, presentación y cobro visible. | Ejercitar alternativas, controles por evolución y efectos adversos, incluyendo recibos del segundo médico. |
| DIALOG-AUTO-01 | Requisito explícito | Probado en navegador local y en Cooperativo del checkpoint anterior. | `patient-dialogue-browser.mjs`, `84af64f` y `3dc1390`. Un envío produjo respuesta visible. NEUR-06 atribuye el relato al acompañante con Glasgow verbal 1. La prueba integrada recuperó actividad y recibos en dos sesiones. | Medir del envío al texto visible en Android físico y comprobar el primer contacto y preguntas fuera de tema. |
| VEGA-AUTO-01 | Requisito explícito | Probado en Node y Chromium. Android físico pendiente. | `clinical-hints-browser.mjs` y `clinical-hints-durable.test.js` cubren un toque, presentación confirmada, repetición gratuita, protección ante cambio de paciente y el 5% por pista nueva aun cuando se revela el diagnóstico. | Medir en preview y Android físico y comprobar cambios concurrentes de otro médico durante la presentación. |
| VEGA-COHERENCE-01 | Requisito explícito | Probado en las progresiones cubiertas. Controles adicionales pendientes. | `clinical-hints.test.js`, `accepted-transfer.test.js` y 55/55 bots. HEPAT y CARD-08 distinguen pendiente e informado. PANC, CHOLE e ILEO avanzan a la intervención o destino que falta según los recibos. | Ampliar la secuencia pista, orden, recibo y nueva pista a controles temporalmente indicados y alternativas de tratamiento. |
| LAT-01 | 45, 54–55, 58, 60 | Correcciones probadas en escenarios locales. Medición externa pendiente. | `f35ba43`, `9404669` y `81fd2da`. Guardado activo con límite de 12 segundos. Chat ACK a DOM del colega de 336/586 ms en dos procesos locales. Comparación alternada de tres pacientes redujo la mediana de proyección de 1,28 a 1,12 ms y la de avance de 0,31 a 0,11 ms. | Medir envío, CAS, recibo y render en preview y teléfono. Distinguir los tiempos propios de enfermería, marcha y laboratorio. |
| MP-01 | 44–46 | Admisión verificada en el preview anterior. Presencia verificada localmente. | `a8fe551`, `ceaa900` y `supabase-social-room-persistence.test.js` sustentan el 403 corregido y los límites 401/403/404. `a6fdc9d` y 56 pruebas dirigidas cubren disponibilidad, poses limitadas a miembros y pestañas atrasadas. Dos cuentas Chromium locales recuperaron los mismos pacientes y eventos. | Validar Competitivo y la presencia con dos cuentas en el preview del SHA final. Repetir invitación, recarga, revocación e intento del tercero. |
| XP-COOP | 39–43, 47 | Crédito compartido, descuentos y debrief probados. Elegibilidad tras salida en revisión. | `faf1f00`, `69a5a1f`, `36bf20f`, `clinical-reward.js` y PostgreSQL. El débito por alta es por médico. El cierre competitivo acredita al dueño. La presentación distingue créditos confirmados, pendientes y saldo, y anima una vez por recibo en la sesión. | Añadir una matriz que contraste guardar y finalizar antes de un cierre del compañero. Verificar los recibos ya acreditados y la elegibilidad de nuevas recompensas. |
| DX-REVEAL | 35–38 | Implementado y probado en Node, Chromium y PostgreSQL. | `69a5a1f`, `clinical-hint-ledger.js`, `clinical-hints-durable.test.js` y `case-debrief.js`. La revelación se registra por médico y encuentro, descuenta 50% una sola vez sobre el XP tras Vega y mantiene la impresión y la atención. | Verificar el recorrido en el preview del SHA final y Android físico. |
| FAM-01 | 14–15, 20 | Interacción clínica probada en Node y Pixel 5 emulado. Aceptación física pendiente. | `84af64f`, `patient-dialogue.test.js`, `app/world.js`, `patient-actions.js` y navegador de NEUR-06. La rueda ofrece acompañante al declararse un informante. Sus hechos, repreguntas y atribución sobreviven restauración y conservan el contexto de cada médico. | Validar una segunda presentación con informante declarado cuando el catálogo la incluya. Confirmar el tamaño táctil en Android físico. |
| REC-01 | 48–52 | Incidencia corregida y probada con cuentas Chromium locales. Preview final y Android físico pendientes. | `8ea6be9`, `f35ba43`, `9404669` y `guard-recovery-browser.mjs`. Solitario, Cooperativo y Competitivo superaron 409, respuestas tardías, Después, X, Escape, guardado activo, recuperación y liberación. El ensayo local sobre `a6fdc9d` completó 24 minutos reales y extensión con dos cuentas y los mismos pacientes. | Repetir las tres decisiones, el guardado con red lenta y el turno de 24 minutos en el preview con dos cuentas y Android físico. |
| UI-01 | Requisito transversal | Marcador y controles cubiertos en Chromium. Android físico y otras superficies pendientes. | `2b2cd4a`, `web/game.css` y `guard-score-browser.mjs` verificaron la columna superior izquierda, reloj y accesos en cinco vistas. En el navegador también se comprobó impresión, pista, acompañante y revelación. | Revisar la rueda en paisajes de poca altura, chat de amigos, volumen Android y sugerencias de ecografía/troponina. |
| SAFE-01 | Requisito transversal | Probado por regresiones de evolución, recibos y aislamiento. Variantes pendientes. | `medication-safety-487.js`, `receipts.js`, `transfer-continuation.js`, `physical-nursing.test.js` y regresiones de alta. Se conservaron alergias, administración veraz, rescate, dosis únicas y registro de consecuencias. PostgreSQL verifica débito de muerte y alta por separado. | Ejercitar combinaciones de alta, deterioro, alergia y tratamiento causal. Conservar ampicilina, alternativas y tres pares de hemocultivos. |
| ARCH-01 | Requisito transversal | Validado en el alcance modificado. | `audit-v5-boundary.mjs` pasó en 190 módulos. La guardia reutiliza una proyección por paciente. Hay una autoridad clínica, un dueño del RAF y un único RPC de acreditación para pistas, revelación, cierre y débitos. | Mantener la identidad del catálogo guardado, las responsabilidades y los recibos al ampliar casos. |
| SEL-00 | 59 | Probado. | `app/patient-selection.test.js`, `social/durable-cooperative-replica.js` y navegador de dos cuentas. Cambio A→B conserva UID y dirige la pregunta al paciente correcto. | Conservar la selección directa y repetir esta regresión cuando se toque foco, transporte o presencia. |

### Límites de la auditoría clínica

La auditoría ejecutó 55 casos y 91 destinos declarados. Los bots cerraron los 55 recorridos principales. Las alternativas clínicas, la aceptación física y el recorrido integrado del preview final siguen abiertos. Seis archivos V4 ejecutados verificaron la compatibilidad histórica en cierre, derivación, Vega, tratamiento y estudios.

## Historial de checkpoints

## Checkpoint ChatGPT — 2026-11-11

- DX-01: `3b0db36`, `d4a6ebd` modifican `clinical-controller.js` para cierre no bloqueante, UID explícito, bloqueo de duplicados y borrador recuperable. Comprobadas sintaxis y pruebas aisladas de cierre inmediato y rechazo; **no** se ejecutó aún el navegador/Android ni la suite Node completa.
- LAB-02: `6450b1e` añade alias VEDB al vocabulario canónico y `6c1f188` incorpora regresión en `study-orders.test.js`. Resolución aislada 14/14 en CROHN-001 y COLON-001; **no** se ejecutó aún la suite Node completa.
- Siguiente: ejecutar las pruebas dirigidas del traspaso, corregir cualquier regresión y continuar con NUR-01. Verificar HEAD antes de nuevos cambios.

## Checkpoint de continuidad — 2026-11-11, segunda ejecución ChatGPT

- HEAD inicial verificado mediante comparación GitHub: `5123e1a11f34689feaec13859de19d72373ca3f4` idéntico a la rama. No se modificaron recuperación de guardias ni pistas.
- DX-01: `991e152` añadió pruebas de demora, doble toque, cambio de paciente y reapertura. `a660c74` protege borradores y recibos frente a reinicio de sesión. `446c3ec` añadió regresión de sesión reiniciada. Tres escenarios aislados ejecutados en JS (reapertura, reset y rechazo): correctos. **Suite Node/navegador aún no ejecutada.**
- LAB-02: sin nuevos cambios; pruebas integradas aún pendientes. Resolución aislada 14/14 heredada del checkpoint anterior.
- NUR-01: `7fa1ae6`, `fd844a0`, `233b9b1`, `91d20dc` implementan consulta de alergias con lectura de datos de seguridad existentes, sin tratamiento, y recibo nativo validado. `ce6ae98` reconoce plan de seguimiento con control y señal concreta de retorno. `4e34699` reconoce ayuno/no dar agua mediante intervención `npo` ya existente. `d98961e` evita acreditar consejo de retorno negado. Tests añadidos en `nurse-diagnosis-speech.test.js` y `physical-nursing.test.js` (commits `3379776`, `ac5cf2a`, `ab67213`, `00b2666`, `4578d91`). Verificaciones aisladas ejecutadas: 5/5 consultas de alergia, 6/6 NPO, 4/4 frases de seguimiento y 3/3 flujos DX. **No se ejecutó la suite Node completa ni una sesión real en Android.**
- Restricción del entorno: el contenedor no resuelve github.com; GitHub connector permite leer/publicar archivos pero no montar el repositorio para `npm` o Playwright. No presentar pruebas agregadas como aprobadas sin ejecutarlas.
- Próxima acción: ejecutar `node --test src/v5/ui/diagnostic-impression.test.js src/v5/core/nurse-diagnosis-speech.test.js src/v5/core/nursing-formulation-routing.test.js src/v5/clinical/physical-nursing.test.js src/v5/clinical/study-orders.test.js src/v5/ui/clinical-autocomplete.test.js qa/tests/v5-nurse-study-autocomplete.test.mjs`, `npm run build:v5`, y navegador de diagnóstico cuando haya runner; corregir cualquier regresión antes de LAB-01. Confirmar recepción real del recibo de alergias, idempotencia y plan de alta.

## Checkpoint — 2026-11-11, tercera ejecución ChatGPT

- HEAD inicial remoto d35048890618adb69c5c23a7135ef2268496e4f9 verificado idéntico a la rama; se leyeron los tres documentos de traspaso.
- Se intentó git ls-remote desde el contenedor con Node 22.16.0; falló por DNS (Could not resolve host: github.com). No existe checkout disponible para ejecutar la suite completa ni el build. No atribuir éxito a pruebas no ejecutadas.
- Estado GitHub del HEAD inicial: Vercel success; sin workflow runs de pull request devueltos para ese SHA. Vercel no acredita tests Node, navegador ni Android físico.
- NUR-01: commit 239b8e2 agrega regresión integrada de doble instrucción NPO en src/v5/clinical/physical-nursing.test.js (ayuno y no dar agua): ambas deben usar el ejecutor existente y dejar un único tratamiento confirmado. **Test publicado, no ejecutado todavía**.
- Próxima acción: ejecutar los siete archivos de test y npm run build:v5 en un checkout completo; corregir cualquier fallo antes de añadir lógica proactiva. Luego verificar conversación de alergias, plan de alta y preguntas de enfermería sin repetición. LAB-01 sigue después de NUR-01.

## Checkpoint ChatGPT — 2026-11-11, NUR-01 and closure audit

- Starting HEAD: `8d1d6feb197b9079a201947cd9bfc7c0bbbb8670`, comparison with branch identical.
- NUR-01: `f4c3913` extends the existing allergy-question intent to natural singular/plural forms ("tiene alguna alergia", "presenta algunas alergias"); the existing `nurse.inquire` receipt remains the sole source of clinical information. `df21cae` adds routing regressions. No treatment, patient allergy facts or clinical authority was modified.
- CLOSE-01/VEGA-01: `691ed88` adds `auditClosureRequirements` to the existing requirement projection. It is read-only and flags untyped gates, absent study/treatment alternatives, missing destinations, unmatched blocker sets and NPO treatment gates needing clinical necessity review. `a631fe7` adds four regression scenarios. **It is an initial audit primitive, not an exhaustive all-case audit or a change to clinical closure rules.** A blocking NPO condition is not yet removed or reclassified; necessity must be assessed against case evidence.
- Verification limitation: GitHub connector can publish/read source but does not provide a checkout; the seven-file integrated suite, the new audit test and `npm run build:v5` have not been executed against a complete repository. No Android acceptance claimed.
- Next: run the two targeted tests `node --test src/v5/core/nurse-diagnosis-speech.test.js src/v5/clinical/closure-requirements-audit.test.js` and the pending integrated suite on a full checkout. Then enumerate actual case closure verdicts using the existing `closureReadiness/currentChecklist` path and feed them into the audit; review each NPO blocker clinically before changing any gate. Preserve clean module boundaries, one authoritative clinical engine, small reversible commits, no case-specific patch chains or duplicated checklists.

## Registro maestro de estado — sesión autónoma 2026-11-11

Estados: **implementada** = código publicado; **validación pendiente** = faltan pruebas integradas; **verificada** = pruebas relevantes ejecutadas; **aceptada** = comprobación en entorno real. No inferir verificación a partir de un commit.

| ID | Estado | Archivos / commits | Pruebas ejecutadas / pendientes | Dependencias, riesgos y próxima acción |
| --- | --- | --- | --- | --- |
| DX-01 | Validación pendiente | `ui/clinical-controller.js`; d4a6ebd, 991e152, a660c74, 446c3ec | Aisladas anteriores; faltan Node, navegador, Android | Recibos y UID; correr regresiones y cambio de paciente |
| LAB-02 | Validación pendiente | `clinical/study-order-vocabulary.js`, `clinical/study-orders.test.js`; 6450b1e, 6c1f188 | 14/14 aisladas anteriores; faltan integración y UI | Catálogo real; comprobar CROHN/COLON y órdenes sin duplicar |
| NUR-01 | Validación pendiente | `core/speech-router.js`, `core/nurse-diagnosis-speech.test.js`, `clinical/physical-nursing.test.js`; f4c3913, df21cae, 7ff71dc, 239b8e2 | Regresiones publicadas; falta ejecutar Node y chat/recibos | Motor de órdenes y datos clínicos; comprobar respuestas y no duplicación |
| CLOSE-01 | En desarrollo | `clinical/clinical-hint-requirements.js`, `clinical/closure-requirements-audit.test.js`; 691ed88, a631fe7, e801e1c, bf21b8c | Se añadieron dos regresiones de alternativas NPO; falta Node y auditoría exhaustiva de casos | Evaluadores clínicos reales; `unavoidable` indica estructura del requisito, **no** indispensabilidad médica. No se modificaron criterios de cierre |
| VEGA-01 | Validación pendiente | `clinical/clinical-hint-requirements.js`, `clinical/guard-session.js`; 691ed88, e801e1c | Falta contrastar cada bloqueo con pista ejecutable, XP 5% e idempotencia | Compartir requisitos autoritativos; no duplicar checklist |
| LAB-01 | Pendiente | `clinical/studies.js`, `clinical/study-evidence.js` | Falta reproducción por adquisición | Fuente única; TC, gasometría y hemograma |
| ANAM-01 | Pendiente | `clinical/patient-dialogue.js` y contexto | Falta caracterización dirigida | Preservar hechos/persona; conversación natural |
| LAT-01 | Pendiente | Transporte y presentación | Faltan trazas de latencia | Medir antes de optimizar |
| MP-01 | Pendiente | Lobby, presencia y réplica | Faltan dos cuentas | No alterar autoridad compartida |
| XP-COOP | Pendiente | Recompensas, ledger y UI | Faltan pruebas cooperativas | Coordinar con DX-REVEAL e idempotencia |
| DX-REVEAL | Pendiente | Pistas, debrief y XP | Faltan pruebas | Definir composición de penalizaciones 50% |
| FAM-01 | Pendiente | Diálogo, acompañantes, mundo | Faltan pruebas | No inventar conocimientos del familiar |
| REC-01 | Validación pendiente | Recuperación existente | Falta Android físico | No reconstruir |
| UI-01 | Pendiente | UI Android, marcador, música, navegación | Falta inspección visual/dispositivo | Evitar regresiones de accesibilidad |
| SAFE-01 | Validación pendiente | Seguridad farmacológica y recibos existentes | Falta suite transversal | Alergias, contraindicaciones, eventos adversos |
| ARCH-01 | En desarrollo continuo | Módulos afectados por cada cambio | Revisión incremental; sin refactor masivo | Un único motor clínico; módulos cohesivos |

**Regla transversal:** ningún requisito oculto, arbitrario o imposible debe bloquear el cierre; los indispensables deben ser identificables mediante Dr. Vega. Primero auditar casos y alternativas; cambiar una regla clínica únicamente con evidencia y pruebas específicas. Arquitectura limpia, cambios pequeños, sin parches por paciente ni checklist paralelo.

**Verificación pendiente de esta sesión:** `node --test src/v5/clinical/closure-requirements-audit.test.js src/v5/core/nurse-diagnosis-speech.test.js`, la suite de siete archivos del traspaso, `npm run build:v5`, navegador y Android. Los cambios de esta sesión se revisaron contra el código remoto, pero **no se ejecutó Node sobre el checkout completo**. GitHub Actions: explorar runner autorizado; no se lanzó workflow ni se afirmó CI verde.

**Próxima acción:** ejecutar el test de auditoría; después instrumentar un recorrido read-only de los casos y sus evaluaciones reales usando la ruta de `closureReadiness/currentChecklist`, clasificando NPO estructuralmente obligatorio frente a clínicamente indispensable, y comprobar qué bloqueo llega realmente a Dr. Vega.

## Checkpoint de ejecución — 2026-11-11, auditoría de sesión real

- HEAD inicial verificado: `7687539afad461a66857bafe304bec11dcade54a` (idéntico a rama antes de los cambios).
- CLOSE-01: `8db75eb` corrige el defecto de la auditoría que aceptaba un grupo de alternativas válido mientras ocultaba otros malformados; ahora exige que **cada** grupo sea válido. `55dccf4` actualiza la regresión y agrega una prueba específica.
- CLOSE-01/VEGA-01: `7af11d6` incorpora `session.auditClosureRequirements()`, una vista diagnóstica de solo lectura construida desde **el mismo** `currentChecklist()` que alimenta a Dr. Vega. Devuelve caso, destino, `ready`, mensajes bloqueantes y anomalías; no modifica elegibilidad, fisiología, recibos ni XP. `a152074` agrega regresión de sesión APP-001 e inmutabilidad.
- **Verificaciones:** lectura de los cuatro documentos obligatorios y del código remoto; revisión estructural de los cambios con el conector. Las nuevas pruebas están publicadas, **no ejecutadas**. Falta Node, build, navegador, Android y recorrido exhaustivo de casos.
- **Próxima acción:** ejecutar `node --test src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js`; si pasan, crear recorrido de casos mediante sesiones reales y recopilar `auditClosureRequirements()` por caso/destino. Inspeccionar el selector de Vega para demostrar que cada bloqueo indispensable tiene una pista ejecutable. No cambiar todavía criterios clínicos.

## Checkpoint — 2026-11-11, auditoría del catálogo completo

- HEAD inicial `a2839d12c8dc0e969197c3398cf970524a2c1b28` verificado idéntico a la rama. Se leyeron los cuatro documentos obligatorios.
- CLOSE-01/VEGA-01: `cc00601` agrega `src/v5/clinical/closure-catalog-audit.test.js`: prueba parametrizada que enumera `content.cases`, crea un mundo y una guardia real por ID, consulta `session.auditClosureRequirements()`, comprueba coincidencia con `session.read().closure` e inmutabilidad, y emite anomalías mediante diagnósticos de prueba. **No** evalúa necesidad clínica ni cambia cierre o pistas. Riesgo: algunos casos pueden requerir fixture específico; corregir el fixture según contratos reales, nunca saltar casos silenciosamente.
- Estado: **implementada, validación pendiente**. La prueba se publicó, **no se ejecutó**. Pendientes: `node --test src/v5/clinical/closure-catalog-audit.test.js src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js`, suite integrada, `npm run build:v5`, navegador y Android.
- Siguiente: ejecutar la prueba parametrizada y clasificar sus hallazgos por ID y destino; luego comparar cada bloqueo indispensable con una pista ejecutable. Evitar cambios clínicos sin evidencia.

## Checkpoint — 2026-11-11, revisión de auditoría y cobertura Vega

- HEAD inicial `6b5de7dc7dff3af8263c4d7f930deada3e913f81` confirmado idéntico; cuatro documentos obligatorios leídos. Checkout GitHub inaccesible por DNS desde el contenedor; `git ls-remote` falló al resolver github.com, por lo que **no** se ejecutaron Node, build ni Android.
- Inventario estático comprobado directamente sobre `src/v5/content/cases.json`: **25 casos, 25 IDs únicos**. No confundir este catálogo con todos los casos históricos del juego.
- `2088bb6`: se corrige una suposición errónea del test: `read().closure` puede evaluar el primer destino, mientras `currentChecklist()` selecciona el destino de Vega. La prueba ya no compara veredictos de destinos distintos; ahora registra `ready`, `missing`, anomalías y la acción o error de la pista en cada caso. **No demuestra cobertura de todos los bloqueos**: captura estado inicial.
- `d16759b`: se reutiliza `clinicalHintCoverage(content)`, cobertura estática existente del registro de acciones, para diagnosticar descriptores faltantes en los 25 casos. Se emite diagnóstico sin asumir que toda alternativa es médicamente indispensable.
- Próximo: ejecutar `node --test src/v5/clinical/closure-catalog-audit.test.js src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js` y `npm run build:v5` en runner completo. Inspeccionar fallos, comparar cobertura estática con cada bloqueo dinámico por destino y progresión. Sin cambios en motor clínico, criterios, XP o enfermería.

## Protocolo permanente de ejecución autónoma — aprobado 2026-11-11

**Objetivo: máximo desarrollo real por intervención, sin paradas artificiales.**
1. Al completar una corrección, continuar con la siguiente tarea ejecutable del registro maestro **sin solicitar autorización adicional**; reservar consultas para permisos, riesgo real de datos, decisiones de producto o bloqueo técnico irreversible.
2. Conservar commits pequeños y reversibles, pero **no** tratar cada commit como cierre de sesión. Agrupar varias correcciones y regresiones en una misma intervención.
3. No actualizar documentos después de cada commit. Actualizar este registro y `ATRIA-5-EXACT-CONTINUATION.md` **una sola vez al final** de cada intervención sustancial.
4. Ante falta de checkout o runner, buscar alternativas de validación y continuar mediante GitHub con tareas verificables. Distinguir inspección estática, publicación de tests, ejecución real y aceptación física.
5. Priorizar código, regresiones y validaciones sobre resúmenes. **No generar prompts de traspaso en cada respuesta** salvo solicitud explícita o cambio de conversación.
6. No usar Work ni ZIP. No crear motores/checklists paralelos ni alterar reglas clínicas sin evidencia. Verificar HEAD antes y después de escribir.
7. Este protocolo no autoriza trabajo en segundo plano tras finalizar la respuesta; aplica a cada ejecución activa.

### Avance clínico de esta intervención

- HEAD inicial `19f1388cb1beb2a2efffd6d292092e47f8b42145`, idéntico a rama.
- `df33ddd`: corrige un defecto comprobado por inspección en `auditClosureRequirements`: con alternativas NPO malformadas, el algoritmo filtraba los grupos inválidos y podía declarar `unavoidable:true` falsamente. Ahora solo declara inevitabilidad estructural si **todos** los grupos son válidos y contienen NPO.
- `66d05be`: ajusta la regresión previa y añade tres casos de grupos NPO malformados o alternativos. **Pruebas publicadas, no ejecutadas**; no se modificaron criterios de cierre ni selector de Vega.
- Pendiente: runner Node para pruebas dirigidas, suite integrada y build; luego auditoría dinámica de 25 casos y progresiones.

## Sesión de ejecución integral — auditoría por destino (2026-11-11)

- HEAD inicial remoto `10fb6f81ca88658720bd0e78f7906b130bb18773` confirmado idéntico. Se leyeron los cuatro documentos obligatorios y se revisaron los contratos reales de `guard-session.js`, `world.js`, el fixture `physical-nursing.test.js`, el selector de Vega y la proyección de requisitos.
- `2ec8313` / `6512009`: `session.auditClosureRequirements(destinationOverride)` admite ahora una consulta **diagnóstica y read-only** por destino autorizado. Reutiliza las reglas ya importadas en guard-session y `closureReadiness`; no cambia `currentChecklist`, pistas, elegibilidad, XP ni recibos. Destinos ajenos a la regla declarada son rechazados.
- `ef0df30`: el test parametrizado recorre todos los destinos declarados por cada caso y emite `destination-audit` con `caseId`, destino, `ready`, `missing` e `issues`. Verifica inmutabilidad y rechazo de destinos desconocidos. El fixture sigue el patrón existente de `physical-nursing.test.js`.
- **No hay ejecución de Node, build, navegador, Android ni CI confirmada.** No inferir que los bloqueos están resueltos; la auditoría mide el estado inicial y no la progresión completa. Próximo: ejecutar las pruebas, clasificar los hallazgos por destino y avanzar hacia cobertura dinámica de Vega y NUR-01.

## MP-01 — persistencia entre instancias (11-11-2026, ChatGPT)

HEAD inicial `e92c351eaa36d6e47a6613a5c29bfb5a1cf802e6` confirmado idéntico. Se inspeccionaron `cooperative-link.js:pollRoom`, `room-membership-store.js` y `src/v5/server/supabase-account-store.js:createPersistentSocialStorage`. La causa raíz identificada en código es que la lista `durableKey` solo persistía usuarios/contactos; `qa-v1:room:<uuid>` y `atria-v5:room-member:<uuid>:<qa_id>` quedaban en caché por instancia. Tras un `rooms/join` exitoso, `pollRoom` podía consultar otra instancia sin el registro de membresía y recibir 403, que el cliente trataba como expulsión.

- `23e92efa7d1fb40ea9b145e472c82e51ceeae92d`: persistencia de metadatos de sala y slots de aceptación en el adaptador privado Supabase existente, sin ampliar permisos públicos ni sustituir el servidor social.
- `e6d06dff6d755dae481f27546eda333137e1a2b9`: pruebas de lectura desde otra instancia, recuperación, aislamiento entre salas y salida frente a snapshot obsoleto.
- **Pruebas publicadas, NO ejecutadas en este entorno.** Falta ejecutar `node --test src/v5/server/supabase-social-room-persistence.test.js`, suites sociales, `npm run build:v5` y aceptación de dos cuentas contra despliegue. Revisar limpieza/TTL de registros persistentes antes de considerar MP-01 cerrado. Conservar los 20 grupos y 60 requisitos y DIALOG-AUTO-01, VEGA-AUTO-01, VEGA-COHERENCE-01. CHOLE-001, ILEO-001 y LAB-01 continúan pendientes.
