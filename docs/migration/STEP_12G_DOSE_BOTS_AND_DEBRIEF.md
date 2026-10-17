# ATRIA 5.0 — C12.g: bots de Ringer, errores de medicación y resultados con XP

Fecha: 2026-10-17. Rama exclusiva: atria-5.0-core-rebuild-experimental.
SHA motor y bots: dc422ef85a5edca7373f4ddfef149f5e83c63289
SHA corrección final de compatibilidad UI: db949e41688c36166a361d0ecdfce354c03b5d53
CI código previo (núcleo/legado/HTTP aprobados; navegador falló por selector de la tabla): https://github.com/javierdario48-star/ATRIA/actions/runs/39046800814
CI código UI corregido: https://github.com/javierdario48-star/ATRIA/actions/runs/39047156385 (confirmar 4/4 antes de proclamar aprobado).
Preview Vercel READY del SHA funcional: https://night-shift-clinical-gaucqqa75-javierdario4878-7324.vercel.app

## Defecto real corregido
Antes una orden UNICA 'Enfermera Ringer 4 litros' o 'Ringer 4000 ml' era rechazada porque el lector IV permitía exclusivamente 500 ml. Ahora reconoce volúmenes explícitos en múltiplos de 500 ml entre 500 y 40000 ml; cada orden requiere vía/recepción/preparación y produce un recibo único. Se mantienen rechazos para 300 ml, dobles dosis ambiguas, rutas incompatibles y dosis farmacológicas no homologadas. Un pedido pendiente jamás produce efectos.

## Bots de dosis V5
src/v5/clinical/evolution-matrix-bots.test.js: 24 trayectorias en 2 casos (APP-001, CIRR-001) x 2 modos (Solo, Aprendiz) x 6 volúmenes (0, 500, 2000, 4000, 6000, 10000 ml).
APP, 4L: variación SpO2 -4.32 puntos, FR 24.28, vivo. CIRR, 4L: variación SpO2 -4.32 puntos, FR 25.28, vivo.
APP, 10L: SpO2 -25.92, FR 42, fallecido tras exposición sostenida, XP 0. CIRR, 10L: SpO2 -24, FR 42, fallecido tras exposición, XP 0.
Otros bots: no tratar APP conduce a empeoramiento natural y, tras mucho tiempo, colapso; no tratar CIRR estable no provoca muerte automática. Un pedido aislado de 40L lleva a sobrecarga crítica tras tiempo de gracia. Dosis erróneas de ceftriaxona, metronidazol, furosemida y Ringer se rechazan sin administración. El uso injustificado de ceftriaxona en CIRR y furosemida en APP y cinco dosis confirmadas de 40 mg de furosemida se reflejan como errores clínicos puntuables, sin fingir una farmacocinética renal acumulativa aún no implementada.

## Comparación real contra V4.8.7
El bot de VM generada qa/v5/characterize-rapid-harm.mjs se ejecuta en clean-core-contract y aplica ocho órdenes REALES de Ringer 500 ml, con control sin terapia, hasta 45.6 s:
CIRR V4: SpO2 96 a 91.680126; FR 20 a 24.279845; PA sistólica 108 a 125.599894, sin muerte.
APP V4: SpO2 98 a 93.680126; FR 20 a 24.279845; PA sistólica 118 a 135.599894, sin muerte.
El juego viejo NO mataba con 4L en esta comparación; V5 debe deteriorar respiración pero no fabricar muerte inmediata. Evitar importar el incremento de PA injustificado de Ringer en CIRR estable.

## Cierre y mini tabla original
El evaluador puro de V4 src/clinical/case-completion-487.js sigue siendo quien decide destino, requisitos y calidad 0-100. qa/closure-xp-combinatorial-487.mjs + qa/native-xp-outcome-fixture-487.mjs comprueban el finalizador real heredado, casos mínimos/completos, estudios innecesarios, diagnósticos incorrectos, tratamientos faltantes, consulta pendiente, destino incorrecto, inestabilidad y XP únicos. npm test lo ejecuta en CI histórica.
Corregimos ambos snapshots V5 para que no envíen adverseCount=0 indiscriminadamente. src/v5/clinical/clinical-risk.js proyecta deterioro respiratorio confirmado y decisiones medicamentosas injustificadas a partir de eventos reales del paciente; no crea vitales. src/v5/clinical/closure-debrief.js reutiliza exactamente los subpuntajes del evaluador V4 y valida que sumas/descuentos equivalgan al total del recibo.
src/v5/ui/case-debrief.js y application.js muestran AUTOMATICAMENTE tras case.close EJECUTADO cuatro apartados: lo que sumó, lo descontado, lo omitido y lo que no debía hacerse, con estilo compacto de dos columnas. Nunca mostrar este resultado por órdenes de cierre rechazadas. Seguimos usando el recibo único original, sin otorgar experiencia duplicada.
APP-001 termina con pase a quirófano (NO cirugía realizada). CIRR-001 termina en sala u observación, no alta rutinaria. Fallecimiento cancela atenciones y no concede XP.

En regresión histórica completa, la matriz de finalizador/XP del V4 ejecutó 131 escenarios: 42 cierres válidos con XP y 89 rechazos por requisitos/destino. El bot antiguo de 40L auditó 21 escenarios sin errores/warnings detectados, con sus limitaciones propias.
El test de navegador CIRR-001 detectó inicialmente que la nueva mini tabla reemplazaba el selector #caseResult después del cierre; el caso seguía cerrado con 100/100 y 133 XP. Se corrigió en db949e416 conservando el mismo selector dentro del nuevo resultado. No relajar este test.

## Límites declarados
Sólo APP y CIRR poseen ejecutores clínicos nativos completos en V5. Los 30 fármacos catalogados NO son todos administrables. Las pruebas de rechazo no equivalen a probar sus efectos.
La sobrecarga actual utiliza dosis acumuladas confirmadas y no eliminación renal ni balances intersticiales completos. Furosemida excesiva queda anotada como mala decisión pero falta modelar el daño renal/electrolítico por dosis repetidas; no afirmar farmacología integral.
Falta calibrar el reloj de 24 horas simuladas en 24 minutos reales: hoy produce 172.8 minutos nativos en ese período. El gate estricto continúa deliberadamente rojo.
La mini tabla V5 reproduce categorías y números de la calidad V4, pero no puede afirmarse identidad visual exacta con la pantalla antigua. Android físico no comprobado.

## Pruebas
CI de código con 308/308 V5 y 40/40 core aprobados, build y HTTP aprobados; verificar navegador y regresión histórica en https://github.com/javierdario48-star/ATRIA/actions/runs/39046800814 antes de proclamar 4/4.
Próximo avance: calibración farmacológica acumulativa de furosemida, pruebas de rescate pos-sobrecarga y balance de fluidos, además del reloj, sin agregar más casos.