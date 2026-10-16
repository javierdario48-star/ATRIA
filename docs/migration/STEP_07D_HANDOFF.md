# ATRIA 5.0 — C07.d: dependencias IV y canalización automática visible

## Identidad y recuperación

Repositorio `javierdario48-star/ATRIA`, rama de escritura exclusiva `atria-5.0-core-rebuild-experimental`. No modificar `main`, V4, `vendor/atria-4.8.6/**` ni el teclado aprobado.
Baseline remoto antes del cambio: `b441417667176b91f96601caddb35aae29f7d820`, CI [38961594369](https://github.com/javierdario48-star/ATRIA/actions/runs/38961594369) **completed/success 3/3** (núcleo, navegador Chromium y suite histórica).

SHA del **ejecutable** `ae1d4e4983f2899b76507971d29e4f8adbaff2a1`; último SHA de código+pruebas antes de los documentos finales `5be5fdd9ef9685592a08eff5cfdf39b5cab0a195`. GitHub compare verificó que entre ambos solo cambiaron los tests de navegador y documentos, **no el código ejecutable**. CI del último SHA [38968502371](https://github.com/javierdario48-star/ATRIA/actions/runs/38968502371) **completed/success 3/3** (núcleo, navegadores reales y suite histórica). Preview Vercel READY del ejecutable `ae1d4e4`: https://night-shift-clinical-rdip1lnrh-javierdario4878-7324.vercel.app; **no comprobada manualmente en Android físico**. El HEAD final sucesor es solo documental.

## Qué se implementó y por qué

El intérprete de enfermería V5 reconocía fármacos IV y vías en una misma frase, pero cuando el medicamento aparecía antes que la vía, el puerto clínico rechazaba la dosis antes de la canalización. Un medicamento IV sin vía tampoco generaba la colocación física que el juego anterior admitía. Se conservó el scanner `csNurseScan487` **sin editarlo ni copiarlo**, la autoridad `createRoomAuthority`, `createNativeClinicalPort`, el dispatcher espacial único y los ejecutores farmacológicos compartidos.

**Nuevo** `src/v5/clinical/nursing-access-plan.js`: `planNursingIVAccess(intents, context)`, política pura de planificación. Solo interviene si el contexto de autoridad tiene número válido de vías; identifica exclusivamente los tres medicamentos IV certificados por `native-medications.js` (Ringer 500 ml, ceftriaxona 1 g, metronidazol 500 mg), y valida dosis y vía con `parseStandardIVDose` **antes de activar una canalización automática**.
- En una frase que solicita explícitamente vías *después* de los fármacos, sitúa esas acciones antes que los medicamentos, preservando el orden relativo de las demás indicaciones y sin añadir una segunda vía.
- Si hay un medicamento IV válido y no existe acceso ni vía pendiente, añade **un solo** `procedure.request/iv` visible como acción clínica propia de la misma orden, con `automatic:true` y `count:1`. No ejecuta nada; la autoridad y el mundo hacen el resto.
- Si ya existe vía o hay una colocación pendiente, no inventa otro acceso. Tampoco lo hace con dosis incorrectas, vías orales o pacientes sin contexto.
- Límite de 12 acciones conservado.

`src/v5/core/speech-router.js` sigue utilizando **el mismo scanner nativo**, pasa sus intenciones al planificador y entrega un orden clínico seguro a la autoridad. `src/v5/clinical/guard-session.js` provee estado de acceso y dosis **solo cuando hay motor clínico Y enfermería espacial conectada**: las pruebas puras sin NPC siguen requiriendo acceso explícito. La autoridad crea/identifica eventos IV y terapéuticos independientes; el IV se confirma solo tras camino hasta B1; los medicamentos esperan ese comprobante antes de que empiece el reloj de preparación original (.8/1.5 s).

`scripts/build-v5-core.mjs` incluye los dos módulos ESM adicionales del grafo; el ejecutable independiente continúa con importaciones resueltas y sin vendor ni HTML heredado. Nada de segundo loop, timers, efectos de presión inventados, parser de chat adicional o migraciones ficticias de casos.

## Cobertura y regresiones

- **Nuevo** `src/v5/clinical/nursing-access-plan.test.js`: orden explícita invertida; un acceso automático para medicación IV sola o doble; vía existente/pendiente; dosis, ruta y contexto inválidos.
- `src/v5/clinical/physical-nursing.test.js`: ejecución con el mundo real y cama B1 de orden «ceftriaxona 1 g y dos vías» y de «Ringer 500 ml» sin vía: ambas permanecen pendientes durante camino y esperan comprobantes y preparación nativa; dosis inválida no mueve enfermera; una vía previa pendiente se reutiliza; reintentos del mismo mensaje no duplican tratamientos.
- `qa/v5/app-browser.mjs`: historia APP completa en interfaz móvil real de Chromium; sin vía, orden doble de antibióticos produce `iv,pending` + dos `therapy,pending`. Espera acceso verdaderamente colocado antes de administración, cierre y XP canónicos.
- `qa/v5/studies-browser.mjs`: cuenta comprobantes de estudios por `kind==='study.request'`; una medicación legítima en paralelo no debe falsear la garantía de una sola ejecución del hemograma ni su único mensaje de resultados.
- Al agregar planificación se detectaron fallos en tests **aislados**, que se corrigieron limitando el auto-acceso a guardias con `nursing`, en lugar de alterar la lógica de dosis o debilitar las pruebas; también se añadió el nuevo módulo al compilador ESM. No se silenciaron suites ni redujeron intervalos de prueba.
- **CI definitiva**: [38968502371](https://github.com/javierdario48-star/ATRIA/actions/runs/38968502371) **3/3 success** para `5be5fdd9`, incluidas pruebas de Android emulado del circuito automático, cierre de CIRR/APP y regresión V4 preservada. Preview READY del mismo ejecutable (`ae1d4e4`, solo QA/documentos posteriores) según GitHub compare.

## Pendientes y límites estrictos

C07 está **parcial**: oxígeno con fisiología real, órdenes compuestas de más clases, clínica de dosis alternativas y contraindicaciones faltan. La canalización automática **no equivale a una indicación clínica óptima**, y solo se activa para los medicamentos IV cuyo régimen se ha validado en APP/CIRR. El motor de CIRR no adopta la respuesta hemodinámica de APP. Nunca interpretar un ack `pending` como administración ni omitir la llegada a la cama.

Todavía faltan C08 procedimientos restantes, C09 tutor Vega avanzado, C10 voz, progresión y guardia multipaciente completa, lobby masivo, chat y estado globales, COOP y competitivo 2–4 clientes, rendimiento Android y la aceptación 5.0 completa. Los datos de 13 casos permanecen canónicos; solo APP/CIRR tienen motores ejecutables. **No agregar más casos hasta completar infraestructura.**

## Prompt reproducible para el siguiente ChatGPT

> Continúa ATRIA 5.0 mediante cambios reales en GitHub, repo `javierdario48-star/ATRIA`, rama **exclusiva** `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/CURRENT_HANDOFF.md`, `STATUS.md`, `STEP_07D_HANDOFF.md`, y `STEP_07C_HANDOFF.md`. Verifica HEAD remoto. Código ejecutable `ae1d4e4983f2899b76507971d29e4f8adbaff2a1`, último SHA de QA `5be5fdd9ef9685592a08eff5cfdf39b5cab0a195`, CI [38968502371](https://github.com/javierdario48-star/ATRIA/actions/runs/38968502371) **3/3 success**, preview READY matching el ejecutable https://night-shift-clinical-rdip1lnrh-javierdario4878-7324.vercel.app (QA y documentos posteriores no cambian ejecutable). C07.d implementó dependencia IV segura: el scanner de enfermería único usa `planNursingIVAccess`, reordena IV explícita antes de medicamentos y crea exactamente un acceso automático para Ringer/ceftriaxona/metronidazol válidos si falta vía. Es visible, viaja con NPC, ejecuta únicamente al llegar al paciente y recién entonces inicia preparación farmacológica nativa. No alterar motor farmacológico, fisiología, reloj, teclado, ECG ni cierre/XP. Continuar C08/C07 (oxígeno según caso, órdenes compuestas y validación de contraindicación) por checkpoints; no agregar casos clínicos ni arquitecturas paralelas. Publica pruebas unitarias e integradas, CI, SHA, preview verificada e informe permanente al finalizar.
