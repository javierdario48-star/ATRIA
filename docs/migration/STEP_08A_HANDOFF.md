# ATRIA 5.0 — C08.a: planificador espacial de enfermería, sin ejecuciones ficticias

## Recuperación y alcance

- Repositorio: `javierdario48-star/ATRIA`; **única rama de escritura**: `atria-5.0-core-rebuild-experimental`.
- SHA de partida remoto comprobado: `2aa2532d885c7287a89095c0f862885e560f2e85`. Su CI de cierre [38862871078](https://github.com/javierdario48-star/ATRIA/actions/runs/38862871078) terminó `completed/success` (3/3).
- Etapa anterior: C05.e ECG y C09.a Vega con validación 3/3 en [38862268981](https://github.com/javierdario48-star/ATRIA/actions/runs/38862268981).
- Objetivo C08.a: **crear el dueño único de los trayectos de trabajo de enfermería**, reutilizando actores, rutas, colisiones y fixed step del mundo V5; aislar el estado espacial del tratamiento clínico hasta que la finalización por presencia real esté validada.
- Último SHA funcional/tests antes de los documentos: `abea8cf363e675a20c7894c1676d4e44b198215c`. Consultar HEAD y CI exacta posteriores en Actions; no declarar 3/3 sin comprobar.

## Caracterización del juego original

Se leyeron los contratos existentes del **juego efectivo 4.8.7** en `src/integration/nurse-native-journey-487.test.js` y `qa/nurse-combinatorial-bot-487.mjs` (este último se ejecuta como parte del histórico), además del parser puro `src/clinical/nurse-scanner-487.js`. La prueba antigua confirma que:
1. `queueNurse` crea una tarea, el NPC va a `bed.approach`, y el watchdog de 11,2 s **no la completa**; recién con la tarea realizada se conectan monitor y vías.
2. Las dos vías se registran como **dos accesos** y los medicamentos dependientes de IV no se administran hasta obtener acceso.
3. Repeticiones no generan vías/administraciones adicionales; cada paciente tiene UID y estado distintos.
4. Cada administración es registrada de forma real; la aceptación del chat o una animación no equivalen a tratamiento ejecutado.

Estos comportamientos son **criterios de paridad**, no se importaron los scripts `apply-487`. El antiguo bot es una prueba con VM y fixtures (no Android físico ni evidencia de rutas reales de V5).

## Código migrado C08.a

- **NUEVO** `src/v5/engine/nurse-dispatcher.js`: `createNurseDispatcher({navigation,nurses,patients})`. Todo actor y paciente procede del mundo existente, nunca se crean muñecos o pacientes en el servicio. Las tareas llevan `eventId`, `patientUid`, `kind` y fase `queued → travelling → at-bed → confirmed/rejected`; `cancelled` y `disposed` como estados terminales adicionales. La ruta pasa por `navigation.target`/ `navigation.move` y el mismo mapa de colisiones. Se garantiza un único trabajador activo por paciente para que una orden combinada no apile seis NPC sobre la cama. **Llegada es un evento espacial, no recibo médico.**
- `acceptClinicalResult({eventId,patientUid,status,receipt})` solo confirma una tarea espacial después de `at-bed` y exige concordancia exacta de UID/eventId cuando el resultado sea ejecutado. No altera el paciente ni los medicamentos; la futura integración **debe llamarla únicamente después de recibir un comprobante del puerto nativo, jamás desde un botón o texto cliente**. El manejo de esta concordancia no sustituye autenticación en `room-authority`.
- `src/v5/app/world.js`: en entrada de guardia crea un único dispatcher para las seis enfermeras ya existentes; en `step(dt)` llama al mismo dispatcher con el paso espacial 60Hz y evita patrullas simultáneas de enfermeras asignadas; al volver al lobby o comenzar una nueva guardia descarta viajes y eventos. Acceso interno futuro mediante `enqueueNurseJourney`, `takeNurseArrivals`, `acceptNurseClinicalResult` y `nurseJourneySnapshot`. Por ahora el controlador UI y el puerto clínico NO activan estos métodos: decisión deliberada para no simular vías o fármacos antes de llegar.
- **NUEVO** `src/v5/engine/nurse-dispatcher.test.js`: rutas en mapa, colisiones, etapa previa a llegada, comprobante inválido, reintentos idempotentes, FIFO, puerta cerrada, aborto, dispose y serialización de tareas del mismo paciente incluso con varios NPC.
- `src/v5/app/world.test.js`: en el mapa ATRIA real una enfermera debe encontrar B1, recorrerla y detenerse, negar el resultado temprano y limpiar el estado al reiniciar sin heredar un paciente entre sesiones.

## Qué NO queda completado todavía

C08.a es **infraestructura espacial probada**, no enfermería física clínica ya integrada. No se alteraron los 550 ms de espironolactona/paracentesis CIRR ni las preparaciones nativas de APP y, por ello, los resultados anteriores deben seguir pasando. El comportamiento actual del juego sigue permitiendo conectar monitor y poner vías desde autoridad de inmediato: ese déficit concreto se corregirá en C08.b **con la llegada como prerrequisito real**, antes de afirmar equivalencia con el antiguo.

El siguiente paso debe unir el dispatcher con `createRoomAuthority` y el **mismo** `createNativeClinicalPort`, sin crear executor/fisiología paralelos. Protocolo sugerido, sujeto a pruebas:
1. Primero, prevalidar actor, UID, dosis/vía y negaciones en la autoridad; una indicación válida de monitor/IV crea una tarea `pending`, **sin modificar `nativePatient`**.
2. Las órdenes dependientes de IV quedan pendientes (con dosis ya revisada), nunca rechazadas prematuramente por una vía en ejecución ni dadas por administradas. Una orden sin acceso solicitado puede rechazarse con precisión. Conservar un solo comprobante por evento.
3. El mundo recibe una tarea validada, busca ruta real; al llegar, entrega el evento al **puerto clínico autorizado**, que efectúa `care.execute`. La mera llegada no confirma nada; al recibir el recibo `executed`, `room-authority` publica `clinical.completed` y libera cama/enfermera.
4. Las acciones con preparación farmacológica mantienen los intervalos **desde el momento legítimo de inicio**, no desde la interpretación del texto si la enfermera aún no llegó. La fisiología no puede responder antes del comprobante.
5. Bot V5 obligatorio: varias órdenes, distintos UID, vías/monitor, reintentos y cierres; comparar con el original. Ajustar pruebas del juego para exigir `pending` hasta llegada en vez de silenciar contratos. No introducir casos.

Luego terminar C07, C09.b, C10 voz, C18 guardia multi-paciente, C20–C23 lobby/red/cooperativo/competitivo. La regla de modalidades permanece: cooperativo = solitario compartido; competitivo = primera acción válida toma paciente, rival observa pero no administra ni pide estudios.

## Pruebas y limitaciones de despliegue

En la CI `.github/workflows/atria-v5-core.yml` corren `npm run test:v5`, Chromium emulado Pixel 5, CIRR/APP completos, equivalencia gráfica e histórico `npm test` del original. `scripts/audit-v5-boundary.mjs` impide `apply487`/parches string/RAF y temporizadores paralelos. **No hay prueba manual Android físico en esta etapa.**

Vercel informó anteriormente `402 api-deployments-free-per-day` por superar 100 previews en 24 h; no se debe inventar una preview de C08 ni presentar la versión vieja como nueva. Reintentar al renovar cuota, con SHA coincidente, nunca producción.

## Prompt de transferencia

> Continúa ATRIA 5.0 en GitHub `javierdario48-star/ATRIA`, rama exclusiva `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/{CURRENT_HANDOFF,STATUS,STEP_08A_HANDOFF,STEP_05E_HANDOFF,STEP_09A_HANDOFF}.md`. Recuperá HEAD remoto y CI. C08.a crea `engine/nurse-dispatcher.js` sin otro motor clínico: actor existente, ruta con colisiones reales, cola por paciente y evento de llegada sin administración. **Está intencionalmente desacoplado de la ejecución de las intervenciones** hasta implementar C08.b con validación/recibo vía un solo puerto nativo y con tiempos clínicos correctos. NO añadir casos ni reintroducir parches `apply-487`. Verificar pruebas de rutas, puertas, 6 NPC, CI 3/3 y preservar CIRR/APP. Migrar C08.b honestamente, luego completar C07, C09, voz, guardias y 2–4 jugadores; entregar siempre SHA, CI, preview verificable e informe con límites.
