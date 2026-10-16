# C02 — Matriz de equivalencia y contratos

Base remota: `7dff1e82bb27f3e381c757c8f41f7fe3faf924aa`. Referencia funcional:
4.8.7 efectiva construida con `npm run build`; golden master solo lectura.
La matriz clasifica trabajo; una fila pendiente no afirma equivalencia ejecutada.
Inventario de **cada módulo de producción** de los siete dominios originales:
[`legacy-module-inventory.json`](legacy-module-inventory.json), con SHA-256 y decisión.

## Sistemas

| ID | Referencia efectiva y prueba existente | Destino V5 / decisión | Contrato positivo y negativo | Estado al recuperar C01 |
|---|---|---|---|---|
| W01 | `navigation.js` V5; `qa/v5/navigation-browser.mjs` | Conservar mundo/navegación | Ocho camas alcanzables; bloquear paredes/puertas | Implementado |
| W02 | `handleGameTap`, `v40Navigate`, última capa `cs413-monitor-walk-v4_1_3` en original efectivo | Extraer entidades/hitboxes a `engine/interactions.js` | Toque elige UID/cama; lejano navega sin ejecutar clínica; pantalla real, no punto v40 sustituido | Pendiente |
| W03 | `FrameScheduler`, `Lifecycle`, timeline V5 | Reutilizar puro | Un RAF, listeners destruidos; suspender/reanudar sin saltos | Implementado local |
| U01 | Teclado/cámara de rama aprobada; `keyboard-camera-browser` | Conservar | Cuatro filas, caret, ocultar, rotar, ambo sin teletransporte | Implementado |
| U02 | `ns421-clinical-panels`, `historyHTML`, `monitorHTML` | Reconstruir componentes presentacionales | Evidencia obtenida visible; no filtrar signos/examen/resultados desconocidos | Parcial |
| U03 | Portada, carrera, perfil, selector original | Reconstruir sobre UI aprobada (C03) | Navegación/reload; no desbloqueos ficticios | Parcial |
| E01 | `ns421-clinical-exam`, `physical-exam.test.js` histórico | Extraer datos y observaciones puros (C04) | Región+técnica real, Glasgow parcial; no completar otro órgano | Cinco técnicas generales |
| E02 | `ns421-clinical-state`, `nsGlasgowState` | Extraer observaciones, mantener fuente fisiológica | Respuestas por componente; total desconocido si falta uno | Pendiente |
| M01 | `manual-monitor-iv-487`, `nurse-monitor-state-487.test` | Extraer observación al puerto existente | Conectar mide; desconectar congela; abrir no mide | Parcial |
| S01 | `study-registry`, `contextual-study-results`, `studies.js` | Reutilizar puros | Catálogo/demoras/UID exactos; alias duplicado comparte pedido | Implementado |
| S02 | Transporte a imágenes y materiales en `v40IsTransportStudy` | Extraer luego de guardia continua | Traslado vinculado; pedido no equivale a resultado | Pendiente espacial |
| C01 | `anamnesis-intents`, `ns421-patient-dialogue` | Reutilizar clasificador, extraer diálogo | Preguntas y relacionadas por caso; negación/ambigüedad sin tratamiento | Parcial CIRR/APP |
| C02 | `nurse-scanner-487`, matrices de habla/combinaciones | Reutilizar puro; C11.b valida con los parsers nativos antes del primer efecto de lote | Dosis/vía/cláusula/negación/orden; lote inválido no inicia ninguna acción, no ejecución por reconocimiento | Parcial — C11.b, solo CIRR/APP |
| N01 | `nurse-execution`, `nurse-native-journey`, receipts históricos | Extraer cola/procedimientos (C07/C08) | Viaje/preparación/dependencia y recibo paciente; no confirmación anticipada | Preparación clínica, sin trabajo físico |
| N02 | `manual-monitor-iv-487`, `nurse-receipt-veracity-487.test` | Retener IV hasta acceso comprobado; C11.c identifica cada administración por eventId, no solo por drugId | Solo se administra tras vía real + viaje/preparación; dos órdenes nuevas → dos recibos; retransmisión → cero duplicados | Parcial C11.c — APP/CIRR, falta multijugador |
| V01 | `mentor-policy`, `vega-step-coach`, `vega-native-flow` | Extraer tutor sobre autoridad (C09) | Orientar/ayudar/delegar distintos; estable sin actuación por inactividad | Pendiente |
| V02 | `transcript-normalizer`, `revision-buffer`, `clinical-send-dispatch` | Reutilizar puros; adaptar captura (C10) | Una frase consolidada/un mensaje; cancelación y error de permiso | Deshabilitado |
| P01 | `native-cirr`, caracterización CIRR | Conservar reglas específicas | 100 mg oral, 550 ms; sin cambios agudos inventados | Implementado |
| P02 | `native-app`, caracterización APP | Conservar reglas específicas | IV, antibióticos/Ringer, latencias; cirugía consultada no realizada | Implementado |
| P03 | `pharmacology-registry-487`, outcomes/extensibility | Extraer mecanismos probados (C11/C12) | Cada fármaco: dosis/vía/inicio/efecto; ninguna gravedad global | Solo dos políticas migradas |
| P04 | `physiology-pilot`, shadow y observadores experimentales | Descartar del ejecutable V5; conservar QA/control | Nunca sustituyen fisiología nativa | No usados por V5 |
| G01 | `v40` guardia, beds, triage, background cases | Extraer después de sistemas locales (C18) | Varios UID/boxes/relojes sin contaminación; controles 2/6/12/20 | Un paciente elegido |
| G02 | `case-completion-487`, cierre/XP/handoff tests | Reutilizar evaluador puro | Destino y reevaluación reales; XP una vez | CIRR/APP implementados |
| G03 | Carrera/niveles/autonomía/tablas/multiplicadores originales | Extraer (C19) | Recarga y fusión multi-pestaña; no XP duplicado/perdido | Ledger local, concurrencia pendiente |
| R01 | `room-state`, `room-authority`, `replica`, `native-clinical-port` | Conservar contratos | Actor autenticado/UID/recibo; rechazar propietario ajeno/forja/replay | Contratos, transporte no integrado |
| R02 | `chat-protocol`, `chat-recipient`, `multiplayer-stabilization` | Extraer transporte compartido (C21) | Global, cercano por defecto, mención NPC, confirmación/dedupe | Local; no 2–4 clientes |
| R03 | `remote-motion`, timeline, continuity/generation tests | Reutilizar puros, adaptar transporte | 2/3/4 Chromium independientes, reconexión y salas aisladas | Pendiente V5 |
| R04 | `party-transport`, presencia/amigos/lobby | Adaptar interfaces estables (C20) | Identidades y salida limpias; fallo visible, no fantasmas | Pendiente |
| R05 | Coop/competitivo originales; `multimode-combinatorial` | Un solo motor/autoridad (C22/C23) | Coop atiende todos; competitivo primera acción válida/rival observa | Deshabilitados en UI |
| B01 | `apply-487`, bootstrap HTML/wrappers históricos | Descartar como estrategia V5 | Build sin vendor/integration/QA ni reemplazos/eval | Independiente desde B1 |

## Casos, contenido y reglas

| Caso | Fuente canónica | Atención V5 | Decisión actual |
|---|---|---|---|
| CIRR-001 | `cases.json`, `native-cirr.js`, `cirr-care.js` | Completa local, UI/XP | Validación de sistemas, conservar limitación de espironolactona |
| APP-001 | `cases.json`, `native-app.js`, `app-care.js` | Completa local, UI/XP | Validación IV/antibióticos/Ringer/consulta/derivación |
| PANC-001 | `cases.json`, original nativo | Datos/estudios, clínica incompleta | Diferido por usuario |
| CROHN-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |
| HDA-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |
| COLON-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |
| PERI-PBE-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |
| PERI-SEC-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |
| PERI-TER-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |
| CHOLE-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |
| ILEO-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |
| MESI-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |
| CHOLANG-001 | Ídem | Datos/estudios, clínica incompleta | Diferido por usuario |

## Contratos temporales y de evidencia

- Estudios: 1 minuto clínico por segundo real; conservar turnarounds del registro.
- Fisiología nativa: .12 minutos/segundo; .03 durante escritura. Movimiento a 60 Hz
  con reloj espacial independiente. Mantener epochs al cambiar foco.
- CIRR: espironolactona 100 mg oral, preparación .55 s; efectos agudos en signos y
  cinética de ascitis/diuresis ausentes en original. No inventarlos.
- APP: `APP_NATIVE_PREPARATION_SECONDS` y dosis de `parseAppDose`; probar IV,
  cobertura dual, Ringer y consulta aceptada separada de operación realizada.
- UI/voz/red no administran. El evento/UID/actor de la autoridad y recibo del
  puerto prueban ejecución. Pendiente, administrado y observado son estados distintos.
- Apertura/selección anatómica/historia no cumplen una evaluación por sí mismas.

## Alcance de C02

Inventario estático y contratos de equivalencia definidos, sin afirmar una nueva
certificación clínica de los trece casos ni de red. Los módulos de integración se
clasifican para extraer responsabilidades; su HTML generado no se copiará al juego.
El original conserva toda su suite y datos. El orden aprobado es A interacción,
B comunicación/enfermería, C mecanismos/contratos, D voz/guardia/progresión y E red.
Los informes STEP y STATUS registran la implementación efectiva posterior a esta matriz.

## Avance comprobado posterior al inventario

La columna anterior conserva el estado de recuperación de C01. Para el estado
vigente leer STATUS y CURRENT_HANDOFF. C04/C05.a y C06.a ya se publicaron, y C05.b
corrige la extracción de monitores con referencia efectiva final, no con una capa
antigua que el propio original reemplaza.

| Contratos | Avance | Límite conservado |
|---|---|---|
| W02 | Paciente/monitor con UID, hitbox del mundo y aproximación; ocho pantallas comparadas | Un paciente activo en la UI; guardia continua pendiente |
| U02/E01/E02 | Historia obtenida, examen por región/técnica y Glasgow, controles estables | CIRR/APP; no valida automáticamente once casos diferidos |
| M01 | Abrir, medir, conectar, desconectar y registro final, sin filtrar desconocidos | ECG/ondas/controles originales completos pendientes |
| C01 | ALiCIA/antecedentes/síntomas/contexto, subjetivo real y una conversación | Variantes fuera de contratos requieren caracterización |
| C02/N01/N02/V01 | Enrutamiento explícito y base anterior conservados | C07/C08 y tutor Vega completos todavía pendientes |

Informes: STEP_04, STEP_05 (incluye corrección C05.b), STEP_06 y CURRENT_HANDOFF.
