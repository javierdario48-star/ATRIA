# ATRIA 5.0 — Inventario maestro de requisitos

> **TRASPASO HISTÓRICO OPERATIVO (21/11/2026):** [Registro consolidado de los 88 IDs, errores de jugabilidad, diagrama de flujo RESP-01 V2, bots y HTML offline](ATRIA-5-REGISTRO-HISTORICO-JUGABILIDAD-V2-OFFLINE-2026-11-21.md). Este archivo sigue siendo **la única fuente mutable de estado por ID**. Los estados y porcentajes históricos más abajo requieren contraste con el SHA más reciente; nunca confundir «pendiente de aceptación» con «bug actual». Orden del creador: cerrar errores históricos → grafo clínico V2 → bots → HTML offline manual; conservar portabilidad a Vercel en 21 días.


> **Estado vigente de esta continuación, 21/11/2026:** conservar los **88 IDs históricos** y sus referencias originales. Último código `629a33ba2a529ade4c30c5501c25a6d23ead40e8`. El estado operativo de liberación y las pruebas nuevas están en [pendientes verificados](contracts/ATRIA-5-PENDIENTES-VERIFICADOS-2026-11-21.md) y el [informe permanente de cierre](contracts/ATRIA-5-CIERRE-RESP-01-V2-2026-11-21.md). Los recuentos/checkpoints inferiores son históricos; no invalidan estas evidencias posteriores.

| ID existente | Actualización verificada | Pendiente vigente |
| --- | --- | --- |
| XP-COOP / XP-01 / DX-REVEAL | Coste de pistas/revelación compartido entre activos; privacidad conservada. Alta/Observación y muerte causal mantienen cohorte y autor; la carrera local ya conecta ambas decisiones inseguras y no fusiona dos autores. | Aceptación con cuentas alojadas, deuda entre guardias y concurrencia. |
| CLOSE-01 / NUR-01 | Corregido cierre de Observación con Enfermería pendiente y bloqueo circular NEUR-03; paciente intacto y recuperación probados. | Validación física y receptor ciego aún abierto. |
| VEGA-COHERENCE-01 / VEGA-01 | Recorridos 55/55 aprobados en CI `44973637286`; NEUR-03 ya termina. | Latencia real y aceptación Android. |
| QA-03 | Traslados `44973637288`: 11/11 trabajos, 10 perfiles ×55 =550/550. CIRR distingue bruto/deuda; DIARR valida recibo de Observación. | Escenario CIRR de navegador corregido pendiente de CI final. |
| QA-01 | Regresión local 3210/3210 en `78f260f`; 14 pruebas dirigidas posteriores para carrera local. V2 40/40 y paridad 15 pares, 5/5 CI `44973929079`. | CI general `44974712154` y matriz longitudinal `44973637290` deben concluir; no confundirlos con pruebas ya aprobadas. |
| MED-01 / MED-02 | Contrato V2 y regresiones nativas de medicación/seguridad aprobados; PBE conserva daño renal y rescate medidos. | Aceptación externa; cobertura futura declarativa no certificada globalmente. |
| DEPLOY-01 / ANDROID-01 / ANDROID-02 / MP-01 / COMP-01 | Migración preparada +9/9 PostgreSQL local; build modular/frontera aprobados; CI multijugador previa conserva su evidencia. | Supabase staging accesible, deuda REST versionada, deployment exacto y Android físico. |

**RESP-01 V2 sigue NO GO:** recepción ciega no resuelta, staging/Preview/Android pendientes y CI general final aún sin aceptación. No se rehízo la auditoría histórica ni se añadieron requisitos duplicados. La aprobación original `44968933396` y la nueva `44973929079` se conservan como aprobaciones del alcance automatizado de contenido V2.

## Historial conservado

> **Estado operativo vigente (20–21/11/2026):** usar como índice y secuencia [ATRIA-5-EXECUTION-PLAN.md](ATRIA-5-EXECUTION-PLAN.md), sección «Dirección operativa actual». B0 de juego [30/30 CI verde](https://github.com/javierdario48-star/ATRIA/actions/runs/44856218209); [traslados verdes](https://github.com/javierdario48-star/ATRIA/actions/runs/44856218283). Matriz clínica aún sin conclusión al último control; preview real bloqueado por Vercel. **Ahora J1 plataforma de juego; casos individuales después en planilla C1.** Las notas históricas de B0 más abajo reflejan checkpoints anteriores y no reemplazan el estado operativo actual.


## B0 · Ajuste del harness de anamnesis de emergencia (CI pendiente)

El run `dcab2ac` [ATRIA 5 Experimental Game](https://github.com/javierdario48-star/ATRIA/actions/runs/44854297473) finalizó 29/30: test transversal `accepted-transfer.test.js:41` desactualizado para `PERI-PBE-001` (10 puntos de anamnesis por traslado urgente seguro frente a 0 exigidos), después de restaurar la regla V19. También [Clinical Transfers](https://github.com/javierdario48-star/ATRIA/actions/runs/44854297515) perdió solo `transfer-regressions` por ese mismo test; los 10 perfiles clínicos estaban verdes. [Commit `b3750a6`](https://github.com/javierdario48-star/ATRIA/commit/b3750a6c08605d70a6509cc57bcce5022a732ea1) actualiza **solo la aserción**, comprobando entrevista real vacía y manteniendo expectativa 0 en los otros cuatro casos. **QA-01 y B0 siguen sin aceptación completa** hasta [nueva CI core](https://github.com/javierdario48-star/ATRIA/actions/runs/44856218209) y [traslados](https://github.com/javierdario48-star/ATRIA/actions/runs/44856218283). No cambia el conteo ni el estado de los 88 ítems.


## B0 · Paridad histórica de peritonitis · corrección `dcab2ac` (aceptación CI pendiente)

En el [run 44850152584](https://github.com/javierdario48-star/ATRIA/actions/runs/44850152584), 29/30 jobs aprobaron; los 3.167 tests Node 22 no presentaron fallos ni cancelaciones y el competitivo de 4 jugadores aprobó. Falló **solo** la caracterización V19 `emergency-minimum/score` (74 V5 ≠ 84 nativo). Causa verificada: falta aplicar el mínimo histórico de `history:10` tras derivación urgente segura; la fuente original `src/integration/peritonitis-487.js` hace `b.history=Math.max(b.history||0,10)`. La modificación mínima `dcab2ac` incorpora exclusivamente ese piso en `safeHandoff`, con expectativa física determinista corregida. Test **aislado de la función real** contra cinco escenarios históricos: 5/5 desgloses correctos (84/87/95/94/90). Sigue **pendiente** la certificación integrada del nuevo SHA: QA-01 mantiene su estado sin cambiar el recuento de los 88 requisitos; no declarar B0 resuelto ni Android validado por una prueba aislada.

## Adenda de ejecución B0 · ChatGPT normal · 20/11/2026

Esta adenda **conserva los 88 IDs** y actualiza únicamente QA-03 tras su certificación de CI verde; QA-01 y la aceptación competitiva/Android permanecen pendientes. La modificación fallida del timer (`174c95a`) fue explícitamente revertida en `81a73c2`; la solución de Node 22 vigente está solo en el harness (`01d35b4`). HEAD de partida `9436882a312e4826ec0fa9b8851fe0b1572779b4`; commits de código `174c95a`, `ae360e7`, `f79ffdc`, `b8d4ee5`. El traspaso actualizado contiene la trazabilidad por archivo.

- **QA-01 — IMPLEMENTADO CON DEFECTOS (sin cambio de estado):** 12 cancelaciones `cancelledByParent` de Node 22 empiezan en `src/v5/social/durable-cooperative-replica.test.js:204` tras un reintento CAS. Un intento inicial de introducir `setTimeout` en producción (`174c95a`) **quedó invalidado por la frontera arquitectónica** en [audio-acceptance](https://github.com/javierdario48-star/ATRIA/actions/runs/44849691866); NO se conserva ese cambio. `81a73c2` restauró el transporte original sin nuevos timers y `01d35b4` trasladó exclusivamente al test el control del event loop de Node 22. **Aceptar solamente** si el nuevo `clean-core-contract` y `audit-v5-boundary` pasan sin cancelaciones bajo Node 22.
- **QA-01 / COMP-01 — pendiente de aceptación:** la prueba `competitive-browser (4)` sufrió `TimeoutError` con repetidos `element was detached from the DOM` en `reception-approach`. Evitado reconstruir los botones por cambios exclusivos del reloj. **Aceptar solamente** tras probar 4 clientes reales de Playwright con el nuevo SHA sin perder asignación, privacidad ni respuesta clínica.
- **QA-03 — COMPLETADO Y VERIFICADO (certificación Node/CI; no aceptación Android):** artefactos del [run 44847181875](https://github.com/javierdario48-star/ATRIA/actions/runs/44847181875) prueban que 46 intentos de destino incorrecto y 8 de cada perfil `wrong-dx`, `missing-dx` e `insufficient-preparation` recibían `case.close` ejecutado **sin cerrar el caso** y con penalización `clinical.unsafe-discharge`. La certificación exigía equivocadamente un rechazo técnico; se introdujo `initialUnsafeActionHandled` que verifica el recibo de la decisión insegura y su penalización nativa o un rechazo clínico sin cierre. Ningún cambio al evaluador o XP. **Aceptado en el alcance CI:** [run 44849860676](https://github.com/javierdario48-star/ATRIA/actions/runs/44849860676) en `b8d4ee5`, 11/11 jobs exitosos: `transfer-regressions` + 10 perfiles × 55 casos, incluidos 4 perfiles antes falsamente rojos. No acredita aceptación física ni otros subsistemas.
- **Infraestructura externa:** Live Preview Guard Entry / Vercel sigue bloqueado por cuota Hobby. No declararlo bug de clínico ni éxito de producción.

Permanecen las mismas prioridades B0 → B1 y los mismos contratos de seguridad. El checkpoint local previo 3.167/3.167 se refiere a `7cde6fa`, **no** a los commits B0 añadidos. No repetir campañas costosas solo por estas modificaciones de documentación.


## Estado vigente · 20 de noviembre de 2026

Base auditada `162d0cf24a936e302e2a3efadcc168e1459d86d5`. Corrección de certificación publicada en `7cde6fa905e81ed3d548cf256f1b5201a281ec94`; **3.167/3.167 pruebas locales aprobadas**. [Auditoría histórica y sus límites](ATRIA-5-HISTORICAL-AUDIT-OCT-NOV-2026.md) · [Matriz de trazabilidad y referencias 1–60](ATRIA-5-REQUIREMENTS-TRACEABILITY.md) · [Plan por causas raíz](ATRIA-5-EXECUTION-PLAN.md).

Se conservan los 20 IDs de familias anteriores y las 60 referencias numéricas. El texto individual original 1–60 no se recuperó. Hay 88 entradas de seguimiento con condiciones, cambios y aceptación; no son 88 citas originales independientes. Las regresiones CLIN se resuelven con sus familias relacionadas y no generan parches duplicados.

«COMPLETADO Y VERIFICADO» se limita al contrato y entorno evaluados. «IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN» conserva reportes repetidos aunque existan tests Node/CI. «IMPLEMENTADO CON DEFECTOS» identifica un fallo concreto, incluida certificación, sin atribuirlo automáticamente al motor clínico. «REGRESIÓN» exige evidencia antes/después del mismo flujo. No se declara aceptación física por emulación.

| Estado | Entradas |
| --- | --- |
| COMPLETADO Y VERIFICADO | 10 |
| PARCIALMENTE IMPLEMENTADO | 17 |
| IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | 51 |
| NO IMPLEMENTADO | 3 |
| REEMPLAZADO | 2 |
| NO VERIFICABLE | 4 |
| IMPLEMENTADO CON DEFECTOS | 1 |

## Registro maestro único vigente

| ID | Subsistema / referencias originales | Estado | Comportamiento solicitado | Pendiente / bloque / entorno |
| --- | --- | --- | --- | --- |
| ARCH-01 | Arquitectura y motor clínico | COMPLETADO Y VERIFICADO | Un único motor y autoridad clínica; importar un caso con cinco capas reales, sin respuestas o efectos paralelos. | Conservar estas garantías en cada importación; no equivale a fidelidad ilimitada de todos los mecanismos. B6 / CHATGPT NORMAL |
| LAB-01 | Estudios y resultados · 1–3, 5–6, 9 | PARCIALMENTE IMPLEMENTADO | Resultados coherentes por paciente, técnica, muestra y minuto: TC/angio-TC, gasometrías, hemograma/leucocitos/PCR y troponinas I/T/seriadas. | Inventariar controles aún sin modelo (radiografía RESP-07, PEF, lactato y protocolos cualitativos); medir reportes originales del usuario con IDs. B2 / MIXTA |
| LAB-02 | Voz, teclado y autocompletado · 4, 7 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Encontrar y ordenar VEDB/VCC/videocolonoscopia/colonoscopia y estudios como ecografía abdominal mediante los mismos alias canónicos. | Validar teclado Android físico y órdenes de estudios reportadas como ausentes. B5 / MIXTA |
| ANAM-01 | Anamnesis y diálogo · 10–13, 16–17 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Responder a lo preguntado en primera persona: saludos, antecedentes previos distintos de cuadro actual, medicaciones, ALiCIA y repreguntas coherentes. | Probar preguntas exactas del usuario en móvil, ampliar antecedentes documentados y evaluar naturalidad sin prefijos repetidos. B3 / MIXTA |
| NUR-01 | Enfermería · 18–19, 21–24 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Enfermería contesta y ejecuta órdenes naturales/combinadas; alergias es consulta, ayuno es conducta; pregunta alimentación una vez y conserva decisiones. | Reproducir silencio con frase, UID, cola y recibo en teléfono; validar alimentación, alergias, oxígeno y seguimiento en Android físico. B2 / MIXTA |
| CLOSE-01 | Diagnóstico y evaluación · 25–32 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Cierre al alta o recepción por servicio con alternativas válidas; anamnesis/seguimiento prescindibles reducen calidad y no bloquean; libertad de decisiones y paciente recuperable. | Aceptar rutas alternativas y condiciones reales repetidas del usuario; actualizar certificación de disposición sin debilitar seguridad física. B2 / MIXTA |
| VEGA-01 | Dr. Vega · 8, 33–34, 53 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | «¿Qué hago ahora? −5% XP» en paciente activo da una sola acción prioritaria con nombre de control/comando y destino real. | Medir latencia física y escenarios con actualización concurrente; conservar acciones alternativas. B3 / MIXTA |
| DIALOG-AUTO-01 | Anamnesis y diálogo | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Una pregunta produce respuesta automática contextual; no exigir segundo envío o botón adicional. | Probar primer contacto y pregunta normal en preview y teléfono con cronómetro. B3 / MIXTA |
| VEGA-AUTO-01 | Dr. Vega | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Mostrar pista en un toque, cobrar 5% por nueva acción tras visualización; repetición y espera gratis, historial persistente hasta 0 XP. | Medir del toque al texto y cobro en teléfono; validar paciente cambiado durante entrega. B1 / MIXTA |
| VEGA-COHERENCE-01 | Dr. Vega | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | La pista lee recibos y requisitos reales de cierre, respeta alternativas y no repite estudios o intervenciones confirmados. | Probar pista→orden→recibo→pista por destino, alternativas y controles nuevos indicados. B2 / MIXTA |
| LAT-01 | Android y rendimiento · 45, 54–55, 58, 60 | PARCIALMENTE IMPLEMENTADO | Respuestas, órdenes, selección, pistas y diagnóstico ágiles; eliminar espera real y textos técnicos persistentes. | Medir cola/HTTP/CAS/recibo/render antes de optimizar; «pendiente de confirmación» reportado otra vez no demuestra un fix aceptado. B1 / MIXTA |
| MP-01 | Cooperativo · 44–46 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Cooperativo 2–4 comparte pacientes sin propiedad exclusiva; invitados, chat, Enfermería, estado y reconexión funcionan desde inicio. | Verificar primer minuto con 2–4 cuentas, red móvil, abandono y retorno; no asumir que login/lobby acredita guardia. B1 / MIXTA |
| XP-COOP | XP y progresión · 39–43, 47 | PARCIALMENTE IMPLEMENTADO | Compartir en Cooperativo XP, débitos y pistas; participación pausa al salir y vuelve al reconectar; Competitivo conserva independencia. | Integrar política cooperativa solicitada y animación por recibo; documentar compatibilidad de recibos previos y causalidad de muerte. B4 / MIXTA |
| DX-REVEAL | Diagnóstico y evaluación · 35–38 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Revelar diagnóstico correcto del caso por 50% XP, sin reemplazar impresión propia ni cerrar atención. | Aceptar preview/Android del HEAD, incluir composición con política cooperativa XP-COOP. B4 / MIXTA |
| FAM-01 | Familiares y acompañantes · 14–15, 20 | PARCIALMENTE IMPLEMENTADO | Paciente incapaz activa familiar/enfermería con fuente explícita; acompañante seleccionable, respuestas/repreguntas y atribución propias. | Completar aparición/intervención espontánea donde haya informante declarado, segunda presentación y aceptación táctil; nunca inventar familiares. B3 / MIXTA |
| REC-01 | Recuperación de guardias · 48–52 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Retomar, Finalizar y Después independientes; X/Escape/lobby disponibles; conservar progreso, sin imponer recuperación ni bloquear navegación. | Investigar cancelación Node 22 y probar las cuentas/dispositivo del usuario con ACK perdido y red móvil. No hay P0 jugable reproducido aquí. B1 / MIXTA |
| SEL-00 | Interfaz clínica · 59 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Seleccionar cama/paciente directamente, sin esperas de recepción; mensajes y respuestas tardías conservan UID elegido. | Medir espera de claim/foco en Android antes de otra modificación. No rehacer selección automática existente. B1 / MIXTA |
| DX-01 | Diagnóstico y evaluación · 56–58 | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Editor de impresión cierra con un envío; borrador recuperable, badge confirmado, doble toque y respuestas tardías seguros. | Preview con red perdida, nueva instancia del editor para mismo UID, borrado y Android físico. B1 / MIXTA |
| UI-01 | Interfaz clínica | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | HUD profesional compacto, rueda accesible, recepción fija, marcador superior izquierdo y controles legibles sin tapar juego. | Comprobar vertical/horizontal, banda libre menor a una fila, teclado abierto y toque monitor/Box2B. B5 / MIXTA |
| SAFE-01 | Medicación y seguridad | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Ejecutar decisiones posibles aunque contraindicadas; dosis/vía/paciente/autor/tiempo verdaderos, alergias preexisten, rescate y daño causal. | Aceptar combinaciones, omisiones y rescates por mecanismo; alcance no es farmacología general universal. B6 / CHATGPT NORMAL |
| ARCH-02 | Arquitectura y motor clínico | COMPLETADO Y VERIFICADO | Un scheduler, un renderer y ciclo de vida, sin listeners/RAF duplicados al entrar/salir ni cambiar apariencia. | Mantener regresiones en cambios UI. B7 / MIXTA |
| ARCH-03 | Arquitectura y motor clínico | COMPLETADO Y VERIFICADO | Build V5 autónomo: sin parches de strings sobre HTML, eval ni modificar golden master. | Conservar fuente original y rama exclusiva. B0 / CHATGPT NORMAL |
| ARCH-04 | Arquitectura y motor clínico | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Organización modular inspirada en TFS, reutilizando lo funcional sin reconstruir cada sesión. | Refactorizar solo límite concreto medido, sin otro motor. B7 / MIXTA |
| PHYS-01 | Fisiología y evolución temporal | COMPLETADO Y VERIFICADO | Cantidad cero/no válida no puede transformarse en dosis por defecto; unidades, g/kg, mg/kg, vía y formulación coherentes. | Conservar límites por fármaco al ampliar catálogo. B6 / CHATGPT NORMAL |
| PHYS-02 | Fisiología y evolución temporal | PARCIALMENTE IMPLEMENTADO | Bolus/infusión tienen inicio, exposición, descenso/retirada y contexto renal/hepático; no offsets terapéuticos permanentes universales. | Matriz por mecanismo/fármaco (ejecutable/efecto/retirada) y clearance específico cuando corresponda, sin trasladar constantes sin fuente. B6 / CHATGPT NORMAL |
| PHYS-03 | Fisiología y evolución temporal | COMPLETADO Y VERIFICADO | Un dueño por efecto; antibiótico no mejora presión inmediatamente, heparina no reperfunde, oxígeno no oscila por feedback circular. | Conservar prueba de no doble efecto en cambios de terapia. B6 / CHATGPT NORMAL |
| PHYS-04 | Fisiología y evolución temporal | COMPLETADO Y VERIFICADO | Protección contra muerte prematura por reloj real activo, manteniendo evolución y administraciones reales. | Prueba física de tiempo de atención pertenece a ANDROID-01; no reintroducir vitales artificiales. B6 / CHATGPT NORMAL |
| PHYS-05 | Fisiología y evolución temporal | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Deterioro, rescate y muerte plausibles; no resurrección tras recargar y penalización solo por daño causal atribuible. | Mantener regresión del harness y aceptar escenarios adversos físicos cuando corresponda; no atribuir aceptación del teléfono a esta prueba Node. B0 / MIXTA |
| PHYS-06 | Fisiología y evolución temporal | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Monitor, color/estado y síntomas cambian con fisiología observada; ECG sigue frecuencia/ritmo explícito, sin fingir medición diagnóstica. | Aceptar trazado/color en pantalla real; ampliar solo ritmos autorados necesarios. B5 / MIXTA |
| NUR-02 | Enfermería | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Enfermera del box correcto y cola por paciente: vías plural=dos, monitor+Ringer+O2+antibióticos completos; paciente cambiado no redirige tarea. | Aceptar combinadas en dos camas y teléfonos; distinguir retraso físico de silencio/timeout. B2 / MIXTA |
| NUR-03 | Enfermería | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Recuperar Enfermería tras recarga, bloquear/desbloquear trayectos y reintentos sin atascar cola ni duplicar dosis. | Android con background/reload mientras hay tareas. B1 / MIXTA |
| MED-01 | Medicación y seguridad | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Catálogo universal administrable separado de pertinencia; antibiótico nunca bloqueado por no ser el correcto para ese caso. | Auditar cobertura por molécula/forma/ruta y efectos; no deducir del tamaño de catálogo. B6 / CHATGPT NORMAL |
| MED-02 | Medicación y seguridad | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Ampicilina en endocarditis, tres pares de hemocultivos, alternativas de antibióticos y rescate tras reacción antes del traslado. | Prueba dirigida de omisión, alternativa, reacción y recuperación con evidencia del segundo médico. B2 / MIXTA |
| DX-02 | Diagnóstico y evaluación | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Autocompletar impresión diagnóstica desde catálogo global, sin filtrar por diagnóstico oculto; badge persistente y rival solo lectura. | Aceptar en Android sobre contexto competitivo. B5 / MIXTA |
| DX-03 | Diagnóstico y evaluación | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Evaluación separa calidad de elegibilidad: diagnóstico, historia, seguridad, estudios, tratamiento/destino, eficiencia y eventos; desglose sumó/descontó/faltó. | Revisar desglose por destino alternativo y animación en teléfono. B2 / MIXTA |
| VEGA-02 | Dr. Vega | PARCIALMENTE IMPLEMENTADO | Mentor Aprendiz docente multietapa: reconoce duda/hipótesis, pregunta razonamiento, ABC primero y memoria pedagógica, sin bucles. | Migrar razonamiento y memoria existentes sobre la misma autoridad; no confundir selección de próxima acción con tutor completo. B3 / MIXTA |
| VEGA-03 | Dr. Vega | PARCIALMENTE IMPLEMENTADO | Delegación «hazlo tú» y rescate docente limitado ante gravedad en Aprendiz, por órdenes reales, sin administrar automáticamente paciente estable. | Recuperar política exacta y enlazar ejecución autorizada/receptores, conservar límites de modo. B3 / MIXTA |
| XP-01 | XP y progresión | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Todos los modos puntúan, nivel y velocidad vienen de XP autoritativa, progreso persistente entre dispositivos. | Aceptar progreso en teléfono con sesión recuperada; no convertir XP local sin verificar en cuenta. B4 / MIXTA |
| XP-02 | XP y progresión | PARCIALMENTE IMPLEMENTADO | Recompensas y personalización desbloqueable (bata/niveles), con nombre y color propios. | Recuperar umbral/política si existe; implementar catálogo de recompensas sin inventar umbral histórico. B4 / MIXTA |
| XP-03 | XP y progresión | PARCIALMENTE IMPLEMENTADO | Cambios de XP visibles y animados una vez por recibo; distinguir puntos clínicos, XP, penalización de pistas, alta y muerte. | Deduplicar animación por médico/recibo/dispositivo y verificar dos cuentas, pistas y reconexión. B4 / MIXTA |
| COMP-01 | Competitivo | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Competitivo2–4: primer contacto clínico válido toma propiedad; rivales no tratan ni ven expediente privado; cama liberada no filtra historia anterior. | Aceptar red móvil y 2–4 cuentas; tests de fixtures que leen privado antes del claim fallan y deben corregirse. B1 / MIXTA |
| LOBBY-01 | Lobby y presencia | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Presencia disponible/en guardia/offline correcta, solicitudes visibles con contador y acceso a perfil al tocar avatar. | Presencia tardía, regreso al lobby y notificación de amistad en teléfonos. B4 / MIXTA |
| SOCIAL-01 | Amigos y chat | NO IMPLEMENTADO | Chat privado de amigos separado del público/clínico, minimizable y usable durante guardia. | Implementar almacenamiento/ruta autorizada por participantes, bandeja, no leídos y control minimizable sin afectar clínica. B4 / MIXTA |
| SOCIAL-02 | Amigos y chat | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Invitación unilateral llega y se acepta sin invitación mutua ni códigos; persistir aceptación y revocación entre instancias. | Teléfono de ambas cuentas con pestaña inactiva y presencia atrasada. B1 / MIXTA |
| CHAT-01 | Cooperativo | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Equipo y Actividad visibles y actualizados desde inicio; no esperar minutos ni llegada de todo de golpe. | Primer minuto en2–4 cuentas bajo red móvil: pertenencia, hydrate, stream de eventos y pestañas. B1 / MIXTA |
| CHAT-02 | Interfaz clínica | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Chat contextual RPG con burbujas y único historial clínico; paciente cercano por defecto, Enfermera/Vega por invocación; alcance por paredes. | Probar proximidad, Box2B, paciente distinto y lectura de historial con teclado. B3 / MIXTA |
| TURN-01 | Guardia de 24 minutos | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | 24min reales=24h simuladas, ingresos dinámicos y varios pacientes; reloj sobrevive lag/teclado/recarga sin acelerar farmacología indebidamente. | Aceptar turno completo del preview actual en teléfono; no repetir reloj real local sin cambio que lo justifique. B1 / MIXTA |
| TURN-02 | Guardia de 24 minutos | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Al finalizar, continuar otra guardia o guardar y salir, conservando pacientes/progreso y decisión por participante. | Aceptar consenso2 cuentas, salida de uno, desconexión y siguiente turno en Android. B1 / MIXTA |
| SELECT-01 | Selección de guardias y especialidades | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Selección cualquier caso/especialidad/patología, evitar revelar enfermedad al azar, multiplicadores actuales×1,5/×1,2/×1,0. | Aceptar UI en teléfono y que no filtre diagnóstico en selección general. B4 / MIXTA |
| SELECT-OLD | Selección de guardias y especialidades | REEMPLAZADO | Multiplicadores iniciales×5/×3/×1. | Ninguna tarea; conservar antecedente en SELECT-01. B4 / MIXTA |
| UI-02 | Interfaz clínica | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Cada monitor pertenece a su cama; monitor faltante interactuable; Box2B, examen táctil y camas nuevas sincronizados. | Censo accionable de controles faltantes y aceptación Box2B Android+PC. B5 / MIXTA |
| EXAM-01 | Interfaz clínica | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Examen anatómico por órgano/técnica, ALiCIA/Glasgow, tacto rectal como maniobra; resultados en panel, sin narrarlos Enfermería ni repetir globos. | Aceptar maniobras/scroll/proximidad y acceso físico a todos los controles. B5 / MIXTA |
| WORLD-01 | Mundo RPG, movimiento y gráficos | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Preservar mapa/personajes HD/proporciones, piernas y orientación; cambiar nombre/ropa sin teleportar ni vibrar cámara. | Aceptar marcha local/remota en dispositivo físico y zoom. B7 / MIXTA |
| WORLD-02 | Mundo RPG, movimiento y gráficos | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Corregir remoto entrecortado, retroceso, repetición de ruta, desaparición y asimetría;2–4 jugadores. | Reproducir con RTT/jitter reales y medir salto remoto; no aplicar la misma solución al lag local sin traza. B1 / MIXTA |
| WORLD-03 | Mundo RPG, movimiento y gráficos | NO IMPLEMENTADO | Migrar fondo+malla a mapa modular SQM32×32 con objetos, colisiones y física propias, una autoridad y sin bitmap final monolítico. | Aprobar arte del prototipo y plan de migración compatible; no tratar32 familias propuestas como32 solicitudes individuales. B7 / MIXTA |
| WORLD-04 | Mundo RPG, movimiento y gráficos | PARCIALMENTE IMPLEMENTADO | Puertas/cortinas/visión/sonido/mobiliario/cama-monitor y rutas NPC comparten geometría; separar mundo de fisiología, XP y reloj. | Completar tras WORLD-03; mantener transformaciones/anclajes de huellas rotadas y nav única. B7 / MIXTA |
| WORLD-05 | Mundo RPG, movimiento y gráficos | PARCIALMENTE IMPLEMENTADO | Café cierra chat antes de caminar; recepción muestra cola, box y responsables; señal sobre paciente/monitor disponible. | Recuperar aceptación del gesto de café y decidir su migración; mantener recepción ya funcional. B7 / MIXTA |
| AUDIO-01 | Audio y música | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Música nueva inicio/lobby y clásica predeterminada guardia; ajuste Nueva/Clásica, click en menús, mute permanente solo música y preferencias. | Escuchar Android/parlante, comprobar autoplay tras gesto, mute y preferencias anteriores. B5 / MIXTA |
| AUDIO-02 | Audio y música | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Máster y canales ajustables, volumen predeterminado más alto, sin ruido blanco; monitores cercanos siguen FC real, alarmas no saturan. | Aceptar volumen percibido Android y límites de alarma en guardia larga. B5 / MIXTA |
| VOICE-01 | Voz, teclado y autocompletado | PARCIALMENTE IMPLEMENTADO | Dictado Android por mismo router: inicio ágil, no duplicar primera palabra/onresult+onend, diagnóstico de voz y Enter único. | Conectar captura/normalizador→submitText una vez, lifecycle y permisos; validar Gboard/SpeechRecognition físicos. B5 / MIXTA |
| VOICE-02 | Voz, teclado y autocompletado | PARCIALMENTE IMPLEMENTADO | Voz entre jugadores/PTT en lobby y4 modos donde corresponda; WebRTC/TURN/Android físico y separación de dictado. | Migrar sesión de voz existente y probar audio bidireccional físico; infraestructura TURN no verificada. B5 / MIXTA |
| KEYBOARD-01 | Voz, teclado y autocompletado | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Teclado propio compacto aprobado,4 filas, edición/foco/IME y envío; no tapar input/historial ni desplazar/teletransportar juego. | Gboard real en campos nativos, rotación, caret, borrar, Enter y botón enviar. B5 / MIXTA |
| KEYBOARD-OLD | Voz, teclado y autocompletado | REEMPLAZADO | Teclado nativo como única entrada del juego. | Ninguna tarea; campos nativos deben seguir siendo accesibles. B5 / MIXTA |
| ANDROID-01 | Android y rendimiento | NO VERIFICABLE | Aceptar en teléfono físico teclado, monitor/Box2B, audio, pistas, recuperación y multijugador bajo red real. | Dispositivo/cuentas concretas. Work tampoco sustituye hardware ausente. B5 / BLOQUEADA |
| ANDROID-02 | Android y rendimiento | NO VERIFICABLE | Comprobar WebKit/iPhone y restricciones de audio/viewport cuando se declara soporte móvil. | RunnerWebKit/dispositivo y navegador compatibles. B5 / BLOQUEADA |
| BOTS-01 | Bots médicos | COMPLETADO Y VERIFICADO | Bots experto/competente/principiante/lento/peligroso y omisiones con velocidades/conocimiento distintos; usar motor y comandos reales en4 modos. | Mantener perfiles adversos y evidencia causal; no usar texto de bot como prueba de efecto. B0 / CHATGPT NORMAL |
| BOTS-02 | Bots médicos | NO VERIFICABLE | Intentar TestSprite y preparar entorno para auditoría de roles/modos mientras Work termina. | No obliga a instalar servicio ni pagar. Recuperar resultado del intento; bots existentes cumplen pruebas técnicas de otro origen. B8 / BLOQUEADA |
| CASE-01 | Importación de casos | PARCIALMENTE IMPLEMENTADO | Importar desde libro/contenido conservando procedencia; al menos un caso por tema/capítulo solicitado, sin generar patologías fuera del motor. | Comparar índice real del libro con catálogo antes de prometer cobertura total; contrato5capas obligatorio. B6 / BLOQUEADA |
| CASE-02 | Importación de casos | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Completar sistemas primero; después expansión autorizada a55 casos (10respiratorios/10cardio/10neuro nuevos), usando reglas comunes. | Mantener certificación, no tomar antiguos planes de13/25 casos como HEAD actual. B6 / CHATGPT NORMAL |
| VAR-01 | Variabilidad clínica | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Identidad/edad/comorbilidades/severidad/alergias/evolución con semillas reproducibles, sin contradicciones fijas y persistiendo por paciente. | Validar plausibilidad de nuevas variantes y banco de antecedentes, sin confundir volumen combinatorio con aceptación clínica. B6 / CHATGPT NORMAL |
| VAR-02 | Variabilidad clínica | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Personalidad multidimensional y relación por médico heredadas automáticamente; conversación específica se combina sin cambiar hechos. | Aceptar naturalidad, contexto por médico y recuperación de personalidad en dispositivo físico; mantener la restricción de datos antes de tomar la cama. B0 / MIXTA |
| VAR-03 | Variabilidad clínica | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Complicaciones, prevención y rescate causales; alergia≠intolerancia, no preguntar no cambia susceptibilidad. | Aceptar trayectorias adversas de variantes nuevas y distinguir no activada/tratada/rescatada. B6 / CHATGPT NORMAL |
| QA-01 | Certificación y pruebas | IMPLEMENTADO CON DEFECTOS | Pruebas pertinentes ejecutadas y CI por SHA; no llamar terminado al código publicado o a test no corrido. | Reproducir cancelaciones Node 22, revisar certificación de traslados y obtener conclusión de CI del código publicado. El perfilado de red no debe ocultar fallos deterministas. B0 / CHATGPT NORMAL |
| QA-02 | Certificación y pruebas | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Aceptar preview del mismoSHA,2–4 cuentas, recuperación, cuatro modos y controles; conservar fallos/reintentos sin repetir campañas costosas. | Aceptación dirigida solo para contrato modificado ySHAactual; cuota429de tercera cuenta histórica no prueba fallo de clínica. B1 / MIXTA |
| QA-03 | Certificación y pruebas | COMPLETADO Y VERIFICADO | Certificar traslados correctos/erróneos, preparación, diagnóstico omitido/equivocado, rescate y cierre con libertad clínica vigente. | CI `b8d4ee5`: [11/11 jobs verdes](https://github.com/javierdario48-star/ATRIA/actions/runs/44849860676), 55 casos × 10 perfiles y regresiones; se comprobó decisión insegura ejecutada con penalización sin cierre, además de rechazo técnico cuando corresponde. Alcance Node/CI, no Android físico. B0 / CHATGPT NORMAL |
| DEPLOY-01 | Despliegue y persistencia | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Gratis para usuarios, sin Replit; publicar solo experimental y no modificar main/V4/estables ni sobrescribir trabajo concurrente. | Resolver la disponibilidad de un preview utilizable y aceptar su entrada real cuando el servicio permita desplegar; medir consumo antes de comparar planes. No migrar proveedor ni contratar servicios por esta auditoría. B8 / CHATGPT NORMAL |
| AUTH-01 | Despliegue y persistencia | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Bienvenida con ilustración original sin globosDr/Darío; nombre único normalizado/reserva atómica, personalización y contraseña≥12; volver desde otro dispositivo. | Aceptar ilustración/creación/volver/migración de cuenta en móvil y otro dispositivo. B4 / MIXTA |
| AUTH-02 | Despliegue y persistencia | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | Persistencia multiinstanciaCAS/RLS, controlador único por cuenta, transferencia explícita de dispositivo, no perder amigos/XP históricos. | Aceptar sesiones del usuario, caducidad y nueva instancia con red móvil. B1 / MIXTA |
| SCALE-01 | Lobby y presencia | PARCIALMENTE IMPLEMENTADO | Escalar lobby con vecindad/interés y datos privados, sin difundir mapa/historias a todos; guardar hasta4por guardia. | Carga medida y presupuesto por sala antes de prometer lobby masivo/TURN/WAN. B7 / MIXTA |
| CONT-01 | Continuidad y recuperación histórica | COMPLETADO Y VERIFICADO | Checkpoints pequeños, informes/SHA/pruebas reales, continuar autónomamente sin rehacer; recuperar Work publicado aunque no haya respuesta final. | Mantener práctica en cada sesión; recursos locales no son continuidad durable hasta publicar. B8 / CHATGPT NORMAL |
| CONT-02 | Continuidad y recuperación histórica | NO VERIFICABLE | Recuperar listado literal1–60 y todosloschats/ejecuciones del período, conservar correcciones sin inventarlas. | Requiere fuentes conversacionales completas accesibles; no bloquear auditoría/repo ni fabricar60títulos. B8 / BLOQUEADA |
| CONT-03 | Continuidad y recuperación histórica | PARCIALMENTE IMPLEMENTADO | Recuperar modificaciones locales de Work y distinguir equivalencia ya publicada de código huérfano. | Comparar porcomportamiento/hunk, preservar solo auxiliares útiles y no aplicar parches antiguos sobre código actual. B8 / CHATGPT NORMAL |
| CLIN-HEPAT-01 | Estudios y resultados | COMPLETADO Y VERIFICADO | HEPAT-001: una adquisición con INR y glucemia satisface ambas evidencias; no repetir por alias ni por pista. | Conservar como regresión específica de LAB-01 y VEGA-COHERENCE-01; no es otro parche independiente. B2 / MIXTA |
| CLIN-CARD08-01 | Diagnóstico y evaluación | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | CARD-08: disección Stanford A corresponde a Cirugía cardiovascular, no exigir betabloqueo contraindicado por hipotensión para derivar. | Aceptar variante hipotensa/deteriorada y alternativa ETE, sin debilitar estabilización que sí corresponda. B2 / MIXTA |
| CLIN-VARIX-01 | Diagnóstico y evaluación | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | VARIX-001: estabilización y derivación endoscópica/UTI alcanzables; evitar reevaluación manual oculta y XP duplicada. | Repetir secuencia exacta del reporte en teléfono solo si hay reproducción; nunca afirmar ligadura realizada. B2 / MIXTA |
| CLIN-HDA-01 | Diagnóstico y evaluación | IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN | HDA-001 y hemorragia variceal no deben confundirse; soporte, terapia y destino conservan reglas propias. | Proteger por regresión etología/hipótesis/terapia/recepción con las fuentes del caso, sin copiar tratamientos de VARIX a toda HDA. B2 / MIXTA |
| NUR-04 | Enfermería | PARCIALMENTE IMPLEMENTADO | Enfermería automatiza reevaluaciones rutinarias; el médico decide conductas y no debe descubrir comandos ocultos para poder cerrar. | Distinguir medición rutinaria, reevaluación clínica deliberada y condición indispensable por caso; ligar la primera a Enfermería/recibo sin fabricar examen médico. B2 / MIXTA |
| PERF-01 | Android y rendimiento | NO IMPLEMENTADO | Medir tráfico y CPU antes de optimizar: lobby/sala/guardia/reconexión con 1, 2 y 4 clientes; distinguir movimiento, señalización WebRTC y clínica durable; cambio mínimo con flag OFF, rollback y comparación reproducible. | Medir requests por endpoint/minuto, p50/p95, CPU si está disponible, errores y duplicados; validar 2/4 clientes, desconexión, progreso, chat, Enfermería, Vega, XP y recuperación en cuatro modos. Comparar costo después de aceptar métricas; no atribuir 4h13m de CPU exclusivamente a ATRIA. B1 / MIXTA |

## Fichas de verificación y aceptación

Los esfuerzos son estimaciones del bloque o del alcance indicado; no sumarlos por cada fila de la misma causa raíz. Las pruebas incluidas en `npm run test:v5` se ejecutaron en el código 7cde6fa y pasaron; los scripts de campaña externos se distinguen de ese resultado.

### ARCH-01 · Arquitectura y motor clínico

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;DOC-CONTRATO;MIG-MANUAL.

**Solicitud final:** Un único motor y autoridad clínica; importar un caso con cinco capas reales, sin respuestas o efectos paralelos.

**Estado:** COMPLETADO Y VERIFICADO. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** RESP-56 temporal recorre cuatro modos, muestras, diálogo, cierre y XP; importador pasa en suite local. Frontera: 190 módulos, un RAF.

**Archivos responsables:** `src/v5/core/room-authority.js`, `src/v5/adapters/native-clinical-port.js`, `src/v5/content/compile-clinical-case-pack.js`, `scripts/import-clinical-case-pack.mjs`.

**Pruebas identificadas:** `scripts/import-clinical-case-pack.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `scripts/import-clinical-case-pack.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Conservar estas garantías en cada importación; no equivale a fidelidad ilimitada de todos los mecanismos.

**Criterio de aceptación:** Un caso adicional usa cargador y autoridad habitual y recupera recibos sin duplicar XP.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Conservar estas garantías en cada importación; no equivale a fidelidad ilimitada de todos los mecanismos. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### LAB-01 · Estudios y resultados

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;GIT-13;U-AUDIT.

**Solicitud final:** Resultados coherentes por paciente, técnica, muestra y minuto: TC/angio-TC, gasometrías, hemograma/leucocitos/PCR y troponinas I/T/seriadas.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** 4c8fdcb añade controles basados en evidencia disponible. d260564 conserva informe basal si no hay modelo. La suite local aprueba estas pruebas; no confirma todos los informes futuros.

**Archivos responsables:** `src/v5/clinical/studies.js`, `src/v5/clinical/study-evidence.js`, `src/v5/clinical/study-collections.js`, `src/v5/clinical/study-order-vocabulary.js`.

**Pruebas identificadas:** `src/v5/clinical/studies-policy.test.js`, `src/v5/clinical/study-orders.test.js`, `src/v5/clinical/study-collections.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/studies-policy.test.js`, `src/v5/clinical/study-orders.test.js`, `src/v5/clinical/study-collections.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Inventariar controles aún sin modelo (radiografía RESP-07, PEF, lactato y protocolos cualitativos); medir reportes originales del usuario con IDs.

**Criterio de aceptación:** Una muestra es inmutable; alias no duplican; nueva muestra autorizada tiene tiempo propio y no reutiliza falsamente el informe basal.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Inventariar controles aún sin modelo (radiografía RESP-07, PEF, lactato y protocolos cualitativos); medir reportes originales del usuario con IDs. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** 11/11 adquisición/PCR; 12/11 rechazo seguro de controles no modelados; 13/11 enlace de órdenes seriadas a muestras disponibles. La limitación de un control no significa que el estudio basal falte.

### LAB-02 · Voz, teclado y autocompletado

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-SOCIAL.

**Solicitud final:** Encontrar y ordenar VEDB/VCC/videocolonoscopia/colonoscopia y estudios como ecografía abdominal mediante los mismos alias canónicos.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Alias integrados y aprobados en Node; evidencia Chromium histórica en CROHN/COLON. Autocompletado ejecuta router común.

**Archivos responsables:** `src/v5/clinical/study-order-vocabulary.js`, `src/v5/ui/clinical-autocomplete.js`, `src/v5/core/speech-router.js`.

**Pruebas identificadas:** `src/v5/clinical/study-orders.test.js`, `src/v5/ui/clinical-autocomplete.test.js`, `qa/tests/v5-nurse-study-autocomplete.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/study-orders.test.js`, `src/v5/ui/clinical-autocomplete.test.js`, `qa/tests/v5-nurse-study-autocomplete.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Validar teclado Android físico y órdenes de estudios reportadas como ausentes.

**Criterio de aceptación:** VEDB baja no se confunde con endoscopia alta; alias repiten una adquisición, no dos.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Validar teclado Android físico y órdenes de estudios reportadas como ausentes. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### ANAM-01 · Anamnesis y diálogo

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-08-14;PC-NOV.

**Solicitud final:** Responder a lo preguntado en primera persona: saludos, antecedentes previos distintos de cuadro actual, medicaciones, ALiCIA y repreguntas coherentes.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** adfa5e9 separa antecedentes en 12 legacy; 550 entrevistas/8.250 turnos documentados al 12/11. Suite local de diálogo pasa; persiste límite de respuestas autoradas.

**Archivos responsables:** `src/v5/clinical/patient-dialogue.js`, `src/v5/clinical/patient-question-context.js`, `src/v5/content/patient-language.js`, `src/v5/content/legacy-patient-variation.js`.

**Pruebas identificadas:** `src/v5/clinical/patient-dialogue.test.js`, `qa/tests/patient-personality-integration.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/patient-dialogue.test.js`, `qa/tests/patient-personality-integration.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Probar preguntas exactas del usuario en móvil, ampliar antecedentes documentados y evaluar naturalidad sin prefijos repetidos.

**Criterio de aceptación:** «¿Otra enfermedad?» no devuelve edad ni motivo actual; «¿desde cuándo?» conserva interlocutor, tema y hechos tras reconexión.

**Causa / bloque:** Intenciones finitas y datos redactados; docencia antigua no migrada por completo; fuente indirecta limitada al contenido declarado. B3. **Dependencias:** B1/B2 para medición y checklist. **Impacto:** Probar preguntas exactas del usuario en móvil, ampliar antecedentes documentados y evaluar naturalidad sin prefijos repetidos. **Riesgo:** medio. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### NUR-01 · Enfermería

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-08-14;PC-NOV;U-AUDIT.

**Solicitud final:** Enfermería contesta y ejecuta órdenes naturales/combinadas; alergias es consulta, ayuno es conducta; pregunta alimentación una vez y conserva decisiones.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** La prueba de nutrición se corrigió en 7cde6fa: cambiar ayuno por alimentación oral conserva administraciones y elegibilidad, modifica calidad y recupera ese estado sin duplicar recibos. Las 26 pruebas dirigidas pasan.

**Archivos responsables:** `src/v5/core/speech-router.js`, `src/v5/clinical/guard-session.js`, `src/v5/clinical/nursing-nutrition.test.js`, `src/v5/engine/nurse-dispatcher.js`.

**Pruebas identificadas:** `src/v5/clinical/physical-nursing.test.js`, `src/v5/core/nurse-diagnosis-speech.test.js`, `src/v5/clinical/nursing-nutrition.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/physical-nursing.test.js`, `src/v5/core/nurse-diagnosis-speech.test.js`, `src/v5/clinical/nursing-nutrition.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Reproducir silencio con frase, UID, cola y recibo en teléfono; validar alimentación, alergias, oxígeno y seguimiento en Android físico.

**Criterio de aceptación:** Cada orden queda reconocida, en tarea o rechazada con motivo; una sola pregunta y un recibo recuperable, sin confirmación de administración anticipada.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Reproducir silencio con frase, UID, cola y recibo en teléfono; validar alimentación, alergias, oxígeno y seguimiento en Android físico. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Errores de vías/monitor/una sola tarea 10/10; 13–14/10 correcciones de chat; 11–12/11 alergias, ayuno y alimentación. La queja repetida no se cierra por tests de otras frases. Checkpoint del 20/11: corrección dirigida de certificación publicada en 7cde6fa; no cambió reglas clínicas.

**Estado anterior conservado:** 162d0cf24a936e302e2a3efadcc168e1459d86d5 — IMPLEMENTADO CON DEFECTOS: Consultas/NPO/seguimiento y proactividad están integrados. Se reproduce fallo de contrato de nutrición: permitir comer cambia calidad/fulfilledTreatmentIds frente a expectativa antigua de igualdad.

### CLOSE-01 · Diagnóstico y evaluación

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-NOV;GIT-13.

**Solicitud final:** Cierre al alta o recepción por servicio con alternativas válidas; anamnesis/seguimiento prescindibles reducen calidad y no bloquean; libertad de decisiones y paciente recuperable.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** 7afa707 y c0e9ed4 separan entrevista/seguimiento/NPO de elegibilidad. 9a14b00 admite receptor urgente por hallazgos. Matriz nativa del HEAD aprobada; bot de traslados conserva expectativas antiguas de rechazo.

**Archivos responsables:** `src/v5/clinical/clinical-policy-closure.js`, `src/v5/clinical/gastro-closure-v5.js`, `src/v5/clinical/consultation-evidence.js`, `src/v5/clinical/guard-session.js`.

**Pruebas identificadas:** `src/v5/clinical/accepted-transfer.test.js`, `src/v5/clinical/automatic-transfer-runtime.test.js`, `src/v5/clinical/receiver-transfer-contract.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/accepted-transfer.test.js`, `src/v5/clinical/automatic-transfer-runtime.test.js`, `src/v5/clinical/receiver-transfer-contract.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar rutas alternativas y condiciones reales repetidas del usuario; actualizar certificación de disposición sin debilitar seguridad física.

**Criterio de aceptación:** Alta insegura registra error/débito y deja caso abierto; derivación indicada cierra una vez al aceptar receptor, sin simular operación realizada.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Aceptar rutas alternativas y condiciones reales repetidas del usuario; actualizar certificación de disposición sin debilitar seguridad física. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** 24/10 cierre al aceptar Cirugía; 26/10 seguimiento era gate; 4–12/11 libertad/alta insegura; 12–13/11 entrevista y seguimiento pasan a calidad. El requisito antiguo de bloqueo absoluto queda sustituido dentro de esta misma entrada.

### VEGA-01 · Dr. Vega

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-NOV;U-AUDIT.

**Solicitud final:** «¿Qué hago ahora? −5% XP» en paciente activo da una sola acción prioritaria con nombre de control/comando y destino real.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** 55/55 cierres guiados documentados; selector comparte checklist y revisión de foco. Un prepare verificado antes de pintar.

**Archivos responsables:** `src/v5/clinical/clinical-hints.js`, `src/v5/clinical/clinical-hint-requirements.js`, `src/v5/ui/clinical-hint-presenter.js`.

**Pruebas identificadas:** `src/v5/clinical/clinical-hints.test.js`, `src/v5/ui/clinical-hint-presenter.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/clinical-hints.test.js`, `src/v5/ui/clinical-hint-presenter.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Medir latencia física y escenarios con actualización concurrente; conservar acciones alternativas.

**Criterio de aceptación:** Una pulsación produce instrucción ejecutable para ese encuentro, nunca un permiso clínico.

**Causa / bloque:** Intenciones finitas y datos redactados; docencia antigua no migrada por completo; fuente indirecta limitada al contenido declarado. B3. **Dependencias:** B1/B2 para medición y checklist. **Impacto:** Medir latencia física y escenarios con actualización concurrente; conservar acciones alternativas. **Riesgo:** medio. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### DIALOG-AUTO-01 · Anamnesis y diálogo

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-11-20.

**Solicitud final:** Una pregunta produce respuesta automática contextual; no exigir segundo envío o botón adicional.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** 69a27ec atribuye respuesta a fuente; 84af64f incorpora acompañante; navegador previo vio respuesta con un envío. Modo y fuente no sustituyen aceptación física.

**Archivos responsables:** `src/v5/app/application.js`, `src/v5/clinical/patient-dialogue.js`, `src/v5/ui/guard-message-policy.js`.

**Pruebas identificadas:** `qa/v5/patient-dialogue-browser.mjs`, `src/v5/clinical/patient-dialogue.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/patient-dialogue.test.js`. No repetidas aquí: `qa/v5/patient-dialogue-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Probar primer contacto y pregunta normal en preview y teléfono con cronómetro.

**Criterio de aceptación:** Pregunta única, respuesta única visible ligada al paciente; incapacidad verbal conserva fuente indirecta/observación.

**Causa / bloque:** Intenciones finitas y datos redactados; docencia antigua no migrada por completo; fuente indirecta limitada al contenido declarado. B3. **Dependencias:** B1/B2 para medición y checklist. **Impacto:** Probar primer contacto y pregunta normal en preview y teléfono con cronómetro. **Riesgo:** medio. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### VEGA-AUTO-01 · Dr. Vega

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-11-20.

**Solicitud final:** Mostrar pista en un toque, cobrar 5% por nueva acción tras visualización; repetición y espera gratis, historial persistente hasta 0 XP.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** 448917d integra verificación en prepare; 8cacfdd refresca oferta obsoleta dentro del mismo toque. Ledger aplica min(100,5*n); displayed idempotente.

**Archivos responsables:** `src/v5/ui/clinical-hint-presenter.js`, `src/v5/clinical/clinical-hint-ledger.js`, `src/v5/server/clinical-hints-durable.test.js`.

**Pruebas identificadas:** `src/v5/clinical/clinical-hint-ledger.test.js`, `src/v5/server/clinical-hints-durable.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/clinical-hint-ledger.test.js`, `src/v5/server/clinical-hints-durable.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Medir del toque al texto y cobro en teléfono; validar paciente cambiado durante entrega.

**Criterio de aceptación:** No cobrar oferta descartada/no pintada; una ayuda conocida no vuelve a descontar tras recarga.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Medir del toque al texto y cobro en teléfono; validar paciente cambiado durante entrega. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### VEGA-COHERENCE-01 · Dr. Vega

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-NOV.

**Solicitud final:** La pista lee recibos y requisitos reales de cierre, respeta alternativas y no repite estudios o intervenciones confirmados.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** HEPAT INR/glucosa y CARD-08 documentados; checklist por destino y 91 destinos auditados. Un estudio solicitado no equivale a informado.

**Archivos responsables:** `src/v5/clinical/clinical-hint-requirements.js`, `src/v5/clinical/clinical-hints.js`, `src/v5/clinical/study-evidence.js`.

**Pruebas identificadas:** `src/v5/clinical/clinical-hints.test.js`, `src/v5/clinical/closure-catalog-audit.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/clinical-hints.test.js`, `src/v5/clinical/closure-catalog-audit.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Probar pista→orden→recibo→pista por destino, alternativas y controles nuevos indicados.

**Criterio de aceptación:** Solo repetir adquisición cuando su tiempo/indicación lo justifiquen; todo gate imprescindible tiene explicación y acción.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Probar pista→orden→recibo→pista por destino, alternativas y controles nuevos indicados. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### LAT-01 · Android y rendimiento

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-NOV;PC-09-10;DOC-INVENTARIO;U-AUDIT.

**Solicitud final:** Respuestas, órdenes, selección, pistas y diagnóstico ágiles; eliminar espera real y textos técnicos persistentes.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Un prepare ahorrado; proyección reutilizada 81fd2da; chat local ACK→DOM 336/586 ms histórico. No hay medición end-to-end en Android físico ni SLA acordado.

**Archivos responsables:** `src/v5/social/durable-cooperative-replica.js`, `src/v5/server/durable-guard-authority.js`, `src/v5/app/application.js`, `src/v5/ui/guard-chat-view.js`.

**Pruebas identificadas:** `src/v5/social/durable-cooperative-replica.test.js`, `qa/v5/shared-guard-auth-browser.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/social/durable-cooperative-replica.test.js`. No repetidas aquí: `qa/v5/shared-guard-auth-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Medir cola/HTTP/CAS/recibo/render antes de optimizar; «pendiente de confirmación» reportado otra vez no demuestra un fix aceptado.

**Criterio de aceptación:** Misma red/carga antes/después, IDs estables, cero dosis duplicadas, interacción local inmediata y confirmación autoritativa veraz.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Medir cola/HTTP/CAS/recibo/render antes de optimizar; «pendiente de confirmación» reportado otra vez no demuestra un fix aceptado. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Resolver conjuntamente con:** PERF-01.

### MP-01 · Cooperativo

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-SOCIAL;PC-11-20.

**Solicitud final:** Cooperativo 2–4 comparte pacientes sin propiedad exclusiva; invitados, chat, Enfermería, estado y reconexión funcionan desde inicio.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** 403 del 11/11 corregido con persistencia de sala/membresía y revocación. CI HEAD: pruebas browser compartidas aprobadas; reporte usuario 5/11 de mensajes que llegan juntos sigue sin aceptación física.

**Archivos responsables:** `src/v5/clinical/guard-runtime.js`, `src/v5/social/cooperative-link.js`, `src/v5/server/supabase-account-store.js`, `src/v5/social/room-membership-store.js`.

**Pruebas identificadas:** `src/v5/server/supabase-social-room-persistence.test.js`, `src/v5/clinical/cooperative-care.test.js`, `qa/v5/shared-guard-preview.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/server/supabase-social-room-persistence.test.js`, `src/v5/clinical/cooperative-care.test.js`. No repetidas aquí: `qa/v5/shared-guard-preview.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Verificar primer minuto con 2–4 cuentas, red móvil, abandono y retorno; no asumir que login/lobby acredita guardia.

**Criterio de aceptación:** Médicos autorizados ven mismos recibos y pacientes, una autoridad y revocación válida, sin relajar RLS.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Verificar primer minuto con 2–4 cuentas, red móvil, abandono y retorno; no asumir que login/lobby acredita guardia. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### XP-COOP · XP y progresión

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-NOV;PC-12-20.

**Solicitud final:** Compartir en Cooperativo XP, débitos y pistas; participación pausa al salir y vuelve al reconectar; Competitivo conserva independencia.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** 7eed9e2 fija elegibilidad al cierre y pausa por salida. rewardFor usa hintLedger.count(doctorId), revelación y daño por actor: compartir todos los descuentos no está implementado.

**Archivos responsables:** `src/v5/clinical/guard-runtime.js`, `src/v5/clinical/guard-session.js`, `src/v5/clinical/clinical-hint-ledger.js`, `src/v5/server/clinical-reward.js`.

**Pruebas identificadas:** `src/v5/server/clinical-reward.test.js`, `src/v5/server/clinical-hints-durable.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/server/clinical-reward.test.js`, `src/v5/server/clinical-hints-durable.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Integrar política cooperativa solicitada y animación por recibo; documentar compatibilidad de recibos previos y causalidad de muerte.

**Criterio de aceptación:** Dos cooperantes reciben exactamente la política compartida vigente por evento, salida no gana cierres nuevos y rival no hereda pérdidas.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Integrar política cooperativa solicitada y animación por recibo; documentar compatibilidad de recibos previos y causalidad de muerte. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** 5/11 usuario pide compartir incluso pistas; 12/11 se añade pausa/resume. La implementación de créditos de cierre no sustituye el pedido de compartir penalizaciones.

**Condición recuperada/olvidada:** B: el resumen de XP compartida pierde la condición «incluidas pistas».

### DX-REVEAL · Diagnóstico y evaluación

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-09-10.

**Solicitud final:** Revelar diagnóstico correcto del caso por 50% XP, sin reemplazar impresión propia ni cerrar atención.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** 69a5a1f y SQL 20261112133500; fórmula floor(base*(100−5*n)/(reveal?200:100)), una revelación por médico/encuentro.

**Archivos responsables:** `src/v5/clinical/clinical-hint-ledger.js`, `src/v5/clinical/guard-session.js`, `src/v5/ui/case-debrief.js`.

**Pruebas identificadas:** `src/v5/clinical/clinical-hint-ledger.test.js`, `src/v5/server/clinical-hints-durable.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/clinical-hint-ledger.test.js`, `src/v5/server/clinical-hints-durable.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar preview/Android del HEAD, incluir composición con política cooperativa XP-COOP.

**Criterio de aceptación:** Doble toque/recarga no cobra dos veces; impresión permanece; desglose muestra composición exacta.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Aceptar preview/Android del HEAD, incluir composición con política cooperativa XP-COOP. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### FAM-01 · Familiares y acompañantes

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-NOV.

**Solicitud final:** Paciente incapaz activa familiar/enfermería con fuente explícita; acompañante seleccionable, respuestas/repreguntas y atribución propias.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** NEUR-06 tiene acompañante clínico interactuable; 3dc1390 separa antecedentes del informante. createWorld anota historyCompanion pero no crea un sprite familiar independiente.

**Archivos responsables:** `src/v5/clinical/patient-dialogue.js`, `src/v5/clinical/patient-conversation.js`, `src/v5/app/world.js`, `src/v5/ui/patient-actions.js`.

**Pruebas identificadas:** `src/v5/clinical/patient-dialogue.test.js`, `qa/v5/patient-dialogue-browser.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/patient-dialogue.test.js`. No repetidas aquí: `qa/v5/patient-dialogue-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Completar aparición/intervención espontánea donde haya informante declarado, segunda presentación y aceptación táctil; nunca inventar familiares.

**Criterio de aceptación:** Incapacidad verbal prevalece sobre personalidad; relato atribuible y contexto por médico sobreviven recarga sin hechos inventados.

**Causa / bloque:** Intenciones finitas y datos redactados; docencia antigua no migrada por completo; fuente indirecta limitada al contenido declarado. B3. **Dependencias:** B1/B2 para medición y checklist. **Impacto:** Completar aparición/intervención espontánea donde haya informante declarado, segunda presentación y aceptación táctil; nunca inventar familiares. **Riesgo:** medio. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### REC-01 · Recuperación de guardias

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-11-20;PC-12-20;U-AUDIT.

**Solicitud final:** Retomar, Finalizar y Después independientes; X/Escape/lobby disponibles; conservar progreso, sin imponer recuperación ni bloquear navegación.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P0. **Entorno:** MIXTA.

**Evidencia:** 8ea6be9, f35ba43 y 9404669 corrigen primer409/plazo/salida de 12s. Browser durable CI HEAD aprobado. CI Node 22 canceló tests por promesa sin event loop; local Node 24 pasa recuperación.

**Archivos responsables:** `src/v5/ui/guard-recovery.js`, `src/v5/app/application.js`, `src/v5/social/durable-cooperative-replica.js`, `src/v5/server/account-gateway.js`.

**Pruebas identificadas:** `src/v5/ui/guard-recovery.test.js`, `src/v5/social/durable-cooperative-replica.test.js`, `qa/v5/guard-recovery-browser.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/guard-recovery.test.js`, `src/v5/social/durable-cooperative-replica.test.js`. No repetidas aquí: `qa/v5/guard-recovery-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Investigar cancelación Node 22 y probar las cuentas/dispositivo del usuario con ACK perdido y red móvil. No hay P0 jugable reproducido aquí.

**Criterio de aceptación:** Después navega sin operación remota; Retomar/Finalizar acotados e idempotentes y no actúan sobre otra cuenta/guardia.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Investigar cancelación Node 22 y probar las cuentas/dispositivo del usuario con ACK perdido y red móvil. No hay P0 jugable reproducido aquí. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### SEL-00 · Interfaz clínica

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-09-10;U-AUDIT.

**Solicitud final:** Seleccionar cama/paciente directamente, sin esperas de recepción; mensajes y respuestas tardías conservan UID elegido.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Selección directa ya publicada; current intent no concede autorización y confirma vista del servidor. A→B y vistas tardías pasan localmente.

**Archivos responsables:** `src/v5/app/patient-selection.js`, `src/v5/app/application.js`, `src/v5/social/durable-cooperative-replica.js`.

**Pruebas identificadas:** `src/v5/app/patient-selection.test.js`, `src/v5/social/durable-cooperative-replica.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/app/patient-selection.test.js`, `src/v5/social/durable-cooperative-replica.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Medir espera de claim/foco en Android antes de otra modificación. No rehacer selección automática existente.

**Criterio de aceptación:** Toque A→B jamás envía pregunta a A ni muestra expediente de rival sin autorización.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Medir espera de claim/foco en Android antes de otra modificación. No rehacer selección automática existente. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Verificación 22/11/2026 — tanda de jugabilidad:** Revisión 22/11: la corrección compartida de identidad del DOM de recepción se documenta en COMP-01; no se ha cambiado asignación, proximidad ni autoridad para ocultar el timeout.

### DX-01 · Diagnóstico y evaluación

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-23;PC-09-10.

**Solicitud final:** Editor de impresión cierra con un envío; borrador recuperable, badge confirmado, doble toque y respuestas tardías seguros.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** d4a6ebd/991e152/a660c74 aíslan editor/UID/sesión; e6f9781 desbloquea expediente tras ACK. Pruebas locales pasan.

**Archivos responsables:** `src/v5/ui/clinical-controller.js`, `src/v5/ui/diagnostic-impression.js`, `src/v5/app/application.js`.

**Pruebas identificadas:** `src/v5/ui/diagnostic-impression.test.js`, `qa/v5/diagnosis-browser.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/diagnostic-impression.test.js`. No repetidas aquí: `qa/v5/diagnosis-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Preview con red perdida, nueva instancia del editor para mismo UID, borrado y Android físico.

**Criterio de aceptación:** No esperar red para cerrar editor, no cerrar uno nuevo por ACK viejo, error conserva borrador y badge refleja recibo.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Preview con red perdida, nueva instancia del editor para mismo UID, borrado y Android físico. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### UI-01 · Interfaz clínica

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;PC-SOCIAL.

**Solicitud final:** HUD profesional compacto, rueda accesible, recepción fija, marcador superior izquierdo y controles legibles sin tapar juego.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** 2b2cd4a marcador/HUD; bc543cd rueda en landscape corto; cinco vistas y 440 paneles documentados. Aprobación física no disponible.

**Archivos responsables:** `src/v5/web/game.css`, `src/v5/ui/patient-actions.js`, `src/v5/ui/guard-scoreboard.js`, `src/v5/app/application.js`.

**Pruebas identificadas:** `qa/tests/v5-guard-score-position.test.mjs`, `qa/v5/navigation-browser.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `qa/tests/v5-guard-score-position.test.mjs`. No repetidas aquí: `qa/v5/navigation-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Comprobar vertical/horizontal, banda libre menor a una fila, teclado abierto y toque monitor/Box2B.

**Criterio de aceptación:** Mapa usable, recepción y rueda no ocultan acciones ni envíos; marcador en posición pedida.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Comprobar vertical/horizontal, banda libre menor a una fila, teclado abierto y toque monitor/Box2B. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### SAFE-01 · Medicación y seguridad

**Fecha y origen:** ≤2026-11-11; fecha original no recuperada; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-CONTRATO;PC-08-14;PC-NOV.

**Solicitud final:** Ejecutar decisiones posibles aunque contraindicadas; dosis/vía/paciente/autor/tiempo verdaderos, alergias preexisten, rescate y daño causal.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** 3431230 separa susceptibilidad de preguntar; metadata blocked:false no inventa anafilaxia para intolerancia. Regresiones de libertad/daño pasan.

**Archivos responsables:** `src/v5/clinical/native-medication-eligibility.js`, `src/v5/clinical/medication-safety-487.js`, `src/v5/clinical/receipts.js`.

**Pruebas identificadas:** `src/v5/clinical/clinical-execution-freedom.test.js`, `src/v5/clinical/medication-harms-487.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/clinical-execution-freedom.test.js`, `src/v5/clinical/medication-harms-487.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar combinaciones, omisiones y rescates por mecanismo; alcance no es farmacología general universal.

**Criterio de aceptación:** Contraindicación influye consejo/consecuencia y calidad; límites técnicos se explican; replay no administra otra dosis.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Aceptar combinaciones, omisiones y rescates por mecanismo; alcance no es farmacología general universal. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### ARCH-02 · Arquitectura y motor clínico

**Fecha y origen:** 2026-10-15/16 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; MIG-PLAN.

**Solicitud final:** Un scheduler, un renderer y ciclo de vida, sin listeners/RAF duplicados al entrar/salir ni cambiar apariencia.

**Estado:** COMPLETADO Y VERIFICADO. **Prioridad:** P3. **Entorno:** MIXTA.

**Evidencia:** Frontera local aprueba un RAF; CI navegación y browser independiente HEAD aprueban.

**Archivos responsables:** `src/v5/app/application.js`, `src/v5/app/world.js`, `src/v5/render/hospital.js`.

**Pruebas identificadas:** `src/v5/app/build.test.js`, `src/v5/render/hospital.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/app/build.test.js`, `src/v5/render/hospital.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Mantener regresiones en cambios UI.

**Criterio de aceptación:** Cinco entradas/salidas no agregan loops ni cambian estado clínico.

**Causa / bloque:** Fondo hospitalario monolítico y malla; objetos/colliders independientes siguen siendo una propuesta. B7. **Dependencias:** B1; decisión visual pendiente para nuevo mapa. **Impacto:** Mantener regresiones en cambios UI. **Riesgo:** alto. **Esfuerzo:** 2–5 semanas para mapa modular completo.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### ARCH-03 · Arquitectura y motor clínico

**Fecha y origen:** 2026-10-07→16; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-07;MIG-PLAN.

**Solicitud final:** Build V5 autónomo: sin parches de strings sobre HTML, eval ni modificar golden master.

**Estado:** COMPLETADO Y VERIFICADO. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Build local 217 archivos y frontera pasan; no requiere HTML histórico.

**Archivos responsables:** `scripts/build-v5.mjs`, `scripts/audit-v5-boundary.mjs`.

**Pruebas identificadas:** `src/v5/app/build.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/app/build.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Conservar fuente original y rama exclusiva.

**Criterio de aceptación:** Build V5 se reproduce desde módulos y assets declarados.

**Causa / bloque:** Fixtures leen expedientes privados antes del claim; expectativas de rechazo incompatibles con libertad clínica; cambios NPO sin actualizar contrato de calidad. B0. **Dependencias:** ninguna. **Impacto:** Conservar fuente original y rama exclusiva. **Riesgo:** medio. **Esfuerzo:** 2–4 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### ARCH-04 · Arquitectura y motor clínico

**Fecha y origen:** 2026-10-15 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-15-23;MIG-PLAN.

**Solicitud final:** Organización modular inspirada en TFS, reutilizando lo funcional sin reconstruir cada sesión.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P3. **Entorno:** MIXTA.

**Evidencia:** Autoridad/puerto/módulos integrados. Coordinador application.js aún amplio (~1.700 líneas); esto no demuestra defecto por sí solo.

**Archivos responsables:** `src/v5/core/room-authority.js`, `src/v5/adapters/native-clinical-port.js`, `src/v5/app/application.js`.

**Pruebas identificadas:** `src/v5/core/room-authority.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/core/room-authority.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Refactorizar solo límite concreto medido, sin otro motor.

**Criterio de aceptación:** Sistemas nuevos comparten contratos y no reinician mapa, clínica o red.

**Causa / bloque:** Fondo hospitalario monolítico y malla; objetos/colliders independientes siguen siendo una propuesta. B7. **Dependencias:** B1; decisión visual pendiente para nuevo mapa. **Impacto:** Refactorizar solo límite concreto medido, sin otro motor. **Riesgo:** alto. **Esfuerzo:** 2–5 semanas para mapa modular completo.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### PHYS-01 · Fisiología y evolución temporal

**Fecha y origen:** 2026-10-10 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; LIB-FARMACOS;MIG-MANUAL.

**Solicitud final:** Cantidad cero/no válida no puede transformarse en dosis por defecto; unidades, g/kg, mg/kg, vía y formulación coherentes.

**Estado:** COMPLETADO Y VERIFICADO. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Fallos V4 documentados de 0→500ml; V5 valida dosis y exposición confirmada; tests de entrada inválida pasan.

**Archivos responsables:** `src/v5/clinical/native-medications.js`, `src/v5/clinical/medication-exposure.js`.

**Pruebas identificadas:** `src/v5/clinical/native-medications-packs.test.js`, `src/v5/clinical/medication-exposure.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/native-medications-packs.test.js`, `src/v5/clinical/medication-exposure.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Conservar límites por fármaco al ampliar catálogo.

**Criterio de aceptación:** Cero exposición genera cero efecto y cero administración confirmada.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Conservar límites por fármaco al ampliar catálogo. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### PHYS-02 · Fisiología y evolución temporal

**Fecha y origen:** 2026-10-10/16 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; LIB-FARMACOS;MIG-MANUAL.

**Solicitud final:** Bolus/infusión tienen inicio, exposición, descenso/retirada y contexto renal/hepático; no offsets terapéuticos permanentes universales.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Exposición, infusiones y retirada modeladas para familias cubiertas; no existe PK/PD general validada para todo el catálogo.

**Archivos responsables:** `src/v5/clinical/medication-exposure.js`, `src/v5/clinical/native-medications.js`, `src/v5/clinical/medication-harms-487.js`.

**Pruebas identificadas:** `src/v5/clinical/guard-session-infusion.test.js`, `src/v5/clinical/morphine-487.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/guard-session-infusion.test.js`, `src/v5/clinical/morphine-487.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Matriz por mecanismo/fármaco (ejecutable/efecto/retirada) y clearance específico cuando corresponda, sin trasladar constantes sin fuente.

**Criterio de aceptación:** Bolo se elimina e infusión responde a tasa/stop en mecanismos declarados; lo no modelado se explicita.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Matriz por mecanismo/fármaco (ejecutable/efecto/retirada) y clearance específico cuando corresponda, sin trasladar constantes sin fuente. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### PHYS-03 · Fisiología y evolución temporal

**Fecha y origen:** 2026-10-10→26; SOLICITUD DOCUMENTADA INDIRECTAMENTE; LIB-FARMACOS;DOC-QA26.

**Solicitud final:** Un dueño por efecto; antibiótico no mejora presión inmediatamente, heparina no reperfunde, oxígeno no oscila por feedback circular.

**Estado:** COMPLETADO Y VERIFICADO. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Informe26/10 y pruebas actualizadas limitan beneficios por mecanismo y administraciones, no órdenes.

**Archivos responsables:** `src/v5/clinical/native-additional-cases.js`, `src/v5/clinical/oxygen-physiology.js`, `src/v5/clinical/crystalloid-overload.js`.

**Pruebas identificadas:** `src/v5/clinical/legacy-pharmacology-sanity.test.js`, `src/v5/clinical/oxygen-physiology.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/legacy-pharmacology-sanity.test.js`, `src/v5/clinical/oxygen-physiology.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Conservar prueba de no doble efecto en cambios de terapia.

**Criterio de aceptación:** Entradas constantes no crean oscilación artificial ni bonus no relacionado.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Conservar prueba de no doble efecto en cambios de terapia. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### PHYS-04 · Fisiología y evolución temporal

**Fecha y origen:** 2026-10-10 (original indirecta); SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-08-14;LIB-STABILIZATION.

**Solicitud final:** Protección contra muerte prematura por reloj real activo, manteniendo evolución y administraciones reales.

**Estado:** COMPLETADO Y VERIFICADO. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** V5 conserva releaseAt=180+300*earnedCredit, exposición crítica nativa; muertes no se disparan por render.

**Archivos responsables:** `src/v5/clinical/survival-487-bridge.js`, `src/clinical/grace-survival-487.js`.

**Pruebas identificadas:** `src/v5/clinical/peritonitis-care.test.js`, `src/v5/clinical/tertiary-care.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/peritonitis-care.test.js`, `src/v5/clinical/tertiary-care.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Prueba física de tiempo de atención pertenece a ANDROID-01; no reintroducir vitales artificiales.

**Criterio de aceptación:** Muerte respeta protección acumulada, reloj y causa nativa; no por contar frames.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Prueba física de tiempo de atención pertenece a ANDROID-01; no reintroducir vitales artificiales. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Octubre pasó de 3+2 min a crédito máximo hasta 480s documentado. No se crean tareas separadas para cada versión temporal.

### PHYS-05 · Fisiología y evolución temporal

**Fecha y origen:** 2026-10-17→27; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-17-23;DOC-MORTALITY.

**Solicitud final:** Deterioro, rescate y muerte plausibles; no resurrección tras recargar y penalización solo por daño causal atribuible.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** El harness competitivo de mortalidad se corrigió en 7cde6fa: no observa fisiología privada antes del claim. El primer registro autorizado conserva su tiempo real. Muerte, reinicio SQLite, vitales/administraciones y rechazo post mortem pasan en Cooperativo y Competitivo.

**Archivos responsables:** `src/v5/clinical/survival-487-bridge.js`, `qa/v5/mortality-regression.mjs`.

**Pruebas identificadas:** `src/v5/clinical/mortality-regression.test.js`, `src/v5/clinical/native-death-room.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/mortality-regression.test.js`, `src/v5/clinical/native-death-room.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Mantener regresión del harness y aceptar escenarios adversos físicos cuando corresponda; no atribuir aceptación del teléfono a esta prueba Node.

**Criterio de aceptación:** Tras restauración, mismos vitales/administraciones/muerte, cero XP de cierre y rechazo post mortem.

**Causa / bloque:** Fixtures leen expedientes privados antes del claim; expectativas de rechazo incompatibles con libertad clínica; cambios NPO sin actualizar contrato de calidad. B0. **Dependencias:** ninguna. **Impacto:** Mantener regresión del harness y aceptar escenarios adversos físicos cuando corresponda; no atribuir aceptación del teléfono a esta prueba Node. **Riesgo:** medio. **Esfuerzo:** 2–4 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita. Checkpoint del 20/11: corrección dirigida de certificación publicada en 7cde6fa; no cambió reglas clínicas.

**Estado anterior conservado:** 162d0cf24a936e302e2a3efadcc168e1459d86d5 — IMPLEMENTADO CON DEFECTOS: 166 escenarios/62 muertes históricos; suite actual falla harness competitivo por leer liveVitals privado antes del claim. No prueba que muerte clínica esté rota.

### PHYS-06 · Fisiología y evolución temporal

**Fecha y origen:** 2026-10-04→23; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04;PC-17-23.

**Solicitud final:** Monitor, color/estado y síntomas cambian con fisiología observada; ECG sigue frecuencia/ritmo explícito, sin fingir medición diagnóstica.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Barrido4,5s/125Hz y ritmos explícitos; panel advierte trazado ilustrativo. No equivale a ECG diagnóstico de12derivaciones.

**Archivos responsables:** `src/v5/clinical/ecg-morphology.js`, `src/v5/clinical/patient-observations.js`, `src/v5/ui/ecg-sweep.js`.

**Pruebas identificadas:** `src/v5/clinical/ecg-morphology.test.js`, `src/v5/ui/ecg-sweep.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/ecg-morphology.test.js`, `src/v5/ui/ecg-sweep.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar trazado/color en pantalla real; ampliar solo ritmos autorados necesarios.

**Criterio de aceptación:** Lectura sin monitor no inventa medición y el audio sigue FC conocida.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Aceptar trazado/color en pantalla real; ampliar solo ritmos autorados necesarios. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### NUR-02 · Enfermería

**Fecha y origen:** 2026-10-03→14; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04;PC-08-14;LIB-CS412.

**Solicitud final:** Enfermera del box correcto y cola por paciente: vías plural=dos, monitor+Ringer+O2+antibióticos completos; paciente cambiado no redirige tarea.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** FIFO/journeyId/UID y recibos físicos integrados; no se completa hasta llegada y ejecución.

**Archivos responsables:** `src/v5/engine/nurse-dispatcher.js`, `src/v5/clinical/guard-session.js`, `src/clinical/nurse-scanner-487.js`.

**Pruebas identificadas:** `src/v5/engine/nurse-dispatcher.test.js`, `src/v5/clinical/physical-nursing.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/engine/nurse-dispatcher.test.js`, `src/v5/clinical/physical-nursing.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar combinadas en dos camas y teléfonos; distinguir retraso físico de silencio/timeout.

**Criterio de aceptación:** Todas las cláusulas admitidas dejan recibo verdadero en su paciente; preguntas/negación no administran.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Aceptar combinadas en dos camas y teléfonos; distinguir retraso físico de silencio/timeout. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### NUR-03 · Enfermería

**Fecha y origen:** 2026-10-10/30; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-08-14;PC-24-31.

**Solicitud final:** Recuperar Enfermería tras recarga, bloquear/desbloquear trayectos y reintentos sin atascar cola ni duplicar dosis.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Timeout de ruta inalcanzable y receipts idempotentes; CI nursing-recovery aprobado en55 casos.

**Archivos responsables:** `src/v5/engine/nurse-dispatcher.js`, `src/v5/clinical/guard-session.js`.

**Pruebas identificadas:** `src/v5/engine/nurse-dispatcher.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/engine/nurse-dispatcher.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Android con background/reload mientras hay tareas.

**Criterio de aceptación:** Ruta fallida libera recurso y explica fallo; replay mantiene una administración y permite reintento autorizado.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Android con background/reload mientras hay tareas. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### MED-01 · Medicación y seguridad

**Fecha y origen:** 2026-10-10/16; SOLICITUD DOCUMENTADA INDIRECTAMENTE; LIB-FARMACOS;MIG-MANUAL.

**Solicitud final:** Catálogo universal administrable separado de pertinencia; antibiótico nunca bloqueado por no ser el correcto para ese caso.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Libertad técnica cubierta, mecanismos no universales. Tests distinguen fármaco disponible y vía no implementada.

**Archivos responsables:** `src/v5/clinical/native-medication-eligibility.js`, `src/v5/clinical/pharmacology-catalog.js`.

**Pruebas identificadas:** `src/v5/clinical/native-medication-eligibility.test.js`, `src/v5/clinical/clinical-execution-freedom.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/native-medication-eligibility.test.js`, `src/v5/clinical/clinical-execution-freedom.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Auditar cobertura por molécula/forma/ruta y efectos; no deducir del tamaño de catálogo.

**Criterio de aceptación:** Orden posible llega a ejecutor; contraindicación no se convierte en permiso artificial.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Auditar cobertura por molécula/forma/ruta y efectos; no deducir del tamaño de catálogo. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### MED-02 · Medicación y seguridad

**Fecha y origen:** 2026-10-24→11-05 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-CONTRATO;PC-24-31;DOC-INVENTARIO.

**Solicitud final:** Ampicilina en endocarditis, tres pares de hemocultivos, alternativas de antibióticos y rescate tras reacción antes del traslado.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Casos/políticas y recibos conservan estas condiciones; matriz final HEAD aprueba. Correcciones históricas no equivalen a aceptación de todos los escenarios.

**Archivos responsables:** `src/v5/clinical/clinical-policy-closure.js`, `src/v5/clinical/studies.js`, `src/v5/content/packs/cardiology-pack.js`.

**Pruebas identificadas:** `src/v5/clinical/accepted-transfer.test.js`, `src/v5/clinical/studies-policy.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/accepted-transfer.test.js`, `src/v5/clinical/studies-policy.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Prueba dirigida de omisión, alternativa, reacción y recuperación con evidencia del segundo médico.

**Criterio de aceptación:** Servicio recibe con evidencia válida y no exige una terapia contraindicada; cultivos preservan pares/muestra.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Prueba dirigida de omisión, alternativa, reacción y recuperación con evidencia del segundo médico. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### DX-02 · Diagnóstico y evaluación

**Fecha y origen:** 2026-10-16 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; MIG-MANUAL.

**Solicitud final:** Autocompletar impresión diagnóstica desde catálogo global, sin filtrar por diagnóstico oculto; badge persistente y rival solo lectura.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Catálogo global/editor/UID y borrado probados; browser histórico cubre globalVocabulary.

**Archivos responsables:** `src/v5/ui/diagnostic-impression.js`, `src/v5/ui/clinical-controller.js`.

**Pruebas identificadas:** `src/v5/ui/diagnostic-impression.test.js`, `qa/v5/diagnosis-browser.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/diagnostic-impression.test.js`. No repetidas aquí: `qa/v5/diagnosis-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar en Android sobre contexto competitivo.

**Criterio de aceptación:** Buscador no revela caso; guardar propia hipótesis no se confunde con revelación pagada.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Aceptar en Android sobre contexto competitivo. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### DX-03 · Diagnóstico y evaluación

**Fecha y origen:** 2026-10-16→11-12; SOLICITUD DOCUMENTADA INDIRECTAMENTE; MIG-MANUAL;PC-12-20.

**Solicitud final:** Evaluación separa calidad de elegibilidad: diagnóstico, historia, seguridad, estudios, tratamiento/destino, eficiencia y eventos; desglose sumó/descontó/faltó.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Calidad0–100 y XP separadas; 36bf20f muestra crédito/débito acreditado. Nuevas reglas13/11 separan historia y consejos de cierre.

**Archivos responsables:** `src/v5/clinical/closure-debrief.js`, `src/v5/ui/case-debrief.js`, `src/clinical/case-completion-487.js`.

**Pruebas identificadas:** `src/v5/ui/case-debrief.test.js`, `src/v5/clinical/accepted-transfer.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/case-debrief.test.js`, `src/v5/clinical/accepted-transfer.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Revisar desglose por destino alternativo y animación en teléfono.

**Criterio de aceptación:** Omitir anamnesis baja nota, no bloquea por sí solo; XP viene de recibo, no del DOM.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Revisar desglose por destino alternativo y animación en teléfono. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### VEGA-02 · Dr. Vega

**Fecha y origen:** 2026-10-02/04→16; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-02;PC-03-04;MIG-MANUAL.

**Solicitud final:** Mentor Aprendiz docente multietapa: reconoce duda/hipótesis, pregunta razonamiento, ABC primero y memoria pedagógica, sin bucles.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** vegaGuidance actual orienta al botón de pista y explica límites/dosis; no conserva toda la conversación docente multietapa previa.

**Archivos responsables:** `src/v5/clinical/vega-guidance.js`, `src/v5/clinical/clinical-hints.js`, `src/v5/clinical/guard-session.js`.

**Pruebas identificadas:** `src/v5/core/nurse-diagnosis-speech.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/core/nurse-diagnosis-speech.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Migrar razonamiento y memoria existentes sobre la misma autoridad; no confundir selección de próxima acción con tutor completo.

**Criterio de aceptación:** «No sé» es duda, «¿qué significa?» es pregunta, no diagnóstico ni tratamiento; orientación se adapta al encuentro.

**Causa / bloque:** Intenciones finitas y datos redactados; docencia antigua no migrada por completo; fuente indirecta limitada al contenido declarado. B3. **Dependencias:** B1/B2 para medición y checklist. **Impacto:** Migrar razonamiento y memoria existentes sobre la misma autoridad; no confundir selección de próxima acción con tutor completo. **Riesgo:** medio. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** C/F: paridad docente incompleta; intención de eliminación no recuperable.

### VEGA-03 · Dr. Vega

**Fecha y origen:** 2026-10-02/04→16; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-02;PC-03-04;MIG-PLAN.

**Solicitud final:** Delegación «hazlo tú» y rescate docente limitado ante gravedad en Aprendiz, por órdenes reales, sin administrar automáticamente paciente estable.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Pista y soporte pedagógico existen; no se identificó ejecutor V5 de delegación física docente equivalente a C09 completo.

**Archivos responsables:** `src/v5/clinical/vega-guidance.js`, `src/v5/clinical/guard-session.js`.

**Pruebas identificadas:** `src/v5/core/nurse-diagnosis-speech.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/core/nurse-diagnosis-speech.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Recuperar política exacta y enlazar ejecución autorizada/receptores, conservar límites de modo.

**Criterio de aceptación:** Delegación explícita crea recibos reales; charla no cuenta como tratamiento; inactividad estable no dispara medicación.

**Causa / bloque:** Intenciones finitas y datos redactados; docencia antigua no migrada por completo; fuente indirecta limitada al contenido declarado. B3. **Dependencias:** B1/B2 para medición y checklist. **Impacto:** Recuperar política exacta y enlazar ejecución autorizada/receptores, conservar límites de modo. **Riesgo:** medio. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** C: docencia y delegación quedaron fuera del inventario reciente.

### XP-01 · XP y progresión

**Fecha y origen:** 2026-10-02→27; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-02;PC-24-31;DOC-RPG.

**Solicitud final:** Todos los modos puntúan, nivel y velocidad vienen de XP autoritativa, progreso persistente entre dispositivos.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Cuenta/recibos y curva saturada integradas; nivel1=184,5px/s tras ajuste−10%, no fórmula histórica205.

**Archivos responsables:** `src/v5/clinical/progression.js`, `src/v5/engine/movement-progression.js`, `src/v5/server/clinical-reward.js`.

**Pruebas identificadas:** `src/v5/clinical/progression.test.js`, `src/v5/server/account-movement.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/progression.test.js`, `src/v5/server/account-movement.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar progreso en teléfono con sesión recuperada; no convertir XP local sin verificar en cuenta.

**Criterio de aceptación:** Ningún cliente puede fabricar nivel, velocidad ni cobrar dos veces por cierre.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Aceptar progreso en teléfono con sesión recuperada; no convertir XP local sin verificar en cuenta. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Verificación 22/11/2026 — tanda de jugabilidad:** CIRR navegador: corregidas dos expectativas restantes en la segunda guardia. Se verifican 133 brutos, recibo −15, saldo persistido 118; una nueva guardia sin cerrar no devuelve la sanción. No se cambió el motor ni el débito. Prueba real de navegador pendiente de CI: Chromium local aborta por sockets no permitidos.

### XP-02 · XP y progresión

**Fecha y origen:** 2026-10-02 (indirecta); SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-02.

**Solicitud final:** Recompensas y personalización desbloqueable (bata/niveles), con nombre y color propios.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Selector/ropa y niveles existen; no se identificó mecanismo de desbloqueo de bata por nivel/recompensa en V5.

**Archivos responsables:** `src/v5/ui/avatar-creator.js`, `src/v5/app/avatar-appearance.js`, `src/v5/clinical/progression.js`.

**Pruebas identificadas:** `src/v5/ui/avatar-creator.test.js`, `src/v5/app/avatar-appearance.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/avatar-creator.test.js`, `src/v5/app/avatar-appearance.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Recuperar umbral/política si existe; implementar catálogo de recompensas sin inventar umbral histórico.

**Criterio de aceptación:** Recompensa persistente autoritativa y apariencia disponible según política documentada.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Recuperar umbral/política si existe; implementar catálogo de recompensas sin inventar umbral histórico. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** A: desbloqueo de vestimenta no está explícito en inventario recuperado.

### XP-03 · XP y progresión

**Fecha y origen:** 2026-11-09→12; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-09-10;DOC-INVENTARIO.

**Solicitud final:** Cambios de XP visibles y animados una vez por recibo; distinguir puntos clínicos, XP, penalización de pistas, alta y muerte.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Débitos/créditos visibles y desglose existen. No se demostró animación única compartida entre dispositivos para todos los eventos pedidos.

**Archivos responsables:** `src/v5/ui/guard-scoreboard.js`, `src/v5/ui/case-debrief.js`, `src/v5/app/application.js`.

**Pruebas identificadas:** `src/v5/ui/guard-scoreboard.test.js`, `src/v5/ui/case-debrief.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/guard-scoreboard.test.js`, `src/v5/ui/case-debrief.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Deduplicar animación por médico/recibo/dispositivo y verificar dos cuentas, pistas y reconexión.

**Criterio de aceptación:** Saldo coincide con recibos y recarga no vuelve a animar/créditar evento.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Deduplicar animación por médico/recibo/dispositivo y verificar dos cuentas, pistas y reconexión. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### COMP-01 · Competitivo

**Fecha y origen:** 2026-10-07→11-13; SOLICITUD DOCUMENTADA INDIRECTAMENTE; MIG-MANUAL;GIT-13.

**Solicitud final:** Competitivo2–4: primer contacto clínico válido toma propiedad; rivales no tratan ni ven expediente privado; cama liberada no filtra historia anterior.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** 33f85e3→f2b104a→775ccda reparan privacidad libre/liberada y visibilidad de camas; CI browser2/3/4 y matriz final aprueban.

**Archivos responsables:** `src/v5/clinical/guard-runtime.js`, `src/v5/app/patient-selection.js`.

**Pruebas identificadas:** `src/v5/server/competitive-durable.test.js`, `qa/tests/clinical-case-certification.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/server/competitive-durable.test.js`, `qa/tests/clinical-case-certification.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar red móvil y 2–4 cuentas; tests de fixtures que leen privado antes del claim fallan y deben corregirse.

**Criterio de aceptación:** Visibilidad pública de cama no concede historia privada; propiedad/XP nunca se duplican.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Aceptar red móvil y 2–4 cuentas; tests de fixtures que leen privado antes del claim fallan y deben corregirse. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Regresión de privacidad reproducida12/11, fix adicional13/11. El estado actual no se infiere del verde anterior.

**Condición recuperada/olvidada:** E: corrección de cama liberada no cubría cama nunca tomada.

**Verificación 22/11/2026 — tanda de jugabilidad:** Reproducido en Actions 44974712154: botón de recepción desprendido reiteradamente. Causa: comparar HTML serializado por el navegador (`disabled=""`) con HTML fuente (`disabled`). `updateReceptionBoard` conserva el subárbol entre snapshots equivalentes y actualiza el reloj sin reemplazarlo; invalida caché al cambiar de diálogo. Pruebas dirigidas de recepción: 5/5. Aceptación Chromium de cuatro médicos pendiente de CI del cambio.

### LOBBY-01 · Lobby y presencia

**Fecha y origen:** 2026-10-05→11-12; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-SOCIAL;DOC-RPG.

**Solicitud final:** Presencia disponible/en guardia/offline correcta, solicitudes visibles con contador y acceso a perfil al tocar avatar.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** a6fdc9d calcula disponibilidad, perfiles tienen avatar/nombre/nivel/casos/amigos/estado; invitaciones y avisos integrados.

**Archivos responsables:** `src/v5/ui/lobby-directory.js`, `src/v5/ui/player-profile-card.js`, `src/v5/server/account-gateway.js`.

**Pruebas identificadas:** `src/v5/ui/lobby-directory.test.js`, `src/v5/social/player-profile.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/lobby-directory.test.js`, `src/v5/social/player-profile.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Presencia tardía, regreso al lobby y notificación de amistad en teléfonos.

**Criterio de aceptación:** Invitar disponible y tocar jugador abre acciones sociales, no mención clínica.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Presencia tardía, regreso al lobby y notificación de amistad en teléfonos. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### SOCIAL-01 · Amigos y chat

**Fecha y origen:** 2026-10-05/20/30; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-SOCIAL.

**Solicitud final:** Chat privado de amigos separado del público/clínico, minimizable y usable durante guardia.

**Estado:** NO IMPLEMENTADO. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Tarjeta solo ofrece amistad/invitación; rutas sociales tienen lobby/chat y la guardia tiene Equipo/Actividad. No hay hilo directo de amigos integrado.

**Archivos responsables:** `src/v5/ui/player-profile-card.js`, `src/v5/app/application.js`, `src/social/qa-social-server.js`.

**Pruebas identificadas:** No identificadas; consultar criterio de aceptación..

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. Sin prueba automatizada identificada; ver evidencia documental y criterio de aceptación.

**Pendiente:** Implementar almacenamiento/ruta autorizada por participantes, bandeja, no leídos y control minimizable sin afectar clínica.

**Criterio de aceptación:** Dos amigos conversan en privado durante guardias distintas; no aparece en transcript clínico ni activa órdenes.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Implementar almacenamiento/ruta autorizada por participantes, bandeja, no leídos y control minimizable sin afectar clínica. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** A/C: Equipo fue presentado como mejora social, pero no satisface mensajes directos de amigos.

### SOCIAL-02 · Amigos y chat

**Fecha y origen:** 2026-10-20→11-11; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-SOCIAL;PC-11-20.

**Solicitud final:** Invitación unilateral llega y se acepta sin invitación mutua ni códigos; persistir aceptación y revocación entre instancias.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Aislamiento, TTL y 401/403/404 documentados; CI lobby y multiplayer HEAD aprueban.

**Archivos responsables:** `src/v5/social/cooperative-link.js`, `src/v5/social/room-membership-store.js`, `src/v5/server/supabase-account-store.js`.

**Pruebas identificadas:** `src/v5/server/supabase-social-room-persistence.test.js`, `src/v5/social/cooperative-link.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/server/supabase-social-room-persistence.test.js`, `src/v5/social/cooperative-link.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Teléfono de ambas cuentas con pestaña inactiva y presencia atrasada.

**Criterio de aceptación:** Una invitación basta; miembro revocado pierde acceso y no reentra por replay.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Teléfono de ambas cuentas con pestaña inactiva y presencia atrasada. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### CHAT-01 · Cooperativo

**Fecha y origen:** 2026-11 (fecha original parcial); SOLICITUD DOCUMENTADA INDIRECTAMENTE; U-AUDIT;DOC-INVENTARIO.

**Solicitud final:** Equipo y Actividad visibles y actualizados desde inicio; no esperar minutos ni llegada de todo de golpe.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Canales se renderizan desde communication; Equipo solo coop, actividad derivada de eventos. Browser compartido aprueba en HEAD, aceptación física falta.

**Archivos responsables:** `src/v5/clinical/guard-communication.js`, `src/v5/ui/guard-communication-view.js`, `src/v5/app/application.js`.

**Pruebas identificadas:** `src/v5/clinical/guard-communication.test.js`, `src/v5/ui/guard-communication-view.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/guard-communication.test.js`, `src/v5/ui/guard-communication-view.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Primer minuto en2–4 cuentas bajo red móvil: pertenencia, hydrate, stream de eventos y pestañas.

**Criterio de aceptación:** Mensaje de colega visible desde primer envío; actividad conserva orden/UID tras recuperar.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Primer minuto en2–4 cuentas bajo red móvil: pertenencia, hydrate, stream de eventos y pestañas. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### CHAT-02 · Interfaz clínica

**Fecha y origen:** 2026-10-01→14; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-01;PC-02;PC-08-14;MIG-MANUAL.

**Solicitud final:** Chat contextual RPG con burbujas y único historial clínico; paciente cercano por defecto, Enfermera/Vega por invocación; alcance por paredes.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Router de destinatarios/UID, memoria y oclusión integrados. Equipo/Actividad posteriores complementan; no sustituyen routing clínico.

**Archivos responsables:** `src/v5/core/speech-router.js`, `src/v5/ui/guard-chat-view.js`, `src/v5/ui/spatial-ward-speech.js`.

**Pruebas identificadas:** `src/v5/ui/spatial-ward-speech.test.js`, `src/v5/core/nurse-diagnosis-speech.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/spatial-ward-speech.test.js`, `src/v5/core/nurse-diagnosis-speech.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Probar proximidad, Box2B, paciente distinto y lectura de historial con teclado.

**Criterio de aceptación:** Solo interlocutor pertinente responde; tocar colega abre perfil; paciente no recibe orden de Equipo.

**Causa / bloque:** Intenciones finitas y datos redactados; docencia antigua no migrada por completo; fuente indirecta limitada al contenido declarado. B3. **Dependencias:** B1/B2 para medición y checklist. **Impacto:** Probar proximidad, Box2B, paciente distinto y lectura de historial con teclado. **Riesgo:** medio. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Historial único clínico inicial; petición posterior de Equipo/Actividad añade vistas. No interpretar historial único como prohibición vigente del canal solicitado después.

### TURN-01 · Guardia de 24 minutos

**Fecha y origen:** 2026-10-03/04→27; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04;PC-24-31;DOC-CONTINUIDAD.

**Solicitud final:** 24min reales=24h simuladas, ingresos dinámicos y varios pacientes; reloj sobrevive lag/teclado/recarga sin acelerar farmacología indebidamente.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** 1440s y seis admisiones; tiempo nativo .12/.03 min/s separado. CI full-guard24h pasa; dos cuentas1.456s pared documentadas12/11.

**Archivos responsables:** `src/v5/clinical/guard-clock.js`, `src/v5/clinical/shift-flow.js`, `src/v5/clinical/guard-runtime.js`.

**Pruebas identificadas:** `src/v5/clinical/guard-day-clock.test.js`, `src/v5/clinical/shift-flow-chaos.test.js`, `qa/v5/full-guard-24h.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/guard-day-clock.test.js`, `src/v5/clinical/shift-flow-chaos.test.js`. No repetidas aquí: `qa/v5/full-guard-24h.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar turno completo del preview actual en teléfono; no repetir reloj real local sin cambio que lo justifique.

**Criterio de aceptación:** No se pierden pacientes/órdenes al terminar; no confundir clock HUD con cinética.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Aceptar turno completo del preview actual en teléfono; no repetir reloj real local sin cambio que lo justifique. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### TURN-02 · Guardia de 24 minutos

**Fecha y origen:** 2026-11 (original parcial); SOLICITUD DOCUMENTADA INDIRECTAMENTE; U-AUDIT;DOC-INVENTARIO.

**Solicitud final:** Al finalizar, continuar otra guardia o guardar y salir, conservando pacientes/progreso y decisión por participante.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** continue/leave/resume idempotentes; continuación necesita decisiones de participantes activos y extiende mismo runtime.

**Archivos responsables:** `src/v5/clinical/guard-turn-control.js`, `src/v5/app/application.js`.

**Pruebas identificadas:** `src/v5/clinical/guard-turn-continuity.test.js`, `qa/v5/guard-recovery-browser.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/guard-turn-continuity.test.js`. No repetidas aquí: `qa/v5/guard-recovery-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar consenso2 cuentas, salida de uno, desconexión y siguiente turno en Android.

**Criterio de aceptación:** Continuar extiende turno sin duplicar cierre/XP; guardar no fuerza reingreso ni borra atención.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Aceptar consenso2 cuentas, salida de uno, desconexión y siguiente turno en Android. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### SELECT-01 · Selección de guardias y especialidades

**Fecha y origen:** 2026-10-04→27; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04;PC-24-31;DOC-GUARDSELECTION.

**Solicitud final:** Selección cualquier caso/especialidad/patología, evitar revelar enfermedad al azar, multiplicadores actuales×1,5/×1,2/×1,0.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Selección y SQL27/10,137/otras pruebas históricas; multiplicador persistido autoritativo, no precio desde cliente.

**Archivos responsables:** `src/v5/clinical/guard-selection-policy.js`, `src/v5/app/application.js`, `src/v5/server/clinical-reward.js`.

**Pruebas identificadas:** `src/v5/server/guard-selection-integration.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/server/guard-selection-integration.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar UI en teléfono y que no filtre diagnóstico en selección general.

**Criterio de aceptación:** Tipo de guardia restaura mismo alcance/multiplicador; patología explícita sí permite conocerla.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Aceptar UI en teléfono y que no filtre diagnóstico en selección general. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** ×5/×3/×1 de4/10 fue sustituido explícitamente por×1,5/×1,2/×1,0 el27/10; no son dos pendientes.

### SELECT-OLD · Selección de guardias y especialidades

**Fecha y origen:** 2026-10-04→27; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04;PC-24-31.

**Solicitud final:** Multiplicadores iniciales×5/×3/×1.

**Estado:** REEMPLAZADO. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Especificación posterior27/10 usada por catálogo/SQL.

**Archivos responsables:** `src/v5/clinical/guard-selection-policy.js`.

**Pruebas identificadas:** `src/v5/server/guard-selection-integration.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/server/guard-selection-integration.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Ninguna tarea; conservar antecedente en SELECT-01.

**Criterio de aceptación:** No reintroducir multiplicadores antiguos.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Ninguna tarea; conservar antecedente en SELECT-01. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** Sustituido por SELECT-01; fila histórica excluida del total de pendientes.

### UI-02 · Interfaz clínica

**Fecha y origen:** 2026-10-03/14; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04;PC-SOCIAL.

**Solicitud final:** Cada monitor pertenece a su cama; monitor faltante interactuable; Box2B, examen táctil y camas nuevas sincronizados.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Ocho camas/puntos de interacción; 440 paneles documentados. No hay censo actual de un toque por todos54controles originales.

**Archivos responsables:** `src/v5/engine/interactions.js`, `src/v5/app/world.js`, `src/v5/ui/clinical-controller.js`, `src/v5/content/beds.json`.

**Pruebas identificadas:** `src/v5/engine/interactions.test.js`, `src/v5/ui/clinical-bedside-ux.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/engine/interactions.test.js`, `src/v5/ui/clinical-bedside-ux.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Censo accionable de controles faltantes y aceptación Box2B Android+PC.

**Criterio de aceptación:** Toque abre el paciente/monitor correcto y segundo ingreso aparece en todos.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Censo accionable de controles faltantes y aceptación Box2B Android+PC. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### EXAM-01 · Interfaz clínica

**Fecha y origen:** 2026-10-04→26; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04;DOC-QA26;MIG-MANUAL.

**Solicitud final:** Examen anatómico por órgano/técnica, ALiCIA/Glasgow, tacto rectal como maniobra; resultados en panel, sin narrarlos Enfermería ni repetir globos.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** 26/10 paridad de examen100/100 y FECAL periné/tacto; UI no simula estudio de Enfermería.

**Archivos responsables:** `src/v5/clinical/observations.js`, `src/v5/ui/clinical-controller.js`, `src/v5/ui/clinical-panels.js`.

**Pruebas identificadas:** `src/v5/clinical/physical-exam.test.js`, `src/v5/ui/examination-feedback.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/physical-exam.test.js`, `src/v5/ui/examination-feedback.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar maniobras/scroll/proximidad y acceso físico a todos los controles.

**Criterio de aceptación:** Maniobra deja hallazgo del paciente y no adelanta fisiología ni añade diagnóstico por ausencia de dato.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Aceptar maniobras/scroll/proximidad y acceso físico a todos los controles. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### WORLD-01 · Mundo RPG, movimiento y gráficos

**Fecha y origen:** 2026-10-01→27; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-01;PC-02;PC-15-23;DOC-RPG.

**Solicitud final:** Preservar mapa/personajes HD/proporciones, piernas y orientación; cambiar nombre/ropa sin teleportar ni vibrar cámara.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P3. **Entorno:** MIXTA.

**Evidencia:** Interpolación/colisiones/ropa live; recursosHD/navy corregidos, nivel1−10% vigente; no se rediseñaron por auditoría.

**Archivos responsables:** `src/v5/app/world.js`, `src/v5/app/avatar-appearance.js`, `src/v5/render/hospital.js`.

**Pruebas identificadas:** `src/v5/app/avatar-appearance.test.js`, `src/v5/engine/navigation.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/app/avatar-appearance.test.js`, `src/v5/engine/navigation.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar marcha local/remota en dispositivo físico y zoom.

**Criterio de aceptación:** Aspecto original y movimiento continuo; cambio de ropa conserva posición/cámara.

**Causa / bloque:** Fondo hospitalario monolítico y malla; objetos/colliders independientes siguen siendo una propuesta. B7. **Dependencias:** B1; decisión visual pendiente para nuevo mapa. **Impacto:** Aceptar marcha local/remota en dispositivo físico y zoom. **Riesgo:** alto. **Esfuerzo:** 2–5 semanas para mapa modular completo.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### WORLD-02 · Mundo RPG, movimiento y gráficos

**Fecha y origen:** 2026-10-06→23; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-07;PC-SOCIAL.

**Solicitud final:** Corregir remoto entrecortado, retroceso, repetición de ruta, desaparición y asimetría;2–4 jugadores.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Reutiliza continuidad/generación/scope; CI2/3/4 pasa; Android físico/WAN no certificados.

**Archivos responsables:** `src/social/remote-motion.js`, `src/v5/app/world.js`, `src/v5/social/room-motion-scope.js`.

**Pruebas identificadas:** `src/social/remote-motion-continuity.test.js`, `src/social/remote-generation-order.test.js`, `qa/v5/competitive-browser.mjs`.

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. No repetidas aquí: `src/social/remote-motion-continuity.test.js`, `src/social/remote-generation-order.test.js`, `qa/v5/competitive-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Reproducir con RTT/jitter reales y medir salto remoto; no aplicar la misma solución al lag local sin traza.

**Criterio de aceptación:** No se confunde pose de lobby con guardia y no desaparece remoto autorizado.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Reproducir con RTT/jitter reales y medir salto remoto; no aplicar la misma solución al lag local sin traza. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### WORLD-03 · Mundo RPG, movimiento y gráficos

**Fecha y origen:** 2026-10-12/26; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-24-31;LIB-SQM.

**Solicitud final:** Migrar fondo+malla a mapa modular SQM32×32 con objetos, colisiones y física propias, una autoridad y sin bitmap final monolítico.

**Estado:** NO IMPLEMENTADO. **Prioridad:** P3. **Entorno:** MIXTA.

**Evidencia:** LIB-SQM se declara borrador/no implementado. Juego aún renderiza hospital.webp sobre malla; no hay catálogo de instancias completo.

**Archivos responsables:** `src/v5/content/hospital.json`, `src/v5/engine/navigation.js`, `src/v5/render/hospital.js`.

**Pruebas identificadas:** `src/v5/engine/navigation.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/engine/navigation.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aprobar arte del prototipo y plan de migración compatible; no tratar32 familias propuestas como32 solicitudes individuales.

**Criterio de aceptación:** Colisión nace de objetos autorados y acceso a8camas/recepción se conserva sin segundo mapa.

**Causa / bloque:** Fondo hospitalario monolítico y malla; objetos/colliders independientes siguen siendo una propuesta. B7. **Dependencias:** B1; decisión visual pendiente para nuevo mapa. **Impacto:** Aprobar arte del prototipo y plan de migración compatible; no tratar32 familias propuestas como32 solicitudes individuales. **Riesgo:** alto. **Esfuerzo:** 2–5 semanas para mapa modular completo.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** A/C: propuesta independiente omitida por inventario clínico reciente.

### WORLD-04 · Mundo RPG, movimiento y gráficos

**Fecha y origen:** 2026-10-26 (indirecta); SOLICITUD DOCUMENTADA INDIRECTAMENTE; LIB-SQM.

**Solicitud final:** Puertas/cortinas/visión/sonido/mobiliario/cama-monitor y rutas NPC comparten geometría; separar mundo de fisiología, XP y reloj.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P3. **Entorno:** MIXTA.

**Evidencia:** Puertas/oclusión actuales pasan pruebas; asociación cama-monitor declarada. Física de catálogo modular y objetos móviles no implementada.

**Archivos responsables:** `src/v5/engine/navigation.js`, `src/v5/engine/interactions.js`, `src/v5/ui/spatial-ward-speech.js`.

**Pruebas identificadas:** `src/v5/engine/navigation.test.js`, `src/v5/ui/spatial-ward-speech.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/engine/navigation.test.js`, `src/v5/ui/spatial-ward-speech.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Completar tras WORLD-03; mantener transformaciones/anclajes de huellas rotadas y nav única.

**Criterio de aceptación:** Cambiar puerta actualiza paso/visión/audio; no mueve estado clínico por renderer.

**Causa / bloque:** Fondo hospitalario monolítico y malla; objetos/colliders independientes siguen siendo una propuesta. B7. **Dependencias:** B1; decisión visual pendiente para nuevo mapa. **Impacto:** Completar tras WORLD-03; mantener transformaciones/anclajes de huellas rotadas y nav única. **Riesgo:** alto. **Esfuerzo:** 2–5 semanas para mapa modular completo.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### WORLD-05 · Mundo RPG, movimiento y gráficos

**Fecha y origen:** 2026-10-03 (indirecta); SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04.

**Solicitud final:** Café cierra chat antes de caminar; recepción muestra cola, box y responsables; señal sobre paciente/monitor disponible.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P3. **Entorno:** MIXTA.

**Evidencia:** Recepción y glow disponibles integrados; no se identificó acción de café en el coordinador V5.

**Archivos responsables:** `src/v5/ui/reception-board.js`, `src/v5/ui/bedside-guidance.js`, `src/v5/app/application.js`.

**Pruebas identificadas:** `src/v5/ui/reception-board.test.js`, `src/v5/ui/bedside-guidance.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/reception-board.test.js`, `src/v5/ui/bedside-guidance.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Recuperar aceptación del gesto de café y decidir su migración; mantener recepción ya funcional.

**Criterio de aceptación:** Recepción coherente en4 modos; acción de café existente no camina con teclado tapando mundo.

**Causa / bloque:** Fondo hospitalario monolítico y malla; objetos/colliders independientes siguen siendo una propuesta. B7. **Dependencias:** B1; decisión visual pendiente para nuevo mapa. **Impacto:** Recuperar aceptación del gesto de café y decidir su migración; mantener recepción ya funcional. **Riesgo:** alto. **Esfuerzo:** 2–5 semanas para mapa modular completo.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** A/C: acción de café heredada sin ruta V5 identificable.

### AUDIO-01 · Audio y música

**Fecha y origen:** 2026-10-29; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-24-31;DOC-AUDIO.

**Solicitud final:** Música nueva inicio/lobby y clásica predeterminada guardia; ajuste Nueva/Clásica, click en menús, mute permanente solo música y preferencias.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** f6ba34f integra audio, crossfade2,5s/silencio250ms y assetAAC. Escucha física sigue pendiente.

**Archivos responsables:** `src/v5/ui/hospital-audio.js`, `src/v5/ui/audio-assets.js`, `src/v5/ui/audio-settings.js`, `src/v5/app/application.js`.

**Pruebas identificadas:** `src/v5/ui/hospital-audio.test.js`, `src/v5/ui/audio-assets.test.js`, `qa/v5/audio-browser.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/hospital-audio.test.js`, `src/v5/ui/audio-assets.test.js`. No repetidas aquí: `qa/v5/audio-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Escuchar Android/parlante, comprobar autoplay tras gesto, mute y preferencias anteriores.

**Criterio de aceptación:** Música cambia sin corte accidental; mutear música conserva efectos; menú click una vez.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Escuchar Android/parlante, comprobar autoplay tras gesto, mute y preferencias anteriores. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### AUDIO-02 · Audio y música

**Fecha y origen:** 2026-10-03/04/27; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04;PC-SOCIAL;DOC-RPG.

**Solicitud final:** Máster y canales ajustables, volumen predeterminado más alto, sin ruido blanco; monitores cercanos siguen FC real, alarmas no saturan.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Valor inicial0,74 documentado27/10; eventos/monitores/eco finito; preferencias guardadas no se sobreescriben.

**Archivos responsables:** `src/v5/ui/hospital-audio.js`, `src/v5/ui/audio-settings.js`.

**Pruebas identificadas:** `src/v5/ui/hospital-audio.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/hospital-audio.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar volumen percibido Android y límites de alarma en guardia larga.

**Criterio de aceptación:** Audio se suspende al ocultar página sin acumular eventos; ajuste antiguo se respeta.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Aceptar volumen percibido Android y límites de alarma en guardia larga. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### VOICE-01 · Voz, teclado y autocompletado

**Fecha y origen:** 2026-10-06/08→16; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-07;PC-08-14;MIG-PLAN.

**Solicitud final:** Dictado Android por mismo router: inicio ágil, no duplicar primera palabra/onresult+onend, diagnóstico de voz y Enter único.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Módulos históricos existen y C10 sigue pendiente; application/index V5 no conectan entrada de dictado ni micrófono. Tests legacy no prueban rutaV5.

**Archivos responsables:** `src/voice/revision-buffer.js`, `src/voice/android-v2-active-adapter.test.js`, `src/v5/app/application.js`, `src/v5/web/index.html`.

**Pruebas identificadas:** `src/voice/revision-buffer.test.js`, `src/voice/android-v2-active-adapter.test.js`.

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. No repetidas aquí: `src/voice/revision-buffer.test.js`, `src/voice/android-v2-active-adapter.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Conectar captura/normalizador→submitText una vez, lifecycle y permisos; validar Gboard/SpeechRecognition físicos.

**Criterio de aceptación:** Un audio final produce un envelope con UID, sin primera palabra doble ni micrófono persistente al salir.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Conectar captura/normalizador→submitText una vez, lifecycle y permisos; validar Gboard/SpeechRecognition físicos. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** C/F: funcionalidad previa sin integración en V5; eliminación accidental no demostrada.

### VOICE-02 · Voz, teclado y autocompletado

**Fecha y origen:** 2026-10-06/07; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-07;PC-SOCIAL.

**Solicitud final:** Voz entre jugadores/PTT en lobby y4 modos donde corresponda; WebRTC/TURN/Android físico y separación de dictado.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Subsistema voice-session histórico; no se identificó controlV5/PTT/canal de voz activo. Transporte RTC de datos no demuestra voz.

**Archivos responsables:** `src/social/voice-session.js`, `src/v5/social/cooperative-link.js`, `src/v5/app/application.js`.

**Pruebas identificadas:** `src/social/voice-session.test.js`.

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. No repetidas aquí: `src/social/voice-session.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Migrar sesión de voz existente y probar audio bidireccional físico; infraestructura TURN no verificada.

**Criterio de aceptación:** Dos teléfonos oyen al colega correcto, mute/PTT funciona y salida no deja captura activa.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Migrar sesión de voz existente y probar audio bidireccional físico; infraestructura TURN no verificada. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** C: voz social no figura como pendiente independiente en inventario anterior.

### KEYBOARD-01 · Voz, teclado y autocompletado

**Fecha y origen:** 2026-10-01→16; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-01;PC-08-14;MIG-PLAN.

**Solicitud final:** Teclado propio compacto aprobado,4 filas, edición/foco/IME y envío; no tapar input/historial ni desplazar/teletransportar juego.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Teclado propio reemplaza preferencia inicial de nativo; Chromium/mobile UI y CI pasan.

**Archivos responsables:** `src/v5/ui/atria-keyboard.js`, `src/v5/app/application.js`, `src/v5/web/game.css`.

**Pruebas identificadas:** `src/v5/ui/atria-keyboard.test.js`, `qa/v5/keyboard-camera-browser.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/atria-keyboard.test.js`. No repetidas aquí: `qa/v5/keyboard-camera-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Gboard real en campos nativos, rotación, caret, borrar, Enter y botón enviar.

**Criterio de aceptación:** Una pulsación envía una vez y conserva mensajes/borradores; cámara usa región disponible.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Gboard real en campos nativos, rotación, caret, borrar, Enter y botón enviar. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** 1/10 teclado normal;14–16/10 preferencia explícita teclado propio compacto. No hay dos implementaciones pendientes alternativas.

### KEYBOARD-OLD · Voz, teclado y autocompletado

**Fecha y origen:** 2026-10-01→16; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-01;PC-08-14;MIG-PLAN.

**Solicitud final:** Teclado nativo como única entrada del juego.

**Estado:** REEMPLAZADO. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Decisión posterior de teclado propio documentada en plan de migración.

**Archivos responsables:** `src/v5/ui/atria-keyboard.js`.

**Pruebas identificadas:** `src/v5/ui/atria-keyboard.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/atria-keyboard.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Ninguna tarea; campos nativos deben seguir siendo accesibles.

**Criterio de aceptación:** No revertir teclado aprobado por una preferencia anterior.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Ninguna tarea; campos nativos deben seguir siendo accesibles. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Sustituido por KEYBOARD-01; excluido de pendientes activos.

### ANDROID-01 · Android y rendimiento

**Fecha y origen:** 2026-10-04→11-20; SOLICITUD DOCUMENTADA INDIRECTAMENTE; LIB-ANDROID;PC-08-14;DOC-INVENTARIO;U-AUDIT.

**Solicitud final:** Aceptar en teléfono físico teclado, monitor/Box2B, audio, pistas, recuperación y multijugador bajo red real.

**Estado:** NO VERIFICABLE. **Prioridad:** P1. **Entorno:** BLOQUEADA.

**Evidencia:** Solo emulación Pixel/Chromium y reportes usuario; no hay dispositivo físico accesible ni captura con modelo/versión que certifique arreglo actual.

**Archivos responsables:** `qa/v5/navigation-browser.mjs`, `qa/v5/guard-recovery-browser.mjs`, `qa/v5/guard-entry-preview.mjs`.

**Pruebas identificadas:** `qa/v5/keyboard-camera-browser.mjs`, `qa/v5/shared-guard-preview.mjs`.

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. No repetidas aquí: `qa/v5/keyboard-camera-browser.mjs`, `qa/v5/shared-guard-preview.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Dispositivo/cuentas concretas. Work tampoco sustituye hardware ausente.

**Criterio de aceptación:** Registrar modelo/navegador/orientación/red, SHA y latencias del primer contacto, pista, selección/diagnóstico y recuperación.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** Dispositivo/cuentas concretas. Work tampoco sustituye hardware ausente. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### ANDROID-02 · Android y rendimiento

**Fecha y origen:** 2026-10-16→11-12; SOLICITUD DOCUMENTADA INDIRECTAMENTE; MIG-PLAN;DOC-INVENTARIO.

**Solicitud final:** Comprobar WebKit/iPhone y restricciones de audio/viewport cuando se declara soporte móvil.

**Estado:** NO VERIFICABLE. **Prioridad:** P2. **Entorno:** BLOQUEADA.

**Evidencia:** Documentos dejan WebKit/físico pendientes; no se ejecutaron aquí.

**Archivos responsables:** `qa/v5/navigation-browser.mjs`, `qa/v5/audio-browser.mjs`.

**Pruebas identificadas:** `qa/v5/navigation-browser.mjs`.

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. No repetidas aquí: `qa/v5/navigation-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** RunnerWebKit/dispositivo y navegador compatibles.

**Criterio de aceptación:** Mismo flujo legible y sin captura/audio/teclado bloqueados en entorno declarado.

**Causa / bloque:** Módulos históricos de voz sin entrada V5; teclado y Web Audio emulados no certifican IME, parlante ni red móvil. B5. **Dependencias:** B1; permisos de audio; Android físico. **Impacto:** RunnerWebKit/dispositivo y navegador compatibles. **Riesgo:** medio/alto. **Esfuerzo:** 5–10 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### BOTS-01 · Bots médicos

**Fecha y origen:** 2026-10-02→11-12; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-02;PC-03-04;PC-24-31;DOC-INVENTARIO.

**Solicitud final:** Bots experto/competente/principiante/lento/peligroso y omisiones con velocidades/conocimiento distintos; usar motor y comandos reales en4 modos.

**Estado:** COMPLETADO Y VERIFICADO. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** MatrizHEAD43435355500 aprobada8 shards; testsQA actuales pasan salvo fixture longitudinal independiente.

**Archivos responsables:** `qa/v5/certify-clinical-cases.mjs`, `qa/v5/clinical-integral-matrix.mjs`, `qa/v5/personality-anamnesis-bots.mjs`.

**Pruebas identificadas:** `qa/tests/clinical-case-certification.test.mjs`, `qa/tests/clinical-integral-matrix.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `qa/tests/clinical-case-certification.test.mjs`, `qa/tests/clinical-integral-matrix.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Mantener perfiles adversos y evidencia causal; no usar texto de bot como prueba de efecto.

**Criterio de aceptación:** Diferenciar final vivo abierto/muerte/cierre y persistir evidencia por semilla/SHA.

**Causa / bloque:** Fixtures leen expedientes privados antes del claim; expectativas de rechazo incompatibles con libertad clínica; cambios NPO sin actualizar contrato de calidad. B0. **Dependencias:** ninguna. **Impacto:** Mantener perfiles adversos y evidencia causal; no usar texto de bot como prueba de efecto. **Riesgo:** medio. **Esfuerzo:** 2–4 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### BOTS-02 · Bots médicos

**Fecha y origen:** 2026-10-04 (indirecta); SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-04.

**Solicitud final:** Intentar TestSprite y preparar entorno para auditoría de roles/modos mientras Work termina.

**Estado:** NO VERIFICABLE. **Prioridad:** P3. **Entorno:** BLOQUEADA.

**Evidencia:** Recuperación indica solicitud de intento; no hay evidencia de ejecución TestSprite ni decisión posterior de sustituir proveedor.

**Archivos responsables:** `qa/v5/certify-clinical-cases.mjs`.

**Pruebas identificadas:** No identificadas; consultar criterio de aceptación..

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. Sin prueba automatizada identificada; ver evidencia documental y criterio de aceptación.

**Pendiente:** No obliga a instalar servicio ni pagar. Recuperar resultado del intento; bots existentes cumplen pruebas técnicas de otro origen.

**Criterio de aceptación:** Registrar resultado auténtico del intento o limitación de acceso, sin atribuirle ejecuciones de otros bots.

**Causa / bloque:** No hay transcripciones completas ni correspondencia literal individual de 1–60; documentos antiguos conservan estados de su SHA. B8. **Dependencias:** historial completo/exportación disponible. **Impacto:** No obliga a instalar servicio ni pagar. Recuperar resultado del intento; bots existentes cumplen pruebas técnicas de otro origen. **Riesgo:** bajo. **Esfuerzo:** 1–3 días tras obtener fuentes.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### CASE-01 · Importación de casos

**Fecha y origen:** 2026-10-01→28; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-01;PC-24-31;DOC-CONTRATO.

**Solicitud final:** Importar desde libro/contenido conservando procedencia; al menos un caso por tema/capítulo solicitado, sin generar patologías fuera del motor.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P1. **Entorno:** BLOQUEADA.

**Evidencia:** Importador/catálogo55 con fuentes por pack. No se recuperó libro completo ni índice exhaustivo de capítulos solicitado el1/10.

**Archivos responsables:** `scripts/import-clinical-case-pack.mjs`, `src/v5/content/compile-clinical-case-pack.js`, `src/v5/content/certified-case-packs.json`.

**Pruebas identificadas:** `scripts/import-clinical-case-pack.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `scripts/import-clinical-case-pack.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Comparar índice real del libro con catálogo antes de prometer cobertura total; contrato5capas obligatorio.

**Criterio de aceptación:** Cada caso tiene fuente/versión y recorrido jugable; sin fuente no afirmar cobertura de capítulo.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Comparar índice real del libro con catálogo antes de prometer cobertura total; contrato5capas obligatorio. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** A: cobertura por libro no equivale a tener55 casos.

### CASE-02 · Importación de casos

**Fecha y origen:** 2026-10-16→28; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-15-23;PC-24-31;DOC-CONTRATO.

**Solicitud final:** Completar sistemas primero; después expansión autorizada a55 casos (10respiratorios/10cardio/10neuro nuevos), usando reglas comunes.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** 55 catálogo jugable y30 nuevos publicados28/10; matrizHEAD aprobada. La prohibición temporal de nuevos casos fue sustituida por autorización posterior.

**Archivos responsables:** `src/v5/content/certified-case-packs.json`, `src/v5/content/packs/respiratory-pack.js`, `src/v5/content/packs/cardiology-pack.js`, `src/v5/content/packs/neurology-pack.js`.

**Pruebas identificadas:** `qa/tests/clinical-case-certification.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `qa/tests/clinical-case-certification.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Mantener certificación, no tomar antiguos planes de13/25 casos como HEAD actual.

**Criterio de aceptación:** Los55 usan núcleo/capas y selección ordinaria; no dobles motores por especialidad.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Mantener certificación, no tomar antiguos planes de13/25 casos como HEAD actual. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** 16/10 no nuevos casos durante migración;27–28/10 expansión explícita posterior. No es infracción de la restricción ya sustituida.

### VAR-01 · Variabilidad clínica

**Fecha y origen:** 2026-10-24→29; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-24-31;DOC-CONTRATO.

**Solicitud final:** Identidad/edad/comorbilidades/severidad/alergias/evolución con semillas reproducibles, sin contradicciones fijas y persistiendo por paciente.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Bancos1251/1405 documentados; nuevo13/11 conserva susceptibilidad aun sin preguntas. Tests reproducibilidad pasan.

**Archivos responsables:** `src/v5/content/patient-variation.js`, `src/v5/content/guard-patient-variation.js`, `src/v5/content/patient-name-bank.js`.

**Pruebas identificadas:** `src/v5/content/patient-variation.test.js`, `src/v5/content/guard-patient-variation.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/content/patient-variation.test.js`, `src/v5/content/guard-patient-variation.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Validar plausibilidad de nuevas variantes y banco de antecedentes, sin confundir volumen combinatorio con aceptación clínica.

**Criterio de aceptación:** Misma semilla/checkpoint conserva hechos; edad/antecedentes no contradicen condición inmutable.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Validar plausibilidad de nuevas variantes y banco de antecedentes, sin confundir volumen combinatorio con aceptación clínica. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### VAR-02 · Variabilidad clínica

**Fecha y origen:** 2026-10-29→11-12; SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-CONTRATO;DOC-INVENTARIO.

**Solicitud final:** Personalidad multidimensional y relación por médico heredadas automáticamente; conversación específica se combina sin cambiar hechos.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** 7cde6fa comprueba ausencia de personalidad privada antes del claim y conservación posterior en cuatro modos, replay y recuperación del servidor. Pruebas dirigidas 26/26, sin modificar contenido ni privacidad.

**Archivos responsables:** `src/v5/content/patient-behavior.js`, `src/v5/content/patient-language.js`, `src/v5/clinical/patient-conversation.js`, `qa/tests/patient-personality-longitudinal.test.mjs`.

**Pruebas identificadas:** `qa/tests/patient-personality-longitudinal.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `qa/tests/patient-personality-longitudinal.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar naturalidad, contexto por médico y recuperación de personalidad en dispositivo físico; mantener la restricción de datos antes de tomar la cama.

**Criterio de aceptación:** No adquirir datos clínicos sin permiso; tras tomar, conducta/relación persisten y otro médico tiene contexto propio.

**Causa / bloque:** Fixtures leen expedientes privados antes del claim; expectativas de rechazo incompatibles con libertad clínica; cambios NPO sin actualizar contrato de calidad. B0. **Dependencias:** ninguna. **Impacto:** Aceptar naturalidad, contexto por médico y recuperación de personalidad en dispositivo físico; mantener la restricción de datos antes de tomar la cama. **Riesgo:** medio. **Esfuerzo:** 2–4 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita. Checkpoint del 20/11: corrección dirigida de certificación publicada en 7cde6fa; no cambió reglas clínicas.

**Estado anterior conservado:** 162d0cf24a936e302e2a3efadcc168e1459d86d5 — IMPLEMENTADO CON DEFECTOS: Motor integrado, banco y memoria; test competitivo falla al leer conducta antes de claim ahora privado. Persistencia después del claim no se invalida por esa lectura incorrecta.

### VAR-03 · Variabilidad clínica

**Fecha y origen:** 2026-10-28→11-13; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-24-31;DOC-CONTRATO;GIT-13.

**Solicitud final:** Complicaciones, prevención y rescate causales; alergia≠intolerancia, no preguntar no cambia susceptibilidad.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** 3431230 y162d0cf cambian hechos/recibos de rescate; certificador observa ventanas realistas, no inserta respuesta.

**Archivos responsables:** `src/v5/content/guard-patient-variation.js`, `src/v5/clinical/complication-eligibility.js`, `src/v5/clinical/medication-safety-487.js`.

**Pruebas identificadas:** `src/v5/clinical/medication-harms-487.test.js`, `qa/tests/clinical-case-certification.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/medication-harms-487.test.js`, `qa/tests/clinical-case-certification.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar trayectorias adversas de variantes nuevas y distinguir no activada/tratada/rescatada.

**Criterio de aceptación:** Rescate se atribuye solo a intervención confirmada tras oportunidad real o prevención temprana modelada.

**Causa / bloque:** Cobertura mecanística acotada: catálogo/metadata, administración, exposición y efecto no son equivalentes. B6. **Dependencias:** B0/B2 y referencias del caso. **Impacto:** Aceptar trayectorias adversas de variantes nuevas y distinguir no activada/tratada/rescatada. **Riesgo:** alto. **Esfuerzo:** 5–10 días por conjunto de mecanismos.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### QA-01 · Certificación y pruebas

**Fecha y origen:** 2026-10-07→11-20; SOLICITUD DOCUMENTADA INDIRECTAMENTE; MIG-PLAN;DOC-INVENTARIO;RUN-HEAD;ISSUE-01.

**Solicitud final:** Pruebas pertinentes ejecutadas y CI por SHA; no llamar terminado al código publicado o a test no corrido.

**Estado:** IMPLEMENTADO CON DEFECTOS. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Base 162d0cf: 3164/3167 local, CI Experimental 28/30 y Transfers 7/11. Corrección 7cde6fa: suite local completa 3167/3167 y 26/26 dirigidas; recuperación Node 24, 24/24. El estado final del nuevo CI se registra por run/SHA: no se infiere verde global de Node local ni de Vercel.

**Archivos responsables:** `.github/workflows/atria-v5-core.yml`, `.github/workflows/atria-v5-integral.yml`, `.github/workflows/atria-v5-transfers.yml`.

**Pruebas identificadas:** `qa/tests/patient-personality-longitudinal.test.mjs`, `src/v5/clinical/nursing-nutrition.test.js`, `src/v5/clinical/mortality-regression.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `qa/tests/patient-personality-longitudinal.test.mjs`, `src/v5/clinical/nursing-nutrition.test.js`, `src/v5/clinical/mortality-regression.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Reproducir cancelaciones Node 22, revisar certificación de traslados y obtener conclusión de CI del código publicado. El perfilado de red no debe ocultar fallos deterministas.

**Criterio de aceptación:** Registros identifican ámbito ySHA; una suite fallida nunca se describe como aprobada.

**Causa / bloque:** Fixtures leen expedientes privados antes del claim; expectativas de rechazo incompatibles con libertad clínica; cambios NPO sin actualizar contrato de calidad. B0. **Dependencias:** ninguna. **Impacto:** Reproducir cancelaciones Node 22, revisar certificación de traslados y obtener conclusión de CI del código publicado. El perfilado de red no debe ocultar fallos deterministas. **Riesgo:** medio. **Esfuerzo:** 2–4 días.

**Evolución y sustituciones:** Resultados3137del 12/11 no describen162d0cf del 13/11; matriz43289556288 terminó6/8, luego43435355500sí8/8. El 20/11 se corrigieron tres fixtures/harness en 7cde6fa; no se modificaron reglas clínicas. Suite final completa aprobada.

**Verificación 22/11/2026 — tanda de jugabilidad:** CI previa 44974712154 recuperada: 28/30 SUCCESS; fallaban CIRR navegador (dos aserciones restantes bruto/neto) y Competitivo 4 (DOM inestable). Correcciones dirigidas sin borrar pruebas, sin subir el timeout ni devolver XP. No declarar la nueva CI verde hasta observar su conclusión.

### QA-02 · Certificación y pruebas

**Fecha y origen:** 2026-10-07→11-13; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-07;DOC-INVENTARIO;RUN-HEAD.

**Solicitud final:** Aceptar preview del mismoSHA,2–4 cuentas, recuperación, cuatro modos y controles; conservar fallos/reintentos sin repetir campañas costosas.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** CIbrowserHEAD mayoritariamente verde; previews previos por SHA documentados. No se abrió preview nuevo ni se crearon cuentas aquí. Nuevo run 44847181991 falla al esperar que el preview sirva la autoridad/aplicación/audio/CSS del checkout, antes de aceptación funcional; no demuestra un defecto de navegación del jugador.

**Archivos responsables:** `qa/v5/guard-entry-preview.mjs`, `qa/v5/shared-guard-preview.mjs`, `qa/v5/shared-guard-auth-browser.mjs`.

**Pruebas identificadas:** `qa/v5/shared-guard-preview.mjs`.

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. No repetidas aquí: `qa/v5/shared-guard-preview.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptación dirigida solo para contrato modificado ySHAactual; cuota429de tercera cuenta histórica no prueba fallo de clínica.

**Criterio de aceptación:** Enlace/metadataSHAytraza demuestran flujo exacto; emulación no se declara Android físico.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Aceptación dirigida solo para contrato modificado ySHAactual; cuota429de tercera cuenta histórica no prueba fallo de clínica. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### QA-03 · Certificación y pruebas

**Fecha y origen:** 2026-10-30→11-20; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-24-31;RUN-HEAD.

**Solicitud final:** Certificar traslados correctos/erróneos, preparación, diagnóstico omitido/equivocado, rescate y cierre con libertad clínica vigente.

**Estado:** IMPLEMENTADO CON DEFECTOS. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** 4 perfiles fallan por «missing initial refusal»; no se puede asumir misma política de rechazo para alta insegura registrada y destino seguro sin anamnesis. En el nuevo código 7cde6fa, run 44847181875 conserva 4 perfiles fallidos de 11; el log wrong-dx certifica 47/55 y 8 fallan por missing initial refusal.

**Archivos responsables:** `qa/v5/transfer-certification.mjs`, `.github/workflows/atria-v5-transfers.yml`.

**Pruebas identificadas:** `qa/tests/clinical-case-certification.test.mjs`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `qa/tests/clinical-case-certification.test.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Separar rechazo técnico, decisión insegura ejecutada y cierre válido; investigar efectos reales antes de ajustar expectativas.

**Criterio de aceptación:** Prueba adversa exige consecuencias/recepción/XP acordes; no reinstala gate clínico antiguo para hacerCIverde.

**Causa / bloque:** Fixtures leen expedientes privados antes del claim; expectativas de rechazo incompatibles con libertad clínica; cambios NPO sin actualizar contrato de calidad. B0. **Dependencias:** ninguna. **Impacto:** Separar rechazo técnico, decisión insegura ejecutada y cierre válido; investigar efectos reales antes de ajustar expectativas. **Riesgo:** medio. **Esfuerzo:** 2–4 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### DEPLOY-01 · Despliegue y persistencia

**Fecha y origen:** 2026-10-01→11-20; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-01;MIG-PLAN;U-AUDIT;ISSUE-01.

**Solicitud final:** Gratis para usuarios, sin Replit; publicar solo experimental y no modificar main/V4/estables ni sobrescribir trabajo concurrente.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Rama dedicada y servicios Vercel/Supabase existentes. El estado Vercel de 7cde6fa es failure con enlace deployment-blocked; Issue #1 lo atribuye a cuota Hobby. No acredita por sí solo caída de una versión previa. El registro de CI/preview se conserva separado de la suite local.

**Archivos responsables:** `vercel.json`, `src/v5/server/account-gateway.js`, `docs/ATRIA-5-CHATGPT-HANDOFF.md`.

**Pruebas identificadas:** No identificadas; consultar criterio de aceptación..

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. Sin prueba automatizada identificada; ver evidencia documental y criterio de aceptación.

**Pendiente:** Resolver la disponibilidad de un preview utilizable y aceptar su entrada real cuando el servicio permita desplegar; medir consumo antes de comparar planes. No migrar proveedor ni contratar servicios por esta auditoría.

**Criterio de aceptación:** Publicación queda en experimental; no se promete ausencia universal de límites gratuitos del proveedor.

**Causa / bloque:** No hay transcripciones completas ni correspondencia literal individual de 1–60; documentos antiguos conservan estados de su SHA. B8. **Dependencias:** Servicios de despliegue disponibles para aceptación pública; cambios en GitHub no dependen de restablecer cuota.. **Impacto:** Resolver la disponibilidad de un preview utilizable y aceptar su entrada real cuando el servicio permita desplegar; medir consumo antes de comparar planes. No migrar proveedor ni contratar servicios por esta auditoría. **Riesgo:** bajo. **Esfuerzo:** 1–3 días tras obtener fuentes.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita. Issue #1 del 20/11 añade diagnóstico de cuota y comparación de costo posterior a medición; no autoriza migración.

### AUTH-01 · Despliegue y persistencia

**Fecha y origen:** 2026-10-27 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-24-31;DOC-WELCOME;DOC-RPG.

**Solicitud final:** Bienvenida con ilustración original sin globosDr/Darío; nombre único normalizado/reserva atómica, personalización y contraseña≥12; volver desde otro dispositivo.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P2. **Entorno:** MIXTA.

**Evidencia:** Registro/login/cookieHttpOnly y renovación/sesiones documentados27/10; no se recuperó comparación visual física de arte aprobado.

**Archivos responsables:** `src/v5/ui/welcome-flow.js`, `src/v5/server/account-gateway.js`, `src/v5/server/supabase-account-store.js`, `src/v5/content/assets/welcome-doctors.webp`.

**Pruebas identificadas:** `src/v5/server/account-gateway.test.js`, `src/v5/server/account-clinical-integration.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/server/account-gateway.test.js`, `src/v5/server/account-clinical-integration.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar ilustración/creación/volver/migración de cuenta en móvil y otro dispositivo.

**Criterio de aceptación:** Nombre único ignora mayúsculas/tildes según contrato, no duplica actor; contraseñas/tokens no se guardan en cliente.

**Causa / bloque:** Elegibilidad de crédito y ayudas se resuelven por actor; falta el hilo de mensajes directos entre amigos en el flujo V5. B4. **Dependencias:** B1; política XP del usuario. **Impacto:** Aceptar ilustración/creación/volver/migración de cuenta en móvil y otro dispositivo. **Riesgo:** alto. **Esfuerzo:** 4–7 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### AUTH-02 · Despliegue y persistencia

**Fecha y origen:** 2026-10-18→27; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-17-23;DOC-RPG.

**Solicitud final:** Persistencia multiinstanciaCAS/RLS, controlador único por cuenta, transferencia explícita de dispositivo, no perder amigos/XP históricos.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Supabase reemplaza Blob suspendido; cercados y migraciones versionados; XP local no verificada se conserva como historial.

**Archivos responsables:** `src/v5/server/postgres-guard-store.js`, `src/v5/server/supabase-account-store.js`, `src/v5/server/durable-guard-authority.js`.

**Pruebas identificadas:** `src/v5/server/durable-guard-authority.test.js`, `src/v5/server/account-gateway.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/server/durable-guard-authority.test.js`, `src/v5/server/account-gateway.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar sesiones del usuario, caducidad y nueva instancia con red móvil.

**Criterio de aceptación:** Solicitud vieja no reabre guardia liberada ni mueve otro actor; progreso previo se conserva sin fabricarXP.

**Causa / bloque:** Operaciones serializadas, CAS, plazos/reintentos y selección confirmada; causa dominante en teléfono todavía sin traza. B1. **Dependencias:** B0 para certificación. **Impacto:** Aceptar sesiones del usuario, caducidad y nueva instancia con red móvil. **Riesgo:** alto. **Esfuerzo:** 3–6 días + aceptación física.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### SCALE-01 · Lobby y presencia

**Fecha y origen:** 2026-10-16→27 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; MIG-PLAN;MIG-MANUAL.

**Solicitud final:** Escalar lobby con vecindad/interés y datos privados, sin difundir mapa/historias a todos; guardar hasta4por guardia.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P3. **Entorno:** MIXTA.

**Evidencia:** Directorio/presencia autorizados y aislamiento implementados;600 actores virtuales históricos no son600 clientes reales.

**Archivos responsables:** `src/v5/social/presence-storage.js`, `src/v5/social/room-motion-scope.js`, `src/v5/server/account-gateway.js`.

**Pruebas identificadas:** `src/v5/social/cooperative-link.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/social/cooperative-link.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Carga medida y presupuesto por sala antes de prometer lobby masivo/TURN/WAN.

**Criterio de aceptación:** Solo vecinos reciben movimiento pertinente; datos clínicos permanecen en sala autorizada.

**Causa / bloque:** Fondo hospitalario monolítico y malla; objetos/colliders independientes siguen siendo una propuesta. B7. **Dependencias:** B1; decisión visual pendiente para nuevo mapa. **Impacto:** Carga medida y presupuesto por sala antes de prometer lobby masivo/TURN/WAN. **Riesgo:** alto. **Esfuerzo:** 2–5 semanas para mapa modular completo.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### CONT-01 · Continuidad y recuperación histórica

**Fecha y origen:** 2026-10-07→11-20; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-03-07;MIG-PLAN;U-AUDIT.

**Solicitud final:** Checkpoints pequeños, informes/SHA/pruebas reales, continuar autónomamente sin rehacer; recuperar Work publicado aunque no haya respuesta final.

**Estado:** COMPLETADO Y VERIFICADO. **Prioridad:** P1. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Historial completo de rama2152 commits enventana;HEAD13/11 incluye8 cambios posteriores aúltimohandoff12/11.

**Archivos responsables:** `docs/ATRIA-5-CHATGPT-HANDOFF.md`, `docs/ATRIA-5-EXACT-CONTINUATION.md`, `docs/ATRIA-5-REMAINING-TASKS.md`.

**Pruebas identificadas:** No identificadas; consultar criterio de aceptación..

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. Sin prueba automatizada identificada; ver evidencia documental y criterio de aceptación.

**Pendiente:** Mantener práctica en cada sesión; recursos locales no son continuidad durable hasta publicar.

**Criterio de aceptación:** Antes de editar compararHEAD, no inferir pérdida por pantalla Work cargando y dejar siguiente tareaejecutable.

**Causa / bloque:** No hay transcripciones completas ni correspondencia literal individual de 1–60; documentos antiguos conservan estados de su SHA. B8. **Dependencias:** historial completo/exportación disponible. **Impacto:** Mantener práctica en cada sesión; recursos locales no son continuidad durable hasta publicar. **Riesgo:** bajo. **Esfuerzo:** 1–3 días tras obtener fuentes.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### CONT-02 · Continuidad y recuperación histórica

**Fecha y origen:** 2026-11-20 (solicitud original actual); SOLICITUD ORIGINAL RECUPERADA; U-AUDIT.

**Solicitud final:** Recuperar listado literal1–60 y todosloschats/ejecuciones del período, conservar correcciones sin inventarlas.

**Estado:** NO VERIFICABLE. **Prioridad:** P1. **Entorno:** BLOQUEADA.

**Evidencia:** Inventario recuperado solo conoce correspondencias por rango; navegadorChatGPTsin login y extractoscontextualesparciales. Fechas/títuloscompletosno recuperables.

**Archivos responsables:** `docs/ATRIA-5-HISTORICAL-AUDIT-OCT-NOV-2026.md`, `docs/ATRIA-5-REQUIREMENTS-TRACEABILITY.md`.

**Pruebas identificadas:** No identificadas; consultar criterio de aceptación..

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. Sin prueba automatizada identificada; ver evidencia documental y criterio de aceptación.

**Pendiente:** Requiere fuentes conversacionales completas accesibles; no bloquear auditoría/repo ni fabricar60títulos.

**Criterio de aceptación:** Cada texto original obtenido se enlaza aIDestable o se marca no recuperable; nuncanombrar conversación no abierta como revisada completa.

**Causa / bloque:** No hay transcripciones completas ni correspondencia literal individual de 1–60; documentos antiguos conservan estados de su SHA. B8. **Dependencias:** historial completo/exportación disponible. **Impacto:** Requiere fuentes conversacionales completas accesibles; no bloquear auditoría/repo ni fabricar60títulos. **Riesgo:** bajo. **Esfuerzo:** 1–3 días tras obtener fuentes.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### CONT-03 · Continuidad y recuperación histórica

**Fecha y origen:** 2026-11-20 (hallazgo técnico); INFERENCIA TÉCNICA; LOCAL-WORK;GIT-13.

**Solicitud final:** Recuperar modificaciones locales de Work y distinguir equivalencia ya publicada de código huérfano.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P2. **Entorno:** CHATGPT NORMAL.

**Evidencia:** Dosworkspacescon cambios sin commit; ledgerreveal/compiler ya se encuentran en HEAD. rtc-diagnostics.mjslocalno está versionado ydiagnósticosbrowserdifieren.

**Archivos responsables:** `qa/v5/browser-harness.mjs`, `qa/v5/certify-clinical-cases.mjs`, `src/v5/clinical/clinical-policy-registry.js`.

**Pruebas identificadas:** No identificadas; consultar criterio de aceptación..

**Ejecución comprobada:** Sin prueba de esta entrada incluida en la suite local. Sin prueba automatizada identificada; ver evidencia documental y criterio de aceptación.

**Pendiente:** Comparar porcomportamiento/hunk, preservar solo auxiliares útiles y no aplicar parches antiguos sobre código actual.

**Criterio de aceptación:** No sepierdeunapeticiónnilarecuperaciónrevierte8 fixes publicados; hipótesis de trabajos perdidos se etiquetan.

**Causa / bloque:** No hay transcripciones completas ni correspondencia literal individual de 1–60; documentos antiguos conservan estados de su SHA. B8. **Dependencias:** historial completo/exportación disponible. **Impacto:** Comparar porcomportamiento/hunk, preservar solo auxiliares útiles y no aplicar parches antiguos sobre código actual. **Riesgo:** bajo. **Esfuerzo:** 1–3 días tras obtener fuentes.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Condición recuperada/olvidada:** G: hay material local no publicado; no todo representa funcionalidad pendiente.

### CLIN-HEPAT-01 · Estudios y resultados

**Fecha y origen:** 2026-11 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; DOC-INVENTARIO;DOC-HANDOFF.

**Solicitud final:** HEPAT-001: una adquisición con INR y glucemia satisface ambas evidencias; no repetir por alias ni por pista.

**Estado:** COMPLETADO Y VERIFICADO. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Prueba nativa HEPAT requests g_encef_liver/g_hepat_inr conserva una orden, espera informe INR 1,2/glucemia normal y permite avanzar a alta; pasa en suite local.

**Archivos responsables:** `src/v5/clinical/gastro-expansion-policies.js`, `src/v5/clinical/study-evidence.js`, `src/v5/clinical/clinical-hints.test.js`.

**Pruebas identificadas:** `src/v5/clinical/clinical-hints.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/clinical-hints.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Conservar como regresión específica de LAB-01 y VEGA-COHERENCE-01; no es otro parche independiente.

**Criterio de aceptación:** Solicitud, resultado, Ruta clínica y Vega comparten una muestra y un criterio cumplido.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Conservar como regresión específica de LAB-01 y VEGA-COHERENCE-01; no es otro parche independiente. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Resolver conjuntamente con:** LAB-01, VEGA-COHERENCE-01.

### CLIN-CARD08-01 · Diagnóstico y evaluación

**Fecha y origen:** 2026-10-30 (documentada); SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-24-31;DOC-INVENTARIO.

**Solicitud final:** CARD-08: disección Stanford A corresponde a Cirugía cardiovascular, no exigir betabloqueo contraindicado por hipotensión para derivar.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Receptor cardiovascular y excepciones contextuales en evaluador compartido; transferencia urgente con impresión equivocada cubierta. No equivale a realizar reparación aórtica.

**Archivos responsables:** `src/v5/content/packs/cardiology-pack.js`, `src/v5/clinical/clinical-policy-closure.js`, `src/v5/clinical/consultation-evidence.js`.

**Pruebas identificadas:** `src/v5/clinical/receiver-transfer-contract.test.js`, `src/v5/clinical/clinical-policy-closure.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/receiver-transfer-contract.test.js`, `src/v5/clinical/clinical-policy-closure.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Aceptar variante hipotensa/deteriorada y alternativa ETE, sin debilitar estabilización que sí corresponda.

**Criterio de aceptación:** Hallazgos/recepción justifican destino y la pista no pide tratamiento inseguro como llave de cierre.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Aceptar variante hipotensa/deteriorada y alternativa ETE, sin debilitar estabilización que sí corresponda. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Resolver conjuntamente con:** CLOSE-01, VEGA-COHERENCE-01.

### CLIN-VARIX-01 · Diagnóstico y evaluación

**Fecha y origen:** 2026-10-30→11-04; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-24-31;PC-NOV;DOC-INVENTARIO.

**Solicitud final:** VARIX-001: estabilización y derivación endoscópica/UTI alcanzables; evitar reevaluación manual oculta y XP duplicada.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Política distingue soporte confirmado, terlipresina/ceftriaxona y aceptación de receptor; Work documentó corrección del cierre. Suite actual de transferencias nativas pasa.

**Archivos responsables:** `src/v5/clinical/gastro-expansion-policies.js`, `src/v5/clinical/guard-session.js`, `src/v5/clinical/transfer-continuation.js`.

**Pruebas identificadas:** `src/v5/clinical/automatic-transfer-runtime.test.js`, `src/v5/clinical/accepted-transfer.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/automatic-transfer-runtime.test.js`, `src/v5/clinical/accepted-transfer.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Repetir secuencia exacta del reporte en teléfono solo si hay reproducción; nunca afirmar ligadura realizada.

**Criterio de aceptación:** Después de mínimos indispensables un único destino válido genera un cierre/XP y Vega no mantiene una reevaluación invisible.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Repetir secuencia exacta del reporte en teléfono solo si hay reproducción; nunca afirmar ligadura realizada. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Resolver conjuntamente con:** CLOSE-01, NUR-04.

### CLIN-HDA-01 · Diagnóstico y evaluación

**Fecha y origen:** 2026-10-28→30; SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-24-31;DOC-INVENTARIO.

**Solicitud final:** HDA-001 y hemorragia variceal no deben confundirse; soporte, terapia y destino conservan reglas propias.

**Estado:** IMPLEMENTADO, PENDIENTE DE ACEPTACIÓN. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Catálogo y evaluadores separados; reportes de octubre pidieron ambos casos. No se recuperó toda la redacción original de cada corrección clínica.

**Archivos responsables:** `src/v5/clinical/additional-case-care.js`, `src/v5/clinical/gastro-expansion-policies.js`, `src/v5/clinical/diagnostic-assessment.js`.

**Pruebas identificadas:** `src/v5/ui/diagnostic-impression.test.js`, `src/v5/clinical/accepted-transfer.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/ui/diagnostic-impression.test.js`, `src/v5/clinical/accepted-transfer.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Proteger por regresión etología/hipótesis/terapia/recepción con las fuentes del caso, sin copiar tratamientos de VARIX a toda HDA.

**Criterio de aceptación:** Motor y evaluación reconocen evidencia y tratamiento propios; no se da un beneficio por solo decir un diagnóstico.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Proteger por regresión etología/hipótesis/terapia/recepción con las fuentes del caso, sin copiar tratamientos de VARIX a toda HDA. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

**Resolver conjuntamente con:** CLOSE-01, SAFE-01.

### NUR-04 · Enfermería

**Fecha y origen:** 2026-11-04 (indirecta); SOLICITUD DOCUMENTADA INDIRECTAMENTE; PC-NOV;DOC-HANDOFF.

**Solicitud final:** Enfermería automatiza reevaluaciones rutinarias; el médico decide conductas y no debe descubrir comandos ocultos para poder cerrar.

**Estado:** PARCIALMENTE IMPLEMENTADO. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Continuación de traslado y reevaluación de salida existen; todavía hay cues que piden reevaluación cuando faltan requisitos. No se demostró automatización universal de todo control rutinario.

**Archivos responsables:** `src/v5/ui/clinical-workflow.js`, `src/v5/clinical/guard-session.js`, `src/v5/clinical/transfer-continuation.js`.

**Pruebas identificadas:** `src/v5/clinical/automatic-transfer-runtime.test.js`, `src/v5/clinical/accepted-transfer.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/clinical/automatic-transfer-runtime.test.js`, `src/v5/clinical/accepted-transfer.test.js`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Distinguir medición rutinaria, reevaluación clínica deliberada y condición indispensable por caso; ligar la primera a Enfermería/recibo sin fabricar examen médico.

**Criterio de aceptación:** No bloqueos ocultos ni datos inventados; si una decisión médica es imprescindible, Vega explica la acción ejecutable.

**Causa / bloque:** Confundir muestra con alias, diagnóstico con aptitud de traslado, calidad con requisito indispensable y decisión con ejecución. B2. **Dependencias:** B0; recibos existentes. **Impacto:** Distinguir medición rutinaria, reevaluación clínica deliberada y condición indispensable por caso; ligar la primera a Enfermería/recibo sin fabricar examen médico. **Riesgo:** alto. **Esfuerzo:** 4–8 días.

**Evolución y sustituciones:** Vigente; no se recuperó sustitución explícita.

### PERF-01 · Android y rendimiento

**Fecha y origen:** 2026-11-20 21:58:18 America/Argentina/Buenos_Aires; SOLICITUD DOCUMENTADA INDIRECTAMENTE; ISSUE-01.

**Solicitud final:** Medir tráfico y CPU antes de optimizar: lobby/sala/guardia/reconexión con 1, 2 y 4 clientes; distinguir movimiento, señalización WebRTC y clínica durable; cambio mínimo con flag OFF, rollback y comparación reproducible.

**Estado:** NO IMPLEMENTADO. **Prioridad:** P1. **Entorno:** MIXTA.

**Evidencia:** Issue #1 leído íntegro y sin comentarios. Código confirma presencia/roster 260 ms, mensajes 320 ms, sala 1000 ms y clínica 900 ms, sujetos a solicitudes en vuelo. No se identificó un perfil reproducible completo por endpoint, fase y 1/2/4 clientes ni medición causal de CPU. Las cadencias no son una medición de consumo.

**Archivos responsables:** `src/v5/social/cooperative-link.js`, `src/v5/social/durable-cooperative-replica.js`.

**Pruebas identificadas:** `qa/v5/shared-guard-auth-browser.mjs`, `src/v5/social/durable-cooperative-replica.test.js`.

**Ejecución comprobada:** Incluidas y aprobadas en la suite local 7cde6fa: `src/v5/social/durable-cooperative-replica.test.js`. No repetidas aquí: `qa/v5/shared-guard-auth-browser.mjs`. La ejecución de un archivo no prueba por sí sola todos los criterios de la solicitud; preview, multicuenta externa y Android se declaran por separado.

**Pendiente:** Medir requests por endpoint/minuto, p50/p95, CPU si está disponible, errores y duplicados; validar 2/4 clientes, desconexión, progreso, chat, Enfermería, Vega, XP y recuperación en cuatro modos. Comparar costo después de aceptar métricas; no atribuir 4h13m de CPU exclusivamente a ATRIA.

**Criterio de aceptación:** Misma carga y batería antes/después; menor consumo medido sin peor fluidez ni latencia, integridad clínica intacta. Flag desactivado por defecto y rollback al comportamiento previo. Sin migración, cambio de cadencias o despliegue de producción no justificado.

**Causa / bloque:** Falta de línea base por endpoint/fase/carga; polling social, señalización y clínica son responsabilidades diferentes. B1. **Dependencias:** B0: CI y fallos deterministas investigados antes de optimización; entorno de perfilado reproducible. **Impacto:** Medir requests por endpoint/minuto, p50/p95, CPU si está disponible, errores y duplicados; validar 2/4 clientes, desconexión, progreso, chat, Enfermería, Vega, XP y recuperación en cuatro modos. Comparar costo después de aceptar métricas; no atribuir 4h13m de CPU exclusivamente a ATRIA. **Riesgo:** alto si se altera transporte. **Esfuerzo:** 2–4 días de perfilado y diagnóstico; aceptación Android bloqueada por dispositivo.

**Evolución y sustituciones:** Issue creado durante esta sesión tras 9c176df: se incorpora sin fingir que estaba disponible en la búsqueda inicial. El ticket llama P0 a CI y perfilado como prerrequisitos de optimización; en esta auditoría se prioriza P1 al no demostrar bloqueo actual del juego.

**Resolver conjuntamente con:** LAT-01, MP-01, QA-01, DEPLOY-01.

**Condición recuperada/olvidada:** A: la condición de consumo medido, flag OFF y rollback no estaba explícita en el inventario anterior. LAT-01 conserva percepción de latencia; PERF-01 solo añade la condición de consumo/medición.

## Historial íntegro anterior — conservado, superado por la auditoría vigente

<details>
<summary>Inventario anterior tal como estaba en 162d0cf (sin eliminar su historial)</summary>

# ATRIA 5.0 · Inventario maestro de requisitos

## Estado vigente · 12 de noviembre de 2026

La ejecución retomó `cf998be4f98b2026794bcbeb16347113a675a473` y verificó el código publicado hasta `3fd2c40797aeffb182baa4cb9f9c967f8548744f`. Pasaron 3.137 pruebas V5, 40 del núcleo, los builds y 55 cierres guiados. La matriz longitudinal actual tiene 550 recorridos previstos con 9 perfiles, y su ejecución en CI sigue en cola. [Continuidad exacta](ATRIA-5-EXACT-CONTINUATION.md) · [Matriz actual](https://github.com/javierdario48-star/ATRIA/actions/runs/43289556288)

### Correspondencia con el inventario original

La columna «Números» conserva la asignación publicada de los 60 requisitos, incluidos los cruces 45 (MP/LAT) y 58 (DX/LAT). Se recuperaron los grupos, criterios y fragmentos de las solicitudes anteriores. La redacción literal y la asignación individual dentro de cada rango siguen pendientes de recuperación. Los identificadores adicionales de esta auditoría tienen estado y evidencia propios.

Solicitudes recuperadas de mensajes anteriores que amplían los criterios de la tabla:

- **LAB-01 y LAB-02.** Identificar las TC y gasometrías discordantes por adquisición. Conservar el hemograma con leucocitos y la PCR como determinación distinguible, incluso al pedirlos juntos. Hacer encontrable VEDB y evitar endoscopias duplicadas.
- **ANAM-01, DIALOG-AUTO-01 y FAM-01.** Entender y devolver saludos, incluido el saludo automático de primer contacto. Distinguir enfermedades previas del cuadro actual y ampliar antecedentes más allá de esguinces. Hacer visible al acompañante cuando el caso dispone de esa fuente.
- **NUR-01 y CLOSE-01.** Comprender «nada por boca» en lenguaje natural. Hacer que Enfermería pregunte si puede alimentar al paciente y registre la decisión. Revisar la solicitud de que el consejo de seguimiento y signos de alarma sea recomendable. En los casos revisados se evalúan como calidad de atención.
- **DX-01, DX-REVEAL, MP-01 y LAT-01.** Guardar la impresión en un solo envío y poder revelar el diagnóstico del caso con un descuento del 50%. Resolver el retraso de respuestas, selección y pistas. Conservar los mensajes entre médicos y la actividad compartida desde el inicio de guardia.

### Registro maestro de estado

Las rutas abreviadas corresponden a `src/v5/`. «Probado» identifica el escenario de la columna de evidencia. La aceptación en el dispositivo físico o el despliegue se indica por separado.

| ID | Números | Estado | Evidencia y archivos | Siguiente acción |
| --- | --- | --- | --- | --- |
| DX-01 | 56–58 | Probado en Node y Chromium. Aceptación física pendiente. | `ui/clinical-controller.js`, `diagnostic-impression.test.js` y `qa/v5/diagnosis-browser.mjs` cubren UID, cierre inmediato, doble toque, borrador, borrado y recibo tardío. El navegador verificó que el diagnóstico revelado no sustituye la impresión. | Verificar edición con pérdida de red y retorno en preview y Android físico. |
| LAB-01 | 1–3, 5–6, 9 | Probado en los protocolos con modelo. Pendientes informes de control adicionales. | `d260564` corrigió la reutilización del informe basal como nuevo control. Se probaron cinco gasometrías con modelo y cuatro protocolos basales. `study-orders.test.js` reproduce RESP-07 antes y después de la descompresión. Se conserva el informe original por paciente, evento y minuto. Las pruebas de angio-TC, hemograma, PCR y troponinas seriadas siguen aprobadas. | Modelar los controles de radiografía, gasometría cualitativa, lactato y PEF con datos de adquisición válidos. Verificar por separado el control de coagulación tras trombólisis y su prerrequisito. |
| LAB-02 | 4, 7 | Probado en Node y teclado Chromium. Android físico pendiente. | `study-order-vocabulary.js`, `study-orders.test.js`, `clinical-autocomplete.test.js` y Chromium Pixel 5 emulado verificaron VEDB, VCC y videocolonoscopia en CROHN/COLON con una adquisición canónica. La endoscopia alta conserva su identidad. | Confirmar búsqueda y orden desde el teclado Android físico. |
| ANAM-01 | 10–13, 16–17 | Probado en el catálogo actual y en guardias anteriores. Aceptación física pendiente. | `adfa5e9` separó antecedentes personales del motivo de consulta en 12 casos históricos. Dos hashes previos y una guardia VARIX anterior conservaron identidad y recibos. `0f1c09a` y `55120c9` verificaron 550 entrevistas y 8.250 turnos en los 55 casos jugables. | Medir la naturalidad en dispositivo físico y ampliar el banco de antecedentes documentados con variantes reproducibles. |
| NUR-01 | 18–19, 21–24 | Probado en Node para decisiones de alimentación y recibos. Android físico pendiente. | `ebba52e`, `nursing-nutrition.test.js`, `physical-nursing.test.js` y `nurse-diagnosis-speech.test.js`. La pregunta proactiva se activa en cinco casos que declaran ayuno y su respuesta persiste en los cuatro modos. Se conserva el recibo de la conducta y la administración idempotente. | Verificar alimentación, alergias, oxígeno y seguimiento en Android físico. Reproducir el silencio de Enfermería fuera de los flujos cubiertos si vuelve a aparecer. |
| CLOSE-01 | 25–32 | Probado para alta insegura, observación activa y recorridos principales. Alternativas longitudinales en verificación. | `62c57f2`, `8fb4d1f` y `9a14b00`. Los 55 casos mantuvieron la misma trayectoria a 60 s tras observación activa y alta insegura. Vega reprende el alta insegura y el débito es único. CARD-01, CARD-08, CARD-10 y RESP-07 compararon el rechazo prematuro con la aceptación urgente basada en hallazgos. CHOLE e ILEO cerraron con recepción. | Revisar los desenlaces de la matriz vigente y comprobar omisiones y destinos alternativos usando el evaluador nativo. |
| VEGA-01 | 8, 33–34, 53 | Probado en Node y navegador en los recorridos ejecutados. Aceptación física pendiente. | `ui/clinical-hint-presenter.js`, `clinical-hints.test.js`, `clinical-hint-ledger.test.js`, `server/clinical-hints-durable.test.js` y `qa/v5/clinical-hint-bots.mjs`. 55 casos cerraron. El navegador confirmó una pulsación, presentación y cobro visible. | Ejercitar alternativas, controles por evolución y efectos adversos, incluyendo recibos del segundo médico. |
| DIALOG-AUTO-01 | Requisito explícito | Probado en navegador local y en Cooperativo del checkpoint anterior. | `patient-dialogue-browser.mjs`, `84af64f` y `3dc1390`. Un envío produjo respuesta visible. NEUR-06 atribuye el relato al acompañante con Glasgow verbal 1. La prueba integrada recuperó actividad y recibos en dos sesiones. | Medir del envío al texto visible en Android físico y comprobar el primer contacto y preguntas fuera de tema. |
| VEGA-AUTO-01 | Requisito explícito | Probado en Node y Chromium. Android físico pendiente. | `clinical-hints-browser.mjs` y `clinical-hints-durable.test.js` cubren un toque, presentación confirmada, repetición gratuita, protección ante cambio de paciente y el 5% por pista nueva aun cuando se revela el diagnóstico. | Medir en preview y Android físico y comprobar cambios concurrentes de otro médico durante la presentación. |
| VEGA-COHERENCE-01 | Requisito explícito | Probado en las progresiones cubiertas. Controles adicionales pendientes. | `clinical-hints.test.js`, `accepted-transfer.test.js` y 55/55 bots. HEPAT y CARD-08 distinguen pendiente e informado. PANC, CHOLE e ILEO avanzan a la intervención o destino que falta según los recibos. | Ampliar la secuencia pista, orden, recibo y nueva pista a controles temporalmente indicados y alternativas de tratamiento. |
| LAT-01 | 45, 54–55, 58, 60 | Correcciones probadas en escenarios locales. Medición externa pendiente. | `f35ba43`, `9404669` y `81fd2da`. Guardado activo con límite de 12 segundos. Chat ACK a DOM del colega de 336/586 ms en dos procesos locales. Comparación alternada de tres pacientes redujo la mediana de proyección de 1,28 a 1,12 ms y la de avance de 0,31 a 0,11 ms. | Medir envío, CAS, recibo y render en preview y teléfono. Distinguir los tiempos propios de enfermería, marcha y laboratorio. |
| MP-01 | 44–46 | Verificado en preview con dos cuentas en ambos modos. | Cooperativo superó siete comprobaciones de invitación, chat, recarga, recuperación, finalización y 401/403/404. `33f85e3` protege el expediente de una cama liberada en Competitivo. La regresión durable y el preview verificaron el aislamiento y la reasignación. | Aceptar en Android físico, incluidas presencia y transferencia de control con red intermitente. |
| XP-COOP | 39–43, 47 | Probado en el servidor, tras restauración y con dos cuentas en preview. | `7eed9e2` fija la elegibilidad en el cierre autoritativo. En Cooperativo se acreditaron 40 XP al activo durante la ausencia y luego 40 XP a cada médico tras el regreso. El rival competitivo obtuvo 40 XP por su cierre después de la salida del otro médico. | Verificar la animación y el desglose en Android físico con los recibos de estas secuencias. |
| DX-REVEAL | 35–38 | Implementado y probado en Node, Chromium y PostgreSQL. | `69a5a1f`, `clinical-hint-ledger.js`, `clinical-hints-durable.test.js` y `case-debrief.js`. La revelación se registra por médico y encuentro, descuenta 50% una sola vez sobre el XP tras Vega y mantiene la impresión y la atención. | Verificar el recorrido en el preview del SHA final y Android físico. |
| FAM-01 | 14–15, 20 | Interacción clínica probada en Node y Pixel 5 emulado. Aceptación física pendiente. | `84af64f`, `patient-dialogue.test.js`, `app/world.js`, `patient-actions.js` y navegador de NEUR-06. La rueda ofrece acompañante al declararse un informante. Sus hechos, repreguntas y atribución sobreviven restauración y conservan el contexto de cada médico. | Validar una segunda presentación con informante declarado cuando el catálogo la incluya. Confirmar el tamaño táctil en Android físico. |
| REC-01 | 48–52 | Probado en Chromium y preview. Android físico pendiente. | `guard-recovery-browser.mjs` pasó 10 verificaciones de 409, respuestas tardías, Después, X, Escape, guardado y finalización. Dos cuentas locales completaron 1.440 s y continuaron la misma guardia en 1.456 s de pared sobre `7eed9e2`. En preview ambos médicos finalizaron desde el control de recuperación. | Repetir el turno completo y las tres decisiones en Android físico y medir guardado con red móvil. |
| UI-01 | Requisito transversal | Probado en Chromium, incluido Android emulado. | `bc543cd` validó la rueda con HUD, ruta expandida y teclado en horizontal. Se probaron cinco vistas del marcador, 440 paneles sobre 110 admisiones y el audio en los cuatro modos. | Aceptar volumen, teclado y rueda en Android físico. Comprobar chat de amigos y paisajes donde la banda libre mida menos de una fila táctil. |
| SAFE-01 | Requisito transversal | Probado por regresiones de evolución, recibos y aislamiento. Variantes pendientes. | `medication-safety-487.js`, `receipts.js`, `transfer-continuation.js`, `physical-nursing.test.js` y regresiones de alta. Se conservaron alergias, administración veraz, rescate, dosis únicas y registro de consecuencias. PostgreSQL verifica débito de muerte y alta por separado. | Ejercitar combinaciones de alta, deterioro, alergia y tratamiento causal. Conservar ampicilina, alternativas y tres pares de hemocultivos. |
| ARCH-01 | Requisito transversal | Probada la admisión de un caso adicional. Matriz completa vigente en CI. | `e50db97` certificó RESP-56 en un catálogo temporal mediante el importador y lo recorrió en los cuatro modos. `22f34f3` y `55120c9` leen el catálogo jugable. La auditoría pasó en 190 módulos y no detectó ciclos en 487 dependencias internas analizadas. | Verificar los ocho trabajos de la matriz actual y ampliar la prueba de admisión con semillas y trayectorias adversas cuando el contenido lo requiera. |
| SEL-00 | 59 | Probado. | `app/patient-selection.test.js`, `social/durable-cooperative-replica.js` y navegador de dos cuentas. Cambio A→B conserva UID y dirige la pregunta al paciente correcto. | Conservar la selección directa y repetir esta regresión cuando se toque foco, transporte o presencia. |

### Límites de la auditoría clínica

La auditoría recorrió 55 casos y 91 destinos declarados. El archivo histórico conserva 550 recorridos con integridad verificada y 160 certificados estrictos. La matriz de esta ejecución reprodujo el defecto de privacidad competitiva y la repetición dirigida de ACAL-001 pasó tras corregirlo. La recertificación longitudinal del código actualizado sigue abierta. Los previews Cooperativo y Competitivo pasaron los recorridos indicados. La aceptación física sigue pendiente.

## Historial de checkpoints

## Checkpoint ChatGPT — 2026-11-11

- DX-01: `3b0db36`, `d4a6ebd` modifican `clinical-controller.js` para cierre no bloqueante, UID explícito, bloqueo de duplicados y borrador recuperable. Comprobadas sintaxis y pruebas aisladas de cierre inmediato y rechazo; **no** se ejecutó aún el navegador/Android ni la suite Node completa.
- LAB-02: `6450b1e` añade alias VEDB al vocabulario canónico y `6c1f188` incorpora regresión en `study-orders.test.js`. Resolución aislada 14/14 en CROHN-001 y COLON-001; **no** se ejecutó aún la suite Node completa.
- Siguiente: ejecutar las pruebas dirigidas del traspaso, corregir cualquier regresión y continuar con NUR-01. Verificar HEAD antes de nuevos cambios.

## Checkpoint de continuidad — 2026-11-11, segunda ejecución ChatGPT

- HEAD inicial verificado mediante comparación GitHub: `5123e1a11f34689feaec13859de19d72373ca3f4` idéntico a la rama. No se modificaron recuperación de guardias ni pistas.
- DX-01: `991e152` añadió pruebas de demora, doble toque, cambio de paciente y reapertura. `a660c74` protege borradores y recibos frente a reinicio de sesión. `446c3ec` añadió regresión de sesión reiniciada. Tres escenarios aislados ejecutados en JS (reapertura, reset y rechazo): correctos. **Suite Node/navegador aún no ejecutada.**
- LAB-02: sin nuevos cambios; pruebas integradas aún pendientes. Resolución aislada 14/14 heredada del checkpoint anterior.
- NUR-01: `7fa1ae6`, `fd844a0`, `233b9b1`, `91d20dc` implementan consulta de alergias con lectura de datos de seguridad existentes, sin tratamiento, y recibo nativo validado. `ce6ae98` reconoce plan de seguimiento con control y señal concreta de retorno. `4e34699` reconoce ayuno/no dar agua mediante intervención `npo` ya existente. `d98961e` evita acreditar consejo de retorno negado. Tests añadidos en `nurse-diagnosis-speech.test.js` y `physical-nursing.test.js` (commits `3379776`, `ac5cf2a`, `ab67213`, `00b2666`, `4578d91`). Verificaciones aisladas ejecutadas: 5/5 consultas de alergia, 6/6 NPO, 4/4 frases de seguimiento y 3/3 flujos DX. **No se ejecutó la suite Node completa ni una sesión real en Android.**
- Restricción del entorno: el contenedor no resuelve github.com; GitHub connector permite leer/publicar archivos pero no montar el repositorio para `npm` o Playwright. No presentar pruebas agregadas como aprobadas sin ejecutarlas.
- Próxima acción: ejecutar `node --test src/v5/ui/diagnostic-impression.test.js src/v5/core/nurse-diagnosis-speech.test.js src/v5/core/nursing-formulation-routing.test.js src/v5/clinical/physical-nursing.test.js src/v5/clinical/study-orders.test.js src/v5/ui/clinical-autocomplete.test.js qa/tests/v5-nurse-study-autocomplete.test.mjs`, `npm run build:v5`, y navegador de diagnóstico cuando haya runner; corregir cualquier regresión antes de LAB-01. Confirmar recepción real del recibo de alergias, idempotencia y plan de alta.

## Checkpoint — 2026-11-11, tercera ejecución ChatGPT

- HEAD inicial remoto d35048890618adb69c5c23a7135ef2268496e4f9 verificado idéntico a la rama; se leyeron los tres documentos de traspaso.
- Se intentó git ls-remote desde el contenedor con Node 22.16.0; falló por DNS (Could not resolve host: github.com). No existe checkout disponible para ejecutar la suite completa ni el build. No atribuir éxito a pruebas no ejecutadas.
- Estado GitHub del HEAD inicial: Vercel success; sin workflow runs de pull request devueltos para ese SHA. Vercel no acredita tests Node, navegador ni Android físico.
- NUR-01: commit 239b8e2 agrega regresión integrada de doble instrucción NPO en src/v5/clinical/physical-nursing.test.js (ayuno y no dar agua): ambas deben usar el ejecutor existente y dejar un único tratamiento confirmado. **Test publicado, no ejecutado todavía**.
- Próxima acción: ejecutar los siete archivos de test y npm run build:v5 en un checkout completo; corregir cualquier fallo antes de añadir lógica proactiva. Luego verificar conversación de alergias, plan de alta y preguntas de enfermería sin repetición. LAB-01 sigue después de NUR-01.

## Checkpoint ChatGPT — 2026-11-11, NUR-01 and closure audit

- Starting HEAD: `8d1d6feb197b9079a201947cd9bfc7c0bbbb8670`, comparison with branch identical.
- NUR-01: `f4c3913` extends the existing allergy-question intent to natural singular/plural forms ("tiene alguna alergia", "presenta algunas alergias"); the existing `nurse.inquire` receipt remains the sole source of clinical information. `df21cae` adds routing regressions. No treatment, patient allergy facts or clinical authority was modified.
- CLOSE-01/VEGA-01: `691ed88` adds `auditClosureRequirements` to the existing requirement projection. It is read-only and flags untyped gates, absent study/treatment alternatives, missing destinations, unmatched blocker sets and NPO treatment gates needing clinical necessity review. `a631fe7` adds four regression scenarios. **It is an initial audit primitive, not an exhaustive all-case audit or a change to clinical closure rules.** A blocking NPO condition is not yet removed or reclassified; necessity must be assessed against case evidence.
- Verification limitation: GitHub connector can publish/read source but does not provide a checkout; the seven-file integrated suite, the new audit test and `npm run build:v5` have not been executed against a complete repository. No Android acceptance claimed.
- Next: run the two targeted tests `node --test src/v5/core/nurse-diagnosis-speech.test.js src/v5/clinical/closure-requirements-audit.test.js` and the pending integrated suite on a full checkout. Then enumerate actual case closure verdicts using the existing `closureReadiness/currentChecklist` path and feed them into the audit; review each NPO blocker clinically before changing any gate. Preserve clean module boundaries, one authoritative clinical engine, small reversible commits, no case-specific patch chains or duplicated checklists.

## Registro maestro de estado — sesión autónoma 2026-11-11

Estados: **implementada** = código publicado; **validación pendiente** = faltan pruebas integradas; **verificada** = pruebas relevantes ejecutadas; **aceptada** = comprobación en entorno real. No inferir verificación a partir de un commit.

| ID | Estado | Archivos / commits | Pruebas ejecutadas / pendientes | Dependencias, riesgos y próxima acción |
| --- | --- | --- | --- | --- |
| DX-01 | Validación pendiente | `ui/clinical-controller.js`; d4a6ebd, 991e152, a660c74, 446c3ec | Aisladas anteriores; faltan Node, navegador, Android | Recibos y UID; correr regresiones y cambio de paciente |
| LAB-02 | Validación pendiente | `clinical/study-order-vocabulary.js`, `clinical/study-orders.test.js`; 6450b1e, 6c1f188 | 14/14 aisladas anteriores; faltan integración y UI | Catálogo real; comprobar CROHN/COLON y órdenes sin duplicar |
| NUR-01 | Validación pendiente | `core/speech-router.js`, `core/nurse-diagnosis-speech.test.js`, `clinical/physical-nursing.test.js`; f4c3913, df21cae, 7ff71dc, 239b8e2 | Regresiones publicadas; falta ejecutar Node y chat/recibos | Motor de órdenes y datos clínicos; comprobar respuestas y no duplicación |
| CLOSE-01 | En desarrollo | `clinical/clinical-hint-requirements.js`, `clinical/closure-requirements-audit.test.js`; 691ed88, a631fe7, e801e1c, bf21b8c | Se añadieron dos regresiones de alternativas NPO; falta Node y auditoría exhaustiva de casos | Evaluadores clínicos reales; `unavoidable` indica estructura del requisito, **no** indispensabilidad médica. No se modificaron criterios de cierre |
| VEGA-01 | Validación pendiente | `clinical/clinical-hint-requirements.js`, `clinical/guard-session.js`; 691ed88, e801e1c | Falta contrastar cada bloqueo con pista ejecutable, XP 5% e idempotencia | Compartir requisitos autoritativos; no duplicar checklist |
| LAB-01 | Pendiente | `clinical/studies.js`, `clinical/study-evidence.js` | Falta reproducción por adquisición | Fuente única; TC, gasometría y hemograma |
| ANAM-01 | Pendiente | `clinical/patient-dialogue.js` y contexto | Falta caracterización dirigida | Preservar hechos/persona; conversación natural |
| LAT-01 | Pendiente | Transporte y presentación | Faltan trazas de latencia | Medir antes de optimizar |
| MP-01 | Pendiente | Lobby, presencia y réplica | Faltan dos cuentas | No alterar autoridad compartida |
| XP-COOP | Pendiente | Recompensas, ledger y UI | Faltan pruebas cooperativas | Coordinar con DX-REVEAL e idempotencia |
| DX-REVEAL | Pendiente | Pistas, debrief y XP | Faltan pruebas | Definir composición de penalizaciones 50% |
| FAM-01 | Pendiente | Diálogo, acompañantes, mundo | Faltan pruebas | No inventar conocimientos del familiar |
| REC-01 | Validación pendiente | Recuperación existente | Falta Android físico | No reconstruir |
| UI-01 | Pendiente | UI Android, marcador, música, navegación | Falta inspección visual/dispositivo | Evitar regresiones de accesibilidad |
| SAFE-01 | Validación pendiente | Seguridad farmacológica y recibos existentes | Falta suite transversal | Alergias, contraindicaciones, eventos adversos |
| ARCH-01 | En desarrollo continuo | Módulos afectados por cada cambio | Revisión incremental; sin refactor masivo | Un único motor clínico; módulos cohesivos |

**Regla transversal:** ningún requisito oculto, arbitrario o imposible debe bloquear el cierre; los indispensables deben ser identificables mediante Dr. Vega. Primero auditar casos y alternativas; cambiar una regla clínica únicamente con evidencia y pruebas específicas. Arquitectura limpia, cambios pequeños, sin parches por paciente ni checklist paralelo.

**Verificación pendiente de esta sesión:** `node --test src/v5/clinical/closure-requirements-audit.test.js src/v5/core/nurse-diagnosis-speech.test.js`, la suite de siete archivos del traspaso, `npm run build:v5`, navegador y Android. Los cambios de esta sesión se revisaron contra el código remoto, pero **no se ejecutó Node sobre el checkout completo**. GitHub Actions: explorar runner autorizado; no se lanzó workflow ni se afirmó CI verde.

**Próxima acción:** ejecutar el test de auditoría; después instrumentar un recorrido read-only de los casos y sus evaluaciones reales usando la ruta de `closureReadiness/currentChecklist`, clasificando NPO estructuralmente obligatorio frente a clínicamente indispensable, y comprobar qué bloqueo llega realmente a Dr. Vega.

## Checkpoint de ejecución — 2026-11-11, auditoría de sesión real

- HEAD inicial verificado: `7687539afad461a66857bafe304bec11dcade54a` (idéntico a rama antes de los cambios).
- CLOSE-01: `8db75eb` corrige el defecto de la auditoría que aceptaba un grupo de alternativas válido mientras ocultaba otros malformados; ahora exige que **cada** grupo sea válido. `55dccf4` actualiza la regresión y agrega una prueba específica.
- CLOSE-01/VEGA-01: `7af11d6` incorpora `session.auditClosureRequirements()`, una vista diagnóstica de solo lectura construida desde **el mismo** `currentChecklist()` que alimenta a Dr. Vega. Devuelve caso, destino, `ready`, mensajes bloqueantes y anomalías; no modifica elegibilidad, fisiología, recibos ni XP. `a152074` agrega regresión de sesión APP-001 e inmutabilidad.
- **Verificaciones:** lectura de los cuatro documentos obligatorios y del código remoto; revisión estructural de los cambios con el conector. Las nuevas pruebas están publicadas, **no ejecutadas**. Falta Node, build, navegador, Android y recorrido exhaustivo de casos.
- **Próxima acción:** ejecutar `node --test src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js`; si pasan, crear recorrido de casos mediante sesiones reales y recopilar `auditClosureRequirements()` por caso/destino. Inspeccionar el selector de Vega para demostrar que cada bloqueo indispensable tiene una pista ejecutable. No cambiar todavía criterios clínicos.

## Checkpoint — 2026-11-11, auditoría del catálogo completo

- HEAD inicial `a2839d12c8dc0e969197c3398cf970524a2c1b28` verificado idéntico a la rama. Se leyeron los cuatro documentos obligatorios.
- CLOSE-01/VEGA-01: `cc00601` agrega `src/v5/clinical/closure-catalog-audit.test.js`: prueba parametrizada que enumera `content.cases`, crea un mundo y una guardia real por ID, consulta `session.auditClosureRequirements()`, comprueba coincidencia con `session.read().closure` e inmutabilidad, y emite anomalías mediante diagnósticos de prueba. **No** evalúa necesidad clínica ni cambia cierre o pistas. Riesgo: algunos casos pueden requerir fixture específico; corregir el fixture según contratos reales, nunca saltar casos silenciosamente.
- Estado: **implementada, validación pendiente**. La prueba se publicó, **no se ejecutó**. Pendientes: `node --test src/v5/clinical/closure-catalog-audit.test.js src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js`, suite integrada, `npm run build:v5`, navegador y Android.
- Siguiente: ejecutar la prueba parametrizada y clasificar sus hallazgos por ID y destino; luego comparar cada bloqueo indispensable con una pista ejecutable. Evitar cambios clínicos sin evidencia.

## Checkpoint — 2026-11-11, revisión de auditoría y cobertura Vega

- HEAD inicial `6b5de7dc7dff3af8263c4d7f930deada3e913f81` confirmado idéntico; cuatro documentos obligatorios leídos. Checkout GitHub inaccesible por DNS desde el contenedor; `git ls-remote` falló al resolver github.com, por lo que **no** se ejecutaron Node, build ni Android.
- Inventario estático comprobado directamente sobre `src/v5/content/cases.json`: **25 casos, 25 IDs únicos**. No confundir este catálogo con todos los casos históricos del juego.
- `2088bb6`: se corrige una suposición errónea del test: `read().closure` puede evaluar el primer destino, mientras `currentChecklist()` selecciona el destino de Vega. La prueba ya no compara veredictos de destinos distintos; ahora registra `ready`, `missing`, anomalías y la acción o error de la pista en cada caso. **No demuestra cobertura de todos los bloqueos**: captura estado inicial.
- `d16759b`: se reutiliza `clinicalHintCoverage(content)`, cobertura estática existente del registro de acciones, para diagnosticar descriptores faltantes en los 25 casos. Se emite diagnóstico sin asumir que toda alternativa es médicamente indispensable.
- Próximo: ejecutar `node --test src/v5/clinical/closure-catalog-audit.test.js src/v5/clinical/closure-requirements-audit.test.js src/v5/clinical/physical-nursing.test.js` y `npm run build:v5` en runner completo. Inspeccionar fallos, comparar cobertura estática con cada bloqueo dinámico por destino y progresión. Sin cambios en motor clínico, criterios, XP o enfermería.

## Protocolo permanente de ejecución autónoma — aprobado 2026-11-11

**Objetivo: máximo desarrollo real por intervención, sin paradas artificiales.**
1. Al completar una corrección, continuar con la siguiente tarea ejecutable del registro maestro **sin solicitar autorización adicional**; reservar consultas para permisos, riesgo real de datos, decisiones de producto o bloqueo técnico irreversible.
2. Conservar commits pequeños y reversibles, pero **no** tratar cada commit como cierre de sesión. Agrupar varias correcciones y regresiones en una misma intervención.
3. No actualizar documentos después de cada commit. Actualizar este registro y `ATRIA-5-EXACT-CONTINUATION.md` **una sola vez al final** de cada intervención sustancial.
4. Ante falta de checkout o runner, buscar alternativas de validación y continuar mediante GitHub con tareas verificables. Distinguir inspección estática, publicación de tests, ejecución real y aceptación física.
5. Priorizar código, regresiones y validaciones sobre resúmenes. **No generar prompts de traspaso en cada respuesta** salvo solicitud explícita o cambio de conversación.
6. No usar Work ni ZIP. No crear motores/checklists paralelos ni alterar reglas clínicas sin evidencia. Verificar HEAD antes y después de escribir.
7. Este protocolo no autoriza trabajo en segundo plano tras finalizar la respuesta; aplica a cada ejecución activa.

### Avance clínico de esta intervención

- HEAD inicial `19f1388cb1beb2a2efffd6d292092e47f8b42145`, idéntico a rama.
- `df33ddd`: corrige un defecto comprobado por inspección en `auditClosureRequirements`: con alternativas NPO malformadas, el algoritmo filtraba los grupos inválidos y podía declarar `unavoidable:true` falsamente. Ahora solo declara inevitabilidad estructural si **todos** los grupos son válidos y contienen NPO.
- `66d05be`: ajusta la regresión previa y añade tres casos de grupos NPO malformados o alternativos. **Pruebas publicadas, no ejecutadas**; no se modificaron criterios de cierre ni selector de Vega.
- Pendiente: runner Node para pruebas dirigidas, suite integrada y build; luego auditoría dinámica de 25 casos y progresiones.

## Sesión de ejecución integral — auditoría por destino (2026-11-11)

- HEAD inicial remoto `10fb6f81ca88658720bd0e78f7906b130bb18773` confirmado idéntico. Se leyeron los cuatro documentos obligatorios y se revisaron los contratos reales de `guard-session.js`, `world.js`, el fixture `physical-nursing.test.js`, el selector de Vega y la proyección de requisitos.
- `2ec8313` / `6512009`: `session.auditClosureRequirements(destinationOverride)` admite ahora una consulta **diagnóstica y read-only** por destino autorizado. Reutiliza las reglas ya importadas en guard-session y `closureReadiness`; no cambia `currentChecklist`, pistas, elegibilidad, XP ni recibos. Destinos ajenos a la regla declarada son rechazados.
- `ef0df30`: el test parametrizado recorre todos los destinos declarados por cada caso y emite `destination-audit` con `caseId`, destino, `ready`, `missing` e `issues`. Verifica inmutabilidad y rechazo de destinos desconocidos. El fixture sigue el patrón existente de `physical-nursing.test.js`.
- **No hay ejecución de Node, build, navegador, Android ni CI confirmada.** No inferir que los bloqueos están resueltos; la auditoría mide el estado inicial y no la progresión completa. Próximo: ejecutar las pruebas, clasificar los hallazgos por destino y avanzar hacia cobertura dinámica de Vega y NUR-01.

## MP-01 — persistencia entre instancias (11-11-2026, ChatGPT)

HEAD inicial `e92c351eaa36d6e47a6613a5c29bfb5a1cf802e6` confirmado idéntico. Se inspeccionaron `cooperative-link.js:pollRoom`, `room-membership-store.js` y `src/v5/server/supabase-account-store.js:createPersistentSocialStorage`. La causa raíz identificada en código es que la lista `durableKey` solo persistía usuarios/contactos; `qa-v1:room:<uuid>` y `atria-v5:room-member:<uuid>:<qa_id>` quedaban en caché por instancia. Tras un `rooms/join` exitoso, `pollRoom` podía consultar otra instancia sin el registro de membresía y recibir 403, que el cliente trataba como expulsión.

- `23e92efa7d1fb40ea9b145e472c82e51ceeae92d`: persistencia de metadatos de sala y slots de aceptación en el adaptador privado Supabase existente, sin ampliar permisos públicos ni sustituir el servidor social.
- `e6d06dff6d755dae481f27546eda333137e1a2b9`: pruebas de lectura desde otra instancia, recuperación, aislamiento entre salas y salida frente a snapshot obsoleto.
- **Pruebas publicadas, NO ejecutadas en este entorno.** Falta ejecutar `node --test src/v5/server/supabase-social-room-persistence.test.js`, suites sociales, `npm run build:v5` y aceptación de dos cuentas contra despliegue. Revisar limpieza/TTL de registros persistentes antes de considerar MP-01 cerrado. Conservar los 20 grupos y 60 requisitos y DIALOG-AUTO-01, VEGA-AUTO-01, VEGA-COHERENCE-01. CHOLE-001, ILEO-001 y LAB-01 continúan pendientes.

</details>
