# C05.a — Pacientes, monitor del mundo e historia clínica

## Estado y alcance real

Implementado el subconjunto local de C05: interacción táctil de pacientes y
monitores, historia con evidencia obtenida y paneles clínicos reutilizables.
**C05 completo permanece parcial**: ondas/ECG y todos los controles originales,
transporte físico a estudios y múltiples pacientes simultáneos no están migrados.
No se presenta enfermería física ni hospital continuo como terminado.

Repositorio `javierdario48-star/ATRIA`; rama
`atria-5.0-core-rebuild-experimental`. Inicio `0bb0c7fa2e56b803c2ebc248482f5f61bd9aa239`;
SHA funcional remoto `6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe`, árbol
`18f6f1dfbdff2858cf0cd1488ac9e8fa4bb66460` idéntico al probado. Comparte código y
pruebas de publicación con C04. [CI 38845430021](https://github.com/javierdario48-star/ATRIA/actions/runs/38845430021)
**completed/success, 3/3 trabajos**; preview READY exacta:
https://night-shift-clinical-bwfecjjv2-javierdario4878-7324.vercel.app/ .
Prueba pública efectiva: portada/lobby/guardia, panel de paciente con signos
desconocidos, selección anatómica y rechazo de exploración lejana sin acreditarla,
regreso al lobby. Tocar monitores, completar casos y las trayectorias de signos
se verificaron en Chromium local/CI, no en ese recorrido público limitado.

## Funciones y archivos

- `engine/interactions.js`: hitboxes en coordenadas del hospital; monitores de
  cama con UID/cama explícitos, resolución
  determinista de objetivos solapados y rango clínico V5 existente de 150 px.
- `app/world.js`: entidades, consultas de proximidad y aproximación al paciente
  lejano. Una aproximación se consume una sola vez y se cancela por nuevo destino
  o transición. No se utiliza «paciente cercano» como sustituto de UID inválido.
- `render/hospital.js`: solamente dibujo y proyección, incluyendo origen real
  del canvas. El renderer ya no decide qué entidad se toca.
- `clinical/observations.js`: medición puntual, conexión/desconexión manual y
  observación continua confirmadas por el mismo puerto. UID/evento/fuente/tiempo
  acompañan cada lectura, incluida reevaluación.
- `ui/clinical-controller.js`, `clinical-panels.js`: historia, monitor, estudios,
  tratamiento, reevaluación y destinos; botones emiten comandos con UID explícito.
  Se elimina la variación APP construida mediante reemplazo del HTML de CIRR.
- `core/room-authority.js`: fingerprint de reintento incluye selección explícita.
  La autoridad sigue resolviendo el UID mediante contexto espacial de confianza.

## Semántica clínica protegida

Abrir un monitor no mide, conecta ni revela signos desconocidos. Medir una vez no
conecta. Conectado refleja la fisiología real; desconectado conserva la lectura
anterior. Al cerrar/derivar se muestra **registro final**, nunca lectura continua.
Estudios pendientes no muestran resultados; órdenes pendientes no son dosis;
consulta aceptada no es cirugía realizada. Historia no revela órganos no explorados.

Tocar paciente/monitor dentro de rango abre su panel. Desde lejos se conserva el
objetivo y se camina a su aproximación original; sin acceso no se ejecuta clínica.
Tocar Enfermera/Vega conserva la selección de interlocutor dentro del sistema
existente; viajes/enfermería física y tutor completo están pendientes.

## Verificación

- 126 contratos V5; hospital-interactions en Chromium Pixel emulado con teclado
  abierto/cerrado y rotación; navegación/teclado/boot/estudios y CIRR/APP completos.
- Positivos/negativos: ocho camas/monitores, solapamiento, rango en límite,
  UID extraño, aproximación/cancelación, valores desconocidos, medición congelada,
  conexión continua, desconexión y cierre conectado con registro final.
- Revisión independiente: etiqueta continua al cerrar reproducida mediante cierre
  real; corregida con prueba de autoridad, sin desconectar ficticiamente un sensor.
- `npm test` histórico exit 0; game/core independientes, sin HTML histórico.
- Clock E2E encontró coordenadas de QA calculadas con centro de pantalla mientras
  el teclado desplazaba el ancla: waypoint (250,470) tocaba una enfermera. Se
  conservaron todas las aserciones temporales y se usa toggle público/proyección
  real antes de navegar. RED timeout reproducido, GREEN sin modificar motor/cámara.

No se alteró backend, credenciales, main, ramas históricas ni vendor. No se añaden
casos, fármacos ni otra cola/autoridad clínica. Android físico no probado de nuevo.

## C05.b — Corrección de pantalla visible del monitor

La prueba pública posterior a C06.a detectó un error real que no cubría el E2E:
el primer C05.a había extraído `v40MonitorPoint` (B1 `[139,382]`), pero la última
capa efectiva `cs413-monitor-walk-v4_1_3` lo reemplaza con la pantalla del arte
(B1 `[48,361]`). El navegador automático tocaba el centro del propio hitbox y
por eso no detectó el desacople. Tocar la pantalla visible en la preview `3ea74db`
no abría el monitor; el juego no fallaba por rango ni por fisiología.

La corrección usa `engine/bedside-layout.js` con los ocho puntos originales,
verifica cama/posición antes de mapear y conserva el fallback original para camas
desplazadas. Mundo proporciona el registro de camas; renderer dibuja únicamente
las pantallas adicionales B4/desplazadas que el original también agrega, sin
modificar imagen del mapa ni estado clínico. Rango de 150 px conservado.

Nuevo `qa/v5/characterize-monitor-native.mjs`: **16 comparaciones efectivas** de
ocho camas y ocho desplazamientos, incluido indicador `added`. RED B1
`[139,382] != [48,361]`, después GREEN. Contratos V5 **137/137**. El E2E móvil
ahora toca B1 `[48,361]` como dato independiente del hitbox y repite apertura,
conexión, desconexión y teclado; aprobado. Se añade esta comparación en CI sin
quitar cobertura anterior. Inicio de corrección `3ea74db7f788bd174cb341d0a4be7fa82c021e71`;
SHA remoto corregido `52055441920d5e40291c9d0aaec4521a2acfe50c`, árbol
`859a15b6a6143c0aeda78d0b5ce9ef1fb04fd51b` idéntico al probado.
[CI C05.b](https://github.com/javierdario48-star/ATRIA/actions/runs/38848167010)
**completed/success, 3/3 trabajos**, incluidos navegador/cierres CIRR/APP e histórico
completo. Revisión acotada independiente aprobada.
Preview exacta READY: https://night-shift-clinical-2k0feclvl-javierdario4878-7324.vercel.app/ .
Se probó públicamente caminar, tocar la pantalla real desde lejos, aproximación,
apertura B1 sin signos conocidos, medición puntual sin conectar, conexión,
desconexión con última medición y retorno al lobby. No incluye cierre ni respuesta
farmacológica pública; esos recorridos pertenecen a QA local/CI.

## Recuperación, pendientes y prompt

Reproducir con comandos de STEP_04 más `node qa/v5/characterize-monitor-native.mjs`,
`node qa/v5/clinical-clock-browser.mjs` y `node qa/v5/studies-browser.mjs`.
Manual: Solitario/CIRR, caminar a B1, tocar la pantalla visible a la izquierda
de la cama; comprobar vacío → medir/conectar → desconectar;
abrir paciente/Historia y explorar regiones sin otorgar exámenes no efectuados.

Siguiente: comunicación natural C06 y órdenes/enfermería C07/C08. Conservar este
subconjunto y completar C05 pendiente cuando sus dependencias estén disponibles.
No iniciar nuevos casos. Consultar CURRENT_HANDOFF para trabajo posterior exacto.

Prompt: «Continúa ATRIA 5.0 en `javierdario48-star/ATRIA`, exclusivamente
`atria-5.0-core-rebuild-experimental`. Comprueba HEAD/CI actuales, lee
`docs/migration/{STATUS,CURRENT_HANDOFF,STEP_04_HANDOFF,STEP_05_HANDOFF}.md`.
Retoma desde código publicado que contiene `6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe`.
C04 y C05.a tienen UI/autoridad/hitboxes/mediciones; C05 global sigue parcial.
Sigue el próximo checkpoint del informe vigente, sin añadir casos ni modificar
mapa/sprites/teclado/cámara/ambo/fisiología de CIRR/APP. Todo debe pasar autoridad y
puerto existentes, QA móvil real en Chromium, recorridos completos e histórico.
Publica solo experimental y deja STEP/STATUS/CURRENT_HANDOFF con SHA/CI/preview,
defectos y trabajo no publicado explícitos.»
