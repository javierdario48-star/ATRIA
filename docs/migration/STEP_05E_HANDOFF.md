# ATRIA 5.0 — C05.e — Barrido ECG temporal correcto y prevención de parches

## Base, rama y fuentes
- Repositorio `javierdario48-star/ATRIA`; única rama de escritura `atria-5.0-core-rebuild-experimental`.
- Punto de partida `6732ca35508be63e85a71ea9816d6760957df7bd`; CI [38857690381](https://github.com/javierdario48-star/ATRIA/actions/runs/38857690381) completed/success 3/3.
- Primer SHA que incorpora **solo la corrección del barrido y sus pruebas**: `e7f75bd1b1cd22a176b1b9a3b35871f166db199c`; CI [38860570446](https://github.com/javierdario48-star/ATRIA/actions/runs/38860570446) completed/success **3/3**.
- Auditoría estructural y workflow publicados después: `f2f7ac317afd80405a94243cdd8fa4a8f197d5ab` y `9e42f5c07f3f22661297474b73d9733c4be3c0ac`.
- Leer `docs/migration/STEP_09A_HANDOFF.md` para la integración independiente y posterior de Vega y `CURRENT_HANDOFF.md` para el HEAD final.

## Defecto original y solución

**Defecto:** el ECG anterior ejecutaba `ecgPath({seconds:ecgCycles*60/hr,...})` contra toda una ventana histórica recalculada con la *última* frecuencia medida. Al administrar un tratamiento y cambiar la FC, complejos antiguos podían moverse o cambiar de forma retrospectivamente, aunque la fase acumulada al final fuera correcta. El método de 224 muestras en 4,5 s daba puntos cada ~20 ms, insuficientes para el QRS dibujado con desviación de apenas ~5 ms a FC 90; la visualización no representaba un registrador continuo.

**Implementado:**
1. `src/v5/ui/ecg-sweep.js`: registrador circular acotado **solo de presentación**, 125 muestras/s, ventana temporal fija de **4,5 segundos**, render SVG del historial moviéndose de derecha a izquierda. Cambios de FC afectan únicamente las nuevas muestras; no reescriben latidos previos. Límite de muestras acotado; tras pausa larga, desconexión o inversión del reloj reinicia solo la presentación, no la fisiología.
2. `src/v5/ui/clinical-controller.js`: el mismo RAF/scheduler único de la aplicación invoca el registrador; render máximo de aproximadamente 30 Hz, muestreo en tiempo real acumulado y sin temporizador propio. La UI no ejecuta tratamiento ni modifica la FC.
3. `src/v5/clinical/ecg-morphology.js`: amplía la duración del QRS basada en **segundos**, no en una proporción ridículamente pequeña del R-R, para que pueda muestrearse a 125 Hz con un patrón morfológico educativo razonable. Conserva el catálogo explícito de ritmos y las reglas del caso.
4. `src/v5/ui/ecg-sweep.test.js`: cuenta muestras/latidos a 60/94/120/160 lpm, verifica cambio del número de complejos sin alterar desplazamiento por segundo, conservación de muestras al cambiar FC y suspensión/desconexión, asistolia plana por semilla explícita.
5. `scripts/audit-v5-boundary.mjs` y workflow `.github/workflows/atria-v5-core.yml`: control permanente de que V5 no introduzca `apply487`, `replaceOnce`, `document.write`, `eval`, nuevos intervalos/temporizadores, otros RAF ni importación desde UI de ejecutores o autoridad. El build V5 ya usa lista cerrada de dependencias históricas **puras**; estas protecciones la complementan.

## Significado exacto de velocidad

A 60 lpm hay un ciclo cada segundo; a 120 lpm uno cada 0,5 s. La banda **siempre ocupa 4,5 s**, independientemente de la FC. Esto constituye escala de tiempo correcta y una animación de monitor de cabecera que registra su pasado. Los 560 puntos lógicos de ancho **no están calibrados en milímetros**, así que no afirmar `25 mm/s` como velocidad física de papel ECG. No simula electrodos, múltiples derivaciones, ruido por movimiento, calibración de 1 mV/10 mm, patología espontánea ni monitor cardiológico certificado. Sin evidencia clínica del caso NO inferir supra-ST, TV, FV, FA o asistolia por una frecuencia alterada.

## Auditoría histórica con bots

La regresión histórica V4 ejecuta scripts existentes y caracterizados: `qa/four-modes-stress-bot-487.mjs`, `qa/nurse-combinatorial-bot-487.mjs`, pruebas Vega, chat y movimiento remoto; `qa/v5/capture-reference.mjs` y `characterize-monitor-native.mjs` usan el juego antiguo en modo **solo lectura** como referencia para geometría y captura. **No son pruebas de paridad funcional de V5 para multijugador, enfermería física ni Vega completo.** Las pruebas V5 en Chromium móvil se ejecutan por separado. No afirmar ejecución en Android físico.

## Invariantes, pendientes y gate

- No se añadieron casos nuevos; únicamente CIRR-001 y APP-001 tienen política completa. Farmacología específica sigue en sus motores originales caracterizados.
- `src/v5/app/application.js` es el único dueño del RAF y lifecycle. El motor clínico conserva relojes y comprobantes de tratamiento.
- Probar visualmente en Android continuidad de la banda, lectura de FC y entrada de órdenes desde el monitor; el input del monitor actualmente puede abrir el teclado nativo, a diferencia del chat principal ATRIA. Evaluar solución sin duplicar teclados.
- El siguiente trabajo de sistemas depende de `STEP_09A_HANDOFF.md`; completar C07/C08 de enfermería física, C09 tutor avanzado, C10 voz y luego modos, con pruebas independientes.

## Instrucción para otro agente

Recuperá HEAD remoto/CI de `atria-5.0-core-rebuild-experimental` y lee `STATUS.md`, `CURRENT_HANDOFF.md`, `STEP_05E_HANDOFF.md` y `STEP_09A_HANDOFF.md`. Preservá ECG con barrido de 4,5s a 125 Hz y sin reescritura retrospectiva; no interpretes 560px como 25mm/s. El guard de CI `audit-v5-boundary.mjs` prohíbe mecanismos de parcheo y RAF/timers adicionales. No agregar casos. Continuar sistemas pendientes sobre autoridad clínica única y registrar SHAs/CI/preview exactos.
