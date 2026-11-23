# ATRIA 5 — VARIX-001 V2: segundo piloto adversarial

**Estado:** candidata aislada, NO activada en el catálogo normal ni desplegada. Rama `atria-5.0-core-rebuild-experimental`. La V1 original de VARIX-001 permanece intacta.

## Por qué se eligió

La hemorragia digestiva variceal obliga a demostrar correctamente: un ingreso inestable, órdenes de Enfermería pendientes, tratamiento vasoactivo y antibiótico confirmado, soporte circulatorio, pérdida hemática progresiva, transfusión individualizada, complicación probabilística y rescate, consultas a Gastroenterología/UTI con aceptación, y un cierre que **nunca afirma hemostasia endoscópica**.

### Hallazgo V1 corregido solo en V2

`g_varix_egd` estaba publicado como si fuera un estudio de laboratorio realizado en el box y podía producir un resultado «endoscópico» por paso del tiempo. La candidata V2 **no incluye esa prueba como estudio de la guardia**. El médico solicita el traslado al servicio receptor; este hace o no hace la endoscopía posteriormente. Un pedido de estudio no ejecuta ligadura. Ni la aceptación del receptor ni el cierre elevan artificialmente la hemoglobina o detienen el sangrado.

## Flujo declarado

~~~mermaid
flowchart TD
  I["Ingreso: cirrosis, hematemesis, PA 82/48"] --> L["Libertad médica: historia, exploración, monitor, analítica y decisiones en cualquier orden"]
  L --> T["Vía y soporte: cristaloides o transfusión según estado; terlipresina y ceftriaxona"]
  L --> O["Orden pendiente: no tiene todavía efecto clínico"]
  O --> A{"¿Administración confirmada por Enfermería?"}
  A -- No --> L
  A -- Sí --> T
  T --> E["Reevaluación con signos actuales y recibos nativos"]
  L --> N["Evolución del sangrado sin tratamiento / demora / fármaco equivocado"]
  N --> R{"¿Resangrado sintético seleccionado por semilla Y manifestado?"}
  R -- Sí --> S["Empeora hipotensión/FC; rescate con terapia realmente confirmada"]
  S --> E
  R -- No --> E
  E --> D{"Destino que el médico intenta"}
  D -- Alta u observación insegura --> X["Dr. Vega; −15 XP único; paciente continúa y queda disponible"]
  X --> L
  D -- Gastro/Endoscopía --> G{"¿Consulta y recepción aceptadas?"}
  D -- UTI --> U{"¿Consulta y recepción aceptadas?"}
  G -- No --> L
  U -- No --> L
  G -- Sí --> C["Cierre: traslado aceptado, NO endoscopía ni hemostasia simuladas"]
  U -- Sí --> C
  C --> XP["Calificación oculta única, recibo de XP y desglose; recuperar o siguiente paciente"]
~~~

## Contratos que nunca deben romperse

- No se bloquea una decisión médica equivocada por el diagnóstico oculto; se registran las consecuencias de una acción técnicamente ejecutable.
- Una orden pendiente no cambia fisiología, no suma tratamiento administrado y no habilita hemostasia.
- El traslado se evalúa mediante las pruebas, la impresión comunicada, la preparación clínica y la aceptación real; nunca se interpreta como procedimiento efectuado.
- Las dos alternativas de estabilización son `iv + fluid + terlipressin + ceftriaxone` o `iv + transfusion + terlipressin + ceftriaxone`. La transfusión no se impone universalmente por diagnóstico; una resangrado manifiesto puede exigir soporte adicional.
- El candidato de resangrado tiene 24% de selección simulada; no es un riesgo epidemiológico. Solo se manifiesta si el motor nativo confirma tiempo y estado hemodinámico elegible. Rescatarlo requiere tratamientos auténticos, no palabras en el chat.
- Mismo ID lógico `VARIX-001`, misma semilla de identidad y reacciones V1, edad compatible y siete personalidades; nuevos antecedentes secundarios no deben cambiar dosis, resultado de laboratorio ni fisiología.
- Penalizaciones por alta/observación insegura usan una única cuenta y event ID; no se pierden en el checkpoint, tampoco se repiten al reenviar la misma orden.
- La V1 original sigue en `ATRIA-5-Solitario.html`; V2 solo en `ATRIA-5-VARIX-V2-Experimental.html`.

## Pruebas requeridas — aceptar solo resultados observados

1. `varix-v2-candidate.test.js`: compile/registries, 55 IDs sin duplicados, variación, historia, signos, estudio, decisión insegura, efecto vasoactivo retrasado, no endoscopía ficticia.
2. `qa/v5/varix-v2-parity.mjs`: 4 modos × 6 perfiles × V1/V2 = 24 pares de escenarios con recibos, riesgos, recuperación, errores y salida. Diferenciar desenlace negligente correcto de fallo del motor.
3. `gastro-bleeding-harm-bots.test.js`, `accepted-transfer.test.js` y `surgical-consultation.test.js`: descartar regresiones en hemorragia y traslados V1.
4. `verify-v5-offline-varix-v2.mjs`: 2 navegadores reales (desktop/Android emulado): ingreso, conversación, mala alta, −15 XP, endoscopía no disponible como lab, laboratorio real, guardar/recargar/reanudar mismo paciente.
5. No reemplazar V1 ni habilitar V2 para producción hasta que esté verde la CI y pase aceptación de un teléfono Android físico.

**Referencia:** Baveno VIII (2026), <https://www.journal-of-hepatology.eu/article/S0168-8278%2826%2902778-9/fulltext>. Vasoactivo y antibiótico tempranos; resucitación/transfusión restrictiva individualizada (Hb objetivo ~7–8 g/dl), endoscopía tras estabilización, usualmente dentro de 12 h. Es contenido educativo, no algoritmo clínico para pacientes reales.
