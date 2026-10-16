# ATRIA 5.0 — C08.b1: ejecución clínica tras llegada física de enfermería

## 0. Alcance y punto de recuperación

**Repositorio**: `javierdario48-star/ATRIA`. **Rama exclusiva**: `atria-5.0-core-rebuild-experimental`. Sin cambios a `main`, golden master o V4.

**Inicio remoto verificado**: `725ea84be57f70ce0011c8e208c39c7cdf307601`; CI [38864870367](https://github.com/javierdario48-star/ATRIA/actions/runs/38864870367) **completed/success 3/3** antes del cambio.

**Último SHA funcional y de pruebas anterior a los documentos**: `e6898301bf5019f4a23c7b757792bd89b9437f7a`. La ejecución asociada es [38908299609](https://github.com/javierdario48-star/ATRIA/actions/runs/38908299609): verificar estado final de los tres trabajos al retomar; esta primera versión del informe no la declara aprobada mientras esté ejecutándose. HEAD posterior será documental.

**Alcance honesto**: conectar físicamente **monitor y vías**; cuando una orden combinada APP pide simultáneamente vías, monitor y fármacos intravenosos, estos últimos esperan acceso real y recién entonces entran en la preparación farmacológica **existente**. No se implementaron nuevos medicamentos, casos o motores.

## 1. Comportamiento implementado

`src/v5/clinical/guard-session.js` acepta un adaptador opcional `nursing` con solo tres funciones de frontera: `enqueue(task)`, `takeArrivals()` y `accept(result)`.

1. La autoridad existente `createRoomAuthority` autentica al actor, selecciona paciente correcto, interpreta y valida el tipo de intención; **no se modifica**.
2. El **mismo** puerto nativo `createNativeClinicalPort` recibe `procedure.request/iv`, `procedure.request/monitor` o `monitor.set/connect`. Cuando está habilitado el adaptador espacial de V5, **no ejecuta** todavía `care.execute`. Encarga un trayecto al dispatcher C08.a y devuelve `pending`, con evento y UID originales.
3. El `world.step(dt)` **único** sigue moviendo a la enfermera dentro del mapa y detecta llegada a `bed.approach`. `guardSession.finishNurseArrivals()` solo consume llegadas reales emitidas por el mundo.
4. La llegada invoca `care.execute` de CIRR/APP **una sola vez**, con el mismo evento validado y el reloj clínico actual. Un resultado nativo `executed` no se inventa: el puerto lo valida y distribuye `clinical.completed`. Después se confirma la tarea espacial por `eventId`/`patientUid`. Si se rechaza, sigue siendo rechazo.
5. Para APP, `therapy.request` de **Ringer, ceftriaxona o metronidazol** indicado durante el recorrido de una vía queda pendiente (previa validación de dosis/vía mediante `parseAppDose`). **Después de la confirmación real del acceso**, se llama al ejecutor APP existente: los relojes de preparación **0,8 s para Ringer** y **1,5 s para antibióticos** se inician ahora, nunca cuando la enfermera todavía camina. Una orden con dosis errónea se rechaza al momento de solicitarla y no queda colgada.
6. Una orden de cierre/derivación se rechaza con `nursing-work-in-progress` mientras haya intervenciones espaciales o medicaciones esperando vía.
7. La deduplicación, el historial de chat y los comprobantes paciente/evento siguen perteneciendo a la autoridad y el puerto existentes. No se añadió segunda cola clínica, reloj o ejecutor.

`src/v5/app/application.js` conecta los tres métodos espaciales ya expuestos por `world.js` al crear guardia, y llama `finishNurseArrivals()` desde el `maintain` del **mismo FrameScheduler/RAF**. No crea timers ni escucha manual el texto para ejecutar una terapia.

## 2. Pruebas añadidas o reforzadas

`src/v5/clinical/physical-nursing.test.js` usa realmente `createWorld(content)`, 6 NPC existentes, mapa, colisiones y guard-session/puerto nativo, y prueba:

- Monitor CIRR permanece desconectado antes de llegada y registra signos conocidos después de un comprobante real, exactamente una vez.
- Dos vías APP permanecen en cero mientras la enfermera camina, luego son registradas solo desde `care.execute`.
- Una orden con vía+monitor serializa viajes del mismo paciente (no apila NPC).
- Una orden combinada de dos vías, monitor, Ringer 500 ml, ceftriaxona 1 g y metronidazol 500 mg mantiene todo `pending`; tras llegada verifica valores, tiempos, administración y comprobantes.
- Dosis inválida en medio del desplazamiento se rechaza sin administración.
- Alta/derivación rechazada mientras hay trabajo de enfermería pendiente.
- Reintentar el mismo mensaje no duplica trabajo ni recibos.

`qa/v5/hospital-interactions-browser.mjs`: al conectar monitor desde su dispositivo toca acción pública, verifica que **todavía no está conectado** mientras la enfermera viaja; luego espera conexión auténtica, ECG y lectura.

`qa/v5/app-browser.mjs`: desde UI pública comprueba la existencia del NPC asignado y que vía y monitor no aparezcan ejecutados antes de llegada, luego valida administración clínica, fluidoterapia, consulta y cierre.

**No se suprimieron tests antiguos** ni se modificaron las políticas nativas de dosis, farmacocinética o fisiología de CIRR/APP.

## 3. Problemas que aún NO deben declararse terminados

- C08.b1 **solo conecta monitor y vías**, con dependencia farmacológica APP. Otras tareas de enfermería —oxígeno, estudios, consultas, medicamentos administrados físicamente fuera de esos casos, rescate, transporte, administración venosa completa con materiales— no tienen todavía un planificador físico conectado.
- Las órdenes dependientes de IV se difieren cuando ya hay una tarea IV válida pendiente. Si el texto solicita un fármaco IV *antes* de indicar el acceso en la misma orden, esa situación todavía debe caracterizarse con el parser histórico y definirse antes de ampliar C07.
- `createGuardSession` conserva el comportamiento clínico directo en los tests unitarios que intencionalmente no inyectan adaptador espacial; **la aplicación jugable sí inyecta C08.b1**. La siguiente migración debe aumentar gradualmente los E2E espaciales sin destruir las pruebas puras del ejecutor.
- No se añadió visual de preparación ni iconos flotantes para enfermería, ni se cambió el monitor ya aprobado.
- La plataforma conserva CI del juego antiguo solo como regresión: **no significa que multijugador, voz, chat flotante o Vega avanzado hayan sido portados**.
- No se agregan casos clínicos hasta completar sistemas. Pendientes C07, resto C08, C09 avanzado, voz, guardia multipaciente, modos sociales y multijugador 2–4 clientes.
- Si Vercel bloquea nuevos despliegues por cuota diaria, no usar una preview vieja y atribuirle este código. Diferenciar SHA exacto del código, SHA documental y preview READY.

## 4. Próximo paso mínimo

Terminar C08.b con órdenes de tratamientos que exijan trabajo físico, cancelación/rechazo observable, UX sobre enfermera y medicación; comprobar paridad de las combinaciones del bot `qa/nurse-combinatorial-bot-487.mjs` sin importar ningún `apply-487`. Después completar C07 y C09.b. Mantener el código sencillo: añadir funciones al adaptador ya existente cuando sea suficiente, nunca otro parser, autoridad o fisiología.

## 5. Prompt autónomo para otro agente

Continuá ATRIA 5.0 en GitHub `javierdario48-star/ATRIA`, rama única `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/CURRENT_HANDOFF.md`, `STATUS.md`, `STEP_08A_HANDOFF.md` y `STEP_08B_HANDOFF.md`; verifica HEAD, CI y preview matching SHA. C08.b1 conectó `world.step` y `guardSession.finishNurseArrivals` para que monitor/IV solo se ejecuten cuando una enfermera llegue a la cama; un APP con dos vías+monitor+Ringer+ceftriaxona+metronidazol espera IV confirmada antes de iniciar las preparaciones originales. Verifica tests y CI completa (el último SHA funcional de esta etapa era `e6898301bf5019f4a23c7b757792bd89b9437f7a` antes de documentación). No declares C08 completo: quedan otras tareas físicas, parser completo, UI avanzada, Vega y red. Nunca introducir parches, motor paralelo, nueva enfermedad ni falsas administraciones. Publica siguientes commits con tests navegador/CI, deja reporte y continuidad.
