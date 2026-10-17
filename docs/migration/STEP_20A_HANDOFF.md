# ATRIA 5.0 — C20.a: lobby autoritativo y contrato de guardias multijugador

## Objetivo y alcance aprobado
Prioridad del usuario: terminar sistemas y **los cuatro modos**, lobby donde convivirán todos los usuarios, antes de agregar nuevos casos clínicos. V5 CIRR-001 y APP-001 bastan como casos de integración. No copiar el defectuoso HTML generado ni crear motor paralelo.
- Aprendiz / Solitario **sí** están conectados al juego local.
- Cooperativo / Competitivo **solo tienen ahora autoridad y pruebas integradas**; todavía NO están conectados a la UI, WebRTC/WebSocket ni a otros navegadores; los botones siguen deshabilitados. **No afirmar que 4 modos son online o que existe lobby masivo operativo.**
- Respeta un chat global por guardia; fuera de la guardia habrá chat único del lobby al completar C21. La pertenencia a partidos separados no mezcla clínica, texto, estado ni XP.

## Commits y CI
- Rama única: `atria-5.0-core-rebuild-experimental`; repo `javierdario48-star/ATRIA`.
- Base V5 clínica C12.b: `e69319a0feff2753c9ed89c2b0ee5fb93379138b`, [CI verde 3/3](https://github.com/javierdario48-star/ATRIA/actions/runs/38986398801).
- Checkpoint C20.a principal `e5c49dbb66c1fafae3efc24a85ffc8783f1dc06f`.
- **Último código de C20.a** `074997f2cfe9077e4a3d4d336b9ab7615dbbdc77`; [CI del código 38987099992](https://github.com/javierdario48-star/ATRIA/actions/runs/38987099992); `clean-core-contract` OK 233/233 V5 y 40/40 V5 core y 4/4 extras. Navegador y regresión histórica aún en ejecución al redactar; verificar status antes de declarar 3/3.
- No se modificaron `main`, `vendor/atria-4.8.6/**`, UI móvil, mapa, sprites, teclado, motor farmacológico ni casos.

## Código entregado
1. `src/v5/social/lobby-coordinator.js` — única autoridad social **servidor-side, sin dependencia de transporte**. `authenticate(credentials)` determina identidad, nunca la carga del cliente. `join` genera una sesión nueva, `move` valida secuencias de posición, `heartbeat` mantiene presencia, `nearby` filtra espectadores con grid 160 px y radio/limite acotados, `disconnect` y expiración limpian actores. El directorio requiere persistencia y propietario único para escalado horizontal futuro; sus 10.000 actores posibles son límite de memoria de un proceso, **no una prueba de 10.000 usuarios concurrentes**.
2. `createParty` / `invite` / `accept` / `start` / `finish` / `leave` — estados e invitaciones sólo de host, máximo 4, mínimo 2, aislamiento de participantes, sin actores fantasmas al iniciar/retornar. `start` devuelve sólo una **especificación de sala** validada por servidor (`roomId`, `mode`, `caseId`, `members`), **no abre ni ejecuta un caso clínico**.
3. `src/v5/social/lobby-coordinator.test.js` — pruebas de identidad, robo de sesión, invitaciones sin autorización, 2/3/4 miembros, caducidad, 600 avatares simulados, culling espacial, vuelta al lobby. Búsqueda entrega solo vecinos; nunca expone `sessionId`.
4. `src/v5/social/lobby-to-guard.test.js` — une la especificación real de grupo al `createRoomAuthority` y al **único puerto `createNativeClinicalPort`**. Simula 2/3/4 actores autenticados y dos grupos independientes, demuestra que Coop permite intervenir a todos, Competitivo reclama paciente con primera acción válida, rivales no lo tratan, chat sigue global, replay no repite tratamiento, dos salas no comparten paciente.
5. `package.json`: `npm run test:v5` incluye `src/v5/social/*.test.js` para que el contrato social sea gate CI permanente.

## Endurecimiento posterior del mismo checkpoint
- Seguridad `6edb3f4aa7bf512f24eb6ba07e4ab526dc2bdca1`: `guardActor` vuelve a autenticar por **credencial + sesión actual + pertenencia activa a la sala** en cada orden. Salir del grupo, caducar, volver al lobby o reconectar con sesión nueva revoca el acceso anterior; `room-authority` rechaza solicitudes de antiguas credenciales aunque el actor figure en el roster original. Probado en `lobby-to-guard.test.js`. Es un contrato de integración hacia la futura puerta de red; no afirma que actualmente haya autenticación online.
- Rendimiento `280adcf6ed502341937a298cf0c9cef3eb010246`: `move` y `heartbeat` actualizan el directorio espacial tras autorización sin esperar toda la cola global de invitaciones y creación de salas. La transición en JS sigue siendo sincrónica tras resolver la credencial. **Sin benchmark masivo de red** ni promesa de concurrencia de 10.000 clientes.
- CI del último código: [buscar ejecución por SHA](https://github.com/javierdario48-star/ATRIA/commit/280adcf6ed502341937a298cf0c9cef3eb010246/checks); verificar antes de confirmar 3/3. `src/v5/social/*.test.js` permanece en la suite obligatoria.

## Límites técnicos y seguridad
- No hay transport físico actual en esta rama, cuenta online real, perfiles globales, amigos, presencia masiva replicada, conexión entre móviles ni persistencia multi-nodo. NO habilitar Coop/Competitivo aún.
- Faltan autoridad de credenciales real y servidor durable/transaccional. El `qa-social-server.js` viejo se declara **QA con KV efímero**, no apto como infraestructura productiva global sin una reingeniería y pruebas bajo concurrencia multiinstancia.
- El estado del coordinador reside en un proceso. Para escalado horizontal se necesita **dueño de sesión/sala y storage transaccional**, y broadcasts filtrados por espectadores cercanos (evitar enviar miles de avatares a cada usuario). `join` tras reconexión invalida el token previo; dejar de emitir movimiento de sesiones viejas. La guardia separada sigue teniendo un solo ejecutor clínico.
- El `start` entrega al integrador un `roomTicket` trusted; nunca confiar en `members` inventados por clientes. No se incorporó un segundo estado clínico ni un servidor falso en el navegador.

## Siguiente paso — C20.b / C21
1. Implementar transporte autenticado durable/atomic de presencia, lobby global y grupos. Elegir propietario autoritativo de sesiones/salas, **no reutilizar la API QA como producción sin revisión de integridad y carga**. Verificar 2/3/4 navegadores reales y pérdida/reconexión. No generar sockets cliente imaginarios ni usar solo BroadcastChannel como internet.
2. Adaptar la presentación remota y movimiento conservando la cámara aprobada (un único renderer y scheduler) con interés espacial y anti-replay; el mundo local nunca es fuente clínica remota.
3. Conectar `createRoomAuthority` por `createNativeClinicalPort` a instancias clínicas reales para Coop/Competitivo sin duplicación por jugador; definir lifecycle de UIDs, enfermeras, estudios, cierre y XP y persistencia; recabar evidencia navegador. Luego sí habilitar los botones de modo.
4. Mantener Aprendiz y Solitario. Luego C12.c alergia condicionada por antecedentes, nefrotoxicidad renal con tiempo, rescate y mortalidad sin efectos fantasmas. **No nuevos casos**.

## Comandos
`npm run test:v5`, `npm run test:v5-core`, `npm run build:v5`, `npm test`, `npm run qa:v5-browser`.
