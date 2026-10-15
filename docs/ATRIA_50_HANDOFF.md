# ATRIA 5.0 — transferencia técnica

## Estado recuperable

Repositorio `javierdario48-star/ATRIA`, rama exclusiva `atria-5.0-core-rebuild-experimental`.
Base publicada verificada antes de C2: `465ad3d67eddef33a3427dfc751fe4d0cb39d716`.
Último checkpoint certificado: C1, código `8f0310fc76f85820caa4de87ed8213c297ceb08e`.
CI C1 aprobada: https://github.com/javierdario48-star/ATRIA/actions/runs/38666019213 .
El commit que agrega este documento es C2a: implementación clínica integrada y pruebas locales, **todavía sin certificación de una partida completa en navegador**. La siguiente actualización registrará su SHA publicado y la evidencia C2 final. No interpretar un avance de módulos como C2 terminado.

Las tareas auxiliares `C2 native physiology` y `C2 native closure` terminaron por límite de uso sin entregar cambios ni investigaciones. No existe un resultado oculto del que dependa la continuación. El árbol estaba limpio al recuperar C2.

## Arquitectura y puntos de entrada

- `src/v5/app/main.js`: carga canónica y frontera de error; `application.js`: dueño de listeners, RAF, UI y sesiones; `world.js`: espacio/navegación; `render/hospital.js`: representación de snapshots.
- `src/v5/clinical/guard-session.js:createGuardSession`: compone UNA autoridad, UN puerto y UN paciente privado. C1 conserva `studies.js:createStudyService`; C2 agrega `cirr-care.js:createCirrCare` para evaluar/tratar/cerrar ese mismo objeto.
- `src/v5/core/speech-router.js:routeWardSpeech`: texto y futuros transcripts de voz → intents explícitos. `room-authority.js:createRoomAuthority`: identidad autenticada, selección confiable del paciente, permisos, cola serial, caché de comandos, transcript y revisiones.
- `src/v5/adapters/native-clinical-port.js:createNativeClinicalPort`: reserva eventos incluso durante llamadas concurrentes, invoca el ejecutor, valida paciente/evento y acepta completado asíncrono. Un comprobante inválido posterior al despacho queda `unconfirmed`; no se reintenta el efecto.
- `src/v5/clinical/receipts.js:assertMatchingClinicalReceipt`: la composición REAL del juego exige además studyId/therapyId/kind/id correspondientes a la acción. Se valida tanto ejecución inmediata como finalización pendiente.
- `src/v5/clinical/native-cirr.js`: dosis oral original de referencia y blanco/suavizado nativo de signos; ningún helper genérico de gravedad. `cirr-care.js`: anamnesis, examen, monitor/signos, preparación, administración, reevaluación, diagnóstico y disposición.
- `src/v5/clinical/progression.js`: fórmula nativa de XP y ledger por UID de paciente. Por ahora el ledger de la sesión funciona; persistencia/UI se integra en C2b.

Flujo único: UI/texto → `session.post` → autoridad → router → validación de acceso → `port.execute` → estudios o `care.execute` → estado real/comprobante → evento confirmado → transcript/panel. `session.advance` usa el reloj clínico y completa los pendientes mediante `port.complete`; el render no ejecuta tratamientos.

## Contratos concretos

`createGuardSession({roomId,mode,actorId,actorName,patient,content,resolveContext,onChange,progress?})` devuelve `post`, `advance`, `flush`, `read`, `catalog`, `dispose`.

`post({id,text,patientUid?})` acepta texto; el patientUid del paquete NO elige el objetivo. `resolveContext()` confiable devuelve `{patientUid,focusedNpc}` desde proximidad del mundo. La identidad de actor se obtiene de credenciales privadas. La capa de transporte multijugador todavía no está conectada.

Comandos C2: `/signos`, `/examen general|inspection|auscultation|percussion|palpation`, `/reevaluar`, `/diagnostico <texto>`, `/disposicion sala|observacion|alta|uti|quirofano|procedimiento`. Están habilitados solamente por la composición CIRR. El destino se valida contra reglas clínicas, no por aparecer en el parser. Anamnesis utiliza texto normal al paciente cercano. Enfermería conserva el scanner canónico.

`port.execute({eventId,patientUid,actorId,intent})` → `{status,eventId,patientUid,receipt,reason}`. `eventId = roomId:actorId:commandId:intentIndex`. `status` es `pending|executed|rejected|unconfirmed`; pedido NO equivale a administrado. Medicación completada exige `receipt.therapyId`, paciente/evento exactos, dosis y tiempos. `sourceEventId` identifica la solicitud que originó el efecto; pedidos repetidos reutilizan ese origen sin duplicar administración. El puerto impide colisiones de payload para un mismo evento.

La autoridad devuelve ack por comando, publica `chat.posted` o `clinical.completed`, y aumenta `revision`. Un cierre confirmado marca `room.patients[].closed=true`; posteriores efectos se rechazan. Un reintento con el mismo commandId/payload lee el ack almacenado. Nuevos mensajes de cierre no dan otra XP.

`care.execute(cmd,clock)` opera sobre el paciente privado, y `care.advance(before,after,dt)` devuelve comprobantes terminales pendientes. La administración modifica `treatments`, `administrationLog`, `pendingTreatments` y los blancos fisiológicos. El cierre crea `patient.closure` y `caseEnded`, y registra un recibo `clinical.closure` en el ledger. No existe otra copia clínica mutable en la UI.

## Equivalencia nativa y límites

`qa/v5/characterize-cirr-native.mjs` ejecuta el harness original efectivo de 4.8.7 (solo QA). La evidencia versionada `qa/v5/fixtures/cirr-native-reference.json` contiene cuatro escenarios y puntos numéricos. El build nuevo nunca importa ese harness, `apply-487.js`, HTML histórico ni `vendor`.

- Espironolactona: 100 mg oral por defecto; 0,1 g equivale a 100 mg. Preparación original 550 ms reales. C2 solo certifica esta dosis; otras dosis explícitas se rechazan sin aplicar una dosis por defecto oculta. No se requiere vía IV para la dosis oral; vías no orales no están migradas.
- **Limitación demostrada del original:** espironolactona tiene `effects:{}`, CIRR no tiene engine fisiológico de peritonitis ni cinética de diuresis/ascitis. Tras 5 minutos nativos, signos permanecen 37,2 °C, FC94, FR20, PA108/68, SpO₂96. No se debe inventar mejoría para aprobar C2. La paracentesis terapéutica nativa, SOLO si se solicita, cambia blancos FC−3/FR−2 y usa suavizado `.38·dt` (temperatura `.08·dt`).
- Reloj de estudios: 1 minuto clínico por segundo real. Progresión nativa: .12 min/s, .03 min/s mientras se escribe. Preparación usa segundos reales del mismo scheduler, sin `setTimeout` clínicos.
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
node qa/v5/studies-browser.mjs
```

Resultado local C2a: `npm run test:v5` 80/80, ambos builds, caracterización nativa y golden-master aprobados. Nuevas pruebas: `native-cirr.test.js` (dosis/curvas originales), `cirr-care.test.js` (recorrido por autoridad/puerto real, pendientes, pacientes, cierre y XP), `native-clinical-port.test.js` (concurrencia y comprobantes erróneos). C2a NO ha ejecutado aún la nueva partida completa de Chromium ni CI sobre su commit; no confundir CI C1 con evidencia C2.

## Pendientes y próxima intervención

1. C2b: conectar paneles reales de examen/signos/tratamiento/reevaluación/diagnóstico/disposición y progreso persistente; ejecutar una partida CIRR completa en Chromium y las regresiones C1; conservar la limitación fisiológica original expresamente.
2. Revisar UID de paciente entre recargas antes de persistir XP: el `world.js` C1 usa un contador por mundo. Debe ser único entre sesiones para impedir colisión del ledger.
3. Integrar typing al avance nativo sin ralentizar estudios. El reloj heredado limita el historial a128 cambios de ritmo; no afirmar sesiones arbitrariamente largas sin resolver ese límite.
4. Publicar, esperar CI terminada, verificar preview del SHA publicado y actualizar este documento con evidencias.
5. Después C3: ampliar tratamientos/procedimientos/casos; C4: diálogo completo, Vega, enfermería y voz; C5: chat global/transporte, 2–4 clientes reales; C6: paridad, Android físico, limpieza y certificación. No empezar a costa de C2 inconcluso.

## CÓMO CONTINUAR DESDE OTRO CHATGPT

Clonar `https://github.com/javierdario48-star/ATRIA`, seleccionar exclusivamente `atria-5.0-core-rebuild-experimental`, consultar HEAD remoto antes de editar y conservar cualquier avance posterior. Base conocida `465ad3d67eddef33a3427dfc751fe4d0cb39d716`; usar el HEAD real, no resetear hacia esta base.

Leer primero este archivo, `docs/ATRIA_50_CORE_REBUILD.md`, `docs/ATRIA_50_IMPLEMENTATION_PLAN.md`; después `guard-session.js`, `cirr-care.js`, `native-cirr.js`, `application.js` y sus pruebas. Ejecutar los comandos anteriores. No hace falta historial privado, agentes ni rutas temporales del autor.

Preview C1 certificada: https://night-shift-clinical-a8n8i9raf-javierdario4878-7324.vercel.app/ — solo navegación/estudios; no demuestra C2. CI publica artefactos `atria-v5-independent-game` y `atria-v5-browser-evidence` con retención14 días; el código de las pruebas/fixture permanece en git. Verificar el SHA de cada nuevo despliegue en Vercel; nunca promover producción.

No tocar `main`, ramas estables ni `vendor/atria-4.8.6/**`. No retirar legado sin pruebas equivalentes; no importar `qa/*`, HTML histórico o generadores de integración en runtime V5. Conservar tests C1 y suite histórica; no cambiar expectativas para esconder regresiones. Si un paso no puede verificarse, registrar el bloqueo con precisión.
