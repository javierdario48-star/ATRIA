# ATRIA 5.0 — C12.e1: Oxígeno con efecto clínico real, fuente de verdad única

**Rama:** `atria-5.0-core-rebuild-experimental`. **Código funcional:** `1f51b390ca929e474255bff76aff4cfd366ecf2f`. **Fecha:** 2026-10-17.
**CI:** [GitHub Actions del SHA](https://github.com/javierdario48-star/ATRIA/commit/1f51b390ca929e474255bff76aff4cfd366ecf2f/checks). Evidencia preliminar: `clean-core-contract` 40/40 core, 273/273 V5, 4/4 adicionales y `actual-http-multiplayer-browser` aprobados; navegador/regresión total pendientes de conclusión al publicar este documento.

## Objetivo y alcance

La primera familia C12.e ya está conectada desde una orden de enfermería validada hasta una **variación verdadera y gradual de la SpO₂**, sin otro motor fisiológico ni un nuevo loop.

1. `src/v5/clinical/oxygen-physiology.js`: evaluador puro `oxygenationTargetOffset(patient,caseDef,atNativeMinute)` reutiliza la regla `csPharmResponse487('oxygen',...)` del catálogo V4. Acepta únicamente cánula nasal confirmada de 2 o 4 L/min, enlazada por `sourceEventId`, `patientUid`, dosis, ruta, hora nativa y recibo único `start/setRate`. Si no está activa devuelve cero. Si hay activo falso/recibo inconsistente falla cerradamente.
2. **Una sola escritura:** `advanceAppVitals` y `advanceCirrVitals` suman el offset al **target** de SpO₂, *antes* del suavizado nativo y sus límites. La administración `executeOxygenSupport` solamente registra inicio/cambio/suspensión y confirma enfermera: no toca los signos.
3. El reloj ya existente `createGuardClock` aporta minuto nativo al avanzar cada segmento de ambas políticas; los cortes de preparación de enfermería se mantienen. 2 L/min produce ~65% de respuesta del flujo 4 L/min en este modelo **educativo**, no una relación clínica cuantitativa. El inicio del mecanismo heredado tiene un epsilon numérico menor que 0.01 en el tiempo cero, antes del aumento gradual.
4. La calibración consulta `patient.liveVitals.spo2` real; un paciente con SpO₂ 98 no gana otro beneficio artificial. Al suspender, desaparece el soporte del target y el valor regresa gradualmente hacia el determinado por la enfermedad.
5. `caseDrugResponseScale(caseDef,'oxygen')` reutiliza la validación de `pharmacology.overrides.oxygen.responseScale` (0–2). Los ejes `spo2` de oxígeno están marcados como **propiedad de la fisiología nativa** en `pharmacology-catalog.js`: la proyección global muestra la respuesta heredada pero su `candidateOffsets.spo2=0` impide aplicar dos veces el efecto.
6. Sin cambios de dosis/ruta de medicamentos IV, leyes de cierre/XP, mapa, teclado, modos, paquetes ni legado. No hay un motor nuevo de infección o muerte.

## Pruebas y regresión

`src/v5/clinical/oxygen-physiology.test.js` verifica:
- Con SpO₂ inicialmente 85, respuesta positiva en APP y CIRR, 4 L/min > 2 L/min, solo eje de SpO₂ y sin manipular otras constantes.
- En SpO₂ 98 sin beneficio falso; repetir la misma prescripción es idempotente; `therapy.stop` desactiva el soporte y no deja persistir el aumento en el target.
- Un dispositivo falso, recibo faltante, UID distinto o tiempo de ejecución futuro no producen efecto; todos provocan rechazo explícito.
- Override por caso en dosis **simulada** de oxígeno: `responseScale=.5` reduce a la mitad el offset y `responseScale=5` se rechaza.
- Flujo de Solitario con **enfermería recorriendo el mundo hasta la cama**: la orden aparece pendiente y no cambia monitor ni catálogo de exposiciones hasta llegar; tras ejecutar, un solo registro y `pharmacologyRead` lo observa, sin doble efecto.
- Se mantienen los escenarios históricos de SpO₂ sin oxígeno de `qa/v5/characterize*`, la regresión nativa de APP/CIRR, casos cerrados, UI de Android emulado y protocolo de guardias.

## Qué sigue sin implementarse

La farmacología del catálogo tiene **30 ítems**, pero C12.e1 **habilita efecto fisiológico solo a la familia oxígeno** (además de los mecanismos nativos previos de cristalóides/paracentesis). No inferir que 30 medicamentos ya se administran. CIRR/APP siguen siendo las dos guardias completas.

**Próximo checkpoint C12.e2:** validación de rutas y dosis + familia analgésicos/diuréticos según necesidad clínica, con un mismo pipeline `createNativeClinicalPort` → enfermería → recibo → `advance*`; contrastar cada nueva intervención con su ausencia y su administración inapropiada (hipotensión, sobrecarga). No usar fórmulas de prescripción real ni múltiples escritores.

**Regla de promoción:** ninguna familia farmacológica pasa a UI como administrable sin (1) dosis/ruta, (2) vía y enfermera cuando proceda, (3) registro por UID/evento, (4) único dueño de efecto y (5) pruebas explícitas 2 casos, duplicado, stop/repeat, pantalla de monitor, 4 jobs de CI. No tocar `main` sin autorización.
