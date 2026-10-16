# ATRIA 5.0 — Registro de checkpoints y continuidad

**Plan vinculante:** [ATRIA_50_MIGRATION_MASTER_PLAN.md](../ATRIA_50_MIGRATION_MASTER_PLAN.md).
**Rama de ejecución única:** `atria-5.0-core-rebuild-experimental`. No escribir `main`, producción o `vendor/atria-4.8.6/**`.
**Recuperación C3a antes del primer merge:** `atria-5.0-recovery-before-approved-ui` @ `646a0ab3f19991ce4e4c4239760db6bfb17c18a1`.
**Interfaz aprobada y congelada para comparación:** `atria-5.0-compact-keyboard-preview` @ `0b36884fa4a879d49c588fa8f3f262a535dd3070`.
**C01 — Consolidación:** fast-forward no forzado de `646a0ab` a `0b36884`, por compare 29 ahead/0 behind y lease de SHA anterior; código fuente CI 38836248252, 3/3 success. Informe [STEP_01_HANDOFF.md](STEP_01_HANDOFF.md). Los commits posteriores son documentación; consultar HEAD de rama antes de reanudar.
**Prioridad vigente:** sistemas primero; NO añadir los once casos restantes.
**C08.b3:** [vía venosa compartida y rechazo comprensible](STEP_08B3_HANDOFF.md). Incidente reproducido en Android: en CIRR la enfermera llegaba, pero faltaba el ejecutor IV; el chat ocultaba el rechazo. Corregido sin introducir fármacos de otros casos. C07 y el resto de C08 continúan pendientes.
**C05.e/C09.a:** [barrido ECG limpio y auditoría de arquitectura](STEP_05E_HANDOFF.md) · [Vega en chat global](STEP_09A_HANDOFF.md). Próximo: C07/C08 enfermería física, C09 avanzado, voz y multijugador. Consultar CURRENT_HANDOFF.
**Continuación tras Work:** C07.a protege dosis/vía y recibos de APP en órdenes repetidas: informe [STEP_07_HANDOFF.md](STEP_07_HANDOFF.md). C07/C08 completos siguen pendientes; ver CI exacta del HEAD.
**C02:** inventario técnico completado; [matriz](PARITY_MATRIX.md), 73 módulos
clasificados con hashes; [informe](STEP_02_HANDOFF.md).
**Últimos cambios funcionales publicados:** C04/C05.a en
`6e75b18d26dc1dcd3bf3ffa08af177f20efe01fe` y C06.a en
`3ea74db7f788bd174cb341d0a4be7fa82c021e71`; corrección C05.b del monitor visible
en `52055441920d5e40291c9d0aaec4521a2acfe50c`. Consultar
[CURRENT_HANDOFF](CURRENT_HANDOFF.md) para SHA/CI/preview y límites de cada entrega.
**CI del último ejecutable:** [38848167010](https://github.com/javierdario48-star/ATRIA/actions/runs/38848167010),
completed/success **3/3**. 137 contratos V5, 39 core; examen 40, diálogo 20 y
monitor 16 comparaciones efectivas. UI Chromium móvil y cierres CIRR/APP aprobados.

**C08.c (16-10-2026):** código/QA remoto `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9`. Oxígeno nasal (2/4 L/min) ejecutado exclusivamente al llegar una enfermera al paciente: comprobante nativo de inicio/cambio/suspensión; sin modificar la fisiología de CIRR/APP. Ver [STEP_08C_HANDOFF.md](STEP_08C_HANDOFF.md). CI automática iniciada para el código: [38972668527](https://github.com/javierdario48-star/ATRIA/actions/runs/38972668527); **resultado aún pendiente de verificar**, no atribuirle 3/3 anticipadamente. La primera corrida [38972537246](https://github.com/javierdario48-star/ATRIA/actions/runs/38972537246) mostró dos errores detectados por pruebas nuevas (titulación prematura y máscara no validada); reparados en `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9`, por certificar. Sin preview matching confirmada ni prueba Android físico.

**C08.c — verificación posterior y última corrección visual, 16-10-2026.** El código C08.c con seguridad clínica y llegada espacial real `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9` obtuvo CI **[38972668527](https://github.com/javierdario48-star/ATRIA/actions/runs/38972668527) completed/success 3/3**: 200/200 pruebas V5, 39/39 núcleo, Chromium móvil completo y regresión V4. Después se publicó el cambio **`1dda7350a81fa7337144ad294f37165f46c7094b`** (solo proyección/presentación del historial) para mostrar por separado `start`, `setRate` y `stop` de oxígeno como “Administrado”, “Flujo ajustado” y “Suspendido y confirmado”; sin modificaciones de ejecución clínica ni fisiología. CI exacta de este último código [38973192616](https://github.com/javierdario48-star/ATRIA/actions/runs/38973192616) **en ejecución al registrar esta nota**; requiere comprobación final antes de atribuirle 3/3. Vercel: comprobadas previews READY anteriores de `f3f65441` y `51bdf018`, ambas **anteriores a la corrección de titulación y validación**; el despliegue explícito del SHA corregido fue rechazado por `402 payment_required / api-deployments-free-per-day` (más de 100 despliegues diarios, `retryAfter=86400`). **No existe preview verificada matching el ejecutable corregido**. Sin prueba Android físico.

## Tabla de etapas

| Paso | Objetivo | Estado |
| --- | --- | --- |
| C01 | Consolidación de UI aprobada y estabilización | IMPLEMENTADO — CI fuente verde |
| C02 | Matriz de equivalencia e inventario del legado | COMPLETO — inventario, no certificación de paridad |
| C03 | Portada, menú, perfil, HUD | PENDIENTE |
| C04 | Examen físico original por segmentos | IMPLEMENTADO CIRR/APP — regiones, técnicas, Glasgow, UI; [informe](STEP_04_HANDOFF.md) |
| C05 | Historia, monitor, estudios, paneles | PARCIAL C05.a–f — ECG de 4,5 s/125 Hz, búsqueda de órdenes y **lecturas monitorizadas con oscilaciones pequeñas, acotadas y reproducibles**, separadas de fisiología/observación puntual. Faltan ECG diagnóstico y activación de arritmias mediante casos. [C05.e](STEP_05E_HANDOFF.md) · [C07.c/C05.f](STEP_07C_HANDOFF.md) |
| C06 | Diálogo y anamnesis de pacientes | PARCIAL C06.a — CIRR/APP, ALiCIA, contexto y antecedentes; [informe](STEP_06_HANDOFF.md) |
| C07 | Parser/órdenes combinadas enfermería | PARCIAL C07.a–d — dosis/vía validadas, órdenes compuestas, monitor con estado por recibos, historial de administraciones y **dependencias IV reordenadas + canalización automática explícita cuando falta acceso en guardia con NPC**. Sin segundo parser ni motor. Pendiente oxígeno, casos no nativos, restricciones avanzadas y combinaciones múltiples. [C07.c](STEP_07C_HANDOFF.md) · [C07.d](STEP_07D_HANDOFF.md) |
| C08 | Enfermería física y administración nativa | PARCIAL C08.a–c: vías, monitor, tratamientos nativos y **oxígeno nasal físico a 2/4 L/min** (inicio, cambio de flujo, suspensión, validación antes de caminar, comprobante nativo y eventos de historial). CIRR/APP no reciben efectos de SpO₂ genéricos. Sigue pendiente fisiología hipoxémica por caso, métodos de oxigenoterapia, guardia múltiple y demás procedimientos. [C08.c](STEP_08C_HANDOFF.md) |
| C09 | Vega y tutor Aprendiz | PARCIAL C09.a — respuestas progresivas por el mismo chat global, sin administración ni motor paralelo. Docencia avanzada/rescate físico pendiente. [Informe](STEP_09A_HANDOFF.md) |
| C10 | Voz sobre comandos únicos | PENDIENTE |
| C11 | Tratamiento y farmacología transversal | PARCIAL C11.a — formulario IV compartido para Ringer 500 ml, ceftriaxona 1 g y metronidazol 500 mg; dosis y vía estrictas, trabajo físico, preparación y recibos nativos en APP/CIRR. Fisiología sigue específica: APP responde a cristaloides; CIRR no inventa respuesta. Falta catálogo amplio, otras dosis, contraindicaciones, eventos adversos y evaluación por indicación. [Informe](STEP_11A_HANDOFF.md) |
| C12 | Fisiología, complicaciones y rescate | PENDIENTE |
| C13 | Casos PANC/CROHN/COLON | DIFERIDO — no implementar |
| C14 | Casos HDA/ILEO | DIFERIDO — no implementar |
| C15 | Casos CHOLE/CHOLANG | DIFERIDO — no implementar |
| C16 | Caso MESI | DIFERIDO — no implementar |
| C17 | Tres peritonitis PBE/SEC/TER | DIFERIDO — no implementar |
| C18 | Guardia continua multi-paciente | PENDIENTE |
| C19 | Carrera, niveles, XP, persistencia | PENDIENTE |
| C20 | Lobby social, amigos, salas | PENDIENTE |
| C21 | Chat global, remotos, reconexión | PENDIENTE |
| C22 | Cooperativo 2–4 clientes | PENDIENTE |
| C23 | Competitivo 2–4 clientes | PENDIENTE |
| C24 | Optimización y Android/iOS físico | PENDIENTE |
| C25 | Paridad, limpieza y promoción aprobada | PENDIENTE |

## Secuencia autorizada

Continuar Fase B con C07/C08: caracterizar parser, dependencias y ejecución real
de enfermería sobre la misma autoridad. Conservar C04/C05.a/C06.a y completar sus
límites explícitos. Después Vega, contratos clínicos extensibles, voz/guardia/
progresión y red, según el orden solicitado.
No reconstruir la base aprobada. C03 completo no es prerrequisito de C04.
El usuario autorizó continuar autónomamente mientras haya pruebas aprobadas y no
aparezca una decisión estética importante o un cambio clínico sin referencia.

## Plantilla obligatoria de informe por checkpoint

1. Alcance previsto vs completado (incluidos defectos encontrados).
2. Rama, SHA de partida, SHA remoto publicado y control de ancestro.
3. Rutas añadidas/modificadas, dependencias eliminadas, invariantes protegidos.
4. Evidencia RED→GREEN y contratos positivos/negativos; pruebas exactas en CI.
5. Enlace a corrida CI completada; preview **matching SHA** en estado READY y lo que se probó efectivamente; Android físico por separado.
6. Funciones aún pendientes, desviaciones de la referencia y riesgos.
7. Protocolo reproducible de recuperación, próxima misión única y condición de salida.
8. Si se probó en Android, modelo/navegador y observación; no inventar pruebas humanas.

Nunca finalizar un checkpoint en el chat sin escribir `STEP_NN_HANDOFF.md` y actualizar esta tabla.
