# ATRIA 5.0 — C12.a: paridad ejecutable sin arrastrar fallos antiguos

## Estado comprobable
- Repo: `javierdario48-star/ATRIA` / rama EXCLUSIVA `atria-5.0-core-rebuild-experimental`.
- Baseline: `5cc32b95b0a4b1cc947978b3dd786626c16d9677`, [CI previa 3/3](https://github.com/javierdario48-star/ATRIA/actions/runs/38983893647).
- Corrección anterior de C11.c navegador: `62f12407c4bfd2653ba435a37ef25a2ac321f6f2`, [CI 3/3](https://github.com/javierdario48-star/ATRIA/actions/runs/38983745788).
- C12.a **código funcional**: `dfe525b8258101aa011bfe9605ba0271ab003529` — primera paridad QA + proyección inmutable de exposición, corrección del test que debía esperar vía antes de fármaco.
- CI exacta de código: [38984499200](https://github.com/javierdario48-star/ATRIA/actions/runs/38984499200). `clean-core-contract`: **SUCCESS** (40/40, 219/219 y 4/4, build y nueva caracterización); `independent-game-browser` y `preserved-historical-regression`: en ejecución cuando se redactó. Verificar resultados posteriores; no declarar 3/3 hasta confirmar.
- Preview correspondiente a este SHA no verificada; prueba física Android no realizada.

## Resultado en V5
1. **`qa/v5/clinical-parity-gate.mjs`**, invocado dentro de `.github/workflows/atria-v5-core.yml` en job clean-core-contract. Ejecuta **la versión efectiva del juego antiguo, incluyendo orden de wrappers**, en VM de QA; no incluye datos ni módulos históricos en la distribución. Siete escenarios: APP-001 sin terapia y Ringer 500 ml; CIRR-001 sin terapia y Ringer 500 ml; PERI-SEC-001 sin terapia, Ringer 500 ml y Ringer 3000 ml. En cada uno comprueba que pedidos pendientes no sumen exposición; muestra signos, millilitros confirmados, toxicidad, estado fisiológico y mortalidad en el horizonte corto. Identifica mediante SHA-256 la fuente de cada fragmento. El conjunto APP/CIRR verifica línea basal y ausencia de tratamiento, sin exigir replicar defectos heredados.
2. **`src/v5/clinical/medication-exposure.js`**: selector `summarizeIVExposures(patient)`, lectura pura de dosis confirmadas de Ringer/ceftriaxona/metronidazol; exige UID, evento único, dosis/unidad válida. Suma ml y mg separadamente por droga; no incluye O₂ nasal, accesos, medidas, órdenes ni pendientes. No hay nueva fuente de estado, ni intervalo, ni mutación ni motor aparte. `guardSession.read().exposure` ofrece este agregado al futuro integrador C12.
3. **Pruebas**: unitarias de selector con exposición de 500+500 ml, mg, fraude de UID/recibo duplicado/mezcla de unidades; integración con enfermera real: 0 ml durante viaje y vía, 500 ml después del primer bolo y 1000 ml después del segundo, sin doble contabilización del mismo comando. La CI de núcleo es verde.
4. **Se mantuvo intacto** V4, `main`, mundo, teclado, UI, fisiología APP/CIRR y motor de mortalidad no migrado.

## Defectos antiguos que NO migrar
- Farmacología en sombra B1 o cargador global rechazado por heparina: no hacerlos escritores V5 sin extraer y certificar algoritmos puros.
- Múltiples writers del mismo volumen: `applyImmediatePhysiology`, V3, puente, rescate, convalecencia y offsets V4. La propiedad final para cualquier mecanismo debe ser exactamente una, no aplicar todos los parches.
- Predicado de muerte tardío que pisaba la ventana de rescate con `csDeathRescueMissing=function(){return true;};`. Ver `qa/ATRIA_487_RESCUE_OWNERSHIP_RESULTS.md`; caracterizar la versión efectiva corregida.
- Ventanas de gracia/reanimación no son inmunidad arbitraria. Una dosis nueva NO debe renovar indefinidamente el rescate; fallecimiento debe resultar de signos críticos persistentes.
- No copiar umbrales/cifras experimentales de B1 como si se hubieran validado en pacientes ni declarar mortalidad V5.

## Próximo checkpoint: C12.b
- Conservar un solo paciente, reloj y autoridad. Primero caracterizar con el VM actual un caso con **verdadero daño clínico visible y muerte** (ideal PERI-SEC-001, también alergia/anticoagulación del bot `qa/iatrogenic-wrong-treatment-487.mjs`) y comparar con su control sin tratamiento a los mismos tiempos. Pinnear fixtures sin regenerarlos para ocultar divergencias.
- Extraer un único submecanismo V5 estrictamente definido (exposición real → cambio fisiológico) y demostrar en pruebas que está conectado a administraciones verificadas, que su ausencia evita daño ficticio y que no hay segundo escritor. No añadir casos al selector hasta recuperar funcionalidades.
- Modelar evolución natural, toxicidad, rescate/muerte en checkpoints sucesivos. No modificar `main`, `vendor/atria-4.8.6/**`, cámara, teclado ni interfaz.
- Criterio de aceptación: tratamiento correcto e incorrecto ambos técnicamente ejecutables, consecuencias correlacionadas a dosis y tiempo, controles contrafactuales, sin bloqueos médicos arbitrarios.

## Prompt mínimo de continuación
> Recupera `atria-5.0-core-rebuild-experimental` del repo `javierdario48-star/ATRIA`, lee `docs/migration/STEP_12A_HANDOFF.md` y `docs/migration/CLINICAL_PARITY_GATE.md`, verifica la [CI C12.a](https://github.com/javierdario48-star/ATRIA/actions/runs/38984499200). El código C12.a está en `dfe525b8258101aa011bfe9605ba0271ab003529`. Solo se portaron una prueba QA del ejecutable V4 efectivo y el selector V5 puro de exposiciones por recibo (no daño ni muerte). Sigue con un mecanismo causal real a la vez, sin trasladar sombras B1, wrappers/overrides defectuosos ni duplicar fisiología. Usa pruebas contrafactuales y publica nuevo SHA, CI y handoff.
