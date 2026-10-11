# Checkpoint 1 — Comparación del flujo clínico observado

Base: `00e68d1955cfa390d8144ce8c08cd1efe7df2918`. 24 trayectorias de enfermería actual, 216 comparaciones de estado nativo idéntico con observador ON/OFF, incluidas colecciones Map/Set. 9 tiempos hasta 125 minutos clínicos/125 segundos activos, dentro de protección temprana. Sin escritores clínicos nuevos ni validación médica de magnitudes.

PA sistólica/diastólica · FC · FR · SpO₂. Las diferencias detectan discrepancias; no prueban que B1 sea clínicamente superior. Los casos HDA/CIRR conservan `nativePhysiology:null` porque el modelo nativo no expone sus variables latentes.

| Caso | Escenario | Actual a 125 min | Sombra a 125 min | Δ PAM | Δ SpO₂ | Recibos |
|---|---|---|---|---:|---:|---:|
| PERI-SEC-001 | untreated | 55.0/30.0 · 168.1 · 36.6 · 89.6 | 47.5/26.2 · 153.1 · 33.7 · 88.8 | -5.1 | -0.9 | 0 |
| PERI-SEC-001 | oxygen | 55.0/30.0 · 168.1 · 34.4 · 96.3 | 47.5/26.2 · 153.1 · 33.7 · 90.8 | -5.1 | -5.5 | 1 |
| PERI-SEC-001 | fluid | 55.0/30.0 · 167.9 · 36.6 · 89.6 | 50.1/27.6 · 152.0 · 34.3 · 87.7 | -3.2 | -2.0 | 1 |
| PERI-SEC-001 | vasopressor | 56.4/37.1 · 165.1 · 36.6 · 89.6 | 64.1/42.8 · 143.1 · 33.7 · 88.8 | 6.4 | -0.9 | 1 |
| PERI-SEC-001 | morphine | 55.0/30.0 · 164.1 · 34.1 · 89.6 | 43.0/22.3 · 151.5 · 32.2 · 87.2 | -9.1 | -2.4 | 1 |
| PERI-SEC-001 | furosemide | 55.0/30.0 · 168.2 · 36.6 · 89.6 | 44.8/24.7 · 154.2 · 33.7 · 88.8 | -6.9 | -0.9 | 1 |
| PERI-SEC-001 | combined-support | 56.7/37.2 · 164.9 · 34.4 · 96.3 | 67.6/45.2 · 141.5 · 34.3 · 90.2 | 9.0 | -6.1 | 3 |
| PERI-SEC-001 | fluid-plus-diuretic | 55.0/30.0 · 168.1 · 36.6 · 89.6 | 47.2/26.1 · 153.2 · 34.3 · 87.7 | -5.2 | -2.0 | 2 |
| HDA-001 | untreated | 82.3/52.4 · 129.0 · 25.7 · 95.8 | 80.0/49.3 · 124.3 · 22.0 · 97.0 | -2.8 | 1.2 | 0 |
| HDA-001 | oxygen | 82.3/52.4 · 129.0 · 23.7 · 100.0 | 80.0/49.3 · 124.3 · 22.0 · 97.0 | -2.8 | -3.0 | 1 |
| HDA-001 | fluid | 103.1/62.7 · 110.6 · 22.5 · 96.5 | 88.7/54.7 · 120.4 · 22.2 · 96.5 | -10.1 | 0.0 | 1 |
| HDA-001 | vasopressor | 102.3/62.4 · 125.0 · 25.7 · 95.8 | 97.7/70.4 · 112.3 · 22.0 · 97.0 | 3.8 | 1.2 | 1 |
| HDA-001 | morphine | 82.3/52.4 · 124.0 · 22.7 · 95.8 | 72.3/42.5 · 127.8 · 20.5 · 95.5 | -9.9 | -0.3 | 1 |
| HDA-001 | furosemide | 76.3/49.4 · 134.0 · 25.7 · 95.8 | 73.9/45.6 · 127.0 · 22.0 · 97.0 | -3.3 | 1.2 | 1 |
| HDA-001 | combined-support | 123.1/72.7 · 106.6 · 20.5 · 100.0 | 108.4/78.1 · 107.1 · 22.2 · 96.5 | -1.3 | -3.5 | 3 |
| HDA-001 | fluid-plus-diuretic | 97.1/59.7 · 115.6 · 22.5 · 96.5 | 82.7/51.1 · 123.0 · 22.2 · 96.6 | -10.5 | 0.1 | 2 |
| CIRR-001 | untreated | 108.0/68.0 · 94.0 · 20.0 · 96.0 | 108.0/68.0 · 94.0 · 20.0 · 96.0 | 0.0 | 0.0 | 0 |
| CIRR-001 | oxygen | 108.0/68.0 · 94.0 · 18.0 · 100.0 | 108.0/68.0 · 94.0 · 20.0 · 96.0 | 0.0 | -4.0 | 1 |
| CIRR-001 | fluid | 122.0/75.0 · 82.0 · 19.0 · 96.0 | 111.5/70.2 · 92.4 · 20.2 · 95.5 | -6.7 | -0.5 | 1 |
| CIRR-001 | vasopressor | 128.0/78.0 · 90.0 · 20.0 · 96.0 | 148.7/108.7 · 74.0 · 20.0 · 96.0 | 27.3 | 0.0 | 1 |
| CIRR-001 | morphine | 108.0/68.0 · 89.0 · 17.0 · 96.0 | 97.0/58.3 · 99.5 · 18.3 · 94.3 | -10.1 | -1.7 | 1 |
| CIRR-001 | furosemide | 102.0/65.0 · 99.0 · 20.0 · 96.0 | 108.0/68.0 · 94.0 · 20.0 · 96.0 | 4.0 | 0.0 | 1 |
| CIRR-001 | combined-support | 142.0/85.0 · 78.0 · 17.0 · 100.0 | 153.4/112.1 · 74.0 · 20.2 · 95.8 | 21.9 | -4.2 | 3 |
| CIRR-001 | fluid-plus-diuretic | 116.0/72.0 · 87.0 · 19.0 · 96.0 | 108.0/68.0 · 94.0 · 20.1 · 95.7 | -5.3 | -0.3 | 2 |

## Rendimiento medido

Node v24.19.0, linux/x64; 100 ticks de calentamiento y 600 muestras intercaladas por variante. Un paciente/cinco tratamientos, motor nativo y enfermería incluidos. No es una medida de FPS, Android/iOS físico ni una garantía de latencia móvil.

| Variante | p50 ms | p95 ms | Media ms | Máximo ms |
|---|---:|---:|---:|---:|
| Sombra OFF | 0.0740 | 0.1167 | 0.0814 | 0.3541 |
| Sombra ON | 0.0776 | 0.1411 | 0.0884 | 0.4321 |

Reporte representativo: 69538 bytes JSON; máximo al cierre de estas trayectorias: 339179 bytes JSON. Heap del proceso trasGC: 26553144 bytes; incluye fixtures/resultados y no permite atribuir todo al observador. Historial de muestras acotado a256 y recibos a2048; al exceder el ledger, se detiene con diagnóstico.

## Interpretación y reproducción

- Las cinco intervenciones comparten los siete mecanismos B1 existentes. El núcleo y sus coeficientes no cambian. La matriz incluye ausencia de tratamiento, intervenciones individuales y combinaciones; las variantes de daño/dosis/función orgánica continúan cubiertas por los oráculos B1 aprobados.
- Las órdenes aún en preparación tienen cero recibos y cero efecto nuevo. El evento se origina después de `recordAdministration`, con dosis histórica y acceso IV confirmado. Una vía omitida sigue siendo una hipótesis explícita B1; una vía explícita desconocida/conflictiva impide comparar. Enfermería puede descartar calificadores de la frase antes del ledger; no hay prueba física de vía ni prueba del reconocimiento de voz.
- PERI-SEC conserva infección/foco sin controlar; HDA sigue perdiendo sangre; CIRR no se cura por diuresis. Presión/SpO₂ mejores no equivalen a resolver la enfermedad. No hay Hb, CO₂, electrolitos, coagulación ni mecanismo antimicrobiano nuevo.
- El modelo de morfina comparte analgesia/SNC y su pico requiere calibración; las magnitudes iniciales latentes de HDA/CIRR son supuestos B1. Las expectativas clínicas independientes y fuentes permanecen en `qa/ATRIA_487_PHYSIOLOGY_PILOT_EVIDENCE.md` y `qa/physiology-pilot/clinical-expectations-487.json`.
- Suspensión o cambios de infusión que eviten el recibo nativo, pérdida de ledger, cambio de paciente/ownership, pausa oculta o salto de reloj detienen la sombra. No se fabrica una suspensión ni se mantiene una comparación silenciosamente incompleta.
- `node --expose-gc qa/physiology-live/run-observer-487.mjs` calcula y comprueba sin guardar. `--write` guarda este informe y `observer-487.json`; nunca reemplaza snapshots B1/nativos aprobados.
