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
**CI histórica C04–C06:** [38848167010](https://github.com/javierdario48-star/ATRIA/actions/runs/38848167010),
completed/success **3/3**. 137 contratos V5, 39 core; examen 40, diálogo 20 y
monitor 16 comparaciones efectivas. UI Chromium móvil y cierres CIRR/APP aprobados.

**C08.c (16-10-2026):** código/QA remoto `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9`. Oxígeno nasal (2/4 L/min) ejecutado exclusivamente al llegar una enfermera al paciente: comprobante nativo de inicio/cambio/suspensión; sin modificar la fisiología de CIRR/APP. Ver [STEP_08C_HANDOFF.md](STEP_08C_HANDOFF.md). CI automática iniciada para el código: [38972668527](https://github.com/javierdario48-star/ATRIA/actions/runs/38972668527); **resultado aún pendiente de verificar**, no atribuirle 3/3 anticipadamente. La primera corrida [38972537246](https://github.com/javierdario48-star/ATRIA/actions/runs/38972537246) mostró dos errores detectados por pruebas nuevas (titulación prematura y máscara no validada); reparados en `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9`, por certificar. Sin preview matching confirmada ni prueba Android físico.

**C08.c — verificación posterior y última corrección visual, 16-10-2026.** El código C08.c con seguridad clínica y llegada espacial real `93d45c80a2dbaeeb9318c5bb601b7d7b300374c9` obtuvo CI **[38972668527](https://github.com/javierdario48-star/ATRIA/actions/runs/38972668527) completed/success 3/3**: 200/200 pruebas V5, 39/39 núcleo, Chromium móvil completo y regresión V4. Después se publicó el cambio **`1dda7350a81fa7337144ad294f37165f46c7094b`** (solo proyección/presentación del historial) para mostrar por separado `start`, `setRate` y `stop` de oxígeno como “Administrado”, “Flujo ajustado” y “Suspendido y confirmado”; sin modificaciones de ejecución clínica ni fisiología. CI exacta de este último código [38973192616](https://github.com/javierdario48-star/ATRIA/actions/runs/38973192616) **en ejecución al registrar esta nota**; requiere comprobación final antes de atribuirle 3/3. Vercel: comprobadas previews READY anteriores de `f3f65441` y `51bdf018`, ambas **anteriores a la corrección de titulación y validación**; el despliegue explícito del SHA corregido fue rechazado por `402 payment_required / api-deployments-free-per-day` (más de 100 despliegues diarios, `retryAfter=86400`). **No existe preview verificada matching el ejecutable corregido**. Sin prueba Android físico.

**Actualización C07.e/C08.d (16-10-2026):** último código funcional publicado `d32440a657537dce81288791ce0ebf847eb47d05`, CI exacta [38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507) **completed/success 3/3 verificada** (núcleo 206/206 V5 y 39/39 core, navegador Chromium y regresión V4). C07.e añadió evidencia de recorrido compuesto cinco tareas y concurrencia oxígeno + auto-IV/antibióticos; fallos RED anteriores del bot táctil resultaron de asumir que enfermeras distintas nunca llegan durante el muestreo UI, corregidos exigiendo recibos por evento. C08.d conecta `procedure.request/vitals` a la misma enfermería espacial y reconoce monitor ya conectado sin viaje repetido; no cambia `/signos`. Informes [STEP_07E_HANDOFF.md](STEP_07E_HANDOFF.md) y [STEP_08D_HANDOFF.md](STEP_08D_HANDOFF.md). Preview para el SHA no verificada, cuotas Vercel antes bloquearon; Android físico no probado.

**CI definitiva del ejecutable C07.e/C08.d:** [38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507) **completed/success 3/3**, commit `d32440a657537dce81288791ce0ebf847eb47d05`. Núcleo **206/206 V5 + 39/39 core**, navegador completo Chromium móvil y regresión histórica V4 aprobados. Los commits siguientes hasta el presente handoff solo son documentales. Sin preview READY matching comprobada; Android físico no probado.

**C11.b — prevalidación completa de órdenes farmacológicas compuestas (16-10-2026):** ejecutable `56fc352d4c2f0f95056834dd5c7eeed8632fed7f` publicado exclusivamente en `atria-5.0-core-rebuild-experimental`. Validación pura antes de la primera acción clínica, reutiliza `parseStandardIVDose`, `parseCirrDose`, `parseNasalOxygenFlow` y el listado de terapias implementadas por caso; rechazo `unsafe-compound-order` con feedback claro, cero tareas, recibos o efectos parciales. Incluye estado de oxígeno activo para `therapy.stop`; las órdenes simples mantienen sus causas nativas. Pruebas V5 de rechazo y éxito, autoridad, reintentos, móvil Chromium APP y V4 sin modificar. CI del ejecutable [38979412510](https://github.com/javierdario48-star/ATRIA/actions/runs/38979412510) **en ejecución al documentar**. Sin preview matching verificada ni prueba Android físico. [STEP_11B_HANDOFF.md](STEP_11B_HANDOFF.md).

## Principio rector de libertad clínica (aclaración del usuario, 16-10-2026)

ATRIA es un RPG de simulación médica con libertad para **equivocarse**: las decisiones clínicamente inapropiadas pero técnicamente ejecutables deben administrarse y producir las consecuencias físicas del paciente, incluidas complicaciones, rescate o muerte cuando estén sustentados por el modelo. No introducir bloqueos protectores basados solo en si la indicación es beneficiosa. Distinguir: (1) vía/dosis no implementada ≠ contraindicación médica; (2) reconocimiento ≠ administración; (3) replay del mismo ID ≠ orden nueva; (4) muerte debe seguir el motor fisiológico, no un interruptor ad hoc. C11.c implementa la distinción 3 y registra exposición real; **NO** implementa todavía sobredosis libre, fluid overload o muerte. [Handoff C11.c](STEP_11C_HANDOFF.md).

> **Nueva puerta de equivalencia clínica (16-10-2026):** antes de implementar C12 o nuevos casos, cumplir [CLINICAL_PARITY_GATE.md](CLINICAL_PARITY_GATE.md). Error detectado: reconstruir el sistema desde una muestra de dos casos y aceptar tests técnicos sin caracterizar la libertad terapéutica ni el comportamiento fatal del ejecutable V4.8.7 efectivo. Estado C11.c: núcleo V5 verde; reparación de regresión móvil publicada en `62f12407c4bfd2653ba435a37ef25a2ac321f6f2`; CI de navegador aún por comprobar. **Nunca** afirmar fisiología de daño, rescate o muerte en V5 hasta reproducir trayectorias frente al legado.

## Tabla de etapas

| Paso | Objetivo | Estado |
| --- | --- | --- |
| C01 | Consolidación de UI aprobada y estabilización | IMPLEMENTADO — CI fuente verde |
| C02 | Matriz de equivalencia e inventario del legado | COMPLETO — inventario, no certificación de paridad |
| C03 | Portada, menú, perfil, HUD | PENDIENTE |
| C04 | Examen físico original por segmentos | IMPLEMENTADO CIRR/APP — regiones, técnicas, Glasgow, UI; [informe](STEP_04_HANDOFF.md) |
| C05 | Historia, monitor, estudios, paneles | PARCIAL C05.a–f — ECG de 4,5 s/125 Hz, búsqueda de órdenes y **lecturas monitorizadas con oscilaciones pequeñas, acotadas y reproducibles**, separadas de fisiología/observación puntual. Faltan ECG diagnóstico y activación de arritmias mediante casos. [C05.e](STEP_05E_HANDOFF.md) · [C07.c/C05.f](STEP_07C_HANDOFF.md) |
| C06 | Diálogo y anamnesis de pacientes | PARCIAL C06.a — CIRR/APP, ALiCIA, contexto y antecedentes; [informe](STEP_06_HANDOFF.md) |
| C07 | Parser/órdenes combinadas enfermería | PARCIAL C07.a–e — acceso IV explícito/automático, formulaciones certificadas y combinaciones **oxígeno + monitor + vías + Ringer + ceftriaxona** o pedidos concurrentes oxígeno + antibióticos, con viajes/recibos/UID separados y sin dosificación doble por reintento. Cobertura Node y navegador móvil actualizada; falta paridad universal y contraindicaciones avanzadas. [C07.e](STEP_07E_HANDOFF.md) |
| C08 | Enfermería física y administración nativa | PARCIAL C08.a–d — vías, monitor, IV, tratamientos y oxígeno nasal por viaje físico; **toma de signos solicitada a enfermería también espera llegada**, con observación puntual y comprobante, sin conectar monitor ni alterar fisiología. `/signos` médico inmediato se conserva. Monitor conectado no envía otro NPC innecesariamente. [C08.d](STEP_08D_HANDOFF.md) · [C08.c](STEP_08C_HANDOFF.md) |
| C09 | Vega y tutor Aprendiz | PARCIAL C09.a — respuestas progresivas por el mismo chat global, sin administración ni motor paralelo. Docencia avanzada/rescate físico pendiente. [Informe](STEP_09A_HANDOFF.md) |
| C10 | Voz sobre comandos únicos | PENDIENTE |
| C11 | Tratamiento y farmacología transversal | PARCIAL C11.a–c — formulario IV, validación técnica del lote y **nuevas órdenes farmacológicas independientes que producen administraciones y recibos nuevos**, aun para la misma droga. Se distingue reintento de transporte de repetición médica intencional. Libertad clínica **NO** equivale a prohibir tratamientos peligrosos; todavía faltan dosis variables, catálogo y daños fisiológicos reales en C12. [C11.c](STEP_11C_HANDOFF.md) · [C11.b](STEP_11B_HANDOFF.md) · [C11.a](STEP_11A_HANDOFF.md) |
| C12 | Fisiología, complicaciones y rescate | PARCIAL C12.a **infraestructura causal sin efectos nuevos**: ejecución aislada del build legado V4 efectivo para APP/CIRR/PERI-SEC con Ringer 0/500/3000 ml, sin importar wrappers a V5; lectura pura `summarizeIVExposures` desde `administrationLog`, contabilizando bolos múltiples y descartando pedidos pendientes. Hay equivalencia de baseline y trayectoria sin tratar en APP/CIRR, y diferencias conocidas clasificadas. Deterioro inducido, progresión por enfermedad, rescate y muerte V5 siguen PENDIENTES. [C12.a](STEP_12A_HANDOFF.md) |
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
