# ATRIA 5.0 — C12.d: catálogo farmacológico global y reglas por caso

Checkpoint: C12.d · 2026-10-17 · rama `atria-5.0-core-rebuild-experimental` · código base `0c28676f5f78392a37f258cbc636b0e515551ab4`.

## Qué quedó implementado

**Catálogo V5 único con herencia de V4.8.7**. `src/v5/clinical/pharmacology-catalog.js` importa únicamente evaluadores **puros** del legado `pharmacology-registry-487.js` y `pharmacology-outcomes-487.js` autorizados en `scripts/build-v5.mjs`. NO importa `src/integration/`, no activa los parches HTML, no tiene bucles, timers ni escrituras en los signos vitales.

1. **29 reglas del catálogo V4**: mecanismo, clase, ruta, indicaciones, riesgos, fase de inicio/pico, respuesta fisiológica general según las mediciones actuales del paciente y rasgos del caso. **Anticoagulación** figura entre los 30 elementos del catálogo global, pero solo como **regla de riesgo/revisión** (`unmodeled`): ni dosis, ni compensación fisiológica, ni eficacia clínica inventada.
2. **Todos los 13 casos existentes** heredan el perfil `BASE_CASE_PHARMACOLOGY_487` sin copiar listas ni condicionales por enfermedad. Un caso futuro con `pharmacology.traits` y `coverageSets` define sus propias reglas; si no declara nada, recibe `undifferentiated` conservador basado en los signos actuales, **sin inferir patógenos o beneficio antibiótico**.
3. **Sobrescrituras por caso**: `pharmacology.overrides[id].responseScale` entre 0–2 y `extraWarnings` como etiquetas cortas, validadas al compilar. Estas modificaciones afectan la *proyección*, no alteran efectos nativos anteriores. Perfiles desconocidos, medicamentos sin revisión, IDs duplicadas y regímenes antimicrobianos inválidos se rechazan explícitamente.
4. **Dosificación confirmada, no orden textual**: `evaluate(caseId,patient,atNativeMinute)` verifica `patient.uid`, `sourceEventId` único, tiempo nativo y pertenencia de cada registro de `administrationLog`. Una orden pendiente NO cuenta como dosis. Oxígeno con acción `stop` ya no se proyecta activo.
5. **Un solo escritor clínico**: APP conserva su respuesta hemodinámica nativa a fluidos; CIRR conserva su efecto respiratorio nativo por sobrecarga y su paracentesis. `ownedAxes` evita ofrecer otra vez esos mismos offsets como `candidateOffsets`. Toda salida es solo lectura, nunca se suma directamente a `liveVitals` ni se reporta una dosis ficticia.
6. **Integración real con guardia Solitario/Aprendiz**: `createGuardSession` construye el catálogo y expone `pharmacologyRules()` y `pharmacologyRead()`. El avance fisiológico, enfermería, estudios, cierre, XP y monitor continúan usando su ejecutor original, sin una segunda evaluación por fotograma.

## Cómo añadir un caso sin agregar código farmacológico

- Añadir el nuevo caso a `src/v5/content/cases.json`.
- Declarar `pharmacology.traits` como `infection`, `pain`, `bleed`, `congestion`, `hypovolemia`, `shock` según corresponda; **sin rasgos** el caso conserva un perfil conservador `undifferentiated`.
- Si usa antibióticos, declarar explícitamente `pharmacology.coverageSets` de moléculas necesarias, p. ej. `[['ceftriaxone','metronidazole']]`. No se asumen gérmenes ni sensibilidad automáticamente.
- Opcionalmente `pharmacology.overrides: {'morphine': {'responseScale':0.5, 'extraWarnings':['risk-of-hypotension']}}` modifica una respuesta aproximada solo para ese caso.
- Correr `npm run test:v5` y pruebas de recepción clínica. **Importante:** declarar un medicamento en el catálogo **NO habilita su administración**. Hay que migrar previamente dosis/ruta, intérprete de orden, enfermería, confirmación, propietario fisiológico del caso y cierre.
- Medicamentos *nuevos que no existen en el catálogo global* requieren revisión explícita y cobertura de tests antes de introducirlos. No se habilitan por inferencia automática.

## Cobertura y pruebas

Archivo `src/v5/clinical/pharmacology-catalog.test.js`:
- Cobertura de 30 ítems × 13 casos × 3 estados clínicos × 3 tiempos = **3.510 evaluaciones** de medicinas *confirmadas simuladas en un paciente de prueba*, todas finitas, acotadas, sin mutación de los parámetros, sin doble aplicación en ejes con dueño nativo.
- Validación de 30 perfiles para cada caso, tiempos, estado de oxígeno encendido/apagado, APP con combinación antibiótica requerida, CIRR con prevención de doble volumen, defaults seguros y cambios por caso.
- Intentos de ID duplicada, timestamp futuro, paciente distinto, droga global no revisada, overrides inválidos y casos duplicados: rechazos.
- **Integración real con `createGuardSession`** en Solitario para APP: vía, ceftriaxona + metronidazol pendientes, comprobantes efectivamente administrados, cobertura tras confirmación y repetición de ID sin nueva administración; en CIRR: medicamento no implementado rechazado, oxígeno iniciado y suspendido.

**CI del código antes de este documento:** [ver el workflow de base](https://github.com/javierdario48-star/ATRIA/commit/0c28676f5f78392a37f258cbc636b0e515551ab4/checks). En la comprobación parcial, `clean-core-contract` pasó: 40/40 núcleo, 267/267 V5, 4/4 extra; job HTTP con Chromium independientes verde. Hay que verificar que el job del navegador completo y la regresión histórica terminen verde en ese mismo SHA.

## Referencias clínicas de plausibilidad

- [Surviving Sepsis Campaign 2026](https://sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026): efectos diferidos del tratamiento antibiótico, control de foco y vasopresores orientados a perfusión; *no* asumir efectos instantáneos de antibióticos sobre PAS.
- [BTS oxygen guideline](https://thorax.bmj.com/content/72/Suppl_1/ii1): tratar hipoxemia y respetar objetivos según riesgo de hipercapnia; saturación 98% no obtiene un buff por rutina.
- Fichas farmacológicas y [revisión anterior](LEGACY_PHYSIOLOGY_REUSE_REVIEW.md): opioides, diuréticos, volumen; respuestas aproximadas de videojuego, no farmacocinética médica ni instrucciones terapéuticas.

## Lo que NO está terminado y el próximo checkpoint

**Reglas compiladas y evaluables ≠ 30 ejecutores clínicos.** Hasta este punto, V5 puede administrar la subserie validada en APP/CIRR y **no convierte un `candidateOffset` en un cambio de monitor si carece de una ejecución verdadera**. Tampoco reconoce muerte/toxicidad general, eficacia clínica real para todos los pacientes, falla de host, lobby online ni XP competitivo.

Siguiente trabajo clínico, después de garantizar conexión a sesiones multijugador: migrar el resto del formulario **por familias** mediante el mismo `createNativeClinicalPort`/enfermería, con política de caso única, parámetros de monitor consistentes, recepción ejecutada, ID de dosis e impacto por tiempo. Evitar importar wrappers `src/integration` o formar un motor global paralelo. **Una sola fuente de verdad para `liveVitals`.**

No agregar casos nuevos por ahora; usar los 13 perfiles como matrices de contrato y CIRR/APP como guardias funcionales de aceptación.
