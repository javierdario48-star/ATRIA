# ATRIA 5.0 — C11.b: prevalidación atómica de órdenes compuestas

## Recuperación comprobable
- Repo: `javierdario48-star/ATRIA`. Rama EXCLUSIVA: `atria-5.0-core-rebuild-experimental`.
- Baseline: `14a69334d0df741f18600810e1dd427cdc73ca5c`, [CI 38977432674](https://github.com/javierdario48-star/ATRIA/actions/runs/38977432674) verde 3/3, mismo ejecutable certificado que C07.e/C08.d.
- Commit inicial de autoridad y tests: `e907466c9b7067141efdaec8e43cc84a528830db`.
- Bot de navegador público APP: `58b53cfb8ca6110f40087395ec7822b95e8fc3c2`. Ajuste al selector real de chat `#chatHistory`: `6f3a29640e65978b936a93fc991708d7b82ba9a2`.
- Último código funcional de este checkpoint: `56fc352d4c2f0f95056834dd5c7eeed8632fed7f` — condición de oxígeno activo antes de permitir una suspensión dentro del lote.
- CI del código final: [38979412510](https://github.com/javierdario48-star/ATRIA/actions/runs/38979412510), **verificación pendiente en este punto**. No afirmar 3/3 sin comprobar cada job. CI preliminar núcleo de `e907466c` verde.
- Preview nueva Vercel: no comprobada; en C08.c había cuota 402 diaria. Sin prueba Android físico.

## Problema reproducido
`routeWardSpeech` reconoce una cadena con varios actos, y la autoridad `createRoomAuthority` ejecuta uno por uno. Antes de C11.b una orden como `Enfermera monitor y ceftriaxona 2 g` podía despachar la primera intervención mientras la segunda retornaba `unsupported-dose`, dejando un efecto parcial accidental. Del mismo modo, un fármaco no migrado podía seguir a una acción válida. No se exige al motor que revierta un monitor o fármaco ya administrado; se impide iniciar el lote inseguro.

## Cambios mínimos en la arquitectura existente
1. `src/v5/clinical/guard-session.js`: la sesión entrega `validateClinicalBatch(intents)`, función síncrona y sin efectos, acoplada al formulario nativo de los únicos casos ejecutables APP-001/CIRR-001. Controla soporte real del tratamiento, dosis/vía IV mediante `parseStandardIVDose`, régimen oral CIRR mediante `parseCirrDose`, oxígeno nasal mediante `parseNasalOxygenFlow` y existencia de oxígeno activo para `therapy.stop/oxygen`. No crea catálogos, farmacocinética, log ni motor alternativo. Reutiliza una sola fuente de autoridad. `routeReason` proporciona una explicación visible al jugador.
2. `src/v5/core/speech-router.js`: después del parser legado único y del planificador de vías `planNursingIVAccess`, pero **antes** de devolver acciones ejecutables a la autoridad, invoca la función de preflight solo para lotes mayores de una acción. Si hay error, produce `routeError:'unsafe-compound-order'` e `intents:[]`, por lo que la autoridad no invoca ningún procedimiento. En sesiones sin callback (futuro multijugador), el comportamiento previo no cambia ni se afirma seguridad no instalada.
3. No se modificaron `room-authority.js`, `native-medications.js`, `cirr-care.js`, `app-care.js`, `nurse-dispatcher.js` ni la UI aprobada.

## Pruebas agregadas
- `src/v5/clinical/physical-nursing.test.js`: lote `monitor y ceftriaxona 2 g` para ambos casos → error global, sin viaje, acceso, monitor, terapia, ni recibo. Pruebas `Ringer 500 ml + ceftriaxona 2 g`, `dos vías + Ringer 300 ml + monitor`, `monitor + morfina 4 mg` no migrada, `monitor + máscara de oxígeno` rechazan todo. Control válido Ringer/ceftriaxona/metronidazol mantiene vía automática y trabajos reales independientes. Retry del mismo commandId no ejecuta; una orden única inválida mantiene `unsupported-dose`. En suspensión combinada de oxígeno inactivo, no conecta monitor; suspensión aislada mantiene `oxygen-not-active`.
- `src/v5/core/room-authority.test.js`: una autoridad con callback de validación demuestra que una combinación inválida NO llama al puerto; el motor `coop` sin callback conserva flujo actual hasta futura migración.
- `qa/v5/app-browser.mjs`: chat real en pantalla móvil emulada APP; orden de monitor + dosis inválida, mensaje visible en `#chatHistory`, cero monitor conectado y cero antibióticos.
- CI original: los tres jobs `clean-core-contract`, `independent-game-browser`, `preserved-historical-regression` sin modificar.

## Límites y pendientes obligatorios
- Es **integridad de orden**, no sistema universal de seguridad clínica: no modelar contraindicación, alergia o interacción sin datos del paciente, eventos y reglas validadas. No inventar cuadros adversos ni beneficios de fármacos.
- La validación C11.b se activa SOLO en la sesión clínica V5 local, para lotes con múltiples acciones; no certifica voz, red ni habitaciones multijugador. En monoacciones se preserva rechazo per-intent.
- No garantiza atomicidad física ante **fallos posteriores al preflight** (ej. imposibilidad de caminar de NPC); cada tarea conserva su recibo y rechazo independiente. El lote completo no constituye una transacción con rollback.
- Prioridad siguiente: caracterizar incompatibilidades y restricciones por datos fiables, resultados clínicos y medicaciones activas; separar rechazo por seguridad de fallo de camino; luego migrar otros sistemas, sin agregar casos nuevos.
- Ninguna preview actual garantizada; no enlazar una antigua como si contuviera C11.b.

## Reproducir
1. Recuperar HEAD remoto `atria-5.0-core-rebuild-experimental`, leer `docs/ATRIA_50_MIGRATION_MASTER_PLAN.md`, `docs/migration/{STATUS,CURRENT_HANDOFF,PARITY_MATRIX,STEP_11B_HANDOFF,STEP_11A_HANDOFF,STEP_08D_HANDOFF}.md`.
2. Confirmar resultado exacto [CI 38979412510](https://github.com/javierdario48-star/ATRIA/actions/runs/38979412510); si falla, leer job logs y reparar sin eliminar aserciones.
3. Correr `npm run test:v5`, `npm run build:v5`, `npm test`, `npm run qa:v5-browser` con entorno Playwright del workflow.
4. Testear tanto que la orden inválida conjunta no tenga efectos, como que APP/CIRR permitan una orden combinada válida y una orden simple inválida dé rechazo nativo.
5. Retomar C11/C12 con mínima complejidad y checkpoints verificables, nunca modificar `main`, `vendor/atria-4.8.6/**`, mapa, cámara ni teclado.

## Traspaso autónomo
> Trabaja en GitHub `javierdario48-star/ATRIA`, rama `atria-5.0-core-rebuild-experimental`, último código `56fc352d4c2f0f95056834dd5c7eeed8632fed7f`, documentación `docs/migration/STEP_11B_HANDOFF.md`. Verifica CI [38979412510](https://github.com/javierdario48-star/ATRIA/actions/runs/38979412510). Preflight puro de órdenes compuestas reutiliza parsers IV/CIRR/oxígeno existentes y bloquea lotes inseguros antes del primer evento. Tests incluyen CI core, navegador APP y V4. No duplicar motor; conserva validación clínica nativa para cada acción y avance C07/C08; caracteriza indicaciones e interacciones solo con evidencia confiable sin casos nuevos. Publica nuevo SHA, CI y handoff.
