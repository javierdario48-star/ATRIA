# ATRIA 5.0 — continuación C5.b.3

Repositorio `javierdario48-star/ATRIA`. Rama exclusiva `atria-5.0-core-rebuild-experimental`. Base remota verificada al iniciar: `388f1fdb62f0dfd34cbb1c2db1227e879140bfce`. Obtener el HEAD actual antes de modificar; nunca forzar el ref. Contratos: [manual maestro](ATRIA_50_MANUAL_MAESTRO_FUNCIONAL.md), decisiones explícitas del usuario y ejecutores existentes.

## Checkpoint de corrección — 19-10-2026 UTC

**C5.b.3 sigue en validación; todavía no activar el Preview.** En la base, CI V5 run `39189733905`: 14/15 trabajos aprobados; únicamente falló el cierre PBE. Sus síntomas (albúmina y renal ausentes) no identificaban por sí solos la causa.

Correcciones acotadas de esta continuación:

- La entrada durable usa HTTP autenticado para anfitrión e invitados. No depende de recibir un `durable.hello` por WebRTC. La admisión reintenta desde el RAF existente, con un plazo de 1 s, aunque una petición de señalización siga pendiente. `start` verifica la invitación completa en el servidor; `sync` verifica la membresía durable. La caché social `allAccepted` no decide la autorización durable. El cliente C5.a conserva su requisito de invitación aceptada y su transporte original. La capacidad se conserva por sala para no repetir sondeos de escritura en cada reintento.
- El mundo distingue instrucciones locales de movimiento de posiciones recibidas. Antes, una corrección visual podía volver al servidor como otra orden y cancelar el destino; además, mover la posición sin reconstruir el camino dejaba un índice de ruta incompatible. `world.motionIntent()` registra sólo destinos/paradas explícitos; la reconciliación reutiliza la navegación existente para rehacer el camino desde la posición corregida. No cambia velocidad, mapa, alcance clínico ni motor fisiológico.
- El bot espera el mensaje concreto enviado, en lugar de cualquier incremento del transcript. El caso PBE ahora exige desconexión del anfitrión con enfermería/estudios pendientes, continuidad del invitado, mejoría fisiológica, retorno del anfitrión y recarga de ambos tras cierre con recibos/XP únicos. El viewport de escritorio es el mismo 1280×960 de los otros recorridos durables para evitar clics interceptados por el HUD.

Evidencia local reunida: 474/474 pruebas V5; 40/40 núcleo; builds V5 y core; frontera arquitectónica (82 módulos, un RAF, sin nuevo timer ni ejecutor clínico en UI). La prueba focal de movimiento fue roja y después verde; 19 pruebas de mundo/navegación pasan. La admisión de tres médicos pasó con bootstrap diferido, `sync` 404 y señalización de anfitrión/invitado todavía colgada; todos recibieron el mismo paciente sin autoridad local.

**El cierre PBE ordinario pasó una vez con 100/100 y 111 XP por médico. No basta para certificar la integración.** La ampliación a 350 ms reprodujo rechazos `no-patient-target` por posición del servidor fuera del radio de B1; [observaciones previas a la corrección](../evidence/c5b3/spatial-rejection-before-fix.json). Un recorrido posterior completó fármacos/estudios y cierre, pero obtuvo 96 porque una pregunta quedó sin paciente; esa ejecución se mantuvo FALLIDA, sin bajar 100/111. Se está verificando la corrección completa de reconciliación. No presentar el fallo original de CI como causalmente demostrado en todos sus detalles.

## Persistencia y activación

Supabase dedicado: `atria-clinical`, referencia `hugqjejfyyilslbomsgi`, PostgreSQL en São Paulo. El adapter existente, RPC CAS, RLS y acceso sólo servidor se conservan. [Contrato y DDL](C5B2_SUPABASE_STORE.md), [autoridad recuperable](C5B_PERSISTENT_CLINICAL_AUTHORITY.md).

Prueba real adicional: cuatro llamadas independientes con revisión esperada 1 produjeron un ganador (revisión 2) y tres conflictos; una escritura obsoleta posterior fue rechazada. Se borró sólo la fila aislada de QA. [Evidencia](../evidence/c5b3/postgres-cas.json). Esto no equivale aún a un recorrido clínico WAN entre instancias Vercel.

`SUPABASE_URL` y `SUPABASE_SECRET_KEY` existen sólo en Preview. `ATRIA_DURABLE_COOP_ENABLED` no se ha configurado. La condición de `api/clinical.js` sigue siendo `VERCEL_ENV==='preview' && ATRIA_DURABLE_COOP_ENABLED==='1'`. Production está siempre desactivada. No tocar Production, main, V4, claves privadas ni planes. Conservar la ruta C5.a.

## Continuar desde aquí

1. Terminar el recorrido PBE ampliado: dos navegadores independientes, enfermería física, dos fármacos, dos estudios, respuesta fisiológica, reevaluación, Sala 100/111, mismo historial y ninguna duplicación al recargar. No aumentar tiempos ni reducir aserciones.
2. Revalidar los recorridos durables de 2/3/4 médicos y las regresiones C5.a. Verificar ambos workflows del SHA publicado, no una CI de otro commit. Las pruebas de tres/cuatro de la base sí aprobaron; no confundirlo con los nuevos recorridos todavía en marcha.
3. Sólo tras aprobación automatizada, provisionar la activación limitada a esta rama Preview y desplegar el SHA probado. Probar el mismo juego contra PostgreSQL real, concurrencia/recuperación entre instancias, órdenes pendientes y XP; comprobar de nuevo UI completa. No sustituir C5.a ni declarar C5 completo por un sondeo de capacidad.
4. Actualizar este handoff con SHA/CI/evidencia/URL final y límites comprobados.

## Contratos preservados

Cinco ejecutores actuales: `CIRR-001`, `APP-001`, `PERI-SEC-001`, `PERI-PBE-001`, `PERI-TER-001`. No añadir casos ni migrar los otros ocho en esta tarea. Competitivo permanece desactivado. Mantener Solitario/Aprendiz, mapa/sprites, teclado propio, chat/menciones, examen, estudios, farmacología, enfermería, fisiología, cierre y XP.

`guard-runtime.js` compone el mismo World/GuardSession existentes. `durable-guard-authority.js` usa concesión/época y CAS de todo el agregado antes de ACK. Un trabajador obsoleto no publica. Preparaciones, vías, monitor, trabajos de enfermería, estudios, reloj, recibos, cierre y claims por integrante se recuperan del checkpoint operacional, no de botones ni de un snapshot visual. Ningún cliente durable crea otra GuardSession.

Orden válida no equivale a administración; no bloquear una decisión clínicamente incorrecta pero interpretable; las consecuencias nacen de recibos auténticos. Derivar no opera ni controla foco. Requisitos de disposición y calidad/XP siguen separados. El reloj visible conserva 1 min real = 1 h de juego; farmacodinámica nativa .12/.03, sin cambiar constantes globales.

La carrera actual se conserva por dispositivo; los claims durables están ligados a integrantes de la guardia, sin afirmar una carrera de cuenta global migrada. Chat social de lobby, voz/TURN y aceptación Android/iPhone físicos siguen fuera de esta certificación. Emulación Pixel no equivale a teléfono real.

## Validación reproducible

`npm run test:v5`; `npm run test:v5-core`; `npm run build:v5`; `npm run build:v5-core`; `node scripts/audit-v5-boundary.mjs`; `git diff --check`; `npm test` completo. Para navegador, usar Playwright 1.58.2 y Chromium configurados en `.github/workflows/atria-v5-core.yml`:

- `node qa/v5/durable-cooperative-browser.mjs`
- `node qa/v5/durable-cooperative-admission-browser.mjs`
- `V5_DURABLE_PLAYERS=3 node qa/v5/durable-cooperative-team-browser.mjs` (repetir con 4)
- `node qa/v5/durable-cooperative-closure-browser.mjs` (también `V5_DURABLE_LATENCY=350`)

El último acepta `V5_BROWSER_URL` para validar el despliegue real; no intercepta datos clínicos. Sus recibos y fallos se guardan en `qa/v5-browser-results`, publicados como artefacto CI. El backend local de esos recorridos es SQLite/CAS, no PostgreSQL ni prueba WAN.

Procedencia histórica: [C5.a](C5A_SHARED_CLINICAL_GUARD.md), [evidencia C5.a](../evidence/c5a/verification.json), [C5.b.1](../evidence/c5b/verification.json), [PBE](C3B_PBE.md), [terciaria](C3C_TERTIARY_PERITONITIS.md). No rehacer auditorías ni extracciones ya verificadas.
