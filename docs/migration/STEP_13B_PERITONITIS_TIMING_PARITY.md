# ATRIA 5.0 — C3.a.1: alcance verificado de la fisiología PERI-SEC con órdenes escalonadas

Rama exclusiva: `atria-5.0-core-rebuild-experimental`. Código funcional bajo prueba: `ec047ac63acdbbfaef6fdecacf598d04bc79aa1d`. Se mantiene todo el motor existente; este checkpoint es **solo caracterización QA**, sin cambiar signos vitales, medicamentos, parser, flujos de cierre, XP o multijugador.

## Problema que resuelve

La certificación C3.a anterior comparaba 12 escenarios con el fenotipo V4 de referencia, todas las intervenciones indicadas al comenzar el escenario, en 13 momentos (156 mediciones). Aunque es una demostración real, no caracterizaba suficientemente los cambios de conducta a lo largo de la evolución del caso.

## Ampliación implementada

Nuevo bot `qa/v5/peritonitis-sequence-parity.mjs`, integrado al job `clean-core-contract` en `.github/workflows/atria-v5-core.yml`. Ejecuta la **VM V4 efectiva** y la guardia clínica V5 real en paralelo, con los mismos medicamentos, dosificaciones y horas de indicación. No inyecta cambios de signos ni inventa administraciones.

Nueve escenarios temporales nuevos:
1. Ceftriaxona primero; metronidazol doce segundos después.
2. Metronidazol primero; ceftriaxona dieciocho segundos después.
3. Cinco administraciones independientes de Ringer 500 ml entre segundo 0 y 26.
4. Tres infusiones/administraciones de Ringer de 1000, 2000 y 2000 ml y sobrecarga progresiva.
5. Antibióticos y 1000 ml de Ringer recién al segundo 24.
6. Albúmina antes de una amikacina potencialmente perjudicial para riñón.
7. Furosemida después del primer aporte de volumen, con nuevo volumen posterior.
8. Cobertura de amplio espectro, noradrenalina posterior y expansión de volumen tardía.
9. Cobertura y líquidos con dos intervalos de **escritura**, que usa reloj farmacológico distinto (.03 frente a .12 minuto nativo/s).

Para cada muestra se comprueba el **número, ID, paciente y tiempo de cada recibo real**, seis signos vitales (T, FC, FR, PA sistólica/diastólica, saturación), siete ejes del estado fisiológico (inflamación, volumen efectivo, SVR, contractilidad, oxigenación, reserva/estrés renal), cobertura y rampa antibiótica, fuente quirúrgica no controlada, y ausencia de cambio silencioso de paciente.

## Resultado observado en GitHub Actions

La ejecución del script **aprobó** en el paso específico de la CI del código `ec047ac`. Emisión exacta:

`SECONDARY PERITONITIS SEQUENCE PARITY PASS {"scenarios":9,"measurements":349,"maxVitalError":6.394884621840902e-12,"maxPhysiologyError":1.56097357262297e-13}`

La prueba original también aprobó en esa ejecución: 12 escenarios × 13 puntos = 156 observaciones, error máximo 6.54e−12 de signos.

**Total cubierto acumulado en dos suites: 21 escenarios, 505 observaciones temporales en el fenotipo típico PERI-SEC**. Se compara contra el mecanismo realmente compilado en V4, no contra fórmulas supuestas. Esto no es una estimación de cobertura de todas las combinaciones del videojuego.

CI V5 de código: https://github.com/javierdario48-star/ATRIA/actions/runs/39092610789

## Límites NO certificados

- El fixture V4 usa el **fenotipo típico original** PERI-SEC. No prueba todas las variaciones aleatorias V3 ni fisiología de PBE/TER activada como ejecutor V5. Las fórmulas puras de PBE/TER sí tuvieron comparativa de V4, pero no constituyen tratamiento jugable completo.
- El horizonte del nuevo bot es 60 s reales; la suite anterior llega a 120 s, pero **no equivale a 24 horas reales de toda la guardia**. El reloj visible 24 horas/24 minutos y el farmacológico son dominios diferentes, ambos tienen pruebas propias.
- Muerte, recuperación de shock y XP están probados en `peritonitis-care.test.js` y recorrido de navegador, pero este nuevo bot no pretende igualdad postmortem de VM V4/V5. Su propósito es caracterizar la fisiología y administrar medicamentos **antes** de cierre/muerte.
- Las **19 intervenciones IV** registradas no se prueban todas juntas ni todas sus interacciones potenciales; dosis no incluidas en la matriz, velocidades extrema de infusión y factores de paciente no expresados quedan pendientes. No hace falta inventar nuevos efectos fisiológicos para aumentar cobertura.
- No son pruebas de clínica cooperativa/competitiva. HTTP 2–4 navegadores verifica el protocolo, no guardia compartida plena. Android físico sigue pendiente.

## Siguiente trabajo de QA prioritario, separado de nuevas funcionalidades

1. Reproducir contra el ejecutable V4 los fenotipos clínicos **realmente disponibles** y fuentes de variación, sin modificarlos en medio de una simulación y sin escribir directamente los vitales. Validar qué variación es parte del runtime efectivo antes de añadir un test.
2. Agregar intervenciones consecutivas a diferentes horas y mediciones para efectos de morfina, oxígeno, infusión de noradrenalina titulada/suspendida, antibiótico nefrotóxico y soporte posterior según la procedencia V4.
3. Efectuar pruebas del **horizonte de 24h visible** con pasos acotados, eventos antes/después de deadlines, y muerte/rescate con diferencia de frames largos/cortos. Distinguir comparación auténtica de V4 frente a invariantes adicionales V5.
4. No avanzar a dar por verificada fisiología de PBE/TER en runtime completo antes de migrar sus ejecutores. Primero PBE y luego TER, con aceptación de destino y XP acorde al manual.
5. La prioridad global sigue siendo recuperar los 13 ejecutores y validar el **multijugador clínico real**, no construir otra simulación paralela.

Referencias: [manual maestro](ATRIA_50_MANUAL_MAESTRO_FUNCIONAL.md), [handoff](CURRENT_HANDOFF.md), [C3.a](C3A_SECONDARY_PERITONITIS.md).
