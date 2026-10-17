# ATRIA 5.0 — C21.c: HTTP real, guardias 2–4 y recuperación verificable

Fecha: 2026-10-16 (las CI UTC pueden figurar 17/10). Repositorio `javierdario48-star/ATRIA`, rama `atria-5.0-core-rebuild-experimental`.

## Base y último código

- HEAD anterior C21.a/b: `b4511627a38258c4e846d7fd0ee70e8429757090`. CI 3/3 aprobada (ver runs históricos).
- C21.c entrega: `src/v5/social/room-relay-service.js`, `room-relay-service.test.js`, `room-mailbox.js`, `room-gateway.js`, nuevas pruebas de recuperación, `qa/v5/room-http-browser.mjs` y job dedicado en `.github/workflows/atria-v5-core.yml`.
- **Último código antes de este documento:** `c834436a1790939ae7713f1d11874a6387c0d2a3`, [CI exacta](https://github.com/javierdario48-star/ATRIA/commit/c834436a1790939ae7713f1d11874a6387c0d2a3/checks). Núcleo 40/40, suite V5 250/250, 4/4 complementarias y `actual-http-multiplayer-browser` pasaron; regresión histórica y navegador general estaban corriendo durante la última comprobación.
- No se modificaron `main`, el golden master, integración 4.8.7, interfaz/teclado ni contenido de casos.

## Lo implementado

### Autoridad y datos
`createRoomRelayService` mantiene el contrato HTTP `/api/rooms/:roomId/messages` que la V4 utilizaba, **pero no reutiliza el antiguo almacenamiento KV QA**. Depende explícitamente de un `store.transact(roomId, fn)` capaz de confirmar un único append por ID; `createMemoryRoomRelayStore` implementa ese contrato **solamente para pruebas dentro de un proceso**. Así es imposible dar por seguro en producción un simple `get` + `set` del cache.

- Un único número de secuencia por sala, incremento y deduplicación dentro de una transacción de sala; repetición exacta responde con la secuencia original, intento distinto con el mismo ID devuelve 409.
- `userId` atribuido por credencial Bearer del backend; miembros/estado autorizados, solo anfitrión puede emitir `room.snapshot` y `chat.ack`; invitados solo `chat.command` o `room.resync`.
- Capacidad de memoria e IDs acotada. Paginación y expiración de historial nunca se ocultan: GET con cursor anticuado devuelve HTTP 409 `relay-history-expired`, no salta mensajes clínicos silenciosamente.
- El último `room.snapshot` del host sobrevive al recorte del log como **checkpoint autenticado**, accesible por `GET /api/rooms/:roomId/checkpoint` a miembros vigentes.
- `createGuardRelayGuest.recover()` comprueba identidad/rol/roomId, restaura vista solo lectura, rebasa el cursor a un checkpoint vigente y devuelve `unconfirmedCommands` / `requiresReceiptReview`: **un snapshot NO inventa ACK ni causa un segundo tratamiento**.
- Host clínico se mantiene detrás del `createRoomAuthority` existente. `createGuardRelayHost` no acepta instantáneas clínicas del invitado y la sala comparte el chat con permisos Coop/Competitivo.

### Pruebas reales
Nuevo job `actual-http-multiplayer-browser`: instala Playwright aislado, levanta servidor HTTP de prueba 127.0.0.1 y usa **un host clínico Node** + 1/2/3 procesos Chromium independientes (2/3/4 participantes), en ambos modos.

Contratos: mensajes POST/GET reales entre procesos, Bearer autenticado, propietario competitivo decidido por primer comando válido **en orden de llegada, no por el índice del navegador**, snapshots de lectura, recibos del host, rechazo HTTP 403 de snapshot falso, y un **HTTP 503 simulado después de commit** que obliga a reutilizar la misma ID y no duplica fármaco. 6 escenarios pasan. No es una prueba de que dos usuarios vean la UI V5 multijugador, ni dispositivo Android físico.

El test `room-gateway.test.js` demuestra la recuperación por checkpoint después del truncamiento (snapshot visible, ACK clínico aún sin confirmar, ningún nuevo efecto). `room-relay-service.test.js` comprueba 180 operaciones concurrentes con contadores gapless, identidad, cuotas, aislamiento y revocación.

## Advertencias y decisiones de ingeniería

- **C21.c no despliega un backend productivo.** `createMemoryRoomRelayStore` conserva estado en un solo proceso; no usarlo en funciones Vercel stateless ni prometer escalado horizontal. Falta adaptador transaccional duradero, identidad de usuario persistente y API integrada con aplicación.
- **El anfitrión todavía controla el ejecutor clínico en beta.** La propiedad/permisos los valida la autoridad local host, pero un navegador host malicioso podría falsificar resultados. Para clasificación competitiva verificable debe migrarse la autoridad a un propietario de sala confiable.
- Si desaparece el historial anterior, el **host nunca se rebasa silenciosamente** (podrían perderse órdenes de invitados); solo las replicas lectoras pueden recuperarse por snapshot válido. ACK ausente significa revisión explícita, no repetir automáticamente.
- Un checkpoint que es más antiguo que el inicio del historial retenido se rechaza como irrecuperable hasta que el host publique estado nuevo. La caída del host, largo periodo en background, snapshots muy grandes, rate limiting por actor y reconexión real de la UI siguen abiertos.
- `build:v5` sigue construyendo el juego local, no importa este gateway hasta integrar el lifecycle multijugador; por eso los botones Coop/Competitivo **siguen deshabilitados** y el lobby todavía es local. No simular funcionalidad online.

## Próxima entrega concreta (C21.d / C22.a)

1. Adaptador de almacenamiento **atómico y compartido** + credenciales por usuario para relay/lobby; no copiar el server QA sin transacciones; validar concurrentemente salas diferentes, expiración, reconexión y rate limit. Dentro de cuotas gratuitas cuando sea posible.
2. Conectar C20 party tickets y C21 gateway a una sesión `createGuardSession` con miembros reales y un único paciente mutable, enfermería/estudios/cierre/XP, resolviendo primero cómo el host autentica `actorId` y la distancia por avatar. Nada se ejecuta en las réplicas.
3. Vincular lobby/chat/remotos/selección modal y UI de guardia en Chromium separados; mantener teclado y cámara actuales. Habilitar modos solo cuando las pruebas de interfaz end-to-end sean reales.
4. Luego ciclo de guardia 24min→24h, multi-UID, Vega y voz. Sin casos nuevos.

## Reproducción
`npm run test:v5`; `npm run test:v5-core`; `npm run build:v5`; `npm test`.
Chromium (CI): `PLAYWRIGHT_MODULE_PATH=<playwright path> CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome node qa/v5/room-http-browser.mjs`.
