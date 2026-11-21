# ATRIA 5.0 — Puertas de certificación RESP-01 V2 y migración segura a Vercel

**Rama exclusiva:** `atria-5.0-core-rebuild-experimental`. **Estado:** NO GO (candidata experimental, no desplegar en producción). **Referencia del trabajo:** 21/11/2026.

## Contrato universal, no juego de combinaciones fijas

1. **Libertad del médico.** Permitir preguntas, maniobras y estudios globales; prescribir cualquier medicamento de la formulación soportada, incluso sin indicación clínica; demorar, observar, solicitar derivaciones o intentar cualquier destino. Las limitaciones de *capacidad técnica real* (vía imposible, acceso venoso no colocado, parámetros no interpretables) son distintas de una indicación médica equivocada y no pueden convertirse en un veto por case ID.
2. **Fisiología causal única.** Solo administración realmente confirmada, finalización de procedimientos y tiempo nativo pueden provocar respuestas o complicaciones. Las órdenes pendientes, consejos, rumores, futuros sorteos o IDs ocultos no pueden escribir signos vitales.
3. **Evaluación y cierre separados.** El médico puede intentar cerrar a destiempo. Una alta u Observación formal incorrecta es rechazada con reprimenda de Dr. Vega, descuento documentado y paciente íntegro/reclamable. La observación clínica activa no equivale a intentar cierre formal.
4. **Puntuación oculta.** Requisitos diagnósticos, anamnesis relevantes, exploración, estudios necesarios, tratamientos correctos, reevaluación y destino se califican en el **único evaluador de calidad**: `csClosureQuality487`. Acciones opcionales no otorgan puntos porque sí; errores y exposiciones reales generan deducciones al cierre. La reprimenda por intento explícito de cierre peligroso conserva su sanción separada.
5. **Medicación errada sin veto por enfermedad.** `medication-indication-review.js` consulta reglas globales por clase farmacológica, signos fisiológicos y opciones autorizadas en datos de la enfermedad. `native-medications.js` registra la advertencia en la administración, **no la bloquea**. `clinical-risk.js` solo valora recibos entregados (no recetas pendientes) al calcular calidad. El módulo común no pregunta si la enfermedad es RESP-01, APP-001, CARD-08, etc. La cobertura de indicación automática aún es **parcial**: existen clases y combinaciones que necesitan más escenarios y reglas revisadas, no asumir exhaustividad universal.
6. **Continuidad multijugador.** Competitivo libera dueño de cama tras mala decisión de alta/Observación, permite que otro jugador continúe la misma ficha, y protege la privacidad de sanciones por actor; Cooperativo mantiene historia compartida. Repeticiones y reconexiones no duplican recibos.
7. **Receptor ciego a la verdad.** Debe juzgar únicamente diagnóstico presuntivo comunicado + evidencia disponible + estabilización + capacidad del servicio, **sin acceso al diagnóstico verdadero**. `public-receiver-policy.js` existe como contrato puro de prueba, pero **todavía no reemplaza el receptor activo**. Requisito pendiente obligatorio de V2.

## Organización de responsabilidades

| Responsabilidad | Fuente única (ruta) | Regla |
| --- | --- | --- |
| Definición de NAC 2.0, probabilidad de complicación y respuesta | `src/v5/content/packs/respiratory-v2-candidate.js` | Solo contenido declarativo, candidata desactivada |
| Administración real y registro de errores de dosis/indicación | `src/v5/clinical/native-medications.js` + `medication-indication-review.js` | Sin rechazar por diagnóstico verdadero |
| Evolución temporal y azar | `src/v5/clinical/clinical-policy-effects.js` | Un escritor nativo de fisiología |
| Reglas de estabilización para alta/traslado | `src/v5/clinical/clinical-disposition-safety.js` | Mismo algoritmo para todas las fichas declarativas |
| Indicación y aceptación de receptor | `src/v5/clinical/surgical-consultation.js` (activo); `public-receiver-policy.js` (solo prueba) | Integración ciega pendiente |
| Evaluación de calidad de acciones al cierre | `src/clinical/case-completion-487.js`, utilizado por `clinical-policy-closure.js` | Un único evaluador de puntos |
| Registro de penalizaciones y experiencia | `src/v5/clinical/progression.js`; cuenta persistida por RPC `atria_v5_award_verified` | El RPC online **aún no homologa** Observación insegura y deuda futura |
| Control de caso, propiedad y reconexión | `src/v5/clinical/guard-session.js` y `guard-runtime.js` | Mismo paciente / misma autoridad |
| Bot universal y comparación V1/V2 | `qa/v5/certify-clinical-cases.mjs`, `qa/v5/resp01-v2-parity.mjs` | Distinguir XP bruta, deuda, saldo y acto clínico |
| Diagrama de flujo | `docs/ATRIA-5-CASE-INTEGRATION-CONTRACT.md` | Modificar reglas del grafo junto con cambios compartidos |

## Evidencia exigida antes de cambiar NO GO a GO

**A. CI reproducible y sin fallos sobre HEAD:** `npm run test:v5` y regresión de transferencias de los 55 casos, diez perfiles por caso, sin errores atribuibles al motor (la enfermedad no resuelta o muerte en un escenario negligente puede ser desenlace correcto). Ejecutar 15 pares V1/V2 con la misma semilla y recibos de acciones; comprobar comportamiento correcto y parámetros de velocidad reales, no solo tiempo de guardia simulado. CI de GitHub bajo `ATRIA V5 RESP-01 V2 Candidate (isolated)` y `ATRIA 5 Clinical Transfers`.

**B. Libertad y consecuencias:** combinaciones de medicamentos correctos/incorrectos, dosis y rutas soportadas, sobredosis y secuencia, alergias conocidas/ignoradas, fluidos, administración sin indicación, estudios globales y sus tiempos, intervenciones omitidas, demora, fallecimiento, rescate y evolución espontánea; afirmar solo lo efectivamente ensayado. Un error documentado baja calidad del cierre sin crear puntos positivos.

**C. Flujo profesional completo:** anamnesis y examen dirigidos sin cambios de memoria ni personalidad clínica; siete personalidades; chat libre con Enfermería y resultados auténticos; Dr. Vega desde ingreso hasta cierre; todas las seis decisiones posibles, ambos rechazos por alta/Observación, traspasos aceptados y rechazados y recepción ciega; continuar por otro médico y recuperar sesión sin pérdida de información ni XP duplicada.

**D. Persistencia online:** versión y migración controlada del RPC de Supabase; comprobar débito del actor, saldo no negativo, deuda recuperable, cierre posterior y no atribuir sanción al médico sucesor. **No aplicar SQL directamente a producción** sin entorno de staging, validación de política y rollback.

**E. Compatibilidad y Android/Vercel:** `npm run build:v5` debe generar `out-v5` a partir del repositorio modular. En el proyecto Vercel `night-shift-clinical` hay despliegues preview anteriores `READY`, pero la revisión GitHub HEAD actual **no está certificada ni desplegada allí**. Verificar API multiusuario, latencia, memoria, recuperación, medidas Android físico y URL privada. Cambiar selector V1/V2 solo después de pasar gates A–D y tener rollback automático probado. No sobrescribir V1 ni editar el HTML monolítico a mano.

## Plan condicional para quedar técnicamente habilitados en 21 días

- **Días 1–7:** ejecutar y corregir CI completo; estabilizar intérprete universal y contador de XP de QA, farmacología negativa y pistas. Cero regresiones V1.
- **Días 8–14:** integrar receptor ciego, validación exhaustiva de rutas y pruebas de SQL **en staging**, escenarios combinatorios multijugador/Android y del selector reversible.
- **Días 15–21:** construir preview Vercel del commit *exacto* aprobado; comprobar interfaces, API, concurrencia y recuperación; decidir GO/NO GO con recibos del mismo código. Si una puerta no pasa, NO GO y seguir usando V1.

**Estado de certificación no debe inferirse de un commit o de una prueba redactada:** revisar la conclusión real de cada job y artefactos del commit exacto. Última matriz observada anterior a la corrección de contabilidad (`f59d6875`): varios perfiles marcaron fallos de conciliación `missing unique closure XP` incluso cuando el episodio tuvo cierre, porque el verificador comparaba XP neta contra XP bruta. Se corrigió la fórmula y la estrategia del bot competente en `qa/v5/certify-clinical-cases.mjs`, **pendiente de retest del HEAD**. 
