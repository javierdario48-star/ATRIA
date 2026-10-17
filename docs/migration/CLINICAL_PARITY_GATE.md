# ATRIA 5.0 — Puerta obligatoria de paridad clínica V4.8.7 → V5

**Origen del documento:** corrección de proceso por una omisión detectada el 16 de octubre de 2026. La intención de ATRIA es libertad médica real, incluyendo decisiones perjudiciales, deterioro, rescate y muerte causados por la fisiología. Este requisito debió extraerse del programa histórico antes de aceptar la reconstrucción. No agregar casos ni una segunda capa farmacológica para resolverlo.

## Lo que falló

1. Se trató el catálogo reducido APP-001/CIRR-001 y las vías administrables como si representaran todo el contrato del motor. No fue así: las semillas C3 no muestran necesariamente shock/fallecimiento.
2. Las pruebas V5 comprobaban recepción, dosis de referencia, viaje y recibo, pero **no equivalencia contrafactual**: sin tratamiento, tratamiento correcto, tratamiento equivocado, dosis repetidas y abandono, con posibilidad de daño y muerte.
3. El registro de medicamentos confundía nuevos actos médicos con reintentos: uso de `drugId` como clave de preparación. C11.c pasó a `eventId`; el test de navegador que esperaba 3 dosis cuando una orden nueva generó 2 más produjo la regresión de la CI `38983208076`.
4. Parte de la documentación de V4 usa mecanismos **experimentales en sombra**: se había leído material aislado, sin exigir comprobar en el ejecutable efectivo el orden FINAL de wrappers y escritores de estado. El documento `qa/ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md` ya advierte expresamente que sustituir Ringer a medias crea escritores dobles.

## Evidencia disponible y su estatus (no confundir con implementación V5)

| Comportamiento esperado | Fuente anterior | Activación en V4.8.7 efectiva | Estado V5 |
|---|---|---|---|
| Órdenes médicas y administraciones verificadas | `src/integration/pharmacology-receipts-487.js`; registro nativo de enfermería | Caracterizar con ejecutable integrado, no inferir solo de módulos | Implementado parcialmente. C11.c reconoce nuevas dosis por `eventId`, no por `drugId` |
| Daño por sobrecarga de fluidos | `qa/ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md` describe Ringer 3000 ml con caída de SpO₂ y aumento de FR | Evidencia de trayectoria histórica; conservar criterios/tiempos y coexistencia de escritores nativos | NO migrado. V5 APP tiene offset binario de Ringer y CIRR no tiene modelo de sobrecarga |
| Evolución circulatoria e infección | `vendor/atria-4.8.6/index.html` generado + `qa/ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md` | `applyImmediatePhysiology`, wrappers V3, `updatePhysiologyState`, bridge, rescate, `therapyEffectTotals`, `progressionOffsets` | NO completa: no asumir que una tabla de efectos basta |
| Muerte y exposición a signos críticos | Wrapper fatal de `updateSimulation`, `_fatalExposure`, documentados en `qa/ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md` | Sí existe ruta de consumo de signos; validar orden final de funciones reparadas | NO migrado: cierres V5 actuales fijan `dead:false` |
| Gracia inicial | `src/clinical/grace-survival-487.js`, `src/integration/grace-survival-487.js` | Gate final distinto del rescate; 180–480 s activos; crédito solo por administraciones comprobadas | NO migrado |
| Ventana crítica finita | `src/clinical/critical-rescue-487.js`, `src/integration/critical-rescue-487.js`, `qa/ATRIA_487_RESCUE_OWNERSHIP_RESULTS.md` | Hubo un override final que la desactivaba; corrección específica R1 descrita en la fuente. Comparar con build/branch concretos | NO migrada |
| Modelos B1 farmacodinámicos | `src/clinical/physiology-pilot-487.js`, `src/clinical/physiology-pilot-definitions-487.js` | Infraestructura experimental/sombra; **no** considerar mecánica de juego operativa sin evidencia del build | NO instalada; no hacerla paralela |

## Regla de diseño irrenunciable

**Permiso no depende de bondad médica.** Un jugador puede administrar algo innecesario o dañino si esa acción técnica está implementada; deben registrarse dosis y causalidad, no prevenir la equivocación. La limitación actual de dosis exactas (p.ej. Ringer 500 ml únicamente) es una **brecha técnica** a completar, no una protección clínica deseable. Negaciones, órdenes ambiguas, acciones sin vía real, identidad no autorizada o parámetros no implementados sí requieren error explícito, nunca efecto parcial inventado.

La fisiología debe vivir en **un paciente, una autoridad, una línea de tiempo y un único escritor por mecanismo**. El registro de administración es la entrada causal; signos, historial y observaciones son proyecciones de ese estado. La muerte no ocurre por pulsar una acción “incorrecta”, sino por exposición temporal real a estados fatales y agotamiento de rescate.

## Pasos ejecutables (orden estricto)

1. **Estabilizar checkpoint C11.c:** CI 3/3 incluyendo `qa/v5/app-browser.mjs`. Corregir la expectativa histórica de segunda prescripción pero nunca suprimir la segunda dosis para verde artificial. Publicar SHA y link de CI exactos.
2. **Caracterizar el ejecutable legado efectivo:** generar/elaborar fuente con los wrappers aplicados en el orden real. Para un caso con daño manifiesto, extraer las trayectorias `sin terapia`, `terapia correcta`, `sobredosificación`, `terapia errónea`, `rescate`, `muerte`. Incluir reloj real/nativo, signos, exposiciones, fármacos reales y cambios de propiedad. No regenerar fixtures históricos sin justificación; no equiparar B1-sombra con legado operativo.
3. **Asignar un propietario de cada transición causal:** recepción → viaje → administración → exposiciones acumuladas → un avance de fisiología → signos/mediciones → fatalidad/recuperación → cierre/XP. Detectar y prohibir escritores dobles de volumen, muerte y rescate. Crear tabla de paridad por mecanismo/caso.
4. **Extraer y probar un primer tramo end-to-end:** elegir un escenario existente con estados de deterioro y fallecimiento documentados en V4. Usarlo primero como *fixture de caracterización* sin desbloquear otro caso en el selector V5. Comparar y reproducir trayectorias con distintos pasos de reloj, y no alterar mecanismos visuales.
5. **Migrar por contratos, no por scripts:** funcionalidad modular pura, `createNativeClinicalPort` y `createRoomAuthority` existentes, sin segundo reloj ni parches `HTML`. Escalar solo después de pruebas positivas y negativas, mobile Chromium, regresión histórica y CI.
6. **No declarar paridad clínica** mientras C12 no pueda dejar deteriorar y morir causalmente a un paciente. Semántica “C11.c parcial, C12 pendiente” debe seguir visible en handoff/estado.

## Guía de la próxima intervención

La primera implementación de C12 no debe agregar diez efectos genéricos a `native-app.js`; antes construir *una comparación ejecutable* del mismo escenario legado con evidencias temporales. El riesgo documentado de triple/cuádruple escritor de volumen hace especialmente importante localizar la entrada de cada Ringer y su efecto una sola vez. No rebautizar limitaciones técnicas como “prohibiciones por seguridad del paciente”.

Fuentes internas: `docs/ATRIA_50_MIGRATION_MASTER_PLAN.md`, `qa/ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md`, `qa/ATRIA_487_RESCUE_OWNERSHIP_RESULTS.md`, `src/clinical/critical-rescue-487.js`, `src/clinical/grace-survival-487.js`, `src/clinical/physiology-pilot-487.js`, `src/v5/clinical/native-app.js`, `src/v5/clinical/native-cirr.js`.

Último cambio técnico C11.c antes de esta puerta: `62f12407c4bfd2653ba435a37ef25a2ac321f6f2`; [CI](https://github.com/javierdario48-star/ATRIA/actions/runs/38983745788) **pendiente al redactar**.

## Puerta automatizada incorporada

El comando `node qa/v5/clinical-parity-gate.mjs` usa exclusivamente el VM QA del build efectivo de 4.8.7 (no se importa al juego) para ejecutar APP, CIRR y un caso dinámico de sepsis existente (`PERI-SEC-001`). Compara exposición sin tratamiento, 500 ml y 3000 ml; exige administración real y registra signos y toxicidad sin convertir el comportamiento viejo en política clínica nueva. Clasifica explícitamente qué subsistemas siguen NO MIGRADOS. Se ejecuta en el job `clean-core-contract`, y solo produce un reporte en logs; no edita fixtures ni fuentes del motor previo. Pueden existir defectos históricos: que la referencia produzca un signo no prueba que sea seguro o correcto copiar su algoritmo.

## C12.a — caracterización del ejecutable + exposición por recibo (16-10-2026)
- `qa/v5/clinical-parity-gate.mjs` (QA **únicamente**): ejecuta la referencia V4.8.7 armada por `apply487` en su orden final de scripts; cubre APP y CIRR sin terapia y con Ringer 500 ml, y PERI-SEC sin terapia/500/3000 ml. Comprueba dosis confirmada, no pedido ficticio, relojes y signos finitos. Identifica experimental `atria-case-aware-pharmacology-487` rechazado por definición faltante de heparina y no lo importa como si fuese producción.
- `src/v5/clinical/medication-exposure.js`: lectura agregada de IV desde `administrationLog` por `sourceEventId`/UID y unidades, no desde `treatments` o pendientes. No acumula oxígeno como bolo ni guarda un segundo estado mutable; se proyecta a `read().exposure`. Comprueba repetición de prescripciones, concurrencia y rechazo de recibos fraudulentos.
- `docs/migration/STEP_12A_HANDOFF.md`: limitaciones y traspaso. CI del código [38984499200](https://github.com/javierdario48-star/ATRIA/actions/runs/38984499200), **núcleo aprobado; faltan navegador y regresión al momento del documento**.
