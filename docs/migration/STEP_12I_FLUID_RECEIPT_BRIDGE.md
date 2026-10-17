# ATRIA 5.0 — C12.i: primer módulo funcional de recuperación de comportamiento V4

Fecha: 2026-10-17. Rama: atria-5.0-core-rebuild-experimental.
Checkpoint funcional: 36a5934a55a4ff0d611471f12b9acaccc6180bbb.
CI: https://github.com/javierdario48-star/ATRIA/actions/runs/39054742968
Censo legado: https://github.com/javierdario48-star/ATRIA/actions/runs/39054742943

## Hallazgo CRÍTICO en el contrafáctico a tiempo idéntico

La auditoría anterior comparaba 1, 5 y 8 bolos en instantes distintos, por lo que parte de la subida de presión podía ser simplemente el suavizado temporal. Se agregó QA read-only [qa/v5/fluid-matched-dose-counterfactual.mjs](../../qa/v5/fluid-matched-dose-counterfactual.mjs): efectúa 0, 1, 2, 4 y 8 administraciones reales e independientes de 500 ml en APP y CIRR, dejando transcurrir siempre 21,6 segundos reales, tanto en VM original 4.8.7 como en guard-session real 5.0. No inventa eventos.

Resultado: APP antigua y V5 alcanzan +13,995 mmHg de presión sistólica con 1, 2 o 4 bolos, sin incremento por dosis durante ese rango. CIRR antigua también +13,995 mmHg con 1 a 4 bolos, mientras V5 mantiene 0 porque la respuesta positiva de Ringer a un cirrótico estable no estaba justificada. Las 8 dosis producen un efecto adicional de PA en original (+16,575 mmHg) y desaturación respiratoria en ambos. SpO2 APP con 1/2/4 bolos no varía y con 8 cae 3,096 puntos en V4 y 3,091 en V5. Esto RECTIFICA la impresión anterior de que el legado tenía una relación de beneficio hemodinámico gradual por cada bolo. NO existe evidencia de eso para APP/CIRR entre 1 y 4 bolos.

## Qué se modificó realmente

El nuevo módulo puro [src/v5/clinical/fluid-feedback.js](../../src/v5/clinical/fluid-feedback.js) reutiliza csPharmContext487 del catálogo antiguo para identificar sobrecarga basal y contexto de hipoperfusión y verifica cada recibo del volumen confirmado contra una única administración de igual paciente, eventId, dosis y minuto nativo. Nunca simula ni cambia signos.

Dentro del único scheduler guard-session.js, una administración COMPLETADA de Ringer agrega al recibo original el total acumulado real (500, 1.000, 1.500, ..., 4.000 ml) y la cantidad de administraciones. Ningún pedido pendiente, repetición de mismo mensaje de transporte, falso evento o tratamiento ajeno suma. En clínica/interfaz, therapyHTML del archivo clinical-panels.js muestra acumulado real + estado de riesgo del perfil V4, sin afirmar edema pulmonar tras 500 ml si aún no se ha documentado. Si hay SpO2 medida en descenso, indica reevaluar. No altera cierre, enfermería, mapa, carrera, juego viejo ni ninguna fórmula hemodinámica.

Tests: src/v5/clinical/fluid-feedback.test.js — ejecución de 8 bolos reales por caso, mensajes acumulativos, panel visible, no XP falso, perfil de cirrosis, lectura genuina de SpO2, falsificaciones/repeticiones/UID cruzado.

## Lo que todavía NO está migrado

El estado fisiológico longitudinal V4 (volumen efectivo, reserva renal, tercer espacio, inflamación/tono/bomba, mecanismos caso-específicos) NO fue migrado aún. No sustituirlo por extrapolaciones lineales a partir de los 8 bolos. Antes de escribir otra fórmula estudiar las funciones originales efectivamente ejecutadas desde vendor/atria-4.8.6/index.html y el orden de src/integration/apply-487.js, más la auditoría previa qa/ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md. El B1 experimental fue auditado con problemas graves; nunca importar como si estuviera validado.

Próximo checkpoint: extraer módulo autónomo del cálculo de volumen/perfusión en V4, con un único propietario de signos en V5 y pruebas a mismo tiempo para caso hipovolémico, congestivo y estable. No tocar APP/CIRR clínica ya validada sin un test RED→GREEN que demuestre defecto real. El motor de muerte/rescate y los cierres tienen que seguir independientes y CI 4/4.
