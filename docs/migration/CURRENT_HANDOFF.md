# ATRIA 5.0 — C5.b.3 Cooperativo persistente

## C5.b.3 — reconciliación de movimiento sin replay (22-10-2026)

**Reporte móvil del usuario:** al caminar en una guardia, a veces el médico retrocede o se teletransporta a una posición antigua y vuelve a recorrer el mismo trayecto. La mensajería entre médicos ya se considera funcional. Prioridad: movimiento correcto con dos jugadores antes de escalar el lobby.

**Causa raíz comprobada en código:** `src/v5/app/world.js::applySharedSpatial()` contenía una regla que, si el actor local acababa de terminar de caminar y llegaba desde PostgreSQL una posición separada más de 3 px, asignaba directamente `player.x/y` a esa posición antigua y ejecutaba `navigation.target(player,...lastMotionIntent.target)`. **Eso reordenaba repetir la ruta completa.** Un segundo efecto era que, al faltar temporalmente paquetes sociales de un compañero, el render cambiaba al estado clínico más antiguo; luego volvía a social y repetía el desplazamiento visual.

**Corrección integrada y sin segundo motor:**
- `src/v5/clinical/guard-runtime.js`: confirmación `motionReceipts` por médico, números secuenciales monotónicos persistentes con el checkpoint clínico. La autoridad reconoce únicamente destinos aceptados y rechaza órdenes viejas. Soporta checkpoints previos que carecen de `motionReceipts` sin volver a inicializar la guardia.
- `src/v5/server/durable-guard-authority.js` y `src/v5/server/clinical-http.js`: transporte opcional `motionSequence` por el mismo CAS PostgreSQL; mantiene `motion` array y clientes históricos compatibles. No modifica la fisiología, el mapa ni el sistema médico.
- `src/v5/social/durable-cooperative-replica.js`: `motion(target,sequence)` y `lastAcknowledgedMotion(actorId)`; nunca rebaja `latestMotionSequence` aunque se confirme el paquete anterior o se reordenen respuestas HTTP. La única cola de comandos médicos permanece serializada.
- `src/v5/app/application.js`: emite la secuencia original `world.motionIntent().sequence` y entrega el ACK de la autoridad a la reconciliación visual.
- `src/v5/app/world.js`: eliminada la regla de rebobinar al jugador y recomputar la ruta. Una posición vieja no modifica la predicción local; solo una llegada final con ACK correspondiente puede ajustar una diferencia residual sin generar un nuevo recorrido. Los médicos remotos que ya reciben poses de la sala social no retroceden al snapshot clínico cuando se interrumpe momentáneamente ese canal: mantienen último estado visual y reanudan con datos sociales nuevos. Las posiciones clínicas del servidor conservan todos los permisos de interacciones y medicamentos.
- `src/v5/app/world.test.js` reproduce caminata terminada, llegada de posición antigua y secuencia vieja/actual; asegura que nunca se repite la ruta. También prueba una lista de 30 jugadores sociales (3 miembros y 27 ajenos) sin contaminación de la guardia privada de cuatro plazas.
- `src/v5/server/durable-guard-authority.test.js` verifica ACKs monotónicos, rechazo de entradas viejas y persistencia tras reinicio de SQLite. `src/v5/social/durable-cooperative-replica.test.js` prueba respuestas retrasadas, sucesión de secuencias y retención del input más reciente.

**Referencias técnicas verificadas:** código `otclient/src/client/localplayer.cpp` (prewalk/confirmación del servidor), Gabriel Gambetta *Client-Side Prediction and Server Reconciliation*, y guías Valve *Source Multiplayer Networking*. El principio clave es no aplicar un snapshot pasado como si fuera el estado actual del propio jugador; diferenciar predicción local, ACK del servidor e interpolación remota.

**Evidencias:** pruebas dirigidas de reconciliación+servidor+transporte **26/26**, suite V5 **485/485** y build aprobados en el checkpoint anterior al test de aislamiento de 30 presencias; ese nuevo test **12/12** del módulo mundo también aprobó. La CI GitHub del HEAD de código `8b953ea38b40c5f945fe2badfe967b7321387a3d` estaba en cola al consultar; el Preview correspondiente estaba READY. La regresión V4 histórica de checkpoints anteriores estaba verde. **No declarar CI del HEAD verde ni aceptación móvil sin comprobarlas**. Seguir exigiendo comprobación con dos teléfonos reales y RTT/jitter de guardia.

**Escalabilidad:** la guardia clínica actual admite **2–4 médicos**, no 30. El lobby masivo de 30 debe someterse a una prueba de carga propia (conexiones concurrentes, P95/P99 de presencia, payload/usuario y persistencia). 30 sprites sintéticos no demuestran capacidad real de 30 conexiones. Si el polling HTTP completo o el servicio de presencia se satura, estudiar transferencia por eventos, cuotas y difusión por interés/área (AOI) en un checkpoint separado, nunca aumentar la frecuencia de PostgreSQL ni clonar la fisiología. Production, main, V4 y el resto de la clínica se mantienen intactos.


## C5.b.3 — cámara estable y chat rápido entre médicos (22-10-2026)

**Reporte de aceptación:** al escribir en un dispositivo, la pantalla del otro puede desplazarse levemente y el globo o texto del médico puede tardar más de un segundo. El usuario valora el lobby estable y pide comparar técnicas OTClient/Tibia.

**Hallazgos en código:**
- `src/v5/web/game.css` tenía `#chatHistory` con altura variable (32–90 px); cada mensaje podía alterar la parte visible del hospital mientras el teclado o el encuadre estaban activos. Se reserva una altura fija sin cambiar el modo expandido.
- `src/v5/render/hospital.js` seguía exactamente cada corrección de `world.player` de PostgreSQL, incluso cuando el avatar estaba quieto y se recibió un evento externo. Se aplica únicamente en Cooperativo una estabilización visual acotada (140 ms, banda muerta 1,5 px) a correcciones pequeñas en reposo. Movimiento propio y cambios de escena siguen inmediatamente, sin alterar el actor clínico ni el mapeo toque→mundo.
- En `src/v5/app/application.js`, los mensajes entre médicos aparecían en el teléfono remoto cuando PostgreSQL confirmaba una revisión clínica. Esa dependencia añadía latencia innecesaria a la presentación del mensaje.

**Cambio limpio y acotado a V5:**
- `src/v5/social/cooperative-link.js` utiliza el endpoint autenticado y **ya existente** `/api/rooms/:id/messages` (solo miembros de la sala) para un mensaje visual `physician.speech` de hasta 280 caracteres, con un cursor incremental consultado cada 320 ms mediante el RAF existente. Si WebRTC está conectado, emite además un paquete de vista previa inmediato. No se modificó el servidor V4 ni se creó uno nuevo; las consultas sociales son independientes de `/api/clinical` y no autorizan tratamiento alguno.
- `src/v5/app/application.js` muestra los globos de médicos y agrega el texto del remitente rápidamente al historial, sin esperar a la evolución clínica. `fastWardSpeech` se correlaciona por ID original con `player:<actor>:<message>`, por lo que la confirmación autoritativa posterior sustituye la vista previa sin duplicar el mensaje. No se anticipan respuestas del paciente, medicamentos, estudios ni resultados.
- `qa/v5/durable-cooperative-browser.mjs` exige un solo mensaje en cada historial después de la confirmación. `src/v5/social/cooperative-link.test.js` comprueba entrega en la primera lectura independiente de sala y deduplicación por cursor.

**Evidencia local:** `npm run build:v5` aprobado; `npm run test:v5` **482/482** aprobadas en el checkpoint de código `8d55981aa9bccca2da455ff973130d708bb6c546`. No equiparar esas pruebas con latencia WAN medida. Confirmar CI de navegador final, estabilidad del encuadre con teclado y chat de 2 teléfonos Android/iPhone. Mantener Production, main, V4, fisiología, terapias, enfermería y XP intactos. La mejora en el usuario aún necesita aceptación física.


## C5.b.3 — enfermería visual fluida, autoridad clínica intacta (22-10-2026)

**Reporte real:** tras separar la sala privada de movimiento social del transporte clínico, el usuario confirmó que los personajes médicos ya caminan bien pero las enfermeras continúan con lag visual. Comparación de código: ATRIA V4 4.8.7 animaba la enfermera localmente a cada cuadro mediante `updateNurse(dt)`; en V5 durable, `world.step()` en réplica no autoritativa no mueve enfermería y `applySharedSpatial()` reemplazaba directamente `nurses` con el estado de la consulta PostgreSQL (aprox. 900 ms). La fisiología y los recibos de enfermería del servidor no resultaron implicados.

**Corrección estrictamente visual en V5:**
- `src/v5/app/world.js` mantiene el servidor como propietario exclusivo de rutas/tareas y posiciones clínicas `snapshot().nurses`; en un registro separado `nurseRemotes` reutiliza `createRemotePose/receiveRemotePose/sampleRemotePose` (interpolador aprobado del lobby), con velocidad auténtica de enfermería **140 px/s**, cadencia clínica nominal **900 ms** y waypoints de la ruta del servidor cuando la ruta es común. Muestrea cada RAF, pero **no muta las posiciones clínicas** del estado compartido.
- `world.presentNurses(frame)` aplica coordenadas visuales solamente a una copia del cuadro de renderizado. `src/v5/app/application.js` lo llama después de `presentation.sample()` y antes de dibujar.
- La primera iteración que interpolaba directamente `nurses` fue descartada porque la regresión existente exigía igualdad exacta con el servidor. El resultado definitivo preserva la igualdad de snapshots mientras interpola únicamente el sprite. No hay nuevo motor, simulación cliente ni ejecución de tratamientos o recepción ficticia.
- Se agregaron pruebas en `src/v5/app/world.test.js` que verifican interpolación real entre dos snapshots clínicos, ausencia de saltos al recibir el siguiente, conservación exacta del valor médico y ausencia de dispatcher clínico en réplicas.

**Evidencia:** checkpoint funcional `1a2675e313dcd8751f49e5d9b1c4c348fd7e6ff2` aprobó `npm run test:v5` **481/481** y `npm run build:v5`. El workflow histórico 4.8.7 terminó verde; la CI V5 definitiva seguía en cola en la última consulta. Preview Vercel específico de ese SHA READY: `https://night-shift-clinical-5wms2fx1w-javierdario4878-7324.vercel.app/`. Falta aceptación física en dos dispositivos, especialmente comprobar giros alrededor de obstáculos y que las acciones de enfermería no se adelanten a sus recibos. Production, main, V4, lógica farmacológica y XP no modificados.


## C5.b.3 — movimiento del lobby en la sala clínica privada (22-10-2026)

**Motivo:** el usuario confirmó que el lobby era fluido, pero la guardia Cooperativa seguía con lag o empeoraba después de aumentar las consultas clínicas a 300 ms. No repetir ese remedio.

**Causa verificada en código:** `src/v5/social/cooperative-link.js` compartía un único `busy` y un período de **1000 ms** para la presencia en guardia, además de esperar negociación de sala, intercambio SDP/ICE y otras respuestas. El lobby usa **260 ms** y no espera negociación RTC. En paralelo, `src/v5/social/durable-cooperative-replica.js` mezclaba movimiento con `/api/clinical`, que restaura sesión, simula la fisiología y exige CAS persistente. La frecuencia de 300 ms podía añadir contención sin mejorar la animación remota. Esto explica un mecanismo concreto de saltos, aunque falta verificar latencia WAN real.

**Cambio de arquitectura limpio y acotado al V5 experimental:**
- `src/v5/social/cooperative-link.js`: una vía de presencia **260 ms** independiente de la negociación de sala **1000 ms**, ambas accionadas por el RAF original; no se añaden loops, timers, servidores ni motores nuevos.
- `src/v5/social/room-motion-scope.js`: crea un identificador visual de sesión privado por sala a partir de un fingerprint determinista y UUID. El V5 rota `motionSession` y `motionEpoch` al entrar/salir, usando campos **ya existentes** en el servidor social V4. Se revirtió explícitamente cualquier cambio de `src/social/qa-social-server.js` para respetar el hash del módulo histórico. El fingerprint sirve solo para presentar avatares, no otorga admisión ni permisos.
- `src/v5/app/world.js`: solo integra presencia remota cuando el médico ya pertenece a la sala clínica autenticada, filtrando por sesión de sala; interpola con `remote-motion.js` original y evita que un snapshot PostgreSQL lento rebobine su posición visual. Si dejan de llegar paquetes nuevos, recurre al snapshot persistente. Las distancias y posiciones clínicas siguen siendo exclusivas del servidor.
- `src/v5/app/application.js`: publica la pose con contexto visual y aplica los mensajes de movimiento privados exclusivamente a los compañeros de la guardia durable. Ninguna intervención clínica usa esa pose social para autorizar actos médicos.
- `src/v5/social/durable-cooperative-replica.js`: se devuelve el polling clínico a **900 ms** para no convertir la base PostgreSQL en el canal de animación, conservando envío inmediato serializado de mensajes del paciente y ACK idempotentes.
- Pruebas añadidas en `src/v5/app/world.test.js` y `src/v5/social/cooperative-link.test.js`: miembro válido en sala, rechazo visual de lobby/salas ajenas, continuidad ante snapshots lentos, paquetes sociales de 260 ms incluso si la negociación RTC se bloquea. `migration-inventory.test.js` volvió a aprobar conservando referencias V4 byte a byte.

**Resultados locales sobre código `791952e4e6c3d0cb4d978286b615c92940f9e2cf`:** `npm run build:v5` verde y `npm run test:v5` **480/480** aprobadas. CI remota del último HEAD aún puede estar en cola; no declarar 15/15 sin observarla. **Pendiente de aceptación:** dos teléfonos físicos en la misma URL Preview, medir fluidez de compañero en guardia, comparar con lobby, tiempos de interacción clínica y continuidad tras salida del anfitrión. No se han modificado Production, main, V4, fisiología, tratamientos, enfermería, evaluación ni XP.


## C5.b.3 — UI de amistades y latencia de guardia (22-10-2026)

**Reporte de aceptación manual:** el usuario confirmó que ya funciona el Cooperativo y que caminar en el lobby va fluido, pero pidió (1) solicitud de amistad visible como la invitación a guardia; (2) contador de notificaciones arriba a la derecha; (3) reducir lag al caminar y hablar al paciente en una guardia; (4) burbujas de mensajes sobre médicos en guardia. El tiempo de respuesta de dispositivos físicos permanece **sin certificar**.

**Correcciones acotadas en la rama experimental:**
- `src/v5/web/index.html` y `src/v5/web/game.css`: campanita con número de solicitudes entrantes de amistad + invitaciones de guardia; nuevo aviso de amistad con nombre y Aceptar/Rechazar. Mantiene la invitación unilateral existente. `src/v5/social/cooperative-link.js` utiliza la ruta ya existente `/api/friends/decline`; no hay servidor, loop, caché ni esquema nuevo.
- `src/v5/social/durable-cooperative-replica.js`: el cliente conserva la autoridad única PostgreSQL y los comandos idempotentes; mientras el médico está caminando refresca cada **300 ms** en vez de esperar 900 ms en reposo. Si llega un mensaje de paciente durante otro HTTP sync, se envía justo después de esa respuesta sin dos mutaciones simultáneas ni reintentos descontrolados. Añadida regresión unitaria para ese caso.
- `src/v5/app/world.js`: usa el interpolador existente para los médicos remotos también en guardia; conserva sus burbujas mientras llegan nuevos snapshots, sembrando desde la primera posición válida para impedir salto inicial. Ninguna posición visual reemplaza las decisiones espaciales del servidor clínico, y no se crea un segundo motor. `src/v5/render/hospital.js` dibuja globos tanto en lobby como en guardia.
- `src/v5/app/application.js`: convierte mensajes médicos confirmados en burbujas para ambos actores, enlaza la identidad del usuario autenticado con el sprite propio y muestra inmediatamente su propia burbuja al hablar **sin declarar ejecutado ningún acto médico**. El resultado del paciente sigue esperando el ACK real. Las solicitudes de amistad se aceptan/rechazan directamente en el aviso; el botón de notificaciones abre el directorio.
- `qa/v5/lobby-social-browser.mjs` exige ahora campanita y aviso de amistad a pantalla, además de invitación unilateral; `qa/v5/durable-cooperative-browser.mjs` exige burbujas locales y remotas en una guardia persistente real de dos navegadores.
- `src/v5/app/world.test.js` y `src/v5/social/durable-cooperative-replica.test.js` cubren continuidad visual, expiración de burbujas, entrega de mensajes durante peticiones en curso, identidad clínica única y deduplicación.

**Evidencia disponible:** compilación V5 aprobada antes del último ajuste de burbuja optimista; suite local `npm run test:v5` **478/478** en el checkpoint inmediatamente anterior al ajuste final; pruebas unitarias dirigidas (13/13), incluidas continuidad de movimiento y flush serial, aprobadas. El ajuste final de burbuja es exclusivamente visual. **No afirmar CI completamente verde del HEAD ni mejora WAN medida en teléfonos** hasta ejecutarla. La CI automatizada se encontraba en cola tras varios pushes, y es obligatoria para aceptación final.

**Protecciones:** Production, main, V4, casos clínicos, evaluación, dosis, enfermería, persistencia PostgreSQL y XP no fueron modificados. La evaluación y acciones siguen autorizadas exclusivamente en servidor. Próximos pasos: validar la prueba de navegador del último HEAD, medir RTT de guardia bajo latencia real con 2 teléfonos y confirmar sin saltos/duplicaciones; ajustar sólo el transporte si persiste el lag.


## C5.b.3 — lobby antiguo recuperado y aceptación unilateral verificada (20-10-2026 UTC)

**Motivo de este checkpoint:** en la aceptación física, el usuario confirmó que el chat ya funcionaba, pero el avatar remoto se teletransportaba y las invitaciones no llegaban/obligaban a invitaciones recíprocas. La clínica durable no era el origen.

**Causa y solución (sólo V5 experimental):**
- Se cotejó directamente `src/integration/remote-motion-487.js` y `src/social/remote-motion.js` de ATRIA 4.8.7. La ruta HTTP de V4 transmitía cada **260 ms** (RTC alcanzaba 100 ms), mientras V5 transmitía/poleaba cada **1000 ms**; el mismo interpolador interpreta esos huecos como interrupciones y reajustaba el actor remoto. `src/v5/social/cooperative-link.js` conserva ahora los metadatos históricos `motionAt`, `sentAt`, `motionCadence:260` y envía presencia+roster sin bloquear uno detrás de otro. La consulta de contactos/invitaciones se limita a ~780 ms para evitar sobrecarga. `src/v5/app/world.js` preserva el avatar, usa el sampler original a 260 ms y no le aplica también la navegación de médicos clínicos. No se añadieron bucles, servidores ni motores nuevos.
- El servidor **ya admitía invitación unilateral**: una única llamada de host a `/api/rooms`, luego el invitado acepta `/api/rooms/join`. El defecto estaba en V5: la invitación permanecía oculta en el modal de Personas. Se añadió `#coopInviteNotice` visible, no modal, con Aceptar/Rechazar; ambos usan la lógica social existente y la ruta ya implementada para declinar. Se puede tocar un avatar e invitarlo directamente sin amistad mutua; agregar a amigos sigue funcionando. El selector múltiple previo se conserva para 2–4 jugadores.
- El chat global y las burbujas que el usuario ya consideraba reparados se preservaron sin cambios.
  
**Evidencia:** `npm run test:v5` local **476/476**, `npm run build:v5` aprobado. El job aislado `lobby-social-acceptance` de GitHub Actions (run `39358444987`, job `118418663119`) aprobó en dos navegadores independientes (escritorio+Pixel emulado), con movimiento real de **57,96 px** y **salto máximo entre fotogramas de 3,77 px**. También confirmó burbujas, chat bilateral, interacción por tocar, amistad, una sola invitación de anfitrión, notificación visible y aceptación del invitado hasta entrar en guardia. La regresión histórica `ATRIA 4.8.7 Legacy Gameplay Census` del SHA anterior `a9fdc6a2` terminó aprobada. La CI completa del SHA de código `e8c53ac8` estaba todavía ejecutándose en la última consulta; **no declarar toda la CI verde sin leer el resultado final**.

**Pendiente:** prueba de dos teléfonos físicos bajo latencia real, validar suavidad y notificaciones en Android/iPhone, y revisar CI completa del HEAD definitivo. No tocar Production, main, V4, arquitectura clínica durable, tratamientos o XP por estas correcciones de lobby. El preview experimental y la autoridad clínica siguen en su configuración previa.


## C5.b.3 — aceptación física: lobby social (19-10-2026)

**Tres fallos confirmados por el usuario en dos dispositivos físicos:** (1) otro jugador parecía teletransportarse en el lobby; (2) los mensajes públicos no llegaban al otro dispositivo, ni al historial ni a la burbuja; (3) hacer Cooperativo requería un formulario de casillas complejo, sin poder tocar primero a un amigo. Estas son fallas de UX/social independientes de la autoridad clínica PostgreSQL y deben quedar resueltas antes de certificar aceptación móvil.

**Correcciones publicadas solamente en `atria-5.0-core-rebuild-experimental`:**

- `src/v5/app/world.js`: deja de recrear el avatar en cada actualización de presencia; reutiliza `src/social/remote-motion.js` (motor previamente probado), interpola pose en el RAF existente, conserva globos y deja la navegación clínica de guardia separada. Unitarios verifican transición suave en posición intermedia, expiración del globo y separación de guardia.
- `src/v5/social/cooperative-link.js`: publica chat global por las rutas sociales existentes `/api/lobby/chat`, reenvía los mensajes del roster y consulta amistades/solicitudes mediante `/api/me`; usa `friends` y `friends/accept` ya existentes. Un test de dos clientes independientes comprobó registro, chat, solicitud, aceptación e invitación.
- `src/v5/app/application.js` y `src/v5/render/hospital.js`: los mensajes del lobby se muestran una vez en ambos historiales y como burbujas temporales; tocar el avatar en el lobby abre acciones Agregar a amigos / Aceptar amistad / Invitar a guardia, con PBE preseleccionado y selector de caso acotado. Se conserva el mecanismo anterior de invitación múltiple y el cliente durable sin modificaciones.
- `qa/v5/lobby-social-browser.mjs` valida dos navegadores independientes (uno emulado Pixel) con chat bilateral, burbujas, toque de avatar, amistad y recepción de invitación. Quedó añadido a CI `independent-game-browser`. **Aún pendiente confirmar esa prueba y CI general en el HEAD final; no afirmar que la aceptación física ya pasó.**

**Resultados ya verificados:** `npm run build:v5` aprobó; `npm run test:v5` del primer checkpoint de UI aprobó 474/474. Los 17 tests dirigidos de mundo y vínculo social, incluido uno nuevo para dos clientes, pasaron 17/17 en el checkpoint posterior. **Sigue pendiente** corrida de navegador real/CI final; el usuario debe comprobar los tres comportamientos en dos móviles sobre la misma URL del HEAD final. Production, main, V4, terapias y autoridad clínica durable no fueron modificados.


Repositorio `javierdario48-star/ATRIA`; rama exclusiva `atria-5.0-core-rebuild-experimental`. Base original: `388f1fdb62f0dfd34cbb1c2db1227e879140bfce`. Código ejecutable certificado: `6f152a61f02b571dd56218e6a2befa9b0480f6c7`. Esta consolidación parte del HEAD remoto `d739d6a3faead992e5e563d6d31f9f3e26200f5a` y sólo modifica QA/workflow/evidencia. El HEAD vigente es el commit que contiene este archivo (`git rev-parse HEAD`); comprobar sus checks exactos. Obtener HEAD remoto antes de continuar; nunca forzar el ref.

## Estado — 19-10-2026 UTC

**Autoridad clínica C5.b.3 validada y habilitada sólo en el Preview experimental. La aceptación técnica del HEAD exige sus checks 15/15 V5 y 4/4 históricos.** PBE cerró con 100/100 y 111 XP por médico: dos procesos Chromium independientes, uno con emulación Pixel 5; interrogatorio/examen, dos estudios recibidos, monitor/ceftriaxona/albúmina con enfermería física, mejoría fisiológica, reevaluación, Sala, pérdida del anfitrión con trabajo pendiente, continuación del invitado, retorno y recarga de ambos sin duplicar historial, dosis, estudios, recibos o XP.

No equivale a aceptación en teléfonos físicos ni a terminar todo C5/ATRIA. C5.a se conserva. Production, main y ATRIA 4.8.7 no se modificaron.

## Consolidación de la espera HTTP

El HEAD previo `d739d6a` obtuvo 14/15 V5 ([run 39196874010](https://github.com/javierdario48-star/ATRIA/actions/runs/39196874010)) y 4/4 históricos ([run 39196874005](https://github.com/javierdario48-star/ATRIA/actions/runs/39196874005)). Falló únicamente `durable-cooperative-browser`, job `117881436638`, durante `remote navigation and shared transcript`: `waitForResponse` agotó 45 s. PBE, recuperación y equipos de 3/4 sí aprobaron.

La suscripción se instalaba antes del clic. Playwright 1.58.2 conserva el cuerpo de Response en `_contentPromise`; leer JSON en otro observador no lo consume. El log anterior no retenía la celda/pose esperada y no demuestra por sí solo un defecto del transporte. La nueva regresión controlada sí reproduce un defecto del bot: con una corrección de cámara admisible de ±0,8 píxeles, los puntos (400,580)/(496,840), próximos al borde de celda, generan otra meta real. El servidor llega a esa otra meta y la espera exige una posición diferente.

El bot ahora proyecta el centro de la misma celda solicitada, preservando incluso la búsqueda de celda abierta para los puntos bloqueados. Conserva clic real, hit-test visible, llegada autoritativa, tolerancias, 45 s y todas las aserciones clínicas. Un fallo futuro incluye doctor, waypoint, meta y última pose/época HTTP. No se cambió código productivo ni el transporte.

Regresión con mapa/navegación reales y doble de página: 2 controles pasaban y 4 casos con cámara corregida fallaban antes; 6/6 pasan después. Cinco recorridos completos consecutivos con dos navegadores independientes y RTC bloqueado aprobaron pérdida/recuperación del anfitrión y transcript compartido. La CI repite ese recorrido tres veces dentro del mismo job (siguen siendo 15 jobs). Se repitieron 474/474 V5, 40/40 core, builds y frontera de 82 módulos/un RAF. [Evidencia de consolidación](../evidence/c5b3/navigation-wait.json).

## Corrección acotada

- Admisión durable mediante HTTP autenticado para ambos roles, independiente de `durable.hello` por WebRTC. Reintenta desde el RAF existente con plazo de 1 s aunque la señalización siga pendiente. La caché social `allAccepted` no autoriza: `start` verifica invitación completa en servidor y `sync` membresía durable. Capacidad conservada por sala; C5.a mantiene sus requisitos/transporte.
- `world.motionIntent()` registra sólo destinos/paradas explícitos. Una posición recibida ya no vuelve al servidor como otra instrucción que cancela el destino. La reconciliación reconstruye la ruta existente desde la posición corregida. Sin cambios de mapa, velocidad, alcance ni fisiología.
- El bot espera el mensaje concreto y confirma llegada autoritativa en cada tramo antes de seguir; usa clic real visible, sin forzar. Su oracle de navegación sólo opera sobre un clon Node. Al retornar exige también convergencia local/cámara.
- La prueba pierde al anfitrión tras comprobar cero administraciones y estudios pendientes después de monitor/ceftriaxona. El invitado envía albúmina y continúa desconectado el anfitrión. Para cada fármaco exige orden original `pending` y un completion posterior único ligado a actor/sourceEventId. Así verifica causalidad aunque un ACK repetido llegue después de completarse enfermería; el ACK retenido puede evolucionar a `executed`.

La CI original `39189733905` tenía 14/15. Sus síntomas no demostraban una causa única. A 350 ms se reprodujeron rechazos por posición fuera del radio de B1: [observaciones anteriores](../evidence/c5b3/spatial-rejection-before-fix.json). Se conservaron los fallos, sin subir tiempos ni bajar 100/111. No se reemplazaron motores ni añadieron casos.

## Evidencia

| Validación | Resultado |
|---|---|
| CI del código ejecutable `6f152a6` | [V5 39194087173](https://github.com/javierdario48-star/ATRIA/actions/runs/39194087173): 15/15; [histórica 39194087198](https://github.com/javierdario48-star/ATRIA/actions/runs/39194087198): 4/4. [Registro](../evidence/c5b3/code-ci.json). Incluye cierre PBE, 2/3/4 médicos, recuperación y C5.a. |
| Local | 474/474 V5, 40/40 core, 19 mundo/navegación, ambos builds. Frontera: 82 módulos, un RAF, sin timer nuevo ni otro ejecutor clínico en UI. |
| Admisión sin RTC/sondeo social terminado | Tres médicos entraron con bootstrap diferido, sync 404 y señalización pendiente; ninguno creó autoridad local. Incluido en CI. |
| PBE a 350 ms | 100/100, 111 XP cada uno, recuperación y ambas recargas sin duplicados. [Resultado](../evidence/c5b3/pbe-latency350.json). |
| UI real/PostgreSQL/dos despliegues | Cada navegador usó un Preview distinto del mismo código y la misma guardia. [Clínica](../evidence/c5b3/pbe-postgres.json), [concurrencia/recuperación](../evidence/c5b3/postgres-preview.json). |
| Albúmina concurrente | Mismo evento real: un 200 y un 409 busy. El invitado recuperó su ACK por el segundo despliegue; sólo dos dosis totales. Tras cierre, ambos devolvieron el mismo ACK clínico. Otro evento concurrente produjo una sola entrada. |
| Lectura SQL independiente al terminar | Cerrado, revisión SQL 355/época 177, lease nulo; dos dosis y dos estudios con fuentes únicas; dos claims de 111 ligados a sus integrantes; confirmaciones de ambos; cero enfermería/accesos pendientes. [SQL](../evidence/c5b3/postgres-persisted.json). |
| CAS PostgreSQL aislado | Cuatro writers, un ganador/tres conflictos; escritura obsoleta rechazada. Sólo se borró la fila aislada. [Prueba](../evidence/c5b3/postgres-cas.json). |
| Assets desplegados | Manifest y 114 hashes idénticos; HTML idéntico al quitar sólo el script oficial del toolbar Preview de Vercel. [Prueba](../evidence/c5b3/preview-assets.json). |

Los checks del SHA que contiene este handoff identifican la CI exacta de QA/documentación. Las referencias anteriores certifican el código ejecutable; no sustituyen comprobar el HEAD definitivo. [Registro de alcance/despliegues](../evidence/c5b3/verification.json).

## Preview y autoridad

Vercel `night-shift-clinical`, región `gru1`: [Preview de esta rama](https://night-shift-clinical-git-atria-50-c-fd8524-javierdario4878-7324.vercel.app/). URLs inmutables y deployment IDs en la evidencia. No promover a Production.

`ATRIA_DURABLE_COOP_ENABLED=1` se creó sólo para target Preview y esta rama, después de CI 15/15 + 4/4. La condición sigue intacta: `VERCEL_ENV==='preview' && ATRIA_DURABLE_COOP_ENABLED==='1'`. No se retiró C5.a.

Supabase `atria-clinical`, ref `hugqjejfyyilslbomsgi`, São Paulo. `SUPABASE_URL`/`SUPABASE_SECRET_KEY` permanecen del lado servidor y sólo en Preview; adapter/RPC/RLS sin cambios. [Contrato/DDL](C5B2_SUPABASE_STORE.md), [autoridad](C5B_PERSISTENT_CLINICAL_AUTHORITY.md).

La autoridad conserva concesión/época y CAS de todo el agregado antes del ACK; un worker obsoleto no publica. El runtime compone World/GuardSession existentes. Vía, monitor, preparaciones, viajes de enfermería, estudios, reloj, recibos, cierre, claims y confirmaciones se recuperan del checkpoint operacional. Ningún cliente durable crea GuardSession ni ejecuta otra fisiología.

## Prueba mínima en dos teléfonos

1. Abrir el mismo Preview en ambos, nombres distintos, entrar y abrir «Personas» para aparecer.
2. Uno: «Hacer guardia → Cooperativo», elegir PBE e invitar. El otro acepta desde «Personas».
3. Acercarse a B1 y repartir anamnesis/examen, paracentesis diagnóstica y función renal/ionograma. Registrar PBE, monitor, ceftriaxona 1 g y albúmina 1.5 g/kg. Esperar recibos/resultados y reevaluar antes de Sala.
4. Cerrar anfitrión con trabajo pendiente; continuar como invitado. Reabrir el mismo URL/perfil sin borrar almacenamiento: mismo paciente/historial/órdenes. Tras cierre y recarga de ambos, un solo recibo de XP por médico.

## Reproducir y continuar

`npm run test:v5`; `npm run test:v5-core`; ambos builds; `node scripts/audit-v5-boundary.mjs`; `npm test`; `git diff --check`. Playwright/Chromium: `.github/workflows/atria-v5-core.yml`.

Navegador: `node qa/v5/durable-cooperative-browser.mjs`; `node qa/v5/durable-cooperative-admission-browser.mjs`; `V5_DURABLE_PLAYERS=3 node qa/v5/durable-cooperative-team-browser.mjs` (repetir con 4); `V5_DURABLE_LATENCY=350 node qa/v5/durable-cooperative-closure-browser.mjs`.

WAN: `V5_BROWSER_URL=<primary> V5_SECONDARY_URL=<secondary> node qa/v5/durable-postgres-preview.mjs`. Ambos HTTPS Preview habilitados, PostgreSQL y mismo código. Reutiliza UI completa, compite con el mismo evento real y devuelve respuestas reales; nunca fabrica estados clínicos. Flags proxy/CA del reporte: sólo entorno de automatización, sin relajar seguridad del producto. Resultados en `qa/v5-browser-results`; el backend local es SQLite/CAS y no equivale a PostgreSQL/WAN.

## Contratos y límites

Cinco ejecutores: `CIRR-001`, `APP-001`, `PERI-SEC-001`, `PERI-PBE-001`, `PERI-TER-001`. Sin casos nuevos ni migración de los otros ocho. Competitivo desactivado. Solitario/Aprendiz, NPC, chat/menciones, enfermería, estudios, farmacología, fisiología, historial, cierre, XP, teclado y movimiento conservan sus implementaciones/regresiones.

Orden válida no equivale a administración; no bloquear una decisión incorrecta pero interpretable. Derivar no opera ni controla foco. Disposición y calidad/XP siguen separadas. Reloj visible: 1 min real = 1 h de juego; farmacodinámica nativa .12/.03, sin cambiar constantes.

Carrera por dispositivo y claims durables por integrante; sin afirmar migración de carrera global de cuenta. Lobby/chat social conserva servicio regional existente. Voz/TURN y Android/iPhone físicos fuera de esta certificación; emulación Pixel no equivale a dispositivo físico. No retirar C5.a ni ampliar a Production sin tarea posterior explícita.

Calidad: dos módulos productivos modificados en la corrección; sin dependencias nuevas, timers, motores paralelos ni refactors generales. La extensión posterior es QA/evidencia. Revisión focal y frontera verificadas.

Contratos: [manual maestro](ATRIA_50_MANUAL_MAESTRO_FUNCIONAL.md), [C5.a](C5A_SHARED_CLINICAL_GUARD.md), [C5.b.1](../evidence/c5b/verification.json), [PBE](C3B_PBE.md), [terciaria](C3C_TERTIARY_PERITONITIS.md).
