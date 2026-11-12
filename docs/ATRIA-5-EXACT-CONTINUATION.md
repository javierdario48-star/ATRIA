# ATRIA 5.0 — CONTINUIDAD EXACTA PARA CHATGPT

## Checkpoint vigente · 12 de noviembre de 2026

Continúa en `javierdario48-star/ATRIA`, rama exclusiva `atria-5.0-core-rebuild-experimental`. Verifica el HEAD remoto. La reanudación partió de `cf998be4f98b2026794bcbeb16347113a675a473` y verificó el código hasta `3fd2c40797aeffb182baa4cb9f9c967f8548744f`. El HEAD de entrega es el commit que contiene este checkpoint. Lee `AGENTS.md`, el [inventario maestro](ATRIA-5-REMAINING-TASKS.md) y el [contrato clínico](ATRIA-5-CASE-INTEGRATION-CONTRACT.md). [Commits y archivos técnicos](https://github.com/javierdario48-star/ATRIA/compare/cf998be4f98b2026794bcbeb16347113a675a473...3fd2c40797aeffb182baa4cb9f9c967f8548744f)

| Commit | Evidencia y comportamiento |
| --- | --- |
| `7eed9e2` | `guard-runtime.js` crea los créditos según la participación al cerrar. Dos cuentas reales en Cooperativo cobraron 40 XP al médico activo durante la ausencia. El médico que regresó mantuvo 0 XP por ese cierre y recibió 40 XP por el siguiente. |
| `62c57f2`, `8fb4d1f` | Alta insegura con mensaje de Vega y débito único. La reevaluación de salida se aplica al paciente cuando el alta es válida. Mantener en observación registra evaluación y deja la atención activa. Los 55 casos conservaron el estado inmediato y la misma evolución que sus controles tras 60 segundos. |
| `adfa5e9`, `0f1c09a`, `55120c9` | Separación de antecedentes en 12 GI, restauración de los hashes históricos de 25 y 55 casos y 550 entrevistas del catálogo jugable con 8.250 turnos. La incertidumbre de un acompañante aporta cero hechos clínicos. |
| `9a14b00` | CARD-01, CARD-08, CARD-10 y RESP-07 prueban rechazo con evidencia insuficiente y recepción urgente tras el hallazgo objetivo. La impresión incompatible tiene factor diagnóstico 0. El tratamiento definitivo queda a cargo del servicio receptor. |
| `d260564` | `studies.js` conserva el informe inicial y avisa cuando el modelo carece de un informe de control. Cinco gasometrías con valores de referencia producen muestras nuevas. Cuatro protocolos conservan su informe basal. Se reprodujo la falsa segunda radiografía de RESP-07 al minuto nativo 3,72 tras descompresión confirmada. |
| `33f85e3` | La matriz inicial detectó que el rival distante podía recibir el expediente de una cama liberada. El control de propiedad y proximidad protege el historial registrado. ACAL-001 repitió el recorrido competitivo negligente de 1.440 s con integridad correcta. En preview el dueño recibió 40 XP tras la salida del rival. |
| `bc543cd`, `3fd2c40` | Rueda compacta cuando la radial invade la pantalla horizontal. Cinco vistas en Chromium, acceso por teclado y acompañante. Audio verificado en los cuatro modos, con crossfade de 2,5 s, silencio de 250 ms y preferencias persistentes. |
| `e50db97`, `22f34f3`, `9db7037` | RESP-56 pasó por el importador, la selección, anamnesis, Vega, Enfermería, muestras, guardado, cierre y XP en los cuatro modos. El catálogo jugable alimenta la matriz, los bots de Vega y la auditoría de cierres. CI conserva las filas fallidas para diagnóstico. |

### Verificación ejecutada

- `npm run test:v5` 3.137/3.137, `npm run test:v5-core` 40/40. Builds V5, V5 core y 4.8.7 aprobados. La auditoría estructural verificó 190 módulos, un RAF y el límite de la autoridad clínica. El grafo de 487 importaciones internas analizadas tuvo cero ciclos.
- 55/55 cierres guiados por Vega y auditoría de 91 destinos. Pasaron 17 pruebas del importador, 127 de estudios, cierre y Vega, y 61 de autoridad durable y recompensas. Chromium verificó 440 paneles en 110 admisiones, diálogo automático, pistas, estudios, recuperación y audio. El ensayo local de dos cuentas sobre `7eed9e2` alcanzó 1.440 s y extendió el mismo turno en 1.456 s de pared.
- El preview Cooperativo pasó siete comprobaciones con dos cuentas reales. El guion inicial recibió 409 al liberar la cuenta después de revocar la sala. La repetición usó Finalizar participación desde la interfaz antes de probar revocación y pasó. Las comprobaciones de XP cooperativa y Competitivo se ejecutaron en el preview de `33f85e3`. En Supabase Preview se verificaron RLS y ejecución exclusiva del servidor en los RPC de recuperación y XP. [Preview de recuperación](https://night-shift-clinical-luxtlufi1-javierdario4878-7324.vercel.app) · [Preview de XP y Competitivo](https://night-shift-clinical-ji1g3ogbs-javierdario4878-7324.vercel.app)
- Se verificó el archivo histórico de 550 recorridos y nueve perfiles contra su código. Incluye 295 destinos aceptados, 69 muertes nativas y 186 casos vivos abiertos. Su evidencia estricta suma 160 certificados. La matriz vigente se programó para 550 recorridos con el digest `40ccd89da316dd66e9420eb3b48776dc7fcfdc1c22907ec68f24934780d6ac2e`. Los ocho trabajos seguían en cola al comprobarlos. [Matriz longitudinal vigente](https://github.com/javierdario48-star/ATRIA/actions/runs/43289556288)

### A. Tareas para ChatGPT normal

1. **LAB-01.** Abre `src/v5/clinical/studies.js`, `src/v5/content/packs/respiratory-pack.js` y `study-orders.test.js`. La siguiente modificación es declarar un informe de control basado en evidencia fisiológica y procedimiento confirmado para RESP-07. Antes de modelarlo, revisa la información disponible para expansión y posición del tubo. Repite la secuencia muestra basal, descompresión o drenaje confirmado, control y recuperación. Conserva los UID, eventos, tiempos y el texto original. Revisa PEF, lactato y el control de coagulación con prerrequisito de trombólisis según el mismo contrato.
2. **CLOSE-01 y SAFE-01.** Lee los artefactos de la matriz por SHA y revisa los casos que no acreditan atención competente. Reproduce cada causa con el evaluador, `consultation-evidence.js` y los recibos existentes. Usa [el contrato de admisión](ATRIA-5-CASE-INTEGRATION-CONTRACT.md) para cualquier definición nueva.

### B. Tareas que requieren ejecución o dispositivo

- Confirma los ocho trabajos de la matriz vigente y los 550 recorridos. Usa el digest exacto y conserva los fallos de integridad y de atención por separado. Ejecuta `node qa/v5/clinical-integral-ci-shard.mjs 0 8 --verify-only` para comprobar el manifiesto en un checkout.
- Acepta Android físico y WebKit. Prueba teclado, volumen, rueda en pantalla corta, tres opciones de recuperación, dos sesiones y transferencia de control con red móvil. Repite el turno completo en preview si se requiere aceptación de reloj en despliegue.

DIALOG-AUTO-01 requiere una pregunta y una respuesta automática con fuente coherente. VEGA-AUTO-01 requiere una pulsación, confirmación de visualización, 5% por pista nueva y repetición gratuita. VEGA-COHERENCE-01 exige leer los recibos y justificar todo control repetido. Cada bloqueo indispensable debe explicarse clínicamente y aparecer en Vega. Conserva una autoridad clínica, una ruta de recibos y un sistema de XP. La observación activa y el alta insegura dejan al paciente recuperable.

## Checkpoint anterior · 12 de noviembre de 2026

Rama única `atria-5.0-core-rebuild-experimental` de `javierdario48-star/ATRIA`. HEAD inicial `cf13ec52a71452b0a921d22d921a3476382f6b39`. La reanudación encontró `ebba52e99eb05188ab15e92872647f71b1c2705b` en GitHub y los checkpoints locales posteriores intactos. HEAD de código verificado `3dc13907e84b69b9367a3cc28a0be9035c7138af`. El commit documental inmediato está en la [rama remota](https://github.com/javierdario48-star/ATRIA/tree/atria-5.0-core-rebuild-experimental).

Lee el [inventario maestro](ATRIA-5-REMAINING-TASKS.md), el [traspaso histórico](ATRIA-5-CHATGPT-HANDOFF.md), `AGENTS.md` y el [contrato clínico](ATRIA-5-CASE-INTEGRATION-CONTRACT.md). [Commits y archivos de esta ejecución](https://github.com/javierdario48-star/ATRIA/compare/cf13ec52a71452b0a921d22d921a3476382f6b39...3dc13907e84b69b9367a3cc28a0be9035c7138af)

| Commits | Resultado y módulos |
| --- | --- |
| `faf1f00`, `36bf20f` | El alta insegura registra la decisión, conserva el caso abierto, aplica un débito de hasta 15 XP una vez por médico y paciente y libera la asignación competitiva. Seguimiento y signos de alarma mejoran la calidad en los casos GI revisados. `clinical/guard-session.js`, `guard-runtime.js`, `progression.js`, `gastro-closure-v5.js`, `server/clinical-reward.js` y panel de cierre. |
| `97ef4f9`, `4ca7286`, `a245215` | Angio-TC resuelve por protocolo explícito, conserva adquisiciones aórtica y pulmonar y pide aclaración para tórax ambiguo. Conserva la etiqueta certificada de sangrado de LGIB-001 y rechaza controles y técnicas ausentes. `clinical/study-order-vocabulary.js`, `ui/clinical-autocomplete.js`. |
| `ebba52e` | Enfermería pregunta por alimentación oral en los cinco casos que declaran ayuno. Registra la decisión en el recibo nativo y restaura la última indicación. `acute-care.js`, `speech-router.js`, `clinical-controller.js`. |
| `8ea6be9`, `f35ba43`, `9404669` | El primer 409 perdía la única sincronización de recuperación. La salida activa también podía esperar indefinidamente un recibo. Se reintenta la misma solicitud dentro de un plazo. Después, X y Escape vuelven al lobby y una respuesta tardía queda vinculada a la decisión original. `ui/guard-recovery.js`, `app/application.js`, `social/durable-cooperative-replica.js`. |
| `a6fdc9d`, `81fd2da` | Directorio distingue disponible, en guardia y desconectado. Las coordenadas de guardia se entregan a miembros autorizados. La vista clínica reutiliza las proyecciones ya calculadas. `account-gateway.js`, `presence-storage.js`, `room-membership-store.js`, `guard-runtime.js`. |
| `69a5a1f` | Revelación privada por médico y encuentro, con 50% sobre el XP del cierre después del factor de selección y del descuento de Vega. La impresión registrada es independiente. `clinical-hint-ledger.js`, `guard-session.js`, `ui/case-debrief.js`, RPC existente. |
| `84af64f`, `3dc1390`, `2b2cd4a` | Interacción con acompañante declarado y contexto de repreguntas por médico e interlocutor en NEUR-06. La pregunta sobre antecedentes familiares desconocidos recibe una respuesta de incertidumbre, sin crédito de anamnesis. El marcador y la ruta clínica comparten la columna superior izquierda. `patient-dialogue.js`, `patient-actions.js`, `web/game.css`. |

### Validación ejecutada

- `npm run test:v5` **3.062/3.062** en el HEAD de código. `npm run test:v5-core` 40/40. Builds V5, V5 core y 4.8.7 aprobados. `audit-v5-boundary.mjs` pasó en 190 módulos. Seis archivos históricos ejecutados y aprobados.
- Auditoría de 55 casos y 91 destinos. 55/55 recorridos dinámicos con Vega. CHOLE e ILEO cerraron con atención y aceptación documentadas. Las pruebas de DIVERT, HEPAT y PUD compararon alta válida con y sin seguimiento. La regresión competitiva verificó la reasignación del mismo paciente. En Pixel 5 emulado, el alta insegura bajó el saldo de 48 a 33 XP, la repetición mantuvo 33 XP y el paciente respondió en el mismo encuentro.
- Chromium con dos cuentas locales aisladas y SQLite CAS verificó chat, enfoque A→B, una orden con ACK perdido, recuperación y los permisos del participante. Los dos sentidos de chat tardaron 336 ms y 586 ms entre el ACK y el mensaje visible del colega. La prueba de recuperación forzó conflictos iniciales y de salida. También mantuvo una petición activa sin respuesta y confirmó regreso al lobby con la misma referencia y XP después del plazo de 12 segundos.
- En `a6fdc9d`, dos cuentas Chromium con reloj real alcanzaron 1.440 segundos y abrieron el turno 2 con los mismos pacientes después de las dos confirmaciones. El ensayo local finalizó a los 1.446 segundos de pared. El recorrido integrado de recuperación también pasó con reloj acelerado. Cuatro modos ejercitados en navegador local entre los guiones de recuperación y pistas.
- Pixel 5 emulado verificó el acompañante de NEUR-06, las pistas, la revelación diagnóstica y la recuperación. El marcador quedó alineado con el HUD en cinco vistas Chromium, incluidas Android horizontal y vertical. WebKit y dispositivo físico siguen pendientes.
- Se aplicaron `20261112030000_unsafe_discharge_rewards.sql` y `20261112133500_diagnosis_reveal_rewards.sql` a `atria-clinical`, la base del Preview. Pasaron 504 comprobaciones PostgreSQL con rollback (28 alta, 388 pistas y revelación, 16 muerte, 72 selección). El RPC conserva acceso exclusivo del servidor y RLS en los recibos. Aplica las migraciones en ese orden antes de activar la acreditación de esta versión en otro entorno.
- Vercel confirmó READY para el [Preview de código](https://night-shift-clinical-1pj1cpl23-javierdario4878-7324.vercel.app). El cliente HTTP de este entorno agotó la conexión al dominio de Preview. Las pruebas nuevas con dos cuentas se ejecutaron en el servidor local. La comprobación de admisión 403 en el proveedor quedó registrada en el checkpoint anterior.

## A. Tareas para ChatGPT normal

1. **ANAM-01, próxima acción.** En `src/v5/content/legacy-patient-variation.js`, reproduce DIVERT-001 con «¿Qué enfermedades tenía antes de que empezara este problema?». `withPatientVariation` usa `anamnesis.historySummary` como antecedente y esa cadena coincide con el motivo actual en 12 casos históricos. Conserva la fuente explícita de antecedentes y amplía las variantes simuladas irrelevantes para el cuadro. Antes de cambiar el catálogo compuesto, incorpora su revisión actual a `clinical-content.js:previousClinicalContents` y verifica una guardia guardada con ese hash. Usa `patient-dialogue.test.js`, `guard-patient-variation.test.js` y `server/durable-guard-authority.test.js`. La regresión mínima comprueba que la respuesta de DIVERT deja de repetir dolor actual y fiebre, con mismo UID, hechos adquiridos y variante al restaurar.
2. **CLOSE-01 y SAFE-01.** Amplía la regresión de `accepted-transfer.test.js` a alta insegura seguida de complicación atribuible y de atención posterior. Usa los recibos de `clinical/receipts.js` y `progression.js`. Conserva aceptación de servicios, estabilidad indispensable, dosis y reacciones reales. Revisa omisiones recomendables y alternativas según el destino.
3. **XP-COOP y MP-01.** En `guard-runtime.js:awardMembers`, `guard-turn-control.js` y `server/clinical-reward.js`, reproduce la diferencia entre guardar y finalizar antes del cierre de un compañero. Añade regresión de créditos ya ganados, derecho a reingresar y nuevas recompensas por médico. Vincula el resultado al recibo de participación y a la membresía existente.
4. **LAB-01, VEGA-COHERENCE-01 y UI-01.** Amplía a controles seriados con adquisición autorada en `studies-policy.test.js` y secuencia pista, orden, recibo y pista en `clinical-hints.test.js`. Si el estudio queda pendiente, la pista debe orientar la espera o una acción distinta. Para la rueda en paisaje de poca altura, reproduce el caso `high < low` en `ui/patient-actions.js:position` y valida en `qa/v5/guard-score-browser.mjs` con el teclado y la ruta abiertos.

## B. Tareas que requieren Work o validación externa

- Verificar el mismo SHA del Preview. Ejecutar `qa/v5/shared-guard-preview.mjs` con dos cuentas, incluidos aislamiento 401/403/404, recarga, guardado, finalización y `V5_REAL_TURN=1`. Repetir con Competitivo y verificar asignación, acreditación individual y cambio de control.
- Aceptar Android físico. Reproducir las tres decisiones de guardia y un corte de red al guardar. Medir envío, autoridad, recibo y primer texto visible para paciente, Vega y Enfermería. Probar teclado, barra superior, recepción, chat, volumen y autocompletado de ecografía y troponina.
- Aplicar y comprobar las migraciones de recompensas por entorno. Mantener los permisos del servicio y usar transacciones revertidas con cuentas QA para verificar XP.

## Reglas de aceptación

Un solo envío de DIALOG-AUTO-01 genera una respuesta veraz y acorde con conciencia y personalidad. VEGA-AUTO-01 muestra una pista tras un toque, con confirmación de visualización y 5% por pista nueva. VEGA-COHERENCE-01 lee el estado solicitado, pendiente, ejecutado e informado. Repetir una acción exige justificación temporal o fisiológica.

La decisión de alta insegura conserva al paciente recuperable y aplica un solo débito. Una omisión menor afecta calidad o XP. Cada requisito indispensable para resolver el caso debe tener evidencia y una orientación accionable. Conserva la autoridad clínica, los recibos de XP, el aislamiento, el historial de estudios y la selección directa existentes.

## Historial de ejecuciones anteriores

<details>
<summary>Entregas anteriores y evidencia por SHA</summary>

## Punto de partida

Continúa en `javierdario48-star/ATRIA`, rama exclusiva `atria-5.0-core-rebuild-experimental`. Verifica primero su HEAD remoto. Work partió de `20be3574bace0a2dd3ca6cb6487e08bf958871d4`. El último commit técnico publicado es `27d4ede757f615fd91e6f89fdffc880b5a94ad8f`. El commit que contiene este bloque cierra la entrega. Su SHA se obtiene del HEAD remoto o de `git log -1 --format=%H -- docs/ATRIA-5-EXACT-CONTINUATION.md`. Integra cualquier avance posterior mediante fast-forward.

Lee [el inventario maestro](ATRIA-5-REMAINING-TASKS.md), [el traspaso](ATRIA-5-CHATGPT-HANDOFF.md), `AGENTS.md`, [la arquitectura](ARCHITECTURE.md) y [el contrato clínico](ATRIA-5-CASE-INTEGRATION-CONTRACT.md). El registro conserva 20 áreas, los números 1–60 y sus cruces. Los checkpoints debajo del registro vigente acreditan sus respectivos SHA.

**Primera acción ejecutable.** En DIVERT-001, Work reprodujo una alta con TC, diagnóstico, examen y reevaluación en la que `followup` era el único requisito pendiente. Vega lo identificó. La orden natural produjo un recibo y habilitó el alta. En `gastro-expansion-policies.js` y `gastro-closure-v5.js`, contrasta si esa trayectoria requiere que el consejo sea indispensable. Si corresponde tratarlo como calidad, conserva su recibo y ajusta el criterio del destino. Agrega el recorrido y un control de alta insegura a `closure-requirements-audit.test.js` o `accepted-transfer.test.js`.

## Entrega de Work del 11 de noviembre de 2026

| Commit publicado | Resultado | Archivos |
| --- | --- | --- |
| `a8fe551460da53d66f93d1cec5b634efacf54633` | La restricción SQL rechazaba las claves que el adaptador ya intentaba persistir. El SQL previo reprodujo `23514`. La migración autoriza exactamente los formatos de sala y miembro. La aceptación usa inserción condicional por clave primaria, incluida la importación de caché. | `src/v5/server/supabase-account-store.js`, `supabase-social-room-persistence.test.js`, `src/v5/social/room-membership-store.js`, `supabase/migrations/20261111220000_atria_v5_social_room_keys.sql` |
| `ceaa90075547cc19015dd66b76c4ae7a3ab9e2e5` | La sala social caduca a las seis horas y elimina claves al consultarse. Cerrar es terminal. Si el anfitrión sale explícitamente, el miembro promovido ocupa su lugar y el antiguo pierde acceso. La guardia clínica duradera conserva su propia recuperación. | `src/v5/social/room-membership-store.js`, `room-membership.test.js`, `src/v5/server/supabase-account-store.js`, `supabase-social-room-persistence.test.js`, `qa/v5/shared-guard-preview.mjs` |
| `4a5e67c13ddffe1a1b43f800fe87b1a51de67e53` | CHOLE conserva ecografía, cobertura, reevaluación y recepción quirúrgica. Ayuno cuenta como preparación y calidad. ILEO estable mantiene descompresión, soporte y ayuno para sala. La recepción urgente usa la inestabilidad simulada y la preparación ejecutada de esta semilla. La TC describe ausencia de isquemia/perforación y una consulta de valoración sola no acredita cirugía ni autoriza quirófano estable. | En `src/v5/clinical/`: `accepted-transfer.test.js`, `additional-case-care.js`, `chole-care.js`, `clinical-risk.js`, `consultation-evidence.js`, `gastro-closure-v5.js`, `gastro-expansion-policies.js`, `surgical-consultation.js` |
| `c1e25c0bd5de34bffc1bf5d0c55c37e0fd03a786` | LAB-01 resuelve primero el panel local, conserva PCR molecular separada y reconoce región y contraste explícitos de TC. Cada adquisición registra minuto nativo. La proyección publica el informe al completarse. Una gasometría de control tras VNI conserva la muestra anterior y su evento tras restauración. | `src/v5/clinical/guard-session.js`, `guard-session.test.js`, `studies.js`, `study-order-vocabulary.js`, `study-orders.test.js`, `src/v5/content/packs/cardiology-pack.js`, `qa/v5/studies-browser.mjs` |
| `dd5490bf77a78b442a3d318b421100c5c123dec7` | La prueba de aislamiento de preview usa un visitante con credencial social propia, manteniendo las dos cuentas Supabase de la guardia. | `qa/v5/shared-guard-preview.mjs` |
| `27d4ede757f615fd91e6f89fdffc880b5a94ad8f` | CARD-09 resuelve la PCR documentada en el informe del panel certificado que consumen servidor y navegador. NEUR-08 conserva su PCR molecular por separado. | `src/v5/clinical/study-order-vocabulary.js`, `study-orders.test.js`, `qa/v5/studies-browser.mjs`, `src/v5/content/packs/cardiology-pack.js` (se retiró el alias redundante del archivo de autoría) |

El criterio de handoff modela la transferencia de responsabilidad. La preparación, la recepción y el procedimiento conservan recibos distintos. Las guías consultadas sustentan la cirugía temprana en colecistitis y el manejo conservador de la obstrucción adhesiva sin datos de isquemia o deterioro. [WSES colecistitis](https://doi.org/10.1186/s13017-020-00336-x) · [WSES obstrucción](https://doi.org/10.1186/s13017-018-0185-2)

## Evidencia ejecutada

Entorno de verificación con Node 24, dependencias del lockfile y Chromium con Playwright. El preview autenticado requiere la bandera experimental y las credenciales Supabase de servidor ya configuradas. La migración de claves debe preceder a la activación del adaptador de salas en cada entorno.

- `npm run test:v5` pasó 3.027 pruebas sobre el commit técnico final, con cero fallos y cero omitidas. También pasaron las 238 pruebas del lote dirigido, las 622 sociales y de servidor, los cinco archivos de regresión V4 y las 40 de `npm run test:v5-core`. La prueba Supabase solicitada pasó 6/6 en el checkout final.
- `npm run build:v5` compiló 216 archivos. `npm run build:v5-core` validó 27 módulos. `node scripts/audit-v5-boundary.mjs` validó 189 módulos. El catálogo ejecutó 55 casos y 91 destinos declarados. El bot de Vega cerró los 55 casos.
- Chromium local aprobó diálogo, pista de una pulsación y repetición gratuita, diagnóstico y estudios con reloj real, incluido el panel certificado de CARD-09. Dos procesos autenticados aprobaron 11 comprobaciones, incluidas selección A→B, recibo perdido, dosis única y la extensión con reloj acelerado.
- En el preview `20be357` el guion agotó la espera de invitación antes de aplicar la migración. Con el mismo despliegue y el esquema corregido entraron dos cuentas Supabase y compartieron chat, examen y órdenes. En el preview `ceaa900` ambos recargaron y recuperaron la misma sala y paciente. El intento de registrar una tercera cuenta recibió 429. Una prueba HTTP independiente con identidades QA autenticadas pasó 401/403/404, mensajes, salida, bloqueo del reingreso revocado y cancelación. Un visitante externo recibió 403 al observar la guardia clínica existente.
- La migración se aplicó a `atria-clinical`, usado por Preview. PostgreSQL aceptó ambos formatos nuevos y rechazó claves mal formadas. RLS sigue activa. `anon` y `authenticated` carecen de lectura y escritura directa en la tabla. El preview técnico `27d4ede` quedó READY y 48 archivos desplegados coincidieron por SHA-256 con el build, incluido el catálogo certificado. [Preview de código](https://night-shift-clinical-rbzabax26-javierdario4878-7324.vercel.app/)

## A. Tareas para ChatGPT normal

1. **CLOSE-01 y SAFE-01.** Ejecuta primero la acción de DIVERT-001 indicada arriba. Sigue con PUD y CELIAC. Usa evidencia, diagnóstico, estabilidad y destino del evaluador existente. La regresión mínima contrasta alta válida, alta insegura y pista accionable.
2. **LAB-01.** En `study-order-vocabulary.js`, `studies.js` y los packs, revisa solicitudes ambiguas de angio-TC aórtica versus pulmonar. Cubre CARD-08 y RESP-05 con dos IDs y evidencia separada. Si falta técnica o control documentado, pide aclaración o indica la limitación. Agrega a `study-orders.test.js` una prueba de alias y de dos muestras distintas con evento y minuto.
3. **NUR-01 y ANAM-01.** En `core/speech-router.js`, `clinical/guard-session.js` y `patient-dialogue.js`, reproduce el silencio reportado y agrega la pregunta proactiva sobre alimentación como comunicación del flujo existente. Regresión mínima con un recibo, alergias y decisión de ayuno, seguida de restauración. FAM-01 conserva fuente acompañante y necesita una interacción visible cuando el caso declare informante.
4. **MP-01 y XP-COOP.** Contrasta estado ocupado en `ui/lobby-directory.js`, `server/account-gateway.js` y `social/cooperative-link.js`. La prueba mínima simula entrada, presencia atrasada y regreso al lobby. Conserva créditos cooperativos existentes, dueño en Competitivo y recibos de `server/clinical-reward.js`. Define elegibilidad de débitos al abandonar una guardia y animación por recibo con casos de dos médicos y reintento.
5. **DX-REVEAL.** Reutiliza `clinical-hint-ledger.js`, `guard-session.js:rewardFor` y `ui/case-debrief.js`. Prueba revelación, recarga, repetición gratuita y penalización única de 50% combinada con pistas. La impresión escrita por el médico sigue siendo evidencia independiente.

Los cambios de esta sección se pueden preparar y publicar por GitHub. Indica qué pruebas se ejecutaron y cuáles quedaron escritas para CI o Work. Conserva el resto del inventario y su trazabilidad.

## B. Tareas que requieren Work o validación externa

- Correr el guion completo `qa/v5/shared-guard-preview.mjs` con dos cuentas tras recuperar cuota de registro. Ejecutar Competitivo y la extensión a 24 minutos reales. Comprobar que ambos médicos puedan guardar, recargar y finalizar, que los recibos sigan únicos y que el tercero quede fuera.
- Probar Android físico con dos cuentas. Confirmar primera respuesta, pista única, búsqueda VEDB, persistencia del editor, controles de Enfermería, recepción, música, marcador y regreso al lobby.
- Medir tiempos con varias repeticiones de mensaje, pista, selección y guardado. Separar entrega de red, transacción y pintado de los tiempos clínicos. La caducidad social y limpieza por consulta se aceleraron en Node. Las salas caducadas sin reconsulta quedan pendientes de limpieza física. La recuperación clínica tiene su propio contrato.

## Reglas permanentes de aceptación

DIALOG-AUTO-01 requiere una respuesta visible tras un envío con historia, personalidad y conciencia coherentes. Atribuye el relato indirecto al acompañante. VEGA-AUTO-01 requiere una pulsación con verificación, confirmación de visualización, descuento único del 5% para una pista nueva y repetición gratuita. VEGA-COHERENCE-01 exige leer el estado solicitado, pendiente, ejecutado o informado y el motivo clínico de cualquier repetición.

Cada bloqueo de cierre debe expresar una necesidad clínica comprobable y ser orientable por Vega. Trata las medidas recomendables como calidad cuando corresponda. La clínica, estudios, pistas, Enfermería y multijugador consumen la misma autoridad y sus recibos. Conserva el motor V4, la selección directa, el aislamiento de salas, el orden de las migraciones y el acceso de servidor a los datos. Haz cambios pequeños, reproduce primero y verifica el HEAD remoto al terminar.

## Historial de ejecuciones anteriores

Las referencias y las instrucciones que siguen registran los SHA de sus sesiones.

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

## Checkpoint MP-01 (11-11-2026)

Partida desde `e92c351eaa36d6e47a6613a5c29bfb5a1cf802e6`, sin commits posteriores. Se preservaron las correcciones recientes de Work sobre diálogo automático, Vega, PANC-001, Enfermería y diagnóstico.

La causa probable del 403 de invitados tras aceptar invitación es la falta de persistencia multiinstancia de `qa-v1:room:<uuid>` y `atria-v5:room-member:<uuid>:<qa_id>`: `createPersistentSocialStorage` persistía únicamente claves de cuenta/contactos, mientras `pollRoom` interpreta 403/404 como pérdida definitiva de acceso. No desactivar RLS ni relajar autorización: la lectura de membresía continúa mediada por `createV5QaSocialServer`.

Commits: `23e92efa7d1fb40ea9b145e472c82e51ceeae92d` (claves durables de sala/miembro) y `e6d06dff6d755dae481f27546eda333137e1a2b9` (regresiones de aceptación, nueva instancia, aislamiento y salida). Tests **escritos y publicados, no ejecutados**. Próxima acción: ejecutar `node --test src/v5/server/supabase-social-room-persistence.test.js` y pruebas sociales, build, dos cuentas reales; verificar limpieza/TTL. Después continuar CHOLE-001, ILEO-001 y LAB-01. No alterar criterios permanentes DIALOG-AUTO-01, VEGA-AUTO-01, VEGA-COHERENCE-01.

</details>
