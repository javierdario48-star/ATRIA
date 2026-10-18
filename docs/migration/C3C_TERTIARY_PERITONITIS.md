# C3.c — peritonitis terciaria y receptor clínico

Parte de PBE certificado `33140e729989f626627aa43dba39577efb2b09bb`, sólo en la rama experimental. Candidato pendiente de CI/navegador del SHA publicado.

## Implementación

PERI-TER-001 conecta los perfiles/examen ns421 efectivos al **mismo acute-care/native-peritonitis** y al evaluador **csPeritonitisEvaluate487**. Reutiliza vía, enfermería física, IV, monitor, estudios, supervivencia, debrief y XP. No hay otro motor o escritor de signos. Control del foco sigue false: la derivación no efectúa otra operación.

Se conservan inflamación persistente, fuga de volumen, SVR/reserva renal y la cobertura efectiva original con piptazo. Soporte mejora perfusión sin curar el foco. Furosemida puede administrarse y deteriora volumen/riñón; dosis repetidas empeoran. Amikacina repetida conserva estrés renal original. Rescate es finito, abandono causa muerte tras la gracia original y no otorga XP.

Hemograma/función orgánica55s, TC120s y cultivo1440s siguen los estudios originales. Historia, examen y gravedad permiten actuar antes de imagen/cultivo en urgencia. El cultivo se solicita y permanece pendiente durante el pase; no equivale a resultado disponible. Los mínimos son independientes de calidad y del piso de puntuación original por entrega segura.

**Receptor:** el planificador de consulta existente ahora admite UTI además de Cirugía, una preparación/recibo por servicio y respuestas reales tras3.5s, sin temporizador nuevo. Se reutiliza la valoración quirúrgica pura original. UTI conserva mentorAcuity y las respuestas V19 de aceptación/rechazo por gravedad. Se corrigió la contradicción de rechazar al paciente ya reanimado cuando el propio evaluador original exige UTI por shock inicial: la respuesta explica ese antecedente y acepta el ingreso crítico. No confundir esta corrección de producto con paridad del texto antiguo en ese borde.

La UI permite pedir ambas consultas, distingue pendientes/rechazadas/aceptadas por nombre y conserva impresión flotante y destino automático. TER va a UTI por shock inicial aunque la presión mejore; el evaluador conserva Sala para una presentación sin gravedad ni shock reciente. No se inventó una nueva semilla estable para añadir un caso.

## Defectos reproducidos y corregidos

1. Una nueva dosis de antibiótico reiniciaba la rampa V5; V4 conserva `startedAt` de la primera exposición activa y actualiza `lastGivenAt`. La comparación de piptazo repetida falló a30s (temperatura,error0.00635) y pasa con el adaptador corregido. Los recibos siguen siendo dos dosis auténticas; una suspensión sí elimina la exposición activa. Prueba adicional cubre ceftriaxona repetida en PBE.
2. «Evolución desde la cirugía» se respondía como antecedente quirúrgico genérico, perdiendo el hecho `course`; «operaciones previas» tampoco sumaba `surgery_history`. Se da prioridad a esos hechos posoperatorios explícitos, conservando duración contextual de dolor/fiebre y alergias. La regresión anterior de entrevista permanece.
3. El estado médico inicial de PBE no acredita una operación. Se conserva la corrección de metadatos `procedurePerformed:false` en el adaptador, sin cambiar el foco fisiológico ni la fuente V4.

## Evidencia y alcance

- Ocho pruebas TER (más422/422V5,40core, builds y frontera70módulos): historia completa/examen; UTI pendiente versus respondida; rechazo quirúrgico y aceptación tras corregir evidencia; respuesta al soporte con infección persistente; estudios reales y UTI pese a mejoría; daño por diuresis; rescate/muerte/cierre único; rampa antibiótica repetida; puntuación natural y negaciones en consultas. Los cortes previos C1/C2/PBE/SEC permanecen habilitados.
- `node qa/v5/tertiary-native-parity.mjs`: **13 escenarios/187 observaciones** V4/V5 con órdenes y recibos genuinos; error máximo signos4.34e-12/estado5.10e-14. [Resumen y31hashes](../evidence/c3c/tertiary-native-parity-summary.json). Tratamiento temprano/tardío, abandono, cobertura insuficiente, antimicrobianos repetidos, furosemida, exceso de fluidos, estrés renal y reducción temporal al escribir. Referencia típica previa a muerte <=120s; no paridad post mortem de la VM.
- `node qa/v5/tertiary-quality-parity.mjs`: [V19 numérico + corrección peritonitis + carrera reales](../evidence/c3c/tertiary-quality-parity.json). Mínimo84/115XP; cuidado completo con cultivo pendiente92/124; exceso91/123; alternativa imipenem92/124. Sin cirugía ficticia. Como en V4, las alternativas autorizadas por disposición no implican idéntica cobertura fisiológica: el fenotipo efectivo TER sólo modela piptazo en `coverageSets`. Se documenta la limitación original, no se falsifican fármacos para igualarla.
- UTI:10 comparaciones del texto/acuidad original. Entrevista50 y examen100 comparaciones sobre cinco casos. La excepción por shock reciente se prueba separadamente.
- El oxígeno conserva el contrato espacial V5 ya certificado. Su llegada física difiere de la preparación V4 de0.55s y se prueba con sesión/interfaz, **no** se afirma identidad temporal de ese dispositivo en el bot estricto de medicaciones. Las formulaciones IV estándar siguen siendo las dosis de referencia ya migradas; C2 no está completo.
- `qa/v5/tertiary-browser.mjs`: escritorio y Pixel, caminar, diagnóstico flotante, UTI real, seis trabajos de enfermería/cuatro dosis, historia/examen, CBC/TC completados y cultivo pendiente, reevaluación, UTI92/124 y XP persistente único. No certificar hasta el resultado de CI. Pixel no prueba hardware Android.

Siguiente checkpoint obligatorio: C5.a, dos médicos en una guardia con esta misma autoridad y ejecutores; después tres/cuatro. No activar Competitivo ni migrar los otros ocho antes de demostrar Cooperativo real.
