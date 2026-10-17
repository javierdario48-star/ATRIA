> **C12.b — dinámica breve durante la guardia (16-10-2026):** código `52efa366882980705896fa10a489dc5c5d8e1eec`. La guardia dura **24 minutos reales equivalentes a 24 horas de juego**; ceftriaxona/metronidazol en APP son intervenciones de cobertura/requisito clínico, no un aumento inmediato de PA o SpO₂. El mecanismo activo nuevo es SOLO sobrecarga respiratoria tras Ringer **confirmado y acumulado**: integrado en el único writer de signos APP/CIRR, contrastado con ocho dosis 500 ml del build efectivo V4, sin copiar el beneficio hemodinámico de CIRR estable. Alergias y nefrotoxicidad no migradas: deben depender de antecedentes y tiempo específicos, jamás bloquear la indicación por ser incorrecta. [STEP_12B_HANDOFF.md](STEP_12B_HANDOFF.md). CI código [38986259144](https://github.com/javierdario48-star/ATRIA/actions/runs/38986259144): `clean-core-contract` 225/225 V5 + 40/40 núcleo + 4/4 adicional, navegador/regresión pendientes al redactar.

> **Checkpoint C12.a — caracterización ejecutable + exposición confirmada (16-10-2026):** código `dfe525b8258101aa011bfe9605ba0271ab003529`. El VM QA del ejecutable V4 real ejecuta siete escenarios APP/CIRR/PERI-SEC y detecta brechas conocidas; CI `clean-core-contract` satisfactoria (40/40 core, 219/219 V5, 4/4 adicionales), navegador y regresión completa todavía en ejecución al registrar. Nuevo selector V5 puro y sin estado adicional: `src/v5/clinical/medication-exposure.js`, expuesto solo como `guardSession.read().exposure`. No hay daño nuevo ni mortalidad aún. Ver [STEP_12A_HANDOFF.md](STEP_12A_HANDOFF.md).

> **Nueva puerta de equivalencia clínica (16-10-2026):** antes de implementar C12 o nuevos casos, cumplir [CLINICAL_PARITY_GATE.md](CLINICAL_PARITY_GATE.md). Error detectado: reconstruir el sistema desde una muestra de dos casos y aceptar tests técnicos sin caracterizar la libertad terapéutica ni el comportamiento fatal del ejecutable V4.8.7 efectivo. Estado C11.c: núcleo V5 verde; reparación de regresión móvil publicada en `62f12407c4bfd2653ba435a37ef25a2ac321f6f2`; CI de navegador aún por comprobar. **Nunca** afirmar fisiología de daño, rescate o muerte en V5 hasta reproducir trayectorias frente al legado.

## Principio rector de libertad clínica (aclaración del usuario, 16-10-2026)

ATRIA es un RPG de simulación médica con libertad para **equivocarse**: las decisiones clínicamente inapropiadas pero técnicamente ejecutables deben administrarse y producir las consecuencias físicas del paciente, incluidas complicaciones, rescate o muerte cuando estén sustentados por el modelo. No introducir bloqueos protectores basados solo en si la indicación es beneficiosa. Distinguir: (1) vía/dosis no implementada ≠ contraindicación médica; (2) reconocimiento ≠ administración; (3) replay del mismo ID ≠ orden nueva; (4) muerte debe seguir el motor fisiológico, no un interruptor ad hoc. C11.c implementa la distinción 3 y registra exposición real; **NO** implementa todavía sobredosis libre, fluid overload o muerte. [Handoff C11.c](STEP_11C_HANDOFF.md).

> **C11.b — prevalidación completa de órdenes farmacológicas compuestas (16-10-2026):** ejecutable `56fc352d4c2f0f95056834dd5c7eeed8632fed7f` publicado exclusivamente en `atria-5.0-core-rebuild-experimental`. Validación pura antes de la primera acción clínica, reutiliza `parseStandardIVDose`, `parseCirrDose`, `parseNasalOxygenFlow` y el listado de terapias implementadas por caso; rechazo `unsafe-compound-order` con feedback claro, cero tareas, recibos o efectos parciales. Incluye estado de oxígeno activo para `therapy.stop`; las órdenes simples mantienen sus causas nativas. Pruebas V5 de rechazo y éxito, autoridad, reintentos, móvil Chromium APP y V4 sin modificar. CI del ejecutable [38979412510](https://github.com/javierdario48-star/ATRIA/actions/runs/38979412510) **en ejecución al documentar**. Sin preview matching verificada ni prueba Android físico. [STEP_11B_HANDOFF.md](STEP_11B_HANDOFF.md).

> **CI definitiva del ejecutable C07.e/C08.d:** [38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507) **completed/success 3/3**, commit `d32440a657537dce81288791ce0ebf847eb47d05`. Núcleo **206/206 V5 + 39/39 core**, navegador completo Chromium móvil y regresión histórica V4 aprobados. Los commits siguientes hasta el presente handoff solo son documentales. Sin preview READY matching comprobada; Android físico no probado.

> **C07.e/C08.d — checkpoint posterior C08.c, sistemas de órdenes compuestas y enfermería física (16-10-2026).** Repositorio `javierdario48-star/ATRIA`, rama única `atria-5.0-core-rebuild-experimental`. Base comprobada: `9995fd34e8e3d051a546a8bded2879708378075f` con CI [38973439498](https://github.com/javierdario48-star/ATRIA/actions/runs/38973439498) 3/3 success. Nuevo código funcional `d32440a657537dce81288791ce0ebf847eb47d05`. C07.e: dos recorridos integrados sobre el hospital, cinco tareas combinadas oxígeno/monitor/vías/Ringer/ceftriaxona, y oxígeno concurrido con acceso automático + dos antibióticos; comprobantes, preparación e idempotencia. C08.d: enfermería debe llegar a cama para signos vitales solicitados, sin duplicar mediciones propias del médico, y no hace recorridos redundantes para un monitor conectado. Tests `physical-nursing.test.js`, `qa/v5/hospital-interactions-browser.mjs`, `qa/v5/app-browser.mjs`. CI exacta [38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507) **completed/success 3/3**, verificada en los tres trabajos; los bots de navegador anteriores fallaron por ventanas de observación asincrónicas, sin prueba de fallo de autoridad. Nuevas aserciones exigen recibos exactos aun cuando una enfermera termine antes del muestreo Playwright. **No preview matching READY comprobada** (cuota Vercel reportada en C08.c) ni Android físico. [C07.e](STEP_07E_HANDOFF.md) · [C08.d](STEP_08D_HANDOFF.md). Verificar CI antes de ampliar alcance; conservar código modular y sin nuevos casos.

> **Última actualización C08.c — verificación posterior y última corrección visual, 16-10-2026.** El código C08.c con seguridad clínica y llegada espacial real `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9` obtuvo CI **[38972668527](https://github.com/javierdario48-star/ATRIA/actions/runs/38972668527) completed/success 3/3**: 200/200 pruebas V5, 39/39 núcleo, Chromium móvil completo y regresión V4. Después se publicó el cambio **`1dda7350a81fa7337144ad294f37165f46c7094b`** (solo proyección/presentación del historial) para mostrar por separado `start`, `setRate` y `stop` de oxígeno como “Administrado”, “Flujo ajustado” y “Suspendido y confirmado”; sin modificaciones de ejecución clínica ni fisiología. CI exacta de este último código [38973192616](https://github.com/javierdario48-star/ATRIA/actions/runs/38973192616) **en ejecución al registrar esta nota**; requiere comprobación final antes de atribuirle 3/3. Vercel: comprobadas previews READY anteriores de `f3f65441` y `51bdf018`, ambas **anteriores a la corrección de titulación y validación**; el despliegue explícito del SHA corregido fue rechazado por `402 payment_required / api-deployments-free-per-day` (más de 100 despliegues diarios, `retryAfter=86400`). **No existe preview verificada matching el ejecutable corregido**. Sin prueba Android físico. 

> **C08.c — soporte de oxígeno nasal mediante enfermería espacial y recibos reales (16-10-2026).** Rama única `atria-5.0-core-rebuild-experimental`; punto inicial `cc27dcb962f7f107700495b4cacad70cf420b5c5` (C07.d CI 3/3). Código/QA corregido publicado: `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9`. Soporte comprobable 2/4 L/min, inicio, retitulación y suspensión con viajes independientes hasta B1; sin administración antes de llegada, sin efectos genéricos sobre SpO₂ para APP/CIRR y sin vía venosa ficticia. Nuevo `executeOxygenSupport` / `parseNasalOxygenFlow` en observaciones; APP/CIRR reusan ejecutor de paciente/puerto clínico y cola espacial. Pruebas en `oxygen-support.test.js`, `physical-nursing.test.js`, ledger y Chromium móvil. La CI exacta está [en curso: 38972668527](https://github.com/javierdario48-star/ATRIA/actions/runs/38972668527): **no declararla aprobada hasta comprobar resultado 3/3**; primer RED [38972537246](https://github.com/javierdario48-star/ATRIA/actions/runs/38972537246) halló dos defectos, ambos corregidos. Preview matching SHA y Android físico pendientes. [Handoff completo](STEP_08C_HANDOFF.md). Priorizar cualquier regresión real que revele CI antes de otras etapas.

> **C07.d — órdenes IV fuera de secuencia y canalización automática real (16-10-2026).** Baseline `b441417667176b91f96601caddb35aae29f7d820` con CI 3/3. SHA ejecutable `ae1d4e4983f2899b76507971d29e4f8adbaff2a1`, último QA `5be5fdd9ef9685592a08eff5cfdf39b5cab0a195`, CI [38968502371](https://github.com/javierdario48-star/ATRIA/actions/runs/38968502371) **completed/success 3/3**; los commits posteriores al ejecutable solo cambiaron QA y documentos. Nuevo módulo **puro** `clinical/nursing-access-plan.js`: usa el scanner actual y formulario IV validado, reordena vías explícitas antes de fármacos o ante fármaco IV certificado sin vía/pending IV añade UNA `procedure.request/iv` visible; el NPC debe recorrer el hospital y recibir comprobante antes de que se prepare cualquier medicación. Dosis incorrectas y rutas no IV jamás producen vía automática. **Solo funciona en guardias jugables con enfermería espacial**; los tests sin NPC mantienen exigencia de acceso real. Pruebas en mundo real, núcleo y Chromium APP móvil; se actualizó build ESM y aislamiento de comprobantes del estudio. No segundo motor, no fisiología inventada, no casos nuevos. [Handoff íntegro](STEP_07D_HANDOFF.md). **Pendientes:** oxígeno caracterizado, tareas físicas restantes, indicaciones clínicas específicas, C09, C10, C18–C25; conservar paridad V4 sin copiar su caos. Preview del código funcional READY: https://night-shift-clinical-rdip1lnrh-javierdario4878-7324.vercel.app; Android físico no probado. Verificar HEAD exacto de rama y la CI del código.

> **C07.c/C05.f — seguimiento auténtico de tratamientos y monitor con variación acotada (16-10-2026).** SHA funcional previo a informe `d9b03b106101a915340cd6276eaf7e7462158245`; CI [38961269636](https://github.com/javierdario48-star/ATRIA/actions/runs/38961269636) a comprobar final (núcleo verde al redactar; navegador e histórico pendientes). **Nuevo** `ui/monitor-order-ledger.js`: cruza `chat.posted` con `clinical.completed` (UID/eventId) y `patient.administrationLog` para actualizar automáticamente el aviso de órdenes del monitor de pendiente a administrada/rechazada, y mostrar historial de dosis verdaderamente entregadas y procedimientos con estado. **C05.f:** `monitorMeasurement` introduce variaciones mínimas, suaves y deterministas solo en lecturas del monitor conectado, no en `liveVitals`, la respuesta farmacológica o el XP; mediciones puntuales y monitor desconectado conservan su veracidad. **C07 avance:** autocompletado IV compartido para CIRR/APP, sin nuevo motor. Tests unitarios más recorridos móviles reforzados. [Handoff completo](STEP_07C_HANDOFF.md). Pendientes IV automático/órdenes fuera de secuencia, oxígeno y farmacología individual C11.b, Vega, voz, guardia múltiple y multijugador. No nuevos casos. Verificar HEAD, CI y preview SHA matching antes de anunciar disponibilidad.

> **C11.a — servicio farmacológico IV compartido (16-10-2026).** Baseline `2c4c8031cc364ebcd6a374351f2202ecf5b037f0` con CI [38940082226](https://github.com/javierdario48-star/ATRIA/actions/runs/38940082226) 3/3. Código/QA funcional último `82cb03f2b64dbd54ef146d38fdb6a537525bc01b`, CI [38943481536](https://github.com/javierdario48-star/ATRIA/actions/runs/38943481536) **completed/success 3/3**. Preview SHA matching READY: https://night-shift-clinical-nyhvdefzn-javierdario4878-7324.vercel.app, Android físico todavía no validado. Se extrajo `native-medications.js` con un formulario y servicio nativo para **Ringer 500 ml, ceftriaxona 1 g, metronidazol 500 mg**. APP y CIRR usan la misma dosis, preparación y comprobante; el caso sigue dueño exclusivo de la respuesta fisiológica. CIRR admite ahora `enfermera vías y ringer` (coloca dos vías, luego enfermera llega para infundir, registra 500 ml) **sin inventar respuesta de shock ni declarar indicación apropiada**. APP conserva su modelo propio y CIRR su paracentesis/espironolactona. QA de núcleo y navegador de CIRR se ampliaron; pruebas de V4 continúan en la CI. Estado **C11 parcial**: aún faltan otros medicamentos, evaluación de indicación, contraindicaciones, efectos adversos, IV automático, oxígeno y C07/C08 completos. [Informe técnico](STEP_11A_HANDOFF.md). No nuevos casos, sin segundo motor ni parches. Leer HEAD exacto, resultado CI, preview antes de retomar.

> **C08.b3 — corrección del fallo de vías observado en Android (16-10-2026).** Punto de partida `69089f0c7df52fea4d716dd17b3cc5324346b98c`, CI [38924306232](https://github.com/javierdario48-star/ATRIA/actions/runs/38924306232) completed/success. SHA funcional y pruebas de esta corrección: `f47fe284598d4295380d40e3e4d64f3a2781e121`; CI funcional [38939208329](https://github.com/javierdario48-star/ATRIA/actions/runs/38939208329) **completed/success 3/3**, preview del mismo SHA READY https://night-shift-clinical-5uqoia0jk-javierdario4878-7324.vercel.app; todavía no probada en Android físico. Las capturas Android mostraban `enfermera vías` → `iv: sin confirmación de resultado` y `enfermera ringer` → `intervención no habilitada`. Causa verificada: `createCirrCare` no tenía acción `iv` aunque el mundo enviaba enfermera, y `messages()` ocultaba los rechazos. Solución: `executeVenousAccess` compartido por APP/CIRR en `observations.js`, sin segunda lógica de acceso; previa llegada del mismo NPC; confirmación de **dos vías** para plural, reintento de singular no manda a caminar otra vez; chat reporta causa de fracaso y preserva diálogo de paciente. **Ringer todavía NO tiene regla clínica en CIRR, y no se inventó efecto fisiológico**; la pantalla lo explica y no administra. [Informe](STEP_08B3_HANDOFF.md). Siguientes sistemas: C07 órdenes fuera de secuencia/acceso automático/oxígeno respaldado, luego C08 resto y modos. Sin nuevos casos.

> **C08.b2 — ejecución física de tratamientos (16-10-2026).** Baseline C08.b1 `7362495b56f84f931ca814d13f0e4d0176125927` CI 3/3. Último código/QA `9ea89e005c422cef82fab6cc9506e78ab0d886a1`, CI [38923169786](https://github.com/javierdario48-star/ATRIA/actions/runs/38923169786) **completed/success 3/3**. APP ahora exige llegada real de enfermera **por cada Ringer/ceftriaxona/metronidazol**, además de vía/monitor; CIRR por **espironolactona/paracentesis**. Las dosis se validan antes de viajar; `care.execute/advance` originales cuentan preparación SOLO tras llegada; el comprobante nativo terminal libera a la enfermera. No hay motor duplicado ni timer extra, no hay casos nuevos. Se endurecieron `physical-nursing.test.js` y los recorridos CIRR/APP/reloj largo. **C08 no está completo:** acceso automático para medicamento IV, oxígeno y resto de tareas físicas aún pendientes. Consulta [STEP_08B2_HANDOFF.md](STEP_08B2_HANDOFF.md) para recuperación exacta. Preview del SHA funcional READY: https://night-shift-clinical-dpufwmxxc-javierdario4878-7324.vercel.app; **Android físico no probado**. Verificar HEAD remoto antes de nuevos cambios (documentos son sucesores).

> **C08.b1 — enfermería real vinculada al motor nativo (16-10-2026).** Partida HEAD `725ea84be57f70ce0011c8e208c39c7cdf307601` con [CI 38864870367](https://github.com/javierdario48-star/ATRIA/actions/runs/38864870367) 3/3 success. Último SHA funcional+QA antes de documentación `e6898301bf5019f4a23c7b757792bd89b9437f7a`; [CI exacta 38908299609](https://github.com/javierdario48-star/ATRIA/actions/runs/38908299609) debe verificarse completada antes de llamarla aprobada. **Qué funciona:** la aplicación conecta `createWorld` (6 enfermeras, colisiones reales) y `createGuardSession` mediante tres funciones (`enqueue/takeArrivals/accept`); indicaciones de **monitor y vías** quedan `pending` y NO mutan al paciente hasta que el NPC llega a B1. A la llegada el mismo `care.execute` y `createNativeClinicalPort.complete` autentican el comprobante. Las órdenes combinadas APP con IV pendiente mantienen Ringer/ceftriaxona/metronidazol en espera, prevalidan dosis y solo después del acceso inician los tiempos farmacológicos originales (.8/1.5 s). Cierre bloqueado con trabajo pendiente. [Handoff íntegro C08.b1](STEP_08B_HANDOFF.md), nuevos tests de mundo+autoridad `physical-nursing.test.js`, y bots de navegador APP/monitor endurecidos. **NO completo todavía:** trabajos físicos restantes, C07 parser total, voz, Vega avanzado, multi-paciente ni multijugador. No hay casos nuevos ni segundo motor. Continuar C08.b2 y caracterización original. La referencia anterior C08.a está debajo para reconstrucción. Verificar HEAD (posterior por documentación) antes de cambios. Vercel no debe declararse disponible sin coincidencia SHA/READY.

> **C08.a — nuevo checkpoint de enfermería espacial, 2026-10-16.** HEAD de partida `2aa2532d885c7287a89095c0f862885e560f2e85` con CI [38862871078](https://github.com/javierdario48-star/ATRIA/actions/runs/38862871078) completed/success 3/3. Código/test funcional más reciente antes de documentación `be2f25adeb1ba1bfd6de1a0f599e65484d5a0407` (CI [38864785185](https://github.com/javierdario48-star/ATRIA/actions/runs/38864785185); verificar estado final), incluyendo dos pacientes independientes, reintento de rutas bloqueadas limitado a 1 Hz de simulación y cancelación terminal ante comprobantes tardíos. **Nuevo** `src/v5/engine/nurse-dispatcher.js` y pequeña integración en `src/v5/app/world.js`: reutiliza las 6 enfermeras actuales y navegación real, FIFO y exclusión de trabajo simultáneo sobre una cama, detección de llegada, comprobante exacto UID/eventId antes de confirmar estado espacial, reinicio al volver al lobby. Tests `src/v5/engine/nurse-dispatcher.test.js`, `src/v5/app/world.test.js`: puertas, ruta/collision, no administración precoz, reintentos, transición de guardia. **Importante: C08.a aún NO activa enfermería física en la aplicación ni modifica la política clínica**; es una base deliberadamente desconectada hasta C08.b, para no aparentar vías/monitor administrados antes de que el NPC llegue y no romper los tiempos fisiológicos nativos. La prueba original `src/integration/nurse-native-journey-487.test.js` caracteriza la paridad futura. [Informe transferible de C08.a](STEP_08A_HANDOFF.md). Siguiente única implementación C08.b sobre la misma autoridad y el mismo puerto nativo, entonces C07, C09, C10, guardia continua y modos sociales. No añadir casos ni restaurar parches. Vercel sigue sujeto a la cuota documentada: NO afirmar preview nueva sin verificar SHA matching READY.

> **Bloqueo de preview — Vercel:** intento explícito de desplegar el SHA documental `356dd305ff92ca74b00017e8e980af366a425901` en el proyecto preexistente `night-shift-clinical` fue rechazado por la API `402 payment_required`, límite `api-deployments-free-per-day` de 100 despliegues por día, `retryAfter=86400`. **NO existe una preview comprobada del último código en esta sesión.** La URL READY anterior `night-shift-clinical-nno7x0hjp-javierdario4878-7324.vercel.app` corresponde al SHA anterior `36c4ec...` y **no contiene el monitor de barrido ni la optimización de Vega actuales**. No promover a producción ni modificar el plan de Vercel; volver a intentar la preview tras renovar la cuota o cuando el usuario disponga de otro destino autorizado. GitHub sí contiene el código, CI y los informes. Buscar último HEAD remoto antes de desplegar para evitar que se use la versión equivocada.

> **Actualización final de C05.e/C09.a (posterior a los informes iniciales):** SHA funcional/QA `ea7b5ac84a433a7806bd7709b503c2a167f21f11`. Tras consolidar barrido ECG y Vega, se corrigió la reconexión para que elimine muestras antiguas y se agregó lectura `monitorRead(uid)` de solo consulta: el ECG a 30fps ya NO copia toda la sala, chat ni XP por frame. Tests de aislamiento clínico y bot táctil de desconexión/reconexión. El código corre sobre un RAF; pruebas e informes [C05.e](STEP_05E_HANDOFF.md) y [C09.a](STEP_09A_HANDOFF.md). [CI exacta de código](https://github.com/javierdario48-star/ATRIA/actions/runs/38862268981) **completed/success 3/3**: núcleo, navegador completo y regresión histórica, SHA `ea7b5ac84a433a7806bd7709b503c2a167f21f11`. El HEAD remoto vigente será mayor por el commit de esta documentación; no confundir su CI con la verificación del SHA funcional. Próximo trabajo C07/C08 enfermería física, luego docencia Vega avanzada, voz, guardia multi-paciente y modalidades. Se mantienen 11 casos diferidos y golden master intacto.

> **C05.e/C09.a — continuación verificable del 16 de octubre de 2026:** se retomó desde HEAD `6732ca35508be63e85a71ea9816d6760957df7bd` (CI [38857690381](https://github.com/javierdario48-star/ATRIA/actions/runs/38857690381) 3/3). El ECG dejó de recalcular historia con la FC actual: ahora conserva un registro de muestras de **4,5 segundos a 125 Hz**, scroll a velocidad temporal fija, sin jump al variar FC, sin segundo RAF ni timer. Código ECG/QA independiente en `e7f75bd1b1cd22a176b1b9a3b35871f166db199c`, CI [38860570446](https://github.com/javierdario48-star/ATRIA/actions/runs/38860570446) **completed/success 3/3**. `scripts/audit-v5-boundary.mjs` + CI prohiben reintroducir HTML patchers, ejecución clínica en UI y loops paralelos. Avance C09.a: Vega responde *dentro del evento del chat global* mediante un callback clínicamente inerte, sin medicinas ni estudios; no es el tutor avanzado. Archivo guard-session truncado accidentalmente durante la edición: restaurado íntegro y tres cambios necesarios publicados en SHA `3bb63ed97bb25168566d6c22e5f7fd30917e9cff`; nueva CI [38861406394](https://github.com/javierdario48-star/ATRIA/actions/runs/38861406394) verificar conclusión final (el núcleo se observó verde, los demás trabajos seguían corriendo durante el traspaso). **Informe C05.e:** [STEP_05E_HANDOFF.md](STEP_05E_HANDOFF.md). **Informe C09.a:** [STEP_09A_HANDOFF.md](STEP_09A_HANDOFF.md). La regresión histórica incluye bots de 4.8.7 de enfermería, Vega, chat y modalidades; NO certifica su migración V5. Nuevos casos prohibidos. Próxima tarea principal: C07/C08, tutor avanzado C09, voz, guardia y red con autoridad clínica única. HEAD vigente será posterior por documentación: consultar la rama remota.

> **C05.d — ECG dinámico + buscador de indicaciones, 2026-10-16.** Punto de partida `ce829f29837fde923e39f181fc010a26eebf370a`, CI 38855005951 3/3 success. Último SHA de código/QA `aa344f7affedc50de145076130670b1c22b3d258` antes de informes. Implementado ECG educativo real-time sincronizado con FC medida y fase sin salto, 8 morfologías en catálogo con inicialización `caseData.ecg` explícita (CIRR/APP no declaran patologías nuevas), órdenes directas desde monitor con búsqueda, autocompletado, Pistas, veracidad `pending/executed/rejected` por sala. UI usa el mismo RAF y la misma autoridad; no se crea fisiología ni casos nuevos. Revisa [STEP_05D_HANDOFF.md](STEP_05D_HANDOFF.md) para rutas, evidencias y límites. **CI del SHA de código [38856997681](https://github.com/javierdario48-star/ATRIA/actions/runs/38856997681) verificada completed/success 3/3**; preview funcional READY https://night-shift-clinical-ki0whqzld-javierdario4878-7324.vercel.app; los informes son commits posteriores. Próximo trabajo: QA y Android físico del monitor, luego C07/C08 enfermería física. Preservar C04/C05.c, CIRR, APP, chat y teclado.

> **C05.c + C07.b, continuación 2026-10-16.** Punto de partida `90a426d1121ce34d5bfdd0c9b04c1e4ed7a5edd8`, CI [38852518386](https://github.com/javierdario48-star/ATRIA/actions/runs/38852518386) success 3/3. El usuario proporcionó dos capturas del ATRIA antiguo (monitor con lecturas grandes y ondas; menú de acciones circulares sobre paciente), como referencia de jugabilidad, no fuente de scripts. **Último SHA de código antes de documentos: `1949d67ed716d08a6618e469a1278b4001f9416d`.** Se añadió `src/v5/ui/patient-actions.js` para acciones del paciente ancladas al mundo (Hablar/Examinar/Historia/Estudios/Tratamiento/Resolver) que delegan en el controlador clínico existente, sin abrir inmediatamente un modal, y presentación de monitor tipo instrumento separada, con solo lecturas conocidas, trazo explícitamente no diagnóstico y estados verdadero de medición/conexión. QA Chromium en `qa/v5/hospital-interactions-browser.mjs` y contratos `src/v5/ui/bedside-presentation.test.js`. C07.b añadió test de orden compuesta de dos vías + monitor + Ringer + ceftriaxona + metronidazol, sin nuevas políticas. **[Informe autónomo C05.c y C07.b](STEP_05C_HANDOFF.md)**. CI del SHA código [38854505822](https://github.com/javierdario48-star/ATRIA/actions/runs/38854505822) se verificó **completed/success 3/3** (núcleo, navegador y regresión histórica) para el SHA funcional `1949d67`; los informes son posteriores sin cambio funcional. C05 completo (ECG/controles) y C07/C08 completo (enfermería física) continúan pendientes. Siguiente misión: completar C07/C08 respetando la fisiología de CIRR/APP, el teclado y el mapa. No añadir casos. Consultar HEAD actual remoto antes de editar.

> **C07.a actualización tras recuperación de Work — 2026-10-16:** el HEAD al comenzar fue `416fd0547244c5e9d0e1a425944bf8a59f4f636d`, CI [38849042436](https://github.com/javierdario48-star/ATRIA/actions/runs/38849042436) 3/3 aprobada. Se reprodujo RED el fallo de veracidad de un comprobante cuando APP recibía una nueva orden de dosis o vía inválidas mientras el tratamiento idéntico estaba pendiente o ya administrado. La política `src/v5/clinical/app-care.js` ahora valida cada instrucción antes de reutilizar una tarea o comprobante; pruebas positivas, negativas y de orden combinada en `app-care.test.js`. SHA funcional del subconjunto `622fac0c5a7fd1b01a26b3ad1fece771bebf17a7`. [Handoff obligatorio C07.a](STEP_07_HANDOFF.md); el SHA actual será posterior por documentación. [CI de código C07.a](https://github.com/javierdario48-star/ATRIA/actions/runs/38852370464) debe comprobarse antes de darla por verde. **C07 global y C08 física NO están completos**, no hay nuevos casos. Próximo: completar enfermería scanner/ejecución auténtica; respetar C04–C06, teclado/cámara y fisiología específica. El registro histórico de esta sesión de Work debajo sigue siendo válido para sus commits y comprobaciones, pero NO es el último HEAD.

# ATRIA 5.0 — Transferencia autosuficiente de sesión

## 1. Estado real

Sesión de migración de sistemas del 16 de octubre de 2026. Se completó C02,
se implementó C04 para CIRR/APP, el subconjunto C05.a/b de interacción/monitor/historia
y el subconjunto C06.a de anamnesis natural. **La migración integral no está
terminada.** No se añadieron casos ni fármacos para demostrar extensibilidad.

La prioridad vigente es sistemas antes que contenido. CIRR-001 y APP-001 son los
únicos recorridos clínicos completos V5. Los once restantes conservan datos y
estudios compatibles, pero no reglas clínicas completas; no implementarlos.
C03 no se marcó terminado. C05 y C06 globales siguen parciales; enfermería física,
Vega completo, voz, guardia continua, carrera completa y red están pendientes.

## 2. Repositorio, rama y publicación

- Repositorio exacto: `javierdario48-star/ATRIA`.
- Única rama de escritura: `atria-5.0-core-rebuild-experimental`.
- HEAD recibido y verificado al recuperar C01:
  `7dff1e82bb27f3e381c757c8f41f7fe3faf924aa`.
- C02 remoto: `0bb0c7fa2e56b803c2ebc248482f5f61bd9aa239`.
- C04/C05.a remoto: `6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe`.
- C06.a remoto: `3ea74db7f788bd174cb341d0a4be7fa82c021e71`.
- **Último SHA funcional remoto verificado antes de publicar este informe:**
  `52055441920d5e40291c9d0aaec4521a2acfe50c` (C05.b, conserva C06.a).
- Árbol funcional probado/publicado:
  `859a15b6a6143c0aeda78d0b5ce9ef1fb04fd51b`.

Este informe y las evidencias se publican como descendientes del ejecutable
probado, sin cambios funcionales adicionales. La revisión final de integridad
eliminó únicamente un espacio al final de una línea en `ui/clinical-controller.js`;
no cambió expresiones, interfaz ni comportamiento. El hash del propio documento se obtiene
con `git log -1 --format=%H -- docs/migration/CURRENT_HANDOFF.md`; el HEAD vigente
se verifica en GitHub, nunca se presupone a partir de este texto. El chat de
entrega también registra el SHA documental final comprobado. Las pruebas y la
preview siguientes identifican explícitamente su SHA funcional.

## 3. Qué se implementó

**C02:** matriz de 30 contratos, clasificación con hashes de 73 módulos originales,
prioridad actualizada en plan maestro e inventario de los trece casos. Es un
inventario de equivalencia pendiente, no una certificación de todos los sistemas.

**C04:** selección anatómica SVG y alternativa accesible por botones; técnica,
resultado y registro separados. Hallazgos originales CIRR/APP por órgano. Glasgow
ocular/verbal/motor independiente; total parcial si falta un componente. Completar
examen requiere impresión general y las cuatro técnicas abdominales realmente
hechas; examinar tórax no completa abdomen y palpar abdomen no explora bazo.
No se ejecutan tratamientos ni se avanza fisiología al examinar.

**C05.a:** pacientes y monitores son entidades con UID/cama/hitbox del mundo.
Toque inequívoco, rango V5 conservado de 150 px, aproximación al objetivo lejano
consumida una vez/cancelable. Cámara/teclado/orientación no definen hitboxes.
Monitor diferencia desconocido, medido, conectado, desconectado y registro final.
Abrir no mide/conecta; medición puntual no conecta; desconectar congela lo conocido.
Historia muestra evidencia adquirida y estados reales de estudio/administración/
reevaluación/cierre. Paneles reutilizables y controles estables entre refrescos.

**C06.a:** perfiles efectivos originales de ambos casos; preguntas ALiCIA,
compuestas, antecedentes, síntomas, repreguntas y sensación subjetiva según el
estado real. Contexto por paciente y una sola conversación global. Saludos no
ocultan preguntas; duración conserva el síntoma previo; vocabulario de apetito
no oculta preguntas explícitas sobre dolor. Mención Enfermera/Vega prevalece sobre
foco anterior. Las respuestas desconocidas son visibles; preguntar no mide,
reevalúa, explora ni trata. La historia presenta dimensiones/relato obtenidos.

## 4. Arquitectura y rutas

Mundo → selección UID/proximidad → controlador UI → router/autoridad única →
puerto clínico existente → política de caso. El renderer dibuja/proyecta. La UI
presenta y emite comandos, no muta fisiología. Los recibos conservan paciente,
evento, actor y tiempo. Las lecturas observacionales no son otro motor.

Rutas canónicas bajo `src/v5/`:

| Responsabilidad | Módulos |
|---|---|
| Entidades, pantallas originales y hitboxes | `engine/{interactions,bedside-layout}.js`, `app/world.js` |
| Proyección original/canvas | `render/hospital.js` |
| Examen y vocabulario | `clinical/physical-exam.js`, `clinical/exam-contract.js` |
| Lecturas originales neuro/dolor/tendencia | `clinical/patient-observations.js` |
| Medición/monitor | `clinical/observations.js` |
| Entrevista y perfiles | `clinical/patient-dialogue.js`, `clinical/patient-profiles.js` |
| Políticas y sesión existentes | `clinical/{cirr-care,app-care,guard-session}.js` |
| Enrutamiento y autorización | `core/{speech-router,room-authority}.js` |
| Coordinación de paneles | `ui/clinical-controller.js` |
| Representación clínica | `ui/{clinical-panels,examination-panel,render-content}.js` |
| Lifecycle único | `app/application.js` |

Estado de evidencia: `p.examFindings`, `p.examLog`, `p.glasgow`,
`p.lastVitalsKnown`, `p.procedures.monitor`, `p.intentHistory`, `p.interview`. No usar el
estado fisiológico privado como sustituto de una medición. Los comandos y
comprobantes canónicos siguen siendo la autoridad; no añadir otra cola/chat/puerto.

Se eliminaron tablas de examen y matchers de anamnesis duplicados, importación
APP→CIRR para nombres y variación de UI mediante reemplazo del HTML de CIRR.
Se reutiliza sin modificar el clasificador puro original de anamnesis y los otros
módulos puros permitidos por `scripts/build-v5.mjs`. El runtime no depende de
vendor, HTML generado, integración histórica, QA, eval o búsqueda/reemplazo de
cadenas HTML. Los scripts de caracterización QA sí leen el original efectivamente
construido, exclusivamente para comparar comportamientos.

Listado completo por checkpoint, incluidos tests/build/CSS/workflow:
[`changes.json`](../evidence/migration-session-2026-10-16/changes.json).
Informes específicos: [STEP_02](STEP_02_HANDOFF.md), [STEP_04](STEP_04_HANDOFF.md),
[STEP_05](STEP_05_HANDOFF.md), [STEP_06](STEP_06_HANDOFF.md).

## 5. Pruebas y CI

- Recuperación C01: [38841164329](https://github.com/javierdario48-star/ATRIA/actions/runs/38841164329), **completed/success, 3/3**; no fallo inicial pendiente de resolver.
- C02: [38844274519](https://github.com/javierdario48-star/ATRIA/actions/runs/38844274519), **completed/success, 3/3**.
- C04/C05.a: [38845430021](https://github.com/javierdario48-star/ATRIA/actions/runs/38845430021), **completed/success, 3/3**.
- C06.a: [38847059492](https://github.com/javierdario48-star/ATRIA/actions/runs/38847059492), **completed/success, 3/3 trabajos**.
- C05.b/último ejecutable: [38848167010](https://github.com/javierdario48-star/ATRIA/actions/runs/38848167010), **completed/success, 3/3 trabajos**, SHA `52055441920d5e40291c9d0aaec4521a2acfe50c`.

Verificación local del último código funcional:

- `test:v5`: **137/137**, cero fallos/omitidos; `test:v5-core`: **39/39**.
- Examen original efectivo: **40 comparaciones** (técnicas, dolor original,
  tendencia de signos, hipotensión, hipoxemia, taquipnea).
- Diálogo original efectivo: **2 perfiles exactos, 20 respuestas comparadas**.
- Monitor original efectivo: **16 posiciones/indicadores**, ocho pantallas del
  arte y ocho fallbacks desplazados, sin derivar lo esperado del hitbox V5.
- CIRR nativo: 4 escenarios/.55 s preparación; APP nativo: 5 escenarios/Ringer
  .8 s/antibióticos 1.5 s, sin duplicados; ninguna cinética nueva inventada.
- Builds `build:v5` y `build:v5-core` aprobados e independientes. El game actual
  incluye 68 archivos; core valida sus nueve módulos distribuidos.
- Chromium real: navegación desktop/Pixel/landscape; teclado/cámara, ambo,
  boot/foco, estudios, hospital/examen/monitor y diálogo. CIRR y APP completos en
  UI tras las correcciones: **100/100, 133 XP por caso**, administraciones reales,
  estudios con tiempo real, consulta distinta de cirugía y XP persistido una vez.
- `npm test` histórico ejecutado localmente con exit 0 durante Fase A y aprobado
  completo en CI C06.a y C05.b. Ninguna prueba eliminada, desactivada o debilitada.
- Los 73 módulos inventariados conservan SHA-256. Golden master protegido.

Driver local Playwright 1.58.2, Chromium real 153.0.8010.0; CI usa Node 22 y
Chrome instalado. Pixel/Android es **emulación**, no certificación de dispositivo
físico. No hay prueba Android/iOS física nueva ni prueba multijugador independiente
V5. Evidencias JSON permanentes: [carpeta](../evidence/migration-session-2026-10-16/).
Artifacts más completos de navegador/distribuciones están en las corridas Actions
(retención 14 días); los contratos/scripts y resúmenes quedan en Git.

## 6. Previews y alcance efectivo

- C04/C05.a `6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe`, READY:
  https://night-shift-clinical-bwfecjjv2-javierdario4878-7324.vercel.app/ .
  Prueba pública: portada/lobby/guardia, panel del paciente sin signos conocidos,
  selección anatómica, rechazo de palpación lejana sin acreditarla, regreso al lobby.
- C06.a `3ea74db7f788bd174cb341d0a4be7fa82c021e71`, READY:
  https://night-shift-clinical-17f62zm28-javierdario4878-7324.vercel.app/ .
  Prueba pública: portada/lobby/guardia; caminar por pasillos, tocar paciente lejano,
  aproximación automática a B1 y panel con signos desconocidos; Interrogar,
  «Hola doctor, ¿toma alcohol?» contestada, fiebre negada y repregunta «¿Y desde
  cuándo empezó?» manteniendo la negación; historia solo con alcohol/fiebre,
  signos/examen/Glasgow/intervenciones todavía desconocidos; seleccionar abdomen
  sin explorarlo y realizar únicamente palpación con ascitis original.
  [Captura exacta](../evidence/migration-session-2026-10-16/public-exam-3ea74db.jpg).
  Esta prueba además reprodujo el desacople del monitor visible; corregido en
  C05.b, cuya prueba pública final se registra abajo.
- C05.b `52055441920d5e40291c9d0aaec4521a2acfe50c`, READY:
  https://night-shift-clinical-2k0feclvl-javierdario4878-7324.vercel.app/ .
  Prueba pública: portada/lobby/guardia, caminar por mapa, tocar la pantalla visible
  de B1 desde lejos → aproximación → Monitor B1 abierto/desconectado/signos aún
  desconocidos; Medir ahora muestra 108/68, FC 94, FR 20, SpO₂ 96%, 37.2 °C sin
  conectarlo; Conectar muestra monitorización continua; Desconectar conserva
  última medición; retorno limpio al lobby. No se administraron medicamentos ni
  se cerró un caso en ese recorrido público.
  [Captura exacta](../evidence/migration-session-2026-10-16/public-monitor-5205544.jpg).

READY se comprobó mediante despliegue con SHA/ref exactos; no basta para afirmar
prueba funcional. Los recorridos completos de ambos casos y monitores se probaron
localmente/en CI; solo atribuir a la preview lo descrito en esta sección. El
Playwright del contenedor no pudo acceder a la URL pública (ERR_EMPTY_RESPONSE de
red); se usó navegador cloud para la prueba pública. No es evidencia de fallo del
juego ni se requiere ese navegador para ejecutar QA sobre localhost.

Integración Git de previews existente (sin modificar producción): proyecto Vercel
`night-shift-clinical`, ID `prj_trnID7kAMQkegKIKd8Aeqp7oy1gB`, equipo
`team_xpiz2vtzlsOc1ivEIgx12yc6`. Buscar despliegue por SHA y exigir
`meta.githubCommitRef=atria-5.0-core-rebuild-experimental`, SHA exacto, target preview
y READY. No promover a producción ni crear credenciales/backend nuevo. Un sucesor
solo documental puede generar otra URL con el mismo ejecutable; verificar siempre
su metadata y declarar el alcance de prueba efectuado, sin atribuirle pruebas de
otra URL.

## 7. Defectos corregidos, diferencias y riesgos abiertos

Corregidos con pruebas: APP tenía hallazgos positivos de inspección/percusión no
modelados en el original; se muestran sin hallazgo específico. El refresco de
panel perdía foco/pulsaciones: conserva nodos y se prueba Enter y pulsación de
1.2 s. Monitor cerrado se etiquetaba continuo: ahora registro final. Caracterizador
inicial ocultaba dolor/tendencia originales: ahora usa observaciones reales y
40 comparaciones. Interacción lejana se consumía antes de comenzar a caminar:
se conserva mientras haya ruta. QA de reloj usaba ancla incorrecta con teclado:
se corrigió su navegación sin tocar reloj/cámara ni eliminar aserciones.

C05.b corrigió un error de extracción espacial: `v40MonitorPoint` era una capa
anterior sustituida por `cs413-monitor-walk-v4_1_3`, con posiciones reales del arte.
El E2E inicial clicaba el propio hitbox y ocultaba el error. Se reprodujo en preview,
se añadieron 16 comparaciones del último original efectivo y el E2E ahora toca
el punto de la pantalla independientemente. No se cambian mapa ni proximidad.

C06 corrigió crédito falso de inicio por saludo y de migración por intensidad,
así como las tres regresiones de lenguaje documentadas en STEP_06. Respuestas
clínicas originales conservadas; solo hechos realmente obtenidos otorgan crédito.
No hay fallo de test conocido abierto en el código publicado a fecha del cierre;
revisar CI vigente antes de asumirlo en otra sesión.

Límites conocidos que no se presentan como completos:

1. C05: ECG/ondas, todos los controles originales, transporte físico a estudios,
   varias camas/pacientes activos a la vez; los hitboxes tienen contratos de ocho
   camas, pero la guardia actual selecciona **un paciente**.
2. C06: solo perfiles/contratos CIRR/APP. No comprensión arbitraria de español ni
   cobertura declarada de los once casos pendientes.
3. C07/C08: scanner/órdenes nativas parciales ya existentes, sin enfermería física
   completa, retención/dependencias/confirmaciones universales ni ordenación
   completa de acciones combinadas. No añadir una segunda cola.
4. C09/C10: Vega acepta foco/mención, pero tutor clínico completo pendiente; voz
   deshabilitada hasta usar el mismo dispatch/transcript con dedupe.
5. C11/C12: dos políticas nativas probadas; falta completar interfaces generales
   de mecanismo/caso y complicaciones. No introducir gravedad global ni nuevos
   medicamentos demostrativos. Espironolactona no tiene efecto agudo en signos.
6. C18/C19: un paciente; ledger/XP local por cierre, pero carrera/concurrencia
   entre pestañas/guardia continua aún pendientes.
7. C20–C23: contratos autoridad/replica existentes; transporte social, presencia,
   WebRTC/chat/movimiento/cooperativo/competitivo V5 no integrados ni probados con
   2/3/4 clientes. Los modos están deshabilitados de forma explícita.
8. C24/C25: certificación física, paridad global y promoción final pendientes.
9. Presentación del transcript: las confirmaciones clínicas que no son anamnesis
   siguen usando la etiqueta Enfermera, incluso el resultado de examen manual;
   se observó «Abdomen: Abdomen» en esa línea. No altera el registro/actor del
   comprobante ni administra nada, pero debe pulirse al separar voces/confirmaciones
   de C07/C08. No se certifica esa narración como equivalencia completa.

## 8. Trabajo interrumpido y cambios no publicados

No hay implementación clínica esencial dependiente de archivos temporales o de
un agente anterior. Todo el ejecutable descrito está publicado en `5205544`.
Los informes/evidencias de este cierre se publican como sucesor documental.
No quedan cambios de implementación sin publicar; las capturas y JSON de este
informe están versionados junto al traspaso, sin depender de scratch ni artifacts
temporales para recuperar el trabajo.
No se inició código de C07/C08 ni de las otras fases; no hay que recuperar parches
ocultos para continuar. Al recuperar, confirmar limpieza con `git status` y comparar
contra el HEAD remoto por si otra sesión publicó avances posteriores.

La diferencia con la petición integral es explícita: esta sesión llegó a C06.a,
no completó todas las fases A–E. Los subconjuntos C05/C06 se etiquetan parciales.

## 9. Invariantes protegidos

No modificar `main`, producción, credenciales, backend estable,
`vendor/atria-4.8.6/**`, ramas históricas ni las referencias:

- `atria-5.0-compact-keyboard-preview` @ `0b36884fa4a879d49c588fa8f3f262a535dd3070`.
- `atria-5.0-recovery-before-approved-ui` @ `646a0ab3f19991ce4e4c4239760db6bfb17c18a1`.

Conservar mapa/sprites originales, teclado compacto de cuatro filas, integración
chat/ocultar/mostrar, cámara centrada en región jugable, movimiento estable, ambo
sin teletransporte, un lifecycle/RAF y limpieza. No reconstruir C01. No buscar/
reemplazar HTML histórico para migrar, copiar scripts monolíticos, añadir motores
paralelos o confirmar ejecución por reconocimiento textual. Fisiología, estudios,
intervenciones, mediciones, consulta y cierre son estados distintos. XP exactamente
una vez; observaciones y recibos por UID/evento. No cambiar reglas clínicas sin
referencia y pruebas; documentar errores originales corregidos.

## 10. Próximos pasos y aceptación

1. Recuperar HEAD/CI y leer los informes; ejecutar baseline. Si CI falla,
   distinguir producto de infraestructura y resolver antes de ampliar alcance.
2. **Próximo checkpoint C07/C08, Fase B:** caracterizar solo lo necesario de
   `src/clinical/nurse-scanner-487.js`, `src/integration/nurse-execution-487.js`,
   `nurse-native-journey-487.test.js`, `nurse-receipt-veracity-487.test.js` y
   `manual-monitor-iv-487.js` en la misma carpeta, más QA de órdenes combinadas.
   Leer matriz e inventario. No auditar todo otra vez.
3. Crear pruebas de dosis/unidades/vías, negación, secuencia, preparación, acceso
   venoso y dependencia; una orden sin acceso queda pendiente/rechazada según el
   comportamiento original, nunca administrada por reconocimiento. Recibos de
   paciente/evento exactos y confirmación solo tras ejecución.
4. Integrar una única cola canónica en autoridad/puerto y conectar al NPC/UI/chat
   existentes; positivo/negativo desde Chromium móvil, varios pedidos sin cruce de
   UID, CIRR/APP completos y sin XP doble. Enfermería física requerirá mundo/tiempos
   reales; no afirmar C08 completo con timers o texto de éxito solamente.
5. Después Vega/Aprendiz (estable no trata por inactividad), contratos clínicos
   extensibles sin nuevos casos, voz, guardia/progresión y finalmente red con
   clientes independientes. No saltar a la incorporación de C13–C17.
6. Publicar checkpoints seguros exclusivamente experimental con lease/fast-forward,
   CI completada, preview de SHA identificado, STEP/STATUS/CURRENT_HANDOFF y
   reproducción suficiente. No parar por cada pequeño commit para pedir permiso.

## 11. Recuperación y comandos

```sh
git clone --branch atria-5.0-core-rebuild-experimental --single-branch https://github.com/javierdario48-star/ATRIA.git
cd ATRIA
git fetch origin atria-5.0-core-rebuild-experimental
git rev-parse HEAD
git status --short
npm run test:v5
npm run test:v5-core
node qa/v5/characterize-cirr-native.mjs
node qa/v5/characterize-app-native.mjs
node qa/v5/characterize-exam-native.mjs
node qa/v5/characterize-dialogue-native.mjs
node qa/v5/characterize-monitor-native.mjs
npm run build:v5-core
npm run build:v5
node qa/v5/navigation-browser.mjs
node qa/v5/keyboard-camera-browser.mjs
node qa/v5/boot-focus-browser.mjs
node qa/v5/hospital-interactions-browser.mjs
node qa/v5/clinical-clock-browser.mjs
node qa/v5/patient-dialogue-browser.mjs
node qa/v5/studies-browser.mjs
node qa/v5/cirr-browser.mjs
node qa/v5/app-browser.mjs
npm test
```

Primero terminar build, después iniciar QA navegador; no modificar `out-v5` durante
una sesión que lo sirve. El harness sirve distribución local en puerto aleatorio.
Configurar `PLAYWRIGHT_MODULE_PATH` y `CHROMIUM_EXECUTABLE_PATH` si no están en la
ruta estándar. Driver reproducible de CI: Playwright 1.58.2, Chrome del runner;
no se necesita una herramienta privada. Para comprobar CI usar GitHub Actions del
SHA real (la rama puede avanzar). API `GET /repos/javierdario48-star/ATRIA/branches/
atria-5.0-core-rebuild-experimental` y `actions/runs?head_sha=<SHA>`.

Leer obligatoriamente también `docs/ATRIA_50_MIGRATION_MASTER_PLAN.md`,
`docs/migration/STEP_01_HANDOFF.md`, `docs/ATRIA_50_HANDOFF.md`,
`docs/ATRIA_50_CORE_REBUILD.md`, `STATUS.md`, `PARITY_MATRIX.md`,
`PHASE_A_IMPLEMENTATION.md` y los STEP nuevos. Los documentos antiguos conservan
historia; este archivo/STATUS y la orden actual de no añadir casos rigen la secuencia.

Manual: entrar Solitario, seleccionar CIRR o APP, caminar hasta B1 por los pasillos,
tocar paciente/monitor. Examen: elegir región, técnica y comprobar registro. Monitor:
abrir desconocido, medir, conectar/desconectar, comprobar historia. Conversación:
preguntar fiebre/vómitos y «¿Y desde cuándo empezó?»; preguntar dolor al comer y
antecedentes con saludo; nunca se completa evaluación/tratamiento por hablar.

## 12. Prompt listo para continuar

Continúa implementando ATRIA 5.0 en GitHub `javierdario48-star/ATRIA`, solo rama
`atria-5.0-core-rebuild-experimental`. No hagas otra auditoría general ni añadas
patologías: CIRR-001 y APP-001 bastan. Verifica HEAD remoto y su CI antes de editar;
no presupongas que sigue en el último SHA funcional registrado
`52055441920d5e40291c9d0aaec4521a2acfe50c`. Lee el plan maestro, STATUS,
CURRENT_HANDOFF, STEP_01/02/04/05/06 y los handoffs generales. C02 está completo;
C04 tiene examen anatómico/Glasgow CIRR/APP; C05.a pacientes/monitores/historia y
C06.a diálogo natural están publicados y probados, pero C05/C06 globales y las
fases siguientes siguen parciales. Retoma C07/C08: caracteriza parser, órdenes
combinadas, dosis/vías/negaciones, preparación/dependencias y ejecución física
original de enfermería; crea pruebas y conecta una sola cola a autoridad/puerto,
mundo y chat existentes. Confirma solo acciones realmente ejecutadas con UID/
evento. Conserva mapa/sprites/teclado de cuatro filas/cámara/movimiento/ambo,
fisiología específica y limitaciones originales, relojes, recibos y XP único.
Protege main/producción/backend/credenciales/vendor y las dos ramas históricas.
No motores ni chats paralelos, éxito por texto ni parcheo de HTML. Prueba Chromium
móvil real, regresión CIRR/APP completa y suite histórica; diferencia emulación de
Android físico. Avanza autónomamente por checkpoints seguros, publica solo
experimental, verifica CI y preview exactos y actualiza STEP/STATUS/CURRENT_HANDOFF
incluso si queda trabajo incompleto. Este informe contiene recuperación y contratos;
no necesitas el historial privado de ningún agente.
