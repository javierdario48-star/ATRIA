# ATRIA 5.0 — C11.a — orden farmacológico transversal sin perder fisiología del caso

## Punto de recuperación
Repositorio `javierdario48-star/ATRIA`; **única rama de escritura** `atria-5.0-core-rebuild-experimental`.
Baseline remoto `2c4c8031cc364ebcd6a374351f2202ecf5b037f0` con CI [38940082226](https://github.com/javierdario48-star/ATRIA/actions/runs/38940082226) completed/success.
SHA funcional/test del último cambio antes de este informe: `82cb03f2b64dbd54ef146d38fdb6a537525bc01b`.
La CI específica del SHA funcional se consulta en GitHub Actions; **no declarar 3/3 mientras el run siga en progreso**.

## Problema real
Android mostró `enfermera vías y ringer` con dos vías ejecutadas y rechazo de cristaloides por la ID del caso CIRR, aunque APP tenía una implementación farmacológica de Ringer. El antiguo `app-care.js` tenía su propio mapa de preparaciones y el `guard-session.js` autorizaba farmacología física exclusivamente para APP; CIRR seguía gestionando otro mapa de preparación para espironolactona/paracentesis.

Se prioriza migrar un conjunto **pequeño y verificable** antes de intentar representar un catálogo completo con bonificaciones genéricas.

## Cambios de código

- **Nuevo** `src/v5/clinical/native-medications.js`: formulario validado `IV_MEDICINES` con `fluid` 500 ml (0,8 s de preparación simulada), `ceftriaxone` 1000 mg (1,5 s) y `metronidazole` 500 mg (1,5 s). `parseStandardIVDose` comprueba cantidad y vía, unidades g/mg/ml/cc/l, regímenes repetidos o ambiguos y negaciones de vías no IV. Son tiempos de preparación **del simulador**, no cinética farmacodinámica real.
- **Un solo servicio nativo** `createIVAdministration(p,...)` mantiene trabajos de medicación pendientes, documento de dosis, deduplicación por medicamento, tiempos de inicio tras llegada de enfermería, `treatments` y `administrationLog` con identidad de paciente/evento. **No cambia signos ni produce respuestas clínicas**; las conserva exclusivamente el motor de cada caso.
- `src/v5/clinical/native-app.js`: reexporta el parser compartido bajo el nombre histórico `parseAppDose` para conservar contratos existentes; sus constantes de preparación se derivan del único formulario, con los mismos valores.
- `src/v5/clinical/app-care.js`: sustituye su mapa privado de antibióticos/fluidos y las reglas duplicadas de administración por el servicio común. Permanece como caso APP con `advanceAppVitals` propio. Mantiene NPO y consultas quirúrgicas por sus contratos originales. Cero cambios al efecto caracterizado de cristaloides en APP.
- `src/v5/clinical/cirr-care.js`: usa ese **mismo** servicio para cristaloides, ceftriaxona y metronidazol. Conserva el planificador específico de espironolactona/paracentesis de 550 ms e integra ambos conjuntos de tareas en un único avance cronológico. **En CIRR estable no se infiere beneficio hemodinámico inmediato de una bolsa de Ringer**: `advanceCirrVitals` sigue sin depender de `fluid`. Es registro de una administración, no prueba de una indicación apropiada.
- `src/v5/clinical/guard-session.js`: sustituye la restricción de medicamentos físicos a APP por consulta de formulario compartido en APP/CIRR, exige una vía ya documentada o pendiente, valida dosis antes de mover enfermería, y ejecuta **solo después** de la llegada al paciente mediante el puerto clínico existente. Se conserva la cola de enfermería, eventos de la autoridad, cronómetro único, los comprobantes y el bloqueo de cierre con intervenciones pendientes. No hay segunda autoridad, parser de conversación, RAF ni bucles clínicos duplicados.

## Validación

- `src/v5/clinical/physical-nursing.test.js`: nueva prueba de orden **«enfermera vías y ringer»** en CIRR: acceso 2, infusión después de una segunda visita física, 500 ml comprobados, sin cambios ficticios de PA/FC/FR/SpO₂, y dos comprobantes terminales. Además: ceftriaxona 1 g IV, dosis 2 g inválida, Ringer 300 ml inválido, ruta oral rechazada, ninguna enfermera asignada para órdenes médicamente inválidas.
- `qa/v5/cirr-browser.mjs`: preserva el recorrido CIRR original 100/100 y 133 XP sin agregarle fármacos ajenos; abre una guardia **separada** después para verificar la nueva orden desde la UI pública, con paciente nuevo y sin duplicación.
- Los recorridos de APP, ECG, estudios, historia, Vega, teclado y bots V4 originales deben continuar verdes en `.github/workflows/atria-v5-core.yml`. Verificar el resultado de CI del último SHA funcional.

## Alcance clínico y técnico que NO está terminado

- Este checkpoint habilita **solo tres** tratamientos IV caracterizados; no equivale a un catálogo farmacológico completo.
- Todavía faltan evaluación de la **indicación clínica**, contraindicaciones, alergias, cálculo de dosis alternativas seguras, concentración/velocidad de infusión, volumen efectivo, toxicidad y efectos adversos individuales. La administración documentada no implica que la decisión sea adecuada.
- Para CIRR no está caracterizado un modelo de shock/hipovolemia/ascitis con respuesta a líquidos; no se importó la magnitud ficticia de APP ni se inventó mejoría.
- Los casos restantes tienen datos canónicos pero carecen de políticas nativas completas; no se agregaron casos.
- Oxígeno, IV automático, órdenes fuera de secuencia, varios pacientes y multijugador aún esperan migración y pruebas de dos a cuatro clientes. Las pruebas de V4 no implican migración a V5.
- **No cambiar producción, golden master ni ramas protegidas.**

## Instrucción autónoma de continuación

> Retoma `javierdario48-star/ATRIA` en `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/{CURRENT_HANDOFF,STATUS,STEP_11A_HANDOFF,STEP_08B3_HANDOFF}.md`, comprueba HEAD/CI y preview SHA matching. El código C11.a empieza en `82cb03f2b64dbd54ef146d38fdb6a537525bc01b` antes del commit documental. La nueva base IV `native-medications.js` comparte identidad, parser, dosis, preparaciones y recibos para Ringer/ceftriaxona/metronidazol en APP/CIRR; cada enfermedad conserva su propia fisiología. Se añadió prueba de `enfermera vías y ringer` en CIRR con dos trayectos, dos accesos, 500 ml y ninguna respuesta APP ficticia. No ampliar catálogo sin reglas clínicas específicas ni confundir administración con indicación. Verificar QA 3/3 y preview; continuar farmacología restante, oxígeno, C07/C08, Vega y multiplayer por checkpoints, con handoffs obligatorios.
