# C2.c — formulaciones especiales y soporte nativo compartido

Rama exclusiva: `atria-5.0-core-rebuild-experimental`. Continúa D1 certificado en `8c9b2c1a9be1a47856a7025ec50663f4ad92c2da`; no cambia el manual maestro. Este documento describe implementación y límites, no certifica por sí solo la CI.

## Ejecución real recuperada

Se amplía el mismo registro y ejecutor IV de 15 a **19 entradas**. APP y CIRR conservan sus respectivos escritores de signos, la misma autoridad, reloj, acceso venoso, enfermería espacial, preparación, recibos e idempotencia.

| Tratamiento | Formulación | Preparación real original | Comportamiento efectivo reutilizado |
| --- | --- | --- | --- |
| Albúmina | g/kg; referencia 1.5 | 0.8 s | En APP/CIRR: objetivo PA +5/+3, FC −3. Más de dos administraciones: FR +min(8,2n), SpO₂ −min(7,2n), n=dosis−2. |
| Transfusión | unidad/unidades; referencia 1 | 2.6 s | PA +10/+5, FC −9. Se conserva la corrección tardía original: no sube mágicamente la saturación. |
| Noradrenalina | µg/kg/min IV; referencia 0.05 | 0.8 s; suspensión 1.8 s tras llegada | Inicio, tasa absoluta, titulación, suspensión y reinicio. PA +20/+10, FC −4 en APP/CIRR; exceso >0.18 añade las ecuaciones presoras/taquicardia originales. No se suman tasas como bolos. |
| Anfotericina B | mg/kg; referencia 0.7 | 1.5 s | Administración auténtica, formulación y exposición conservadas. Sin bonificación fisiológica inventada en APP/CIRR; la respuesta antifúngica de peritonitis pertenece a C3. |

Estos valores son reglas del simulador V4 efectivo, no protocolos médicos. Los tiempos son preparación nativa **después** de llegar la enfermera; la espera de trayecto no se sustituye por un temporizador.

`native-support-487.js` proyecta de forma pura `therapyEffectTotals` y las contribuciones efectivas de `medicationSafetyOffsets`, incluida la corrección final de transfusión. Los escritores APP/CIRR consumen esa proyección; el catálogo la presenta sin aplicarla de nuevo. No se importa `apply487`, HTML ni wrappers al juego, ni se habilita el motor experimental general que falla históricamente al instalar heparina.

El contrato puro de interpretación de noradrenalina se extrajo **literalmente** de `src/integration/nurse-execution-487.js`; una prueba compara las funciones. No se inventa un parser clínico alternativo. Unidades, dosis y vías no interpretables requieren aclaración; una cantidad positiva excesiva que el contrato entiende sí se administra y conserva sus efectos perjudiciales. Las alergias no bloquean.

## Defectos corregidos y pruebas causales

- `Enfermera monitor y albumina 1.5 g/kg` ya solicita una medicación real, con IV automática, sin convertirla en hepatograma. La petición de laboratorio de albúmina sin formulación conserva su significado anterior.
- Anfotericina explícita ya conserva `mg/kg` en tratamiento, recibo, exposición e historia. El recibo antiguo decía incorrectamente `0.7 mg`; se registra como corrección deliberada en la comparativa, no como paridad falsa.
- La unidad de sangre se interpreta mediante vocabulario léxico para el escáner original, conservando alias, negaciones y órdenes combinadas.
- Vías VO/PO/SL/IM/SC/rectal y abreviaturas con puntos no pueden convertirse silenciosamente en IV. Se normalizan las abreviaturas antes de que el escáner original descarte los puntos. Una orden combinada inválida no ejecuta parcialmente monitor, acceso u otra medicación.
- La tasa nueva no altera ni reescribe el recibo previo. Tasas idénticas en preparación pueden compartir una ejecución; otra tasa pendiente se rechaza sin apropiarse del recibo. Reintentar el mismo mensaje no redosifica.
- Suspender es una orden física y un recibo distinto con `previousDose`, sin dosis nueva. La infusión continúa hasta la ejecución real. Su retirada elimina soporte y evidencia de rescate activa; no concede inmunidad permanente.
- La albúmina repetida causa daño respiratorio medido, una complicación conservada en historia/chat y descuento mediante el evaluador de calidad existente. Oxígeno real mejora la saturación según su respuesta V5 ya validada, sin borrar la sobrecarga ni simular curación inmediata.
- Se corrigió un salto de supervivencia reproducido durante revisión: tras Ringer 6 l, 500 s y seis albúminas, un frame de 170 s omitía la exposición fatal que sí detectaban pasos de .25 s. Ambos recorridos ahora producen idéntica supervivencia, muerte por hipoxemia y progreso, en la misma subdivisión del reloj existente. No se crea otro scheduler ni muerte instantánea.

## Evidencia reproducible

Validación local: **401/401 V5**, **40/40 core**, builds V5/core, frontera de **66 módulos** y `git diff --check`. La revisión independiente comprobó los dos defectos anteriores con pruebas RED→GREEN y verificó **51/51** pruebas focalizadas.

`node qa/v5/characterize-special-support-native.mjs` ejecuta el V4 efectivo mediante el harness histórico sólo de QA y el circuito V5 real: APP/CIRR × cuatro formulaciones, seis albúminas, titulación/suspensión. **10/10 escenarios**, constantes y ecuaciones equivalentes; diferencia máxima observada en los ejes: **8.53e−14**. Se verifican ausencia de administración antes de preparar, unidades, dosis, recibos, daño y suspensión sin dosis adicional. Los 31 hashes de módulos originales y resultados están en [la evidencia](../evidence/c2c/special-support-native-parity.json). La comparación usa la vía de medicación del monitor original porque su alias de enfermería de albúmina contiene el defecto documentado; las pruebas V5 también verifican el circuito corregido por enfermería.

`node qa/v5/special-support-browser.mjs` prueba los ESM publicados con enfermería espacial real en Chromium escritorio/Pixel, Solitario/Aprendiz: lote inválido sin trayecto ni efectos, IV/monitor, cuatro administraciones, reintento, titulación, suspensión, seis recibos, historia y cero estudios espurios. Es una admisión explícita de QA, sin inyectar signos o administraciones; no reemplaza las pruebas UI completas APP/CIRR que permanecen activas. **Android físico no probado.** Esta suite está añadida a CI junto a la comparativa; su resultado del SHA publicado debe certificarse en el handoff.

## Límites y siguiente checkpoint

No se certifican 30 tratamientos completos, PK/interacciones universales ni riesgo transfusional nuevo. Las reglas de albúmina y noradrenalina en peritonitis tienen otra dependencia de volumen/reserva renal: el helper puro la conserva, pero **sólo APP/CIRR tienen ejecutores clínicos completos**. No se afirma que la dosis se haya ejecutado en los otros once casos.

Siguiente: integrar `sepsis-physiology-487-core.js`, transición inmediata original y reglas posteriores válidas, empezando por PERI-SEC-001. Conservar criterios propios `csPeritonitisEvaluate487`, respuestas quirúrgicas, foco sin controlar ficticiamente, destino de derivación y XP único. PBE/terciaria, los otros casos y el multijugador clínico del producto siguen pendientes. Las dos discrepancias antiguas de diuréticos PERI-SEC/CHOLANG no están resueltas por C2.c.
