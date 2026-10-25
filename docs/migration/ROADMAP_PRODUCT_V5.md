# ATRIA 5.0 — Ruta de producto: lobby compartido, cuatro modos y app escalable

> **Archivo histórico (16 de octubre de 2026).** Las secciones siguientes describen decisiones y bloqueos anteriores; **no son el estado actual del juego**. Actualmente están habilitados los cuatro modos, guardia continua y siete casos clínicos certificados. Para límites y puertas de calidad vigentes, consultar [`docs/v5/architecture-boundaries.md`](../v5/architecture-boundaries.md) y la CI del último commit de la rama experimental. Este roadmap se conserva como antecedente, sin reescribir los hitos históricos.

Actualizado: 2026-10-16. Fuente de verdad: rama `atria-5.0-core-rebuild-experimental`. **No añadir casos clínicos** hasta que sistemas y multiplayer funcionen de extremo a extremo. Conservar `main` y V4/golden master intactos. CIRR-001 y APP-001 son suficientes para probar cada etapa.

## 1. Inventario funcional: 4.8.7 efectiva frente a V5

| Sistema | 4.8.7 (lo que efectivamente hacía) | V5 verificable a C21.b | Próxima puerta real |
|---|---|---|---|
| Título, mapa, personajes, movimiento, teclado | Funciona, con wrappers heredados y UI saturada | Mundo, interacción por proximidad, animación y teclado compacto, navegador móvil emulado | Proteger estilo y FPS; no rediseñar mientras se integra conectividad |
| Anamnesis/examen por regiones, Glasgow, historia | Contenido y exploración extensos | CIRR/APP con comprobantes, examen y diálogo; 11 casos solo datos | Completar registros/contextos para CIRR/APP antes de más casos |
| Monitores, ECG y estudios | Más modalidades y observación clínica | Estudios con tiempos/recibos, ECG de presentación, signos oscilantes; incompleto fuera CIRR/APP | Conectar estados a sesión compartida; no dibujar signos ficticios |
| Enfermería: vías, monitor, oxígeno, fármacos, órdenes compuestas | Ejecución más general y algunos problemas de doble recepción/voz | Viaje físico y preparación, dosificación validada, ejecución con recibos y reintentos sin duplicar, pero catálogo limitado | Un solo ejecutor por paciente compartido y tests 2/3/4 |
| Fisiología, alergias, efectos adversos y rescate/muerte | Amplia pero varios writers, sombras experimentales y condiciones de rescate defectuosas | Nativa APP/CIRR y sobrecarga de volumen confirmada; alergias, renal, mortalidad/rescate pendientes | Efectos rápidos pertinentes en 24h sin prometer validación médica universal |
| Dr. Vega y Aprendiz | Flujo docente elaborado y reglas de urgencia | Orientación contextual vía chat, sin ejecución ficticia | Tutor docente por estados y rescate limitado |
| Voz grupal y dictado | Web Speech, micrófono/RTC, normalización de transcripción | No conectado | Un único camino texto/voz, permisos y fallbacks móviles |
| Guardia continua | Varios pacientes, 24h de guardia | Una cama/un paciente en sesión jugable, reloj nativo separado | Multi-UID, camas, enfermera/estudios no contaminados; 24 min reales/24 h de juego |
| Carrera y estadísticas | Scoreboard/EXP y penalizaciones por muerte | XP por cierre local, persistencia del dispositivo | Ledger transaccional, puntuación por jugador, no duplicación |
| Lobby, presencia, amistad y chat | API Vercel + KV QA; HTTP chat, invitaciones; WebRTC de movimiento con fallback | C20.a directorio/party autenticados, sin red web en V5 | Relé compartido, presencia espacial, amigos y UI conectada |
| Solitario y Aprendiz | Jugables | Jugables localmente | Preservar y probar con cada merge |
| Coop y Competitivo 2–4 | Host simulaba; datos clínicos por HTTP polling; errores de chat/estado | Core `room-authority` y C20.a validan permisos/parties, C21.a/b permiten relé y réplica de room; **UI aún deshabilitada** | Mismo `createGuardSession` sobre host real, clientes remotos/recibos/estado fisiológico, 2–4 Chromium |

Inventario detallado previo: [PARITY_MATRIX.md](PARITY_MATRIX.md) y [LEGACY_MULTIPLAYER_TRANSPORT_AUDIT.md](LEGACY_MULTIPLAYER_TRANSPORT_AUDIT.md).

## 2. Arquitectura de destino — progresiva y compatible con app

1. **Cliente común**: web Canvas/JavaScript, después empaquetable Android/iOS. Entrada por comandos; DOM/render/teclado no mutan clínica. Mantener mapa y UI aprobados.
2. **Lobby único, interés espacial**: presencia/avatar de vecinos próximos, chat global del lobby, amigos e invitaciones. Un lobby visual mundial NO supone conectar P2P a cada jugador ni transmitirle todo el roster. Aceptar muchos procesos/zones más adelante.
3. **Autoridad de guardia única**: una instancia por guardia de 2–4. En beta inicial puede ser el navegador host con relé HTTP y presencia validada (como V4 sin bugs); invitados tienen replicas inmutables y envían órdenes verificadas. **No conceder puntuaciones competitivas confiables sin controles de integridad del anfitrión.**
4. **Servicio ligero y durable**: endpoints HTTP compatibles con backend serverless, tokens/pertenencia verificados y almacenamiento con operaciones atómicas para salas, mensajes, confirmaciones y progreso. El `qa-social-server.js` cache no es transaccional ni productivo; C20.a en memoria no se despliega en cada invocación stateless.
5. **Crecimiento posterior**: permitir migrar la autoridad de sala a un runtime con estado dedicado por sala (por ejemplo Durable Objects o equivalente) **sin cambiar contratos de comandos/recibos**. WebRTC se utilizará de forma selectiva para movimiento/voz; fallos de NAT requieren fallback y quizá TURN.
6. **Gratuidad inicial**: construir/probar dentro de cuotas gratuitas cuando sea posible; ningún diseño debe requerir un servicio pago para un simple ensayo local. Escalar tras medir concurrencia y costos.

## 3. Checkpoints en orden de dependencia

### P0 — Preservar lo que funciona
- GitHub: rama experimental solamente, pequeños commits, diff revisable, CI `clean-core-contract` + regresión original + Playwright independiente, traspaso en `docs/migration`.
- No tocar `main`, `vendor/**`, interfaz/teclado/cámara ni introducir más casos o motores paralelos.
- DoD: CI 3/3 y UID, adminLog, cierre/XP no cambian inesperadamente.

### P1 — Mensajería y conexión (C21.a/b/c)
- **Implementado C21.a:** `room-mailbox.js` recibe mensajes tipados, sender asignado por relay autenticado, mensajes únicos, ACK, cursor con interrupción por gap, reintento sin pérdida silenciosa, HTTP de sala `/api/rooms/:id/messages`. No hay temporizadores ni WebRTC ornamental.
- **Implementado C21.b:** `room-gateway.js` une la autoridad clínica host con réplica de lectura solamente, chat/comandos, ACK por destinatario, estados ordenados y resync **sin mensaje clínico espurio**. Core tests 2/3/4 actores, sin UI online.
- **PARCIAL C21.c [implementado protocolo + red QA]:** relé con transacciones por sala **solo en memoria de pruebas**, API HTTP real, host Node + 1/2/3 navegadores Chromium separados (2/3/4 participantes), snapshot auténtico/recuperación de vista y ACK no confirmado explícito. [C21.c](STEP_21C_HANDOFF.md).
- **PENDIENTE C21.d:** almacenamiento compartido duradero y auténtica integración frontend/auth, caída del host, carga, reingreso y aislamiento entre conexiones reales; no presentar el relay de memoria de pruebas como backend desplegable.
- DoD: dos navegadores independientes usando backend de prueba real, chat y ACK sin duplicación, expiración y reintentos reproducidos; backend sostiene concurrencia sin perder comandos.

### P2 — Conectar los cuatro modos jugables (C22/C23)
- Hacer `createGuardSession` aceptar la pertenencia de 2–4 validada en el lobby, usando el **mismo** puerto nativo, reloj, enfermería y fisiología. Distancia por avatar autoritativo, no paciente del payload del invitado.
- Coop: todos pueden interrogar, estudiar y administrar; Competitivo: primera interacción clínica válida reclama paciente, rival solo observa; chat único por guardia. No duplicar motor/estado en invitados.
- Integrar UI de invitaciones/confirmaciones/volver al lobby, HUD por jugador, bloqueo visible de rival, snapshots clínicos ordenados y XP exactamente una vez.
- DoD: completar CIRR y APP desde interfaz de 2/3/4 Chromium independientes, Android emulado, sin errores de chat ni enfermera; fracaso/abandono del host explícito y recuperación documentada.

### P3 — Sistemas clínicos y juego completo (C07–C12, C18–C19)
- Órdenes mixtas y catálogo universal, voz y Vega docente; alergia/contraindicaciones y cinética al usar medicamentos verdaderos. En 24h los antibióticos son principalmente condición clínica de cumplimiento, no mejora hemodinámica inmediata.
- Guardia continua de 24 min reales con varios UID, camas, trazabilidad de administración, prioridades/arribos, cierre/alta/UTI/cirugía y XP/penalizaciones.
- DoD: pruebas de 2, 6, 12 y 20 pacientes, fallos/reintentos/doble caso y causalidad clínica, consola limpia y sin contadores falsos.

### P4 — Escala y producto móvil (C24/C25)
- Pruebas escalonadas de decenas y cientos de usuarios virtuales, luego mayores concurrencias según los datos; medir mensajes/segundo, coste por conexión, CPU/memoria, sesiones activas, entregas atrasadas y TTL.
- Lobbies visualmente unidos pero con interés espacial, **no** mesh global de pares WebRTC.
- Android/iOS físicos, cambio de app/background, ahorro de batería, teclado, reconexión, accesibilidad y empaquetado; observabilidad y antitrampas.
- DoD: mediciones reales, control de costos, CI completa, preview reproducible y autorización explícita para promover `main`.

## 4. Puertas y limitaciones actuales

- Los tests de 2/3/4 clientes de C21.a/b usan transporte HTTP **simulado por peticiones independientes** en Node. Validan el protocolo, **NO** certifican una sala online desplegada ni navegación entre teléfonos.
- El relé histórico de Vercel es QA y carece de transacciones por sala; no declarar exact-once de la red. `room-mailbox` entrega al menos una vez, detecta replay y huecos, mientras la autoridad clínica deduplica por actor/ID y envía comprobantes. Un gap requiere recuperación/restauración segura, **no** saltar el cursor.
- La autoridad navegador-host es aceptable como etapa de integración barata; para ranking y competición auditables debe existir un árbitro confiable del estado clínico.
- Falta sincronización remota del paciente/vitales/ECG/posición y ledger transaccional de XP; **no habilitar** Coop/Competitivo en UI por ahora.
