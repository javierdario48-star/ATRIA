# ATRIA 5.0 — Personalidades NPC: implementación y evidencia

29 de octubre de 2026. Rama exclusiva: `atria-5.0-core-rebuild-experimental`.

El motor quedó integrado al diálogo clínico real, con rasgos persistentes, relación independiente con cada médico, variación lingüística acotada y pruebas reproducibles. La certificación técnica está aprobada. Las métricas todavía muestran similitud residual; 9.744 perfiles numéricos no representan 9.744 voces lingüísticamente únicas.

## Checkpoints y publicación

- HEAD inicial verificado: `8458ec1785e63aedf3679ab299b060241f2cc72a`. No había commits posteriores al comenzar; Actions #902 estaba aprobado.
- [19bc5d4](https://github.com/javierdario48-star/ATRIA/commit/19bc5d416fb7fa77a03793229711283de71271b7): conservar los once rasgos en el paciente nativo; normalizar alias españoles; integrar bots de anamnesis al ejecutor público.
- [4603987](https://github.com/javierdario48-star/ATRIA/commit/46039871b33808e85d9603c0c1c64971df5636cd): composición lingüística, información espontánea del banco real, emociones y memoria por médico, persistencia y campañas automatizadas.
- [1443ee2](https://github.com/javierdario48-star/ATRIA/commit/1443ee2c187966c3b5ad94aaea7d39cfde82b6dd): protección literal farmacológica, evidencia de respuestas completas, oráculo de fuentes, verificación de negaciones y cantidades, habla neurológica limitada y regresiones visuales.
- HEAD del código certificado: `1443ee2c187966c3b5ad94aaea7d39cfde82b6dd`.

El commit documental posterior conserva estos resultados sin modificar fuentes del juego, pruebas ni workflows. Su SHA se informa en la respuesta final. No se modificaron main, 4.8.7 ni otras ramas.

## Campañas reales sobre el código final

| Campaña | Casos | Entrevistas completas | Turnos | Distribución |
|---|---:|---:|---:|---|
| Inicial | 55 | 1.100 | 16.500 | 20 perfiles por caso, 15 preguntas |
| Ampliada | 55 | 10.010 | 150.150 | 182 perfiles por caso, 15 preguntas |
| Total de esas dos campañas | 55 | 11.110 | 166.650 | La ampliada incluye las semillas iniciales |

Cada turno pasa por `createGuardSession.post`, el router de intenciones, la autoridad de sala y el ejecutor clínico nativo. Se reutilizan el contenido y los planes de los bots clínicos existentes. Las preguntas proceden de los antecedentes y las intenciones del caso; incluyen apertura, preguntas específicas, repeticiones y aclaraciones.

Los seis médicos son experto, principiante, empático, brusco, apresurado y meticuloso. El principiante cambia el orden de la entrevista; los demás incluyen sus intervenciones y formas de preguntar. La campaña masiva usa Solitario. La persistencia en Aprendiz, Cooperativo y Competitivo se comprueba con pruebas específicas de la autoridad real y con la suite general.

La campaña ampliada produjo 9.744 vectores conductuales distintos. Los conteos publicados corresponden a entrevistas de quince turnos ejecutados, con respuestas efectivas. Las campañas diagnósticas de versiones anteriores y las comprobaciones puras de perfiles quedan fuera de estos totales.

## Diversidad: conversaciones con los mismos datos y las mismas preguntas

La comparación controlada adicional usa **todos los pares** con igual caso, datos clínicos, estilo de médico y secuencia completa de preguntas; exige perfiles conductuales distintos. Compara conjuntos de trigramas del texto emitido. Normaliza acentos, mayúsculas y puntuación; excluye saludos y frases emocionales del cuerpo evaluado. Jaccard ≥ 0,94 se considera casi idéntico.

| Medida controlada | Todos, incluidos habla limitada e informantes | Pacientes con habla plena |
|---|---:|---:|
| Pares comparados | 146.895 | 104.175 |
| Jaccard medio del cuerpo | 0.9158 | 0.8813 |
| Pares casi idénticos, con información espontánea | 49.26% | 28.46% |
| Pares casi idénticos, sólo hechos solicitados | 57.31% | 39.81% |

En la campaña ampliada hay:

- **1.928 cuerpos de conversación distintos**, excluidas las frases emocionales.
- **5.863 conversaciones completas distintas** al incluir la expresión emocional pertinente y excluir saludos iniciales y puntuación.
- 19.526 hechos expresados con una formulación diferente de su texto canónico, conservando el significado comprobado.
- 2.445 datos espontáneos tomados del banco del mismo caso. Los reservados aportaron 0; los conversadores, 1.803.
- 11.324 repreguntas con formulación clínica diferente entre 28.575 repreguntas elegibles (39.63%). Las respuestas protegidas farmacológicas quedan fuera de esa variación.
- 12.606 intervenciones emocionales; 4.665 contienen preguntas (3.11% de los turnos). Ninguna pregunta emocional quedó fuera del contexto declarado y no se repitió una misma intervención emocional dentro de una entrevista.

El job de CI también conserva su comparación inicial de veinte entrevistas por caso: 7.410 pares con habla plena y 18.22% casi idénticos. La comparación controlada de todo el corpus, arriba, es la medida más exigente para evaluar personalidad sin confundirla con diferencias entre médicos.

La prueba diagnóstica anterior a la composición detectó 60 entrevistas incompletas entre 1.100 intentos y 73.65% de pares casi idénticos en su muestra agregada. El archivo correspondiente se conserva como diagnóstico histórico, no como certificación del código final.

## Conservación clínica y persistencia

La campaña ampliada comprobó **152.595 hechos emitidos**: 151.019 contrastados con el banco, la identidad o los antecedentes persistidos, más 1.576 observaciones contrastadas con el estado nativo. Detectó 0 pérdidas, cambios semánticos, alteraciones de cantidades, texto médico añadido fuera de la evidencia o cambios en los invariantes clínicos de la entrevista.

Los signos, reloj, tratamientos, órdenes, exámenes, recompensas y cierre se comparan antes y después de cada turno. La campaña congela el tiempo para comparar personalidades con los mismos hechos. La evolución fisiológica y las respuestas ante deterioro se verifican separadamente mediante los ejecutores reales y la suite clínica.

Se comprobaron una entrevista de sesenta turnos, la siguiente respuesta exacta tras restaurar un checkpoint, orden distinto de claves como en jsonb, reconexión, dos médicos cooperativos, exclusión del rival competitivo, replay idempotente y recuperación del servidor en los cuatro modos. Los rasgos estables se conservan; ansiedad, confianza, frustración y colaboración evolucionan por médico. El estado fisiológico limita el habla y las aportaciones espontáneas.

## Fallos encontrados y corregidos

1. La sesión descartaba `behavior` al crear al paciente clínico y usaba frases fijas por arquetipo.
2. Alias como «ansiosa» caían en el perfil base tranquilo al generar los rasgos.
3. Checkpoints antiguos sin rasgos necesitaban una recuperación determinista sin cambiar identidad o hechos médicos.
4. El diálogo dependía de prefijos y coletillas; ahora combina realizaciones acotadas y datos espontáneos del mismo caso, con memoria de lo ya dicho.
5. El router no reconocía «confundida», «regurgita» y variantes singulares/plurales de anticoagulantes.
6. «Le escucho con calma» podía adquirir un dato de alivio del dolor que nadie había preguntado.
7. La traducción anatómica producía «en la abajo a la derecha»; se corrigió la preposición completa.
8. Un inicio desconocido podía etiquetarse falsamente como dato textual del caso; ahora conserva la procedencia de incertidumbre.
9. La historia farmacológica entraba en variación lingüística; medicamentos, anticoagulantes y alergias conservan su texto literal. Las explicaciones sí actualizan la relación durante esas preguntas.
10. La respuesta verbal 3 decía «Dolor… panza…» sin depender del caso; ahora describe habla limitada sin inventar dolor abdominal.
11. El comparador podía perder la asociación entre negación, fármaco y cantidad, o ignorar texto añadido fuera de los hechos. Las regresiones detectan esas alteraciones, fuentes inventadas y afirmaciones médicas disfrazadas de frases emocionales.
12. La prueba visual suponía que una apertura siempre dejaba sólo un dato. Se adaptó al avance real cuando el paciente aporta antecedentes espontáneamente; la lógica de progreso clínico de la UI permanece igual.

Se incorporó revisión independiente del código. Sus tres hallazgos importantes y el ajuste de relación durante preguntas protegidas quedaron corregidos y cubiertos por regresiones. No se añadió un modelo generativo externo ni dependencias de ejecución.

## GitHub Actions y comprobación de archivos ejecutados

**[ATRIA 5 Experimental Game #905](https://github.com/javierdario48-star/ATRIA/actions/runs/40911917593): aprobado, 29 jobs aprobados.** Código: `1443ee2c187966c3b5ad94aaea7d39cfde82b6dd`.

El [job de personalidades](https://github.com/javierdario48-star/ATRIA/actions/runs/40911917593/job/123581858819) ejecutó efectivamente los nuevos tests de integración, métricas y persistencia; luego las campañas de 1.100 y 10.010 entrevistas mediante `qa/v5/certify-patient-personalities.mjs`. La suite V5 ejecutó **2.653 tests, 2.653 aprobados, 0 fallos**. También pasaron los builds, la frontera arquitectónica, las pruebas visuales de Aprendiz y Solitario en CI, el multijugador y la regresión histórica del workflow.

#903 tuvo un timeout WebRTC en la entrada de cuatro jugadores. #904 detectó la expectativa visual de «Hablar» descrita arriba. En #905 ambas pruebas pasaron. No se enviaron ejecuciones manuales duplicadas mientras estaban en cola.

Los resultados locales y los de CI tienen el mismo digest de corpus. El [artefacto completo de Actions](https://github.com/javierdario48-star/ATRIA/actions/runs/40911917593/artifacts/12914546961) contiene los JSONL comprimidos de ambas campañas y sus ejemplos; la retención configurada es de 30 días. Los resúmenes y las diez entrevistas de este directorio quedan versionados.

- Digest de fuentes: `cec95dbc6d7ee1fa2e922917f91aad2ea8047de89bd857038f2021ef27cbba0b`.
- Digest de contenido clínico: `0789e8e0522d38cbb846f461416695c683a38b84f7c856c2742392d4cc65db00`.
- Digest reproducible del corpus ampliado: `69aae3569fe13156529ae972abab41e75eb279cbfaa35924f9819e4ab48cadf6`.

## Diez ejemplos completos

[Leer las diez anamnesis completas de APP-001](10_anamnesis_completas.md): quince intercambios por paciente, el mismo médico experto y las mismas preguntas. Incluyen los siete arquetipos base y mezclas conductuales diferentes. Los textos se copiaron de las respuestas del juego; sólo se tradujeron los rótulos del documento.

## Archivos modificados

Los veinte archivos de implementación, integración, pruebas y workflow son:

- `.github/workflows/atria-v5-core.yml`
- `docs/qa/npc-personality-certification-plan.md`
- `qa/tests/patient-behavior-accelerated.test.mjs`
- `qa/tests/patient-behavior-conversations.test.mjs`
- `qa/tests/patient-personality-integration.test.mjs`
- `qa/tests/patient-personality-longitudinal.test.mjs`
- `qa/tests/patient-personality-metrics.test.mjs`
- `qa/v5/certify-patient-personalities.mjs`
- `qa/v5/local-shift-browser.mjs`
- `qa/v5/personality-anamnesis-bots.mjs`
- `qa/v5/personality-conversation-metrics.mjs`
- `qa/v5/personality-fact-oracle.mjs`
- `src/v5/clinical/guard-session.js`
- `src/v5/clinical/patient-conversation.js`
- `src/v5/clinical/patient-dialogue.js`
- `src/v5/clinical/patient-dialogue.test.js`
- `src/v5/content/guard-patient-variation.js`
- `src/v5/content/patient-language.js`
- `src/v5/content/patient-variation.js`
- `src/v5/ui/bedside-guidance.test.js`

Este paquete añade el informe, tres resúmenes, las métricas complementarias, diez transcripciones y el analizador reproducible.

## Reproducción

```sh
node --test qa/tests/patient-personality-*.test.mjs
node qa/v5/certify-patient-personalities.mjs --count 1100 --output qa/v5-personality-initial-results
node qa/v5/certify-patient-personalities.mjs --count 10010 --output qa/v5-personality-certified-results
npm run test:v5
npm run build:v5
python docs/evidence/npc-personalities-2026-10-29/analizar_corpus.py qa/v5-personality-certified-results/anamneses.jsonl.gz
```

El último comando reproduce exactamente las 146.895 comparaciones controladas guardadas en `metricas_complementarias.json`; su ejecución se verificó sobre el corpus final, sin volver a simular entrevistas.

## Límites y pendientes reales

- La cobertura técnica está aprobada. La similitud residual del 28.46% en el cuerpo de pares con habla plena impide prometer que cada conjunto de diez NPC se perciba como diez voces inequívocamente distintas. Los hechos clínicos breves, negativos y protegidos producen coincidencias legítimas; algunos bancos conservan redacción técnica.
- La naturalidad gramatical se comprueba con reglas y ejemplos revisables, no mediante un evaluador humano ni un modelo externo. Las medidas tampoco certifican por sí solas la corrección médica independiente de todo el banco.
- El oráculo verifica procedencia, conservación y observaciones; la selección óptima de dominio para cualquier pregunta libre posible queda fuera de la garantía exhaustiva.
- La campaña masiva recorre Solitario con el reloj detenido. Los otros modos y el deterioro se cubren con regresiones específicas y los jobs generales. Los pacientes con habla limitada e informantes se muestran por separado para respetar la prioridad fisiológica.
- No quedan fallos automatizados pendientes en el HEAD de código certificado. El siguiente criterio de revisión es perceptual: leer las diez conversaciones completas y valorar especialmente los pares tranquilos/reservados y las formulaciones clínicas compartidas.
