# ATRIA 5.0 — CONTINUIDAD EXACTA PARA CHATGPT

## Punto de partida

Continúa el repositorio `javierdario48-star/ATRIA` en la única rama autorizada, `atria-5.0-core-rebuild-experimental`. Consulta el HEAD remoto con GitHub antes de editar. El HEAD de código verificado es `4e9212d98bcb127cd684c4651a68c1b1c6fc18e6` y el commit siguiente contiene esta entrega y el inventario. Si la rama avanzó, compara los commits nuevos y conserva sus cambios. El SHA remoto completo de la entrega acompaña al prompt en el mensaje de entrega.

Lee el [inventario maestro vigente](ATRIA-5-REMAINING-TASKS.md), `ATRIA-5-CHATGPT-HANDOFF.md`, `ATRIA-5-GUARD-RECOVERY.md`, `AGENTS.md` y `ATRIA-5-CASE-INTEGRATION-CONTRACT.md`. El inventario conserva la correspondencia de los 60 números y las solicitudes recuperadas de mensajes previos. La fuente literal completa por número sigue pendiente de recuperación. Usa el registro maestro actual para los estados. Los checkpoints históricos acreditan su SHA.

## Correcciones publicadas y archivos

HEAD inicial `0edbb8b6faae16eb31bd295c766a8a0eeccfa45b`. Se verificó la ascendencia de los 26 commits desde `7ff71dc0a95e17c8b8b9eaf39eaed11d95e29c9f`.

| Commit de GitHub | Resultado | Archivos |
| --- | --- | --- |
| `69a27ec8abc30a7a3ff7046a75414f3e1b5dc9ed` | DIALOG-AUTO-01. Un envío entrega la respuesta. El chat atribuye la anamnesis indirecta al acompañante y muestra la ausencia de habla como observación clínica. Hay compatibilidad con recibos guardados. | `src/v5/clinical/patient-dialogue.js`, `patient-dialogue.test.js`, `guard-session.js`, `qa/v5/patient-dialogue-browser.mjs` |
| `58099a74711dd95ad22ad8d0a962b5d5a66dd0e2` | CLOSE-01. PANC-001 cierra con soporte confirmado y recepción UTI aunque falte la orden de ayuno. La auditoría usa el catálogo activo completo. | En `src/v5/clinical/`: `panc-care.js`, `gastro-closure-v5.js`, `gastro-expansion-policies.js`, `clinical-hint-requirements.js`, `guard-session.js`, `partial-closure.js`, `surgical-consultation.js`, `accepted-transfer.test.js`, `closure-catalog-audit.test.js` |
| `8cacfdd8d265569eea627cb5ddd0ede40e759424` | VEGA-AUTO-01 y VEGA-COHERENCE-01. La oferta caducada se renueva una vez con la misma pulsación y el mismo paciente. Se probó la secuencia pendiente → resultado → pista nueva para HEPAT-001 y CARD-08. | `src/v5/ui/clinical-hint-presenter.js`, `src/v5/clinical/clinical-hints.test.js` |
| `e6f9781b655caf0eca43033886294022cbce8e2a` | DX-01. La ficha podía quedarse con la impresión vieja y el campo deshabilitado tras recibir el borrado. La confirmación ahora limpia y desbloquea el campo original, con identidad de sesión y paciente. | `src/v5/ui/clinical-controller.js`, `src/v5/ui/diagnostic-impression.test.js` |
| `4e9212d98bcb127cd684c4651a68c1b1c6fc18e6` | NUR-01. «Enfermera, dejalo en ayuno» fallaba con `unknown-clause`. Usa la intervención y el recibo que ya aceptaban «en ayunas». | `src/v5/core/speech-router.js`, `src/v5/core/nurse-diagnosis-speech.test.js`, `src/v5/clinical/physical-nursing.test.js` |

## Evidencia ejecutada el 11 de noviembre de 2026

| Verificación | Resultado |
| --- | --- |
| Checkout inicial | 157/157 pruebas dirigidas, 2.977/2.977 de la suite V5 y build aprobado. |
| Árbol de código publicado | 276/276 dirigidas y 3.012/3.012 de `npm run test:v5`. |
| Build y arquitectura | `npm run build:v5` aprobó y produjo 216 archivos. `npm run build:v5-core` aprobó con 27 módulos. `node scripts/audit-v5-boundary.mjs` aprobó con 189 módulos de producción. El test de cierre y XP histórico de 4.8.7 también aprobó. |
| Cierre y pistas | 55 casos iniciales, 91 destinos declarados y tres peritonitis con destino dinámico. `qa/v5/clinical-hint-bots.mjs` cerró 55/55 en el recorrido del bot. Cuatro destinos de CHOLE-001/ILEO-001 requieren revisión de NPO. |
| Navegador local sobre `e6f9781` | Diálogo, Vega y diagnóstico aprobaron. Chromium de escritorio y Pixel 5 emulado según el escenario. La prueba compartida aprobó 11 comprobaciones con dos cuentas y procesos independientes. Recuperación aprobó siete comprobaciones en Solitario, Cooperativo y Competitivo, con dos cuentas y tres procesos. Autoridad local SQLite/CAS y reloj acelerado para el límite de turno. |
| Preview sobre `e6f9781` | El manifiesto coincidió con 42 fuentes verificadas y con los 10 archivos productivos modificados hasta ese SHA. Solitario y Aprendiz aprobaron respuesta del paciente, pista, audio y crédito de XP. Vega se mostró en 1.352 ms y 1.861 ms, respectivamente, con `prepare` y `displayed`. Se recuperó la guardia de Solitario con el mismo paciente. |
| Cooperativo en preview | Dos reproducciones con cuentas QA separadas. Se confirmó la entrada del anfitrión. El invitado quedó en lobby y agotó 30 s en «Esperando la autoridad clínica del anfitrión». La traza del segundo intento vio `rooms/join` con ambos integrantes, luego un 403 al invitado en `rooms/:id/messages`. El cliente descartó la sala y el invitado quedó sin proyección clínica. Competitivo en preview quedó pendiente. |
| GitHub Actions | Consultar el estado por SHA. Las corridas de `e6f9781` seguían en cola al registrarlas. [Vega](https://github.com/javierdario48-star/ATRIA/actions/runs/43102974026) · [V5](https://github.com/javierdario48-star/ATRIA/actions/runs/43102974038) · [Preview](https://github.com/javierdario48-star/ATRIA/actions/runs/43102974019) |

Para reproducir en un checkout:

```sh
npm ci
node --test src/v5/clinical/{closure-catalog-audit,closure-requirements-audit,physical-nursing,study-orders,accepted-transfer,patient-dialogue,clinical-hints,clinical-hint-ledger,clinical-policy-closure}.test.js src/v5/core/{nurse-diagnosis-speech,nursing-formulation-routing,room-authority}.test.js src/v5/ui/{diagnostic-impression,guard-chat-view,clinical-autocomplete,clinical-hint-presenter}.test.js src/v5/server/{clinical-hints-durable,durable-guard-authority}.test.js qa/tests/v5-nurse-study-autocomplete.test.mjs
npm run test:v5
npm run build:v5
node qa/v5/clinical-hint-bots.mjs
```

La CI usa Node 22 y Playwright con Chrome. Las pruebas locales usaron Node 24.22.1 y Chromium 153 en procesos independientes con el ejecutable de prueba en scratch. El repositorio conserva sus dependencias declaradas. Las verificaciones de navegador son `qa/v5/patient-dialogue-browser.mjs`, `clinical-hints-browser.mjs`, `diagnosis-browser.mjs`, `shared-guard-auth-browser.mjs` y `guard-recovery-browser.mjs`. La aceptación con el Android físico y las cuentas del usuario sigue pendiente.

## Trabajo para continuar en ChatGPT

1. **CLOSE-01 y VEGA-COHERENCE-01.** En CHOLE-001 e ILEO-001 ya se observó que la orden de ayuno quita el bloqueo terapéutico tras ejecutar el resto de la preparación. Evalúa su necesidad por destino y gravedad. Usa `guard-session.js:closureReadiness/currentChecklist/auditClosureRequirements`, `clinical-hint-requirements.js` y `clinical-hints.js`. Antes de cambiar un criterio, identifica la indicación clínica y la evidencia que bloquea. Añade la secuencia pista → ejecución → recibo → pista nueva en alternativas y en controles que sí deban repetirse por evolución. Estudia la separación entre impresión diagnóstica, gravedad, preparación y aceptación de UTI en `consultation-evidence.js` y `surgical-consultation.js`. Revisa seguimiento y signos de alarma como posible mejora de calidad de alta.
2. **LAB-01.** Inspecciona `studies.js`, `study-evidence.js`, `patient-observations.js` y `src/clinical/study-registry.js`. Reproduce TC por técnica/contraste, gasometría antes y después de soporte, y hemograma/PCR por muestra. Adjunta UID, ID canónico, evento, minuto, soporte confirmado y resultado. Usa `studies.test.js`, `studies-policy.test.js`, `study-orders.test.js` y `study-collections.test.js`.
3. **NUR-01, ANAM-01 y FAM-01.** Reutiliza `core/speech-router.js`, `engine/nurse-dispatcher.js`, `clinical/patient-dialogue.js` y `patient-question-context.js`. Continúa con la pregunta contextual sobre alimentación, precisión de intención y el acompañante interactivo donde el caso declare fuente. Mantén una sola ejecución, respuesta y fuente por evento. Prueba la recuperación del contexto por médico.
4. **MP-01.** Reproduce el 403 posterior a un `rooms/join` aceptado. Contrasta `src/v5/social/cooperative-link.js:pollRoom` con `room-membership-store.js` y `src/v5/server/supabase-account-store.js:createPersistentSocialStorage`. Las claves de sala y pertenencia pasan por la caché en el adaptador actual. Comprueba si la escritura y la lectura ven la misma pertenencia y registra el cuerpo del 403 y el rol de la petición sin credenciales. Conserva la revocación válida y el control de acceso. Añade regresión de invitación, rechazo auténtico y recuperación antes de volver a probar en preview.
5. **XP-COOP y DX-REVEAL.** Usa los recibos y el ledger existentes para diseñar crédito/débito compartido y revelación única del diagnóstico con −50%. La revelación permite continuar y se registra aparte de la impresión del médico. Mantén XP competitiva individual. Consulta el inventario para archivos, riesgos y criterios.
6. **Validación externa.** Comprueba el mismo SHA en preview antes de medir. Usa los bots existentes con dos cuentas independientes para entrada, guardia, chat, cambio de paciente, recuperación y XP. Mide por separado cola/CAS, render, atención de Enfermería y tiempos de estudios. La prueba física en Android sigue pendiente. Prioriza código y pruebas que puedan resolverse con GitHub y reserva navegador/dispositivo para los recorridos que lo requieren.

## Reglas de aceptación

- **DIALOG-AUTO-01.** Una pregunta enviada produce la respuesta contextual automáticamente. Los antecedentes, la personalidad y la fuente se mantienen tras reconectar. Un paciente sin respuesta verbal recibe una observación o un relato indirecto atribuido al informante declarado.
- **VEGA-AUTO-01.** Un toque obtiene y muestra una oferta verificada para ese encuentro. La confirmación posterior al pintado conserva idempotencia, 5% para una pista nueva y repetición gratuita. El cambio de paciente descarta la oferta.
- **VEGA-COHERENCE-01.** Cada pista consulta el estado confirmado de la autoridad. Distingue solicitud pendiente, ejecución, resultado y control temporalmente justificado. Excluye acciones ya cumplidas y señala el requisito clínico pendiente.
- **CLOSE-01.** El cierre admite alternativas válidas y excluye frases exactas, trámites ocultos y medidas prescindibles como condiciones bloqueantes. Todo requisito indispensable debe tener fundamento clínico y una pista ejecutable.
- Reutiliza una sola autoridad clínica, un evaluador por ruta, el servicio de estudios, la deduplicación por recibo y los ejecutores existentes. Mantén la selección directa y la recuperación. Trabaja en la rama indicada y publica correcciones pequeñas tras reproducir y validar.

## Checkpoints anteriores

### Auditoría inicial en ChatGPT

HEAD inicial remoto confirmado: `7ff71dc0a95e17c8b8b9eaf39eaed11d95e29c9f` (`identical`, 0 commits de diferencia). Commits publicados:
- `e801e1c37bdba1d1efdb7e46f53b1d89cb01069c`: `clinical-hint-requirements.js`; clasifica si NPO aparece en todas las alternativas válidas de un requisito terapéutico.
- `bf21b8cd0b4a13470e27c158fbc590022f6a964b`: `closure-requirements-audit.test.js`; dos escenarios adicionales de NPO inevitable/evitable y alternativas malformadas.
- `81deb6241410c6733652fbc957a8455a8236a245`: `ATRIA-5-REMAINING-TASKS.md`; registro maestro de estados y regla de arquitectura.
- Este archivo se publica como commit adicional. **Verificar HEAD remoto de rama con GitHub compare antes de modificar nada**: el SHA del propio commit documental no puede incorporarse en su contenido sin crear otro commit.

## Funciones y diseño
`auditClosureRequirements(assessment, requirements)` es una función **solo lectura** del módulo `src/v5/clinical/clinical-hint-requirements.js`. Examina el veredicto del evaluador y los mismos requisitos que consumen las pistas; no altera `ready`, los recibos ni XP. Su indicador `unavoidable` significa que todas las alternativas *declaradas* contienen NPO, **no** que NPO sea clínicamente indispensable. La nueva prueba comprueba ambas situaciones y que entradas malformadas no provoquen excepción.

## Verificaciones y limitaciones
Se verificó mediante conector autenticado el HEAD inicial y se inspeccionaron el código real de la auditoría, sus pruebas y el test de Enfermería. Se publicaron cambios con SHA de blob vigente. **No se ejecutaron** las pruebas Node integradas, el test de auditoría, el build V5, Playwright, GitHub Actions ni Android físico; no atribuirles resultados. El contenedor anterior carecía de checkout por DNS de GitHub; el conector permite continuar editando. Comandos prioritarios:
```sh
node --test src/v5/clinical/closure-requirements-audit.test.js src/v5/core/nurse-diagnosis-speech.test.js
node --test src/v5/ui/diagnostic-impression.test.js src/v5/core/nurse-diagnosis-speech.test.js src/v5/core/nursing-formulation-routing.test.js src/v5/clinical/physical-nursing.test.js src/v5/clinical/study-orders.test.js src/v5/ui/clinical-autocomplete.test.js qa/tests/v5-nurse-study-autocomplete.test.mjs
npm run build:v5
```

## Estado clínico y de sistemas
- **CLOSE-01**: auditoría inicial publicada y ampliada, pero **no** se han auditado todos los casos ni eliminado bloqueos ocultos. Revisar NPO, estudios, tratamientos y derivaciones caso por caso, con evidencia de indispensabilidad y pistas ejecutables.
- **VEGA-01**: motor de pistas, penalización 5%, repetición gratuita y optimización existentes conservados. No se cambió su selección; falta verificar cobertura real de bloqueos.
- **NUR-01**: preguntas naturales de alergias, seguimiento y NPO publicadas previamente. Se conserva `nurse.inquire` y el motor de recibos. Falta ejecución integrada, chat real, idempotencia y proactividad.
- **DX-01/LAB-02**: código y regresiones publicadas anteriormente, validación integrada pendiente.
- **LAB-01/ANAM-01/LAT-01/MP-01/XP-COOP/DX-REVEAL/FAM-01/UI-01**: desarrollo o diagnóstico dirigido pendiente; no inventar estado de aceptación.
- **REC-01**: recuperación existente; falta aceptación Android físico.
- **Arquitectura**: no se crearon motores paralelos, no se cambió fisiología, criterios de cierre, XP, red ni resultados. Riesgo pendiente: auditoría no conectada todavía al recorrido real de casos; no tratar `unavoidable` como prueba médica.

## Próxima ejecución inmediata
1. Confirmar HEAD remoto y leer `docs/ATRIA-5-REMAINING-TASKS.md`, este documento y `src/v5/clinical/closure-requirements-audit.test.js`.
2. Ejecutar pruebas completas cuando haya runner; investigar GitHub Actions sin suponer que está habilitado. Si no hay checkout, seguir mediante conector con cambios seguros.
3. Inspeccionar `guard-session.js` (`closureReadiness/currentChecklist`), evaluadores clínicos, `clinical-hint-requirements.js` y selector Dr. Vega. Añadir auditoría **read-only** de casos reales, sin modificar elegibilidad ni introducir otra autoridad.
4. Registrar para cada bloqueo el requisito, alternativas válidas, posibilidad de ejecución y pista que lo revela. No cambiar NPO ni diagnósticos hasta disponer de regresiones clínicas.
5. Mantener commits pequeños, documentar pruebas realmente ejecutadas, actualizar registro maestro y generar automáticamente el siguiente documento de continuidad.

## Listado maestro
Fuente autoritativa: [ATRIA-5-REMAINING-TASKS.md](ATRIA-5-REMAINING-TASKS.md), sección **Registro maestro de estado**. Incluye DX-01, LAB-02, NUR-01, CLOSE-01, VEGA-01, LAB-01, ANAM-01, LAT-01, MP-01, XP-COOP, DX-REVEAL, FAM-01, REC-01, UI-01, SAFE-01 y ARCH-01, con estados, archivos, pruebas y próximos pasos.

**Instrucción permanente:** al finalizar cada sesión, actualizar el registro maestro, comprobar HEAD y publicar/entregar una nueva continuidad exacta. No usar Work, ZIP, refactorizaciones masivas ni supuestas pruebas verdes.

## Continuación de sesión posterior — 2026-11-11

**HEAD inicial:** `7687539afad461a66857bafe304bec11dcade54a`, confirmado idéntico a rama mediante GitHub. Este documento es acumulativo; verificar HEAD remoto actual, ya que su propio commit lo hará avanzar.

**Commits publicados en esta sesión:**
- `8db75eb5dfe2031c4173435c7ddbedf28535375b`: `src/v5/clinical/clinical-hint-requirements.js`; exige que todos los grupos alternativos estén bien formados para no ocultar un bloqueo.
- `55dccf4d9934c98f8064d1a84352bc430945a151`: `src/v5/clinical/closure-requirements-audit.test.js`; regresión del defecto y actualización de expectativas.
- `7af11d62d850b43b5f0b30d146e873228168542c`: `src/v5/clinical/guard-session.js`; método público de auditoría de solo lectura basado en `currentChecklist()`, que comparte el veredicto y requisitos usados por Vega.
- `a152074251698985856d4bbfb9fbb46f37cf5818`: `src/v5/clinical/physical-nursing.test.js`; caso real APP-001 comprueba que auditoría no muta sesión ni XP.
- `760489fa3733c57f305595627fae3e9d7dda314b`: `docs/ATRIA-5-REMAINING-TASKS.md`; checkpoint maestro actualizado.
- El commit de esta actualización documental se debe obtener verificando HEAD remoto.

**Verificaciones exactas:** lectura mediante GitHub de los cuatro documentos obligatorios, `guard-session.js`, `clinical-hint-ledger.js`, `clinical-hint-requirements.js`, pruebas de auditoría y `physical-nursing.test.js`. Cambios publicados con SHA de blob actual. **No** se ejecutaron tests Node, build, navegador ni Android; no confundir publicación de pruebas con aprobación.

**Estado:** CLOSE-01 tiene ahora una ruta de inspección de sesión real, pero falta ejecutar las pruebas y recorrer todos los casos. Dr. Vega sigue intacto, usa `currentChecklist()` compartido; falta demostrar cobertura de cada bloqueo. Enfermería NUR-01 permanece publicada y pendiente de validación integrada. No se modificaron reglas de cierre, fisiología, tratamiento, recibos ni XP.

**Próximo paso exacto:** ejecutar `node --test src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js` en checkout completo. Después diseñar un test parametrizado que recorra el catálogo real, cree una sesión por caso, consulte `auditClosureRequirements()` y registre requisitos sin acciones y NPO obligatorio estructural; contrastar resultados con pistas de Vega. Evitar cambiar reglas clínicas sin regresiones específicas.

**Listado maestro autoritativo:** [ATRIA-5-REMAINING-TASKS.md](ATRIA-5-REMAINING-TASKS.md), incluyendo las 16 áreas y el checkpoint más reciente. Al terminar la siguiente sesión, volver a actualizar ambos documentos y confirmar HEAD.

## Continuidad exacta — sesión de auditoría de catálogo (2026-11-11)

Repositorio `javierdario48-star/ATRIA`; rama exclusiva `atria-5.0-core-rebuild-experimental`. HEAD inicial `a2839d12c8dc0e969197c3398cf970524a2c1b28`, verificado idéntico antes de editar. **El HEAD final es el commit que publica este documento; verificar con compare de GitHub.**

Commits:
- `cc00601c19b23079f2e59682a8e3862f0e7bbd30`: nuevo `src/v5/clinical/closure-catalog-audit.test.js`; recorre `content.cases`, crea sesiones reales y lee auditorías sin mutar estado.
- `8cb3a07a7078f96f86ee012c4be879067a496840`: checkpoint en `docs/ATRIA-5-REMAINING-TASKS.md`.
- Commit de este documento: obtener mediante HEAD remoto.

**Verificación:** se inspeccionaron cuatro documentos, contrato de `createGuardSession`, `createWorld` usado en `physical-nursing.test.js`, selector de pistas y catálogo de casos. Se publicaron archivos mediante GitHub. **No se ejecutaron** las pruebas Node, build, navegador, Android ni un recorrido de casos; no existen resultados clínicos agregados todavía. La nueva prueba es un mecanismo de auditoría, no evidencia de ausencia de bloqueos.

**Estado:** CLOSE-01 tiene una prueba parametrizada publicada, pero sin ejecución ni revisión clínica de anomalías. VEGA-01 sigue sin verificación de cobertura de bloqueos; pistas, descuento 5% y recibos no fueron alterados. NUR-01, DX-01 y LAB-02 siguen pendientes de suite integrada. Arquitectura: se reutiliza la autoridad clínica y `auditClosureRequirements()`, sin motor paralelo. Deuda: obtener runner, ejecutar prueba por caso, revisar posibles diferencias de fixture, verificar alternativas ejecutables y pistas.

**Próxima tarea concreta:** ejecutar `node --test src/v5/clinical/closure-catalog-audit.test.js src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js`, luego `npm run build:v5`. Registrar cada `caseId`, `destination`, `issues` y el requisito real que causa el bloqueo. Contrastar NPO y estudios con acciones disponibles y Dr. Vega antes de modificar cualquier regla. Continuar con listado maestro en [ATRIA-5-REMAINING-TASKS.md](ATRIA-5-REMAINING-TASKS.md); actualizar ambos documentos y verificar HEAD al final de la siguiente sesión.

## Continuidad exacta — revisión de auditoría y Vega (2026-11-11)

**Rama exclusiva:** `atria-5.0-core-rebuild-experimental`. **HEAD inicial verificado idéntico:** `6b5de7dc7dff3af8263c4d7f930deada3e913f81`. Verificar el HEAD remoto de esta actualización documental antes de continuar.

**Commits de esta ejecución:**
- `2088bb6c28ee3c91651c48153b4f17d0e0cc98ca`: corrige en `src/v5/clinical/closure-catalog-audit.test.js` la comparación inválida entre `read().closure` y el destino potencialmente distinto de `currentChecklist()`. Añade diagnóstico de la pista inicial de Vega y del bloqueo inicial por caso.
- `d16759b10398d72fddd75301182438bca78009c5`: usa la función preexistente `clinicalHintCoverage(content)` para informar la cobertura estática de descriptores de acciones de Vega, sin crear un motor nuevo.
- `15cf66669605772e2c95ad0e8741efb407c07872`: checkpoint maestro.
- El commit de este documento se obtiene mediante verificación del HEAD remoto.

**Hallazgos verificados:** lectura autenticada de cuatro documentos y código; `src/v5/content/cases.json` contiene 25 casos con 25 IDs únicos. `clinicalHintCoverage` ya existía en `clinical-hints.js`; se reutilizó. El contenedor no resuelve github.com (`git ls-remote` falló), y no hay checkout. **No se ejecutaron** pruebas Node, build, navegador, Android ni auditoría dinámica; la nueva prueba publicada debe validarse en runner real. No se modificaron criterios clínicos, pistas, XP ni recibos.

**Limitación clínica:** una pista en el estado inicial y un inventario de acciones no prueban cobertura de todos los bloqueos a lo largo del caso ni indispensabilidad de NPO. Se necesita recorrer progresiones y destinos con resultados reales, identificar anomalías por caso y evaluar evidencia antes de cambiar reglas.

**Próxima tarea:** ejecutar `node --test src/v5/clinical/closure-catalog-audit.test.js src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js` y `npm run build:v5`. Resolver cualquier fallo de fixture. Analizar los diagnósticos `vega-action-coverage`, bloqueos iniciales, alternativas NPO y cobertura por destino; después extender pruebas a transiciones reales y continuar NUR-01. Actualizar [ATRIA-5-REMAINING-TASKS.md](ATRIA-5-REMAINING-TASKS.md) y este documento en cada sesión.

## Continuidad exacta — protocolo autónomo y corrección NPO (2026-11-11)

**HEAD inicial:** `19f1388cb1beb2a2efffd6d292092e47f8b42145`, comparado con la rama: idéntico. Cuatro documentos obligatorios recuperados directamente de GitHub.

**Protocolo permanente aprobado:** ejecutar varias tareas seguidas por intervención, commits pequeños, no detenerse tras cada commit, resolver obstáculos sin abandonar otras tareas, actualizar documentos solo al final y evitar prompts repetitivos. No implica trabajo en segundo plano después de terminar la respuesta. Fuente autoritativa: `docs/ATRIA-5-REMAINING-TASKS.md`, sección «Protocolo permanente de ejecución autónoma».

**Cambios publicados:**
- `df33ddd7040c518405358012ee1ceb2c94167fd0`: `clinical-hint-requirements.js`; corrige falso `unavoidable:true` cuando alternativas NPO están malformadas. Solo clasificación diagnóstica; cierre clínico y Vega no cambian.
- `66d05be047cbf8edff9bb1ca7f88e6501ceefc9e`: `closure-requirements-audit.test.js`; ajusta expectativa y añade regresión con grupos vacíos, nulos y alternativa válida.
- `d31a60634b785bb200bc8d041d15b1d62454bbdd`: listado maestro y protocolo.
- Este documento: obtener commit SHA verificando HEAD remoto.

**Validación:** lectura/inspección autenticada de código y docs, publicación de cambios. **No se ejecutaron pruebas Node, build, navegador ni Android**; no declarar resultados verdes. Pendientes `node --test src/v5/clinical/closure-catalog-audit.test.js src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js`, suite integrada y `npm run build:v5`. No se auditaron dinámicamente las progresiones clínicas ni la necesidad médica de NPO.

**Continuar directamente:** primero validar fixture y ejecutar pruebas en runner real cuando sea accesible; mientras tanto, inspeccionar y corregir defectos concretos de auditoría/acciones de Vega con regresiones, luego avanzar a NUR-01/LAB-01 sin paradas artificiales. Mantener una sola autoridad clínica. Al finalizar una intervención sustancial, actualizar ambos documentos una vez y verificar HEAD.

## Continuidad exacta — auditoría de todos los destinos declarados (2026-11-11)

HEAD inicial verificado idéntico: `10fb6f81ca88658720bd0e78f7906b130bb18773`; cuatro documentos obligatorios leídos. Commits de código: `2ec83135923befd722be7f472105c6ddbc956155`, `6512009e5a6d7dedb63242174ae74604ff7055ed`, `ef0df30233912f389be910e22efc123550797b76`. Checkpoint maestro: `eca3fa637491a4fcf2cd6996504bbbf03a95e30a`.

`guard-session.js` expone `auditClosureRequirements(destinationOverride)` con destinos permitidos por las mismas reglas que gobiernan `eligibleDestinations`, mediante `closureReadiness` y `clinicalHintRequirements`. No muta clínica, estado de cierre, pistas ni recompensas. `closure-catalog-audit.test.js` enumera todos los destinos declarados por caso, imprime diagnóstico de bloqueo y valida inmutabilidad. La pista de Vega continúa consultándose para el destino elegido por el selector actual; **no** se ha demostrado una pista por cada bloqueo/destino ni progresión clínica completa.

**Validación pendiente:** las pruebas se publicaron pero no se ejecutaron. Ejecutar `node --test src/v5/clinical/closure-catalog-audit.test.js src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js`, suite integrada y `npm run build:v5`. Investigar runner disponible; luego analizar diagnósticos y extender pruebas de progresión, alternativas y seguridad. Android y dos cuentas siguen pendientes. Mantener el protocolo autónomo de múltiples tareas y actualización documental únicamente al cierre.
