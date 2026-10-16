# ATRIA 5.0 — C09.a — Vega contesta dentro del chat global sin ejecutar acciones

## Identidad
- Repositorio `javierdario48-star/ATRIA`, rama exclusiva `atria-5.0-core-rebuild-experimental`.
- Base C05.e del barrido `e7f75bd1b1cd22a176b1b9a3b35871f166db199c`; CI [38860570446](https://github.com/javierdario48-star/ATRIA/actions/runs/38860570446) success 3/3.
- Nuevo código/QA de Vega hasta `3bb63ed97bb25168566d6c22e5f7fd30917e9cff` (antes de esta documentación); la última prueba de navegador publicada justo antes fue `4b9d47c8f15db4ced77002625e518093226001a8`. Confirmar HEAD remoto de nuevo.
- [CI del SHA íntegro de Vega](https://github.com/javierdario48-star/ATRIA/actions/runs/38861406394). Comprobar resultado final 3/3; no confundir el trabajo de test del núcleo con CI global ni con Android físico.

## Comportamiento realmente implementado

1. `src/v5/clinical/vega-guidance.js`: solo política de orientación, **sin ejecución clínica**, para paciente/caso caracterizado. Ante preguntas directas detecta brechas documentadas (signos aún no medidos, examen pendiente, anamnesis, resultados faltantes, intervenciones en preparación, reevaluación, diagnóstico/destino) y devuelve una pista progresiva. No crea medicaciones, resultados, diagnóstico ni cambios de estado. Si se le pide una administración, señala que hay que utilizar Enfermería.
2. `src/v5/core/room-authority.js`: nuevo callback OPCIONAL `respondNpc` llamado exclusivamente para mensajes de destinatario Vega; adjunta la respuesta **inmutable en el mismo evento `chat.posted`**. Esto conserva deduplicación por mensaje, roles, revisión y único historial. No añade bus de chat, scheduler ni privilegios sobre la autoridad. Una falla de tutor no pierde el mensaje original del usuario.
3. `src/v5/clinical/guard-session.js`: pasa al callback el estado del paciente bajo su UID autorizado y formatea la respuesta guardada como fila `Dr. Vega`, `role=mentor` en `messages()`. No se recalcula el texto al cambiar la fisiología, ni se almacenan respuestas en un segundo transcript.
4. `src/v5/clinical/guard-session.test.js`: misma voz global en Solitario y Aprendiz, un solo mensaje + respuesta, reintento de id sin duplicar, paciente/casos idénticos antes/después de la consulta.
5. `qa/v5/patient-dialogue-browser.mjs`: bot de Chromium móvil exige que Vega responda al mensaje dirigido y que la consulta no haya provocado terapia.

## Error de integración corregido y evidencia

Una edición incorrecta truncó accidentalmente `src/v5/clinical/guard-session.js` durante C09.a, produciendo `SyntaxError: Unexpected end of input` en CI [38861299054](https://github.com/javierdario48-star/ATRIA/actions/runs/38861299054). **No se ocultó el fallo.** Se restauró el archivo completo de 7.192 bytes desde el SHA íntegro `dbfdd08d3ce91cc159cff8c9615767fe3c690da4`, se rehicieron únicamente tres integraciones y se publicó `3bb63ed97bb25168566d6c22e5f7fd30917e9cff`. Verificar la CI corregida. No se usó ningún parche HTML en V5; el defecto fue edición incompleta del archivo fuente.

## Alcance pendiente de C09

- Esto es C09.a, **NO C09 completo**: no se migraron aún toda la lógica de consulta/enseñanza de 4.8.7, el progreso de aprendizaje, la autonomía, el rescate crítico, la llegada/movimiento del Dr. Vega ni intervenciones docentes confirmadas por el puerto clínico.
- No simular procedimientos de Vega por un mensaje de texto; cualquier futuro rescate necesita evidencia clínica, estado del paciente, permisos y comprobante de ejecución real por la autoridad.
- El bot de la versión anterior `qa/vega-integrated-runtime-487.mjs` y `src/clinical/mentor-policy.js` son referencias, NO importados por esta función. Mantener la separación entre conversación global y motor clínico.
- Sin casos clínicos nuevos, sin abrir otra vista, sin modificaciones de mapa, cámara ni teclado.

## Siguiente ejecución

1. Confirmar SHA HEAD/CI/preview exactos (no asumir que el SHA documental fue validado junto al ejecutable).
2. C07/C08: caracterizar y migrar física de enfermería, órdenes compuestas, vías, monitor, fármacos, estudios y comprobantes con bot comparativo V4 y navegador real V5. No adelantar administración, no crear executor nuevo.
3. C09.b: contrastar Vega anterior en Aprendiz/Solitario; progresión docente y rescate crítico con reglas específicas y pruebas positivas/negativas.
4. C10 voz única sobre chat; C18 guardia continua; C20–C23 multijugador real 2–4 clientes con chat y clínica única.
5. Finalizar cada entrega con `STATUS.md`, `CURRENT_HANDOFF.md` y pruebas.

## Prompt autónomo de recuperación

> Retoma ATRIA 5.0 en GitHub `javierdario48-star/ATRIA`, rama `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/{CURRENT_HANDOFF,STATUS,STEP_05E_HANDOFF,STEP_09A_HANDOFF}.md`. Verifica SHA y CI antes de editar. El ECG ahora usa un historial de 4,5 s / 125 Hz y no reescribe complejos al cambiar FC. Vega C09.a contesta una sola vez dentro del evento autorizado del chat global, sin tratamiento ni alteración clínica; su tutor avanzado está pendiente. El gate `scripts/audit-v5-boundary.mjs` impide parches HTML y múltiples bucles. Conserva CIRR/APP y no añadas casos. Continúa C07/C08 y C09 completo con bots originales como referencia, no reutilizando scripts parcheadores. Reporta CI 3/3, preview matching SHA, límites y prompt de siguiente checkpoint.
