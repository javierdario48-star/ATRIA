# ATRIA 5.0 — contrato de integración clínica (Respiratorio, Cardio, Neuro)

Estado: **especificación y puerta de entrada para implementación; NO implica casos jugables ni fármacos implementados**. Rama exclusiva `atria-5.0-core-rebuild-experimental`. No tocar V4, main ni fuentes clínicas caracterizadas.

## Arquitectura real a reutilizar
- `src/v5/clinical/native-medications.js`: formulario IV y ejecución confirmada por enfermería; una orden pendiente **no** modifica fisiología.
- `src/v5/clinical/native-additional-cases.js`: trayectorias temporales y composición de efectos existentes (oxígeno, volumen, fármacos, daños).
- `src/v5/clinical/gastro-expansion-policies.js` y `gastro-closure-v5.js`: reglas declarativas de destino, evidencia, tratamiento, reevaluación, aceptación de servicio y puntuación original.
- `src/v5/clinical/medication-exposure.js`, `pharmacology-catalog.js`, `medication-harms-487.js`: usar mecanismos y recibos de administración reales; no crear ejecutores alternativos ni duplicar el cálculo de XP.

## Reglas obligatorias para CADA caso
1. ID único, especialidad, dificultad, motivo de consulta, anamnesis, alergias, medicación, comorbilidades, signos vitales y evolución sin tratamiento.
2. Hallazgos de examen físico específicos; resultados solo en panel de examen, nunca narrados por enfermería ni repetidos en chat.
3. Estudios con resultados y tiempos coherentes; diagnóstico diferencial; pruebas que no deben retrasar intervenciones salvadoras.
4. Intervenciones y fármacos existentes o nuevos: ruta, dosis/unidad validada, contraindicaciones, latencia, efecto y daño; solo la administración confirmada modifica al paciente.
5. Fisiología longitudinal compartida (TA, FC, FR, SpO2, temperatura, volumen/perfusión y ejes especializados cuando proceda). No conceder recuperación instantánea por marcar un checklist.
6. Destinos permitidos por caso y condición: alta, observación, sala, UTI, procedimiento, cirugía o derivación. Un traslado aceptado **no** equivale a intervención definitiva realizada.
7. Cierre completo requiere diagnóstico razonable, examen/estudios pertinentes, tratamiento ejecutado, reevaluación, estabilidad compatible y aceptación del receptor cuando corresponda. Cierre parcial, iatrogenia, abandono y muerte siguen disponibles.
8. Mantener el único reloj, autoridad, CAS, recibos de XP y motor de cierre existentes. No crear un motor por especialidad.

## Casos previstos y destinos clínicos (sujetos a variante y gravedad)
| ID | Presentación | Conducta decisiva | Cierre apropiado |
|---|---|---|---|
| RESP-01 | NAC ambulatoria estable | Amoxicilina si adecuada; estratificación y seguimiento | Alta |
| RESP-02 | NAC grave/sepsis | Ceftriaxona + macrólido; soporte, cultivos sin retrasar antibiótico | UTI/sala según estabilidad |
| RESP-03 | Exacerbación EPOC | SABA/SAMA, corticoide, O2 titulado; ATB si criterios; VNI si indicada | Observación/sala/UTI |
| RESP-04 | Asma aguda grave | SABA repetido, ipratropio, corticoide, Mg IV selectivo | Sala/UTI; alta solo tras resolución y criterios |
| RESP-05 | TEP sin shock | Anticoagulación según riesgo, sangrado y función renal | Alta seleccionada/sala |
| RESP-06 | TEP con shock | Reperfusión si elegible, anticoagulación, soporte | UTI |
| RESP-07 | Neumotórax a tensión | Descompresión inmediata y drenaje; no esperar Rx | Procedimiento/sala/UTI |
| RESP-08 | Empiema | Antibiótico + drenaje y control de foco | Sala/procedimiento/cirugía |
| RESP-09 | SDRA | Ventilación protectora y tratamiento causal | UTI |
| RESP-10 | Absceso pulmonar | Cobertura anaerobia apropiada y reevaluación; drenaje selectivo | Sala |
| CARD-01 | STEMI | AAS + P2Y12 + anticoagulación según estrategia; reperfusión | Hemodinamia/UTI |
| CARD-02 | SCASEST | Antiagregación/anticoagulación y estratificación invasiva | Unidad coronaria |
| CARD-03 | IC aguda congestiva | Diurético IV, soporte respiratorio; vasodilatador si adecuado | Sala/UTI |
| CARD-04 | FA rápida | Control de frecuencia o cardioversión según estabilidad; evaluar anticoagulación | Observación/sala |
| CARD-05 | TSV regular | Maniobra vagal/adenosina si corresponde; cardioversión si inestable | Observación/alta seleccionada |
| CARD-06 | BAV completo sintomático | Estimulación urgente; atropina no debe retrasarla | Unidad coronaria |
| CARD-07 | Taponamiento | Drenaje pericárdico urgente ante compromiso | Procedimiento/UTI |
| CARD-08 | Disección aórtica tipo A | Betabloqueo IV y cirugía urgente; evitar anticoagulación inapropiada | Cirugía |
| CARD-09 | Endocarditis complicada | Hemocultivos, ATB IV según contexto, valoración quirúrgica | Sala/cirugía |
| CARD-10 | Shock cardiogénico IAM | Revascularización, soporte vasoactivo según perfusión | Hemodinamia/UTI |
| NEUR-01 | ACV isquémico elegible | TC sin hemorragia, reperfusión IV y/o trombectomía según criterios | Unidad ACV |
| NEUR-02 | ACV fuera de ventana estándar | Selección por imagen para reperfusión cuando procede; prevención | Unidad ACV |
| NEUR-03 | AIT de alto riesgo | Estudio urgente, prevención secundaria según etiología | Observación/sala |
| NEUR-04 | HIC hipertensiva | TA controlada, reversión anticoagulante si corresponde | UTI/neurocirugía |
| NEUR-05 | HSA aneurismática | Nimodipino, control aneurisma, estabilización | Neurocirugía/UTI |
| NEUR-06 | Estado epiléptico | Benzodiacepina seguida de segunda línea apropiada | Sala/UTI |
| NEUR-07 | Meningitis bacteriana | Ceftriaxona + vancomicina según epidemiología, dexametasona selectiva; ampicilina si Listeria | Sala/UTI |
| NEUR-08 | Encefalitis herpética | Aciclovir IV precoz | Sala/UTI |
| NEUR-09 | Guillain-Barré grave | IVIG o plasmaféresis; vigilancia capacidad ventilatoria | UTI |
| NEUR-10 | Crisis miasténica | Soporte respiratorio, IVIG/plasmaféresis, tratar desencadenante | UTI |

## Matriz farmacológica bidireccional obligatoria
Al agregar un fármaco: probar su efecto **en todos los casos previos**, incluso si está contraindicado o carece de indicación. Al agregar un caso: probar **todos los fármacos ya disponibles**, sin efectos benéficos automáticos por coincidencia de texto. Ejemplos: heparina en TEP vs HIC/HDA; cristaloides en shock hipovolémico vs edema pulmonar; diuréticos en congestión vs hipovolemia; trombolíticos en ACV isquémico elegible vs hemorragia/disección; broncodilatadores en broncoespasmo vs taquiarritmias. Registrar efectos pertinentes y ausencia de efecto cuando proceda. No añadir efectos clínicos ficticios a tratamientos irrelevantes.

## Puerta de calidad para cada checkpoint
- Primer lote: RESP-01..04; luego RESP-05..10; luego Cardio y Neuro en lotes pequeños.
- Validar fármaco, dosis, vía, alergias, contraindicaciones y administración real.
- Bots: competente, lento, omisivo e iatrogénico; comparar signos, estudios, tratamiento, mortalidad y destino.
- Cierres: alta indebida bloqueada, derivación aceptada, cierre parcial y XP idempotente.
- Regresión de 25 casos GI + todos los incorporados; Aprendiz/Solitario/Cooperativo/Competitivo y reconexión.
- Documentar evidencia de ejecución y CI **antes** de declarar cada caso jugable. No certificar por la mera presencia de una definición.

## Verificación médica
Antes de codificar cada lote, contrastar terapias y dosis con guías vigentes y contexto clínico: ATS/IDSA NAC; GINA asma; GOLD EPOC; ESC/AHA TEP; AHA/ACC SCA; AHA/ASA ACV/HIC/HSA; ILAE estado epiléptico; IDSA meningitis/encefalitis. No tomar este catálogo de planificación como prescripción médica.
