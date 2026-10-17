# ATRIA 5.0 — C21.a/b: relé HTTP robusto y autoridad de guardia única

## Fuente y compromiso
Repo `javierdario48-star/ATRIA`; rama `atria-5.0-core-rebuild-experimental`. Base C20.a + auditoría fuente antigua: `acc0166ea26a7e2f1f0f3c81ece1e36ecc4e5c66` [CI 3/3](https://github.com/javierdario48-star/ATRIA/actions/runs/38987849257).
Código C21.a `403c308e7208466450cb50c110187fae36345729`; C21.b primer commit `4d78a2c73a45c66bd35b965ff61da6b754355a2a`; revisión de autenticación sin side effect `d51e2fc01ff274e35bad97ba37af065eb4717a4a`. Verificar [CI C21.b](https://github.com/javierdario48-star/ATRIA/commit/d51e2fc01ff274e35bad97ba37af065eb4717a4a/checks), que estaba en curso al escribir esto.

## Implementación
- `src/v5/social/room-mailbox.js`: contrato `atria.v5.room.1`, tipos `chat.command/chat.ack/room.snapshot/room.resync`, cola bounded y comprobantes de POST. `flush()` nunca declara éxito antes de ACK HTTP; fallo conserva outbox; reintentos del mismo ID son idempotentes en la autoridad, no por confiar en el antiguo KV. `poll()` procesa secuencias estrictas; un hueco **falla explícitamente**, sin aceptar falsamente otra actualización. `onMessage` debe confirmar ejecución antes de avanzar cursor; UID remitente viene del backend, no payload.
- `createHttpRoomTransport`: HTTP autenticado por Bearer para ruta V4 ya conocida `/api/rooms/{id}/messages`; no instala timers, interceptores `fetch` ni side effects. Módulo sólo adapter: backend V4 actual sigue marcado QA no transaccional y necesita reemplazo/fortalecimiento para escala.
- `src/v5/social/room-gateway.js`: `createGuardRelayHost` despacha mensajes al `createRoomAuthority` ya existente después de resolver credenciales por sender autenticado; publica ACK direccionado, snapshot firmado por identidad del host y permite solicitud de resincronización **sin chat de médico ficticio**. `createGuardRelayGuest`: proxy de órdenes y réplica de solo lectura, no ejecuta estudios/fármacos localmente y no acepta snapshots/ACK de rivales.
- `src/v5/core/room-authority.js`: `authorize(credentials)` es read-only y verificable; resync no modifica historial/revisión, no dispara acciones y revalida membresía vigente.
- `src/v5/social/room-mailbox.test.js` y `room-gateway.test.js`: 2/3/4 miembros, Coop/Competitivo y propiedad, dosificación nativa una vez, pérdida después de write, retransmisión, host falso, rechazo no miembros, cursors y gaps, relectura de snapshots, retorno sin contaminación.

## Lo que NO se hizo
No se modificó el juego visual, clínica, reglas de casos, farmacos, teclado, mapa, `main` ni el legado. **No hay UI de multiplayer online funcional** ni servidor durable nuevo. No afirmar cobertura Android físico, WebRTC P2P, carga masiva o resultado de torneo confiable. La función host puede correr en navegador para QA pero debe verificarse con autentificación real antes del siguiente paso.

## Siguiente avance
C21.c: adaptador duradero transaccional para identidad/parties/relay, preservar `senderId` asignado por el servidor; resolver re-sincronización al detectar gaps mediante snapshot de autoridad completo más reenvío de ACK; integrar 2/3/4 Chromium con rutas HTTP reales. Posteriormente C22/23 conectar `createGuardSession` a modes Coop/Competitivo con ACL y un único patient, luego UI. No introducir casos nuevos. Ver [ROADMAP_PRODUCT_V5.md](ROADMAP_PRODUCT_V5.md).

## Hardening C21.b — tráfico malformado no bloquea la guardia
El código `eae08910e2abdaca7930e129b94f0c8b7777fb7c` incluye la corrección de un riesgo de denegación de servicio: si un miembro autorizado envía un mensaje `chat.command` incompleto/malformado, el anfitrión **confirma rechazo sin ejecutar ni añadir chat** y continúa con los mensajes siguientes de los demás jugadores. Revalidación en `room-gateway.test.js`. [Ver CI del commit](https://github.com/javierdario48-star/ATRIA/commit/eae08910e2abdaca7930e129b94f0c8b7777fb7c/checks). Sigue pendiente una cuota/rate limit por actor desde el relay servidor y controles de tamaño por paquete. El protocolo no vuelve a escribir fisiología en el invitado.
