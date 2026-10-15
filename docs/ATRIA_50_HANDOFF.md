# ATRIA 5.0 — transferencia técnica

## Estado recuperable

Repositorio `javierdario48-star/ATRIA`, rama exclusiva `atria-5.0-core-rebuild-experimental`.
Base publicada verificada antes de C2: `465ad3d67eddef33a3427dfc751fe4d0cb39d716`.
Último checkpoint anterior certificado: C1, código `8f0310fc76f85820caa4de87ed8213c297ceb08e`. C2a publicado: `becd8ba80f5ee48264cc695f7ed63294133aaacc`; CI https://github.com/javierdario48-star/ATRIA/actions/runs/38689354945 aprobada.
CI C1 aprobada: https://github.com/javierdario48-star/ATRIA/actions/runs/38666019213 .
**Último SHA de código publicado y certificado C2:** `04557ba229231080690a513a0fa79968fb802294`, árbol `40a1f0bd3a93e92599ca4b0817fd1aba52553d4c`.
C2b anterior: `744d5026d9e7913fa705829b556df22cb237776b`, CI38690988414 aprobada. C2c es el checkpoint funcional vigente:89/89 contratos V5; los tres jobs de [CI38692877642](https://github.com/javierdario48-star/ATRIA/actions/runs/38692877642) TERMINADOS con success, incluida toda la regresión histórica.

**Estado C2: completo para el recorrido CIRR del modelo original, local y de un caso elegido.** UI real ejecuta evaluación, cuatro estudios/resultados,100mg oral confirmado, fisiología original, reevaluación, diagnóstico, sala/observación, cierre y XP exactamente una vez. Espironolactona no tiene efectos agudos modelados en el original; no se inventaron. La paracentesis terapéutica solicitada expresamente permite observar FC/FR reales antes de cerrar. No equivale a ATRIA5.0 completo ni a una nueva simulación diurética.

Preview funcional verificada: https://night-shift-clinical-p2qug5rq0-javierdario4878-7324.vercel.app/ . Deployment `dpl_Bg4KWS5ZY2xgZr9w7L11eF99Jx6g`, READY, target preview, SHA exacto C2c. Se completó la partida mediante controles/chat visibles en Chrome remoto:100/100,+133XP; tras repetir cierre y recargar permanecen133XP. En la MISMA partida se indicó paracentesis terapéutica y se midió FC94→91/FR20→18. Captura y registro permanente: `docs/evidence/c2/public-cirr-closed.png` y `verification.json`.

Este handoff y las evidencias se publican en un commit posterior de documentación, sin cambiar el ejecutable certificado. Su SHA portador se obtiene con `git rev-parse HEAD`/HEAD remoto y figura en el mensaje de entrega; un archivo no puede incluir el hash del commit que lo contiene. El SHA funcional anterior identifica exactamente código, CI, build y preview comprobados. Verificar siempre el HEAD remoto por si hubo avances posteriores.

Las tareas auxiliares `C2 native physiology` y `C2 native closure` terminaron por límite de uso sin entregar cambios ni investigaciones. No existe un resultado oculto del que dependa la continuación. El árbol estaba limpio al recuperar C2.

## Arquitectura y puntos de entrada

- `src/v5/app/main.js`: carga canónica y frontera de error; `application.js`: dueño de listeners, RAF, UI y sesiones; `world.js`: espacio/navegación; `render/hospital.js`: representación de snapshots.
- `src/v5/clinical/guard-session.js:createGuardSession`: compone UNA autoridad, UN puerto y UN paciente privado. C1 conserva `studies.js:createStudyService`; C2 agrega `cirr-care.js:createCirrCare` para evaluar/tratar/cerrar ese mismo objeto.
- `src/v5/core/speech-router.js:routeWardSpeech`: texto y futuros transcripts de voz → intents explícitos. `room-authority.js:createRoomAuthority`: identidad autenticada, selección confiable del paciente, permisos, cola serial, caché de comandos, transcript y revisiones.
- `src/v5/adapters/native-clinical-port.js:createNativeClinicalPort`: reserva eventos incluso durante llamadas concurrentes, invoca el ejecutor, valida paciente/evento y acepta completado asíncrono. Un comprobante inválido posterior al despacho queda `unconfirmed`; no se reintenta el efecto.
- `src/v5/clinical/receipts.js:assertMatchingClinicalReceipt`: la composición REAL del juego exige además studyId/therapyId/kind/id correspondientes a la acción. Se valida tanto ejecución inmediata como finalización pendiente.
- `src/v5/clinical/native-cirr.js`: dosis oral original de referencia y blanco/suavizado nativo de signos; ningún helper genérico de gravedad. `cirr-care.js`: anamnesis, examen, signos, preparación, administración, reevaluación, diagnóstico y disposición.
- `src/v5/clinical/progression.js`: fórmula nativa de XP y ledger por UID de paciente. `application.js` lo conserva en `atria.v5.progress.v1`, separado de la versión estable. XP se verifica tras regreso al lobby y recarga. La persistencia está certificada para una instancia local; pestañas simultáneas todavía pueden sobrescribir el ledger (ver pendientes).

Flujo único: UI/texto → `session.post` → autoridad → router → validación de acceso → `port.execute` → estudios o `care.execute` → estado real/comprobante → evento confirmado → transcript/panel. `session.advance` usa el reloj clínico y completa los pendientes mediante `port.complete`; el render no ejecuta tratamientos.

## Contratos concretos

`createGuardSession({roomId,mode,actorId,actorName,patient,content,resolveContext,onChange,progress?})` devuelve `post`, `advance`, `flush`, `read`, `catalog`, `dispose`.

`post({id,text,patientUid?})` acepta texto; el patientUid del paquete NO elige el objetivo. `resolveContext()` confiable devuelve `{patientUid,focusedNpc}` desde proximidad del mundo. La identidad de actor se obtiene de credenciales privadas. La capa de transporte multijugador todavía no está conectada.

Comandos C2: `/signos`, `/examen general|inspection|auscultation|percussion|palpation`, `/reevaluar`, `/diagnostico <texto>`, `/disposicion sala|observacion|alta|uti|quirofano|procedimiento`. Están habilitados solamente por la composición CIRR. El destino se valida contra reglas clínicas, no por aparecer en el parser. Anamnesis utiliza texto normal al paciente cercano. Enfermería conserva el scanner canónico.

`port.execute({eventId,patientUid,actorId,intent})` → `{status,eventId,patientUid,receipt,reason}`. `eventId = roomId:actorId:commandId:intentIndex`. `status` es `pending|executed|rejected|unconfirmed`; pedido NO equivale a administrado. Medicación completada exige `receipt.therapyId`, paciente/evento exactos, dosis y tiempos. `sourceEventId` identifica la solicitud que originó el efecto; pedidos repetidos reutilizan ese origen sin duplicar administración. El puerto impide colisiones de payload para un mismo evento.

La autoridad devuelve ack por comando, publica `chat.posted` o `clinical.completed`, y aumenta `revision`. Un cierre confirmado marca `room.patients[].closed=true`; posteriores efectos se rechazan. Un reintento con el mismo commandId/payload lee el ack almacenado. Nuevos mensajes de cierre no dan otra XP.

`care.execute(cmd,clock)` opera sobre el paciente privado, y `care.advance(before,after,dt)` devuelve comprobantes terminales pendientes. La administración modifica `treatments`, `administrationLog`, `pendingTreatments` y los blancos fisiológicos. `lastReassessment.interventionEvents` debe contener todos los `sourceEventId` ejecutados: no basta una coincidencia de timestamp. Cerrar mientras queda un tratamiento en preparación se rechaza. El cierre crea `patient.closure` y `caseEnded`, y registra un recibo `clinical.closure` en el ledger. No existe otra copia clínica mutable en la UI.

## Equivalencia nativa y límites

`qa/v5/characterize-cirr-native.mjs` ejecuta el harness original efectivo de 4.8.7 (solo QA). La evidencia versionada `qa/v5/fixtures/cirr-native-reference.json` contiene cuatro escenarios y puntos numéricos. El build nuevo nunca importa ese harness, `apply-487.js`, HTML histórico ni `vendor`.

- Espironolactona: 100 mg oral por defecto; 0,1 g equivale a 100 mg. Preparación original 550 ms reales. C2 solo certifica esta dosis; otras dosis explícitas se rechazan sin aplicar una dosis por defecto oculta. No se requiere vía IV para la dosis oral; vías no orales no están migradas.
- **Limitación demostrada del original:** espironolactona tiene `effects:{}`, CIRR no tiene engine fisiológico de peritonitis ni cinética de diuresis/ascitis. Tras 5 minutos nativos, signos permanecen 37,2 °C, FC94, FR20, PA108/68, SpO₂96. No se debe inventar mejoría para aprobar C2. La paracentesis terapéutica nativa, SOLO si se solicita, cambia blancos FC−3/FR−2 y usa suavizado `.38·dt` (temperatura `.08·dt`).
- Reloj de estudios: 1 minuto clínico por segundo real. Progresión nativa: .12 min/s, .03 min/s mientras se escribe. Preparación usa segundos reales del mismo ciclo de aplicación, sin `setTimeout` clínicos. `application.js:advanceClinicalTo` avanza UNA vez por tiempo monotónico observado, antes de RAF, cambios de foco y `submitText`; el límite espacial de FrameScheduler no descarta tiempo clínico. Ocultar/pausar excluye ese intervalo al reanudar. Antes de crear una orden se contabiliza el tiempo anterior: un bloqueo previo no satisface los550ms de preparación. `native-cirr.js:advanceCirrVitals` usa la forma cerrada de los pasos Euler originales de1/60s y el residuo, con blancos constantes y sin bucle de recuperación ilimitado. `guard-clock.js:createGuardClock` reutiliza el reloj puro y sella épocas de128 segmentos; devuelve `{authorityId,clinicalMinute,nativeMinute,segmentCount,sealedEpochs}` acumulados. No expone una tabla inversa de timestamps arbitrarios. Prueba de1000 cambios de foco: 100 minutos clínicos/7,5 nativos, sin interrupción.
- Cierre reutiliza `src/clinical/case-completion-487.js` puro, con diagnóstico compatible, anamnesis, signos, examen, estudio orientador finalizado, espironolactona efectivamente entregada, reevaluación posterior y sala/observación. Los cuatro estudios clave y dieta sin sal mejoran calidad, sin falsear tratamiento.
- XP reutiliza fórmula nativa `(16+score*.95) * modeMult * shiftMult * autonomyMult * practiceMult * complexityMult`, redondeada y mínimo4. Práctica de un caso elegido: practice1, shift1, complejidad CIRR1, autonomía1; solo1.2/aprendiz1. Un CIRR de 100 puntos da133 XP en solo. No se afirma haber migrado carrera completa ni guardia continua.

La biblioteca histórica reutilizada en ejecución nueva es pura y declarada por `scripts/build-v5.mjs`: lifecycle/FrameScheduler, scanner, estudios, reloj, anamnesis y evaluador de cierre, además de contratos previos del núcleo. Se conserva todo el código antiguo como control, sin incluir sus interceptores/HTML en el ejecutable V5.

## Pruebas y comandos

Node22+; módulos ESM. El juego/build usan Node estándar sin instalar dependencias. `npm ci --ignore-scripts` instala las dependencias del repositorio si se requieren funciones del hosting. Para navegador, instalar Playwright1.58.2 en un directorio independiente y pasar `PLAYWRIGHT_MODULE_PATH` a su módulo; proporcionar Chromium/Chrome mediante `CHROMIUM_EXECUTABLE_PATH`, o instalar Chromium con Playwright. La CI ya usa `/usr/bin/google-chrome`.

```sh
npm run test:v5
npm run test:v5-core
npm run build:v5-core
npm run build:v5
node qa/v5/characterize-cirr-native.mjs
node src/app/golden-master-contract.test.js
npm test
npm run qa:v5-browser
node qa/v5/boot-focus-browser.mjs
node qa/v5/clinical-clock-browser.mjs
node qa/v5/studies-browser.mjs
node qa/v5/cirr-browser.mjs
```

Resultado C2a:80/80; C2b:88/88; **C2c:89/89**. Builds independientes53 archivos, caracterización original4 escenarios exactos, golden-master, `npm test` exit0 local y job histórico completo en CI C2c success. Regresiones Chromium de navegación (desktop, Pixel5, landscape,15 ciclos), foco/IME, estudios C1, reloj bloqueado y CIRR completo aprobadas. CI38692877642 está terminada:clean-core-contract, independent-game-browser y preserved-historical-regression success. Manifest del ejecutable C2c SHA256 `c91e128141df3c4229d5e7dbe3393b7b42306f9b1a413af0efcda14139f3bc53`.

`qa/v5/cirr-browser.mjs`: escribe y pulsa controles reales; solo LEE diagnósticos, sin mutaciones internas, avance de reloj ni adjudicación artificial. Completa anamnesis, cinco técnicas, signos, cuatro estudios con tiempo real, rechaza50mg y fármacos no migrados, administra100mg una vez, reevalúa, registra diagnóstico, rechaza alta, interna en sala, verifica100/100 y133XP, reintentos y persistencia tras recarga. Una segunda guardia comprueba UID nuevo y respuesta FC/FR real a paracentesis terapéutica solicitada expresamente, sin otorgar XP a un caso sin cerrar. Acepta `V5_BROWSER_URL` para repetir el recorrido en la preview pública. Capturas/resultados JSON van a los artefactos CI, no son dependencias para compilar.

Revisión independiente:sin críticos; se reprodujeron y corrigieron RED→GREEN cierre con tratamiento pendiente y cantidades residuales de dosis. Se reclasificaron y corrigieron también reevaluación a igual timestamp (proveniencia, no reloj) y mediciones que mostraban fisiología posterior no medida (la UI usa `lastVitalsKnown.vitals`; reevaluar vuelve a medir). Hallazgo menor diferido: conflicto de persistencia entre pestañas. El revisor no certificó despliegue/CI/Android/multijugador: esos alcances se verifican o se declaran por separado.

## Código C2b/C2c y sustituciones efectivas

Creados: `guard-clock.js/.test.js`, `progression.test.js`, `measurement-presentation.test.js`, `src/v5/ui/clinical-panels.js`, `qa/v5/cirr-browser.mjs`. Modificados: `application.js` (paneles y progreso), `world.js/.test.js` (UUID de paciente y nivel), `guard-session.js` (reloj acotado), `cirr-care.js/.test.js` (cierre pendiente y proveniencia), `native-cirr.js/.test.js` (rechazo de cantidades residuales), `web/index.html/game.css` (XP y botones clínicos ajustados a móvil), `scripts/build-v5.mjs` (manifestCIRR), workflowV5 (caracterización y recorrido real).

`src/clinical/nurse-scanner-487.js` añade calificadores `oral/po` al vocabulario existente: el bug reproducido era que «espironolactona100mg oral» producía unknown-clause, aunque «espironolactona oral» funcionaba. No se añadió otro scanner; se conservan negaciones, preguntas, dosis, combinaciones y la distinción entre vía de medicamento y canalización. Prueba `explicit oral dose after the drug name reaches nursing without an accidental IV order` y matrices históricas mantienen el contrato.

Los paneles `clinical-panels.js` solo representan snapshots. Cada botón clínico envía el mismo texto/comando a `session.post`; ni Historia, ni input de tratamiento, ni destino llaman al ejecutor directamente. El generador V5 admite explícitamente el evaluador de cierre puro; no añade inyecciones históricas. No se ha borrado legado ni alterado vendor.

### Regresión temporal C2c

`qa/v5/clinical-clock-browser.mjs` bloquea realmente el hilo del navegador1,2s y mide reloj clínico/nativo, fuera del input y escribiendo. RED original:1,2265s reales avanzaban solo0,1167 minutos clínicos por el límite de cinco pasos espaciales. GREEN:~1,22s reales avanzan~1,22 minutos clínicos y mantienen .12/.03 nativos. También envía el formulario real inmediatamente tras el bloqueo: a~50ms debe haber un tratamiento pendiente y ninguno administrado; tras550ms se confirma una sola administración. La revisión reprodujo la versión previa solo mediante route override de QA: administraba a52ms; código actual permanecía pendiente a51,2ms. No hay modificación del paciente ni reloj desde la prueba. Ocultación real de pestaña y BFCache no están certificados por esta regresión.

## Pendientes y próxima intervención

1. C2 cerrado y publicado: preservar el recorrido, clock y comprobantes certificados. No repetir C1 ni volver a migrar CIRR. La preview inmutable C2c y CI38692877642 son la evidencia funcional; las siguientes revisiones documentales no cambian ese runtime.
2. Próximo bloque C3a: `APP-001`, atención de apendicitis aguda, ampliando el MISMO ejecutor/puerto. Datos canónicos: estudios `app_cbc`/`app_us`; intervenciones clave `ceftriaxone`, `metronidazole`, `source_control`. Caracterizar primero dosis, preparación, vía IV, fluidos, respuesta nativa y consulta/derivación/cierre originales. Luego integrar la orden dual, requisitos de vías/monitor y cirugía con recibos ligados al paciente/evento. Inspeccionar primero `cirr-care.js`, `native-cirr.js`, `guard-session.js`, `receipts.js`, `speech-router.js`, `cases.json` y referencias históricas documentadas; extraer helpers comunes explícitos solo cuando la equivalencia esté probada. Aceptación: APP evaluado→ambos antibióticos realmente administrados una vez→fisiología original→conducta quirúrgica validada→cierre/XP único desde UI; pruebas negativas, Chromium y CI completas, sin romper CIRR/C1. No crear un segundo motor farmacológico permanente ni aceptar tratamientos de otros casos sin validación. Enfermería física (vías/monitor), consultas, tutor, voz, clínica de otros casos y carrera/guardia continua NO están certificados.
3. Limitación nativa preservada: espironolactona no tiene cinética de ascitis/diuresis ni cambio agudo de signos. Las variantes clínicas aleatorias y nuevas curvas farmacológicas requieren trabajo explícito; no sustituir con una gravedad genérica. C2 demuestra el recorrido del modelo original, no valida una respuesta diurética nueva.
4. Menor diferido reproducible: dos pestañas inicializan el mismo progreso; cada una cierra un paciente y sobrescribe localStorage con su copia. No hay fusión de receipts entre pestañas. El C2 probado es una sola instancia local; resolver persistencia concurrente al integrar identidad/transporte, sin duplicar XP.
5. C4: diálogo completo, Vega/enfermería/voz; C5: chat global y multijugador2–4 clientes independientes; C6: paridad completa, Android físico, limpieza y certificación. Aprendiz usa el mismo caso/estudios pero el tutor todavía no funciona. Cooperativo/Competitivo y voz siguen deshabilitados.

## CÓMO CONTINUAR DESDE OTRO CHATGPT

Clonar `https://github.com/javierdario48-star/ATRIA`, seleccionar exclusivamente `atria-5.0-core-rebuild-experimental`, consultar HEAD remoto antes de editar y conservar cualquier avance posterior. SHA funcional inicial que debe estar contenido en HEAD: `04557ba229231080690a513a0fa79968fb802294`. Usar el HEAD real (incluye este handoff), no resetear a C1 ni a C2c si avanzó. Comprobar `git merge-base --is-ancestor 04557ba229231080690a513a0fa79968fb802294 HEAD` antes de editar.

Recuperación mínima reproducible (si ya existe checkout, hacer fetch y revisar diferencias antes de cambiar archivos):

```sh
git clone --branch atria-5.0-core-rebuild-experimental --single-branch https://github.com/javierdario48-star/ATRIA.git
cd ATRIA
git fetch origin atria-5.0-core-rebuild-experimental
git rev-parse HEAD FETCH_HEAD
git merge-base --is-ancestor 04557ba229231080690a513a0fa79968fb802294 HEAD
npm ci --ignore-scripts
npm run test:v5
npm run build:v5-core
npm run build:v5
node qa/v5/characterize-cirr-native.mjs
npm test
```

Navegador reproducible sin herramientas privadas del autor (Linux, Node22+, Chromium y sus dependencias del sistema):

```sh
npm install --prefix /tmp/atria-v5-browser --no-save --ignore-scripts playwright@1.58.2
export PLAYWRIGHT_MODULE_PATH=/tmp/atria-v5-browser/node_modules/playwright
node /tmp/atria-v5-browser/node_modules/playwright/cli.js install chromium
# Si se usa Chrome del sistema, definir CHROMIUM_EXECUTABLE_PATH=/ruta/a/chrome.
npm run qa:v5-browser
node qa/v5/boot-focus-browser.mjs
node qa/v5/clinical-clock-browser.mjs
node qa/v5/studies-browser.mjs
node qa/v5/cirr-browser.mjs
```

Sin Chrome del sistema ni variables especiales, el harness usa Chromium instalado por Playwright. En Linux mínimo instalar las dependencias de Chromium (`playwright/cli.js install --with-deps chromium`, requiere permisos del sistema). Cada harness sirve `out-v5` por HTTP local y crea contextos aislados; no necesita backend, credenciales ni cuentas. Para abrirlo manualmente: `python3 -m http.server 8000 --directory out-v5` y visitar `http://localhost:8000`. No abrir como file://. CI instala el driver en temporal y usa Chrome de Ubuntu. Local probado Node24, CI Node22.

Leer primero este archivo, `docs/ATRIA_50_CORE_REBUILD.md`, `docs/ATRIA_50_IMPLEMENTATION_PLAN.md`; después `guard-session.js`, `cirr-care.js`, `native-cirr.js`, `application.js`, `guard-clock.js`, `progression.js` y sus pruebas. Conservar `room-authority`, `native-clinical-port`, C1 y sus contratos; no volver a extraer mapa/arte ni reconstruir navegación. Ejecutar los comandos anteriores. No hace falta historial privado, agentes ni rutas temporales del autor.

Preview funcional C2 y alcance están al inicio. Para repetir manualmente: entrar→Hacer guardia→Solitario/CIRR→caminar al paciente B1→preguntar inicio/alcohol→Historia (signos y cinco técnicas)→cuatro estudios→Tratamiento100mg oral→esperar comprobante→dieta sin sal→reevaluar/diagnóstico→sala. Paracentesis terapéutica es opcional y debe pedirse expresamente si se desea repetir el cambio de FC/FR observado. La prueba automática `cirr-browser.mjs` recorre este caso sin paracentesis terapéutica y comprueba su efecto por separado en otra guardia.

Evidencias permanentes sin dependencia de rutas locales: `qa/v5/fixtures/cirr-native-reference.json`, código QA/tests, `docs/evidence/c2/cirr-summary.json`, `clock-stall-summary.json`, `verification.json`, `public-cirr-closed.png`. CI38692877642 artifacts: independent-game11952433279 y browser-evidence11952294074, retención14 días (expiran2026-10-29); enlace de ejecución conserva el resultado y las pruebas permiten regenerarlos. No se requiere descargar esos artefactos para compilar. Nunca promover producción.

No tocar `main`, ramas estables ni `vendor/atria-4.8.6/**`. No retirar legado sin pruebas equivalentes; no importar `qa/*`, HTML histórico o generadores de integración en runtime V5. Conservar tests C1 y suite histórica; no cambiar expectativas para esconder regresiones. Si un paso no puede verificarse, registrar el bloqueo con precisión.

## Inventario de cambios C2a→C2c para revisar sin otra auditoría

- Nuevos módulos clínicos: `src/v5/clinical/{cirr-care,native-cirr,progression,receipts,guard-clock}.js`. Nuevas pruebas: `cirr-care.test.js`, `native-cirr.test.js`, `progression.test.js`, `guard-clock.test.js`, `measurement-presentation.test.js`.
- Nuevos UI/QA: `src/v5/ui/clinical-panels.js`, `qa/v5/{characterize-cirr-native,cirr-browser,clinical-clock-browser}.mjs`, fixture nativa y evidencias permanentes. Test-only harness histórico sigue fuera del build.
- Modificados: `guard-session.js` (composición), `native-clinical-port.js/.test.js` (reserva concurrente y comprobantes), `room-authority.js` (intents/closed), `speech-router.js` (evaluación), `progression.js` (ledger), `application.js` (inputs/paneles/reloj/persistencia), `world.js/.test.js` (UUID/nivel), webHTML/CSS (controles clínicos/XP), `scripts/build-v5.mjs` (importación pura de cierre/manifest), workflowV5 (gates reales). Se conservan todos los tests previos.
- Histórico puro adaptado: `src/clinical/nurse-scanner-487.js`, dos calificadores oral/po. Su suite y matriz histórica siguen habilitadas. Se reutiliza `case-completion-487.js` sin cambiarlo.
- Retirado efectivamente del runtime V5: ninguna cadena de inyección histórica se ejecuta; no se importa `apply-487.js`, HTML vendor ni QA. Eso ya era cierto desde B1 y C2 lo conserva; no atribuirlo como una eliminación nueva. No se borró implementación histórica ni recurso protegido.
- Fallos corregidos/reproducibles cubiertos: dosis residual, pendiente al cerrar, comprobantes equivocados, proveniencia a igual timestamp, medición atrasada, colisiónUID tras recarga, límite de épocas de reloj, pérdida temporal por frame y preparación adelantada por stall anterior al envío. Los tests negativos incluyen fármaco no solicitado, hemograma sin fármaco, paciente incorrecto, repetición/concurrencia/reintentos, comprobante inválido, cierre y XP duplicados.
- Fallo abierto reproducible: persistencia last-writer entre dos pestañas. Hipótesis no certificadas: BFCache/ocultación real y teclado físico Android; no afirmar que fallan ni que pasaron. No hay bloqueo conocido para continuar C3; no se requiere recuperar agentes auxiliares.
- Integridad: solo rama experimental publicada; `main` observado `08fa4565a3415888c9eae30860693d0f5040afbb`, estable estructural `be6707b9ea9c9cff66db442acc374e4aea95f6ce`. Vendor idéntico al checkpoint465ad3d y golden-master contract aprobado. No se modificó producción ni se hizo merge/promoción.
