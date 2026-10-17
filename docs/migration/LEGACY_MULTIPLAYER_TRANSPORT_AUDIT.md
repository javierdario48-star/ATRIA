# ATRIA 4.8.7 — Auditoría del transporte social REAL (fuente efectiva, no recuerdos)

## Respuesta arquitectónica

La versión anterior **NO necesitaba un servidor de juego siempre encendido que ejecutase la fisiología**. Sí necesitaba un **servicio HTTP de encuentro, chat, invitaciones, señalización y relevo**. Una guardia de 2–4 jugadores no se sostenía exclusivamente por WebRTC: la versión integrada efectiva creaba un `dc` compatible con DataChannel cuyos métodos `send/onmessage` usaban `POST/GET /api/rooms/{id}/messages`. El navegador del host dirigía el estado clínico `cs_room_v411`; los otros lo consumían y emitían solicitudes. El lobby además contaba con WebRTC real para acelerar movimiento de avatares, junto a HTTP como descubrimiento/fallback. El control histórico de perfil contenía *otra ruta* de ofertas/respuestas WebRTC manuales para 2 peers; no confundir esa demo con la implementación multijugador grupal de 4.8.7.

## Evidencia de código concreto

| Ruta antigua | Mecanismo observado | Evidencia |
|---|---|---|
| Lobby global | API `lobby/state`, `lobby` y `lobby/chat`; sesión token, roster, posición y chat persistidos provisionalmente en cache | `src/social/qa-social-server.js` y `api/_core.js` |
| Movimiento visible P2P | `RTCPeerConnection`, STUN público, canal `atria-lobby` no ordenado (`maxRetransmits:0`); señalización con `POST/GET /api/lobby-sync`; si el canal RTC no abre se recurre a estados del roster/HTTP | Script `atria-rtc-lobby-v461` en `vendor/atria-4.8.6/index.html` + correcciones `src/integration/remote-motion-487.js` |
| Invitaciones/parties 2–4 | `POST /api/rooms`, `/rooms/join`, `/rooms/{id}/invite`, `/leave`, `/cancel`; el host crea el grupo; backend controla tokens/miembros | Script `nsSocial` del HTML original + `qa-social-server.js` |
| **Transporte real de sala compartida** | Adaptador que imita `dc.send/onmessage` pero envía a `POST /api/rooms/{id}/messages` y recupera con `GET ?after=cursor`, un poll cada ~150 ms; cola, ack/fallback y snapshots reemplazables | `function attach(r)` del script `nsSocial` del HTML original (aprox. posición 1,79 M) |
| Estado clínico remoto | Host/clientes intercambian mensajes `cs_room_v411`; `publish(kind='snapshot')`, `claim`, paciente con propietario; copias remotas sin integración fisiológica paralela | Script challenge del HTML original + `src/integration/multiplayer-stabilization-487.js` |
| WebRTC manual 1:1 | Ofertas/respuestas pegadas como códigos, `RTCPeerConnection`, canal `clinical-shift`, `getUserMedia` y tracks de voz; interfaz de perfil, **no transporte predeterminado de las guardias 2–4** | `csCoopCreateOffer`, `csCoopAnswerOffer` y `csCoopAcceptAnswer` en HTML 4.8.6 |
| Backend desplegado | Vercel serverless en `api/_core.js` y `api/lobby-sync.js` usando `@vercel/functions getCache`, que monta el `createQaSocialServer` expresamente etiquetado **QA** | `api/_core.js`, `src/social/qa-social-server.js`, `vercel.json` |
| Pruebas independientes | Chromium 2/3/4 navegadores, HTTP local y WebRTC reales dentro del harness, no prueba de millones de usuarios ni garantía de backend durable | `qa/remote-motion-browser-487.mjs`, `qa/multiplayer-stabilization-487.mjs` |

Referencias: [HTML viejo](../../vendor/atria-4.8.6/index.html), [API social](../../src/social/qa-social-server.js), [API Vercel](../../api/_core.js), [adaptador de movimiento](../../src/integration/remote-motion-487.js), [estabilización multiplayer](../../src/integration/multiplayer-stabilization-487.js).

## Errores de interpretación que C20 debe evitar

1. **«Sin servidor» ≠ sin backend.** Significaba sin servidor dedicado con ticks, mundo y fisiología. El servicio de identificación, lobby y mensajería ya existía en Vercel. El viejo cache regional es QA, temporal y **no transaccional**. No afirmar durabilidad ni orden global correcto bajo escritura concurrente solo por pasar tests en un proceso.
2. **«WebRTC en el juego» ≠ toda la guardia va por P2P.** El script `attach(r)` de `nsSocial` construye un objeto `dc` virtual sobre HTTP; el canal RTC `atria-lobby` transporta posición en lobby. Los estados de paciente pasan por el relé HTTP de salas. La demo manual `clinical-shift` es aparte.
3. **«Funciona en 2–4» ≠ «lobby masivo P2P completo».** En lobby el modelo histórico intenta conexiones RTC por usuario del roster; un mesh P2P total implica conexiones por par y escala mal. V5 debe establecer interés espacial/vecinos próximos y no enviar toda la lista a todos continuamente.
4. El viejo WebRTC usa STUN público y **no configura TURN**; ciertos pares detrás de NAT restrictivo pueden fallar. Debe existir fallback/estado visible, y no dar por estable toda conexión P2P.
5. El canal relay usaba polling HTTP ~150ms, filas de mensajes y snapshots comprimidos, con riesgos de costo, carreras de escritura, retrasos, duplicados y host desconectado. Trasladar protocolos/contratos, **no** sus wrappers HTML, su `fetch` monkey-patch ni sus fuentes mutables paralelas.

## Corrección de dirección para C20.a–C23

- **Mantener** `src/v5/social/lobby-coordinator.js` como lógica de dominio pura y tests de identidad/invitaciones/ACL; no desplegar tal cual su estado en memoria en una función Vercel stateless ni obligar a mantener un servidor de juego de larga vida.
- **Reutilizar la capa HTTP serverless existente** como punto de integración de identidades, descubrimiento, grupos y señalización; renovar `qa-social-server.js` en un módulo productivo con almacenamiento compartido y transacciones/atomicidad *antes* de usarlo para chat/claims reales. No prometer que el cache QA sea seguro como base multiusuario real.
- **Primera ruta funcional de red:** autoridad host para fisiología/recibos por sala, cliente invitado como réplica, mensajes con IDs y ACK sobre transporte HTTP simple y validado para 2–4 (equivalente en capacidad al antiguo) sin construir un servidor clínico nuevo. Conservar Solitario/Aprendiz completamente locales.
- **Optimización posterior según evidencia:** WebRTC real para movimiento entre vecinos próximos y, si beneficia latencia/fiabilidad, canales de guardia/voz, usando señalización HTTP y fallback. No crear un peer mesh mundial.
- **Gate 2/3/4 real:** pruebas con navegadores aislados, llegadas físicas de enfermería, chat único, dueño competitivo, cierre/XP una vez, reconexión, retransmisión e interrupción del host; backend concurrente sin órdenes perdidas. Botones Coop/Competitivo deshabilitados hasta ese gate.
- Prohibición de nuevos casos hasta que los cuatro modos y el lobby sean jugables como producto.

## Conclusión técnica

No hace falta comprar o desplegar un servidor de simulación dedicado para este paso. **La ruta más corta y fiel** es llevar a V5 el modelo híbrido HTTP serverless + host autoritativo + cliente réplica, añadiendo RTC selectivo como optimización y preservando las reglas clínicas desacopladas que ya pasaron sus tests. El nuevo C20.a preparó reglas y pruebas, pero **NO** constituye aún el transporte del juego.
