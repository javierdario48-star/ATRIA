# ATRIA 5.0 — C08.b3 — reparación de acceso venoso y confirmaciones clínicas

## Reproducción real aportada por Android
Capturas de la guardia Solitario muestran una enfermera desplazándose y posteriormente el mensaje «iv: sin confirmación de resultado» para `enfermera vias` / `enfermera via`, y «Esta intervención todavía no está habilitada en la versión experimental» para `enfermera ringer`.

El motor de V5 autorizaba un trayecto de enfermería con `procedure.request/iv`, pero **solo APP** tenía ejecución IV; `createCirrCare` devolvía `clinical-action-not-migrated` aunque el NPC llegara. `guard-session.messages` representaba cualquier rechazo tardío simplemente como «sin confirmación», ocultando el motivo. Ringer (`fluid`) se reconoce como terapia genérica del catálogo, pero no posee regla de administración específica para CIRR: no se debe generar una terapia o alteración hemodinámica ficticia.

## Solución mínima
1. `src/v5/clinical/observations.js`: `executeVenousAccess` implementa **una** acción de colocación periférica compartida, vinculada al UID/eventId. Mantiene cantidad documentada 1/2, idempotencia y comprobante nativo. No es una intervención farmacológica ni aporta efectos a la fisiología.
2. `src/v5/clinical/{app-care,cirr-care}.js`: ambos casos invocan el procedimiento común desde su único ejecutor, después de observaciones. Se eliminó el bloque IV duplicado de APP. CIRR inicializa explícitamente `venousAccessCount:0`.
3. `src/v5/clinical/guard-session.js`: órdenes IV ya cumplidas (cantidad suficiente) recuperan el comprobante sin mandar otro NPC a caminar. La preparación y los viajes siguen perteneciendo a `nurse-dispatcher` y `care.execute`.
4. El historial de conversación explica rechazos con motivos concretos y distingue `rejected` de `unconfirmed`; el texto de Ringer en CIRR dice que no existe una regla validada para ese caso. Conserva la respuesta humana de `history.ask`, que no debe tratarse como error de enfermería.
5. No se añadieron nuevas enfermedades, tratamientos circulatorios, reglas de oxigenación, bucles, listeners ni parches HTML.

## QA
- `src/v5/clinical/physical-nursing.test.js`: reproducción literal `enfermera vias` en CIRR: pendiente antes de llegar, **dos accesos** después, recibo UID/eventId exacto, mensaje «acceso venoso periférico confirmado». `enfermera via` repetido conserva las dos vías sin desplazamiento nuevo. `enfermera ringer` en CIRR se rechaza sin introducir `fluid` y muestra causa comprensible.
- `qa/v5/cirr-browser.mjs`: bot desde la UI pública de Chromium móvil reproduce las tres frases tras caminar a B1; comprueba presencia, idempotencia y mensaje. Mantiene la batería de casos, cierre y XP.
- `src/v5/clinical/patient-dialogue.test.js` mantiene su contrato: anamnesis desconocida produce respuesta de paciente, no «No ejecutado».
- Verificar `npm run test:v5`, QA Chromium y regresión histórica completa en [GitHub Actions](https://github.com/javierdario48-star/ATRIA/actions). No declarar éxito de un run en progreso. Android físico de nueva preview aún necesita prueba del usuario.

## Límite y próximo checkpoint
`fluid` está caracterizado para APP-001; no se convierte automáticamente en una terapia de CIRR-001. Para migrar medicaciones de forma universal habrá que definir indicaciones, dosis/vías, evolución fisiológica, verificaciones de seguridad y permisos *específicos de cada caso*, no efectos «genéricos». C07 debe ampliar el protocolo único de enfermería (IV automático y órdenes fuera de secuencia, oxígeno con datos clínicos reales), evitando un nuevo parser.

## Recuperación para otro agente
Continuá `javierdario48-star/ATRIA`, rama exclusiva `atria-5.0-core-rebuild-experimental`. Leer `docs/migration/{CURRENT_HANDOFF,STATUS,STEP_08B3_HANDOFF}.md`, verificar HEAD, CI y preview cuyo SHA coincida. Reparado el IV de CIRR y mensajes de enfermería sin segundo ejecutor. **No** confundir rechazo clínico de Ringer en CIRR con un error de camino. Conservar monitor ECG, cámara, teclado, CIRR/APP, chat único, intervención real tras llegada, farmacología nativa y XP. Continuar C07/C08 sin agregar casos, registrar informe y pruebas reales.
