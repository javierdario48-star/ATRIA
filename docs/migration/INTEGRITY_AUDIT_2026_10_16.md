# ATRIA 5.0 — Auditoría de integridad previa a C21.d / C22

Fecha de revisión: 2026-10-16 (GitHub Actions en UTC del 17/10). **Auditoría de verificación, sin cambios de comportamiento**. Repo `javierdario48-star/ATRIA`, rama exclusiva `atria-5.0-core-rebuild-experimental`. Base exacta de código `14d7ce4e9870c1d380b987c14084edc3a29ca722`.

## 1. Evidencia automática y real

CI completa sobre la base: [workflow 38991574375](https://github.com/javierdario48-star/ATRIA/actions/runs/38991574375) **4/4 jobs en success**:
- `clean-core-contract`: 40/40 tests de núcleo, 250/250 V5, 4/4 adicionales, caracterizaciones V4 CIRR/APP, dosis, monitor, exploración, contraste de daño por fluidos y generación independiente `build:v5` y `build:v5-core`.
- `independent-game-browser`: navegador de aplicación independiente; navegación, teclado compacto, Android emulado, IME, rotación, estudio y resultados, clínica real CIRR/APP con administración, reevaluación, cierre y XP una sola vez.
- `actual-http-multiplayer-browser`: **host Node y 1/2/3 navegadores Chromium independientes**, 2/3/4 actores en Coop/Competitivo con HTTP real. Incluye orden, recibo, snapshots de autoridad, pérdida ambigua tras commit, rechazo de suplantación y re-sincronización.
- `preserved-historical-regression`: regresión completa del legado 4.8.7; no se modificó `main` ni golden master.

**Cobertura NO demostrada:** dispositivo físico Android/iOS; dos dispositivos conectados por internet público; carga masiva; reconexión real del host; 24h continua multipaciente; totalidad de situaciones clínicas reales o farmacocinética universal. Un test verde valida los contratos que prueba, no estas funcionalidades ausentes.

## 2. Arquitectura comprendida (flujo funcional)

`src/v5/app/main.js` -> `createApplication()` es dueño del RAF y listeners, y crea `createWorld()` para caminar/interacciones y `createHospitalRenderer()` para dibujar. El jugador elige caso y modalidad: **UI habilita solo Solitario/Aprendiz**; `world.enterGuard()` y `createGuardSession()` construyen un único paciente nativo y `createRoomAuthority`. El texto pasa por `routeWardSpeech`; `resolveContext` usa proximidad del mundo/UID y menciones NPC. `createNativeClinicalPort` emite intent y ejecución; el ejecutor de CIRR/APP valida vías, dosis, orden, estudio, enfermera con recorrido físico, efecto cuando corresponde y recibos diferenciados `pending/executed/rejected/unconfirmed`. Un solo `advance` controla reloj nativo y fisiología según caso, con `refreshMonitoring` separado como presentación/observación. El cierre produce `clinical.closure`; ledger XP evita doble premio por UID y persiste en localStorage.

Multijugador nuevo: `lobby-coordinator` es directorio/ACL puro; `room-relay-service` es contrato atómico y API test-only en memoria; `room-mailbox` es outbox/ACK/cursor, `room-gateway` host->`room-authority` y cliente->`createRoomReplica`. **No hay todavía integración con `createApplication` ni backend productivo**; el navegador puede entrar al lobby *local*, no al lobby compartido.

## 3. Higiene del código — resultado

- `scripts/audit-v5-boundary.mjs` recorre **todos los módulos JS de producción V5** y prohíbe `apply487`, `replaceOnce`, `document.write`, `eval`, `new Function`, `setInterval`, `setTimeout`, una segunda RAF fuera del dueño de aplicación y dependencias UI -> autoridad/ejecutor. CI verde.
- Inspección adicional de **15 módulos críticos (2.030 líneas)** de aplicación, guardia, clínica, farmacología, backend, lobby, autoridad y relay: **cero** llamadas de parche de texto, evaluación dinámica, temporizadores paralelos, RAF adicional y `TODO/FIXME/HACK` evidentes. No es una auditoría de seguridad de todas las dependencias.
- Las importaciones al legado `../../clinical/case-completion-487.js` y `../../clinical/clinical-clock-487.js` son **reutilización explícita de contratos clínicos**, no modificaciones por búsqueda/reemplazo del HTML. `build:v5` permite solo un conjunto explícito de módulos legados puros.
- Existen archivos de legado con parches por anclas **fuera de V5**. Preservados por regresión: no declararlos inexistentes en el repositorio.
- Orden general razonable: `app/`, `engine/`, `render/`, `ui/`, `core/`, `clinical/`, `adapters/`, `social/` y `content/`; una sola autoridad de mutación clínica. Dos módulos con densidad a vigilar: `application.js` ~264 líneas y `guard-session.js` ~287 líneas; no justifica dividirlos con parches antes de que aparezca una responsabilidad independiente.
- **Falta infraestructura uniforme de lint/format** en `package.json`. No afirmar estilo homogéneo automatizado solo por CI verde. Adoptarla gradualmente sin reformatear todo y mezclar diffs clínicos.

## 4. Cobertura clínica y límites reales

**Solitario / Aprendiz:** tienen recorridos completos con CIRR-001 y APP-001. Están conectados a UI y navegador emulado, pero no certificados manualmente en Android físico. Otros casos listados en `cases.json` no equivalen a casos listos con farmacología.

**Administración clínica:** hay un formulary IV validado para `fluid`, `ceftriaxone`, `metronidazole` con dosis de referencia/recibo y necesidad de vía; nuevas órdenes y reintentos de un mismo ID se distinguen. Enfermería nativa depende de llegada a cama; no dar por administrado lo pendiente.

**Fisiología:** `native-app` reconoce un primer fluido como cambio hemodinámico fijo y el acumulado excesivo como penalidad respiratoria; `native-cirr` utiliza modelo basal más penalidad respiratoria de sobrecarga y leve respuesta de paracentesis. No es modelo dosis-respuesta hemodinámico universal. `crystalloid-overload` deriva exposición **de registros administrados**, no de órdenes. Antibióticos en APP son principalmente evidencia de tratamiento, sin caída inmediata de FC/PA atribuida al fármaco ni cinética antimicrobiana/deterioro tardío; oxígeno nasal deja recibo pero **sin respuesta modelada de SpO2** en estos casos; espironolactona no tiene diuresis/ascitis cinética. Reacciones adversas, sepsis/progresión, shock, rescate y muerte reales permanecen pendientes. `closureSnapshot` transmite `dead:false` y `adverseCount:0`: no presentar cierre actual como aval de simulación completa del daño.

**XP:** idempotente por paciente, guardado en localStorage local, no backend/puntaje por jugador online. `nativeCaseXP` acepta explícitamente solo `solo/apprentice`: **bloquea la conexión de cierre Coop/Competitivo hasta diseñar política XP por jugador**, no extrapolar automáticamente.

## 5. Escala, seguridad y arquitectura móvil — blockers

| Prioridad | Riesgo observado | Puerta de resolución |
|---|---|---|
| BLOCKER online | `createMemoryRoomRelayStore` y `createLobbyCoordinator` son procesos de memoria; las funciones serverless stateless no comparten sesiones ni transacciones | Storage/owner compartido durable, autenticación de cuenta y operaciones atómicas reales; probar reinicios/múltiples instancias |
| BLOCKER clínica compartida | `room-authority.snapshot()` comparte eventos, chat, propietarios y revisiones **pero no el estado clínico completo del paciente** (vitales, monitor, intervenciones, administración/estudios); `createGuardSession` acepta solo solo/apprentice | Una proyección nativa verificable, única y acotada por paciente, sincronización de enfermería y clínica, misma fuente de verdad y UI de guardia 2–4 |
| BLOCKER integridad competitiva | El host navegador puede controlar sus resultados y el backend actual solo retransmite | Propietario confiable de sala y recompensas/XP autenticadas antes de ranking público |
| BLOCKER antitrampas | `lobby-coordinator.join/move` acepta coordenadas cliente dentro de [0,10000] con seq creciente sin validación de velocidad, spawns, colisión o ruta | Validar posición de inicio, velocidad/tiempo y mapa server-side antes de usar movimiento para proximidad clínica o ranking |
| LIMITACIÓN de mensajes | `room-relay-service` limita paquete a ~96KB, retiene hasta 512 mensajes; `room-authority` mantiene hasta 300 eventos/transcript; `room-mailbox` mantiene hasta 128 outbox, IDs hasta 10k. Un gran snapshot puede exceder límite | Proyección compacta por paciente y/o estado inicial + diffs, cuotas, backpressure, checkpoint durable y mediciones reales |
| LIMITACIÓN de rendimiento | `createMemoryRoomRelayStore.transact` clona el estado completo por operación y el servicio cuenta los IDs con `Object.keys` al escribir. No es un benchmark de producción ni horizontalmente escalable | DB transaccional/actor por sala, índices/cursors, métricas p95, carga creciente y coste |
| MÓVIL | Web Canvas + teclado propio es reutilizable, pero aún no paquete Android/iOS y reanudación/background en dispositivos reales | Pruebas físicas, lifecycle/reconexión, latencia, batería y empaquetado gradual |

## 6. Dictamen y próximo trabajo autorizado

**Aprobado como base para seguir, NO aprobado para beta online pública ni para anunciar farmacología completa.** No reconstruir todo, no copiar parches, no introducir casos. Mantener un único canal de escritura clínica y frontend/controlador separados. La prioridad después de este informe es:

1. C21.d: backend de salas compartido con persistencia y atómicas, sin costos innecesarios ni simular un backend con el test store.
2. C22: sincronizar el paciente nativo completo por **proyección compacta, autenticada y con recibos**; bridge de un único `createGuardSession` por guardia, sin crear motores alternos.
3. C23: permisos/propiedad competitiva y XP por jugador con autoridad, no confiar en el host para puntaje.
4. Luego fisiología causal avanzada, tutor, voz y multi-UID/guardia continua.

Cualquier cambio futuro debe pasar 4 jobs de CI y pruebas de no duplicación, ante cierre, cambio de paciente, fallo de red y manipulación remota. La próxima iteración **no** debería consistir en añadir otro subsistema antes de cerrar estas puertas.
