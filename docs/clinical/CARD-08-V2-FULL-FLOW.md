# CARD-08 V2 — staging y evidencia de continuidad (24/11/2026)

Estado: candidata experimental, NO activada ni certificada. ID lógico CARD-08, fuente V1 artria-cardiology@1.0.0, SHA base 236187981f719a85b7487d337d8c77139a22c92f. Se mantiene el catálogo de 55 y la autoridad nativa. No se alteró el motor clínico universal.

## Evidencia previa comprobada
CI [45317723534](https://github.com/javierdario48-star/ATRIA/actions/runs/45317723534): 34 tests, 240 combinaciones finitas, 36 recorridos nativos (9 por modo), 48 intentos prematuros. Censo histórico [45317723554](https://github.com/javierdario48-star/ATRIA/actions/runs/45317723554) aprobado. El CI general [45317723547](https://github.com/javierdario48-star/ATRIA/actions/runs/45317723547) estaba en cola al inspeccionarlo. No equivalen a cobertura exhaustiva de dosis, intervalos y semillas.

Defecto del banco de pruebas: las cuatro rutas VARIX wrong-medication registraron cero administraciones; no acreditan iatrogenia. También graphEdges contaba cantidades distintas y no IDs de aristas. La nueva matriz exige fármaco confirmado y evento adverso nativo vinculado al recibo; agrega IDs de aristas por caso, incluidos intentos prematuros. Se usa el constructor de comandos canónico y AAS como estímulo adversarial en las dos patologías hemorrágicas/de riesgo hemorrágico; no se cambia el mecanismo fisiológico. Si falla, investigar recibos, no relajar la aserción.

## Tercera enfermedad: disección aórtica Stanford A
Conserva política V1 existente: dolor máximo al inicio, asimetría de pulsos, hipertensión inicial, alternativas diagnósticas angio-TC/ETE y antiimpulso esmolol/metoprolol cuando tolerado. Complicación nativa card08-aortic-leak: probabilidad simulada 0,18 desde minuto 35, deterioro progresivo, rescate definitivo aortic_surgery. Recepción cardiovascular para quirófano, no reparación ficticia. Referencia: docs/clinical/cardiology-references.md, ACC/AHA 2022. Variabilidad, alergias y personalidad heredadas; sorteo de complicación separado.

## Diagrama y admisión
clinicalGraph es observador independiente. Solo quirofano puede iluminar cierre terminal con recibo nativo; otros destinos se intentan y rechazan según reglas del motor. La aceptación no ejecuta cirugía. El manifiesto staging únicamente se importa en QA. La matriz nativa obtiene destinos desde clinicalPolicy, no por ID; inputs adversariales son datos de QA. La matriz finita distingue cuidado definitivo transferible de rescate inmediato.

## Puertas pendientes
CI del nuevo SHA: 3 candidatas, seis destinos prematuros por cada modo, recorridos competentes y adversariales, cobertura finita de rescate y cierres. No considerar completada la certificación individual hasta comprobar ambos grupos antiimpulso y ambos estudios, complicación manifestada con recepción sin cirugía ficticia, alergia/rescate, V1/V2 emparejado, personalidad, Dr. Vega, XP, recepción ciega, checkpoint y regresión general. Registrar hallazgos en el índice canónico antes de promoción. No modificar main, V1 ni producción. Rollback: retirar candidata del manifiesto de pruebas o revertir el commit de staging en la rama experimental, sin afectar las revisiones jugables.

## Resultado de CI del SHA 97312ee (verificado 24/11/2026)
[45318693797](https://github.com/javierdario48-star/ATRIA/actions/runs/45318693797): 348 combinaciones finitas, 34/34 pruebas, 48/48 trayectorias, 72/72 intentos prematuros, cuatro modos aprobados. VARIX y CARD-08 acreditan administraciones y daño antitrombótico en los cuatro modos; cero recibos XP en rutas adversariales. Pistas [45318693820](https://github.com/javierdario48-star/ATRIA/actions/runs/45318693820) aprobadas. Preview [45318693771](https://github.com/javierdario48-star/ATRIA/actions/runs/45318693771) falló en comprobación de versión servida antes de navegación; no acredita regresión clínica. 

Nueva puerta individual: 24 recorridos programados (4 combinaciones de estudio/tratamiento, 1 complicación con receptor y 1 V1 por modo), 1024 pares de variación por semilla y cuatro auditorías compartidas de alergia, rescate, Vega, sanciones y persistencia. Se conserva la ejecución histórica de RESP-01 por defecto. La admisión requiere CI verde; no se declara aprobada al publicar.
