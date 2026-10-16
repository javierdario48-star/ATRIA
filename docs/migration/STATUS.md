# ATRIA 5.0 — Registro de checkpoints y continuidad

**Plan vinculante:** [ATRIA_50_MIGRATION_MASTER_PLAN.md](../ATRIA_50_MIGRATION_MASTER_PLAN.md).
**Rama de ejecución única:** `atria-5.0-core-rebuild-experimental`. No escribir `main`, producción o `vendor/atria-4.8.6/**`.
**Recuperación C3a antes del primer merge:** `atria-5.0-recovery-before-approved-ui` @ `646a0ab3f19991ce4e4c4239760db6bfb17c18a1`.
**Interfaz aprobada y congelada para comparación:** `atria-5.0-compact-keyboard-preview` @ `0b36884fa4a879d49c588fa8f3f262a535dd3070`.
**C01 — Consolidación:** fast-forward no forzado de `646a0ab` a `0b36884`, por compare 29 ahead/0 behind y lease de SHA anterior; código fuente CI 38836248252, 3/3 success. Informe [STEP_01_HANDOFF.md](STEP_01_HANDOFF.md). Los commits posteriores son documentación; consultar HEAD de rama antes de reanudar.
**C02–C25:** PENDIENTES. No se han certificado ni empezado como implementación V5 por este checkpoint.

## Tabla de etapas

| Paso | Objetivo | Estado |
| --- | --- | --- |
| C01 | Consolidación de UI aprobada y estabilización | IMPLEMENTADO — CI fuente verde |
| C02 | Matriz exhaustiva de paridad del legado | PENDIENTE |
| C03 | Portada, menú, perfil, HUD | PENDIENTE |
| C04 | Examen físico original por segmentos | PENDIENTE |
| C05 | Historia, monitor, estudios, paneles | PENDIENTE |
| C06 | Diálogo y anamnesis de pacientes | PENDIENTE |
| C07 | Parser/órdenes combinadas enfermería | PENDIENTE |
| C08 | Enfermería física y administración nativa | PENDIENTE |
| C09 | Vega y tutor Aprendiz | PENDIENTE |
| C10 | Voz sobre comandos únicos | PENDIENTE |
| C11 | Tratamiento y farmacología transversal | PENDIENTE |
| C12 | Fisiología, complicaciones y rescate | PENDIENTE |
| C13 | Casos PANC/CROHN/COLON | PENDIENTE |
| C14 | Casos HDA/ILEO | PENDIENTE |
| C15 | Casos CHOLE/CHOLANG | PENDIENTE |
| C16 | Caso MESI | PENDIENTE |
| C17 | Tres peritonitis PBE/SEC/TER | PENDIENTE |
| C18 | Guardia continua multi-paciente | PENDIENTE |
| C19 | Carrera, niveles, XP, persistencia | PENDIENTE |
| C20 | Lobby social, amigos, salas | PENDIENTE |
| C21 | Chat global, remotos, reconexión | PENDIENTE |
| C22 | Cooperativo 2–4 clientes | PENDIENTE |
| C23 | Competitivo 2–4 clientes | PENDIENTE |
| C24 | Optimización y Android/iOS físico | PENDIENTE |
| C25 | Paridad, limpieza y promoción aprobada | PENDIENTE |

## Próxima acción autorizable

**C02:** hacer caracterización funcional profunda del original, crear matriz de equivalencia y registrar evidencias y prioridades. No intentar C03/C04 en paralelo sin contrato de C02. Mantener intactos CIRR/APP, teclado y cámara. Para cambio visible, pedir aceptación humana.

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
