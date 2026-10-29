# ATRIA 5.0 — Contrato obligatorio para incorporar casos clínicos

**Ámbito:** exclusivamente `atria-5.0-core-rebuild-experimental`. No modificar ATRIA 4.8.7, `main` ni otras ramas.

## Regla de aceptación
Un caso nuevo **no está terminado** por mostrar síntomas, un diagnóstico y un tratamiento. Debe recorrer el motor clínico real, mantener coherencia fisiológica, admitir variaciones reproducibles, comunicarse por la anamnesis real y cerrar por la autoridad clínica. No crear motores paralelos, respuestas estáticas que evadan el motor ni excepciones por ID cuando existe una abstracción compartida.

## Cinco capas obligatorias y verificables

1. **Fisiología causal y temporal.** Definir estado basal y variables fisiológicas pertinentes; evolución con el tiempo, tratamiento adecuado, tratamiento tardío, omisión e iatrogenia. Los signos vitales, observaciones, complicaciones y recuperación deben derivar de la autoridad clínica existente. No conceder mejoría por una orden aún no ejecutada; respetar dosis, tiempos y dependencias. Comprobar también escenarios de deterioro y muerte cuando sean clínicamente plausibles.
2. **Contenido clínico y decisiones.** Definir motivo de consulta, anamnesis dirigida, antecedentes, examen físico por sistemas, estudios pertinentes, resultados interpretables, diagnósticos diferenciales, conducta y reevaluación. Evitar resultados contradictorios. Verificar que la enfermería, medicamentos, estudios y el docente utilicen los contratos existentes. La disposición final (alta, observación, UTI/derivación, cirugía u otro destino admitido) **cierra** el caso conforme a la autoridad clínica; no exigir evolución posterior al cierre.
3. **Variabilidad clínica reproducible.** Integrar el generador común de variaciones: identidad, edad y antecedentes cuando proceda, severidad, manifestaciones, evolución, comorbilidades y factores de riesgo. Usar semillas deterministas y persistencia en reconexión; las variantes deben seguir siendo clínicamente plausibles y no modificar hechos fijos incompatibles.
4. **Seguridad farmacológica y alergias.** Incorporar alergias y reacciones/intolerancias según el modelo existente, contraindicaciones, interacciones y riesgos relevantes, y verificar sus consecuencias clínicas. Nunca filtrar o inventar alergias por estilización conversacional; conservar la distinción entre alergia, intolerancia y reacción grave. Comprobar conducta correcta y conducta insegura con bots.
5. **Personalidad, anamnesis y comunicación.** Todo paciente nuevo debe **heredar automáticamente** el motor global de personalidad, rasgos multidimensionales, memoria de entrevista y relación por médico. Permitir un módulo opcional de expresiones específicas del caso (síntomas, vocabulario cotidiano, inquietudes y reacciones emocionales) que se combine con la personalidad global sin sustituir hechos clínicos. Las expresiones reutilizables pueden proponerse para el banco global mediante cambio explícito y pruebas; no alterar automáticamente conversaciones de otros casos. La hipoxemia, alteración neurológica o incapacidad verbal prevalece sobre el estilo. Evitar muletillas repetidas y respuestas idénticas con prefijos distintos.

## Integración técnica
- Reutilizar los contratos y módulos reales de `src/v5/content/`, `src/v5/clinical/`, `patient-variation.js`, `guard-patient-variation.js`, `patient-behavior.js`, `patient-dialogue.js` y `patient-observations.js` según corresponda; comprobar firmas actuales antes de programar.
- Añadir contenido mediante los mecanismos de registro/importación existentes, sin alterar los contratos de los casos previos.
- No introducir nuevas dependencias o un segundo motor de simulación cuando el actual resuelve la necesidad.
- Preservar comportamiento en Aprendiz, Solitario, Cooperativo y Competitivo; mantener identidad y personalidad entre turnos, médicos, reconexiones y checkpoints.

## Puerta de calidad para cada caso nuevo
1. Ejecutar bots sobre el caso real: entrevista completa y repreguntas; decisiones acertadas, tardías, erróneas y ausencia de intervención.
2. Comprobar evolución fisiológica temporal, cambios tras tratamiento **confirmado**, complicaciones, contraindicaciones, alergias, deterioro y cierres.
3. Probar varias semillas, perfiles de personalidad y variantes del caso; comprobar persistencia y ausencia de contradicciones.
4. Comparar conversaciones de pacientes del **mismo caso** con rasgos diferentes; asegurar diversidad perceptible sin perder hechos clínicos ni crear frases artificiales.
5. Ejecutar pruebas de regresión relevantes de los casos anteriores y CI de la rama; no repetir campañas masivas aprobadas si el cambio no afecta sus contratos.

**Criterio de entrega:** el nuevo caso queda jugable, fisiológicamente coherente, variable, seguro ante errores de tratamiento, conversacionalmente integrado y verificable por pruebas. Publicar commit, HEAD, pruebas efectivamente ejecutadas, CI y pendientes reales. Si falta alguna capa, declararla pendiente: nunca afirmar certificación integral.

**Evolución del sistema:** cada caso aporta variaciones locales; únicamente las generalizables, comprobadas y aprobadas por tests amplían el banco compartido. El motor global se mantiene compatible hacia atrás. No modificar la personalidad de casos anteriores como efecto colateral de importar uno nuevo.
