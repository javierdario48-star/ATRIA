# C5.a — primera guardia clínica compartida

**Primer recorrido de dos médicos certificado en `6b201645bc7037141c1abd502bdbdef7354ac8aa`.** [CI V5 8/8](https://github.com/javierdario48-star/ATRIA/actions/runs/39118154410), [histórica 4/4](https://github.com/javierdario48-star/ATRIA/actions/runs/39118154408), [verificación exacta](../evidence/c5a/two-doctor-verification.json), [recibos/resultados](../evidence/c5a/two-doctor-browser.json). Preview READY/HTTP200 y114 hashes coincidentes: https://night-shift-clinical-8lxwhuzfs-javierdario4878-7324.vercel.app/. **Ampliación2/3/4 certificada en `6f59d202f4265ce7047eda0873f5f400d3b50eda`: [V5 10/10](https://github.com/javierdario48-star/ATRIA/actions/runs/39119167313), [histórica 4/4](https://github.com/javierdario48-star/ATRIA/actions/runs/39119167353).** [Certificación y alcance](../evidence/c5a/verification.json).

## Ruta de producto y autoridad

Personas conecta el lobby social existente. Hacer guardia → Cooperativo permite seleccionar un caso clínico migrado e invitar de uno a tres colegas conectados; cada colega acepta desde Personas. La guardia empieza al aceptar todos. Competitivo permanece desactivado.

Se reutilizan registro/reanudación, presencia, invitaciones y señalización autenticada `/api/lobby-sync` existentes, sin tocar `api` ni el runtime antiguo. Un canal WebRTC fiable y ordenado por colega lleva comandos, confirmaciones y snapshots fragmentados. La identidad procede de la conexión autenticada, nunca de `actorId` escrito por el invitado. Los paquetes están ligados a sala y conexión vigentes.

El anfitrión instancia **el mismo `createGuardSession` y el mismo ejecutor de Solitario** con miembros Cooperativo. Sólo ese mundo mueve enfermería y avanza el reloj/fisiología. El invitado conserva movimiento local, render e interfaz; su réplica sólo recibe evidencia y reenvía órdenes. No instancia otro motor, no escribe signos ni acredita un estudio pendiente. La distancia clínica se comprueba en el mundo autorizado y los movimientos usan la navegación existente.

Un transcript de guardia reúne mensajes de todos, respuestas y enfermería. Paciente cercano por defecto, menciones manuales/automáticas Enfermera y Vega. IDs de mensaje únicos por carga y actor; reenvíos conservan el ID, incluso tras recargar el invitado. La cola sin confirmar se conserva en sessionStorage. La autoridad ejecuta una sola vez cada evento. El XP usa la fórmula original para modo no solitario, un recibo por caso compartido y una acreditación por dispositivo en el ledger ya existente.

La primera versión mantiene al anfitrión como autoridad durante la guardia: **recargar o cerrar al anfitrión no tiene migración de autoridad ni recuperación durable**; debe permanecer abierto y visible, pues la política de pausa de la aplicación también suspende su RAF al ocultarse. La recarga del invitado retoma el paciente vivo del anfitrión. Si un invitado desconectado todavía no recibió el resultado, la salida normal del anfitrión espera su reconexión o su salida explícita; no hay todavía un buzón durable que permita entregar ese resultado después de apagar al anfitrión. La interfaz explica esa espera. No declarar resuelto todo C5 por esta primera ruta.

## Defectos reproducidos durante implementación

- Una identidad recargada empezaba de nuevo la secuencia de movimiento; presencia la rechazaba como vieja. Ahora renueva sesión/época autenticada y conserva identidad.
- Una guardia cancelada podía reintentarse para siempre; una respuesta HTTP anterior podía reabrir una guardia abandonada. Se limpia el puntero terminal y se valida generación tras cada operación pendiente.
- Un fallo HTTP503 cerraba la guardia. Sólo una respuesta terminal403/404 invalida la sala; un fallo de red conserva el paciente y permite reintento.
- Una conexión RTC fallida quedaba oculta por el estado aún abierto del canal; se prioriza el estado de conexión. Un canal retirado no puede entregar órdenes a la nueva guardia.
- El primer bot real falló al recargar al invitado. Las ofertas/respuestas ICE antiguas del relay podían mezclarse con la negociación nueva; ahora cada conexión lleva un identificador de negociación, descarta respuestas/candidatos retirados y renueva el enlace al detectar la nueva sesión de presencia. Dos pruebas reprodujeron el rechazo y sustitución pendientes. La réplica se carga antes de exponerla a callbacks de foco de la interfaz, evitando lecturas del paciente todavía nulo.
- La regresión pública de estudios detectó IDs de mensaje modificados innecesariamente en Solitario. Se conserva su contrato anterior; el UUID por carga sólo se añade en Cooperativo, donde la recarga reutiliza sala/paciente.
- Una invitación aceptada tarde podía sustituir Solitario. La intención de modalidad se invalida al cambiar/iniciar modo local y la entrada requiere un lobby sin sesión activa.
- Salir inmediatamente después del cierre podía cortar el recibo del invitado. El resultado terminal se publica inmediatamente y la salida del anfitrión espera confirmaciones del evento exacto de los colegas presentes. El invitado conserva el debrief aun cuando se cierre la sala social.

## Verificación y ampliación

`cooperative-care.test.js`: dos credenciales, mismo paciente nativo, órdenes pendientes sin efectos, dosis auténticas de ambos médicos, estudios/historia/examen compartidos y dos solicitudes paralelas de cierre con un único XP. Pruebas separadas de réplica, enlace, fragmentación y ciclo de vida reproducen los fallos anteriores. No son sustituto de la UI.

`qa/v5/cooperative-clinical-browser.mjs`: dos procesos Chromium independientes (escritorio y Pixel emulado), API histórica real con caché QA aislada y35ms por petición, WebRTC real, caminar desde el lobby, PBE compartida completa, dos administraciones con distintos actores, estudios realizados, recarga real del invitado, cierre100/111XP y persistencia. La prueba detiene temporalmente el runtime invitado para comprobar que salir inmediatamente del anfitrión espera la entrega. La simultaneidad de cierres corresponde a la prueba de autoridad, no se afirma por clics ignorados. Segunda guardia: morfina perjudicial y fluidos realmente administrados, complicación y muerte sostenida compartidas, cero XP y sin perder la experiencia previa.

## Límites y siguiente etapa

El bot de dos médicos está aprobado y su ZIP se verificó por SHA256 `1b252d72a11e88b7f1bcf90aaa8b15adf44057085280f99d6f02eedb2bc659a2`. [Capturas](https://github.com/javierdario48-star/ATRIA/actions/runs/39118154410/artifacts/12133630937). La ampliación de tres/cuatro está aprobada; siguen pendientes WAN/NAT/TURN y Android físico. El backend social existente sigue usando caché regional efímera; no equivale a persistencia transaccional o lobby escalable certificado. El chat de lobby todavía conserva la ruta local antigua de V5; el chat clínico sí usa el transcript único de la autoridad. El reloj nativo sigue el estado de escritura del anfitrión; no se ha certificado una política temporal colaborativa nueva.

Después de demostrar2/3/4 médicos: reintentos y desconexiones más adversariales, persistencia/migración de autoridad y chat social completo. Mantener Competitivo desactivado y no migrar los otros ocho casos antes de validar esta ruta.

La ampliación `cooperative-team-browser.mjs` se ejecuta con3 y4 procesos, Pixel en el último, latencias HTTP70/110ms. Reparte órdenes/estudios/evaluación, exige100/111 y un recibo personal persistido por médico. Recarga al último invitado antes del cierre y lo mantiene en la portada hasta que el anfitrión intenta salir: su primer snapshot terminal debe persistirse antes del ACK. Otra guardia verifica salida explícita de invitado, desaparición del avatar y conservación de paciente/reloj para quienes siguen. **Aprobado para3 y4, sin errores de página**. [Tres médicos](../evidence/c5a/team-3-browser.json), [cuatro médicos](../evidence/c5a/team-4-browser.json).

Se reprodujeron y corrigieron además una invitación huérfana y una membresía fantasma al cancelar mientras los POST ya estaban confirmados pero sus respuestas retenidas, y un avatar que no se retiraba tras salir de la sala. La limpieza respeta una nueva entrada intencional a la misma sala. Crear/aceptar otra invitación cancela la intención anterior. La confirmación inicial terminal se difiere hasta vincular la réplica y terminar el render/persistencia. Son correcciones de ciclo de vida; no añaden clínica.

## Certificación final del código

`6f59d202f4265ce7047eda0873f5f400d3b50eda`:438/438V5,40core, ambos builds y frontera74 módulos. Las pruebas completas de APP, CIRR y las tres peritonitis permanecen en CI;421 órdenes combinadas,131 cierres y39 escenarios perjudiciales históricos se conservan sin relajar. La primera publicación `c892834` falló en reconexión y IDs de estudios; sus causas están corregidas en `6b20164` y los recorridos completos se repitieron en el SHA final.

| Médicos | Evidencia pública de UI | Alcance |
| --- | --- | --- |
|2 | [Capturas/recibos](https://github.com/javierdario48-star/ATRIA/actions/runs/39119167313/artifacts/12133876515) | PBE compartida100/111, recarga del invitado, entrega con runtime detenido, otra guardia con complicación/muerte y0XP. |
|3 | [Capturas/recibos](https://github.com/javierdario48-star/ATRIA/actions/runs/39119167313/artifacts/12133418206) | PBE100/111 por médico, primer snapshot terminal tras recarga, salida explícita sin reset;70ms por petición HTTP. |
|4 | [Capturas/recibos](https://github.com/javierdario48-star/ATRIA/actions/runs/39119167313/artifacts/12134095139) | Igual alcance de cierre/reconexión/salida; tres administraciones de tres médicos y110ms HTTP. |

Todos usan procesos Chromium separados, último invitado Pixel emulado y WebRTC auténtico; el backend de pruebas usa la API histórica intacta con caché QA inyectada. No se afirma simulación de latencia del canal RTC ni prueba entre redes diferentes. Los tres ZIP se descargaron y verificaron contra sus digests GitHub. Preview final: https://night-shift-clinical-cw5pkyzvb-javierdario4878-7324.vercel.app/ (READY/HTTP200,114 hashes idénticos al build).

Esta certificación cubre una **primera ruta Cooperativa clínica funcional**, no todo C5. Siguen vigentes los límites de anfitrión, caché efímera, lobby, WAN y Android físico. La superposición de rótulos al reunir cuatro avatares junto a una cama queda para el pulido; no se cambiaron mapa ni sprites.
