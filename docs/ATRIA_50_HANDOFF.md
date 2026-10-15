# ATRIA 5.0 — transferencia técnica

## Estado recuperable

Repositorio `javierdario48-star/ATRIA`, rama exclusiva `atria-5.0-core-rebuild-experimental`.
Base publicada verificada antes de C2: `465ad3d67eddef33a3427dfc751fe4d0cb39d716`.
Último checkpoint anterior certificado: C1, código `8f0310fc76f85820caa4de87ed8213c297ceb08e`. C2a publicado: `becd8ba80f5ee48264cc695f7ed63294133aaacc`; CI https://github.com/javierdario48-star/ATRIA/actions/runs/38689354945 aprobada.
CI C1 aprobada: https://github.com/javierdario48-star/ATRIA/actions/runs/38666019213 .
C2b publicado: `744d5026d9e7913fa705829b556df22cb237776b`, árbol `b4b0787baa43153429b2c1c07c7addf52608472a`; CI https://github.com/javierdario48-star/ATRIA/actions/runs/38690988414 aprobada (los tres jobs). Su recorrido CIRR completo pasó en Chromium real;88 contratos V5. Durante comprobación pública se detectó pérdida de tiempo clínico con render lento. Esta actualización C2c corrige el dueño del tiempo;89 contratos y regresiones temporales reales aprobados localmente. La certificación final registrará el SHA/CI/preview de C2c después de verificarlos; no confundir una CI previa con la del HEAD actual.

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

Resultado C2a:80/80 y CI38689354945 verde. Resultado local C2b:88/88, builds reproducibles53 archivos, caracterización original, golden-master y `npm test` con exit0. También se ejecutaron explícitamente cierre nativo, enfermería, oxígeno y noradrenalina pertinentes. Regresiones Chromium de navegación (desktop, Pixel5, landscape,15 ciclos), foco/IME y estudios C1 aprobadas.

`qa/v5/cirr-browser.mjs`: escribe y pulsa controles reales; solo LEE diagnósticos, sin mutaciones internas, avance de reloj ni adjudicación artificial. Completa anamnesis, cinco técnicas, signos, cuatro estudios con tiempo real, rechaza50mg y fármacos no migrados, administra100mg una vez, reevalúa, registra diagnóstico, rechaza alta, interna en sala, verifica100/100 y133XP, reintentos y persistencia tras recarga. Una segunda guardia comprueba UID nuevo y respuesta FC/FR real a paracentesis terapéutica solicitada expresamente, sin otorgar XP a un caso sin cerrar. Acepta `V5_BROWSER_URL` para repetir el recorrido en la preview pública. Capturas/resultados JSON van a los artefactos CI, no son dependencias para compilar.

Revisión independiente:sin críticos; se reprodujeron y corrigieron RED→GREEN cierre con tratamiento pendiente y cantidades residuales de dosis. Se reclasificaron y corrigieron también reevaluación a igual timestamp (proveniencia, no reloj) y mediciones que mostraban fisiología posterior no medida (la UI usa `lastVitalsKnown.vitals`; reevaluar vuelve a medir). Hallazgo menor diferido: conflicto de persistencia entre pestañas. El revisor no certificó despliegue/CI/Android/multijugador: esos alcances se verifican o se declaran por separado.

## Código C2b/C2c y sustituciones efectivas

Creados: `guard-clock.js/.test.js`, `progression.test.js`, `measurement-presentation.test.js`, `src/v5/ui/clinical-panels.js`, `qa/v5/cirr-browser.mjs`. Modificados: `application.js` (paneles y progreso), `world.js/.test.js` (UUID de paciente y nivel), `guard-session.js` (reloj acotado), `cirr-care.js/.test.js` (cierre pendiente y proveniencia), `native-cirr.js/.test.js` (rechazo de cantidades residuales), `web/index.html/game.css` (XP y botones clínicos ajustados a móvil), `scripts/build-v5.mjs` (manifestCIRR), workflowV5 (caracterización y recorrido real).

`src/clinical/nurse-scanner-487.js` añade calificadores `oral/po` al vocabulario existente: el bug reproducido era que «espironolactona100mg oral» producía unknown-clause, aunque «espironolactona oral» funcionaba. No se añadió otro scanner; se conservan negaciones, preguntas, dosis, combinaciones y la distinción entre vía de medicamento y canalización. Prueba `explicit oral dose after the drug name reaches nursing without an accidental IV order` y matrices históricas mantienen el contrato.

Los paneles `clinical-panels.js` solo representan snapshots. Cada botón clínico envía el mismo texto/comando a `session.post`; ni Historia, ni input de tratamiento, ni destino llaman al ejecutor directamente. El generador V5 admite explícitamente el evaluador de cierre puro; no añade inyecciones históricas. No se ha borrado legado ni alterado vendor.

### Regresión temporal C2c

`qa/v5/clinical-clock-browser.mjs` bloquea realmente el hilo del navegador1,2s y mide reloj clínico/nativo, fuera del input y escribiendo. RED original:1,2265s reales avanzaban solo0,1167 minutos clínicos por el límite de cinco pasos espaciales. GREEN:~1,22s reales avanzan~1,22 minutos clínicos y mantienen .12/.03 nativos. También envía el formulario real inmediatamente tras el bloqueo: a~50ms debe haber un tratamiento pendiente y ninguno administrado; tras550ms se confirma una sola administración. La revisión reprodujo la versión previa solo mediante route override de QA: administraba a52ms; código actual permanecía pendiente a51,2ms. No hay modificación del paciente ni reloj desde la prueba. Ocultación real de pestaña y BFCache no están certificados por esta regresión.

## Pendientes y próxima intervención

1. C2c antes de certificación: publicar el árbol probado, esperar sus tres jobs de CI y completar CIRR en su URL pública exacta. C2b ya tiene CI verde; su URL fue abierta e interactuada, pero se usa solo como evidencia intermedia porque reveló el defecto temporal ahora corregido.
2. C3: ampliar medicamentos/procedimientos y casos a través de `createGuardSession`/puerto; conservar nativeCIRR, C1 y la idempotencia. Caracterizar primero dosificación/colas/efectos del siguiente caso. Enfermería física (vías/monitor), consultas, tutor, voz, clínica de otros casos y carrera/guardia continua NO están certificados.
3. Limitación nativa preservada: espironolactona no tiene cinética de ascitis/diuresis ni cambio agudo de signos. Las variantes clínicas aleatorias y nuevas curvas farmacológicas requieren trabajo explícito; no sustituir con una gravedad genérica. C2 demuestra el recorrido del modelo original, no valida una respuesta diurética nueva.
4. Menor diferido reproducible: dos pestañas inicializan el mismo progreso; cada una cierra un paciente y sobrescribe localStorage con su copia. No hay fusión de receipts entre pestañas. El C2 probado es una sola instancia local; resolver persistencia concurrente al integrar identidad/transporte, sin duplicar XP.
5. C4: diálogo completo, Vega/enfermería/voz; C5: chat global y multijugador2–4 clientes independientes; C6: paridad completa, Android físico, limpieza y certificación. Aprendiz usa el mismo caso/estudios pero el tutor todavía no funciona. Cooperativo/Competitivo y voz siguen deshabilitados.

## CÓMO CONTINUAR DESDE OTRO CHATGPT

Clonar `https://github.com/javierdario48-star/ATRIA`, seleccionar exclusivamente `atria-5.0-core-rebuild-experimental`, consultar HEAD remoto antes de editar y conservar cualquier avance posterior. Base conocida `465ad3d67eddef33a3427dfc751fe4d0cb39d716`; usar el HEAD real, no resetear hacia esta base.

Leer primero este archivo, `docs/ATRIA_50_CORE_REBUILD.md`, `docs/ATRIA_50_IMPLEMENTATION_PLAN.md`; después `guard-session.js`, `cirr-care.js`, `native-cirr.js`, `application.js`, `guard-clock.js`, `progression.js` y sus pruebas. Conservar `room-authority`, `native-clinical-port`, C1 y sus contratos; no volver a extraer mapa/arte ni reconstruir navegación. Ejecutar los comandos anteriores. No hace falta historial privado, agentes ni rutas temporales del autor.

Preview C1 certificada: https://night-shift-clinical-a8n8i9raf-javierdario4878-7324.vercel.app/ — solo navegación/estudios; no demuestra C2. CI publica artefactos `atria-v5-independent-game` y `atria-v5-browser-evidence` con retención14 días; el código de las pruebas/fixture permanece en git. Verificar el SHA de cada nuevo despliegue en Vercel; nunca promover producción.

No tocar `main`, ramas estables ni `vendor/atria-4.8.6/**`. No retirar legado sin pruebas equivalentes; no importar `qa/*`, HTML histórico o generadores de integración en runtime V5. Conservar tests C1 y suite histórica; no cambiar expectativas para esconder regresiones. Si un paso no puede verificarse, registrar el bloqueo con precisión.
