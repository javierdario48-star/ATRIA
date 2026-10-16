# ATRIA 5.0 — C07.e: órdenes combinadas reales y comprobantes independientes

## Certificación posterior al checkpoint

**CI definitiva del ejecutable C07.e/C08.d:** [38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507) **completed/success 3/3**, commit `d32440a657537dce81288791ce0ebf847eb47d05`. Núcleo **206/206 V5 + 39/39 core**, navegador completo Chromium móvil y regresión histórica V4 aprobados. Los commits siguientes hasta el presente handoff solo son documentales. Sin preview READY matching comprobada; Android físico no probado.

Esta actualización sustituye las advertencias de CI pendiente que figuraban al redactar el informe inicialmente. Los antiguos resultados RED se mantienen como trazabilidad; no representan fallos abiertos del ejecutable verificado.

## Identidad y recuperación
- GitHub: `javierdario48-star/ATRIA`, **escribir exclusivamente** `atria-5.0-core-rebuild-experimental`.
- HEAD inicial verificado: `9995fd34e8e3d051a546a8bded2879708378075f`, CI [38973439498](https://github.com/javierdario48-star/ATRIA/actions/runs/38973439498) **3/3 success**.
- Último código QA de esta sesión (incluye C08.d): `d32440a657537dce81288791ce0ebf847eb47d05`. Último cambio en el bot de órdenes compuestas: `00c693afa7cb3ea2c1cb19b4e985a843ba95bbad`.
- CI más reciente del código completo: [38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507), **no completada al documentar**. No anunciar 3/3 hasta leer cada job.
- Preview matching SHA actual: **no comprobada**; Vercel informó 402 cuota de despliegues en C08.c. Android físico **no probado**.

## Implementación real
Sin alterar el scanner `src/clinical/nurse-scanner-487.js`, el mismo plan de dependencias `nursing-access-plan.js`, la autoridad `room-authority.js`, el puerto `native-clinical-port.js`, ni el mundo aprobado, se añadieron **dos recorridos positivos y aserciones negativas** en `src/v5/clinical/physical-nursing.test.js`:
1. `Enfermera oxigeno 4 L/min, monitor, dos vias, Ringer 500 ml y ceftriaxona 1 g` produce cinco acciones con recibos independientes, vías antes de fármaco IV, comprobación de llegada por cama y relojes de preparación nativos. No mueve `liveVitals.spo2` por oxígeno; APP conserva solo su propia respuesta al volumen.
2. Oxígeno ordenado por separado mientras otro comando requiere vía automática y dos antibióticos; una sola vía, oxígeno físico y antibióticos con sus propios eventos y doses. Repetir el mismo ID de orden no duplica administraciones.

El bot de UI `qa/v5/hospital-interactions-browser.mjs` ejercita desde la pantalla del monitor una indicación conjunta `oxigeno 4 L/min y una via`. Evita aserciones de instante arbitrario: distintas enfermeras pueden completar una tarea entre `click` y lectura DOM. En cambio exige `chat.posted` pendiente original y `clinical.completed` con eventId/UID exacto para cada intervención que ya aparezca terminada.

## RED y correcciones
- [38976155735](https://github.com/javierdario48-star/ATRIA/actions/runs/38976155735): núcleo verde, bot navegador falló al afirmar que `monitorOrderFeedback` debía actualizarse sin esperar el mensaje; error de sincronización de prueba.
- [38976327543](https://github.com/javierdario48-star/ATRIA/actions/runs/38976327543): comprobó que una vía legítimamente completada podía existir antes del snapshot; corregido para exigir comprobante en lugar de cero vías.
- [38976481986](https://github.com/javierdario48-star/ATRIA/actions/runs/38976481986): lo mismo para oxígeno, que también puede llegar antes de la lectura del navegador. Ajustado con comprobante propio, nunca relajando exigencia de llegada o moviendo relojes.
- Todos los tres son **RED de nueva aserción E2E**, no evidencia de administración prematura del motor. `npm run test:v5` pasó en esos SHA; aun así no confundir verde local del núcleo con CI completa.

## Archivos modificados
- `src/v5/clinical/physical-nursing.test.js` — pruebas de combinación y concurrencia.
- `qa/v5/hospital-interactions-browser.mjs` — bot móvil de orden física compuesta y recibos por acción.
- `docs/migration/STATUS.md`, `CURRENT_HANDOFF.md`, `STEP_07E_HANDOFF.md` — transferencia.

## Riesgos y siguiente bloque
No añadir parser nuevo ni tratar un comando reconocido como medicación administrada. C07/C08 siguen PARCIALES: ambigüedad farmacológica, cancelación y duplicación de órdenes distintas, seguridad de indicación por caso, procedimientos y varios pacientes. Conservar C07.c oscilación solo visual, C07.d vías automáticas, C08.c oxígeno sin respuesta falsa a la SpO₂.

## Prompt para otro ChatGPT
> Continúa ATRIA 5.0 en GitHub `javierdario48-star/ATRIA` rama `atria-5.0-core-rebuild-experimental`. Relee HEAD y `docs/migration/{STATUS,CURRENT_HANDOFF,STEP_07E_HANDOFF,STEP_08D_HANDOFF,STEP_08C_HANDOFF,STEP_07D_HANDOFF}.md`. Código último `d32440a657537dce81288791ce0ebf847eb47d05`. Confirma resultado real [CI 38976811507](https://github.com/javierdario48-star/ATRIA/actions/runs/38976811507) y corrige cualquier RED verídico sin reducir pruebas. C07.e integra pruebas de cinco tareas y dos comandos concurrentes con comprobantes clínicos/nursing reales; bots leen eventId/UID y no infieren que tiempos de UI son barreras de ejecución. Sigue depurando C07/C08, sin agregar casos, motores, buses, RAF ni cambiar mapa o teclado. Publica SHA y handoff.
