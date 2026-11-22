# ATRIA 5.0 — Pendientes reales y puertas de aprobación al 21/11/2026

## Estado operativo vigente tras la continuación

**Último código: `629a33ba2a529ade4c30c5501c25a6d23ead40e8`. NO GO.** Informe simple, commits, pruebas y siguiente acción: [CIERRE RESP-01 V2](ATRIA-5-CIERRE-RESP-01-V2-2026-11-21.md). La línea base y los checkpoints inferiores se conservan como historial; no sustituyen esta tabla.

| ID conservado | Estado actual y evidencia | Pendiente real |
| --- | --- | --- |
| P0-01 | **IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN** en runtime/carrera local. Pistas y sanciones comparten cohorte activa; dos autores no se fusionan. 38 pruebas iniciales, 14 dirigidas finales y 9 SQL local. | Certificar liquidación alojada, deuda entre sesiones y cuentas 2/3/4. |
| P0-02 | **PARCIALMENTE IMPLEMENTADO.** V2 `44973929079` 5/5 verde en `78f260f`; regresión local 3210/3210. CI general `44974712154` del código final aún debe concluir. | No confundir verde de contenido con aprobación general del SHA final. |
| P0-03 | **IMPLEMENTADO CON DEFECTOS / recepción ciega NO IMPLEMENTADA.** Dos contraejemplos explícitos rojos con hechos comunicados idénticos. | Separar veredicto público de verdad oculta; preservar preparación, rescate, urgencia y única autoridad. |
| P0-04 | **PARCIALMENTE IMPLEMENTADO.** Migración nueva y 9/9 pruebas PostgreSQL local, también verdes en Actions `44973929154`. | Acceso a staging, Auth/PostgREST, concurrencia real y adaptador REST versionado de deuda. |
| P0-05 | **Regresiones V2 APROBADAS en el alcance probado.** Medicación equivocada, formulación/dosis, alergias, daño y rescate conservan autoridad nativa; contrato V2 verde. | Aceptación externa y ampliación declarativa futura; no afirmar cobertura universal de fármacos no probados. |
| P0-06 | **COMPLETADO Y VERIFICADO — certificación de contenido V2.** 40/40, cuatro modos, 15 pares V1/V2 sin errores, 5/5 jobs en `78f260f`. La ejecución original `44968933396` también queda aprobada. | No volver a listar esos 40 como no ejecutados. Aceptación de interfaz/cuentas se lleva en P0-01/P0-04/P0-08. |
| P0-07 | **IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN externa.** Reprimenda/−15, paciente intacto, reintento/recuperación; defecto de cierre con Enfermería corregido. 102 pruebas relacionadas y 49 dirigidas aprobadas (superpuestas). | Staging y Android; CI del escenario CIRR bruto/neto corregido. |
| P0-08 | **BLOQUEADO externamente.** Build modular 220 archivos y frontera estructural aprobados; Vercel rechaza deployments, no existe Preview exacta; Android físico sin acceso. | Recuperar plataforma y aceptar backend/Preview/guardia completa en dispositivos. |
| P1-01 | **Traslados certificados: 550/550** (10 perfiles ×55 casos), run `44973637288`. Matriz longitudinal nativa separada `44973637290` en ejecución al preparar el informe. | Consultar su finalización/checkpoint antes de repetirla; separar integridad de certificado clínico estricto. |
| P1-02 | **Recorridos de Vega: 55/55** en `44973637286`; NEUR-03 reparado. | Latencia/aceptación de usuario con red y teléfono físicos. |

No se ha dado por terminada ninguna validación alojada a partir de una prueba en memoria/PostgreSQL local, ni se exige migrar las otras 54 enfermedades a V2 para certificar RESP-01.

## Línea base histórica preservada — anterior a esta continuación

**Estado:** NO GO para activar RESP-01 V2 y NO GO para afirmar que V2 es portable a Production. **Rama:** `atria-5.0-core-rebuild-experimental`. **Contrato normativo:** [Reglamento maestro v1.0.2](ATRIA-5-REGLAMENTO-MAESTRO-2026-11-21-v1.0.2.md) y JSON [v1.0.2](ATRIA-V5-RULES-v1.0.2.json). Este archivo distingue **hecho comprobado**, **desajuste de arquitectura**, **prueba no completada**, **incidencia históricamente reportada** y **trabajo pendiente**.

## Evidencia objetiva recuperada

- **Último HEAD de código antes de publicar la documentación:** `cfc13978d0b8ac71f7377b8a194560d47354d572` (rama experimental). Los commits documentales posteriores **no han pasado por CI** y no cambian la fisiología.
- **GitHub Actions del HEAD de código:** [V2 `44963189193`](https://github.com/javierdario48-star/ATRIA/actions/runs/44963189193) tiene cinco trabajos `staging-contract`, `paired-native-bot`, `four-mode-native-bots`, `versioned-mode-rules`, `vercel-build-preflight`. En la última consulta todos constaban **queued**, no hay resultado aprobatorio. [Transferencias `44963104159`](https://github.com/javierdario48-star/ATRIA/actions/runs/44963104159) también estaba **queued** en commit anterior `6e6787c...`. [Integral `44963189255`](https://github.com/javierdario48-star/ATRIA/actions/runs/44963189255) constaba **queued**.
- **Última evidencia negativa comprobable:** en [V2 anterior `44959260723`](https://github.com/javierdario48-star/ATRIA/actions/runs/44959260723), `staging-contract`: **29/34** pruebas pasaron y **5 fallaron**; cuatro por no confirmar observación insegura y una por campo de evaluación mal esperado en walkthrough Vega. Se corrigieron el validador de recibos y la aserción, pero **aún falta verificar verde del HEAD**.
- **Regresión transversal anterior:** en [transferencias `44958851274`](https://github.com/javierdario48-star/ATRIA/actions/runs/44958851274) el perfil competente dio **52/55**, tres fallaron por verificación XP/cierre, y múltiples perfiles adversos y regresiones dieron fallo. Se corrigió la fórmula del verificador y parte de las pruebas antiguas; no hay certificación posterior confirmada.
- **Integral anterior:** [`44957986732`](https://github.com/javierdario48-star/ATRIA/actions/runs/44957986732) contenía **71 fallos/3195 tests** en `clean-core-contract`, fallos `durable-guard-recovery`, varios `specialty-runtime-certification`, `independent-game-browser` y un perfil DIARR-001 competitivo. Estos resultados son históricos (SHA distinto), sirven para orientar regresiones, NO se consideran fallos confirmados del último HEAD sin volver a probar.
- **Motor existente:** `native-additional-cases.js` usa el escritor de vitales y llama a `clinicalPolicyTargets`, `applyConfirmedIVTargetOffsets`, morfina y soporte nativos. **Reusar**, nunca reemplazar.
- **Brecha Coop documentada:** `clinical-hint-ledger.js` guarda `history`/`count` por `actorId`; `guard-runtime.js` distribuye `claims` por jugador en Coop. El contrato JSON anterior también decía «pistas independientes». Esto **contradice** la instrucción expresa posterior del creador de compartir TODA XP (pistas incluidas). Es una brecha funcional, no una preferencia estética.
- **Recepción ciega:** `public-receiver-policy.js` es puro y no acepta el caso real; `surgical-consultation.js` todavía usa el objeto `caseData` verdadero y sus `consult`/`id` en su propia lógica. La integración que evita el atajo al diagnóstico real debe certificarse.
- **Supabase:** la migración de recompensas de alta insegura versionada no demuestra compatibilidad con `clinical.unsafe-observation` y deuda futura; el código local registra ambas. No afirmar persistencia online de sanción nueva.
- **Plan Vercel:** la salida modular `out-v5` y `vercel.json` existen; los deployments anteriores `READY` son de SHAs antiguos, no prueba del HEAD nuevo. No se ha certificado Android físico de V2.
- **Matriz V2 de cuatro modos:** `qa/v5/resp01-v2-all-modes.mjs` programa **36 recorridos** (4×9), pero aún no existe resultado aprobado. La exigencia histórica del creador es **≥10 perfiles por caso**, mínimo 550 sobre 55 casos; esto **no queda cubierto** solo con 36 V2.

## P0 — bloqueos previos a activar RESP-01 V2

| ID | Brecha y evidencia | Corrección arquitectónica exigida | Demostración de aceptación |
| --- | --- | --- | --- |
| P0-01 | **Cooperativo con XP no totalmente compartida**. Código actual contabiliza pistas por actor; `claims` por doctor. Contradicción de regla posterior. | Un solo ledger **de equipo activo** para ingresos, errores, muertes causales y costo 5% de pistas. Idempotencia por pista válida y vínculo a la atención; distinguir miembros ausentes. No duplicar motor de calidad. | 2/3/4 médicos en guardia: A pide pista nueva, todos los activos reciben **idéntico** descuento; B repite = gratis; XP cierre/errores igual; un ausente no cobra; reconnect conserva todo. Competitivo sigue individual. |
| P0-02 | **CI exacta sin pase**. Cinco fallos V2 anteriores y regresiones transversales rojas. | Reproducir contra último SHA, corregir solo causas raíz; separar errores de test/QA de clínica real. No aprobar con tests cancelados/en cola. | `staging-contract`, paridad, transferencia e integral verde para el **mismo código**; adjuntar logs y datos. |
| P0-03 | **Receptor todavía potencialmente conocedor del caso real**. Función pura blind existe, integración activa no. | Cambiar ruta de decisión del servicio a diagnóstico presunto público, evidencia comunicada, estabilidad y recursos, independiente de caso verdadero. Conservar condiciones médicas de seguridad basadas en signos reales y la aceptación autoritativa; sin segundo motor. | Misma información declarada + hallazgos, cambiar el `caseId` oculto no cambia juicio del servicio; hipótesis incompatible/receptor incorrecto sí rechaza; reintento exitoso. |
| P0-04 | **Sanción online de Observación y deuda sin contrato SQL probado**. | Migrar RPC de recompensas **en Supabase staging**, saldo no negativo, deuda persistente, autor y equipo según modo, idempotencia, rollback; después Production con permiso y pruebas. | Mismo evento cobrado una vez; deuda a 0 XP sobrevive nueva guardia; otro doctor no hereda sanción de rival; equipo Coop sí comparte por regla vigente. |
| P0-05 | **V2 farmacología errónea cubierta parcialmente**. Revisador común solo trata varias clases; no validado para toda formulación/caso. | Tabla universal de indicación, exposición y efectos por clase/mecanismo; no `if(caseId===...)` en motor. Conectar advertencias solo a administraciones genuinas y al evaluador oculto único. | Estudios de dosis errónea, sobredosis, alergia/anafilaxia, fluidos excesivos, anticoagulantes y diurético en choque, soporte correcto, rescate/demora, sin falso veto ni daño inventado. |
| P0-06 | **Validación de cuatro modos insuficiente**. 36 bots programados, no certificados. | Auditar el *harness* (en `qa/v5/resp01-v2-all-modes.mjs` se espera `run.recovery.replayUnchanged`, mientras `recoveryEvidence` usa `sameClinicalPatient`, `sameXP`, `sameClaims`, etc.; este predicado causa falsos negativos). Semillas de `complication-rescue` deben realmente producir una complicación en cada modo. | Corrida 4 modos × >=10 perfiles, firmas/semillas iguales con V1, logs de atención y fisiología reales, recuperación y recibos, 100% integridad de autoridad, no «green» fabricado. |
| P0-07 | **Alta/Observación/Vega y cierre parcial requieren regresión V1/V2**. Código general de recibos y V2 cambió; histórico V1 permite cierres parciales. | Respetar decisión más reciente: libertad de intento, modal Vega, descuento XP y paciente sin cerrar/reclamable; reutilizar autoridad real. Preservar V1 sin convertir cierre parcial en atajo de V2. | Alta insegura + Observación insegura + repetición + otra cuenta + nueva cama + guardado/salida; cero reevaluaciones ficticias y un solo cargo por evento; V1 sin regresión. |
| P0-08 | **Vercel/Android/servidor sin certificado para HEAD**. | Build de V5 modular y Preview específico, Supabase staging, API real, pruebas de latencia, congestión, movilidad, cámara, enfermería. No desplegar V2 para el público mientras fallen P0. | SHA exacto, Preview privada + rollback, 2 Android físicos, varios jugadores reales, endpoints auténticos, logs de guardias de 24 min. |

## P1 — integridad funcional antes de ampliar el catálogo V2

| ID | Pendiente o riesgo | Prueba requerida |
| --- | --- | --- |
| P1-01 | **550+ recorridos históricos reales** y resultados clínicos longitudinales de 55 enfermedades, no solo un test feliz por caso. | 10+ perfiles por caso, recuperación, muerte causal y V1/V2 por semillas; clasificar fallo clínico frente a desenlace adverso legítimo. |
| P1-02 | **Dr. Vega hasta el cierre**, no solo dos pistas: una acción ejecutable, especialidad, reconocimiento de alternativas, urgencia, dosis contraindicadas, espera gratis, 5% visible y requisito indispensable descubrible. | Cuidado completo con pista paso a paso en 4 modos; carga exactamente una vez y compatibilidad con Coop XP global. |
| P1-03 | **Todas las decisiones de recepción** y transición del paciente a sala/UTI/quirófano/procedimiento; no exigir operación endoscópica del receptor. | Cada destino habilitado, rechazo clínico y aceptación tras corregir; tratamiento en curso no completado ficticiamente. |
| P1-04 | **Enfermería y diálogo natural**, especialmente mensajes iniciales y durante los primeros minutos de guardia, respuesta al nombre/primera persona, confirmación de estudio/medicación, error recuperable. | Sesiones reales con órdenes naturales múltiples, tiempos, una sola ejecución, primer mensaje y concurrencia. |
| P1-05 | **Siete personalidades, edad, nombre, historia, alergia** reproducible y consistente con el examen y estudios. | Múltiples semillas en el mismo caso y paridad de expediente al recuperar; alergias identificadas solo por preguntas. |
| P1-06 | **Examen físico por región y estudios con alias equivalentes**, sin información adelantada. | UI y autoridad, pares de estudio convencional/ultrasensible, resultados tardíos, examen neurológico, monitor verdadero. |
| P1-07 | **Competitivo propiedad/reclamación/ausencia del rival** y Coop control concurrente de 2–4. | Rival no puede leer ni mandar órdenes a otro paciente; mismo paciente preservado tras Vega; peticiones simultáneas y replay durable. |
| P1-08 | **Final 24 minutos → continuar / guardar**, reloj real compartido, llegadas 0/3/7/12/17/21 y nuevos turnos. | Dos guardias consecutivas, acciones pendientes, no duplicaciones y rejoin. |
| P1-09 | **Rendimiento CPU, red móvil, memoria y fallos Android**, distinguir reloj del caso de latencia de interfaz. | Instrumentación en Preview y teléfonos físicos, medición de tiempos/uso, pruebas al abrir teclado y múltiples pacientes. |
| P1-10 | **Vigilar herencia V4 y UI aprobada**: mapa, sprites, cámara, audio, banco de voces/música, chat Equipo/Actividad, tablero y animación XP. | Navegador de 2/3/4 sesiones + Android real; comparar referencias originales y capturas; pruebas de regresión. |

## P2 — producto e infraestructura a completar sin bloquear arreglos clínicos

| ID | Pendiente | Aceptación |
| --- | --- | --- |
| P2-01 | **Catálogo masivo y plantilla/planilla estándar** para migrar las 55 enfermedades una por una. | Definición declarativa de categorías de caso, ramas y ventanas, bot clínico y comparador V1/V2; activar revisiones individualmente solo al certificar. |
| P2-02 | **Voz, movimiento remoto y reconexión en móviles reales**. | Recibir movimiento y mensajes desde el cliente remoto, fallbacks, latencia, ausencia de duplicados. |
| P2-03 | **Cuenta persistente/acceso seguro e identidad**. | Nombres normalizados únicos, mantener cuentas/XP antiguas, transferencia autenticada explícita y permisos de guardia. |
| P2-04 | **Inventario histórico de 20 áreas y ~60 requisitos** mencionado por el creador. | Comparar ítem por ítem contra código y evidencia; este reglamento recopila las reglas accesibles, pero **no presume haber reconstituido la literalidad de 60 entradas** sin el inventario original íntegro. |
| P2-05 | **Coherencia de puntuación/evaluaciones** en todas las vías incl. cierre parcial V1, pistas e informes. | Evaluador único positivo por requisitos, negativo por errores/daño, recibo único y cálculo de cuenta online idéntico al local. |

## Orden de ejecución obligatorio

1. **No mover Production ni V1.** Fijar HEAD y guardar resultados fallidos + snapshots de reglas.
2. Corregir **P0-01** (Coop XP compartida), **P0-03** (receptor ciego) y **P0-06** (QA bot) **en módulos universales y tests**, no introduciendo atajos por enfermedad.
3. Reejecutar **P0-02/P0-07** en el SHA exacto; verificar medicina errada y consecuencias de **P0-05**.
4. Validar **P0-04** en SQL staging con rollback; después Preview Vercel/Android físico **P0-08**.
5. Solo tras puertas verdes, activar experimentalmente RESP-01 V2 sin borrar V1. Migrar otras enfermedades progresivamente con los contratos versionados.

**NO GO mientras algún P0 permanezca sin pruebas aprobadas.** Este listado es el registro de trabajo pendiente y debe actualizarse con evidencia, no con intenciones de código.


## Bitácora posterior — certificación RESP-01 V2, 21/11/2026 (Argentina; ejecuciones UTC 22/11)

**Esta sección es un registro de ejecución, no una alteración del reglamento maestro ni una certificación GO.** Se preserva íntegramente el inventario histórico precedente.

### Cambios pequeños publicados en la rama experimental

- `02c2109f98e6e20ea089b085531fc8d5d79d4137`: la verificación V2 de checkpoint deja de exigir replay cuando no hubo comando; comprueba indicadores de recuperación individualmente.
- `d8ef514d8d8fdbceb312ddeb2967a44e4a39db00`: la regresión de ceftriaxona usa los contratos reales de VARIX-001 y COLON-001; la profilaxis autorizada no se interpreta como antibiótico sin indicación.
- `a1123b25db2f1a8e07d71025ebe219aa7f88aefd`: `clinical-risk.js` excluye únicamente exposiciones pertenecientes a otro paciente de su evaluación local; `medication-exposure.js` conserva la validación estricta de dosis, identificadores y duplicados en exposiciones propias.
- `df3550327ff6d903fed7371bbc63258761cae100`: se agrega el perfil de bot `wrong-diagnosis` a la herramienta compartida de certificación, sin alterar la lógica del juego.
- `d38cfcc0e23f1087aafcee441b7601e90bedb791`: RESP-01 V2 configura **diez perfiles × cuatro modos = 40 recorridos**, incluyendo hipótesis errónea que no debe emitir cierre seguro ni XP.

**Separación V2/V1:** los cambios afectan dos ficheros del verificador QA, un test de riesgo y el evaluador compartido de riesgo. No se ha editado RESP-01 V1, los 55 casos de catálogo, el calendario de admisiones, las reglas de los cuatro modos, el reloj de 24 minutos ni Production. La revisión del evaluador compartido sigue sujeta a regresiones de los casos existentes.

### Evidencia efectivamente revisada

- [V2 en `02c2109`, ejecución 44968095264](https://github.com/javierdario48-star/ATRIA/actions/runs/44968095264): **36/36** escenarios de cuatro modos aprobaron, así como paridad nativa, exportación de reglas y build previo. El job `staging-contract` falló por **dos pruebas de farmacología** (fixture VARIX sin tratamiento profiláctico declarado y entrada de administración atribuida a paciente ajeno). Por eso la ejecución global es **FAILURE**, no GO.
- [`a1123b2`, ejecución 44968879157](https://github.com/javierdario48-star/ATRIA/actions/runs/44968879157): `staging-contract` **SUCCESS** tras las correcciones clínicas anteriores; otros trabajos de ese SHA quedaron cancelados o en curso por commits nuevos, por lo que **no prueba aprobación integral**.
- [`d38cfcc0`, ejecución 44968933396](https://github.com/javierdario48-star/ATRIA/actions/runs/44968933396): **matriz de 40 escenarios lanzada, sin resultado aprobado al último chequeo**. No dar por ejecutados/aprobados los 40 sin obtener logs del mismo SHA.
- [ATRIA 5 integral previa, ejecución 44968095234](https://github.com/javierdario48-star/ATRIA/actions/runs/44968095234): fallos en `clean-core-contract`, `independent-game-browser` y `durable-guard-recovery`. Los logs incluyen discrepancia de XP **118 frente a 133** en CIRR-001 y expectativas no satisfechas para un perfil DIARR-001. **Son incidencias generales**; no hay evidencia de que RESP-01 V2 las provocara. Deben auditarse por separado.
- [Censo ATRIA 4.8.7 de `02c2109`, ejecución 44968095276](https://github.com/javierdario48-star/ATRIA/actions/runs/44968095276): **SUCCESS**. El censo del último SHA deberá verificarse igualmente.

### Puertas aún abiertas, sin duplicar trabajo

1. Obtener resultados del **SHA exacto d38cfcc0** en matriz V2 de 40, paridad, farmacología y test de legado; corregir solo fallos reproducibles, no modificar expectativas para forzar verde.
2. Probar concurrencia con **2, 3 y 4 participantes reales** para V2 y la persistencia SQL/recepción; un bot de cuatro modos no reemplaza estas pruebas de red.
3. Mantener como dependencias **globales separadas** la XP de Cooperativo completamente compartida, receptor ciego al diagnóstico verdadero y sanciones/SQL no certificados, sin rehacerlos dentro de RESP-01.
4. Confirmar la revisión en Preview Vercel del mismo SHA y Android físico antes de activación. Ningún build `READY` o preflight equivale a prueba de usuario real.

**Estado al redactar: NO GO.** RESP-01 V2 conserva su aislamiento experimental. Esta bitácora no modifica normas ni contratos JSON ya publicados.


## Checkpoint de cierre — XP cooperativa y recuperación de CI existente

**Base remota comprobada:** `bc4fb505bf5cf4f17d73d9311fa4a24cf12f05f5`. Se revisó directamente GitHub Actions: [44968933396](https://github.com/javierdario48-star/ATRIA/actions/runs/44968933396), código `d38cfcc0e23f1087aafcee441b7601e90bedb791`, terminó **SUCCESS, cinco trabajos de cinco**, incluidos **40/40 escenarios** y paridad V1/V2. Esto supera las notas anteriores que lo dejaban en cola. No repetir esa certificación para recuperar su estado; los cambios compartidos posteriores sí necesitan su regresión.

**P0-01, corrección local implementada:** el ledger existente registra beneficiarios financieros al mostrar la pista o producir la sanción. Los activos de Cooperativo comparten descuento; repetir la misma acción con otro médico es gratis. La autoría clínica se conserva. Las ausencias no adquieren retrospectivamente deuda o costo de pistas; el regreso usa el mismo checkpoint. Competitivo conserva el ámbito individual. La revelación del diagnóstico sigue siendo privada, con su efecto financiero compartido en Cooperativo.

Reproducción previa: cuatro pruebas nuevas fallan porque B observa 0 pistas donde A ya tiene 1. Después de corregir: **38/38 pruebas dirigidas** de ledger, sesión, runtime, recuperación durable, progresión y sanción competitiva; **12/12 pruebas de contenido V2**. Los tests anteriores que exigían costo independiente en Cooperativo se actualizaron conforme a R1.5/R7.4; no se cambiaron aserciones clínicas ni puntajes para ocultar un defecto.

**Límite de P0-01/P0-04:** esta corrección no certifica el RPC online antiguo. Las filas previas sin lista de beneficiarios conservan su evidencia por actor: no se inventa quién estaba activo históricamente. Los claims ya cerrados no se reescriben. Supabase solo devuelve el proyecto activo `atria-clinical`; la consulta de ramas devuelve **0 ramas de desarrollo**. No ejecutar pruebas con escrituras sobre ese proyecto como si fuera staging. Sigue pendiente staging independiente, migración/compatibilidad SQL, deudas y concurrencia. NO GO.

Evidencia recuperada: `docs/evidence/resp01-v2-release-2026-11-21/baseline-ci.json`. Próximo bloque: receptor activo ciego al diagnóstico oculto, manteniendo la autoridad nativa de cierre y calidad.

### Regresiones V1 y build — causas reproducidas

- **CIRR-001, 118 frente a 133:** el escenario intenta un alta insegura antes del cierre correcto. Se mantienen 133 XP brutos y la deuda auténtica de 15; 118 es el saldo correcto. La prueba ahora verifica el recibo de la sanción, el importe bruto, el saldo y la idempotencia, en lugar de borrar la penalización. No se cambió el puntaje clínico.
- **DIARR-001:** los perfiles principiantes y el certificador de traslados solo entendían la reprimenda de Alta. El motor también emite `clinical.unsafe-observation`. El certificador usa ahora el validador compartido `dispositionProof`, y dos regresiones nuevas comprueban su sanción única y cierre posterior. Los cuatro recorridos principiantes dirigidos (Solitario, Aprendiz, Cooperativo y Competitivo) pasan.
- **Build compacto:** `build-v5-core.mjs` omitía una dependencia real de `native-medications.js`: `medication-indication-review.js`. Añadida al manifiesto explícito. La prueba de build limpio y diez pruebas de CIRR pasan (**11/11**).
- **Recepción ciega:** reproducción persistente en `qa/v5/release-gates/blind-receiver.test.mjs` (ejecución explícita). La misma hipótesis quirúrgica se juzga contra el caso real y no solo la información comunicada. La integración experimental de la política pública produjo regresiones de preparación/urgencias; **se revirtió por completo**. No se publicó esa modificación ni se alteraron los tests clínicos afectados. El requisito P0-03 permanece **NO RESUELTO**. Debe extraerse una proyección de evidencia comunicada y preparación pública con paridad de las urgencias existentes antes de reemplazar el veredicto. No basta con retirar comprobaciones.

**Persistencia externa:** no hay rama Supabase de desarrollo accesible y una consulta SQL exclusivamente de metadatos fue rechazada por autenticación de PostgreSQL. No hubo escritura remota. Preparar y validar SQL localmente no equivale a certificar Supabase staging.

### Checkpoint — recuperación del receptor de Observación y cuidado pendiente

- **NEUR-03 corregido:** el bot esperaba aceptación para poder solicitar aceptación. Ahora usa el checklist público ya preparado para iniciar la solicitud. El receptor previsualiza la misma reevaluación nativa rutinaria, sin escribirla ante un rechazo, y solo la confirma al aceptar. Prueba real de cierre con receptor + 102 regresiones relacionadas aprobadas; recorrido de Vega NEUR-03 aprobado (96 pasos).
- **Regresión real de Enfermería corregida:** la nueva ruta de reprimenda podía saltarse el control de trabajos de Enfermería y cerrar Observación antes de su llegada. Ahora Alta/Observación revisan ese trabajo antes de invocar el cierre; paciente intacto, sanción única y continuación. 49 pruebas de Enfermería/decisiones inseguras/recuperación aprobadas.
- **Pruebas históricas actualizadas con justificación:** el perfil obligatorio `wrong-diagnosis` ya existía; faltaba en la lista esperada de un test. PBE conserva daño renal medido y rescate; su aviso ahora proviene de la lista fisiológica genérica de fármacos desaconsejados, sin prometer una palabra concreta en el texto. No se modificó su fisiología ni su puntuación para obtener verde.
- El primer barrido integral local del HEAD anterior produjo 3206/3209; identificó esos tres fallos (lista de perfiles, texto PBE, cierre con Enfermería). Solo el tercero era un defecto nuevo de ejecución clínica. Se conserva ese resultado, pendiente del barrido integral del código final.
- **NO GO:** estas correcciones no resuelven la recepción ciega, ni certifican SQL alojado, Preview o Android físico.

### Checkpoint — contrato SQL preparado, con límites explícitos

- P0-04 pasa de «sin implementación SQL» a **migración preparada + 9/9 pruebas PostgreSQL local**, todavía **pendiente de Supabase staging**. Fuente y procedimiento reversible: `ATRIA-5-REWARD-MIGRATION-STAGING-2026-11-21.md`.
- Se cubren dos autores distintos del mismo error, cohortes activas, deuda a saldo cero, pago posterior, muerte causal realmente producida por el motor nativo, cuatro modos, recibos falsos e invoker/RLS. No se confunde ejecución serial local con concurrencia alojada.
- P0-03 queda reproducido con mayor precisión: manteniendo diagnóstico declarado, signos, examen, estudios y administraciones idénticos, cambiar únicamente la etiqueta diagnóstica oculta cambia el juicio receptor. Las dos pruebas explícitas de liberación continúan rojas. La suite de contenido V2 no constituye certificación de ese receptor.
- La proyección de deuda de carrera en el adaptador REST y su aceptación tras volver a iniciar sesión siguen pendientes del despliegue versionado en staging. No se aplicó DDL alojado.

### Checkpoint — CIRR también en navegador

El job `independent-game-browser` del run `44973637282` reproduce la misma confusión bruto/neto en `qa/v5/cirr-browser.mjs:101`: ejecuta un Alta insegura deliberada y después exige 133 XP de saldo. Se conserva el comportamiento clínico: 100/100, 133 brutos, recibo nativo único de −15, saldo 118. El escenario ahora comprueba ese desglose y la persistencia del saldo neto tras salir y recargar, en vez de regalar la sanción. `node --check` aprobado. La ejecución local del navegador queda bloqueada por `socket() failed: Operation not permitted` al iniciar Chromium; la aceptación del escenario corregido queda asignada a GitHub Actions. No se modifica código de juego por esta aserción.

### Checkpoint — conectar las sanciones compartidas a la carrera local

Se encontró una integración incompleta adicional en `src/v5/app/application.js`: el fallback Cooperativo trasladaba a la carrera privada solo `clinical.unsafe-discharge`. Ahora `apply-clinical-penalties.js` conecta Alta, Observación y muerte causal al **mismo ledger existente**, filtra la cohorte activa, conserva el autor clínico y evita fusionar los errores de A y B en un solo débito. Observación muestra su nombre correcto en la notificación de XP. No se añade un motor de puntuación. 14/14 pruebas dirigidas aprobadas (sesiones nativas reales, restauración, dos autores, ausencia y aislamiento individual); build de 220 módulos aprobado. La aceptación multicuenta alojada y Android sigue pendiente.
