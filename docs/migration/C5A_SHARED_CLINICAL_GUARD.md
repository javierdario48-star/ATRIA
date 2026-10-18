# C5.a — primera guardia clínica compartida

Implementación candidata posterior a C3.b y C3.c certificados. **Pendiente de la prueba pública de dos navegadores y CI de este SHA; no certificar todavía.**

## Ruta de producto y autoridad

Personas conecta el lobby social existente. Hacer guardia → Cooperativo permite seleccionar un caso clínico migrado e invitar de uno a tres colegas conectados; cada colega acepta desde Personas. La guardia empieza al aceptar todos. Competitivo permanece desactivado.

Se reutilizan registro/reanudación, presencia, invitaciones y señalización autenticada `/api/lobby-sync` existentes, sin tocar `api` ni el runtime antiguo. Un canal WebRTC fiable y ordenado por colega lleva comandos, confirmaciones y snapshots fragmentados. La identidad procede de la conexión autenticada, nunca de `actorId` escrito por el invitado. Los paquetes están ligados a sala y conexión vigentes.

El anfitrión instancia **el mismo `createGuardSession` y el mismo ejecutor de Solitario** con miembros Cooperativo. Sólo ese mundo mueve enfermería y avanza el reloj/fisiología. El invitado conserva movimiento local, render e interfaz; su réplica sólo recibe evidencia y reenvía órdenes. No instancia otro motor, no escribe signos ni acredita un estudio pendiente. La distancia clínica se comprueba en el mundo autorizado y los movimientos usan la navegación existente.

Un transcript de guardia reúne mensajes de todos, respuestas y enfermería. Paciente cercano por defecto, menciones manuales/automáticas Enfermera y Vega. IDs de mensaje únicos por carga y actor; reenvíos conservan el ID, incluso tras recargar el invitado. La cola sin confirmar se conserva en sessionStorage. La autoridad ejecuta una sola vez cada evento. El XP usa la fórmula original para modo no solitario, un recibo por caso compartido y una acreditación por dispositivo en el ledger ya existente.

La primera versión mantiene al anfitrión como autoridad durante la guardia: **recargar o cerrar al anfitrión no tiene migración de autoridad ni recuperación durable**. La recarga del invitado retoma el paciente vivo del anfitrión. Si un invitado desconectado todavía no recibió el resultado, la salida normal del anfitrión espera su reconexión o su salida explícita; no hay todavía un buzón durable que permita entregar ese resultado después de apagar al anfitrión. La interfaz explica esa espera. No declarar resuelto todo C5 por esta primera ruta.

## Defectos reproducidos durante implementación

- Una identidad recargada empezaba de nuevo la secuencia de movimiento; presencia la rechazaba como vieja. Ahora renueva sesión/época autenticada y conserva identidad.
- Una guardia cancelada podía reintentarse para siempre; una respuesta HTTP anterior podía reabrir una guardia abandonada. Se limpia el puntero terminal y se valida generación tras cada operación pendiente.
- Un fallo HTTP503 cerraba la guardia. Sólo una respuesta terminal403/404 invalida la sala; un fallo de red conserva el paciente y permite reintento.
- Una conexión RTC fallida quedaba oculta por el estado aún abierto del canal; se prioriza el estado de conexión. Un canal retirado no puede entregar órdenes a la nueva guardia.
- Una invitación aceptada tarde podía sustituir Solitario. La intención de modalidad se invalida al cambiar/iniciar modo local y la entrada requiere un lobby sin sesión activa.
- Salir inmediatamente después del cierre podía cortar el recibo del invitado. El resultado terminal se publica inmediatamente y la salida del anfitrión espera confirmaciones del evento exacto de los colegas presentes. El invitado conserva el debrief aun cuando se cierre la sala social.

## Verificación diseñada

`cooperative-care.test.js`: dos credenciales, mismo paciente nativo, órdenes pendientes sin efectos, dosis auténticas de ambos médicos, estudios/historia/examen compartidos y dos solicitudes paralelas de cierre con un único XP. Pruebas separadas de réplica, enlace, fragmentación y ciclo de vida reproducen los fallos anteriores. No son sustituto de la UI.

`qa/v5/cooperative-clinical-browser.mjs`: dos procesos Chromium independientes (escritorio y Pixel emulado), API histórica real con caché QA aislada y35ms por petición, WebRTC real, caminar desde el lobby, PBE compartida completa, dos administraciones con distintos actores, estudios realizados, recarga real del invitado, cierre100/111XP y persistencia. La prueba detiene temporalmente el runtime invitado para comprobar que salir inmediatamente del anfitrión espera la entrega. La simultaneidad de cierres corresponde a la prueba de autoridad, no se afirma por clics ignorados. Segunda guardia: morfina perjudicial y fluidos realmente administrados, complicación y muerte sostenida compartidas, cero XP y sin perder la experiencia previa.

## Límites y siguiente etapa

Pendientes de evidencia: ejecución de ese bot, tres/cuatro jugadores clínicos, WAN/NAT/TURN y Android físico. El backend social existente sigue usando caché regional efímera; no equivale a persistencia transaccional o lobby escalable certificado. El chat de lobby todavía conserva la ruta local antigua de V5; el chat clínico sí usa el transcript único de la autoridad. El reloj nativo sigue el estado de escritura del anfitrión; no se ha certificado una política temporal colaborativa nueva.

Después de demostrar dos médicos: ampliar a tres/cuatro, reintentos y desconexiones más adversariales, persistencia/migración de autoridad y chat social completo. Mantener Competitivo desactivado y no migrar los otros ocho casos antes de validar esta ruta.
