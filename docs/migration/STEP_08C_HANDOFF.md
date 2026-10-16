# ATRIA 5.0 — C08.c: oxígeno físico sin inventar la respuesta fisiológica

## Recuperación exacta

- Repositorio: `javierdario48-star/ATRIA`. Única rama de escritura: `atria-5.0-core-rebuild-experimental`.
- Base de partida comprobada: `cc27dcb962f7f107700495b4cacad70cf420b5c5`, ejecución anterior C07.d aprobada [CI 38968502371](https://github.com/javierdario48-star/ATRIA/actions/runs/38968502371) 3/3 para SHA 5be5fdd9.
- Código C08.c inicial: `f3f65441d2d33f413461a8428e9037ac6bd4b5d1`; pruebas: `51bdf0189b7cfed69cad153b7852bdc15e9b6b6a`. Reparación de defectos RED: **`93d45c80a2dbaeeb9318c5bb601b7d7b300374c9`**.
- Primera CI de pruebas [38972537246](https://github.com/javierdario48-star/ATRIA/actions/runs/38972537246): **clean-core-contract falló** por titulación prematura y un dispositivo máscara aceptado; corrección publicada sin reducir expectativas.
- CI de código corregido: [38972668527](https://github.com/javierdario48-star/ATRIA/actions/runs/38972668527): **iniciada, pendiente de certificación completa** a la redacción. No atribuir resultado aprobado antes de leer estado final de los tres trabajos.
- Preview READY del código C08.c corregido: **no verificada ni enlazada**. URL C07.d sigue siendo versión ANTERIOR, no usar para probar C08.c. Android físico: **no probado**.
- Árbol de trabajo local: no hay checkout local en esta sesión; se realizaron commits directamente al árbol remoto mediante GitHub y avance no forzado de la única rama. Los commits publicados quedan como checkpoint recuperable.

## Alcance real

En el código de 4.8.7, `src/integration/oxygen-functional-487.test.js` y `qa/physiology-live/oxygen-ownership-boundary-487.mjs` confirman órdenes de oxígeno a 2 y 4 L/min, recibos separados para cambio/suspensión, dependencia física, beneficio en la hipoxemia PERI-SEC y *dos rutas* de escritura fisiológica heredadas. Sin embargo, PERI-SEC NO es uno de los dos casos clínicos ejecutables V5. Los actuales APP-001 (SpO₂ basal 98) y CIRR-001 (96) no disponen de un motor hipoxémico validado. El campo de contenidos `therapies.json.effects.spo2=6` **no se usa como bonus genérico**.

Se ha implementado únicamente un **procedimiento de soporte respiratorio y documentación**, no el motor farmacodinámico ni una prescripción clínicamente indicada. Admite cánula nasal a 2 y 4 L/min, 4 L/min por defecto, y rechaza flujo/dispositivo ambiguo, máscara o ruta no caracterizada. En el mundo jugable el NPC recorre puertas y colisiones, el trabajo queda pendiente hasta la llegada, y la autoridad recibe un comprobante auténtico por UID y eventId. Cada cambio de flujo o suspensión requiere otro trayecto confirmado; la misma prescripción duplicada no mueve otra enfermera. Una suspensión cuando está inactivo se rechaza sin trabajo espacial. Se registran `start`, `setRate` y `stop` en el historial, sin modificar `liveVitals`, ECG, evaluación de cierres o XP desde una UI.

## Archivos

- `src/v5/clinical/observations.js`: dos funciones clínicas de soporte físico, flujo y comprobante; no nuevos timers, RAF ni estado duplicado.
- `src/v5/clinical/app-care.js` y `src/v5/clinical/cirr-care.js`: delegación dentro de los dos ejecutores nativos existentes.
- `src/v5/clinical/guard-session.js`: política de despacho espacial para `therapy.request/oxygen` y `therapy.stop/oxygen`, validación ANTES de mover la enfermera, idempotencia de mismo flujo y eliminación del atajo que podía ejecutar una retitulación prematuramente.
- `src/v5/ui/monitor-order-ledger.js`: agrega `therapy.stop` como evento clínico que requiere recibo para estado terminal.
- `src/v5/clinical/oxygen-support.test.js` (nuevo), `src/v5/clinical/physical-nursing.test.js` y `src/v5/ui/monitor-order-ledger.test.js`: parseo, autorización, recibos, dos casos, llegada, idempotencia, cambio de flujo, suspensión y rechazos.
- `qa/v5/hospital-interactions-browser.mjs`: comando real desde el buscador del monitor de cabecera con Pixel emulado; confirmar pending→executed e historial, nunca Android físico.
- `docs/migration/STATUS.md`, `CURRENT_HANDOFF.md` y este documento: continuidad.

## Fallos RED → GREEN esperados

En [CI 38972537246](https://github.com/javierdario48-star/ATRIA/actions/runs/38972537246), los tests originales siguieron pasando, pero las nuevas aserciones detectaron: (1) `guard-session.js` reutilizaba el certificado de cualquier tratamiento ya existente y por ello permitía cambiar 4→2 L/min inmediatamente; corregido excluyendo acciones de oxígeno del atajo y obligando al NPC al segundo trayecto. (2) El scanner antiguo recortaba un alias intermedio de máscara y la validación de la cláusula aislada ya no podía verlo; corregido comprobando el texto completo solo para requisitos de seguridad de dispositivo, conservando cláusula individual para la dosificación de órdenes compuestas. La fuente clínica de autoridad se mantiene única. **Verificar CI de código corregido; no inferir GREEN del commit.**

## Pendientes

1. Certificar la CI del SHA de código, sin esconder fallos (núcleo V5, bot Chromium, V4 completa).
2. Verificar preview READY asociada exactamente al código y prueba manual Android del usuario.
3. Caracterizar la fisiología respiratoria de casos clínicos hipoxémicos ANTES de adoptar beneficio de saturación por oxígeno, arritmias o protocolos avanzados; aún no implementar casos nuevos.
4. C07/C08 siguen parciales: órdenes compuestas con cancelaciones, seguridad clínica y otras tareas físicas.
5. C11/C12 interacciones y contraindicaciones por caso; C09 Vega avanzado; C10 voz; C18/C19 carrera; C20–C23 lobby y multijugador 2–4 clientes; C24/C25 cierre integral.
6. Conservar C07.c monitor (historial auténtico, ondas 4,5 s/125 Hz y oscilación no causal) y C07.d vías automáticas, y no convertir un recibo de soporte en diagnóstico/indicación apropiada.

## Reproducir y continuar desde otro agente

1. Leer `docs/ATRIA_50_MIGRATION_MASTER_PLAN.md`, `docs/migration/{STATUS,CURRENT_HANDOFF,PARITY_MATRIX,STEP_07D_HANDOFF,STEP_07C_HANDOFF,STEP_11A_HANDOFF,STEP_08B3_HANDOFF,STEP_08C_HANDOFF}.md`.
2. Recuperar HEAD de la rama y comparar contra `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9`; no reescribir commits ni `main`.
3. Ejecutar `npm run test:v5`, `npm run build:v5`, y `npm test` en un checkout limpio; ejecutar la CI `.github/workflows/atria-v5-core.yml` y verificar sus tres trabajos.
4. Revisar específicamente el inicio sin vía, cambio 4→2 después del primer comprobante, suspensión después del segundo viaje, duplicación con mismo command ID y rechazos sin movimiento.
5. Comprobar preview solo si corresponde a SHA matching y READY. El simulador Chromium Pixel no certifica Android físico.
6. Implementar el siguiente checkpoint pequeño y actualizado en la misma rama, sin introducir once casos ni motores paralelos.

### Prompt autónomo

> Continuá ATRIA 5.0 en GitHub `javierdario48-star/ATRIA` rama única `atria-5.0-core-rebuild-experimental`. Partí del HEAD remoto actualizado, no del código en el chat. Lee `docs/migration/STEP_08C_HANDOFF.md`, `CURRENT_HANDOFF.md`, `STATUS.md` y la matriz; el último ejecutable corregido era `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9`. Verifica primero la CI [38972668527](https://github.com/javierdario48-star/ATRIA/actions/runs/38972668527), pendiente al documentar, y resuelve cualquier falla genuina. C08.c añadió oxígeno nasal 2/4 L/min con llegada física y certificados nativos, inicio/cambio/suspensión y flujo visible, sin mejoras inventadas de SpO₂ para CIRR/APP; dos fallos RED fueron corregidos. Mantén C07.d acceso venoso automático y C07.c monitor/ECG/historial. Trabaja en C07/C08 restante y farmacología segura, pruebas positivas/negativas y recorrido de navegador, actualiza documentación y entrega SHA/CI/preview matching, sin tocar main/producción/vendor ni crear nuevos casos.
