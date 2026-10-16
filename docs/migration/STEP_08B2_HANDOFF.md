# ATRIA 5.0 — C08.b2: medicación y procedimientos físicos bajo la autoridad existente

## Recuperación

- Repositorio: `javierdario48-star/ATRIA`.
- Rama exclusiva: `atria-5.0-core-rebuild-experimental`. No se modificó `main`, V4, producción ni `vendor/atria-4.8.6/**`.
- HEAD de partida y baseline aprobado: `7362495b56f84f931ca814d13f0e4d0176125927`, CI [38908595448](https://github.com/javierdario48-star/ATRIA/actions/runs/38908595448), **3/3 success**.
- SHA del último código funcional y QA **antes de este informe**: `9ea89e005c422cef82fab6cc9506e78ab0d886a1`.
- CI de dicho SHA: [38923169786](https://github.com/javierdario48-star/ATRIA/actions/runs/38923169786). Verificar conclusión de los tres trabajos; la CI seguía en marcha al iniciar esta documentación. El HEAD final documental será descendiente de ese SHA. **No declarar 3/3 sin revisar el run exacto**.

## Implementación real

- Se extendió **el mismo** `src/v5/clinical/guard-session.js`; no se creó un segundo motor farmacológico, una cola paralela de tratamiento ni un nuevo RAF. `createRoomAuthority`, `createNativeClinicalPort`, `world.step`, `createNurseDispatcher` y `care.execute/advance` conservan sus funciones originales.
- **APP-001**: Ringer 500 ml, ceftriaxona 1 g y metronidazol 500 mg se aceptan como `pending` mientras la enfermera camina. Si no existe vía ni está solicitada, la autoridad rechaza la terapia IV; si hay una vía auténticamente solicitada, espera la colocación. Cada medicamento recibe luego **su propio trayecto a la cama**, y recién al llegar ingresa a la preparación de `createAppCare`, con los tiempos originales **0,8 y 1,5 segundos**. El efecto sobre PA, FC y FR de los cristaloides continúa en `native-app.js`; las dos antibioterapias no inventan efectos agudos.
- **CIRR-001**: espironolactona 100 mg oral y paracentesis terapéutica también esperan llegada real antes de iniciar los **0,55 segundos** de `createCirrCare`. La paracentesis conserva sus cambios fisiológicos caracterizados; espironolactona no produce cambios agudos ficticios.
- La dosis/vía se valida ANTES de reservar el trabajo físico, reutilizando `parseAppDose` y `parseCirrDose`. La administración previa confirmada retorna comprobante nativo reutilizado sin simular un segundo tratamiento. Los reintentos del mismo mensaje no duplican administración.
- La enfermera mantiene el puesto `at-bed` mientras el ejecutor nativo prepara el tratamiento. Solo `care.advance`, después del plazo real, emite el **recibo terminal**; el mismo `port.complete` comunica el evento a la sala y entonces `nursing.accept` libera el NPC. Llegar no significa administrar.
- Cuando una orden compuesta contiene vía/monitor/fármacos, se conservan UIDs/eventIds, la exclusión por cama y el orden de tareas. La derivación o alta se rechaza mientras existan tareas físicas pendientes.
- Se conservaron intencionalmente inmediatas las **conductas no físicas** ya representadas como tales: restricción dietética de sodio CIRR y ayuno APP. No se equiparan a una administración de medicación.

## Pruebas y evidencia

- `src/v5/clinical/physical-nursing.test.js`: a través del mapa y sesión reales valida (1) vía antes de fármacos, (2) monitor, (3) orden APP combinada de vías/monitor/Ringer/ceftriaxona/metronidazol, (4) reloj de cada preparación solo después de presencia, (5) CIRR espironolactona/paracentesis, (6) dosis incorrectas, (7) recibos finales, (8) reintentos, (9) disposición prematura.
- `qa/v5/cirr-browser.mjs` y `qa/v5/app-browser.mjs`: actualizados para afirmar que la medicación **aún no está en preparación** mientras se acerca el NPC. Se mantienen los recorridos completos hasta cierre/XP.
- `qa/v5/clinical-clock-browser.mjs`: una pausa de 1,2 s en el hilo de render antes de enviar una orden no puede acortar el viaje ni adelantar la preparación; exige aceptación `pending`, NPC en movimiento y cero administraciones antes de llegar.
- En el primer intento CI el test antiguo de IV esperaba administración tras 1,6 s incluso sin traslado; se corrigió la **aserción** para exigir llegada real, sin reducir seguridad. El navegador antiguo también esperaba `pendingTreatments` inmediatamente: ahora esa colección solo se llena cuando `care.execute` empieza efectivamente la preparación en la cama.
- `scripts/audit-v5-boundary.mjs` sigue impidiendo parches HTML legacy, imports del ejecutor desde UI, segundos RAF o temporizadores.
- CI exacta: [38923169786](https://github.com/javierdario48-star/ATRIA/actions/runs/38923169786). Repetir/verificar antes de declarar gate final.
- Preview funcional correspondiente al SHA de código `9ea89e`: https://night-shift-clinical-dpufwmxxc-javierdario4878-7324.vercel.app (Vercel informó READY). Esto **no acredita prueba física en Android** ni asegura que el SHA documental se haya desplegado.

## Paridad deliberadamente pendiente

La caracterización del antiguo `src/integration/nurse-native-journey-487.test.js` y `qa/nurse-combinatorial-bot-487.mjs` revela más operaciones: oxígeno, procedimientos, conexiones/desconexiones, gestión de varios pacientes, órdenes con tratamientos ANTES de la vía, solicitud **automática** de acceso IV cuando se indica un fármaco que lo requiere, repetición en secuencias y chat flotante. C08.b2 NO implementa esas partes. Tampoco migra aún Vega avanzado, voz, hospital multipaciente, 2–4 clientes ni casos adicionales. No afirmar paridad por el éxito de los tests históricos ejecutados sobre V4.

Existe una decisión de secuencia importante para C07: el caso APP actual requiere vía ya colocada o pedida. No simular automáticamente canalización hasta caracterizar el contrato de confirmación/errores del original y poder observar el trabajo real.

## Próxima tarea y recuperación autosuficiente

Primero verificar CI y preview del HEAD más reciente. Si alguna prueba falla, resolverla sin modificar la fisiología o silenciar la prueba. Después completar la política de órdenes combinadas de C07/C08: dependencias fuera de orden, acceso IV automático autorizado cuando corresponda, oxígeno y otros procedimientos que tengan motor clínico respaldado, múltiples pacientes y recibos robustos. No agregar nuevos casos, no importar `src/integration/apply-487.js`, conservar un solo ejecutor y documentar los fallos explícitamente.

**Prompt de continuidad:** «Retoma `javierdario48-star/ATRIA` rama `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/{CURRENT_HANDOFF,STATUS,STEP_08B2_HANDOFF}.md` y los handoffs C08.a/b1. El SHA funcional C08.b2 previo a informes es `9ea89e005c422cef82fab6cc9506e78ab0d886a1`. Verifica la CI [38923169786](https://github.com/javierdario48-star/ATRIA/actions/runs/38923169786), evita afirmaciones no verificadas. APP Ringer/ceftriaxona/metronidazol y CIRR espironolactona/paracentesis ya requieren llegada NPC real; el mismo native care inicia preparación, port confirma y libera enfermera. Mantén mapa, teclado, monitor ECG, paciente contextual y cierre XP. Continúa C07/C08 restante (oxígeno, dependencias de IV, órdenes fuera de secuencia), luego C09, voz y multijugador. No crear casos nuevos ni parches. Al terminar escribe un checkpoint con pruebas, SHA, CI y preview realmente verificados.»
