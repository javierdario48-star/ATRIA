# ATRIA 5.0 — Contrato obligatorio para incorporar casos clínicos

**Ámbito:** exclusivamente `atria-5.0-core-rebuild-experimental`. No modificar ATRIA 4.8.7, `main` ni otras ramas.

## Regla de aceptación
Un caso nuevo **no está terminado** por mostrar síntomas, un diagnóstico y un tratamiento. Debe recorrer el motor clínico real, mantener coherencia fisiológica, admitir variaciones reproducibles, comunicarse por la anamnesis real y cerrar por la autoridad clínica. No crear motores paralelos, respuestas estáticas que evadan el motor ni excepciones por ID cuando existe una abstracción compartida.

## Cinco capas obligatorias y verificables

### Libertad clínica permanente

La capacidad técnica de ejecutar, la pertinencia clínica y el cumplimiento del
checklist son contratos distintos. La autoridad ejecuta una decisión interpretable
y técnicamente posible aunque sea innecesaria, precoz, repetida, excesiva o
contraindicada. Dosis, autor, paciente, vía y tiempos reales quedan en sus recibos.
Las reglas de pertinencia alimentan consejo y evaluación; nunca autorizan una
administración. Los límites físicos reales (vía no disponible, dispositivo o
formulación no implementados) deben explicarse. Las consecuencias se calculan en
el propietario fisiológico existente; no se inventa toxicidad para castigar una
orden. Una mala decisión sin daño puede reducir calidad y recompensa. Una muerte
requiere evidencia causal nativa vinculada a administraciones confirmadas antes
de descontar carrera al médico responsable; la enfermedad por sí sola y las
decisiones de un compañero no justifican ese descuento. Los reintentos de red no
son nuevas dosis ni nuevos descuentos. Dr. Vega recomienda; no concede permisos.

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

## Prueba de admisión de un caso adicional

Desde la raíz del repositorio, ejecuta la prueba del importador.

```bash
node --test --test-name-pattern='real CLI certification' scripts/import-clinical-case-pack.test.mjs
```

La prueba agrega `RESP-56` a una copia temporal del catálogo certificado de 55 casos mediante `--activate`. El cargador habitual abre esa copia y la selección «Patología específica» admite el caso en Aprendiz, Solitario, Cooperativo y Competitivo. El recorrido comprueba antecedentes generados por semilla, anamnesis, pista para la gasometría del caso, atención confirmada por enfermería, dos muestras nativas con informes independientes y cierre en Observación con un único recibo de XP. También recupera el estado guardado y reintenta los comandos de la primera muestra y del cierre.

La orden de observación activa (`/observacion`) mantiene al paciente en atención. El cierre deliberado con destino Observación (`/disposicion observacion`) exige los requisitos clínicos del caso y emite un recibo de cierre.

Para añadir un caso, toma una definición de `src/v5/content/packs/` como referencia y prepara el pack JSON. Ejecuta `node scripts/import-clinical-case-pack.mjs --pack CASOS.json` para compilarlo sin publicar. Copia el catálogo actual a una ruta de prueba y vuelve a ejecutar con `--activate --output CATALOGO-DE-PRUEBA.json`. Comprueba el recorrido real antes de actualizar el catálogo jugable. La matriz, los cierres y las entrevistas toman sus casos del catálogo certificado.

## Puerta de calidad para cada caso nuevo
1. Ejecutar bots sobre el caso real: entrevista completa y repreguntas; decisiones acertadas, tardías, erróneas y ausencia de intervención.
2. Comprobar evolución fisiológica temporal, cambios tras tratamiento **confirmado**, complicaciones, contraindicaciones, alergias, deterioro y cierres.
3. Probar varias semillas, perfiles de personalidad y variantes del caso; comprobar persistencia y ausencia de contradicciones.
4. Comparar conversaciones de pacientes del **mismo caso** con rasgos diferentes; asegurar diversidad perceptible sin perder hechos clínicos ni crear frases artificiales.
5. Ejecutar pruebas de regresión relevantes de los casos anteriores y CI de la rama; no repetir campañas masivas aprobadas si el cambio no afecta sus contratos.

**Criterio de entrega:** el nuevo caso queda jugable, fisiológicamente coherente, variable, seguro ante errores de tratamiento, conversacionalmente integrado y verificable por pruebas. Publicar commit, HEAD, pruebas efectivamente ejecutadas, CI y pendientes reales. Si falta alguna capa, declararla pendiente: nunca afirmar certificación integral.

**Evolución del sistema:** cada caso aporta variaciones locales; únicamente las generalizables, comprobadas y aprobadas por tests amplían el banco compartido. El motor global se mantiene compatible hacia atrás. No modificar la personalidad de casos anteriores como efecto colateral de importar uno nuevo.

---

## Protocolo de migración de enfermedades V2 (congelado como norma de trabajo, 21/11/2026)

### Objetivo y alcance

La V2 es **una nueva revisión de la MISMA enfermedad**, no un segundo simulador clínico. El caso V1, su fuente, las trazas de QA y las partidas que ya dependan de él se conservan. Crear una V2 en *candidato aislado* no modifica `src/v5/content/cases.json`, el catálogo activo `src/v5/content/certified-case-packs.json`, las políticas V1, ni los cuatro modos. No activar ni desplegar una candidata por el hecho de compilar.

**Foto exacta del catálogo actual:** 55 IDs únicos: 25 casos digestivos/abdominales de `src/v5/content/cases.json` y tres packs certificados de 10 (RESP-01..10, CARD-01..10, NEUR-01..10). **No confundir 55 casos con 55 ejecutores independientes**: el motor y sus políticas son compartidos. Los 30 de especialidad incluyen 23 casos con al menos una complicación declarada y 26 definiciones de complicación; el catálogo no exige una complicación en cada caso. Algunos casos digestivos tienen complicaciones manejadas por políticas distintas.

### Taxonomía cerrada de destinos, abierta en combinaciones

Se reconocen **seis destinos operativos ya existentes**. El conteo corresponde a los **55 casos**, según destinos posibles declarados en las reglas V1; NO son pacientes, eventos ni rutas exclusivas. Una enfermedad puede admitir varios destinos según gravedad y respuesta.

| Código de destino | Significado clínico de cierre | Casos que lo permiten (sobre 55) |
| --- | --- | ---: |
| `alta` | Tratamiento/seguimiento ambulatorio con estabilidad y señales de alarma | 9 |
| `observacion` | Vigilancia y reevaluación sin alta inmediata | 10 |
| `sala` | Internación y atención médica continuada | 24 |
| `uti` | Cuidados intensivos y soporte avanzado | 32 |
| `procedimiento` | Entrega a procedimiento/endoscopia/hemodinamia/drenaje según reglas reales | 12 |
| `quirofano` | Entrega al equipo quirúrgico y control del foco pendiente de realización | 9 |

La **aceptación por el receptor** es una condición del traslado, no un séptimo destino. El traslado aceptado **no acredita** que la cirugía o el procedimiento se hayan realizado. La muerte, el abandono, la atención incompleta y la inestabilidad son **desenlaces o estados**, nunca destinos válidos de alta. El motor puede seleccionar destinatario según presentación; una lista de destinos nunca concede permisos para una derivación insegura.

### Familias combinables de tratamiento (seis)

Cada V2 declara cero, una o varias de estas familias, sin crear un ejecutor nuevo por familia: **T1 vigilancia/observación y reevaluación**, **T2 terapia farmacológica** (oral/inhalada/IV con dosis, vía y tiempos), **T3 reanimación y soporte vital** (oxígeno, volumen, hemoderivados, vasopresores, ventilación), **T4 procedimiento no quirúrgico** (endoscopia, drenaje, descompresión, estimulación cuando corresponda), **T5 reperfusión/hemodinamia o intervención endovascular**, **T6 cirugía/control del foco**. El destino y el tratamiento NO son lo mismo. Una intervención puede ser necesaria antes del traslado, o ser responsabilidad del servicio que recibe: declarar cuál y cómo se verifica su ejecución o aceptación. Una orden posible pero errónea se puede ejecutar según la autoridad existente, sin aprobación del checklist; el daño solo se atribuye después de la ejecución confirmada.

### Cinco patrones de evolución a contemplar en el diagrama

**E0 curso basal sin intervención**, **E1 respuesta al tratamiento efectivamente ejecutado**, **E2 deterioro por enfermedad, omisión o demora**, **E3 complicación intercurrente o recurrencia por variante/semilla**, **E4 iatrogenia y posible rescate**. Cada transición especifica desencadenante, tiempo, signos/resultados, contraindicaciones, acciones de rescate, irreversibilidad y desenlace. No todos los casos requieren E3/E4 como episodio real, pero sí deben probarse las decisiones erróneas sin inventar daños no sustentados. Complicación resuelta, incompleta, muerte o cierre seguro son resultados del motor, no atajos del diagrama.

### Diagrama de flujo obligatorio por enfermedad

Cada candidata V2 tendrá un **grafo de decisiones trazable** (no solamente una ilustración) con estos nodos de referencia, saltos urgentes permitidos y condiciones explícitas:

1. **Ingreso y triaje:** motivo, estabilidad, antecedentes, gravedad y variantes reproducibles.
2. **Anamnesis y examen:** preguntas por intención, memoria/persona, examen por sistemas y hallazgos.
3. **Hipótesis clínicas:** diferenciales, criterios de suficiencia e incertidumbres.
4. **Estudios:** indicación, muestras, latencia, resultados interpretables y medidas que NO pueden esperar el informe.
5. **Órdenes y enfermería:** tratamientos técnicamente ejecutables, dosis/vía, administración/recibo, latencias y alternativas compatibles.
6. **Evolución fisiológica:** funciones compartidas, respuesta causal temporal, complicación, iatrogenia, rescate, persistencia y reconexión.
7. **Reevaluación y Dr. Vega:** checklist dinámico real, una acción prioritaria, nombre exacto de control/orden, alternativas, XP y pistas repetidas, sin autoridad clínica adicional.
8. **Decisión final:** destinos permitidos por estado, aceptación del receptor, cierre único/XP, muerte/abandono y seguimiento.

Ramas mínimas de QA: manejo correcto; diagnóstico omitido o equivocado; orden técnicamente posible pero improcedente; manejo insuficiente; demora; sobredosis/contraindicación/alergia; complicación no resuelta y rescate; transferencia precoz o al destino incorrecto; reintento idéntico y reconexión; variantes y personalidades. Los pacientes **no reciben mejorías, estudios, administración ni XP por el simple clic**: únicamente mediante recibo/autorización y avance fisiológico real. Todas las ramas deben conservar la enfermería, las pistas y la historia clínica.

### Planilla canónica V2 (una enfermedad por ciclo)

La planilla tendrá una **fila índice por enfermedad** (ID lógico, fuente V1 y SHA, especialidad, V2 candidata, estado, destinos, familias T1–T6, patrones E0–E4, pruebas, enlace a diagrama, SHA de aprobación, rollback). La **ficha por variante** desarrolla: presentación/semilla; triaje y antecedentes; personalidad y anamnesis; examen; diferencial; estudios y tiempos; intervenciones/contraindicaciones; trayectoria vital basal; bifurcaciones con condiciones; complicaciones y tratamiento de rescate; criterios de reevaluación; pista de Vega por requisito de cierre; aceptación y destino; XP/penalizaciones; comparación V1→V2 y fuentes clínicas. El diagrama se define en datos de reglas verificables, no lógica ejecutora duplicada. Mantener una planilla versionada como índice único y anexos propios por caso: **no crear otro inventario paralelo de 55 pendientes**.

### Identidad, staging, activación y reversión: protección obligatoria

- Mantener **ID lógico de enfermedad estable** para el usuario, por ejemplo `RESP-01`, con campo de revisión `v1` / `v2-candidate` y fuente/SHA rastreables. Una candidata puede necesitar un ID temporal **solo en catálogo de pruebas aislado**, nunca mostrar dos entradas de la misma enfermedad en el catálogo activo.
- La implementación actual de `clinical-case-registry.js` es **append-only**, rechaza `id` duplicado y `packId` activo duplicado; `import-clinical-case-pack.mjs --activate` **publica**, no sustituye. **Todavía NO existe un selector V1/V2 certificado para reemplazar casos existentes.** No engañar al importador con un ID `-V2` y publicar ambos en el juego.
- Antes de la primera promoción diseñar y probar una **selección versionada atómica**, con V1 por defecto, V2 detrás de bandera OFF, nuevas guardias vinculadas a una revisión fija, partidas/reconexiones V1 conservadas, autoría/estado/recibos compatibles y rollback a V1. Si la selección segura no está implementada, **la V2 permanece en staging**.
- Importar con el pipeline existente, validar dependencias reales, certificar en Aprendiz/Solitario/Cooperativo/Competitivo, comparar V1 y V2 con semillas y perfiles, comprobar toda la fisiología/nursing/Vega y revisar indicaciones/dosis con fuentes médicas vigentes. No activar por apariencia ni por una sola prueba verde.
- Por cada cambio: commit pequeño a `atria-5.0-core-rebuild-experimental`, prueba específica y CI de SHA definitivo; cuando Vercel Hobby vuelva, Preview del MISMO SHA, Android y 2–4 médicos antes de liberar. **Nunca actualizar `main` ni producción directamente**; no inferir que Vercel recibió commits mientras el despliegue esté suspendido.

### Primer piloto propuesto, no activado

**`RESP-01` — NAC ambulatoria de bajo riesgo**, origen `atria-respiratory` V1.0.0. Es un caso ya certificado, una única ruta de alta, terapia farmacológica y sin complicaciones intrínsecas declaradas en ese pack: útil para comprobar la maquinaria V1→V2 (planilla, diagrama, anamnesis, variaciones, medicación, pista, firma de recibos y rollback) con mínimo riesgo. **No se ha creado ni activado V2**. El segundo piloto, cuando el mecanismo esté validado, puede ser `RESP-02` (sala/UTI, soporte avanzado, dos complicaciones), para demostrar que el flujo admite bifurcaciones y rescates. El orden clínico definitivo puede ajustarse sin afectar el contrato.

**Puerta de avance:** diseñar el primer caso V2 aislado ya es posible; **activarlo públicamente no** hasta contar con selector versionado verificado, estabilidad de plataforma y Preview de Vercel/Android real.

