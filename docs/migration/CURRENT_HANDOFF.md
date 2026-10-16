> **C07.a actualización tras recuperación de Work — 2026-10-16:** el HEAD al comenzar fue `416fd0547244c5e9d0e1a425944bf8a59f4f636d`, CI [38849042436](https://github.com/javierdario48-star/ATRIA/actions/runs/38849042436) 3/3 aprobada. Se reprodujo RED el fallo de veracidad de un comprobante cuando APP recibía una nueva orden de dosis o vía inválidas mientras el tratamiento idéntico estaba pendiente o ya administrado. La política `src/v5/clinical/app-care.js` ahora valida cada instrucción antes de reutilizar una tarea o comprobante; pruebas positivas, negativas y de orden combinada en `app-care.test.js`. SHA funcional del subconjunto `622fac0c5a7fd1b01a26b3ad1fece771bebf17a7`. [Handoff obligatorio C07.a](STEP_07_HANDOFF.md); el SHA actual será posterior por documentación. [CI de código C07.a](https://github.com/javierdario48-star/ATRIA/actions/runs/38852370464) debe comprobarse antes de darla por verde. **C07 global y C08 física NO están completos**, no hay nuevos casos. Próximo: completar enfermería scanner/ejecución auténtica; respetar C04–C06, teclado/cámara y fisiología específica. El registro histórico de esta sesión de Work debajo sigue siendo válido para sus commits y comprobaciones, pero NO es el último HEAD.

# ATRIA 5.0 — Transferencia autosuficiente de sesión

## 1. Estado real

Sesión de migración de sistemas del 16 de octubre de 2026. Se completó C02,
se implementó C04 para CIRR/APP, el subconjunto C05.a/b de interacción/monitor/historia
y el subconjunto C06.a de anamnesis natural. **La migración integral no está
terminada.** No se añadieron casos ni fármacos para demostrar extensibilidad.

La prioridad vigente es sistemas antes que contenido. CIRR-001 y APP-001 son los
únicos recorridos clínicos completos V5. Los once restantes conservan datos y
estudios compatibles, pero no reglas clínicas completas; no implementarlos.
C03 no se marcó terminado. C05 y C06 globales siguen parciales; enfermería física,
Vega completo, voz, guardia continua, carrera completa y red están pendientes.

## 2. Repositorio, rama y publicación

- Repositorio exacto: `javierdario48-star/ATRIA`.
- Única rama de escritura: `atria-5.0-core-rebuild-experimental`.
- HEAD recibido y verificado al recuperar C01:
  `7dff1e82bb27f3e381c757c8f41f7fe3faf924aa`.
- C02 remoto: `0bb0c7fa2e56b803c2ebc248482f5f61bd9aa239`.
- C04/C05.a remoto: `6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe`.
- C06.a remoto: `3ea74db7f788bd174cb341d0a4be7fa82c021e71`.
- **Último SHA funcional remoto verificado antes de publicar este informe:**
  `52055441920d5e40291c9d0aaec4521a2acfe50c` (C05.b, conserva C06.a).
- Árbol funcional probado/publicado:
  `859a15b6a6143c0aeda78d0b5ce9ef1fb04fd51b`.

Este informe y las evidencias se publican como descendientes del ejecutable
probado, sin cambios funcionales adicionales. La revisión final de integridad
eliminó únicamente un espacio al final de una línea en `ui/clinical-controller.js`;
no cambió expresiones, interfaz ni comportamiento. El hash del propio documento se obtiene
con `git log -1 --format=%H -- docs/migration/CURRENT_HANDOFF.md`; el HEAD vigente
se verifica en GitHub, nunca se presupone a partir de este texto. El chat de
entrega también registra el SHA documental final comprobado. Las pruebas y la
preview siguientes identifican explícitamente su SHA funcional.

## 3. Qué se implementó

**C02:** matriz de 30 contratos, clasificación con hashes de 73 módulos originales,
prioridad actualizada en plan maestro e inventario de los trece casos. Es un
inventario de equivalencia pendiente, no una certificación de todos los sistemas.

**C04:** selección anatómica SVG y alternativa accesible por botones; técnica,
resultado y registro separados. Hallazgos originales CIRR/APP por órgano. Glasgow
ocular/verbal/motor independiente; total parcial si falta un componente. Completar
examen requiere impresión general y las cuatro técnicas abdominales realmente
hechas; examinar tórax no completa abdomen y palpar abdomen no explora bazo.
No se ejecutan tratamientos ni se avanza fisiología al examinar.

**C05.a:** pacientes y monitores son entidades con UID/cama/hitbox del mundo.
Toque inequívoco, rango V5 conservado de 150 px, aproximación al objetivo lejano
consumida una vez/cancelable. Cámara/teclado/orientación no definen hitboxes.
Monitor diferencia desconocido, medido, conectado, desconectado y registro final.
Abrir no mide/conecta; medición puntual no conecta; desconectar congela lo conocido.
Historia muestra evidencia adquirida y estados reales de estudio/administración/
reevaluación/cierre. Paneles reutilizables y controles estables entre refrescos.

**C06.a:** perfiles efectivos originales de ambos casos; preguntas ALiCIA,
compuestas, antecedentes, síntomas, repreguntas y sensación subjetiva según el
estado real. Contexto por paciente y una sola conversación global. Saludos no
ocultan preguntas; duración conserva el síntoma previo; vocabulario de apetito
no oculta preguntas explícitas sobre dolor. Mención Enfermera/Vega prevalece sobre
foco anterior. Las respuestas desconocidas son visibles; preguntar no mide,
reevalúa, explora ni trata. La historia presenta dimensiones/relato obtenidos.

## 4. Arquitectura y rutas

Mundo → selección UID/proximidad → controlador UI → router/autoridad única →
puerto clínico existente → política de caso. El renderer dibuja/proyecta. La UI
presenta y emite comandos, no muta fisiología. Los recibos conservan paciente,
evento, actor y tiempo. Las lecturas observacionales no son otro motor.

Rutas canónicas bajo `src/v5/`:

| Responsabilidad | Módulos |
|---|---|
| Entidades, pantallas originales y hitboxes | `engine/{interactions,bedside-layout}.js`, `app/world.js` |
| Proyección original/canvas | `render/hospital.js` |
| Examen y vocabulario | `clinical/physical-exam.js`, `clinical/exam-contract.js` |
| Lecturas originales neuro/dolor/tendencia | `clinical/patient-observations.js` |
| Medición/monitor | `clinical/observations.js` |
| Entrevista y perfiles | `clinical/patient-dialogue.js`, `clinical/patient-profiles.js` |
| Políticas y sesión existentes | `clinical/{cirr-care,app-care,guard-session}.js` |
| Enrutamiento y autorización | `core/{speech-router,room-authority}.js` |
| Coordinación de paneles | `ui/clinical-controller.js` |
| Representación clínica | `ui/{clinical-panels,examination-panel,render-content}.js` |
| Lifecycle único | `app/application.js` |

Estado de evidencia: `p.examFindings`, `p.examLog`, `p.glasgow`,
`p.lastVitalsKnown`, `p.procedures.monitor`, `p.intentHistory`, `p.interview`. No usar el
estado fisiológico privado como sustituto de una medición. Los comandos y
comprobantes canónicos siguen siendo la autoridad; no añadir otra cola/chat/puerto.

Se eliminaron tablas de examen y matchers de anamnesis duplicados, importación
APP→CIRR para nombres y variación de UI mediante reemplazo del HTML de CIRR.
Se reutiliza sin modificar el clasificador puro original de anamnesis y los otros
módulos puros permitidos por `scripts/build-v5.mjs`. El runtime no depende de
vendor, HTML generado, integración histórica, QA, eval o búsqueda/reemplazo de
cadenas HTML. Los scripts de caracterización QA sí leen el original efectivamente
construido, exclusivamente para comparar comportamientos.

Listado completo por checkpoint, incluidos tests/build/CSS/workflow:
[`changes.json`](../evidence/migration-session-2026-10-16/changes.json).
Informes específicos: [STEP_02](STEP_02_HANDOFF.md), [STEP_04](STEP_04_HANDOFF.md),
[STEP_05](STEP_05_HANDOFF.md), [STEP_06](STEP_06_HANDOFF.md).

## 5. Pruebas y CI

- Recuperación C01: [38841164329](https://github.com/javierdario48-star/ATRIA/actions/runs/38841164329), **completed/success, 3/3**; no fallo inicial pendiente de resolver.
- C02: [38844274519](https://github.com/javierdario48-star/ATRIA/actions/runs/38844274519), **completed/success, 3/3**.
- C04/C05.a: [38845430021](https://github.com/javierdario48-star/ATRIA/actions/runs/38845430021), **completed/success, 3/3**.
- C06.a: [38847059492](https://github.com/javierdario48-star/ATRIA/actions/runs/38847059492), **completed/success, 3/3 trabajos**.
- C05.b/último ejecutable: [38848167010](https://github.com/javierdario48-star/ATRIA/actions/runs/38848167010), **completed/success, 3/3 trabajos**, SHA `52055441920d5e40291c9d0aaec4521a2acfe50c`.

Verificación local del último código funcional:

- `test:v5`: **137/137**, cero fallos/omitidos; `test:v5-core`: **39/39**.
- Examen original efectivo: **40 comparaciones** (técnicas, dolor original,
  tendencia de signos, hipotensión, hipoxemia, taquipnea).
- Diálogo original efectivo: **2 perfiles exactos, 20 respuestas comparadas**.
- Monitor original efectivo: **16 posiciones/indicadores**, ocho pantallas del
  arte y ocho fallbacks desplazados, sin derivar lo esperado del hitbox V5.
- CIRR nativo: 4 escenarios/.55 s preparación; APP nativo: 5 escenarios/Ringer
  .8 s/antibióticos 1.5 s, sin duplicados; ninguna cinética nueva inventada.
- Builds `build:v5` y `build:v5-core` aprobados e independientes. El game actual
  incluye 68 archivos; core valida sus nueve módulos distribuidos.
- Chromium real: navegación desktop/Pixel/landscape; teclado/cámara, ambo,
  boot/foco, estudios, hospital/examen/monitor y diálogo. CIRR y APP completos en
  UI tras las correcciones: **100/100, 133 XP por caso**, administraciones reales,
  estudios con tiempo real, consulta distinta de cirugía y XP persistido una vez.
- `npm test` histórico ejecutado localmente con exit 0 durante Fase A y aprobado
  completo en CI C06.a y C05.b. Ninguna prueba eliminada, desactivada o debilitada.
- Los 73 módulos inventariados conservan SHA-256. Golden master protegido.

Driver local Playwright 1.58.2, Chromium real 153.0.8010.0; CI usa Node 22 y
Chrome instalado. Pixel/Android es **emulación**, no certificación de dispositivo
físico. No hay prueba Android/iOS física nueva ni prueba multijugador independiente
V5. Evidencias JSON permanentes: [carpeta](../evidence/migration-session-2026-10-16/).
Artifacts más completos de navegador/distribuciones están en las corridas Actions
(retención 14 días); los contratos/scripts y resúmenes quedan en Git.

## 6. Previews y alcance efectivo

- C04/C05.a `6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe`, READY:
  https://night-shift-clinical-bwfecjjv2-javierdario4878-7324.vercel.app/ .
  Prueba pública: portada/lobby/guardia, panel del paciente sin signos conocidos,
  selección anatómica, rechazo de palpación lejana sin acreditarla, regreso al lobby.
- C06.a `3ea74db7f788bd174cb341d0a4be7fa82c021e71`, READY:
  https://night-shift-clinical-17f62zm28-javierdario4878-7324.vercel.app/ .
  Prueba pública: portada/lobby/guardia; caminar por pasillos, tocar paciente lejano,
  aproximación automática a B1 y panel con signos desconocidos; Interrogar,
  «Hola doctor, ¿toma alcohol?» contestada, fiebre negada y repregunta «¿Y desde
  cuándo empezó?» manteniendo la negación; historia solo con alcohol/fiebre,
  signos/examen/Glasgow/intervenciones todavía desconocidos; seleccionar abdomen
  sin explorarlo y realizar únicamente palpación con ascitis original.
  [Captura exacta](../evidence/migration-session-2026-10-16/public-exam-3ea74db.jpg).
  Esta prueba además reprodujo el desacople del monitor visible; corregido en
  C05.b, cuya prueba pública final se registra abajo.
- C05.b `52055441920d5e40291c9d0aaec4521a2acfe50c`, READY:
  https://night-shift-clinical-2k0feclvl-javierdario4878-7324.vercel.app/ .
  Prueba pública: portada/lobby/guardia, caminar por mapa, tocar la pantalla visible
  de B1 desde lejos → aproximación → Monitor B1 abierto/desconectado/signos aún
  desconocidos; Medir ahora muestra 108/68, FC 94, FR 20, SpO₂ 96%, 37.2 °C sin
  conectarlo; Conectar muestra monitorización continua; Desconectar conserva
  última medición; retorno limpio al lobby. No se administraron medicamentos ni
  se cerró un caso en ese recorrido público.
  [Captura exacta](../evidence/migration-session-2026-10-16/public-monitor-5205544.jpg).

READY se comprobó mediante despliegue con SHA/ref exactos; no basta para afirmar
prueba funcional. Los recorridos completos de ambos casos y monitores se probaron
localmente/en CI; solo atribuir a la preview lo descrito en esta sección. El
Playwright del contenedor no pudo acceder a la URL pública (ERR_EMPTY_RESPONSE de
red); se usó navegador cloud para la prueba pública. No es evidencia de fallo del
juego ni se requiere ese navegador para ejecutar QA sobre localhost.

Integración Git de previews existente (sin modificar producción): proyecto Vercel
`night-shift-clinical`, ID `prj_trnID7kAMQkegKIKd8Aeqp7oy1gB`, equipo
`team_xpiz2vtzlsOc1ivEIgx12yc6`. Buscar despliegue por SHA y exigir
`meta.githubCommitRef=atria-5.0-core-rebuild-experimental`, SHA exacto, target preview
y READY. No promover a producción ni crear credenciales/backend nuevo. Un sucesor
solo documental puede generar otra URL con el mismo ejecutable; verificar siempre
su metadata y declarar el alcance de prueba efectuado, sin atribuirle pruebas de
otra URL.

## 7. Defectos corregidos, diferencias y riesgos abiertos

Corregidos con pruebas: APP tenía hallazgos positivos de inspección/percusión no
modelados en el original; se muestran sin hallazgo específico. El refresco de
panel perdía foco/pulsaciones: conserva nodos y se prueba Enter y pulsación de
1.2 s. Monitor cerrado se etiquetaba continuo: ahora registro final. Caracterizador
inicial ocultaba dolor/tendencia originales: ahora usa observaciones reales y
40 comparaciones. Interacción lejana se consumía antes de comenzar a caminar:
se conserva mientras haya ruta. QA de reloj usaba ancla incorrecta con teclado:
se corrigió su navegación sin tocar reloj/cámara ni eliminar aserciones.

C05.b corrigió un error de extracción espacial: `v40MonitorPoint` era una capa
anterior sustituida por `cs413-monitor-walk-v4_1_3`, con posiciones reales del arte.
El E2E inicial clicaba el propio hitbox y ocultaba el error. Se reprodujo en preview,
se añadieron 16 comparaciones del último original efectivo y el E2E ahora toca
el punto de la pantalla independientemente. No se cambian mapa ni proximidad.

C06 corrigió crédito falso de inicio por saludo y de migración por intensidad,
así como las tres regresiones de lenguaje documentadas en STEP_06. Respuestas
clínicas originales conservadas; solo hechos realmente obtenidos otorgan crédito.
No hay fallo de test conocido abierto en el código publicado a fecha del cierre;
revisar CI vigente antes de asumirlo en otra sesión.

Límites conocidos que no se presentan como completos:

1. C05: ECG/ondas, todos los controles originales, transporte físico a estudios,
   varias camas/pacientes activos a la vez; los hitboxes tienen contratos de ocho
   camas, pero la guardia actual selecciona **un paciente**.
2. C06: solo perfiles/contratos CIRR/APP. No comprensión arbitraria de español ni
   cobertura declarada de los once casos pendientes.
3. C07/C08: scanner/órdenes nativas parciales ya existentes, sin enfermería física
   completa, retención/dependencias/confirmaciones universales ni ordenación
   completa de acciones combinadas. No añadir una segunda cola.
4. C09/C10: Vega acepta foco/mención, pero tutor clínico completo pendiente; voz
   deshabilitada hasta usar el mismo dispatch/transcript con dedupe.
5. C11/C12: dos políticas nativas probadas; falta completar interfaces generales
   de mecanismo/caso y complicaciones. No introducir gravedad global ni nuevos
   medicamentos demostrativos. Espironolactona no tiene efecto agudo en signos.
6. C18/C19: un paciente; ledger/XP local por cierre, pero carrera/concurrencia
   entre pestañas/guardia continua aún pendientes.
7. C20–C23: contratos autoridad/replica existentes; transporte social, presencia,
   WebRTC/chat/movimiento/cooperativo/competitivo V5 no integrados ni probados con
   2/3/4 clientes. Los modos están deshabilitados de forma explícita.
8. C24/C25: certificación física, paridad global y promoción final pendientes.
9. Presentación del transcript: las confirmaciones clínicas que no son anamnesis
   siguen usando la etiqueta Enfermera, incluso el resultado de examen manual;
   se observó «Abdomen: Abdomen» en esa línea. No altera el registro/actor del
   comprobante ni administra nada, pero debe pulirse al separar voces/confirmaciones
   de C07/C08. No se certifica esa narración como equivalencia completa.

## 8. Trabajo interrumpido y cambios no publicados

No hay implementación clínica esencial dependiente de archivos temporales o de
un agente anterior. Todo el ejecutable descrito está publicado en `5205544`.
Los informes/evidencias de este cierre se publican como sucesor documental.
No quedan cambios de implementación sin publicar; las capturas y JSON de este
informe están versionados junto al traspaso, sin depender de scratch ni artifacts
temporales para recuperar el trabajo.
No se inició código de C07/C08 ni de las otras fases; no hay que recuperar parches
ocultos para continuar. Al recuperar, confirmar limpieza con `git status` y comparar
contra el HEAD remoto por si otra sesión publicó avances posteriores.

La diferencia con la petición integral es explícita: esta sesión llegó a C06.a,
no completó todas las fases A–E. Los subconjuntos C05/C06 se etiquetan parciales.

## 9. Invariantes protegidos

No modificar `main`, producción, credenciales, backend estable,
`vendor/atria-4.8.6/**`, ramas históricas ni las referencias:

- `atria-5.0-compact-keyboard-preview` @ `0b36884fa4a879d49c588fa8f3f262a535dd3070`.
- `atria-5.0-recovery-before-approved-ui` @ `646a0ab3f19991ce4e4c4239760db6bfb17c18a1`.

Conservar mapa/sprites originales, teclado compacto de cuatro filas, integración
chat/ocultar/mostrar, cámara centrada en región jugable, movimiento estable, ambo
sin teletransporte, un lifecycle/RAF y limpieza. No reconstruir C01. No buscar/
reemplazar HTML histórico para migrar, copiar scripts monolíticos, añadir motores
paralelos o confirmar ejecución por reconocimiento textual. Fisiología, estudios,
intervenciones, mediciones, consulta y cierre son estados distintos. XP exactamente
una vez; observaciones y recibos por UID/evento. No cambiar reglas clínicas sin
referencia y pruebas; documentar errores originales corregidos.

## 10. Próximos pasos y aceptación

1. Recuperar HEAD/CI y leer los informes; ejecutar baseline. Si CI falla,
   distinguir producto de infraestructura y resolver antes de ampliar alcance.
2. **Próximo checkpoint C07/C08, Fase B:** caracterizar solo lo necesario de
   `src/clinical/nurse-scanner-487.js`, `src/integration/nurse-execution-487.js`,
   `nurse-native-journey-487.test.js`, `nurse-receipt-veracity-487.test.js` y
   `manual-monitor-iv-487.js` en la misma carpeta, más QA de órdenes combinadas.
   Leer matriz e inventario. No auditar todo otra vez.
3. Crear pruebas de dosis/unidades/vías, negación, secuencia, preparación, acceso
   venoso y dependencia; una orden sin acceso queda pendiente/rechazada según el
   comportamiento original, nunca administrada por reconocimiento. Recibos de
   paciente/evento exactos y confirmación solo tras ejecución.
4. Integrar una única cola canónica en autoridad/puerto y conectar al NPC/UI/chat
   existentes; positivo/negativo desde Chromium móvil, varios pedidos sin cruce de
   UID, CIRR/APP completos y sin XP doble. Enfermería física requerirá mundo/tiempos
   reales; no afirmar C08 completo con timers o texto de éxito solamente.
5. Después Vega/Aprendiz (estable no trata por inactividad), contratos clínicos
   extensibles sin nuevos casos, voz, guardia/progresión y finalmente red con
   clientes independientes. No saltar a la incorporación de C13–C17.
6. Publicar checkpoints seguros exclusivamente experimental con lease/fast-forward,
   CI completada, preview de SHA identificado, STEP/STATUS/CURRENT_HANDOFF y
   reproducción suficiente. No parar por cada pequeño commit para pedir permiso.

## 11. Recuperación y comandos

```sh
git clone --branch atria-5.0-core-rebuild-experimental --single-branch https://github.com/javierdario48-star/ATRIA.git
cd ATRIA
git fetch origin atria-5.0-core-rebuild-experimental
git rev-parse HEAD
git status --short
npm run test:v5
npm run test:v5-core
node qa/v5/characterize-cirr-native.mjs
node qa/v5/characterize-app-native.mjs
node qa/v5/characterize-exam-native.mjs
node qa/v5/characterize-dialogue-native.mjs
node qa/v5/characterize-monitor-native.mjs
npm run build:v5-core
npm run build:v5
node qa/v5/navigation-browser.mjs
node qa/v5/keyboard-camera-browser.mjs
node qa/v5/boot-focus-browser.mjs
node qa/v5/hospital-interactions-browser.mjs
node qa/v5/clinical-clock-browser.mjs
node qa/v5/patient-dialogue-browser.mjs
node qa/v5/studies-browser.mjs
node qa/v5/cirr-browser.mjs
node qa/v5/app-browser.mjs
npm test
```

Primero terminar build, después iniciar QA navegador; no modificar `out-v5` durante
una sesión que lo sirve. El harness sirve distribución local en puerto aleatorio.
Configurar `PLAYWRIGHT_MODULE_PATH` y `CHROMIUM_EXECUTABLE_PATH` si no están en la
ruta estándar. Driver reproducible de CI: Playwright 1.58.2, Chrome del runner;
no se necesita una herramienta privada. Para comprobar CI usar GitHub Actions del
SHA real (la rama puede avanzar). API `GET /repos/javierdario48-star/ATRIA/branches/
atria-5.0-core-rebuild-experimental` y `actions/runs?head_sha=<SHA>`.

Leer obligatoriamente también `docs/ATRIA_50_MIGRATION_MASTER_PLAN.md`,
`docs/migration/STEP_01_HANDOFF.md`, `docs/ATRIA_50_HANDOFF.md`,
`docs/ATRIA_50_CORE_REBUILD.md`, `STATUS.md`, `PARITY_MATRIX.md`,
`PHASE_A_IMPLEMENTATION.md` y los STEP nuevos. Los documentos antiguos conservan
historia; este archivo/STATUS y la orden actual de no añadir casos rigen la secuencia.

Manual: entrar Solitario, seleccionar CIRR o APP, caminar hasta B1 por los pasillos,
tocar paciente/monitor. Examen: elegir región, técnica y comprobar registro. Monitor:
abrir desconocido, medir, conectar/desconectar, comprobar historia. Conversación:
preguntar fiebre/vómitos y «¿Y desde cuándo empezó?»; preguntar dolor al comer y
antecedentes con saludo; nunca se completa evaluación/tratamiento por hablar.

## 12. Prompt listo para continuar

Continúa implementando ATRIA 5.0 en GitHub `javierdario48-star/ATRIA`, solo rama
`atria-5.0-core-rebuild-experimental`. No hagas otra auditoría general ni añadas
patologías: CIRR-001 y APP-001 bastan. Verifica HEAD remoto y su CI antes de editar;
no presupongas que sigue en el último SHA funcional registrado
`52055441920d5e40291c9d0aaec4521a2acfe50c`. Lee el plan maestro, STATUS,
CURRENT_HANDOFF, STEP_01/02/04/05/06 y los handoffs generales. C02 está completo;
C04 tiene examen anatómico/Glasgow CIRR/APP; C05.a pacientes/monitores/historia y
C06.a diálogo natural están publicados y probados, pero C05/C06 globales y las
fases siguientes siguen parciales. Retoma C07/C08: caracteriza parser, órdenes
combinadas, dosis/vías/negaciones, preparación/dependencias y ejecución física
original de enfermería; crea pruebas y conecta una sola cola a autoridad/puerto,
mundo y chat existentes. Confirma solo acciones realmente ejecutadas con UID/
evento. Conserva mapa/sprites/teclado de cuatro filas/cámara/movimiento/ambo,
fisiología específica y limitaciones originales, relojes, recibos y XP único.
Protege main/producción/backend/credenciales/vendor y las dos ramas históricas.
No motores ni chats paralelos, éxito por texto ni parcheo de HTML. Prueba Chromium
móvil real, regresión CIRR/APP completa y suite histórica; diferencia emulación de
Android físico. Avanza autónomamente por checkpoints seguros, publica solo
experimental, verifica CI y preview exactos y actualiza STEP/STATUS/CURRENT_HANDOFF
incluso si queda trabajo incompleto. Este informe contiene recuperación y contratos;
no necesitas el historial privado de ningún agente.
