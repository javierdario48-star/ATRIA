# C3.b — PBE en el ejecutor clínico compartido

Continúa `d0d7052d63c6decbbf4baea2944607d610d0ff1a`, exclusivamente en `atria-5.0-core-rebuild-experimental`. Candidato implementado; la certificación de navegador/CI se registra después de ejecutar el SHA publicado. No confundir pruebas locales con CI aprobada.

## Comportamiento recuperado

PERI-PBE-001 utiliza **acute-care.js y native-peritonitis.js**, con el mismo reloj, vía, enfermería espacial, preparaciones, recibos, estudios, evaluación, supervivencia y XP que Solitario. El registro explícito de ejecutores conecta cuatro casos; una entrada de catálogo no basta para declararlos migrados. No se tocaron fuentes V4, golden master ni main.

Se recuperaron perfiles/hallazgos ns421 efectivos y la convalecencia ns423 como transición pura en el propietario existente. Ceftriaxona, imipenem o piptazo aportan la cobertura original, con dosis/rampa reales. La convalecencia requiere cobertura >=.8, rampa completa, inflamación <=70% basal, foco médico sin necesidad quirúrgica y soporte suficiente. Albúmina administrada mejora volumen circulante y reserva renal; pendiente no produce efecto. No hay recuperación universal al prescribir un antibiótico.

La confusión inicial es Glasgow14; sólo se recupera a15 con inflamación <80% basal y PAS>=100, salvo deterioro por hipoperfusión. El valor se revela al explorar los componentes. Se corrigió también la referencia basal de tendencia: comparar PBE contra Glasgow15 ficticio la clasificaba como deteriorada sin cambio fisiológico.

Paracentesis diagnóstica:40s reales; renal:45s. El líquido con780PMN/mm³ procede del resultado original, disponible sólo tras su deadline. La paracentesis no es un procedimiento quirúrgico. `sourceControlled:true` inicial conserva su significado médico y no crea administración `source_control`.

El evaluador original **csPeritonitisEvaluate487** ofrece Sala o UTI automáticamente según gravedad. No impone Cirugía ni procedimientos posteriores para cerrar. Renal mejora la calidad, pero no constituye otro bloqueo mínimo. Se conserva el piso original por handoff seguro y la fórmula única de XP; las decisiones perjudiciales usan el descuento V5 ya establecido. Amikacina conserva el daño renal original y ahora la contraindicación de la lista nativa `avoid` figura en seguridad, sin inventar otra ecuación de toxicidad.

## Evidencia local reproducible

- `npm run test:v5`:414/414; core40/40; builds V5/core/antiguo y frontera70módulos, un RAF.
- `node qa/v5/pbe-native-parity.mjs`:12 escenarios,173 observaciones genuinas V4/V5. Signos error máximo1.99e-12; fisiología5.68e-14. Abandono, cef+albúmina, cef sola, albúmina sola, imipenem, amikacina simple/repetida, rescate diferido, furosemida, exceso de líquidos/albúmina y escritura con reloj reducido. Incluye Glasgow nativo. [Resumen y hashes](../evidence/c3b/pbe-native-parity-summary.json); traza completa reproducible en artefacto CI.
- PERI-SEC conserva21 escenarios/505 observaciones y tolerancias previas. Entrevista40 comparaciones/cuatro perfiles; examen80 comparaciones.
- Seis pruebas de sesión: dosis pendientes, recuperación neurológica condicionada, para/renal con deadlines, Sala/UTI, daño renal y rescate con95/100 tras descuento5, muerte tras ventana sostenida y frames equivalentes, cierre único.
- `node qa/v5/pbe-quality-parity.mjs`: [V19 real + corrección peritonitis + finalizador/carrera](../evidence/c3b/pbe-quality-parity.json). Mínima89/121XP; completa100/133; exceso99/132; alternativa imipenem95/128. La VM declara antecedentes/resultados como precondiciones; V5 los obtiene mediante acciones/estudios reales. La fórmula V19 antigua no penalizaba amikacina; la deducción V5 por decisión perjudicial se prueba aparte, sin afirmar igualdad de esa omisión histórica.
- `qa/v5/pbe-browser.mjs` recorre UI pública de escritorio y Pixel hasta cierre/persistencia: movimiento, historia, examen, Glasgow14→15, dos dosis físicas, monitor, estudios reales, diagnóstico flotante, Sala100/133 y no duplicación. Debe pasar en CI antes de certificar este checkpoint. Pixel es emulación, no Android físico.

La comparativa fisiológica está limitada a fenotipo típico y horizonte previo a muerte <=120s; no se sustituye el finalizador de la VM para afirmar paridad post mortem. Muerte y rescate son invariantes V5 y permanecen las regresiones originales. No se afirma PK completa de30tratamientos ni ejecución de los otros nueve casos.

Después de CI verde: C3.c PERI-TER, y luego C5.a Cooperativo clínico real antes de migrar los otros ocho casos. El protocolo HTTP anterior por sí solo no certifica producto multijugador.
