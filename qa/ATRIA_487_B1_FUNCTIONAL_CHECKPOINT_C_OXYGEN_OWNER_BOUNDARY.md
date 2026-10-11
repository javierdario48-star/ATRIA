# ATRIA 4.8.7 — Oxígeno: frontera causal y bloqueo de propiedad (Checkpoint C)

**Rama exclusiva:** `atria-4.8.7-grace-nursing-qa`. **HEAD de recuperación:** `fd18b76a96ef4dd48ef8cdb3b6e5dff4694112b3`; CI inicial [38161682635](https://github.com/javierdario48-star/ATRIA/actions/runs/38161682635) SUCCESS. Este checkpoint añade controles de seguridad a la cadena de enfermería/VM existente; **no habilita un nuevo escritor B1**.

## Frontera verificada en código

1. **Enfermería / ejecución:** `nurseNatural`, cola nativa de 800 ms, `recordAdministration`, `administrationLog` y `monitorTherapies` aportan evidencia sólo después de completion. `qa/physiology-live/oxygen-preflight-487.mjs` ya confirma una dosis real de 4 L/min y el recibo único de sombra.
2. **Terapia antigua:** `therapyEffectTotals()` suma una contribución directa positiva a SpO₂ tras el oxígeno confirmado, sin esperar a B1.
3. **Rescate crítico:** `src/clinical/critical-rescue-487.js:csCriticalRescuePhysiology487` vuelve a consumir `administrationLog` + `monitorTherapies` recientes e incrementa `phys.oxygenation` en sepsis/peritonitis. Su evidencia también interviene en elegibilidad del rescate de 65 s; no debe ocultarse ni falsificarse.
4. **Enfermedad y monitor:** progresión respiratoria natural, `progressionOffsets`, suavizado y `updateLiveVitals` continúan bajo el motor existente. No se silencia deterioro natural para presentar una mejora.
5. **Contrato incompleto:** `src/clinical/nurse-scanner-487.js` marca «suspender» como negación, mientras `src/integration/nurse-voice-487.js` **no ejecuta** ítems negados. El esquema B1 expone `start/setRate/stop`, pero un esquema no ejecuta órdenes. Repetir una orden con distinto flujo sólo cuenta como titulación **si hay una nueva fila real** del ejecutor; el observador clasifica ese segundo registro como `setRate` pero no fabrica `stop`.

**Decisión:** transferencia B1 de oxígeno **BLOQUEADA y en sombra**, no fallida silenciosamente. No es suficiente interceptar únicamente `therapyEffectTotals`: quedaría el aumento terapéutico adicional del rescate. Tampoco es lícito excluir el registro de administración o falsear el estado activo: se perdería evidencia que protege el rescate y las consultas. No se ha demostrado aún una frontera donde las dos contribuciones antiguas puedan desconectarse sin tocar una política protegida. Por tanto, **no modificar el rescate**, no crear motor alterno y no migrar a un paciente activo.

## Prueba nueva y criterios

`qa/physiology-live/oxygen-ownership-boundary-487.mjs`, integrada en `npm test` y ejecutable de modo acotado con `npm run qa:oxygen-ownership`, reutiliza el preflight y el VM actual. Cubre no tratado, pendiente, confirmado, ambos aportes antiguos, no ejecución de la suspensión textual, evidencia condicional de segunda dosis/flujo, coexistencia con Ringer, rollback bloqueado, permanencia de gracia y perfil con oxigenación más comprometida. El perfil comprometido **no constituye una prueba de hipoxemia refractaria clínicamente calibrada**. Rescate terminal/fatalidad y gracia completa siguen cubiertos por `src/integration/critical-rescue-live-487.test.js`.

No se han modificado `critical-rescue-487.js`, rescate, muerte, gracia, cirugía, motor antiguo ni B1 congelado. Todas las rutas nativas quedan operativas. Las simplificaciones B1 de flujo, respuesta pulmonar y tiempo siguen siendo estimaciones educativas, sin validación de CO₂, gasometría ni calibración de insuficiencia respiratoria.

**Prueba de CI:** el SHA de este checkpoint deberá verificarse en GitHub Actions tras publicar. Un commit antes de CI verde es un candidato, no una aprobación.

## Desbloqueo exacto siguiente

Se requiere un contrato nativo de ejecución de **suspensión** y, para titulación, un recibo de nueva administración validado con flujo/vía. Sólo entonces podrá proponerse una exclusión de ambos escritores antiguos *de efecto terapéutico*, sin borrar la evidencia ni cambiar política crítica. Hacer primero prueba RED que pruebe doble efecto al añadir un escritor, corregir con una frontera única y correr bots de respuesta parcial/refractaria, 65 s, 180–480 s, Ringer+oxígeno y rollback, seguidos de CI y pruebas gráficas/Android. No avanzar a noradrenalina hasta cerrar este bloqueo o recibir autorización para modificar la frontera protegida con un aislamiento demostrable.
