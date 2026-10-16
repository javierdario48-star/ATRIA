# ATRIA 5.0 — C07.c + C05.f — seguimiento clínico e instrumentación dinámica del monitor

## Recuperación
- Repo: `javierdario48-star/ATRIA`; **única rama de escritura** `atria-5.0-core-rebuild-experimental`.
- HEAD remoto funcional/test **antes de los informes**: `d9b03b106101a915340cd6276eaf7e7462158245`. Base de arranque `5f550831441bfcf8b4cd1342dc3d832da82ba6e8` (CI [38944464447](https://github.com/javierdario48-star/ATRIA/actions/runs/38944464447) completed/success 3/3).
- CI del SHA funcional C07.c/C05.f: [38961269636](https://github.com/javierdario48-star/ATRIA/actions/runs/38961269636). **Comprobar el resultado final 3/3** antes de declararla certificada. La versión del informe inicial se creó mientras navegador/regresión histórica seguían en curso.
- Los siguientes commits documentales tendrán SHAs diferentes; deben contener únicamente `docs/migration/**`. No atribuir una CI anterior a código no verificado.
- Preview Android: verificar Vercel por SHA matching READY. Chromium de CI emula móvil, NO certifica Android físico.

## Incidente reproducido por el usuario
En monitor B1, después de ordenar metronidazol se veía indefinidamente «Orden recibida; intervención aún pendiente» aunque el medicamento terminara administrándose. Tampoco existía un historial propio dentro del monitor de lo recibido; FC/FR/PA permanecían artificialmente idénticas cuando el caso estaba estable.

## Implementación
1. **Nuevo** `src/v5/ui/monitor-order-ledger.js` (más test): proyección de solo lectura sobre el historial `room.events` de **una sola autoridad** y sobre `patient.administrationLog`. Une cada intención al `clinical.completed` mediante UID, commandId y eventId **nativo**. El aviso pasa de pendiente a confirmado/rechazado sin temporizador, ejecutor ni contador UI. Para órdenes combinadas no se da éxito global si alguna acción quedó rechazada; los recibos tardíos de otro paciente nunca se mezclan.
2. `src/v5/ui/clinical-controller.js`: se actualiza automáticamente el aviso del buscador cuando se publica una confirmación clínica; incluye un `<details>` compacto **Historial de intervenciones y medicamentos** dentro del mismo modal de monitor. Los medicamentos efectivamente administrados se obtienen completos desde `administrationLog` (no desde una orden textual); el historial reciente muestra el estado de procedimientos, indicaciones y errores. Se conserva el buscador, pistas, teclado propio, ECG y todos los botones aprobados.
3. `src/v5/web/game.css`: presentación discretamente integrada al monitor existente. No se crearon nuevas pestañas ni modales.
4. **C05.f** `src/v5/clinical/observations.js`: `monitorMeasurement(p,clock)` aplica una oscilación determinista, suave y acotada **únicamente** a las lecturas del monitor conectado. Amplitud máxima: FC ±1,4 lpm; FR ±0,8 rpm; sistólica ±2 mmHg; diastólica ±1,2; SpO₂ ±0,32 %; T ±0,035 °C. Reutiliza el mismo reloj clínico y UID para reproducibilidad. El estado `liveVitals` del caso, la farmacología, el score y las mediciones puntuales/revaluaciones permanecen sin ruido añadido. Tras desconectar el monitor se congela la última lectura, sin generar mediciones falsas. El ECG simulado sigue leyendo la FC monitorizada.
5. **Avance siguiente C07.c**: `src/v5/ui/monitor-order-suggestions.js` reutiliza **una lista visual de cinco sugerencias compartidas** para los dos casos clínicos que ya tienen ejecución IV nativa: una/dos vías, Ringer 500 ml, ceftriaxona 1 g y metronidazol 500 mg. El formulario es exclusivo de búsqueda: la autoridad verifica todas las indicaciones, dosis, vías y recibos. No se añade ningún caso ni fármaco.

## QA y garantías
- **Nuevas** pruebas `src/v5/ui/monitor-order-ledger.test.js`: pendientes→terminal, orden combinada parcialmente rechazada, dos pacientes aislados y administración preservada aunque el chat rote sus últimos 300 eventos.
- **Nuevas** `src/v5/ui/monitor-order-suggestions.test.js`: autocomplete IV válido para APP/CIRR y no admisión clínica por sugerencias.
- **Extendidas** `src/v5/clinical/monitor.test.js`: amplitudes máximas por variable, invariantes de `liveVitals`, variación gradual y congelamiento en desconexión.
- **Actualizadas** `src/v5/ui/bedside-presentation.test.js`: los tests originales conservan la mejora hemodinámica exclusiva de APP y toleran exclusivamente el margen acotado de medición; ahora se reconoce el vocabulario IV compartido sin permitir otras medicaciones no validadas.
- **Actualizado** `qa/v5/hospital-interactions-browser.mjs`: monitor real, oscilaciones no causales, seguimiento de paracentesis pendiente→confirmada, historial de administración, rutas anatómicas y recepción de ECG. No reducir aserciones para ocultar defectos.
- Mantener `npm run test:v5`, Chromium, casos completos CIRR/APP, `npm test` histórico, auditoría de frontera V5 y CI [38961269636](https://github.com/javierdario48-star/ATRIA/actions/runs/38961269636).

## Pendientes y siguiente fase
- C07 no completo: automatización segura de acceso IV, órdenes con medicación antes de la vía, órdenes canceladas, combinaciones y estado global con varios pacientes.
- C11 no completo: farmacopea nativa con dosis, indicaciones, contraindicaciones, alergias, velocidad de infusión, efectos adversos y respuesta **específica** por enfermedad. Mantener CIRR sin mejorías de PA inventadas por Ringer; APP conserva su respuesta propia caracterizada.
- C08 no completo: oxígeno, resto de tratamientos y procedimientos físicos, comprobantes en red.
- C09 Vega tutor avanzado, C10 voz, C18 guardia multipaciente, C20–C23 lobby/red/coop/competitivo requieren migración efectiva y bots 2–4 clientes. No añadir 11 casos restantes.
- Monitor ECG es simulación educativa; no diagnostica arritmias ni supra-ST por amplitud de la presión/FC.
- Evitar imports `apply-487`, motores alternativos, segunda RAF, parches HTML o efecto clínico desde controles de UI.

## Prompt autónomo de recuperación
> Continuá ATRIA 5.0 en GitHub repo `javierdario48-star/ATRIA`, rama única `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/{CURRENT_HANDOFF,STATUS,STEP_07C_HANDOFF,STEP_11A_HANDOFF}.md`, recuperá último HEAD y su CI. El SHA **funcional** C07.c/C05.f era `d9b03b106101a915340cd6276eaf7e7462158245` antes de documentación. Monitor B1 ya muestra avance de órdenes desde eventos de la autoridad (no timers), historial completo de administraciones de `administrationLog`, y oscilación muy leve de lecturas monitorizadas que NO cambia `liveVitals` ni otros signos puntuales. Las opciones IV compartidas CIRR/APP tienen un solo autocompletado. Verificar CI 3/3 [38961269636](https://github.com/javierdario48-star/ATRIA/actions/runs/38961269636), preview Vercel matching SHA y prueba manual Android (pendiente). Continuar primero con C07/C08 automatismo venoso seguro y órdenes fuera de secuencia, luego farmacología individualizada C11.b, tutor Vega avanzado y los modos, **sin añadir casos**. Mantener motor clínico y autoridad únicos, probar todo, publicar SHA, CI y nuevo handoff.
