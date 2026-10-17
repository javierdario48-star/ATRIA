# ATRIA 5.0 — Auditoría ejecutable del legado 4.8.7 (C12.h)

Fecha 2026-10-17. Branch exclusiva: atria-5.0-core-rebuild-experimental. No se cambia V4.8.7, main ni golden master.

## Regla de arquitectura

**V5 no vuelve a diseñar los sistemas clínicos de V4 que ya funcionan.** La fuente es el ejecutable viejo GENERADO por apply-487.js en su orden de scripts, junto a sus pruebas de referencia; no el golden master sin parches y tampoco el experimental B1 en sombra. Migrar funciones puras o aislar cálculos detrás de interfaces explícitas. V5 conserva su propio mapa, editor, UI, autoridad por paciente, enfermera física, recibos y scheduler. NO volver a introducir parches sobre HTML generado, eval, timers duplicados, motores clínicos paralelos o dos escritores de signos vitales.

## Cobertura real ejecutada del V4

| Área | Evidencia y resultado | Qué reutilizar |
| --- | --- | --- |
| Interfaz antigua | 2 Chromium independientes, desktop + Pixel emulado; 12 estados de pantalla; 54 controles visibles únicos inventariados; se abrieron seis menús: Acciones, Impresión diagnóstica, Recepción, Menú, chat y Perfil. Entrada, chat con botón, selección de guardia y paciente, enfermera y negación pasan. No hubo errores JS | Comportamientos de botones y estructura de navegación; no copiar CSS/HTML íntegros |
| Enfermería compuesta | 421 de 421 combinaciones/negaciones en regresión histórica. Flujo original desde chat hasta recibo. Browser G: 3/3 escenarios, 2 usuarios, vías x2 + monitor + oxígeno + Ringer y dos rondas independientes de antibióticos | Scanner nurse-scanner-487.js y semántica de ejecución; V5 mantiene cola física propia |
| Chat / contexto | Browser F: 6/6 con 2 usuarios: foco de borrador, pérdida de respuesta y reintento, chat global único, preguntas del invitado al paciente, NPC | Semántica original de chat único y destinatario contextual. No replicar parches de red |
| Competitivo | Browser I: 1/1 con 3 usuarios independientes, un dueño para el paciente y cero administraciones del observador | Regla de propiedad por paciente; V5 implementa autorización y replicación |
| 13 casos y atención | Dos rutas por caso (26). En la VM clínica antigua, 59/59 administraciones confirmadas y 26 destinos elegidos | Planes de cuidado y caso/destino reales desde clinical-care-journeys-487.js |
| Farmacología general | 30 tratamientos x 13 semillas = 390 pares en matriz de indicación y riesgo | Registro antiguo, casos, formulaciones y mecanismos con efectos verificados |
| Tratamiento equivocado | 39 bots: 13/13 heparina con hemorragia y 13/13 alergia grave con daño medible; 2 de los 5 escenarios de furosemida en hipovolemia no produjeron daño medible | Reutilizar mecanismos con efecto real; resolver las dos fallas sin ocultarlas |
| Cierre/XP | 131 recorridos ejecutando finalizador antiguo: 42 correctos con XP único y 89 rechazados; mínima atención y sobreestudio distinguidos | csEvaluateClosure487, csClosureQuality487, política de destino y puntuación |
| Tres peritonitis | Contrato de cierre distinto del de otros 10 casos | Mantener su motor y requisitos propios |
| Gracia/rescate | Gracia 180–480 s; ventana finita de rescate 65 s corregida en V4.8.7 | Políticas puras de grace-survival-487 y critical-rescue-487, ya parcialmente en V5 |
| Visual del resultado y muerte | Motor de finalización probado en VM pero la fixture sustituye csFinishHTML y csShowOutcome por stubs | FALTA paridad visual probada en navegador: no afirmar que el cuadro original fue validado pixel a pixel |

Evidencia de navegador real: https://github.com/javierdario48-star/ATRIA/actions/runs/39049167510 . Pruebas F/G/I completadas satisfactoriamente para esos escenarios. Los 54 controles son un INVENTARIO; NO se pulsaron los 54 ni sus combinaciones y esto permanece como cobertura pendiente.

IMPORTANTE: La fixture qa/care-journeys-487.mjs deliberadamente impide finishCase y omite algunas consultas: por eso los 26 recorridos administran 59 tratamientos y seleccionan destino pero 0 finalizan allí. Esto NO significa que el juego no sepa cerrar: el test separado qa/closure-xp-combinatorial-487.mjs hace los 131 escenarios del FINALIZADOR NATIVO, y 42 cierran.

## Causa exacta de 8 dosis de 500ml sin cambios visibles

Test realizado contra ambos ejecutables efectivos: qa/v5/fluid-eight-bolus-comparison.mjs. Son 8 nuevas órdenes independientes, recibos reales (NO flags), ambos casos, con/sin monitor.

| Caso / motor | PA sistólica después del 1.er bolo | 5.º bolo | 8.º bolo | SpO2 en 8.º bolo (21,6 s reales) |
| --- | ---: | ---: | ---: | ---: |
| APP-001 V4 efectivo | 125.230 | 131.891 | 134.575 | 94.904 |
| APP-001 V5 | 125.215 | 131.889 | 131.995 | 94.909 |
| CIRR-001 V4 efectivo | 115.230 | 121.891 | 124.575 | 92.904 |
| CIRR-001 V5 | **108.000** | **108.000** | **108.000** | 92.909 |

Iniciales: APP 118 mmHg / SpO2 98%; CIRR 108 mmHg / SpO2 96%. Los dos motores registran correctamente los 8 x 500ml. NO es un bug de repetición de orden ni de falta de recibo en el V5 local probado.

Causa: native-app.js concede +14 de PA sistólica, +7 diastólica y -12 de FC si existe al menos UN tratamiento fluid; no usa cantidad/volemia/tiempo para el beneficio. En native-cirr.js ni siquiera hay respuesta circulatoria al fluid; sólo toxicidad. crystalloid-overload.js usa 2800 ml de umbral: los primeros 5 bolos no modifican SpO2, y la penalización respiratoria comienza después. El monitor refleja variaciones sólo estando conectado o luego de volver a medir /signos. Resultado: al jugador le parece no pasar nada aun cuando los 8 recibos estén bien.

El V4 antiguo también da +17.6mmHg sistólica al CIRR estable con 4L sin contextualizar volemia; esto puede ser un ERROR CLÍNICO del antiguo y no debe importarse para fabricar una equivalencia numérica. El objetivo correcto es recuperar respuesta dinámica a volumen, enfermedad, perfusión y tiempo con las protecciones revisadas.

## Qué efectivamente está en V5

| Área | V5 comprobado | Brecha |
| --- | --- | --- |
| Mapa/sprites/cámara/movimiento | Sí, conservar | Ninguna reconstrucción del hospital |
| Chat, teclado ATRIA, ventanas, exam anatómico, historia y estudios | Sí para APP/CIRR | Extender a toda la clínica antigua |
| Enfermería de cabecera, vías, monitor, oxígeno y combinadas | Sí para APP/CIRR, con tiempos y UID | Completar tratamientos originales sin paralelizar |
| Fisiología | Dos modelos nativos simplificados y offsets (más progresión APP añadida) | Ausentes estado efectivo de volemia, tercer espacio, reserva renal, procesos inflamatorios/estrés y regulación dinámica del modelo viejo |
| Tratamientos administrables | 4 IV: fluid, ceftriaxone, metronidazole, furosemide; algunas conductas caso-específicas | Registro de 30 está disponible, pero NO ejecutor clínico de 30 |
| Casos completos | APP-001 y CIRR-001 | Otros **11 casos no tienen care executor** aunque estén definidos en JSON |
| XP y derivación | Evaluador puro de V4 reutilizado; cierre en quirófano APP, sala/observación CIRR; mini tabla adaptada | Faltan 11 destinos y toda paridad de fin de turno y muerte visual |
| Gracia y rescate | Políticas puras V4 reutilizadas | Dependen del reloj y evolución real |
| Social/multiplayer | Núcleo relay HTTP/2-4 probado; autorización/UID | Coop/Competitivo y lobby social de V5 no son aún un gameplay completo, a diferencia del V4 |
| Reloj | 0.12 minutos nativos/segundo real | Regla anunciada de 24h por 24min todavía no corresponde; no cambiar sin revisar fármacos/estudios/gracia |

## Qué no debemos traer desde V4

- El experimental B1 para Ringer: auditoría independiente encontró partición intersticial inmediata 25/75, penalización respiratoria atribuida al volumen incluso con hipovolemia y ausencia de eliminación/redistribución. Fuente qa/ATRIA_487_RINGER_INDEPENDENT_CLINICAL_AUDIT.md.
- Parches que reemplazan funciones al construir HTML y wrappers posteriores que pueden anular el rescate. Fuente qa/ATRIA_487_RESCUE_OWNERSHIP_RESULTS.md (V4 tuvo un override que impedía iniciar la ventana de 65s, luego corregido).
- Fisiología con múltiples escritores sobre volumen, gravedad y signos en el mismo tick sin contrato único. Fuente qa/ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md.
- Medicar por una mera orden pendiente, dar crédito por estudio solicitado no completado, repetir XP por reabrir pantalla o confundir consulta quirúrgica con cirugía ejecutada.
- Agregar daño renal instantáneo por «equivocación» sin fisiología validada; hay dos escenarios adversariales V4 de diurético aún sin efecto medible.

## Prioridad arquitectónica para continuar

1. **Preservar V5 que ya funciona.** No rediseñar menús, teclado, animaciones, enfermería física ni validadores existentes.
2. **Migrar el núcleo clínico efectivo del legado como MÓDULO V5 de propietario único**, empezando por el vector de fisiología: volumen efectivo, pérdidas/tercer espacio, estrés, reserva renal, inflamación, fisiología inmediata/temporal y seguridad. Leer los handlers originales y el orden real de wrappers; extraer efectos confiables, no trasladar directamente B1 en sombra. Guard-session sólo coordina.
3. **Reproducir el caso de los ocho bolos**: 0/500/1000/.../4000 ml con monitor conectado y sin él, euvolemia/hipovolemia y casos con shock. Preservar efectos correctos del viejo y corregir respuestas injustificadas en paciente estable. No cambiar la política de muerte sólo para hacer visible daño.
4. **Reutilizar un ejecutor farmacológico común para los 30 tratamientos** desde general-therapy-487, farmacología de V4 y catálogo/recibos V5; solo overrides declarativos por caso, no 30 x 13 bifurcaciones.
5. **Migrar los otros 11 casos SIN inventarlos**, con estudios, examen, tratamiento, consulta/destino y finalizador reales. Conservar motor distinto de los 3 de peritonitis.
6. **Comparar resultado de muerte y mini tabla visual real en navegador**. Conservar V4 quality y XP único; pantalla V5 usa estilos propios.
7. **Reconectar social del juego nuevo** manteniendo semántica probada F/G/I del antiguo; probar adicionalmente 4 clientes, desconexión, reconexión, simultaneidad, permisos y un único motor clínico compartido.
8. **Revisar reloj y dependencias**, después de fijar motor: medicamentos y estudios deben utilizar un solo tiempo coherente, ventana gracia/rescate conserva sus segundos reales.

## Condiciones para afirmar paridad clínica completa

- 13 casos realmente ejecutables con cierre propio (no sólo seleccionables).
- 30 tratamientos clasificados como administrables/rechazados/revisión con mecanismos probados, 390 perfiles y excepciones.
- 26 caminos estándar/alternativos probados EN NAVEGADOR hasta cierre verdadero, sin workup inventado.
- 421 combinaciones de enfermería, 131 XP/cierres y 39 tratamientos adversariales con 2 discrepancias de diurético resueltas o marcadas.
- Revisión por botones del antiguo: 54 controles enumerados en 12 estados, no asumir que todos fueron clicados.
- V4 vs V5 trayectorias de enfermedad/medicamentos en tiempo correcto; las diferencias clínicas de V4 se justifican y corrigen, no se copian.
- Muerte y scorecard original verificados visualmente; coop/compet 2/3/4 clientes y móvil físico.
- CI V5/legado verdes y árbol antiguo intacto.

Runbook: revisar primero qa/ATRIA_487_FULL_CASE_JOURNEYS.md, qa/ATRIA_487_MINIMUM_HANDOFF_AND_GRADED_XP.md, qa/ATRIA_487_PHYSIOLOGY_TRANSITION_RESULTS.md, qa/ATRIA_487_RINGER_INDEPENDENT_CLINICAL_AUDIT.md y este informe, ANTES de escribir código. Nunca reconstruir funciones existentes por desconocer dónde están.
