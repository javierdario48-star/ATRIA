# ATRIA 4.8.7 · Preparación clínica, cierre de guardia y XP

## Principio

**No confundir requisitos mínimos con puntuación.** El jugador puede cerrar una
atención cuando hizo lo indispensable para el destino correcto. Una anamnesis
más completa, estudios precisos, buena reevaluación y soporte coherente dan
más XP. Solicitar estudios innecesarios o producir daño reduce el puntaje,
pero NO agrega procedimientos obligatorios después de la derivación.

Cada caso reconoce diagnóstico presuntivo compatible, signos vitales,
examen físico dirigido, al menos una pregunta pertinente (salvo shock grave),
evidencia mínima de estudio o excepción por emergencia, intervenciones
imprescindibles **administradas** y reevaluación.

### Destinos y pruebas mínimas para los diez casos restantes

| Caso | Evidencia orientadora | Soporte/tratamiento mínimo | Destino |
|---|---|---|---|
| CIRR-001 | hepatograma, función renal o ecografía | espironolactona si corresponde al caso | sala u observación |
| PANC-001 | lipasa | líquidos y ayuno; si UTI, respuesta del equipo | UTI |
| CROHN-001 | marcadores, colonoscopia o entero-RM | corticoide indicado | sala u observación |
| HDA-001 | laboratorio de sangrado o grupo | acceso, líquidos o sangre, PPI; receptor aceptado | procedimiento o UTI |
| COLON-001 | colonoscopia | diagnóstico, estabilidad y seguimiento | alta o sala |
| APP-001 | ecografía; puede omitirse en shock que precisa cirugía inmediata | ceftriaxona + metronidazol, o alternativa apropiada; Cirugía aceptó | quirófano |
| CHOLE-001 | ecografía biliar | ayuno y cobertura adecuada; Cirugía aceptó | quirófano |
| ILEO-001 | Rx o TC | líquidos, SNG y ayuno | sala; quirófano/UTI según evolución |
| MESI-001 | angio-TC, salvo emergencia quirúrgica documentada | reanimación y heparina si es segura; equipo vascular o Cirugía aceptó | quirófano |
| CHOLANG-001 | hepatograma o ecografía | reanimación y antibióticos apropiados; receptor aceptado | drenaje/procedimiento o UTI |

**Las tres peritonitis mantienen su motor previo:** `PERI-PBE-001`,
`PERI-SEC-001`, `PERI-TER-001`. No hay regresión de sus restricciones.

Una vez cumplidas las condiciones, Enfermería pregunta:
«Doctor, el paciente está preparado. ¿Qué destino indicamos ahora?»
Se muestran los destinos realmente válidos, y se puede contestar con
«enfermera, dar de alta», «enfermera, derivar a quirófano»,
«enfermera, internar en sala», etc.

Los destinos invocan **el `csSetDisposition` y `finishCase` nativos**,
sin escribir `caseEnded`, inventar procedimientos ni XP.

## Puntuación y experiencia

La escala de calidad conserva seis componentes del juego:
- Diagnóstico compatible: hasta **15 puntos**.
- Anamnesis pertinente: hasta **15 puntos**, proporcional a las preguntas.
- Seguridad (signos, examen, reevaluación, destino): hasta **25 puntos**.
- Estudios pertinentes completos: hasta **15 puntos**, proporcional al caso.
- Tratamiento confirmado y destino apropiado: hasta **25 puntos**.
- Eficiencia: **5 puntos**, restando 2 por estudio no prioritario (máximo 5).
- Eventos adversos documentados: descuento adicional hasta 20 puntos.

Total 0–100. El XP lo calcula el **motor de carrera existente**, incluyendo
autonomía, complejidad y bonificaciones del modo. Un caso correctamente
derivado puede obtener XP con un puntaje inferior a 70: esa cifra ya no
bloquea una decisión clínica bien fundamentada.

El registro de una derivación aceptada cuenta como atención de guardia
resuelta. No se necesita operación, endoscopia, revascularización o control
de foco `sourceControlled=true` antes de salir del box.

## Seguridad y límites

- Una orden pendiente NO satisface tratamiento. Se exige recibo nativo o
  intervención efectivamente documentada.
- Se permite el traslado urgente aún con hipotensión si hay soporte activo y
  el equipo receptor corresponde. **El alta exige estabilidad.**
- Shock con diagnóstico específico y examen puede justificar derivación
  quirúrgica sin esperar imagen electiva.
- No se crea un segundo motor XP, ni se modifica la fisiología, la supervivencia,
  el micrófono, las salas o el golden master.
- La batería Node verifica las diez reglas y preserva las tres peritonitis;
  **la aceptación física de botones, audio, XP y cierre completo sigue requiriendo
  navegador/Android/iPhone**.
