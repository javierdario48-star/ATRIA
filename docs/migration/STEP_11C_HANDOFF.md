# ATRIA 5.0 — C11.c: libertad de nuevas prescripciones y trazabilidad por dosis

## Fundamento funcional imprescindible
El usuario ha establecido explícitamente que ATRIA permite errores médicos, complicaciones y muerte. No debemos rechazar órdenes solo por contraindicación o falta de indicación. La indicación es una **decisión del médico jugador**, y la ejecución depende únicamente de que la droga, dosis, vía, equipamiento y mecanismo estén implementados y el paciente esté activo. Las consecuencias deben provenir de los estados fisiológicos propios del paciente, con administración temporal y posibilidad de rescate real.

No presentar la situación actual de V5 como si ya permitiera cualquier dosis, droga, consecuencia iatrogénica o muerte. **C11.c es un checkpoint de causalidad de administración, no C12.**

## Repositorio y control de versiones
- Repo: `javierdario48-star/ATRIA`
- Rama exclusiva: `atria-5.0-core-rebuild-experimental`
- Base certificada: `1cf490a1cfa5dad79a41b15d9ffe7558a1b1336c` con [CI verde 3/3](https://github.com/javierdario48-star/ATRIA/actions/runs/38979538198).
- Primer commit C11.c: `c9497a62286f71fd9ddb8518b1368e99d302b851` — nueva semántica y pruebas positivas/negativas (CI RED por dos aserciones V5 que seguían esperando reutilización del último recibo ante una orden nueva).
- Segundo commit C11.c: `1f712485b7bfbbe570a3046216c0c957b061dd77` — contrato V5 actualizado para distinguir retransmisión de orden nueva.
- [CI del último código C11.c](https://github.com/javierdario48-star/ATRIA/actions/runs/38983208076). Al documentar, el job `clean-core-contract` **SUCCESS**, 40/40 pruebas core, 215/215 V5, 4/4 fase adicional; navegador Chromium y regresión V4 aún pendientes. Comprobar conclusiones finales antes de certificar.
- Preview con este SHA no verificada; Android físico no probado.

## Cambios reales mínimos
- `src/v5/clinical/native-medications.js`: mapa de preparaciones IV indexado por **eventId**, no por drugId. La misma droga puede prepararse dos veces ante dos prescripciones auténticas. Una misma clave eventId en preparación devuelve pending, y una ya administrada devuelve la prueba concreta de ese evento; `createRoomAuthority` sigue garantizando el replay exacto por actor+commandId. ÚNICA implementación IV compartida, mismas ventanas de preparación, misma vía y recibos.
- `src/v5/clinical/guard-session.js`: una nueva orden IV ya no obtiene el recibo anterior por mera coincidencia de `treatments.id`. Debe llamar a la única cola espacial de enfermería otra vez, confirmar acceso previo, esperar llegada, iniciar preparación y emitir recibo nuevo. Se conserva idempotencia de medidas persistentes (monitor, vías, oxígeno activo en mismo flujo) y de órdenes no farmacológicas todavía no revisadas.
- `src/v5/clinical/physical-nursing.test.js`: APP y CIRR ejecutan Ringer 500 ml dos veces con dos viajes, dos esperas, dos `clinical.completed` y dos `administrationLog`, total factual de 1000 ml; repetir el MISMO commandId no duplica nada. Dos ceftriaxonas 1 g seguidas/casi concurrentes generan dos administraciones, no unidas por drugId. Los signos APP se mantienen dentro del modelo nativo existente, sin inventar aumentos adicionales ni muerte.
- `src/v5/clinical/app-care.test.js`: adaptación de dos pruebas históricas V5, manteniendo rechazo de dosis/vías no implementadas; nueva orden válida produce preparación pendiente y recibo distinto, dos órdenes dobles producen cuatro administraciones, replay idéntico no da una quinta.

## Contrato del motor clínico (no negociable)
- `commandId` repetido con el mismo contenido = reintento de transporte. Lo deduplica la autoridad y devuelve recibo previo **sin repetir dosis**.
- `commandId` nuevo = nuevo acto médico. Incluso con la misma droga/dosis y cuando otro proceso está pendiente, el motor debe intentar **otra administración** con viaje, tiempo, vía y recibo independientes.
- Exposiciones sumadas se calculan desde eventos nativos confirmados (`p.administrationLog`); ni órdenes reconocidas, ni recibidas, ni colas pueden alterar fisiología.
- La política clínica no debe bloquear errores por ser errores. Solo rechazar parámetros no implementados, incoherentes técnicamente, o acceso físico/identidad no verificada.
- C11.b preflight de lote rechaza ahora **solo** limitaciones técnicas del catálogo/dosis; cambiar su mensaje `unsafe-compound-order` por nomenclatura precisa en futuro checkpoint es deseable, pero no cambia la restricción temporal de dosis actualmente no soportadas.
- C12 pendiente: integrar una única trayectoria fisiológica con exposición acumulativa, consecuencias (por ejemplo, congestión por volúmenes indebidos) **si están sustentadas por reglas preexistentes contrastadas**, mediciones y muerte/ventana de rescate. La fisiología CIRR actual no simula congestión, y APP solo tiene un efecto binario de líquido: no fingir daño ni muerte ya operativos.
- Oxígeno en paciente normoxémico conserva curso documentado, no aplica incremento cosmético de saturación; su inicio/repetición no equivale a un nuevo bolo farmacológico.

## Regresiones y continuación
- CI: `npm run test:v5`, `npm run build:v5`, `npm test`, Playwright Chrome móvil/escritorio. No modificar `main`, mapa, sprites, teclado ni `vendor/atria-4.8.6/**`.
- Siguiente checkpoint: validar [CI C11.c](https://github.com/javierdario48-star/ATRIA/actions/runs/38983208076) 3/3. Después modelar dose-dependence y iatrogenia **fisiológica causal**, caracterizando primero la trayectoria original 4.8.7: `src/clinical/pharmacology-outcomes-487.js`, `src/clinical/physiology-pilot-487.js`, `src/clinical/physiology-pilot-cases-487.js` y sus pruebas. No importar wrappers históricos caóticos ni dos motores independientes. Definir exposición por paciente y vía, progreso temporal, consecuencias y mortalidad con tests contrafactuales, antes de adicionar once casos.
- No afirmar que C11.c ya permite administrar dosis 2 g que el formulario actual no valida. Eso es una brecha **de implementación de dosis**, no un veto clínico.

## Traspaso
> Continúa exclusivamente en `atria-5.0-core-rebuild-experimental` desde `1f712485b7bfbbe570a3046216c0c957b061dd77`, documentación `docs/migration/STEP_11C_HANDOFF.md`. La intención inequívoca del usuario: libertad total para acertar o hacer daño y causar muerte a través de fisiología. En C11.c el mapa IV pasó a eventId: órdenes distintas de igual medicamento crean distintas dosis reales, retransmisiones idénticas no, dosis se registran con recibos; escenarios APP/CIRR y concurrencia cubiertos por V5. Comprueba [CI 38983208076](https://github.com/javierdario48-star/ATRIA/actions/runs/38983208076). Luego C12 de fisiología iatrogénica basado en evidencia contrastada, sin segundo motor, sin daños inventados y sin bloqueos de decisiones clínicas erróneas que sean técnicamente ejecutables.
