# D1 — Impresión diagnóstica y derivación clínica original

17-10-2026. Base remota verificada: `b719162e1c2603202d6695c2dba98c732ce40755`; último ejecutable previo `26cc058a30485191749b6df485f2a5221c525676`. Rama única: `atria-5.0-core-rebuild-experimental`.

## Implementado

- Insignia flotante sobre el paciente activo; abre el editor con su UID y usa el acercamiento espacial existente. Guardar, borrar y reeditar modifican únicamente `patient.diagnosis` mediante la autoridad y el puerto originales. El mismo editor se conserva en la ficha. No hay otro reloj, RAF ni motor clínico.
- Autocompletado global reutilizando **sin cambios** `diagnostic-impression-487.js`: los 13 casos y sus sinónimos contribuyen al vocabulario. «Peritonitis» admite guardado como decisión médica, informa que es amplio y ofrece las variantes sin revelar la correcta. El componente contempla lectura sin edición; esto no certifica todavía el modo competitivo completo.
- Los botones de destino aparecen solamente cuando el evaluador original acepta **ese destino concreto**. No se ofrecen opciones deshabilitadas. La preparación de fármacos, la consulta pendiente, las tareas físicas de enfermería y la reevaluación posterior a cada intervención siguen siendo condiciones reales del mismo cierre.
- Aviso de enfermería al habilitarse destinos, publicado por la autoridad en el único historial de la guardia. Recalcular sin cambios no genera avisos repetidos. Cambiar una impresión o añadir una tarea puede retirar el destino; su elegibilidad se vuelve a comprobar al usarlo.
- Consulta quirúrgica compartida por APP/CIRR con el evaluador puro original `surgical-review-487.js`, sin importar wrappers HTML. Respuesta tras los **3500 ms reales originales**. Diagnóstico ausente/amplio/erróneo, examen incompleto y foco médico producen sus respuestas clínicas originales. Un rechazo permite un nuevo pedido corregido. Pedidos simultáneos comparten consulta y conservan recibos individuales; un reintento de transporte conserva su resultado original.
- La consulta completada lleva `accepted`, `status`, `reviewStatus`, `advice`, UID, evento original y momento real. Rechazo del especialista es una respuesta auténtica completada, no una aceptación ni una cirugía. La historia distingue aceptación, rechazo y espera.
- Aceptar la consulta no completa el tratamiento, estudios, reevaluación ni cierre. No se registra `surgery` o `source_control` como procedimiento realizado para permitir la derivación.
- Requisitos mínimos y calidad/XP siguen separados. Un recorrido real CIRR de calidad inferior a 70 habilita sala/observación y cierra con un solo premio de experiencia.

## Defectos reproducidos antes de corregir

1. APP aceptaba automáticamente Cirugía a los 1,5 s, incluso sin diagnóstico/examen. Se sustituyó esa aceptación por el evaluador efectivo y su espera original.
2. CIRR no podía obtener una respuesta clínica quirúrgica; ahora responde el evaluador médico original, sin aceptar un foco no quirúrgico.
3. No existía borrado por la autoridad ni impresión flotante con sugerencias globales.
4. La ficha mostraba todos sus destinos deshabilitados y evaluaba un destino por defecto para todos. Cada opción ahora depende de su evaluación propia.
5. La primera proyección nueva omitía enfermería en tránsito: podía ofrecer un cierre que el puerto rechazaba. Un test RED con mundo/enfermería espacial reales reproduce el caso; proyección, aviso y cierre comparten ahora el mismo gate físico.
6. Comparar el HTML serializado por el navegador con el texto fuente recreaba los botones durante actualizaciones idénticas. Se reutilizó `setHTML` para conservar el nodo, el foco y el objetivo del toque. La nueva regresión verifica también que un cambio clínico real sí actualice su texto.
7. La CI inicial `39073656775` completó APP/CIRR (100/100, 133 XP), pero el nuevo bot de diagnóstico copió un trayecto Pixel cuyo primer toque quedaba detrás del HUD en escritorio. Se corrigió **el recorrido del bot** con pasos cortos y una aserción de que cada toque cae en mapa expuesto; no se utiliza `force`, teletransporte ni mutación clínica. Ambas superficies y todas las comprobaciones diagnósticas siguen obligatorias en la CI siguiente.

## Evidencia y reproducción

- `npm run test:v5`: **385/385** local, frente a 374 en la base (384 en el primer commit D1, `b6d966e815bf7ca523f3deebb16f3ec05a6f44f4`).
- `npm run test:v5-core`: **40/40**; builds V5/core/antiguo y frontera arquitectónica aprobados localmente.
- `node qa/v5/characterize-surgery-native.mjs`: **6/6** escenarios comparados contra el runtime efectivo generado de 4.8.7, incluidos sus wrappers válidos en el orden real y su temporizador original. Coinciden estado, aceptación y texto clínico, sin procedimiento realizado ni cierre inventado. [Resultado y hashes originales](../evidence/d1/surgery-native-parity.json).
- Nuevas pruebas públicas de navegador en `qa/v5/diagnosis-browser.mjs` para escritorio/Pixel: impresión flotante, tres peritonitis, guardar/borrar/reeditar, Enter durante IME, rechazos y limpieza al salir.
- APP de navegador ahora demuestra rechazo sin diagnóstico, corrección en la insignia, nueva aceptación y destino flotante, conservando administración física, 100/100, 133 XP y ausencia de cirugía realizada. CIRR y las demás regresiones siguen habilitadas.
- CI completa, HTTP de 2/3/4 navegadores y preview del SHA: **pendientes de ejecución remota al publicar este commit**. No se declara probado un navegador local: falta el ejecutable Chromium. Android físico sigue sin probarse.

## Frontera y continuación

Este checkpoint recupera el flujo en los **dos ejecutores completos APP/CIRR**. No declara migrados los otros once casos ni el multijugador del producto. La aceptación precoz de Cirugía para PERI-SEC en shock permanece en el evaluador original; su integración jugable pertenece al siguiente ejecutor, no se simula aquí.

Continuar C2.c con albúmina, noradrenalina y transfusión en el circuito existente; corregir la interpretación de albúmina con g/kg y conservar mg/kg de anfotericina. Luego conectar la fisiología original de peritonitis y completar PERI-SEC, PBE y terciaria. Las dos discrepancias históricas de diuréticos siguen identificadas. Mantener el manual maestro como contrato.
