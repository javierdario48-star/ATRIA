# ATRIA 5.0 — C5.b.3 Cooperativo persistente

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
